import type { NextRequest } from "next/server";
import { SNIFFER_THRESHOLD, schoolTopics } from "@/content/woofSchool";
import { readSession } from "@/lib/auth-session";
import { decryptWooftag, encryptWooftag } from "@/lib/wooftag-crypto";
import {
  WOOFTAG_BOWL_FULL,
  WOOFTAG_CLAIM_LATER,
  WOOFTAG_DAILY_CAP,
  WOOFTAG_TIP_COPY,
  generateWooftag,
  isWooftagFormat,
  utcDateKey,
} from "@/lib/wooftag";
import { getWooftagPepper, wooftagFingerprint } from "@/lib/wooftag-hash";
import {
  WOOFTAG_X_MESSAGES,
  isWooftagXClaimEnabled,
} from "@/lib/wooftag-x";
import { getWooftagStore, type QueueItem } from "@/lib/wooftag-store";
import {
  clientIp,
  ensureBrowserId,
  gateTooFresh,
  json,
  queueCookie,
  readQueueToken,
} from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READY_SLUGS = schoolTopics
  .filter((t) => t.status === "ready")
  .map((t) => t.slug);

const STALE_QUEUE_MS = 36 * 60 * 60 * 1000;

type ClaimBody = { queueToken?: unknown };

/**
 * Claim today's Wooftag with a signed-in eligible X account.
 * Needs all ready-topic day-scoped stamps for this browser on this UTC day.
 * One claim per X account per UTC day (SET NX). History keeps past daily tags.
 */
