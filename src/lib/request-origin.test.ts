import { describe, expect, test } from "bun:test";
import { isAllowedRequestOrigin } from "./request-origin";

const PROD = { NODE_ENV: "production" };
const DEV = { NODE_ENV: "development" };
const h = (init: Record<string, string>) => new Headers(init);

describe("isAllowedRequestOrigin", () => {
  test("allows site origins", () => {
    expect(isAllowedRequestOrigin(h({ origin: "https://www.quantumwoof.io" }), PROD)).toBe(true);
    expect(isAllowedRequestOrigin(h({ origin: "https://quantumwoof.io" }), PROD)).toBe(true);
  });

  test("rejects foreign, lookalike, http, and null origins", () => {
    for (const origin of [
      "https://evil.example",
      "https://www.quantumwoof.io.evil.example",
      "https://evilquantumwoof.io",
      "http://www.quantumwoof.io",
      "null",
      "not a url",
    ]) {
      expect(isAllowedRequestOrigin(h({ origin }), PROD)).toBe(false);
    }
  });

  test("Origin wins over Referer", () => {
    expect(
      isAllowedRequestOrigin(
        h({ origin: "https://evil.example", referer: "https://www.quantumwoof.io/school" }),
        PROD,
      ),
    ).toBe(false);
  });

  test("falls back to Referer when Origin absent", () => {
    expect(isAllowedRequestOrigin(h({ referer: "https://www.quantumwoof.io/school/deep-sky" }), PROD)).toBe(true);
    expect(isAllowedRequestOrigin(h({ referer: "https://evil.example/x" }), PROD)).toBe(false);
  });

  test("no Origin/Referer: only Sec-Fetch-Site same-origin", () => {
    expect(isAllowedRequestOrigin(h({ "sec-fetch-site": "same-origin" }), PROD)).toBe(true);
    expect(isAllowedRequestOrigin(h({ "sec-fetch-site": "cross-site" }), PROD)).toBe(false);
    expect(isAllowedRequestOrigin(h({ "sec-fetch-site": "same-site" }), PROD)).toBe(false);
    expect(isAllowedRequestOrigin(h({}), PROD)).toBe(false);
  });

  test("localhost only outside production", () => {
    expect(isAllowedRequestOrigin(h({ origin: "http://localhost:3000" }), DEV)).toBe(true);
    expect(isAllowedRequestOrigin(h({ origin: "http://127.0.0.1:3100" }), DEV)).toBe(true);
    expect(isAllowedRequestOrigin(h({ origin: "http://localhost:3000" }), PROD)).toBe(false);
  });

  test("this project's Vercel deployment host via VERCEL_URL", () => {
    const env = { ...PROD, VERCEL_URL: "quantumwoof-abc123-quantumwoof.vercel.app" };
    expect(isAllowedRequestOrigin(h({ origin: "https://quantumwoof-abc123-quantumwoof.vercel.app" }), env)).toBe(true);
    expect(isAllowedRequestOrigin(h({ origin: "https://someone-else.vercel.app" }), env)).toBe(false);
  });
});
