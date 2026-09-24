/**
 * X (Twitter) OAuth 2.0 Authorization Code + PKCE helpers (confidential client).
 * Access tokens are discarded immediately after /users/me.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { WOOFTAG_X_SCOPES, type XUserMe } from "@/lib/wooftag-x";

const DEFAULT_API_BASE = "https://api.x.com";
const AUTH_BASE = "https://x.com/i/oauth2/authorize";

const HOST_ALLOWLIST = new Set([
  "www.quantumwoof.io",
  "quantumwoof.io",
  "localhost:3000",
  "127.0.0.1:3000",
]);

/** X_API_BASE override is for local tests only — ignored in production. */
export function xApiBase(): string {
  if (process.env.NODE_ENV === "production") return DEFAULT_API_BASE;
  const override = process.env.X_API_BASE?.trim() ?? "";
  if (override) return override.replace(/\/$/, "");
  return DEFAULT_API_BASE;
}

export function xClientId(): string | null {
  const id = process.env.X_CLIENT_ID?.trim() ?? "";
  return id || null;
}

export function xClientSecret(): string | null {
  const s = process.env.X_CLIENT_SECRET?.trim() ?? "";
  return s || null;
}

/**
 * Derive callback URL from SITE_URL or allowlisted request host.
 * Never open-redirects to arbitrary hosts.
 */
export function resolveCallbackUrl(req: NextRequest): string | null {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (fromEnv) {
    try {
      const u = new URL(fromEnv);
      const host = u.host.toLowerCase();
      if (HOST_ALLOWLIST.has(host)) {
        return `${u.protocol}//${u.host}/api/auth/x/callback`;
      }
    } catch {
      /* fall through */
    }
  }

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const hostRaw =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim() ||
    "";
  const host = hostRaw.toLowerCase();
  if (!HOST_ALLOWLIST.has(host)) return null;
  return `${proto}://${host}/api/auth/x/callback`;
}

export function newPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function newOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function buildAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const u = new URL(AUTH_BASE);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("scope", WOOFTAG_X_SCOPES);
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", opts.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string } | { error: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
    client_id: opts.clientId,
  });
  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64");
  const res = await fetch(`${xApiBase()}/2/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!res.ok) {
    return { error: `token_http_${res.status}` };
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token || typeof json.access_token !== "string") {
    return { error: "token_missing" };
  }
  return { access_token: json.access_token };
}

export async function fetchXUserMe(accessToken: string): Promise<XUserMe | null> {
  const url = new URL(`${xApiBase()}/2/users/me`);
  url.searchParams.set("user.fields", "created_at,public_metrics");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: XUserMe };
  const data = json.data;
  if (!data || typeof data.id !== "string" || typeof data.username !== "string") {
    return null;
  }
  return data;
}
