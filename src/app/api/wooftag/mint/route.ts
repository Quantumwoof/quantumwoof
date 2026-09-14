import type { NextRequest } from "next/server";
import { SNIFFER_THRESHOLD, schoolTopics } from "@/content/woofSchool";
import {
  WOOFTAG_BOWL_FULL,
  WOOFTAG_CLAIM_LATER,
  WOOFTAG_DAILY_CAP,
  WOOFTAG_TIP_COPY,
  generateWooftag,
  isWooftagFormat,
  newOpaqueId,
} from "@/lib/wooftag";
import { getWooftagPepper, hashWooftag } from "@/lib/wooftag-hash";
import { getWooftagStore, type QueueItem } from "@/lib/wooftag-store";
import {
  alreadyIssued,
  clientIp,
  doneCookie,
  gateTooFresh,
  json,
  queueCookie,
  readQueueToken,
} from "@/lib/wooftag-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READY_SLUGS = new Set(
  schoolTopics.filter((t) => t.status === "ready").map((t) => t.slug),
);

const STALE_QUEUE_MS = 36 * 60 * 60 * 1000;

type MintBody = {
  woofed?: unknown;
  startedAt?: unknown;
  queueToken?: unknown;
};

export async function POST(req: NextRequest) {
  const store = getWooftagStore();
  if (!store) {
    return json(
      {
        ok: false,
        error: "store_unavailable",
        message:
          "Wooftag bowl is napping — set UPSTASH_REDIS_REST_URL + TOKEN (or Vercel KV) and WOOFTAG_PEPPER.",
      },
      { status: 503 },
    );
  }

  const pepper = getWooftagPepper();
  if (!pepper) {
    return json(
      {
        ok: false,
        error: "pepper_missing",
        message: "Wooftag cannot issue without WOOFTAG_PEPPER.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const burst = await store.rateLimit(`mint:${ip}`, 10, 10 * 60);
  if (!burst.ok) {
    return json(
      {
        ok: false,
        error: "rate_limited",
        message: "Easy, pup — try again in a minute.",
      },
      { status: 429 },
    );
  }

  if (alreadyIssued(req)) {
    const day = await store.getDay();
    return json({
      ok: true,
      status: "already_issued",
      message:
        "This browser already received a Wooftag. Hosky doesn’t reprint lost tags — check this device’s local backup.",
      remaining: day.remaining,
      utcDate: day.utcDate,
      claim: WOOFTAG_CLAIM_LATER,
    });
  }

  if (gateTooFresh(req)) {
    return json(
      {
        ok: false,
        error: "too_fast",
        message: "Too speedy — sniff the courtyards first, then come back for Hosky’s tip.",
      },
      { status: 400 },
    );
  }

  let body: MintBody = {};
  try {
    body = (await req.json()) as MintBody;
  } catch {
    body = {};
  }

  const woofed = Array.isArray(body.woofed)
    ? [...new Set(body.woofed.filter((s): s is string => typeof s === "string"))]
    : [];
  const validCount = woofed.filter((s) => READY_SLUGS.has(s)).length;
  if (validCount < SNIFFER_THRESHOLD) {
    return json(
      {
        ok: false,
        error: "not_sniffer",
        message: "Woof a few more courtyards first — the tip bowl is for Certified Nebula Sniffers.",
      },
      { status: 400 },
    );
  }

  const startedAt =
    typeof body.startedAt === "number" && Number.isFinite(body.startedAt)
      ? body.startedAt
      : null;
  const now = Date.now();
  if (startedAt !== null && startedAt > now + 60_000) {
    return json(
      { ok: false, error: "too_fast", message: "Clock looks wobbly. Try again." },
      { status: 400 },
    );
  }
  // Soft: reject absurdly instant mints when the client admits it just started.
  if (startedAt !== null && now - startedAt < 5_000) {
    return json(
      {
        ok: false,
        error: "too_fast",
        message: "Too speedy — sniff the courtyards first, then come back for Hosky’s tip.",
      },
      { status: 400 },
    );
  }

  const bodyQueue =
    typeof body.queueToken === "string" && body.queueToken.trim()
      ? body.queueToken.trim()
      : undefined;
  const queueToken = bodyQueue || readQueueToken(req);

  const day = await store.getDay();
  const queue = pruneQueue(await store.getQueue(), now);

  if (day.remaining <= 0) {
    const { items, token, position } = enqueue(queue, queueToken, now);
    await store.setQueue(items);
    return json(
      {
        ok: true,
        status: "queued",
        queueToken: token,
        position,
        remaining: 0,
        utcDate: day.utcDate,
        cap: WOOFTAG_DAILY_CAP,
        message: WOOFTAG_BOWL_FULL,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [queueCookie(token)] },
    );
  }

  // Bowl is open. FIFO: queued sniffers keep their token until they mint.
  const nextQueue = queueToken
    ? queue.filter((q) => q.id !== queueToken)
    : queue;
  if (nextQueue.length !== queue.length) await store.setQueue(nextQueue);

  const slot = await store.reserveDailySlot(day.utcDate);
  if (!slot.reserved) {
    const { items, token, position } = enqueue(nextQueue, queueToken, now);
    await store.setQueue(items);
    return json(
      {
        ok: true,
        status: "queued",
        queueToken: token,
        position,
        remaining: 0,
        utcDate: slot.utcDate,
        cap: WOOFTAG_DAILY_CAP,
        message: WOOFTAG_BOWL_FULL,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [queueCookie(token)] },
    );
  }

  let tag = "";
  let stored = false;
  const mintedAt = new Date(now).toISOString();
  for (let i = 0; i < 8; i++) {
    tag = generateWooftag();
    if (!isWooftagFormat(tag)) continue;
    const digest = hashWooftag(tag, pepper);
    stored = await store.putHash(digest, mintedAt);
    if (stored) break;
  }

  if (!stored || !tag) {
    await store.releaseDailySlot(day.utcDate);
    return json(
      { ok: false, error: "issue_failed", message: "Hosky dropped the stamp. Try again." },
      { status: 500 },
    );
  }

  const after = await store.getDay(day.utcDate);
  return json(
    {
      ok: true,
      status: "minted",
      tag,
      utcDate: after.utcDate,
      remaining: after.remaining,
      cap: after.cap,
      claim: WOOFTAG_CLAIM_LATER,
      note: WOOFTAG_TIP_COPY,
    },
    { cookies: [doneCookie()] },
  );
}

function pruneQueue(items: QueueItem[], now: number): QueueItem[] {
  return items.filter((i) => i && i.id && now - i.t < STALE_QUEUE_MS);
}

function enqueue(
  items: QueueItem[],
  existing: string | undefined,
  now: number,
): { items: QueueItem[]; token: string; position: number } {
  if (existing) {
    const idx = items.findIndex((i) => i.id === existing);
    if (idx >= 0) {
      return { items, token: existing, position: idx + 1 };
    }
  }
  const token = existing || newOpaqueId(12);
  const next = [...items, { id: token, t: now }];
  return { items: next, token, position: next.length };
}
