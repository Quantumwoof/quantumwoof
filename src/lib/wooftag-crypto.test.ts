import { describe, expect, test, mock } from "bun:test";
mock.module("server-only", () => ({}));
const { encryptWooftag, decryptWooftag } = await import("./wooftag-crypto");

describe("wooftag crypto", () => {
  test("round-trip", () => {
    process.env.QW_SESSION_SECRET = "test-session-secret-32chars!!";
    const tag = "ABCD-EFGH-IJKL";
    const enc = encryptWooftag(tag);
    expect(enc).toBeTruthy();
    expect(decryptWooftag(enc!)).toBe(tag);
  });
});
