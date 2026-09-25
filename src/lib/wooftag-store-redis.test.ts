/**
 * Redis-backed store tests (Lua atomicity) — opt-in, never touches production.
 *
 * Runs only when WOOFTAG_TEST_REDIS_URL points at a throwaway local Redis, e.g.
 *   redis-server --port 6399 --save '' &
 *   WOOFTAG_TEST_REDIS_URL=redis://127.0.0.1:6399/15 bun test
 * The selected DB is FLUSHed between cases. A tiny in-process shim speaks the
 * Upstash REST protocol so the real @upstash/redis client and scripts are used.
 */
import { describe, expect, test, beforeAll, afterAll, beforeEach, mock } from "bun:test";
mock.module("server-only", () => ({}));
import { RedisClient } from "bun";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import {
  createRedisStoreForTests,
  getWooftagStore,
  resetMemoryStoreForTests,
  type AdmitResult,
  type WooftagStore,
} from "./wooftag-store";
import { WOOFTAG_DAILY_CAP, newOpaqueId, utcDateKey } from "./wooftag";

const REDIS_URL = process.env.WOOFTAG_TEST_REDIS_URL?.trim() ?? "";
const run = REDIS_URL && !/upstash\.io|vercel/i.test(REDIS_URL) ? describe : describe.skip;

const READY = [
  "looking-up",
  "our-backyard",
  "solar-system",
  "star-lives",
  "light-tricks",
  "deep-sky",
  "cosmos-timeline",
  "go-outside",
  "missions-humans",
];

function b64(v: unknown): unknown {
  if (typeof v === "string") return v === "OK" ? v : Buffer.from(v, "utf8").toString("base64");
  if (Array.isArray(v)) return v.map(b64);
  return v;
}

