/**
 * Durable Wooftag store.
 *
 * Production: Upstash Redis REST (UPSTASH_REDIS_REST_URL + TOKEN)
 * or Vercel KV aliases (KV_REST_API_URL + KV_REST_API_TOKEN).
 *
 * Build/dev without KV: skip durable store so `next build` never throws.
 * Runtime without KV: callers get null and return a graceful error.
 *
 * Daily cap: keyed by UTC date (`wooftag:day:YYYY-MM-DD`). Each UTC day
 * starts at 0 minted / 200 remaining — unused slots do NOT roll over.
 * Overflow FIFO queue (`wooftag:queue`) persists across midnight; when the
 * new day's bowl opens, queued sniffers mint first as they return, then
 * new mints fill whatever of the 200 remains.
 *
 * Browser lock: `wooftag:browser:<id>` binds the durable `qw_wooftag_browser`
 * cookie id after a successful mint (one sniff per browser).
 *
 * School stamps: `wooftag:stamps:<browserId>` (Redis set of topic slugs) records
 * server-verified woof-check passes; mint requires stamps for all ready topics.
 *
 * TODO: do not add a filesystem JSON fallback — serverless disks are not durable.
 */

import { Redis } from "@upstash/redis";
import { utcDateKey, WOOFTAG_DAILY_CAP } from "@/lib/wooftag";

export type QueueItem = { id: string; t: number };

/** Daily Wooftag claim for an X account — plaintext tag stored encrypted at rest. */
export type XClaimRecord = {
  xUserId: string;
  username: string;
  /** X account created_at ISO string. */
  createdAt: string;
  /** UTC date key YYYY-MM-DD this claim was issued for. */
  utcDate: string;
  issuedAt: string;
  tagHash: string;
  /** AES-GCM ciphertext from encryptWooftag. */
  tagEnc: string;
};

/** Compact history entry for re-showing past daily claims after sign-in. */
export type XClaimHistoryItem = {
  utcDate: string;
  issuedAt: string;
  tagHash: string;
  tagEnc: string;
};

export type DayCounts = {
  utcDate: string;
  minted: number;
  remaining: number;
  cap: number;
  queueLength: number;
};

export type StoreKind = "upstash" | "memory" | "none";

const DAY_TTL_SEC = 60 * 60 * 24 * 4;
const HASH_TTL_SEC = 60 * 60 * 24 * 400;
const BROWSER_TTL_SEC = 60 * 60 * 24 * 400;
const STAMP_TTL_SEC = 60 * 60 * 24 * 400; // undated stamps (anonymous mint while flag off)
/** Day-scoped stamps for X daily claims — ~48h so yesterday can linger briefly. */
const DAY_STAMP_TTL_SEC = 60 * 60 * 48;
const X_CLAIM_TTL_SEC = 60 * 60 * 24 * 400;
const X_HISTORY_TTL_SEC = 60 * 60 * 24 * 400;
const X_HISTORY_MAX = 60;
const QUEUE_KEY = "wooftag:queue";

function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";
  if (!url || !token) return null;
  return { url, token };
}

function isBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE ?? "";
  return (
    phase.includes("build") ||
    phase.includes("compile") ||
    process.env.npm_lifecycle_event === "build"
  );
}

export function storeKind(): StoreKind {
  if (redisEnv()) return "upstash";
  if (process.env.NODE_ENV !== "production") return "memory";
  return "none";
}

let redisSingleton: Redis | null | undefined;
let memorySingleton: MemoryStore | null = null;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const env = redisEnv();
  if (!env || isBuildPhase()) {
    redisSingleton = null;
    return null;
  }
  try {
    redisSingleton = new Redis({ url: env.url, token: env.token });
    return redisSingleton;
  } catch {
    redisSingleton = null;
    return null;
  }
}