export async function POST(req: NextRequest) {
  const forbidden = rejectForeignOrigin(req);
  if (forbidden) return forbidden;

  if (!isWooftagXClaimEnabled()) {
    return json(
      { ok: false, error: "disabled", message: WOOFTAG_X_MESSAGES.disabled },
      { status: 404 },
    );
  }

  const session = readSession(req);
  if (!session) {
    return json(
      {
        ok: false,
        error: "sign_in_required",
        message: WOOFTAG_X_MESSAGES.signInRequired,
      },
      { status: 401 },
    );
  }

  const store = getWooftagStore();
  if (!store) {
    console.error("[wooftag/claim] durable store unavailable");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Wooftag bowl is napping — try again later.",
      },
      { status: 503 },
    );
  }

  const pepper = getWooftagPepper();
  if (!pepper) {
    console.error("[wooftag/claim] issue secret missing");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Wooftag bowl is napping — try again later.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const burst = await store.rateLimit(`claim:${ip}`, 10, 10 * 60);
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

  const browser = ensureBrowserId(req);
  const pendingCookies = browser.cookie ? [browser.cookie] : [];
  const today = utcDateKey();

  const existing = await store.getXClaim(session.uid, today);
  if (existing) {
    const tag = decryptWooftag(existing.tagEnc);
    const day = await store.getDay(today);
    return json(
      {
        ok: true,
        status: "already_claimed",
        tag: tag || undefined,
        utcDate: today,
        remaining: day.remaining,
        cap: day.cap,
        claim: WOOFTAG_CLAIM_LATER,
        note: WOOFTAG_X_MESSAGES.alreadyToday,
        message: WOOFTAG_X_MESSAGES.dailyHint,
      },
      { cookies: pendingCookies },
    );
  }

  if (gateTooFresh(req)) {
    return json(
      {
        ok: false,
        error: "too_fast",
        message: "Too speedy — pass today’s woof checks first, then claim.",
      },
      { status: 400, cookies: pendingCookies },
    );
  }

  const dayStamps = await store.getDaySchoolStamps(browser.id, today);
  const stamped = new Set(dayStamps);
  const missingTopics = READY_SLUGS.filter((s) => !stamped.has(s));
  if (missingTopics.length > 0 || stamped.size < SNIFFER_THRESHOLD) {
    return json(
      {
        ok: false,
        error: "school_incomplete",
        missingTopics,
        utcDate: today,
        message: WOOFTAG_X_MESSAGES.missingStamps,
      },
      { status: 400, cookies: pendingCookies },
    );
  }

  let body: ClaimBody = {};
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    body = {};
  }

  const bodyQueue =
    typeof body.queueToken === "string" && body.queueToken.trim()
      ? body.queueToken.trim()
      : undefined;
  const queueToken = bodyQueue || readQueueToken(req) || session.uid;

  const now = Date.now();
  const day = await store.getDay(today);
  const queue = pruneQueue(await store.getQueue(), now);

  if (day.remaining <= 0) {
    const { items, token, position } = enqueue(queue, session.uid, now);
    await store.setQueue(items);
    return json(
      {
        ok: true,
        status: "queued",
        queueToken: token,
        position,
        remaining: 0,
        utcDate: today,
        cap: WOOFTAG_DAILY_CAP,
        message: WOOFTAG_BOWL_FULL,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [...pendingCookies, queueCookie(token)] },
    );
  }

  if (queue.length > 0) {
    const head = queue[0];
    if (queueToken !== head?.id) {
      const { items, token, position } = enqueue(queue, session.uid, now);
      await store.setQueue(items);
      return json(
        {
          ok: true,
          status: "queued",
          queueToken: token,
          position,
          remaining: day.remaining,
          utcDate: today,
          cap: WOOFTAG_DAILY_CAP,
          message: WOOFTAG_BOWL_FULL,
          claim: WOOFTAG_CLAIM_LATER,
        },
        { cookies: [...pendingCookies, queueCookie(token)] },
      );
    }
  }

  const nextQueue = queue.filter((q) => q.id !== session.uid);
  if (nextQueue.length !== queue.length) await store.setQueue(nextQueue);

  const slot = await store.reserveDailySlot(today);
  if (!slot.reserved) {
    const { items, token, position } = enqueue(nextQueue, session.uid, now);
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
      { cookies: [...pendingCookies, queueCookie(token)] },
    );
  }

  let tag = "";
  let tagHash = "";
  let stored = false;
  const issuedAt = new Date(now).toISOString();
  for (let i = 0; i < 8; i++) {
    tag = generateWooftag();
    if (!isWooftagFormat(tag)) continue;
    const fp = wooftagFingerprint(tag, pepper);
    tagHash = fp.hmac;
    stored = await store.putTagFingerprint(fp, issuedAt);
    if (stored) break;
  }

  if (!stored || !tag || !tagHash) {
    await store.releaseDailySlot(today);
    return json(
      { ok: false, error: "issue_failed", message: "Hosky dropped the stamp. Try again." },
      { status: 500, cookies: pendingCookies },
    );
  }

  const tagEnc = encryptWooftag(tag);
  if (!tagEnc) {
    await store.releaseDailySlot(today);
    console.error("[wooftag/claim] encrypt failed (session secret?)");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Wooftag bowl is napping — try again later.",
      },
      { status: 503, cookies: pendingCookies },
    );
  }

  const raced = await store.getXClaim(session.uid, today);
  if (raced) {
    await store.releaseDailySlot(today);
    const existingTag = decryptWooftag(raced.tagEnc);
    return json(
      {
        ok: true,
        status: "already_claimed",
        tag: existingTag || undefined,
        utcDate: today,
        remaining: (await store.getDay(today)).remaining,
        claim: WOOFTAG_CLAIM_LATER,
        note: WOOFTAG_X_MESSAGES.alreadyToday,
        message: WOOFTAG_X_MESSAGES.dailyHint,
      },
      { cookies: pendingCookies },
    );
  }

  const bound = await store.putXClaim({
    xUserId: session.uid,
    username: session.un,
    createdAt: session.ca || "",
    utcDate: today,
    issuedAt,
    tagHash,
    tagEnc,
  });
  if (!bound) {
    await store.releaseDailySlot(today);
    const again = await store.getXClaim(session.uid, today);
    const existingTag = again ? decryptWooftag(again.tagEnc) : null;
    return json(
      {
        ok: true,
        status: "already_claimed",
        tag: existingTag || undefined,
        utcDate: today,
        remaining: (await store.getDay(today)).remaining,
        claim: WOOFTAG_CLAIM_LATER,
        note: WOOFTAG_X_MESSAGES.alreadyToday,
        message: WOOFTAG_X_MESSAGES.dailyHint,
      },
      { cookies: pendingCookies },
    );
  }

  await store.pushXClaimHistory(session.uid, {
    utcDate: today,
    issuedAt,
    tagHash,
    tagEnc,
  });

  const after = await store.getDay(today);
  return json(
    {
      ok: true,
      status: "claimed",
      tag,
      utcDate: after.utcDate,
      remaining: after.remaining,
      cap: after.cap,
      claim: WOOFTAG_CLAIM_LATER,
      note: WOOFTAG_TIP_COPY,
      message: WOOFTAG_X_MESSAGES.dailyHint,
    },
    { cookies: pendingCookies },
  );
}

function pruneQueue(items: QueueItem[], now: number): QueueItem[] {
  return items.filter((i) => i && i.id && now - i.t < STALE_QUEUE_MS);
}

function enqueue(
  items: QueueItem[],
  xUserId: string,
  now: number,
): { items: QueueItem[]; token: string; position: number } {
  const idx = items.findIndex((i) => i.id === xUserId);
  if (idx >= 0) return { items, token: xUserId, position: idx + 1 };
  const next = [...items, { id: xUserId, t: now }];
  return { items: next, token: xUserId, position: next.length };
}
