/**
 * Route-level tests for the optional "Claim with X" flow (WOOFTAG_X_CLAIM).
 * In-memory store only; the X session is a locally signed cookie (no X API).
 * The flag is switched on for this process only — never in production.
 */
import { describe, expect, test, beforeEach, afterEach, mock, setSystemTime } from "bun:test";
mock.module("server-only", () => ({}));
import { NextRequest } from "next/server";
import { resetMemoryStoreForTests } from "@/lib/wooftag-store";
import { isWooftagFormat, newOpaqueId } from "@/lib/wooftag";

// Dynamic imports so the server-only mock above is registered first.
const { SESSION_COOKIE, createSessionToken } = await import("@/lib/auth-session");
const { woofSchoolAnswers } = await import("@/content/woofSchool-answers");
const { POST: checkPOST } = await import("./woof-school/check/route");
const { POST: claimPOST } = await import("./wooftag/claim/route");
const { POST: mintPOST } = await import("./wooftag/mint/route");

const ENV_KEYS = [
  "NODE_ENV",
  "WOOFTAG_PEPPER",
  "WOOFTAG_X_CLAIM",
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "QW_SESSION_SECRET",
] as const;
const saved: Record<string, string | undefined> = {};

const DAY1 = Date.parse("2026-09-25T10:00:00.000Z");
const DAY2 = Date.parse("2026-09-26T10:00:00.000Z");
const X_UID = "1111111111";
const READY = Object.keys(woofSchoolAnswers);

let browserId = "";
let ip = 0;

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  process.env.WOOFTAG_PEPPER = "x-claim-test-pepper";
  process.env.WOOFTAG_X_CLAIM = "on";
  process.env.X_CLIENT_ID = "test-client";
  process.env.X_CLIENT_SECRET = "test-secret";
  process.env.QW_SESSION_SECRET = "x-claim-test-session-secret-0123456789";
  resetMemoryStoreForTests();
  browserId = newOpaqueId(16);
  setSystemTime(new Date(DAY1));
});

afterEach(() => {
  setSystemTime();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else (process.env as Record<string, string>)[k] = saved[k]!;
  }
  resetMemoryStoreForTests();
});

function req(
  path: string,
  body: unknown,
  withSession = true,
  uid = X_UID,
  extraCookies: string[] = [],
  browser: string | null = browserId,
) {
  ip += 1;
  const cookies = [
    ...(browser === null ? [] : [`qw_wooftag_browser=${browser}`]),
    `qw_woof_gate=${Date.now() - 60_000}`,
  ];
  if (withSession) {
    // Signed like the real OAuth callback would, valid for 2h from "now".
    const token = createSessionToken(uid, `pup${uid}`, "2019-05-01T00:00:00.000Z");
    expect(token).toBeTruthy();
    cookies.push(`${SESSION_COOKIE}=${token}`);
  }
  cookies.push(...extraCookies);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": `10.2.${(ip >> 8) & 255}.${ip & 255}`,
      cookie: cookies.join("; "),
    },
    body: JSON.stringify(body),
  });
}

async function passAllQuizzes(browser: string = browserId) {
  for (const topic of READY) {
    const res = await checkPOST(
      req("/api/woof-school/check", { topic, answers: woofSchoolAnswers[topic] }, true, X_UID, [], browser),
    );
    const body = (await res.json()) as { passed: boolean };
    expect(body.passed).toBe(true);
  }
}

type ClaimJson = {
  ok: boolean;
  status?: string;
  error?: string;
  tag?: string;
  utcDate?: string;
  missingTopics?: string[];
};

async function claim(
  withSession = true,
  uid = X_UID,
  body: unknown = {},
  extraCookies: string[] = [],
  browser: string | null = browserId,
): Promise<{ status: number; body: ClaimJson & { position?: number; queueToken?: string } }> {
  const res = await claimPOST(req("/api/wooftag/claim", body, withSession, uid, extraCookies, browser));
  return { status: res.status, body: (await res.json()) as ClaimJson };
}

