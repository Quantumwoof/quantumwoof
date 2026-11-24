/**
 * Daily Redis snapshot (read-only).
 *
 * Reads every durable app key from Upstash over the REST pipeline API and
 * returns a JSON snapshot with each key's type, value and remaining TTL, so
 * scripts/restore-backup.ts can put it back exactly.
 *
 * Safety: only commands in READ_COMMANDS are ever sent (enforced in
 * `sendPipeline`), and the route uses the Upstash read-only token when it is
 * configured. Nothing here writes, deletes or expires a key.
 *
 * Skipped on purpose (short-lived, rebuilt by normal traffic):
 *   wooftag:rl:*            rate-limit counters (minutes)
 *   qw:starform:rl:*        Star Form rate-limit counters
 *   qw:starform:run:*       single-use run-start stamps
 * Everything else is included — notably the Star Form board
 * (qw:starform:top3:dist, old qw:starform:top3), Wooftag fingerprints
 * (wooftag:h2:*, wooftag:h:*), browser locks, school stamps, day counters,
 * the queue, and X-claim records/history/locks.
 */

export const SNAPSHOT_VERSION = 1;

export const SKIP_PREFIXES = ["wooftag:rl:", "qw:starform:rl:", "qw:starform:run:"] as const;

/** Summary groups (first match wins; anything else lands in "other"). */
export const GROUPS: { name: string; prefix: string }[] = [
  { name: "starform:board", prefix: "qw:starform:top3" },
  { name: "wooftag:fingerprints:hmac", prefix: "wooftag:h2:" },
  { name: "wooftag:fingerprints:legacy", prefix: "wooftag:h:" },
  { name: "wooftag:browser", prefix: "wooftag:browser:" },
  { name: "wooftag:stamps", prefix: "wooftag:stamps:" },
  { name: "wooftag:day", prefix: "wooftag:day:" },
  { name: "wooftag:queue", prefix: "wooftag:queue" },
  { name: "wooftag:x", prefix: "wooftag:x:" },
  { name: "wooftag:other", prefix: "wooftag:" },
  { name: "qw:other", prefix: "qw:" },
];

export const READ_COMMANDS = new Set([
  "SCAN",
  "TYPE",
  "PTTL",
  "GET",
  "SMEMBERS",
  "ZRANGE",
  "HGETALL",
  "LRANGE",
  "DBSIZE",
]);

export type RedisType = "string" | "set" | "zset" | "hash" | "list";

export type SnapshotEntry =
  | { key: string; type: "string"; ttlMs: number | null; value: string }
  | { key: string; type: "set"; ttlMs: number | null; value: string[] }
  | { key: string; type: "zset"; ttlMs: number | null; value: { member: string; score: number }[] }
  | { key: string; type: "hash"; ttlMs: number | null; value: Record<string, string> }
  | { key: string; type: "list"; ttlMs: number | null; value: string[] };

export type Snapshot = {
  version: number;
  createdAt: string;
  source: string;
  dbsize: number;
  skippedPrefixes: readonly string[];
  skipped: number;
  counts: Record<string, number>;
  keys: SnapshotEntry[];
};

export type Command = (string | number)[];

/** Sends a batch of commands; returns one result per command (throws on any error). */
export type PipelineFn = (cmds: Command[]) => Promise<unknown[]>;

export function shouldBackup(key: string): boolean {
  return !SKIP_PREFIXES.some((p) => key.startsWith(p));
}

export function groupOf(key: string): string {
  return GROUPS.find((g) => key.startsWith(g.prefix))?.name ?? "other";
}

/** Upstash REST pipeline client that refuses anything but read commands. */
export function upstashPipeline(url: string, token: string): PipelineFn {
  const base = url.replace(/\/+$/, "");
  return async (cmds) => {
    for (const c of cmds) {
      const name = String(c[0]).toUpperCase();
      if (!READ_COMMANDS.has(name)) throw new Error(`refusing non-read command ${name}`);
    }
    if (cmds.length === 0) return [];
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds.map((c) => c.map(String))),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`redis pipeline HTTP ${res.status}`);
    const rows = (await res.json()) as { result?: unknown; error?: string }[];
    return rows.map((r, i) => {
      if (r.error) throw new Error(`redis ${String(cmds[i][0])} failed`);
      return r.result;
    });
  };
}