run("Redis store (local Redis via Upstash REST shim)", () => {
  let client: RedisClient;
  let server: ReturnType<typeof Bun.serve>;
  let upstash: Redis;
  let store: WooftagStore;
  const saved: Record<string, string | undefined> = {};

  async function exec(cmd: unknown[]): Promise<{ result?: unknown; error?: string }> {
    try {
      const [name, ...args] = cmd.map(String);
      return { result: await client.send(name!.toUpperCase(), args) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  beforeAll(async () => {
    client = new RedisClient(REDIS_URL);
    await client.connect();
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const body = (await req.json()) as unknown[];
        const enc = req.headers.get("upstash-encoding") === "base64";
        const shape = (r: { result?: unknown; error?: string }) =>
          r.error ? { error: r.error } : { result: enc ? b64(r.result) : r.result };
        if (new URL(req.url).pathname.endsWith("/pipeline")) {
          const out = [];
          for (const c of body as unknown[][]) out.push(shape(await exec(c)));
          return Response.json(out);
        }
        const r = await exec(body);
        return Response.json(shape(r), { status: r.error ? 400 : 200 });
      },
    });
    upstash = new Redis({
      url: `http://127.0.0.1:${server.port}`,
      token: "local-test",
      responseEncoding: false,
      enableAutoPipelining: false,
      retry: false,
    });
    store = createRedisStoreForTests(upstash);
    for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "NODE_ENV"]) {
      saved[k] = process.env[k];
    }
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetMemoryStoreForTests();
    server?.stop(true);
    client?.close();
  });

  beforeEach(async () => {
    await client.send("FLUSHDB", []);
    await client.send("SCRIPT", ["FLUSH"]);
  });

  test("250 concurrent admitOrQueue → 200 slots, 50 unique positions", async () => {
    const today = utcDateKey();
    const results = await Promise.all(
      Array.from({ length: 250 }, (_, i) =>
        store.admitOrQueue({ utcDate: today, newToken: `NEWTOKEN${i}`, now: Date.now() }),
      ),
    );
    const reserved = results.filter((r) => r.status === "reserved");
    const queued = results.filter(
      (r): r is Extract<AdmitResult, { status: "queued" }> => r.status === "queued",
    );
    expect(reserved.length).toBe(WOOFTAG_DAILY_CAP);
    expect(queued.length).toBe(50);
    expect(new Set(queued.map((q) => q.position)).size).toBe(50);
    expect(new Set(queued.map((q) => q.token)).size).toBe(50);
    expect(Number(await client.send("GET", [`wooftag:day:${today}`]))).toBe(WOOFTAG_DAILY_CAP);
    expect(Number(await client.send("TTL", [`wooftag:day:${today}`]))).toBeGreaterThan(0);
    const day = await store.getDay(today);
    expect(day.minted).toBe(WOOFTAG_DAILY_CAP);
    expect(day.queueLength).toBe(50);
  });

  test("reads a queue written in the legacy format and keeps it readable", async () => {
    const now = Date.now();
    await upstash.set("wooftag:queue", [
      { id: "LEGACYHEAD01", t: now - 1000 },
      { id: "1234567890", t: now - 500 },
      { id: "STALE0000001", t: now - 40 * 3600_000 },
    ]);
    const today = utcDateKey(now);
    const stranger = await store.admitOrQueue({ utcDate: today, newToken: "STRANGER01", now });
    expect(stranger.status).toBe("queued");
    if (stranger.status === "queued") expect(stranger.position).toBe(3);
    const numericId = await store.admitOrQueue({ utcDate: today, token: "1234567890", newToken: "N", now });
    expect(numericId.status).toBe("queued");
    if (numericId.status === "queued") {
      expect(numericId.token).toBe("1234567890");
      expect(numericId.position).toBe(2);
    }
    const head = await store.admitOrQueue({ utcDate: today, token: "LEGACYHEAD01", newToken: "N", now });
    expect(head.status).toBe("reserved");
    const q = await store.getQueue();
    expect(q.map((i) => i.id)).toEqual(["1234567890", "STRANGER01"]);
    expect(q[0]!.t).toBe(now - 500);
  });

  test("empty queue is stored as a JSON array", async () => {
    const now = Date.now();
    await upstash.set("wooftag:queue", [{ id: "ONLYONE00001", t: now }]);
    const r = await store.admitOrQueue({ utcDate: utcDateKey(now), token: "ONLYONE00001", newToken: "N", now });
    expect(r.status).toBe("reserved");
    expect(await client.send("GET", ["wooftag:queue"])).toBe("[]");
    expect(await store.getQueue()).toEqual([]);
  });

  test("reserve/release never cross the cap or go negative under concurrency", async () => {
    const today = "2026-09-25";
    const res = await Promise.all(Array.from({ length: 260 }, () => store.reserveDailySlot(today)));
    expect(res.filter((r) => r.reserved).length).toBe(WOOFTAG_DAILY_CAP);
    await Promise.all(Array.from({ length: 260 }, () => store.releaseDailySlot(today)));
    expect(Number(await client.send("GET", [`wooftag:day:${today}`]))).toBe(0);
  });

  test("rate limit counts atomically and always has a TTL", async () => {
    const res = await Promise.all(Array.from({ length: 30 }, () => store.rateLimit("t:1", 10, 600)));
    expect(res.filter((r) => r.ok).length).toBe(10);
    expect(new Set(res.map((r) => r.count)).size).toBe(30);
    expect(Number(await client.send("TTL", ["wooftag:rl:t:1"]))).toBeGreaterThan(0);
  });

  test("230 concurrent POST /api/wooftag/mint through the real client → cap holds", async () => {
    process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${server.port}`;
    process.env.UPSTASH_REDIS_REST_TOKEN = "local-test";
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
    process.env.WOOFTAG_PEPPER = "redis-route-test-pepper";
    delete process.env.WOOFTAG_X_CLAIM;
    resetMemoryStoreForTests();
    const live = getWooftagStore()!;
    expect(live.kind).toBe("upstash");

    const { POST: mintPOST } = await import("@/app/api/wooftag/mint/route");
    const browsers: string[] = [];
    for (let i = 0; i < 230; i++) {
      const id = newOpaqueId(16);
      for (const slug of READY) await live.addSchoolStamp(id, slug);
      browsers.push(id);
    }
    const responses = await Promise.all(
      browsers.map((b, i) =>
        mintPOST(
          new NextRequest("http://localhost:3000/api/wooftag/mint", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "x-forwarded-for": `10.1.${i >> 8}.${i & 255}`,
              cookie: `qw_wooftag_browser=${b}; qw_woof_gate=${Date.now() - 60_000}`,
            },
            body: "{}",
          }),
        ),
      ),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as {
      status?: string;
      tag?: string;
      position?: number;
    }[];
    const minted = bodies.filter((b) => b.status === "minted");
    const queued = bodies.filter((b) => b.status === "queued");
    expect(minted.length).toBe(WOOFTAG_DAILY_CAP);
    expect(new Set(minted.map((b) => b.tag)).size).toBe(WOOFTAG_DAILY_CAP);
    expect(queued.length).toBe(30);
    expect(new Set(queued.map((b) => b.position)).size).toBe(30);
    expect(Number(await client.send("GET", [`wooftag:day:${utcDateKey()}`]))).toBe(WOOFTAG_DAILY_CAP);
  }, 30_000);
});
