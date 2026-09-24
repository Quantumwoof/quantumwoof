/**
 * Short-lived signed httpOnly session for X claim (HMAC).
 * Cookie holds only X user id + username — never access tokens.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "qw_x_session";
export const OAUTH_COOKIE = "qw_x_oauth";

/** Session lifetime: 2 hours. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 2;
/** OAuth state + PKCE verifier cookie: 10 minutes. */
export const OAUTH_MAX_AGE_SEC = 60 * 10;

export type XSession = {
  uid: string;
  un: string;
  /** X account created_at ISO (optional; stored at claim time). */
  ca?: string;
  exp: number;
};

export type OAuthPending = {
  state: string;
  verifier: string;
  exp: number;
};

function sessionSecret(): string | null {
  const s = process.env.QW_SESSION_SECRET?.trim() ?? "";
  return s.length >= 16 ? s : null;
}

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function parseB64urlJson<T>(raw: string): T | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function sign(payload: string): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function seal(obj: unknown): string | null {
  const payload = b64urlJson(obj);
  const sig = sign(payload);
  if (!sig) return null;
  return `${payload}.${sig}`;
}

function unseal<T extends { exp: number }>(token: string): T | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = sign(payload);
  if (!expect || !safeEqual(sig, expect)) return null;
  const data = parseB64urlJson<T>(payload);
  if (!data || typeof data.exp !== "number") return null;
  if (Date.now() > data.exp) return null;
  return data;
}

export function createSessionToken(
  uid: string,
  username: string,
  createdAt = "",
  now = Date.now(),
): string | null {
  return seal({
    uid,
    un: username,
    ca: createdAt || undefined,
    exp: now + SESSION_MAX_AGE_SEC * 1000,
  } satisfies XSession);
}

export function readSession(req: NextRequest): XSession | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value?.trim() ?? "";
  if (!raw) return null;
  const data = unseal<XSession>(raw);
  if (!data || typeof data.uid !== "string" || typeof data.un !== "string") return null;
  if (!data.uid || !data.un) return null;
  return data;
}

export function createOAuthPendingToken(
  state: string,
  verifier: string,
  now = Date.now(),
): string | null {
  return seal({
    state,
    verifier,
    exp: now + OAUTH_MAX_AGE_SEC * 1000,
  } satisfies OAuthPending);
}

export function readOAuthPending(req: NextRequest): OAuthPending | null {
  const raw = req.cookies.get(OAUTH_COOKIE)?.value?.trim() ?? "";
  if (!raw) return null;
  const data = unseal<OAuthPending>(raw);
  if (
    !data ||
    typeof data.state !== "string" ||
    typeof data.verifier !== "string" ||
    !data.state ||
    !data.verifier
  ) {
    return null;
  }
  return data;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}
