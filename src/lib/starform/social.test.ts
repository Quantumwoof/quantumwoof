import { describe, expect, mock, test } from "bun:test";
mock.module("server-only", () => ({}));
import { cleanHandle, parseSocial, profileUrl, readSocial, validHandle, SOCIAL_IDS } from "./social";

describe("social handles", () => {
  test("valid handles per platform", () => {
    expect(validHandle("x", "qtmwoof")).toBe(true);
    expect(validHandle("x", "Hosky_Pup_2026")).toBe(true);
    expect(validHandle("x", "a".repeat(16))).toBe(false);
    expect(validHandle("x", "has.dot")).toBe(false);
    expect(validHandle("ig", "stella.sky")).toBe(true);
    expect(validHandle("ig", ".stella")).toBe(false);
    expect(validHandle("ig", "stella..sky")).toBe(false);
    expect(validHandle("ig", "stella.")).toBe(false);
    expect(validHandle("tt", "hosky.pup")).toBe(true);
    expect(validHandle("tt", "a")).toBe(false);
    expect(validHandle("yt", "Hosky-Space")).toBe(true);
    expect(validHandle("yt", "ab")).toBe(false);
    expect(validHandle("tg", "orionk")).toBe(true);
    expect(validHandle("tg", "1orion")).toBe(false);
    expect(validHandle("tg", "abcd")).toBe(false);
    expect(validHandle("tg", "orion_")).toBe(false);
  });

  test("cleanHandle strips spaces and one leading @", () => {
    expect(cleanHandle("  @qtmwoof ")).toBe("qtmwoof");
    expect(cleanHandle("@@x")).toBe("@x");
  });

  test("parseSocial: absent → null, empty → null, junk → invalid", () => {
    expect(parseSocial(undefined)).toBeNull();
    expect(parseSocial(null)).toBeNull();
    expect(parseSocial({ p: "x", h: "" })).toBeNull();
    expect(parseSocial({ p: "x", h: "@qtmwoof" })).toEqual({ p: "x", h: "qtmwoof" });
    for (const bad of ["x", 1, [], { p: "fb", h: "a" }, { p: "x" }, { p: "x", h: "<img src=x>" }, { p: "x", h: "a b" }, { p: "x", h: "a".repeat(65) }]) {
      expect(parseSocial(bad)).toBe("invalid");
    }
  });

  test("profile links are fixed https bases + whitelisted handle only", () => {
    expect(profileUrl({ p: "x", h: "qtmwoof" })).toBe("https://x.com/qtmwoof");
    expect(profileUrl({ p: "ig", h: "stella.sky" })).toBe("https://www.instagram.com/stella.sky/");
    expect(profileUrl({ p: "tt", h: "hosky.pup" })).toBe("https://www.tiktok.com/@hosky.pup");
    expect(profileUrl({ p: "yt", h: "HoskySpace" })).toBe("https://www.youtube.com/@HoskySpace");
    expect(profileUrl({ p: "tg", h: "orionk" })).toBe("https://t.me/orionk");
    expect(profileUrl({ p: "x", h: "../../evil" })).toBeNull();
    expect(profileUrl({ p: "evil" as never, h: "a" })).toBeNull();
    for (const p of SOCIAL_IDS) expect(profileUrl({ p, h: "hoskypup" })).toMatch(/^https:\/\//);
  });

  test("readSocial keeps old entries working (missing/odd social → no handle)", () => {
    expect(readSocial(undefined)).toBeUndefined();
    expect(readSocial({ p: "x", h: "<b>" })).toBeUndefined();
    expect(readSocial({ p: "tg", h: "orionk" })).toEqual({ p: "tg", h: "orionk" });
  });
});
