import { describe, expect, test, beforeEach, mock } from "bun:test";
mock.module("server-only", () => ({}));
import { NextRequest } from "next/server";
import { LB } from "@/lib/starform/config";

const { resetStarFormMemoryForTests } = await import("@/lib/starform/store");
const { POST: scorePOST, GET: scoreGET } = await import("./starform/score/route");
const { GET: boardGET } = await import("./starform/leaderboard/route");

const ok = { origin: "http://localhost:3000" };
function post(headers: Record<string, string>, body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost:3000/api/starform/score", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
// 60 pts of G stars chained from nothing: honest and plausible in 100s.
const dets = (n: number) => Array.from({ length: n }, (_, i) => ({ k: "G", m: Math.min(i, 4) }));
const pts = (n: number) => dets(n).reduce((s, d) => s + 6 * [1, 1.25, 1.5, 1.75, 2][d.m], 0);
const run = (name: string, n = 3, duration = 100) => ({ name, score: pts(n), durationSec: duration, detonations: dets(n) });

beforeEach(() => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  resetStarFormMemoryForTests();
});

describe("starform routes", () => {
  test("foreign Origin → 403, GET score → 405", async () => {
    const res = await scorePOST(post({ origin: "https://evil.example" }, run("x")));
    expect(res.status).toBe(403);
    const cross = await scorePOST(post({ "sec-fetch-site": "cross-site" }, run("x")));
    expect(cross.status).toBe(403);
    expect(scoreGET().status).toBe(405);
  });

  test("valid run lands on the board; read via GET leaderboard", async () => {
    const res = await scorePOST(post(ok, run("Hosky Pup")));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { placed: boolean; top: { name: string; score: number }[] };
    expect(body.placed).toBe(true);
    expect(body.top[0].name).toBe("Hosky Pup");
    const board = (await (await boardGET()).json()) as { available: boolean; top: unknown[] };
    expect(board.available).toBe(true);
    expect(board.top.length).toBe(1);
  });

  test("only the top 3 stay; a lower score does not place", async () => {
    for (const [i, n] of [[1, 5], [2, 6], [3, 7], [4, 8]] as const) {
      await scorePOST(post(ok, run(`P${i}`, n), `9.9.9.${i}`));
    }
    const low = (await (await scorePOST(post(ok, run("Low", 2), "9.9.9.9"))).json()) as { placed: boolean };
    expect(low.placed).toBe(false);
    const board = (await (await boardGET()).json()) as { top: { name: string }[] };
    expect(board.top.map((t) => t.name)).toEqual(["P4", "P3", "P2"]);
  });

  test("tampered score, junk, oversized and bad names are rejected", async () => {
    expect((await scorePOST(post(ok, { ...run("x"), score: 9999 }))).status).toBe(422);
    expect((await scorePOST(post(ok, "not json"))).status).toBe(400);
    expect((await scorePOST(post(ok, { ...run("   ") }))).status).toBe(400);
    expect((await scorePOST(post(ok, "x".repeat(20000)))).status).toBe(413);
  });

  test("names are sanitized before storing", async () => {
    const res = await scorePOST(post(ok, run("<b>Ace</b> 😀 pilot with a very long name")));
    const body = (await res.json()) as { top: { name: string }[] };
    expect(body.top[0].name).not.toMatch(/[<>/]/);
    expect(body.top[0].name.length).toBeLessThanOrEqual(LB.nameMax);
  });

  test("rate limit kicks in per IP", async () => {
    let last = 200;
    for (let i = 0; i < LB.rateLimit + 2; i++) last = (await scorePOST(post(ok, run("R"), "7.7.7.7"))).status;
    expect(last).toBe(429);
  });
});
