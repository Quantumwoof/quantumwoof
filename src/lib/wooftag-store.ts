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
 * Atomicity: every read-modify-write on shared counters runs in one step —
 * Redis Lua scripts in production (EVALSHA), synchronous critical sections in
 * the in-memory store. `admitOrQueue` decides "mint now" vs "join the FIFO"
 * and takes the daily slot in the same script, so concurrent requests can
 * never exceed the cap or share a queue position.
 *
 * Browser lock: `wooftag:browser:<id>` binds the durable `qw_wooftag_browser`
 * cookie id after a successful mint (one sniff per browser).
 *
 * Tag fingerprints: new tags → `wooftag:h2:<HMAC-SHA256 hex>`; legacy tags stay
 * at `wooftag:h:<SHA-256(tag+pepper) hex>` (never rewritten). Lookups and
 * dedupe check h2 first, then the legacy key.
 *
 * School stamps: `wooftag:stamps:<browserId>` (Redis set of topic slugs) records
 * server-verified woof-check passes; mint requires stamps for all ready topics.
 *
 * TODO: do not add a filesystem JSON fallback — serverless disks are not durable.
 */

import { Redis } from "@upstash/redis";
import { utcDateKey, WOOFTAG_DAILY_CAP } from "@/lib/wooftag";
import type { WooftagFingerprint } from "@/lib/wooftag-hash";

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

/** Default age after which a queue entry is dropped (the sniffer never came back). */
export const QUEUE_STALE_MS = 36 * 60 * 60 * 1000;

export type AdmitOptions = {
  /** UTC date key of the daily counter to charge. */
  utcDate: string;
  /** Caller's existing queue id (cookie/body token, or X user id). */
  token?: string;
  /** Id to use when the caller has no token and must join the queue. */
  newToken: string;
  now: number;
  staleMs?: number;
};

export type AdmitResult =
  | ({ status: "reserved" } & DayCounts)
  | ({ status: "queued"; token: string; position: number } & DayCounts);

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
/** Current tag fingerprint keys (HMAC-SHA256). */
export const HASH2_PREFIX = "wooftag:h2:";
/** Legacy tag fingerprint keys (SHA-256(tag+pepper)) — read-only. */
export const LEGACY_HASH_PREFIX = "wooftag:h:";

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
  /**
   * Store a new tag fingerprint under the HMAC key (SET NX). Returns false if the
   * tag already exists under either the HMAC key or the legacy SHA-256 key.
   * Never writes the legacy key.
   */
  putTagFingerprint(fp: WooftagFingerprint, mintedAt: string): Promise<boolean>;
  /** Look up a tag: HMAC key first, then legacy SHA-256 key. */
  findTagFingerprint(
    fp: WooftagFingerprint,
  ): Promise<{ scheme: "hmac" | "legacy"; mintedAt: string } | null>;
  /** True if this browser id already minted (durable lock). */
  isBrowserBound(browserId: string): Promise<boolean>;
  /** Bind browser id after successful mint. Returns false if already bound. */
  bindBrowser(browserId: string, mintedAt: string): Promise<boolean>;
  getQueue(): Promise<QueueItem[]>;
  /**
   * Atomically: prune stale queue entries, then either take one of today's
   * slots (bowl open and the caller is the queue head or the queue is empty —
   * the caller's entry is removed) or put the caller in the FIFO queue
   * (existing position kept; new entries appended). Never exceeds the cap and
   * never hands out the same position twice.
   */
  admitOrQueue(opts: AdmitOptions): Promise<AdmitResult>;
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

/** Per-client cache of loaded scripts (EVALSHA first, EVAL on NOSCRIPT). */
const scriptCache = new WeakMap<Redis, Map<string, ReturnType<Redis["createScript"]>>>();

class RedisStore implements WooftagStore {
  kind: StoreKind = "upstash";
  constructor(private redis: Redis) {}

  private runScript(script: string, keys: string[], args: (string | number)[]) {
    let byScript = scriptCache.get(this.redis);
    if (!byScript) {
      byScript = new Map();
      scriptCache.set(this.redis, byScript);
    }
    let s = byScript.get(script);
    if (!s) {
      s = this.redis.createScript(script);
      byScript.set(script, s);
    }
    return s.exec(keys, args.map(String));
  }

  async rateLimit(key: string, limit: number, windowSec: number) {
    const k = `wooftag:rl:${key}`;
    // INCR + EXPIRE in one script so a crash can never leave a TTL-less counter.
    const count = Number(await this.runScript(LUA_RATE_LIMIT, [k], [windowSec])) || 0;
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
    // Check-and-increment in one script: the counter never goes past the cap.
    const k = `wooftag:day:${utcDate}`;
    const n = Number(
      await this.runScript(LUA_RESERVE_SLOT, [k], [WOOFTAG_DAILY_CAP, DAY_TTL_SEC]),
    );
    const day = await this.getDay(utcDate);
    return { reserved: n > 0, ...day };
  }

