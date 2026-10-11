import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  OAUTH_COOKIE,
  OAUTH_MAX_AGE_SEC,
  createOAuthPendingToken,
  sessionCookieOptions,
} from "@/lib/auth-session";
import {
  buildAuthorizeUrl,
  newOAuthState,
  newPkcePair,
  resolveCallbackUrl,
  xClientId,
  xClientSecret,
} from "@/lib/auth-x";
import { WOOFTAG_X_MESSAGES, isWooftagXClaimEnabled } from "@/lib/wooftag-x";
import { clientIp, json } from "@/lib/wooftag-http";
import { getWooftagStore } from "@/lib/wooftag-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export async function GET(req: NextRequest) {
  // Browser navigation (a link / window.location), so a disabled flow lands the
  // visitor back on the certificate with a friendly notice — same shape as the
  // callback route. Non-browser clients (Accept: application/json, no text/html)
  // keep the JSON 404.
  const disabled = () => {
    if (wantsJson(req)) {
      return json(
        { ok: false, error: "disabled", message: WOOFTAG_X_MESSAGES.disabled },
        { status: 404 },
      );
    }
    // Relative Location on purpose: never built from request headers.
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/school?x_auth=disabled#certificate",
        "Cache-Control": "no-store",
      },
    });
  };

  if (!isWooftagXClaimEnabled()) return disabled();

  const clientId = xClientId();
  const clientSecret = xClientSecret();
  if (!clientId || !clientSecret) return disabled();

  const store = getWooftagStore();
  if (!store) {
    console.error("[auth/x/start] store unavailable");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Sign-in is napping — try again later.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const rl = await store.rateLimit(`oauth-start:${ip}`, 20, 10 * 60);
  if (!rl.ok) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        message: "Easy, pup — try again in a minute.",
      },
      { status: 429 },
    );
  }

  const redirectUri = resolveCallbackUrl(req);
  if (!redirectUri) {
    return json(
      {
        ok: false,
        error: "bad_host",
        message: "This host cannot start X sign-in.",
      },
      { status: 400 },
    );
  }

  const state = newOAuthState();
  const { verifier, challenge } = newPkcePair();
  const pending = createOAuthPendingToken(state, verifier);
  if (!pending) {
    console.error("[auth/x/start] session secret missing");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Sign-in is not configured.",
      },
      { status: 503 },
    );
  }

  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    challenge,
  });

  const res = NextResponse.redirect(url, 302);
  res.cookies.set(OAUTH_COOKIE, pending, sessionCookieOptions(OAUTH_MAX_AGE_SEC));
  return res;
}
