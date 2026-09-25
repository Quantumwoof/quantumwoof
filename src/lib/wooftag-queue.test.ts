import { describe, expect, test, beforeEach, afterEach, mock, setSystemTime } from "bun:test";
mock.module("server-only", () => ({}));
import { NextRequest } from "next/server";
import {
  decideAdmission,
  getWooftagStore,
  resetMemoryStoreForTests,
  type AdmitResult,
} from "./wooftag-store";
import { WOOFTAG_DAILY_CAP, newOpaqueId, utcDateKey } from "./wooftag";

const { POST: mintPOST } = await import("@/app/api/wooftag/mint/route");

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

const DAY1 = Date.parse("2026-09-25T12:00:00.000Z");
const DAY2 = Date.parse("2026-09-26T09:00:00.000Z");

beforeEach(() => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  process.env.WOOFTAG_PEPPER = "queue-test-pepper";
  delete process.env.WOOFTAG_X_CLAIM;
  resetMemoryStoreForTests();
  setSystemTime(new Date(DAY1));
});

afterEach(() => {
  setSystemTime();
});

let ipCounter = 0;
function mintReq(browserId: string, opts: { queueToken?: string } = {}) {
  ipCounter += 1;
  const cookies = [
    `qw_wooftag_browser=${browserId}`,
    `qw_woof_gate=${Date.now() - 60_000}`,
  ];
  if (opts.queueToken) cookies.push(`qw_wooftag_q=${opts.queueToken}`);
  return new NextRequest("http://localhost:3000/api/wooftag/mint", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      // Distinct client IPs so the per-IP burst limit doesn't mask the cap.
      "x-forwarded-for": `10.0.${(ipCounter >> 8) & 255}.${ipCounter & 255}`,
      cookie: cookies.join("; "),
    },
    body: JSON.stringify({}),
  });
}

type MintJson = {
  ok: boolean;
  status?: string;
  tag?: string;
  queueToken?: string;
  position?: number;
  remaining?: number;
  error?: string;
};

async function stampedBrowser(): Promise<string> {
  const store = getWooftagStore()!;
  const id = newOpaqueId(16);
  for (const slug of READY) await store.addSchoolStamp(id, slug);
  return id;
}

function summarize(results: AdmitResult[]) {
  const reserved = results.filter((r) => r.status === "reserved");
  const queued = results.filter(
    (r): r is Extract<AdmitResult, { status: "queued" }> => r.status === "queued",
  );
  return { reserved, queued };
}

describe("admitOrQueue (in-memory) under concurrency", () => {
  test("250 simultaneous callers → exactly 200 slots, 50 unique queue positions", async () => {
    const store = getWooftagStore()!;
    const today = utcDateKey();
    const results = await Promise.all(
      Array.from({ length: 250 }, (_, i) =>
        store.admitOrQueue({ utcDate: today, newToken: `NEWTOKEN${i}`, now: Date.now() }),
      ),
    );
    const { reserved, queued } = summarize(results);
    expect(reserved.length).toBe(WOOFTAG_DAILY_CAP);
    expect(queued.length).toBe(50);
    expect(new Set(queued.map((q) => q.position)).size).toBe(50);
    expect(new Set(queued.map((q) => q.token)).size).toBe(50);
    expect(Math.min(...queued.map((q) => q.position))).toBe(1);
    expect(Math.max(...queued.map((q) => q.position))).toBe(50);
    const day = await store.getDay(today);
    expect(day.minted).toBe(WOOFTAG_DAILY_CAP);
    expect(day.queueLength).toBe(50);
  });

  test("same token racing itself keeps one queue entry and one position", async () => {
    const store = getWooftagStore()!;
    const today = utcDateKey();
    for (let i = 0; i < WOOFTAG_DAILY_CAP; i++) {
      await store.admitOrQueue({ utcDate: today, newToken: `FILL${i}`, now: Date.now() });
    }
    const token = "SAMETOKEN01";
    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        store.admitOrQueue({ utcDate: today, token, newToken: newOpaqueId(12), now: Date.now() }),
      ),
    );
    for (const r of results) {
      expect(r.status).toBe("queued");
      if (r.status === "queued") {
        expect(r.token).toBe(token);
        expect(r.position).toBe(1);
      }
    }
    expect((await store.getQueue()).length).toBe(1);
  });

  test("next UTC day: only the head drains, then new callers fill the rest", async () => {
    const store = getWooftagStore()!;
    const day1 = utcDateKey(DAY1);
    const day2 = utcDateKey(DAY2);
    for (let i = 0; i < WOOFTAG_DAILY_CAP; i++) {
      await store.admitOrQueue({ utcDate: day1, newToken: `FILL${i}`, now: DAY1 });
    }
    const q = await Promise.all(
      ["QHEAD0001", "QSECOND01", "QTHIRD001"].map((t, i) =>
        store.admitOrQueue({ utcDate: day1, token: t, newToken: "UNUSED", now: DAY1 + i }),
      ),
    );
    expect(q.map((r) => (r.status === "queued" ? r.position : 0)).sort()).toEqual([1, 2, 3]);
    const head = (await store.getQueue())[0]!.id;

    // Day 2: a stranger and #2 race the head — only the head gets a slot.
    const [stranger, second, headRes] = await Promise.all([
      store.admitOrQueue({ utcDate: day2, newToken: "STRANGER1", now: DAY2 }),
      store.admitOrQueue({ utcDate: day2, token: (await store.getQueue())[1]!.id, newToken: "X", now: DAY2 }),
      store.admitOrQueue({ utcDate: day2, token: head, newToken: "X", now: DAY2 }),
    ]);
    expect(headRes.status).toBe("reserved");
    expect(second.status).toBe("queued");
    expect(stranger.status).toBe("queued");
    expect((await store.getDay(day2)).minted).toBe(1);
    // Day 1 counter untouched — no rollover either way.
    expect((await store.getDay(day1)).minted).toBe(WOOFTAG_DAILY_CAP);
  });

  test("stale entries are pruned (36h)", () => {
    const d = decideAdmission(
      [
        { id: "OLD", t: DAY1 - 37 * 3600_000 },
        { id: "FRESH", t: DAY1 - 3600_000 },
      ],
      0,
      { utcDate: utcDateKey(DAY1), token: "FRESH", newToken: "N", now: DAY1 },
    );
    expect(d.status).toBe("reserved");
    expect(d.queue).toEqual([]);
  });
});