  async releaseDailySlot(utcDate = utcDateKey()) {
    await this.runScript(LUA_RELEASE_SLOT, [`wooftag:day:${utcDate}`], []);
  }

  async admitOrQueue(opts: AdmitOptions): Promise<AdmitResult> {
    const raw = await this.runScript(
      LUA_ADMIT_OR_QUEUE,
      [QUEUE_KEY, `wooftag:day:${opts.utcDate}`],
      [
        opts.token ?? "",
        opts.newToken,
        Math.floor(opts.now),
        opts.staleMs ?? QUEUE_STALE_MS,
        WOOFTAG_DAILY_CAP,
        DAY_TTL_SEC,
      ],
    );
    const r = Array.isArray(raw) ? raw : [];
    const minted = Number(r[2] ?? 0) || 0;
    const base: DayCounts = {
      utcDate: opts.utcDate,
      minted,
      remaining: Math.max(0, WOOFTAG_DAILY_CAP - minted),
      cap: WOOFTAG_DAILY_CAP,
      queueLength: Number(r[3] ?? 0) || 0,
    };
    if (r[0] === "reserved") return { status: "reserved", ...base };
    if (r[0] === "queued") {
      return {
        status: "queued",
        // Upstash auto-deserializes numeric-looking strings (e.g. X user ids).
        token: String(r[4] ?? ""),
        position: Number(r[1] ?? 0) || 0,
        ...base,
      };
    }
    throw new Error("wooftag admit script returned an unexpected reply");
  }

  async putTagFingerprint(fp: WooftagFingerprint, mintedAt: string) {
    // Dedupe against legacy tags too (read-only; legacy keys are never touched).
    if (await this.findTagFingerprint(fp)) return false;
    const ok = await this.redis.set(`${HASH2_PREFIX}${fp.hmac}`, mintedAt, {
      nx: true,
      ex: HASH_TTL_SEC,
    });
    return Boolean(ok);
  }

