import { NextRequest, NextResponse } from "next/server";
import { WOOFTAG_MIN_GATE_MS } from "@/lib/wooftag";

export const GATE_COOKIE = "qw_woof_gate";
export const DONE_COOKIE = "qw_wooftag_done";
export const QUEUE_COOKIE = "qw_wooftag_q";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function json(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit; cookies?: CookieSet[] },
) {
  const res = NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
  for (const c of init?.cookies ?? []) {
    res.cookies.set(c.name, c.value, { ...cookieBase, ...c.options });
  }
  return res;
}

type CookieSet = {
  name: string;
  value: string;
  options?: { maxAge?: number };
};

export function readGateAgeMs(req: NextRequest, now = Date.now()): number | null {
  const raw = req.cookies.get(GATE_COOKIE)?.value;
  if (!raw) return null;
  const started = Number(raw);
  if (!Number.isFinite(started) || started <= 0) return null;
  return now - started;
}

export function gateCookieValue(now = Date.now()): CookieSet {
  return { name: GATE_COOKIE, value: String(now), options: { maxAge: 60 * 60 * 24 * 14 } };
}

export function doneCookie(): CookieSet {
  return { name: DONE_COOKIE, value: "1", options: { maxAge: 60 * 60 * 24 * 400 } };
}

export function queueCookie(token: string): CookieSet {
  return { name: QUEUE_COOKIE, value: token, options: { maxAge: 60 * 60 * 24 * 8 } };
}

export function alreadyIssued(req: NextRequest): boolean {
  return req.cookies.get(DONE_COOKIE)?.value === "1";
}

export function readQueueToken(req: NextRequest): string | undefined {
  const v = req.cookies.get(QUEUE_COOKIE)?.value?.trim();
  return v || undefined;
}

export function gateTooFresh(req: NextRequest): boolean {
  const age = readGateAgeMs(req);
  if (age === null) return true;
  return age < WOOFTAG_MIN_GATE_MS;
}

export function ensureGateCookies(req: NextRequest): CookieSet[] {
  const extra: CookieSet[] = [];
  if (!req.cookies.get(GATE_COOKIE)?.value) extra.push(gateCookieValue());
  return extra;
}
