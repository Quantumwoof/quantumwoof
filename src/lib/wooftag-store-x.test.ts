import { describe, expect, test, beforeEach } from "bun:test";
import {
  getWooftagStore,
  resetMemoryStoreForTests,
} from "./wooftag-store";
import { utcDateKey } from "./wooftag";

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

describe("daily X claim store", () => {
  beforeEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    resetMemoryStoreForTests();
  });

  test("day stamps gate claims; undated stamps ignored for day", async () => {
    const store = getWooftagStore();
    expect(store).toBeTruthy();
    const s = store!;
    const browser = "BROWSERTEST01";
    const today = utcDateKey();

    for (const slug of READY) {
      await s.addDaySchoolStamp(browser, today, slug);
    }
    expect((await s.getDaySchoolStamps(browser, today)).length).toBe(READY.length);

    const put1 = await s.putXClaim({
      xUserId: "x1",
      username: "pup",
      createdAt: "2020-01-01T00:00:00.000Z",
      utcDate: today,
      issuedAt: new Date().toISOString(),
      tagHash: "hash1",
      tagEnc: "enc1",
    });
    expect(put1).toBe(true);

    const put2 = await s.putXClaim({
      xUserId: "x1",
      username: "pup",
      createdAt: "2020-01-01T00:00:00.000Z",
      utcDate: today,
      issuedAt: new Date().toISOString(),
      tagHash: "hash2",
      tagEnc: "enc2",
    });
    expect(put2).toBe(false);

    const again = await s.getXClaim("x1", today);
    expect(again?.tagHash).toBe("hash1");

    await s.pushXClaimHistory("x1", {
      utcDate: today,
      issuedAt: again!.issuedAt,
      tagHash: again!.tagHash,
      tagEnc: again!.tagEnc,
    });
    const hist = await s.listXClaimHistory("x1");
    expect(hist[0]?.tagHash).toBe("hash1");

    const [y, m, d] = today.split("-").map(Number);
    const tomorrow = new Date(Date.UTC(y!, m! - 1, d! + 1))
      .toISOString()
      .slice(0, 10);
    expect((await s.getDaySchoolStamps(browser, tomorrow)).length).toBe(0);

    await s.addSchoolStamp(browser, READY[0]!);
    expect(await s.getSchoolStamps(browser)).toContain(READY[0]!);
    expect((await s.getDaySchoolStamps(browser, tomorrow)).length).toBe(0);
  });
});
