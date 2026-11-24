import { describe, expect, test } from "bun:test";
import {
  backupPathname,
  buildSnapshot,
  cronAuthorized,
  prunable,
  READ_COMMANDS,
  restoreCommands,
  shouldBackup,
  type Command,
} from "./snapshot";

type Val =
  | { type: "string"; v: string }
  | { type: "set"; v: string[] }
  | { type: "zset"; v: [string, number][] }
  | { type: "hash"; v: Record<string, string> }
  | { type: "list"; v: string[] };

function fakeRedis(data: Record<string, Val & { ttl?: number }>) {
  const sent: string[] = [];
  const send = async (cmds: Command[]) =>
    cmds.map((c) => {
      const [name, key] = [String(c[0]), String(c[1])];
      sent.push(name);
      const e = data[key];
      switch (name) {
        case "SCAN": {
          const keys = Object.keys(data);
          // two pages to exercise the cursor loop
          return key === "0" ? ["7", keys.slice(0, 2)] : ["0", keys.slice(2)];
        }
        case "DBSIZE":
          return Object.keys(data).length;
        case "TYPE":
          return e ? e.type : "none";
        case "PTTL":
          return e ? (e.ttl ?? -1) : -2;
        case "GET":
          return e?.type === "string" ? e.v : null;
        case "SMEMBERS":
        case "LRANGE":
          return e && (e.type === "set" || e.type === "list") ? e.v : [];
        case "ZRANGE":
          return e?.type === "zset" ? e.v.flatMap(([m, s]) => [m, String(s)]) : [];
        case "HGETALL":
          return e?.type === "hash" ? Object.entries(e.v).flat() : [];
        default:
          throw new Error(`unexpected ${name}`);
      }
    });
  return { send, sent };
}

describe("redis snapshot", () => {
  test("backs up durable keys with type + TTL, skips rate limits and run stamps, sends only reads", async () => {
    const { send, sent } = fakeRedis({
      "qw:starform:top3:dist": { type: "zset", v: [['{"id":"a"}', 12.5]] },
      "wooftag:h2:abc": { type: "string", v: "2026-11-01T00:00:00Z", ttl: 5000 },
      "wooftag:rl:mint:1.2.3.4": { type: "string", v: "3", ttl: 100 },
      "qw:starform:run:xyz": { type: "string", v: "1", ttl: 100 },
      "wooftag:stamps:b1": { type: "set", v: ["sky", "stars"] },
      "wooftag:queue": { type: "string", v: "[]" },
    });
    const snap = await buildSnapshot(send, new Date("2026-11-24T02:17:00Z"));
    expect(snap.keys.map((k) => k.key).sort()).toEqual([
      "qw:starform:top3:dist",
      "wooftag:h2:abc",
      "wooftag:queue",
      "wooftag:stamps:b1",
    ]);
    expect(snap.skipped).toBe(2);
    expect(snap.dbsize).toBe(6);
    expect(snap.counts["starform:board"]).toBe(1);
    expect(snap.counts["wooftag:fingerprints:hmac"]).toBe(1);
    const z = snap.keys.find((k) => k.key === "qw:starform:top3:dist")!;
    expect(z).toEqual({ key: "qw:starform:top3:dist", type: "zset", ttlMs: null, value: [{ member: '{"id":"a"}', score: 12.5 }] });
    expect(snap.keys.find((k) => k.key === "wooftag:h2:abc")!.ttlMs).toBe(5000);
    for (const n of sent) expect(READ_COMMANDS.has(n)).toBe(true);
  });

  test("shouldBackup keeps board + wooftag records, drops ephemeral keys", () => {
    expect(shouldBackup("qw:starform:top3:dist")).toBe(true);
    expect(shouldBackup("qw:starform:top3")).toBe(true);
    expect(shouldBackup("wooftag:x:history:123")).toBe(true);
    expect(shouldBackup("qw:starform:rl:start:1.1.1.1")).toBe(false);
    expect(shouldBackup("wooftag:rl:status:1.1.1.1")).toBe(false);
  });

  test("restoreCommands rebuilds each type and re-applies TTL", () => {
    expect(restoreCommands({ key: "k", type: "string", ttlMs: 900, value: "v" })).toEqual([["SET", "k", "v", "PX", 900]]);
    expect(restoreCommands({ key: "k", type: "string", ttlMs: null, value: "v" })).toEqual([["SET", "k", "v"]]);
    expect(restoreCommands({ key: "z", type: "zset", ttlMs: null, value: [{ member: "m", score: 3 }] })).toEqual([["ZADD", "z", 3, "m"]]);
    expect(restoreCommands({ key: "s", type: "set", ttlMs: 50, value: ["a", "b"] })).toEqual([
      ["SADD", "s", "a", "b"],
      ["PEXPIRE", "s", 50],
    ]);
  });

  test("pathnames are per UTC day and only files older than 30 days are pruned", () => {
    const now = new Date("2026-11-24T02:17:00Z");
    expect(backupPathname(now)).toBe("redis-backups/2026-11-24.json");
    expect(
      prunable(
        ["redis-backups/2026-10-24.json", "redis-backups/2026-10-25.json", "redis-backups/2026-11-24.json", "other/2020-01-01.json"],
        now,
      ),
    ).toEqual(["redis-backups/2026-10-24.json"]);
  });

  test("cron auth needs the exact bearer secret", () => {
    const s = "s".repeat(32);
    expect(cronAuthorized(`Bearer ${s}`, s)).toBe(true);
    expect(cronAuthorized(null, s)).toBe(false);
    expect(cronAuthorized(`Bearer ${s}x`, s)).toBe(false);
    expect(cronAuthorized(`Bearer x${s.slice(1)}`, s)).toBe(false);
    expect(cronAuthorized("Bearer ", "")).toBe(false);
    expect(cronAuthorized("Bearer short", "short")).toBe(false);
  });
});
