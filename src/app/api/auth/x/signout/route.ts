import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-session";
import { WOOFTAG_X_MESSAGES, isWooftagXClaimEnabled } from "@/lib/wooftag-x";
import { json } from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const forbidden = rejectForeignOrigin(req);
  if (forbidden) return forbidden;

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