function ttlOf(pttl: unknown): number | null {
  const n = Number(pttl);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const BATCH = 200;

export async function buildSnapshot(send: PipelineFn, now = new Date(), source = "upstash"): Promise<Snapshot> {
  // 1. SCAN the whole keyspace (cursor loop).
  const all = new Set<string>();
  let cursor = "0";
  let guard = 0;
  do {
    const [res] = await send([["SCAN", cursor, "COUNT", 1000]]);
    const [next, keys] = res as [string | number, string[]];
    for (const k of keys) all.add(k);
    cursor = String(next);
    if (++guard > 10_000) throw new Error("scan did not finish");
  } while (cursor !== "0");

  const [dbsizeRaw] = await send([["DBSIZE"]]);
  const keep = [...all].filter(shouldBackup).sort();
  const entries: SnapshotEntry[] = [];

  for (let i = 0; i < keep.length; i += BATCH) {
    const batch = keep.slice(i, i + BATCH);
    const meta = await send(batch.flatMap((k) => [["TYPE", k], ["PTTL", k]] as Command[]));
    const typed = batch.map((key, j) => ({
      key,
      type: String(meta[j * 2]) as RedisType | "none",
      ttlMs: ttlOf(meta[j * 2 + 1]),
    }));
    const live = typed.filter((t) => t.type !== "none");
    const valueCmds: Command[] = live.map(({ key, type }) => {
      switch (type) {
        case "string":
          return ["GET", key];
        case "set":
          return ["SMEMBERS", key];
        case "zset":
          return ["ZRANGE", key, 0, -1, "WITHSCORES"];
        case "hash":
          return ["HGETALL", key];
        case "list":
          return ["LRANGE", key, 0, -1];
        default:
          throw new Error(`unsupported redis type ${type} for a backed-up key`);
      }
    });
    const values = await send(valueCmds);
    live.forEach((t, j) => {
      const v = values[j];
      if (v === null || v === undefined) return; // expired between TYPE and read
      switch (t.type) {
        case "string":
          entries.push({ key: t.key, type: "string", ttlMs: t.ttlMs, value: String(v) });
          break;
        case "set":
        case "list":
          entries.push({ key: t.key, type: t.type, ttlMs: t.ttlMs, value: (v as unknown[]).map(String) });
          break;
        case "zset": {
          const flat = (v as unknown[]).map(String);
          const value: { member: string; score: number }[] = [];
          for (let z = 0; z + 1 < flat.length; z += 2) value.push({ member: flat[z], score: Number(flat[z + 1]) });
          entries.push({ key: t.key, type: "zset", ttlMs: t.ttlMs, value });
          break;
        }
        case "hash": {
          const value: Record<string, string> = {};
          if (Array.isArray(v)) for (let h = 0; h + 1 < v.length; h += 2) value[String(v[h])] = String(v[h + 1]);
          else Object.assign(value, v as Record<string, string>);
          entries.push({ key: t.key, type: "hash", ttlMs: t.ttlMs, value });
          break;
        }
      }
    });
  }

  const counts: Record<string, number> = {};
  for (const e of entries) counts[groupOf(e.key)] = (counts[groupOf(e.key)] ?? 0) + 1;

  return {
    version: SNAPSHOT_VERSION,
    createdAt: now.toISOString(),
    source,
    dbsize: Number(dbsizeRaw) || all.size,
    skippedPrefixes: SKIP_PREFIXES,
    skipped: all.size - keep.length,
    counts,
    keys: entries,
  };
}

/** Commands that recreate one entry (used by the restore script). */
export function restoreCommands(e: SnapshotEntry): Command[] {
  const cmds: Command[] = [];
  switch (e.type) {
    case "string":
      cmds.push(e.ttlMs ? ["SET", e.key, e.value, "PX", e.ttlMs] : ["SET", e.key, e.value]);
      return cmds;
    case "set":
      if (e.value.length) cmds.push(["SADD", e.key, ...e.value]);
      break;
    case "zset":
      if (e.value.length) cmds.push(["ZADD", e.key, ...e.value.flatMap((z) => [z.score, z.member])]);
      break;
    case "hash":
      if (Object.keys(e.value).length) cmds.push(["HSET", e.key, ...Object.entries(e.value).flat()]);
      break;
    case "list":
      if (e.value.length) cmds.push(["RPUSH", e.key, ...e.value]);
      break;
  }
  if (e.ttlMs && cmds.length) cmds.push(["PEXPIRE", e.key, e.ttlMs]);
  return cmds;
}

/** Backups live at redis-backups/YYYY-MM-DD.json (UTC day). */
export const BACKUP_PREFIX = "redis-backups/";
export const KEEP_DAYS = 30;

export function backupPathname(now: Date): string {
  return `${BACKUP_PREFIX}${now.toISOString().slice(0, 10)}.json`;
}

/** Pathnames older than KEEP_DAYS days (by the date in the name). */
export function prunable(pathnames: string[], now: Date, keepDays = KEEP_DAYS): string[] {
  const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - keepDays * 86_400_000;
  return pathnames.filter((p) => {
    const m = /^redis-backups\/(\d{4}-\d{2}-\d{2})\.json$/.exec(p);
    if (!m) return false;
    const t = Date.parse(`${m[1]}T00:00:00Z`);
    return Number.isFinite(t) && t < cutoff;
  });
}

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