export type WooftagStore = {
  kind: StoreKind;
  rateLimit(
    key: string,
    limit: number,
    windowSec: number,
  ): Promise<{ ok: boolean; count: number }>;
  getDay(utcDate?: string): Promise<DayCounts>;
  /** Atomically take one of today's 200 slots (UTC day key; no rollover). */
  reserveDailySlot(utcDate?: string): Promise<{ reserved: boolean } & DayCounts>;
  releaseDailySlot(utcDate?: string): Promise<void>;
  putHash(hash: string, mintedAt: string): Promise<boolean>;
  /** True if this browser id already minted (durable lock). */
  isBrowserBound(browserId: string): Promise<boolean>;
  /** Bind browser id after successful mint. Returns false if already bound. */
  bindBrowser(browserId: string, mintedAt: string): Promise<boolean>;
  getQueue(): Promise<QueueItem[]>;
  setQueue(items: QueueItem[]): Promise<void>;
  /** Record a passed woof-check stamp for this browser (undated Redis set — anonymous mint). */
  addSchoolStamp(browserId: string, topicSlug: string): Promise<void>;
  /** Undated topic slugs (anonymous mint while X claim flag is off). */
  getSchoolStamps(browserId: string): Promise<string[]>;
  /**
   * Day-scoped stamp for X daily claims: wooftag:stamps:<browserId>:<utcDate>.
   * Undated keys are left intact and ignored for claims.
   */
  addDaySchoolStamp(browserId: string, utcDate: string, topicSlug: string): Promise<void>;
  /** Topic slugs stamped for this browser on the given UTC date. */
  getDaySchoolStamps(browserId: string, utcDate: string): Promise<string[]>;
  /** Existing claim for this X user on this UTC date, or null. */
  getXClaim(xUserId: string, utcDate: string): Promise<XClaimRecord | null>;
  /** Bind Wooftag to X user + UTC date (SET NX). Returns false if already claimed that day. */
  putXClaim(record: XClaimRecord): Promise<boolean>;
  /** Append to per-account history (newest first, capped). */
  pushXClaimHistory(xUserId: string, item: XClaimHistoryItem): Promise<void>;
  /** Past claims for this X account (newest first). */
  listXClaimHistory(xUserId: string): Promise<XClaimHistoryItem[]>;
};

class RedisStore implements WooftagStore {
  kind: StoreKind = "upstash";
  constructor(private redis: Redis) {}

  async rateLimit(key: string, limit: number, windowSec: number) {
    const k = `wooftag:rl:${key}`;
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.expire(k, windowSec);
    return { ok: count <= limit, count };
  }

  async getDay(utcDate = utcDateKey()): Promise<DayCounts> {
    const mintedRaw = await this.redis.get<number | string>(`wooftag:day:${utcDate}`);
    const minted = Number(mintedRaw ?? 0) || 0;
    const queue = await this.getQueue();
    return {
      utcDate,
      minted,
      remaining: Math.max(0, WOOFTAG_DAILY_CAP - minted),
      cap: WOOFTAG_DAILY_CAP,
      queueLength: queue.length,
    };
  }

  async reserveDailySlot(utcDate = utcDateKey()) {
    // Per-UTC-day counter — a new date key resets to 0; unused yesterday slots are gone.
    const k = `wooftag:day:${utcDate}`;
    const minted = await this.redis.incr(k);
    if (minted === 1) await this.redis.expire(k, DAY_TTL_SEC);
    if (minted > WOOFTAG_DAILY_CAP) {
      await this.redis.decr(k);
      const day = await this.getDay(utcDate);
      return { reserved: false, ...day };
    }
    const day = await this.getDay(utcDate);
    return { reserved: true, ...day };
  }

  async releaseDailySlot(utcDate = utcDateKey()) {
    const k = `wooftag:day:${utcDate}`;
    const n = await this.redis.decr(k);
    if (n < 0) await this.redis.set(k, 0, { ex: DAY_TTL_SEC });
  }

  async putHash(hash: string, mintedAt: string) {
    const k = `wooftag:h:${hash}`;
    const ok = await this.redis.set(k, mintedAt, { nx: true, ex: HASH_TTL_SEC });
    return Boolean(ok);
  }

  async isBrowserBound(browserId: string) {
    const v = await this.redis.get(`wooftag:browser:${browserId}`);
    return v != null && v !== "";
  }

  async bindBrowser(browserId: string, mintedAt: string) {
    const ok = await this.redis.set(`wooftag:browser:${browserId}`, mintedAt, {
      nx: true,
      ex: BROWSER_TTL_SEC,
    });
    return Boolean(ok);
  }


  async addSchoolStamp(browserId: string, topicSlug: string) {
    const k = `wooftag:stamps:${browserId}`;
    await this.redis.sadd(k, topicSlug);
    await this.redis.expire(k, STAMP_TTL_SEC);
  }