describe("POST /api/wooftag/claim (flag on, in-memory, mocked X session)", () => {
  test("no session → 401 sign_in_required; anonymous mint is closed", async () => {
    const r = await claim(false);
    expect(r.status).toBe(401);
    expect(r.body.error).toBe("sign_in_required");
    const m = await mintPOST(req("/api/wooftag/mint", {}, false));
    expect(m.status).toBe(403);
    expect(((await m.json()) as ClaimJson).error).toBe("sign_in_required");
  });

  test("day 1 without quizzes → school_incomplete (all 9 missing)", async () => {
    const r = await claim();
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("school_incomplete");
    expect(r.body.missingTopics?.length).toBe(9);
  });

  test("next UTC day: rejected until that day's 9 quizzes are re-passed, then succeeds", async () => {
    await passAllQuizzes();
    const day1 = await claim();
    expect(day1.status).toBe(200);
    expect(day1.body.status).toBe("claimed");
    expect(day1.body.utcDate).toBe("2026-09-25");
    expect(isWooftagFormat(day1.body.tag ?? "")).toBe(true);

    const again = await claim();
    expect(again.body.status).toBe("already_claimed");
    expect(again.body.tag).toBe(day1.body.tag);

    // Next UTC day — yesterday's (and undated) stamps must not count.
    setSystemTime(new Date(DAY2));
    const stale = await claim();
    expect(stale.status).toBe(400);
    expect(stale.body.error).toBe("school_incomplete");
    expect(stale.body.utcDate).toBe("2026-09-26");
    expect(stale.body.missingTopics?.sort()).toEqual([...READY].sort());

    // Re-passing only some of today's quizzes is still not enough.
    for (const topic of READY.slice(0, 8)) {
      await checkPOST(req("/api/woof-school/check", { topic, answers: woofSchoolAnswers[topic] }));
    }
    const partial = await claim();
    expect(partial.body.error).toBe("school_incomplete");
    expect(partial.body.missingTopics).toEqual([READY[8]!]);

    await passAllQuizzes();
    const day2 = await claim();
    expect(day2.status).toBe(200);
    expect(day2.body.status).toBe("claimed");
    expect(day2.body.utcDate).toBe("2026-09-26");
    expect(isWooftagFormat(day2.body.tag ?? "")).toBe(true);
    expect(day2.body.tag).not.toBe(day1.body.tag);
  });

  test("a wrong answer on day 2 does not stamp that topic", async () => {
    await passAllQuizzes();
    setSystemTime(new Date(DAY2));
    for (const topic of READY.slice(0, 8)) {
      await checkPOST(req("/api/woof-school/check", { topic, answers: woofSchoolAnswers[topic] }));
    }
    const wrong = await checkPOST(req("/api/woof-school/check", { topic: READY[8], answers: {} }));
    expect(((await wrong.json()) as { passed: boolean }).passed).toBe(false);
    const r = await claim();
    expect(r.body.error).toBe("school_incomplete");
  });

  test("concurrent claims from one X account issue exactly one tag per day", async () => {
    await passAllQuizzes();
    const results = await Promise.all(Array.from({ length: 6 }, () => claim()));
    const claimed = results.filter((r) => r.body.status === "claimed");
    expect(claimed.length).toBe(1);
    for (const r of results) {
      expect(["claimed", "already_claimed"]).toContain(r.body.status!);
      if (r.body.tag) expect(r.body.tag).toBe(claimed[0]!.body.tag);
    }
  });

  test("queue: a public X id in the body/cookie cannot jump the line", async () => {
    const { getWooftagStore } = await import("@/lib/wooftag-store");
    const store = getWooftagStore()!;
    for (let i = 0; i < 200; i++) await store.reserveDailySlot("2026-09-25");
    const headBrowser = newOpaqueId(16);
    const jumperBrowser = newOpaqueId(16);
    await passAllQuizzes(headBrowser);
    const head = await claim(true, "2222222222", {}, [], headBrowser);
    expect(head.body.status).toBe("queued");
    expect(head.body.position).toBe(1);

    setSystemTime(new Date(DAY2));
    await passAllQuizzes(headBrowser);
    await passAllQuizzes(jumperBrowser);
    const jumper = await claim(
      true,
      "3333333333",
      { queueToken: "2222222222" },
      ["qw_wooftag_q=2222222222"],
      jumperBrowser,
    );
    expect(jumper.body.status).toBe("queued");
    expect(jumper.body.position).toBe(2);
    expect(jumper.body.queueToken).toBe("3333333333");

    const headDay2 = await claim(true, "2222222222", {}, [], headBrowser);
    expect(headDay2.body.status).toBe("claimed");
    const next = await claim(true, "3333333333", {}, [], jumperBrowser);
    expect(next.body.status).toBe("claimed");
  });

  describe("one successful claim per browser per UTC day", () => {
    const A = "4444444444";
    const B = "5555555555";

    test("missing or malformed browser cookie → 400 browser_required", async () => {
      const none = await claim(true, A, {}, [], null);
      expect(none.status).toBe(400);
      expect(none.body.error).toBe("browser_required");
      const junk = await claim(true, A, {}, [], "not-a-valid-id!");
      expect(junk.status).toBe(400);
      expect(junk.body.error).toBe("browser_required");
    });

    test("two X accounts, same browser, same day → second is rejected (neutral copy)", async () => {
      await passAllQuizzes();
      const first = await claim(true, A);
      expect(first.body.status).toBe("claimed");
      const second = await claim(true, B);
      expect(second.status).toBe(409);
      expect(second.body.error).toBe("browser_already_claimed_today");
      expect(second.body.tag).toBeUndefined();
      const msg = (second.body as { message?: string }).message ?? "";
      expect(msg).toContain("This browser already claimed today");
      expect(msg).not.toContain(A);
      expect(msg).not.toContain(`pup${A}`);
      // The first account still re-opens its own tag on this browser.
      const again = await claim(true, A);
      expect(again.body.status).toBe("already_claimed");
      expect(again.body.tag).toBe(first.body.tag);
      // Only one slot was used today.
      const { getWooftagStore } = await import("@/lib/wooftag-store");
      expect((await getWooftagStore()!.getDay("2026-09-25")).minted).toBe(1);
    });

    test("two X accounts racing from one browser → exactly one succeeds", async () => {
      await passAllQuizzes();
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => claim(true, i % 2 === 0 ? A : B)),
      );
      const claimed = results.filter((r) => r.body.status === "claimed");
      expect(claimed.length).toBe(1);
      const blocked = results.filter((r) => r.body.error === "browser_already_claimed_today");
      const same = results.filter((r) => r.body.status === "already_claimed");
      expect(claimed.length + blocked.length + same.length).toBe(10);
      expect(blocked.length).toBeGreaterThan(0);
      const { getWooftagStore } = await import("@/lib/wooftag-store");
      expect((await getWooftagStore()!.getDay("2026-09-25")).minted).toBe(1);
    });

    test("next UTC day after re-passing quizzes → the other account is allowed", async () => {
      await passAllQuizzes();
      expect((await claim(true, A)).body.status).toBe("claimed");
      expect((await claim(true, B)).body.error).toBe("browser_already_claimed_today");
      setSystemTime(new Date(DAY2));
      const stale = await claim(true, B);
      expect(stale.body.error).toBe("school_incomplete");
      await passAllQuizzes();
      const day2 = await claim(true, B);
      expect(day2.body.status).toBe("claimed");
      expect(day2.body.utcDate).toBe("2026-09-26");
    });

    test("different browsers with different accounts → both allowed", async () => {
      const other = newOpaqueId(16);
      await passAllQuizzes();
      await passAllQuizzes(other);
      const [a, b] = await Promise.all([claim(true, A), claim(true, B, {}, [], other)]);
      expect(a.body.status).toBe("claimed");
      expect(b.body.status).toBe("claimed");
      expect(a.body.tag).not.toBe(b.body.tag);
    });

    test("a failed claim releases the browser lock (retry can succeed)", async () => {
      await passAllQuizzes();
      const { getWooftagStore } = await import("@/lib/wooftag-store");
      const store = getWooftagStore()!;
      // Take the slot + lock as a claim would, then release it the way the route
      // does when a later step (tag store / encrypt / bind) fails.
      const r = await store.admitOrQueue({
        utcDate: "2026-09-25",
        token: A,
        newToken: A,
        now: Date.now(),
        browserDayLock: { browserId, owner: A },
      });
      expect(r.status).toBe("reserved");
      // Another owner cannot release it…
      await store.releaseBrowserDayLock(browserId, "2026-09-25", B);
      expect((await claim(true, B)).body.error).toBe("browser_already_claimed_today");
      // …the holder can.
      await store.releaseDailySlot("2026-09-25");
      await store.releaseBrowserDayLock(browserId, "2026-09-25", A);
      expect((await claim(true, B)).body.status).toBe("claimed");
    });
  });
});