  async findTagFingerprint(fp: WooftagFingerprint) {
    const v2 = await this.redis.get<string>(`${HASH2_PREFIX}${fp.hmac}`);
    if (v2 != null && v2 !== "") return { scheme: "hmac" as const, mintedAt: String(v2) };
    const v1 = await this.redis.get<string>(`${LEGACY_HASH_PREFIX}${fp.legacy}`);
    if (v1 != null && v1 !== "") return { scheme: "legacy" as const, mintedAt: String(v1) };
    return null;
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

  async admitOrQueue(opts: AdmitOptions): Promise<AdmitResult> {
    // No awaits inside: the whole decision runs as one critical section,
    // mirroring the Redis Lua script.
    const minted = this.counts.get(opts.utcDate) ?? 0;
    const decision = decideAdmission(this.queue, minted, opts);
    this.queue = decision.queue;
    if (decision.status === "reserved") this.counts.set(opts.utcDate, minted + 1);
    const nowMinted = this.counts.get(opts.utcDate) ?? 0;
    const base: DayCounts = {
      utcDate: opts.utcDate,
      minted: nowMinted,
      remaining: Math.max(0, WOOFTAG_DAILY_CAP - nowMinted),
      cap: WOOFTAG_DAILY_CAP,
      queueLength: this.queue.length,
    };
    if (decision.status === "reserved") return { status: "reserved", ...base };
    return { status: "queued", token: decision.token, position: decision.position, ...base };
  }

  async putTagFingerprint(fp: WooftagFingerprint, mintedAt: string) {
    if (await this.findTagFingerprint(fp)) return false;
    this.hashes.set(`${HASH2_PREFIX}${fp.hmac}`, mintedAt);
    return true;
  }

  async findTagFingerprint(fp: WooftagFingerprint) {
    const v2 = this.hashes.get(`${HASH2_PREFIX}${fp.hmac}`);
    if (v2) return { scheme: "hmac" as const, mintedAt: v2 };
    const v1 = this.hashes.get(`${LEGACY_HASH_PREFIX}${fp.legacy}`);
    if (v1) return { scheme: "legacy" as const, mintedAt: v1 };
    return null;
  }

  /** Test-only: plant a legacy `wooftag:h:<sha256>` entry. */
  seedLegacyHash(legacyHex: string, mintedAt: string) {
    this.hashes.set(`${LEGACY_HASH_PREFIX}${legacyHex}`, mintedAt);
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

}

type AdmissionDecision =
  | { status: "reserved"; queue: QueueItem[] }
  | { status: "queued"; queue: QueueItem[]; token: string; position: number };

/**
 * Pure FIFO/cap decision shared by the in-memory store (and mirrored by
 * LUA_ADMIT_OR_QUEUE). The bowl is open while `minted < cap`; queued sniffers
 * from earlier days drain first — only the head may take a slot while the
 * queue is non-empty; everyone else keeps (or joins) their place in line.
 */
export function decideAdmission(
  queue: QueueItem[],
  minted: number,
  opts: AdmitOptions,
): AdmissionDecision {
  const stale = opts.staleMs ?? QUEUE_STALE_MS;
  const live = queue.filter(
    (i) =>
      i && typeof i.id === "string" && i.id !== "" && typeof i.t === "number" &&
      opts.now - i.t < stale,
  );
  const token = opts.token ?? "";

  const enqueue = (): AdmissionDecision => {
    if (token) {
      const idx = live.findIndex((i) => i.id === token);
      if (idx >= 0) return { status: "queued", queue: live, token, position: idx + 1 };
    }
    const id = token || opts.newToken;
    const next = [...live, { id, t: opts.now }];
    return { status: "queued", queue: next, token: id, position: next.length };
  };

  if (minted >= WOOFTAG_DAILY_CAP) return enqueue();
  if (live.length > 0 && live[0]?.id !== token) return enqueue();
  return {
    status: "reserved",
    queue: token ? live.filter((i) => i.id !== token) : live,
  };
}

/** KEYS[1]=counter · ARGV[1]=window seconds → new count. */
const LUA_RATE_LIMIT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 or redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return c
`;

/** KEYS[1]=day counter · ARGV[1]=cap, ARGV[2]=ttl → new count, or 0 when full. */
const LUA_RESERVE_SLOT = `
local n = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
if n >= tonumber(ARGV[1]) then return 0 end
n = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
return n
`;

/** KEYS[1]=day counter → decrement, floored at 0. */
const LUA_RELEASE_SLOT = `
local n = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
if n > 0 then return redis.call('DECR', KEYS[1]) end
return 0
`;

/**
 * KEYS[1]=queue (JSON array of {id,t} — same format the app always stored),
 * KEYS[2]=day counter.
 * ARGV: token, newToken, now(ms), staleMs, cap, dayTtl.
 * Reply: {status, position, minted, queueLength, token}.
 */
const LUA_ADMIT_OR_QUEUE = `
local token = ARGV[1]
local now = tonumber(ARGV[3])
local stale = tonumber(ARGV[4])
local cap = tonumber(ARGV[5])

local q = {}
local raw = redis.call('GET', KEYS[1])
if raw then
  local ok, parsed = pcall(cjson.decode, raw)
  if ok and type(parsed) == 'string' then ok, parsed = pcall(cjson.decode, parsed) end
  if ok and type(parsed) == 'table' then q = parsed end
end

local live = {}
local changed = false
for _, it in ipairs(q) do
  if type(it) == 'table' and type(it.id) == 'string' and it.id ~= ''
    and type(it.t) == 'number' and (now - it.t) < stale then
    live[#live + 1] = { id = it.id, t = it.t }
  else
    changed = true
  end
end

local function save()
  if #live == 0 then
    redis.call('SET', KEYS[1], '[]')
  else
    redis.call('SET', KEYS[1], cjson.encode(live))
  end
end

local function find(id)
  for i, it in ipairs(live) do
    if it.id == id then return i end
  end
  return 0
end

local minted = tonumber(redis.call('GET', KEYS[2]) or '0') or 0

local function enqueue()
  if token ~= '' then
    local idx = find(token)
    if idx > 0 then
      if changed then save() end
      return { 'queued', idx, minted, #live, token }
    end
  end
  local id = token
  if id == '' then id = ARGV[2] end
  live[#live + 1] = { id = id, t = now }
  save()
  return { 'queued', #live, minted, #live, id }
end

if minted >= cap then return enqueue() end
if #live > 0 and live[1].id ~= token then return enqueue() end

if token ~= '' then
  local idx = find(token)
  if idx > 0 then
    table.remove(live, idx)
    changed = true
  end
end
if changed then save() end
local n = redis.call('INCR', KEYS[2])
if redis.call('TTL', KEYS[2]) < 0 then redis.call('EXPIRE', KEYS[2], tonumber(ARGV[6])) end
return { 'reserved', 0, n, #live, token }
`;

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

/** Test-only: a Redis-backed store over an explicit client (local Redis tests). */
export function createRedisStoreForTests(redis: Redis): WooftagStore {
  return new RedisStore(redis);
}

/** Test-only: plant a legacy-hashed tag in the in-memory store. */
export function seedLegacyHashForTests(legacyHex: string, mintedAt: string): void {
  if (process.env.NODE_ENV === "production") return;
  memorySingleton?.seedLegacyHash(legacyHex, mintedAt);
}

/** Dev/test only — wipe the in-memory store between cases. */
export function resetMemoryStoreForTests(): void {
  if (process.env.NODE_ENV === "production") return;
  memorySingleton = new MemoryStore();
  redisSingleton = undefined;
}

