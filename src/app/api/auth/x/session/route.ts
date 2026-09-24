import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth-session";
import { decryptWooftag } from "@/lib/wooftag-crypto";
import { utcDateKey } from "@/lib/wooftag";
import { isWooftagXClaimEnabled } from "@/lib/wooftag-x";
import { json } from "@/lib/wooftag-http";
import { getWooftagStore } from "@/lib/wooftag-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const enabled = isWooftagXClaimEnabled();
  if (!enabled) {
    return json({ ok: true, enabled: false, signedIn: false });
  }

  const session = readSession(req);
  if (!session) {
    return json({ ok: true, enabled: true, signedIn: false });
  }

  const store = getWooftagStore();
  const today = utcDateKey();
  let todayTag: string | null = null;
  let todayIssuedAt: string | null = null;
  const history: { utcDate: string; issuedAt: string; tag: string }[] = [];

  if (store) {
    const todayClaim = await store.getXClaim(session.uid, today);
    if (todayClaim) {
      todayIssuedAt = todayClaim.issuedAt;
      todayTag = decryptWooftag(todayClaim.tagEnc);
    }
    const hist = await store.listXClaimHistory(session.uid);
    for (const h of hist) {
      const tag = decryptWooftag(h.tagEnc);
      if (tag) history.push({ utcDate: h.utcDate, issuedAt: h.issuedAt, tag });
    }
  }

  return json({
    ok: true,
    enabled: true,
    signedIn: true,
    username: session.un,
    xUserId: session.uid,
    utcDate: today,
    claimedToday: Boolean(todayTag),
    tag: todayTag || undefined,
    issuedAt: todayIssuedAt || undefined,
    history,
  });
}
