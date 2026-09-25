import { describe, expect, test, beforeEach, mock } from "bun:test";
mock.module("server-only", () => ({}));
import { NextRequest } from "next/server";
import { resetMemoryStoreForTests } from "@/lib/wooftag-store";

const { POST: checkPOST } = await import("./woof-school/check/route");
const { POST: mintPOST } = await import("./wooftag/mint/route");
const { POST: claimPOST } = await import("./wooftag/claim/route");
const { POST: signoutPOST } = await import("./auth/x/signout/route");

function post(path: string, headers: Record<string, string>, body: unknown = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  process.env.WOOFTAG_PEPPER = "route-test-pepper";
  resetMemoryStoreForTests();
});

describe("state-changing POSTs reject foreign origins", () => {
  const evil = { origin: "https://evil.example" };
  for (const [name, handler, path] of [
    ["woof-school/check", checkPOST, "/api/woof-school/check"],
    ["wooftag/mint", mintPOST, "/api/wooftag/mint"],
    ["wooftag/claim", claimPOST, "/api/wooftag/claim"],
    ["auth/x/signout", signoutPOST, "/api/auth/x/signout"],
  ] as const) {
    test(`${name}: evil Origin → 403 forbidden_origin`, async () => {
      const res = await handler(post(path, evil));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error?: string; message?: string };
      expect(body.error).toBe("forbidden_origin");
      expect(body.message ?? "").not.toMatch(/UPSTASH|PEPPER|QW_|X_CLIENT/);
    });
    test(`${name}: no Origin/Referer and cross-site → 403`, async () => {
      const res = await handler(post(path, { "sec-fetch-site": "cross-site" }));
      expect(res.status).toBe(403);
    });
  }
});

describe("same-site requests still work", () => {
  test("check with allowed Origin + wrong answers → passed:false", async () => {
    const res = await checkPOST(
      post("/api/woof-school/check", { origin: "https://www.quantumwoof.io" }, {
        topic: "looking-up",
        answers: {},
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; passed: boolean };
    expect(body.ok).toBe(true);
    expect(body.passed).toBe(false);
  });

  test("check with only Sec-Fetch-Site same-origin is allowed", async () => {
    const res = await checkPOST(
      post("/api/woof-school/check", { "sec-fetch-site": "same-origin" }, { topic: "looking-up", answers: {} }),
    );
    expect(res.status).toBe(200);
  });

  test("mint with allowed Origin passes the guard (then school_incomplete)", async () => {
    const res = await mintPOST(post("/api/wooftag/mint", { origin: "http://localhost:3000" }));
    expect(res.status).not.toBe(403);
  });
});