  async getSchoolStamps(browserId: string): Promise<string[]> {
    const members = await this.redis.smembers(`wooftag:stamps:${browserId}`);
    if (!Array.isArray(members)) return [];
    return members.filter((m): m is string => typeof m === "string" && m.length > 0);
  }

  async addDaySchoolStamp(browserId: string, utcDate: string, topicSlug: string) {
    const k = `wooftag:stamps:${browserId}:${utcDate}`;
    await this.redis.sadd(k, topicSlug);
    await this.redis.expire(k, DAY_STAMP_TTL_SEC);
  }

  async getDaySchoolStamps(browserId: string, utcDate: string): Promise<string[]> {
    const members = await this.redis.smembers(`wooftag:stamps:${browserId}:${utcDate}`);
    if (!Array.isArray(members)) return [];
    return members.filter((m): m is string => typeof m === "string" && m.length > 0);
  }

  async getXClaim(xUserId: string, utcDate: string): Promise<XClaimRecord | null> {
    const raw = await this.redis.get<XClaimRecord | string>(`wooftag:x:${xUserId}:${utcDate}`);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return normalizeXClaim(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    return normalizeXClaim(raw);
  }

  async putXClaim(record: XClaimRecord): Promise<boolean> {
    const k = `wooftag:x:${record.xUserId}:${record.utcDate}`;
    const ok = await this.redis.set(k, record, { nx: true, ex: X_CLAIM_TTL_SEC });
    return Boolean(ok);
  }

  async pushXClaimHistory(xUserId: string, item: XClaimHistoryItem) {
    const k = `wooftag:x:history:${xUserId}`;
    const raw = await this.redis.get<XClaimHistoryItem[] | string>(k);
    let list: XClaimHistoryItem[] = [];
    if (Array.isArray(raw)) list = raw;
    else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as XClaimHistoryItem[];
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }
    const next = [item, ...list.filter((h) => h.utcDate !== item.utcDate)].slice(0, X_HISTORY_MAX);
    await this.redis.set(k, next, { ex: X_HISTORY_TTL_SEC });
  }

