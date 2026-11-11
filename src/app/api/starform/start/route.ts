import type { NextRequest } from "next/server";
import { clientIp, json, methodNotAllowed } from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";
import { newOpaqueId } from "@/lib/wooftag";
import { getStarFormStore } from "@/lib/starform/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return methodNotAllowed("POST");
}

/** Called when a run begins: hands back a one-time run id used to post the score. */
export async function POST(req: NextRequest) {
  const forbidden = rejectForeignOrigin(req);
  if (forbidden) return forbidden;

  const store = getStarFormStore();
  if (!store) return json({ ok: false, error: "service_unavailable" }, { status: 503 });
  if (!(await store.rateLimit(clientIp(req), "start"))) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const runId = newOpaqueId(10);
  try {
    await store.startRun(runId, Date.now());
  } catch {
    return json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }
  return json({ ok: true, runId });
}
