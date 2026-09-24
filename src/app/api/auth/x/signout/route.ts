import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-session";
import { WOOFTAG_X_MESSAGES, isWooftagXClaimEnabled } from "@/lib/wooftag-x";
import { json } from "@/lib/wooftag-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  if (!isWooftagXClaimEnabled()) {
    return json(
      { ok: false, error: "disabled", message: WOOFTAG_X_MESSAGES.disabled },
      { status: 404 },
    );
  }
  return json(
    { ok: true },
    { cookies: [{ name: SESSION_COOKIE, value: "", options: { maxAge: 0 } }] },
  );
}

export async function GET(req: NextRequest) {
  return POST(req);
}