  async listXClaimHistory(xUserId: string): Promise<XClaimHistoryItem[]> {
    const raw = await this.redis.get<XClaimHistoryItem[] | string>(`wooftag:x:history:${xUserId}`);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(isHistoryItem);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as XClaimHistoryItem[];
        return Array.isArray(parsed) ? parsed.filter(isHistoryItem) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async getQueue(): Promise<QueueItem[]> {
    const raw = await this.redis.get<QueueItem[] | string>(QUEUE_KEY);
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((x) => x && typeof x.id === "string" && typeof x.t === "number");
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as QueueItem[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async setQueue(items: QueueItem[]) {
    await this.redis.set(QUEUE_KEY, items);
  }
}

/** Local-dev only. Lost on process restart. Never used in production. */
class MemoryStore implements WooftagStore {
  kind: StoreKind = "memory";
  private counts = new Map<string, number>();
  private hashes = new Map<string, string>();
  private browsers = new Map<string, string>();
  private stamps = new Map<string, Set<string>>();
  private dayStamps = new Map<string, Set<string>>();
  private xClaims = new Map<string, XClaimRecord>();
  private xHistory = new Map<string, XClaimHistoryItem[]>();
  private rl = new Map<string, { n: number; reset: number }>();
  private queue: QueueItem[] = [];

  async rateLimit(key: string, limit: number, windowSec: number) {
    const now = Date.now();
    const cur = this.rl.get(key);
    if (!cur || now > cur.reset) {
      this.rl.set(key, { n: 1, reset: now + windowSec * 1000 });
      return { ok: true, count: 1 };
    }
    cur.n += 1;
    return { ok: cur.n <= limit, count: cur.n };
  }

  async getDay(utcDate = utcDateKey()): Promise<DayCounts> {
    const minted = this.counts.get(utcDate) ?? 0;
    return {
      utcDate,
      minted,
      remaining: Math.max(0, WOOFTAG_DAILY_CAP - minted),
      cap: WOOFTAG_DAILY_CAP,
      queueLength: this.queue.length,
    };
  }

  async reserveDailySlot(utcDate = utcDateKey()) {
    const minted = (this.counts.get(utcDate) ?? 0) + 1;
    if (minted > WOOFTAG_DAILY_CAP) {
      return { reserved: false, ...(await this.getDay(utcDate)) };
    }
    this.counts.set(utcDate, minted);
    return { reserved: true, ...(await this.getDay(utcDate)) };
  }

  async releaseDailySlot(utcDate = utcDateKey()) {
    const n = this.counts.get(utcDate) ?? 0;
    this.counts.set(utcDate, Math.max(0, n - 1));
  }

  async putHash(hash: string, mintedAt: string) {
    if (this.hashes.has(hash)) return false;
    this.hashes.set(hash, mintedAt);
    return true;
  }

  async isBrowserBound(browserId: string) {
    return this.browsers.has(browserId);
  }

  async bindBrowser(browserId: string, mintedAt: string) {
    if (this.browsers.has(browserId)) return false;
    this.browsers.set(browserId, mintedAt);
    return true;
  }


  async addSchoolStamp(browserId: string, topicSlug: string) {
    let set = this.stamps.get(browserId);
    if (!set) {
      set = new Set();
      this.stamps.set(browserId, set);
    }
    set.add(topicSlug);
  }

  async getSchoolStamps(browserId: string) {
    return [...(this.stamps.get(browserId) ?? [])];
  }

  async addDaySchoolStamp(browserId: string, utcDate: string, topicSlug: string) {
    const key = `${browserId}:${utcDate}`;
    let set = this.dayStamps.get(key);
    if (!set) {
      set = new Set();
      this.dayStamps.set(key, set);
    }
    set.add(topicSlug);
  }

  async getDaySchoolStamps(browserId: string, utcDate: string) {
    return [...(this.dayStamps.get(`${browserId}:${utcDate}`) ?? [])];
  }

  async getXClaim(xUserId: string, utcDate: string) {
    return this.xClaims.get(`${xUserId}:${utcDate}`) ?? null;
  }

  async putXClaim(record: XClaimRecord) {
    const key = `${record.xUserId}:${record.utcDate}`;
    if (this.xClaims.has(key)) return false;
    this.xClaims.set(key, { ...record });
    return true;
  }

  async pushXClaimHistory(xUserId: string, item: XClaimHistoryItem) {
    const prev = this.xHistory.get(xUserId) ?? [];
    const next = [item, ...prev.filter((h) => h.utcDate !== item.utcDate)].slice(0, X_HISTORY_MAX);
    this.xHistory.set(xUserId, next);
  }

  async listXClaimHistory(xUserId: string) {
    return [...(this.xHistory.get(xUserId) ?? [])];
  }

  async getQueue() {
    return [...this.queue];
  }

  async setQueue(items: QueueItem[]) {
    this.queue = [...items];
  }
}

function normalizeXClaim(raw: unknown): XClaimRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.xUserId !== "string" ||
    typeof o.username !== "string" ||
    typeof o.createdAt !== "string" ||
    typeof o.utcDate !== "string" ||
    typeof o.issuedAt !== "string" ||
    typeof o.tagHash !== "string" ||
    typeof o.tagEnc !== "string"
  ) {
    return null;
  }
  return {
    xUserId: o.xUserId,
    username: o.username,
    createdAt: o.createdAt,
    utcDate: o.utcDate,
    issuedAt: o.issuedAt,
    tagHash: o.tagHash,
    tagEnc: o.tagEnc,
  };
}

function isHistoryItem(h: unknown): h is XClaimHistoryItem {
  if (!h || typeof h !== "object") return false;
  const o = h as Record<string, unknown>;
  return (
    typeof o.utcDate === "string" &&
    typeof o.issuedAt === "string" &&
    typeof o.tagHash === "string" &&
    typeof o.tagEnc === "string"
  );
}

export function getWooftagStore(): WooftagStore | null {
  if (isBuildPhase()) return null;
  const redis = getRedis();
  if (redis) return new RedisStore(redis);
  if (process.env.NODE_ENV !== "production") {
    if (!memorySingleton) {
      memorySingleton = new MemoryStore();
      console.warn(
        "[wooftag] TODO: no Upstash/Vercel KV — using in-memory store (dev only, not durable).",
      );
    }
    return memorySingleton;
  }
  return null;
}

/** Dev/test only — wipe the in-memory store between cases. */
export function resetMemoryStoreForTests(): void {
  if (process.env.NODE_ENV === "production") return;
  memorySingleton = new MemoryStore();
  redisSingleton = undefined;
}

