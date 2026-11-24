import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./cron/backup/route";

const req = (headers: Record<string, string> = {}) =>
  new NextRequest("https://www.quantumwoof.io/api/cron/backup", { headers });

describe("/api/cron/backup auth", () => {
  test("no secret configured → 401 even with a header", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req({ authorization: "Bearer anything-anything" }))).status).toBe(401);
  });
  test("missing or wrong bearer → 401, nothing read", async () => {
    process.env.CRON_SECRET = "c".repeat(40);
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req({ authorization: `Bearer ${"d".repeat(40)}` }))).status).toBe(401);
    const res = await GET(req({ authorization: "c".repeat(40) }));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    delete process.env.CRON_SECRET;
  });
});
