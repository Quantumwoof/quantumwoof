import type { NextRequest } from "next/server";
import { clientIp, json, methodNotAllowed } from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";
import { newOpaqueId } from "@/lib/wooftag";
import { getStarFormStore, publicRow } from "@/lib/starform/store";
import { parseSocial } from "@/lib/starform/social";
import { elapsedLooksRight, parseRun, verifyRun } from "@/lib/starform/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_000;

export function GET() {
  return methodNotAllowed("POST");
}

/** Post a finished run to the all-time top 5. Only top-5 distances are stored (with an optional social handle). */
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
  // Optional social handle: whitelisted per platform; anything odd is refused, not stored.
  const social = parseSocial((body as { social?: unknown }).social);
  if (social === "invalid") {
    return json({ ok: false, error: "bad_social", message: "That handle doesn't look right for that app." }, { status: 400 });
  }
  const verdict = verifyRun(parsed.run);
  if (!verdict.ok) {
    return json({ ok: false, error: "invalid_run", message: "That run did not add up." }, { status: 422 });
  }

  // The run id is single use and proves how long ago the run began.
  const startedAt = await store.takeRun(parsed.run.runId);
  if (startedAt === null || !elapsedLooksRight(parsed.run.steps, startedAt, Date.now())) {
    return json(
      { ok: false, error: "invalid_run", message: "That run could not be confirmed. Start a fresh one." },
      { status: 422 },
    );
  }

  const placed = await store.submit({
    id: newOpaqueId(8),
    name: parsed.run.name,
    distance: verdict.distance,
    at: new Date().toISOString(),
    ...(social ? { social } : {}),
  });
  const top = await store.top3();
  return json({
    ok: true,
    placed,
    distance: verdict.distance,
    top: top.map(publicRow),
  });
}
