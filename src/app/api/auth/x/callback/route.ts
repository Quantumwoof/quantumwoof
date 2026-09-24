import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  clearCookieOptions,
  createSessionToken,
  readOAuthPending,
  sessionCookieOptions,
} from "@/lib/auth-session";
import {
  exchangeCodeForToken,
  fetchXUserMe,
  resolveCallbackUrl,
  xClientId,
  xClientSecret,
} from "@/lib/auth-x";
import {
  evaluateXEligibility,
  isWooftagXClaimEnabled,
} from "@/lib/wooftag-x";
import { clientIp } from "@/lib/wooftag-http";
import { getWooftagStore } from "@/lib/wooftag-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function schoolRedirect(req: NextRequest, query: Record<string, string>) {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim() ||
    "localhost:3000";
  const u = new URL("/school", `${proto}://${host}`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  u.hash = "certificate";
  return u;
}

export async function GET(req: NextRequest) {
  const fail = (code: string, extra: Record<string, string> = {}) => {
    const res = NextResponse.redirect(
      schoolRedirect(req, { x_auth: code, ...extra }),
      302,
    );
    res.cookies.set(OAUTH_COOKIE, "", clearCookieOptions());
    return res;
  };

  if (!isWooftagXClaimEnabled()) return fail("disabled");

  const store = getWooftagStore();
  if (!store) return fail("service");

  const ip = clientIp(req);
  const rl = await store.rateLimit(`oauth-cb:${ip}`, 30, 10 * 60);
  if (!rl.ok) return fail("rate_limited");

  const clientId = xClientId();
  const clientSecret = xClientSecret();
  if (!clientId || !clientSecret) return fail("disabled");

  if (req.nextUrl.searchParams.get("error")) return fail("denied");

  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  if (!code || !state) return fail("missing");

  const pending = readOAuthPending(req);
  if (!pending || pending.state !== state) return fail("state");

  const redirectUri = resolveCallbackUrl(req);
  if (!redirectUri) return fail("bad_host");

  const tokenResult = await exchangeCodeForToken({
    code,
    redirectUri,
    codeVerifier: pending.verifier,
    clientId,
    clientSecret,
  });
  if ("error" in tokenResult) return fail("token");

  const user = await fetchXUserMe(tokenResult.access_token);
  // Access token discarded — never stored.
  if (!user) return fail("profile");

  const eligibility = evaluateXEligibility(user);
  if (!eligibility.ok) {
    return fail("ineligible", { reason: eligibility.reason });
  }

  const session = createSessionToken(user.id, user.username, user.created_at ?? "");
  if (!session) return fail("session");

  const res = NextResponse.redirect(
    schoolRedirect(req, { x_auth: "ok", u: user.username }),
    302,
  );
  res.cookies.set(OAUTH_COOKIE, "", clearCookieOptions());
  res.cookies.set(
    SESSION_COOKIE,
    session,
    sessionCookieOptions(SESSION_MAX_AGE_SEC),
  );
  return res;
}
