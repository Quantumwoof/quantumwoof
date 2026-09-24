import type { NextRequest } from "next/server";
import { schoolTopics } from "@/content/woofSchool";
import {
  WOOFTAG_CLAIM_LATER,
  WOOFTAG_DAILY_CAP,
  utcDateKey,
} from "@/lib/wooftag";
import { getWooftagStore, storeKind } from "@/lib/wooftag-store";
import { clientIp, ensureGateCookies, json, readBrowserId } from "@/lib/wooftag-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READY_TOPIC_SLUGS = schoolTopics
  .filter((t) => t.status === "ready")
  .map((t) => t.slug);

export async function GET(req: NextRequest) {
  const store = getWooftagStore();
  const cookies = ensureGateCookies(req);

  if (!store) {
    return json(
      {
        ok: false,
        error: "store_unavailable",
        message:
          "Wooftag bowl is napping — set UPSTASH_REDIS_REST_URL + TOKEN (or Vercel KV) and WOOFTAG_PEPPER.",
        utcDate: utcDateKey(),
        cap: WOOFTAG_DAILY_CAP,
        minted: 0,
        remaining: 0,
        queueLength: 0,
        store: storeKind(),
        claim: WOOFTAG_CLAIM_LATER,
      },
      { status: 503, cookies },
    );
  }

  const rl = await store.rateLimit(`status:${clientIp(req)}`, 120, 10 * 60);
  if (!rl.ok) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        message: "Easy, pup — try again in a minute.",
        remaining: 0,
        cap: WOOFTAG_DAILY_CAP,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { status: 429, cookies },
    );
  }

  const day = await store.getDay();
  const browserId = readBrowserId(req);
  const stamps = browserId ? await store.getSchoolStamps(browserId) : [];
  const stamped = new Set(stamps);
  const missingTopics = READY_TOPIC_SLUGS.filter((s) => !stamped.has(s));
  return json(
    {
      ok: true,
      utcDate: day.utcDate,
      cap: day.cap,
      minted: day.minted,
      remaining: day.remaining,
      queueLength: day.queueLength,
      store: store.kind,
      claim: WOOFTAG_CLAIM_LATER,
      stamps,
      missingTopics,
      schoolComplete: missingTopics.length === 0,
    },
    { cookies },
  );
}
