import { describe, expect, test, beforeEach, mock } from "bun:test";
mock.module("server-only", () => ({}));
import { NextRequest } from "next/server";

const store = await import("@/lib/starform/store");
const { LB, STEP } = await import("@/lib/starform/config");
const { simulateDistance } = await import("@/lib/starform/distance");
const { POST: scorePOST, GET: scoreGET } = await import("./starform/score/route");
const { POST: startPOST, GET: startGET } = await import("./starform/start/route");
const { GET: boardGET } = await import("./starform/leaderboard/route");

const ok = { origin: "http://localhost:3000" };
function post(path: string, headers: Record<string, string>, body: unknown, ip = "1.2.3.4") {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** n G stars, 5 s apart (chain grows), ending 10 s after the last one. */
function runBody(name: string, n = 3, runId = "ABCDEFGH23") {
  const detonations = Array.from({ length: n }, (_, i) => ({ k: "G", m: Math.min(i, 4), s: 1200 + i * 300 }));
  const steps = detonations[n - 1].s + 600;
  return { name, runId, steps, detonations };
}

/** Pretend the run started long enough ago for its claimed length. */
async function startedRun(steps: number, runId: string) {
  const s = store.getStarFormStore()!;
  await s.startRun(runId, Date.now() - steps * STEP * 1000 - 5000);
}

beforeEach(() => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  store.resetStarFormMemoryForTests();
});

