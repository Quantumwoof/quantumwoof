import "server-only";
/**
 * Hosky Star Form all-time top 3 — its own Redis keys, never wooftag:*.
 *
 *   qw:starform:top3          ZSET  member = JSON {id,name,score,at}, score = score
 *   qw:starform:rl:<ip>       INT   rate-limit counter (TTL = window)
 *
 * Insert + trim run in one Lua script, so concurrent posts can never leave
 * more than three entries or lose a higher score.
 */
import { Redis } from "@upstash/redis";
import { LB, TOP3_KEY } from "./config";

export type TopEntry = { id: string; name: string; score: number; at: string };

export type StarFormStore = {
  kind: "upstash" | "memory";
  top3(): Promise<TopEntry[]>;
  /** Insert if it beats the current third place (strictly) or the board has room. */
  submit(entry: TopEntry): Promise<boolean>;
  rateLimit(ip: string): Promise<boolean>;
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
      typeof o.score === "number" &&
      typeof o.at === "string"
    ) {
      return { id: o.id, name: o.name, score: o.score, at: o.at };
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
      [String(entry.score), JSON.stringify(entry), String(LB.top)],
    );
    return Number(res) === 1;
  }

  async rateLimit(ip: string) {
    const key = `${LB.prefix}:rl:${ip}`;
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, LB.rateWindowSec);
    else if (n > 1 && n <= 3) await this.redis.expire(key, LB.rateWindowSec); // heal a lost TTL early
    return n <= LB.rateLimit;
  }
}

class MemoryTop3 implements StarFormStore {
  kind = "memory" as const;
  entries: TopEntry[] = [];
  hits = new Map<string, number>();

  async top3() {
    return [...this.entries].sort((a, b) => b.score - a.score).slice(0, LB.top);
  }
  async submit(entry: TopEntry) {
    const cur = await this.top3();
    if (cur.length >= LB.top && cur[cur.length - 1].score >= entry.score) return false;
    this.entries = [...cur, entry].sort((a, b) => b.score - a.score).slice(0, LB.top);
    return true;
  }
  async rateLimit(ip: string) {
    const n = (this.hits.get(ip) ?? 0) + 1;
    this.hits.set(ip, n);
    return n <= LB.rateLimit;
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
