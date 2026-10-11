import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET as tonightGET } from "./tonight-stars/route";
import { GET as startGET } from "./auth/x/start/route";
import { GET as mintGET } from "./wooftag/mint/route";
import { GET as checkGET } from "./woof-school/check/route";
import { POST as mintPOST } from "./wooftag/mint/route";

const get = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`https://www.quantumwoof.io${path}`, { headers });

describe("/api/tonight-stars country handling", () => {
  test("missing country → 400 country_required (no NG fallback)", async () => {
    const res = tonightGET(get("/api/tonight-stars"));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe("country_required");
    expect(j.country).toBeUndefined();
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("invalid country → 400 invalid_country", async () => {
    const res = tonightGET(get("/api/tonight-stars?country=ZZ"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_country");
  });

  test("valid country (any case) still works", async () => {
    const res = tonightGET(get("/api/tonight-stars?country=au"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.country.code).toBe("AU");
    expect(j.hemisphere).toBe("south");
    expect(Array.isArray(j.stars)).toBe(true);
  });
});

describe("/api/auth/x/start with the X flag off", () => {
  test("browser navigation redirects to /school?x_auth=disabled", async () => {
    expect(process.env.WOOFTAG_X_CLAIM).not.toBe("1");
    const res = await startGET(get("/api/auth/x/start", { accept: "text/html,*/*" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/school?x_auth=disabled#certificate");
  });

  test("JSON clients still get the 404 JSON", async () => {
    const res = await startGET(get("/api/auth/x/start", { accept: "application/json" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("disabled");
  });
});

describe("GET on POST-only routes", () => {
  for (const [name, handler] of [
    ["/api/wooftag/mint", mintGET],
    ["/api/woof-school/check", checkGET],
  ] as const) {
    test(`${name} → 405 JSON with Allow: POST`, async () => {
      const res = await handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
      expect(res.headers.get("content-type")).toContain("application/json");
      expect((await res.json()).error).toBe("method_not_allowed");
    });
  }
  test("POST on mint still rejects foreign origins", async () => {
    const res = await mintPOST(
      new NextRequest("https://www.quantumwoof.io/api/wooftag/mint", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