describe("POST /api/wooftag/mint under concurrency (in-memory)", () => {
  test("230 concurrent mints → 200 unique tags, 30 unique queue positions, never over cap", async () => {
    const browsers = await Promise.all(Array.from({ length: 230 }, () => stampedBrowser()));
    const responses = await Promise.all(browsers.map((b) => mintPOST(mintReq(b))));
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as MintJson[];

    const minted = bodies.filter((b) => b.status === "minted");
    const queued = bodies.filter((b) => b.status === "queued");
    expect(minted.length).toBe(WOOFTAG_DAILY_CAP);
    expect(queued.length).toBe(30);
    expect(new Set(minted.map((b) => b.tag)).size).toBe(WOOFTAG_DAILY_CAP);
    expect(new Set(queued.map((b) => b.position)).size).toBe(30);
    expect(new Set(queued.map((b) => b.queueToken)).size).toBe(30);
    expect(queued.every((b) => b.remaining === 0)).toBe(true);

    const store = getWooftagStore()!;
    const day = await store.getDay();
    expect(day.minted).toBe(WOOFTAG_DAILY_CAP);
    expect(day.queueLength).toBe(30);
  });

  test("double-submit from one browser mints once and consumes one slot", async () => {
    const b = await stampedBrowser();
    const responses = await Promise.all(Array.from({ length: 8 }, () => mintPOST(mintReq(b))));
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as MintJson[];
    expect(bodies.filter((x) => x.status === "minted").length).toBe(1);
    expect(bodies.filter((x) => x.status === "already_issued").length).toBe(7);
    expect((await getWooftagStore()!.getDay()).minted).toBe(1);
  });

  test("queued sniffers keep their place and the head mints first next day", async () => {
    const fill = await Promise.all(Array.from({ length: WOOFTAG_DAILY_CAP }, () => stampedBrowser()));
    await Promise.all(fill.map((b) => mintPOST(mintReq(b))));

    const waiting = await Promise.all(Array.from({ length: 3 }, () => stampedBrowser()));
    const q = (await Promise.all(
      (await Promise.all(waiting.map((b) => mintPOST(mintReq(b))))).map((r) => r.json()),
    )) as MintJson[];
    expect(q.map((x) => x.position).sort()).toEqual([1, 2, 3]);
    const byPos = new Map(q.map((x, i) => [x.position!, { browser: waiting[i]!, token: x.queueToken! }]));

    setSystemTime(new Date(DAY2));
    const newcomer = await stampedBrowser();
    const [n, second, head] = (await Promise.all(
      (
        await Promise.all([
          mintPOST(mintReq(newcomer)),
          mintPOST(mintReq(byPos.get(2)!.browser, { queueToken: byPos.get(2)!.token })),
          mintPOST(mintReq(byPos.get(1)!.browser, { queueToken: byPos.get(1)!.token })),
        ])
      ).map((r) => r.json()),
    )) as MintJson[];
    expect(head!.status).toBe("minted");
    expect(second!.status).toBe("queued");
    expect(n!.status).toBe("queued");
    // Newcomer joins behind #2 and #3 (4th if it landed before the head left).
    expect([3, 4]).toContain(n!.position!);
    expect((await getWooftagStore()!.getQueue()).length).toBe(3);
    expect((await getWooftagStore()!.getDay()).minted).toBe(1);
  });

  test("junk queue tokens are ignored (server issues a fresh one)", async () => {
    const fill = await Promise.all(Array.from({ length: WOOFTAG_DAILY_CAP }, () => stampedBrowser()));
    await Promise.all(fill.map((b) => mintPOST(mintReq(b))));
    const b = await stampedBrowser();
    const res = await mintPOST(mintReq(b, { queueToken: "x".repeat(500) }));
    const body = (await res.json()) as MintJson;
    expect(body.status).toBe("queued");
    expect(body.queueToken).toMatch(/^[0-9A-HJKMNP-TV-Z]{8,64}$/);
  });
});
