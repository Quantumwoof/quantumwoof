import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  WOOFTAG_X_ELIGIBILITY,
  evaluateXEligibility,
  isWooftagXClaimEnabled,
} from "./wooftag-x";

describe("X eligibility", () => {
  test("rejects accounts created on/after cutoff", () => {
    const r = evaluateXEligibility({
      id: "1",
      username: "pup",
      created_at: WOOFTAG_X_ELIGIBILITY.createdBeforeIso,
      public_metrics: { tweet_count: 100, followers_count: 100 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_new");
  });

  test("rejects quiet accounts", () => {
    const r = evaluateXEligibility({
      id: "1",
      username: "pup",
      created_at: "2020-01-01T00:00:00.000Z",
      public_metrics: { tweet_count: 1, followers_count: 1 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("inactive");
  });

  test("accepts old enough + active via tweets", () => {
    const r = evaluateXEligibility({
      id: "1",
      username: "pup",
      created_at: "2020-01-01T00:00:00.000Z",
      public_metrics: { tweet_count: 5, followers_count: 0 },
    });
    expect(r.ok).toBe(true);
  });

  test("accepts old enough + active via followers", () => {
    const r = evaluateXEligibility({
      id: "1",
      username: "pup",
      created_at: "2020-01-01T00:00:00.000Z",
      public_metrics: { tweet_count: 0, followers_count: 5 },
    });
    expect(r.ok).toBe(true);
  });
});

describe("feature flag", () => {
  const prev: Record<string, string | undefined> = {};
  const keys = [
    "WOOFTAG_X_CLAIM",
    "X_CLIENT_ID",
    "X_CLIENT_SECRET",
    "QW_SESSION_SECRET",
  ] as const;

  beforeEach(() => {
    for (const k of keys) prev[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  test("off when flag missing", () => {
    delete process.env.WOOFTAG_X_CLAIM;
    process.env.X_CLIENT_ID = "id";
    process.env.X_CLIENT_SECRET = "secret";
    process.env.QW_SESSION_SECRET = "x".repeat(32);
    expect(isWooftagXClaimEnabled()).toBe(false);
  });

  test("off when secret missing", () => {
    process.env.WOOFTAG_X_CLAIM = "on";
    process.env.X_CLIENT_ID = "id";
    process.env.X_CLIENT_SECRET = "secret";
    delete process.env.QW_SESSION_SECRET;
    expect(isWooftagXClaimEnabled()).toBe(false);
  });

  test("on with flag + all secrets", () => {
    process.env.WOOFTAG_X_CLAIM = "on";
    process.env.X_CLIENT_ID = "id";
    process.env.X_CLIENT_SECRET = "secret";
    process.env.QW_SESSION_SECRET = "x".repeat(32);
    expect(isWooftagXClaimEnabled()).toBe(true);
  });
});
