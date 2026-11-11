import type { NextRequest } from "next/server";
import { clientIp, json, methodNotAllowed } from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";
import { newOpaqueId } from "@/lib/wooftag";
import { getStarFormStore } from "@/lib/starform/store";
import { scoreOf } from "@/lib/starform/engine";
import { checkRun, parseRun } from "@/lib/starform/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_000;

export function GET() {
  return methodNotAllowed("POST");
}

/** Post a finished run to the all-time top 3. Only top-3 scores are stored. */
export async function POST(req: NextRequest) {
  const forbidden = rejectForeignOrigin(req);
  if (forbidden) return forbidden;

  const store = getStarFormStore();
  if (!store) {
    return json(
      { ok: false, error: "service_unavailable", message: "The Hosky board is napping — try again later." },
      { status: 503 },
    );
  }

  if (!(await store.rateLimit(clientIp(req)))) {
    return json(
      { ok: false, error: "rate_limited", message: "Easy, pup — try again in a few minutes." },
      { status: 429 },
    );
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    raw = "";
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "too_large", message: "That run is too big." }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }

  const parsed = parseRun(body);
  if (!parsed.ok) {
    return json({ ok: false, error: parsed.error, message: "That run could not be read." }, { status: 400 });
  }
  const bad = checkRun(parsed.run);
  if (bad) {
    return json({ ok: false, error: "invalid_run", message: "That run did not add up." }, { status: 422 });
  }

  const score = scoreOf(parsed.run.detonations);
  const placed = await store.submit({
    id: newOpaqueId(8),
    name: parsed.run.name,
    score,
    at: new Date().toISOString(),
  });
  const top = await store.top3();
  return json({
    ok: true,
    placed,
    top: top.map((e) => ({ name: e.name, score: Math.round(e.score), at: e.at })),
  });
}