describe("starform routes", () => {
  test("foreign Origin → 403 on both POSTs, GETs → 405", async () => {
    for (const handler of [scorePOST, startPOST]) {
      const res = await handler(post("/x", { origin: "https://evil.example" }, runBody("x")));
      expect(res.status).toBe(403);
      const cross = await handler(post("/x", { "sec-fetch-site": "cross-site" }, runBody("x")));
      expect(cross.status).toBe(403);
    }
    expect(scoreGET().status).toBe(405);
    expect(startGET().status).toBe(405);
  });

  test("start hands out a run id; submitting at once is rejected (not enough real time)", async () => {
    const res = await startPOST(post("/api/starform/start", ok, {}));
    const { runId } = (await res.json()) as { ok: boolean; runId: string };
    expect(runId).toMatch(/^[0-9A-Z]{8,}$/);
    const body = runBody("Quick", 3, runId);
    const r = await scorePOST(post("/api/starform/score", ok, body));
    expect(r.status).toBe(422);
  });

  test("valid run lands on the board with the server-recomputed distance", async () => {
    const body = runBody("Hosky Pup", 3);
    await startedRun(body.steps, body.runId);
    const res = await scorePOST(post("/api/starform/score", ok, body));
    expect(res.status).toBe(200);
    const out = (await res.json()) as { placed: boolean; distance: number; top: { name: string; distance: number }[] };
    expect(out.placed).toBe(true);
    expect(out.distance).toBeCloseTo(simulateDistance(body.steps, body.detonations as never), 3);
    expect(out.top[0].name).toBe("Hosky Pup");
    const board = (await (await boardGET()).json()) as { available: boolean; top: unknown[] };
    expect(board.available).toBe(true);
    expect(board.top.length).toBe(1);
  });

  test("run ids are single use", async () => {
    const body = runBody("Once", 3);
    await startedRun(body.steps, body.runId);
    expect((await scorePOST(post("/api/starform/score", ok, body))).status).toBe(200);
    expect((await scorePOST(post("/api/starform/score", ok, body))).status).toBe(422);
  });

  test("only the farthest 5 stay; a shorter run does not place", async () => {
    expect(LB.top).toBe(5);
    let i = 0;
    for (const n of [3, 4, 5, 6, 7, 8]) {
      i++;
      const body = runBody(`P${i}`, n, `ABCDEFGH0${i}`);
      await startedRun(body.steps, body.runId);
      await scorePOST(post("/api/starform/score", ok, body, `9.9.9.${i}`));
    }
    const low = runBody("Low", 2, "ABCDEFGH77");
    await startedRun(low.steps, low.runId);
    const res = (await (await scorePOST(post("/api/starform/score", ok, low, "9.9.9.9"))).json()) as { placed: boolean };
    expect(res.placed).toBe(false);
    const board = (await (await boardGET()).json()) as { top: { name: string }[] };
    expect(board.top.map((t) => t.name)).toEqual(["P6", "P5", "P4", "P3", "P2"]);
  });

  test("optional social handle is stored and shown; none stays none", async () => {
    const a = { ...runBody("Pup", 4, "ABCDEFGH31"), social: { p: "x", h: "@qtmwoof" } };
    await startedRun(a.steps, a.runId);
    const ra = await scorePOST(post("/api/starform/score", ok, a, "5.5.5.1"));
    expect(ra.status).toBe(200);
    const b = runBody("Plain", 3, "ABCDEFGH32");
    await startedRun(b.steps, b.runId);
    expect((await scorePOST(post("/api/starform/score", ok, b, "5.5.5.2"))).status).toBe(200);
    const c = { ...runBody("Empty", 2, "ABCDEFGH33"), social: { p: "ig", h: "  " } }; // picked an app, typed nothing
    await startedRun(c.steps, c.runId);
    expect((await scorePOST(post("/api/starform/score", ok, c, "5.5.5.3"))).status).toBe(200);
    const board = (await (await boardGET()).json()) as { top: { name: string; social?: { p: string; h: string } }[] };
    expect(board.top[0]).toMatchObject({ name: "Pup", social: { p: "x", h: "qtmwoof" } });
    expect(board.top[1].social).toBeUndefined();
    expect(board.top[2].social).toBeUndefined();
    expect(JSON.stringify(board.top[0])).not.toContain("id");
  });

  test("bad or hostile social handles are refused (400) and nothing is stored", async () => {
    const evil = [
      { p: "x", h: "<script>alert(1)</script>" },
      { p: "x", h: "javascript:alert(1)" },
      { p: "ig", h: "a\"onmouseover=\"x" },
      { p: "yt", h: "https://evil.example/@x" },
      { p: "tg", h: "ab" },
      { p: "tt", h: "x".repeat(80) },
      { p: "myspace", h: "tom" },
      { p: "x", h: 42 },
      "x:qtmwoof",
      [{ p: "x", h: "a" }],
    ];
    let k = 40;
    for (const social of evil) {
      const body = { ...runBody("Evil", 3, `ABCDEFGH${k}`), social };
      await startedRun(body.steps, body.runId);
      const res = await scorePOST(post("/api/starform/score", ok, body, `6.6.6.${k++}`));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("bad_social");
    }
    const board = (await (await boardGET()).json()) as { top: unknown[] };
    expect(board.top.length).toBe(0);
  });

  test("tampered timing, junk, oversized and bad names are rejected", async () => {
    const base = runBody("x", 3);
    await startedRun(base.steps, base.runId);
    const badChain = { ...base, detonations: base.detonations.map((d, i) => (i === 1 ? { ...d, m: 4 } : d)) };
    expect((await scorePOST(post("/api/starform/score", ok, badChain))).status).toBe(422);
    expect((await scorePOST(post("/api/starform/score", ok, "not json"))).status).toBe(400);
    expect((await scorePOST(post("/api/starform/score", ok, { ...runBody("   ") }))).status).toBe(400);
    expect((await scorePOST(post("/api/starform/score", ok, "x".repeat(20000)))).status).toBe(413);
    // a forged long run with no matching start
    const forged = runBody("Forger", 3, "FGHJKMNP11");
    expect((await scorePOST(post("/api/starform/score", ok, forged))).status).toBe(422);
  });

  test("names are sanitized before storing", async () => {
    const body = runBody("<b>Ace</b> 😀 pilot with a very long name", 3);
    await startedRun(body.steps, body.runId);
    const res = await scorePOST(post("/api/starform/score", ok, body));
    const out = (await res.json()) as { top: { name: string }[] };
    expect(out.top[0].name).not.toMatch(/[<>/]/);
    expect(out.top[0].name.length).toBeLessThanOrEqual(LB.nameMax);
  });

  test("rate limit kicks in per IP", async () => {
    let last = 200;
    for (let i = 0; i < LB.rateLimit + 2; i++) {
      last = (await scorePOST(post("/api/starform/score", ok, runBody("R"), "7.7.7.7"))).status;
    }
    expect(last).toBe(429);
  });
});
