import "server-only";
/**
 * Hosky Star Form all-time top 3 by distance — its own Redis keys, never wooftag:*.
 *
 *   qw:starform:top3:dist     ZSET  member = JSON {id,name,distance,at}, score = distance (ls)
 *   qw:starform:run:<id>      STR   run-start timestamp (ms), single use, short TTL
 *   qw:starform:rl:<ip>       INT   rate-limit counter (TTL = window)
 *   qw:starform:rl:start:<ip> INT   rate-limit counter for run starts
 *
 * The older points board (`qw:starform:top3`) is left untouched and unused.
 * Insert + trim run in one Lua script, so concurrent posts can never leave
 * more than three entries or lose a farther run.
 */
import { Redis } from "@upstash/redis";
import { LB, RUN_PREFIX, TOP3_KEY } from "./config";

export type TopEntry = { id: string; name: string; distance: number; at: string };

export type StarFormStore = {
  kind: "upstash" | "memory";
  top3(): Promise<TopEntry[]>;
  /** Insert if it beats the current third place (strictly) or the board has room. */
  submit(entry: TopEntry): Promise<boolean>;
  rateLimit(ip: string, kind?: "score" | "start"): Promise<boolean>;
  /** Remember when a run started (so a submit can't claim more time than passed). */
  startRun(id: string, nowMs: number): Promise<void>;
  /** Single use: returns the start time and forgets it, or null if unknown/expired. */
  takeRun(id: string): Promise<number | null>;
};

const LUA_SUBMIT = `
local n = redis.call('ZCARD', KEYS[1])
local top = tonumber(ARGV[3])
if n >= top then
  local lo = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  if tonumber(lo[2]) >= tonumber(ARGV[1]) then return 0 end
end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
redis.call('ZREMRANGEBYRANK', KEYS[1], 0, -(top + 1))
return 1
`;

function parseMember(raw: unknown): TopEntry | null {
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<TopEntry> | null;
    if (
      o &&
      typeof o.id === "string" &&
      typeof o.name === "string" &&
      typeof o.distance === "number" &&
      typeof o.at === "string"
    ) {
      return { id: o.id, name: o.name, distance: o.distance, at: o.at };
    }
  } catch {
    /* ignore */
  }
  return null;
}

class RedisTop3 implements StarFormStore {
  kind = "upstash" as const;
  constructor(private redis: Redis) {}

  async top3() {
    const rows = (await this.redis.zrange(TOP3_KEY, 0, LB.top - 1, { rev: true })) as unknown[];
    return rows.map(parseMember).filter((e): e is TopEntry => e !== null);
  }

  async submit(entry: TopEntry) {
    const res = await this.redis.eval(
      LUA_SUBMIT,
      [TOP3_KEY],
      [String(entry.distance), JSON.stringify(entry), String(LB.top)],
    );
    return Number(res) === 1;
  }

  async rateLimit(ip: string, kind: "score" | "start" = "score") {
    const key = kind === "start" ? `${LB.prefix}:rl:start:${ip}` : `${LB.prefix}:rl:${ip}`;
    const limit = kind === "start" ? LB.startRateLimit : LB.rateLimit;
    const n = await this.redis.incr(key);
    if (n <= 3) await this.redis.expire(key, LB.rateWindowSec); // set TTL, and heal a lost one early
    return n <= limit;
  }

  async startRun(id: string, nowMs: number) {
    await this.redis.set(`${RUN_PREFIX}${id}`, String(nowMs), { ex: LB.runTtlSec });
  }

  async takeRun(id: string) {
    const v = await this.redis.getdel<string | number>(`${RUN_PREFIX}${id}`);
    const n = Number(v);
    return v === null || v === undefined || !Number.isFinite(n) ? null : n;
  }
}

class MemoryTop3 implements StarFormStore {
  kind = "memory" as const;
  entries: TopEntry[] = [];
  hits = new Map<string, number>();
  runs = new Map<string, number>();

  async top3() {
    return [...this.entries].sort((a, b) => b.distance - a.distance).slice(0, LB.top);
  }
  async submit(entry: TopEntry) {
    const cur = await this.top3();
    if (cur.length >= LB.top && cur[cur.length - 1].distance >= entry.distance) return false;
    this.entries = [...cur, entry].sort((a, b) => b.distance - a.distance).slice(0, LB.top);
    return true;
  }
  async rateLimit(ip: string, kind: "score" | "start" = "score") {
    const key = `${kind}:${ip}`;
    const n = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, n);
    return n <= (kind === "start" ? LB.startRateLimit : LB.rateLimit);
  }
  async startRun(id: string, nowMs: number) {
    this.runs.set(id, nowMs);
  }
  async takeRun(id: string) {
    const v = this.runs.get(id);
    this.runs.delete(id);
    return v ?? null;
  }
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim() || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim() || "";
  return url && token ? { url, token } : null;
}

function isBuildPhase() {
  const phase = process.env.NEXT_PHASE ?? "";
  return phase.includes("build") || phase.includes("compile") || process.env.npm_lifecycle_event === "build";
}

let redisSingleton: Redis | null | undefined;
let memory: MemoryTop3 | null = null;

export function getStarFormStore(): StarFormStore | null {
  if (isBuildPhase()) return null;
  if (redisSingleton === undefined) {
    const env = redisEnv();
    try {
      redisSingleton = env ? new Redis({ url: env.url, token: env.token }) : null;
    } catch {
      redisSingleton = null;
    }
  }
  if (redisSingleton) return new RedisTop3(redisSingleton);
  if (process.env.NODE_ENV !== "production") {
    memory ??= new MemoryTop3();
    return memory;
  }
  return null;
}

/** Dev/test only. */
export function resetStarFormMemoryForTests() {
  if (process.env.NODE_ENV === "production") return;
  memory = new MemoryTop3();
}
