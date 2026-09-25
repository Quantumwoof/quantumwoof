import { describe, expect, test, beforeEach } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import {
  hmacWooftag,
  legacyHashWooftag,
  normalizeWooftag,
  safeEqualHex,
  wooftagFingerprint,
  wooftagMatchesHash,
} from "./wooftag-hash";
import {
  getWooftagStore,
  resetMemoryStoreForTests,
  seedLegacyHashForTests,
} from "./wooftag-store";
import { generateWooftag } from "./wooftag";

const PEPPER = "unit-test-pepper";

describe("fingerprint schemes", () => {
  test("v2 is HMAC-SHA256(pepper, normalized tag)", () => {
    const tag = "WOOF-ABCD-EFGH-JKMN-PQRS";
    const expected = createHmac("sha256", PEPPER).update(tag).digest("hex");
    expect(hmacWooftag(tag, PEPPER)).toBe(expected);
    expect(hmacWooftag("  woof-abcd-efgh-jkmn-pqrs ", PEPPER)).toBe(expected);
  });

  test("legacy is SHA-256(tag + pepper) — matches pre-HMAC mint code", () => {
    const tag = "WOOF-ABCD-EFGH-JKMN-PQRS";
    const expected = createHash("sha256").update(tag + PEPPER, "utf8").digest("hex");
    expect(legacyHashWooftag(tag, PEPPER)).toBe(expected);
  });

  test("normalize canonicalizes case, spaces, unicode dashes", () => {
    expect(normalizeWooftag(" woof\u2013abcd-efgh-jkmn-pqrs ")).toBe("WOOF-ABCD-EFGH-JKMN-PQRS");
  });

  test("safeEqualHex is exact and rejects junk / length mismatch", () => {
    const h = hmacWooftag("WOOF-0000-0000-0000-0000", PEPPER);
    expect(safeEqualHex(h, h)).toBe(true);
    expect(safeEqualHex(h, h.toUpperCase())).toBe(true);
    expect(safeEqualHex(h, h.slice(0, -2) + (h.endsWith("00") ? "11" : "00"))).toBe(false);
    expect(safeEqualHex(h, h.slice(0, 10))).toBe(false);
    expect(safeEqualHex(h, "not-hex")).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });

  test("wooftagMatchesHash accepts either scheme, rejects other tags", () => {
    const tag = generateWooftag();
    const fp = wooftagFingerprint(tag, PEPPER);
    expect(wooftagMatchesHash(tag, PEPPER, fp.hmac)).toBe(true);
    expect(wooftagMatchesHash(tag, PEPPER, fp.legacy)).toBe(true);
    expect(wooftagMatchesHash(generateWooftag(), PEPPER, fp.hmac)).toBe(false);
    expect(wooftagMatchesHash(tag, "other-pepper", fp.hmac)).toBe(false);
  });
});

describe("store: HMAC first, legacy fallback", () => {
  beforeEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
    resetMemoryStoreForTests();
  });

  test("new tag is stored and found via HMAC key", async () => {
    const s = getWooftagStore()!;
    const tag = generateWooftag();
    const fp = wooftagFingerprint(tag, PEPPER);
    expect(await s.findTagFingerprint(fp)).toBeNull();
    expect(await s.putTagFingerprint(fp, "2026-09-25T00:00:00.000Z")).toBe(true);
    const found = await s.findTagFingerprint(fp);
    expect(found?.scheme).toBe("hmac");
    // Dedupe: same tag cannot be stored twice.
    expect(await s.putTagFingerprint(fp, "later")).toBe(false);
  });

  test("legacy-hashed tag still verifies and blocks re-issue", async () => {
    const s = getWooftagStore()!;
    const tag = generateWooftag();
    const legacy = createHash("sha256").update(tag + PEPPER, "utf8").digest("hex");
    seedLegacyHashForTests(legacy, "2026-09-01T00:00:00.000Z");

    const fp = wooftagFingerprint(tag, PEPPER);
    const found = await s.findTagFingerprint(fp);
    expect(found).toEqual({ scheme: "legacy", mintedAt: "2026-09-01T00:00:00.000Z" });
    // A colliding new issue of the same tag is refused (no HMAC key written).
    expect(await s.putTagFingerprint(fp, "now")).toBe(false);
    expect((await s.findTagFingerprint(fp))?.scheme).toBe("legacy");
  });
});
