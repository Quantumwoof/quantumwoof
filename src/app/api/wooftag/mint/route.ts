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
  utcDateKey,
} from "@/lib/wooftag";
import { getWooftagPepper, wooftagFingerprint } from "@/lib/wooftag-hash";
import { QUEUE_STALE_MS, getWooftagStore } from "@/lib/wooftag-store";
import {
  WOOFTAG_X_MESSAGES,
  isWooftagXClaimEnabled,
} from "@/lib/wooftag-x";
import {
  ALREADY_SNIFFED_COPY,
  alreadyIssued,
  clientIp,
  doneCookie,
  ensureBrowserId,
  gateTooFresh,
  json,
  queueCookie,
  readQueueToken,
} from "@/lib/wooftag-http";
import { rejectForeignOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READY_SLUGS = new Set(
  schoolTopics.filter((t) => t.status === "ready").map((t) => t.slug),
);

const STALE_QUEUE_MS = QUEUE_STALE_MS;
/** newOpaqueId(12) → 20 glyphs from the Wooftag alphabet. */
const QUEUE_TOKEN_RE = /^[0-9A-HJKMNP-TV-Z]{8,64}$/;

type MintBody = {
  woofed?: unknown;
  startedAt?: unknown;
  queueToken?: unknown;
};

export async function POST(req: NextRequest) {
  const forbidden = rejectForeignOrigin(req);
  if (forbidden) return forbidden;

  // When X daily claim is on, anonymous mint is off.
  if (isWooftagXClaimEnabled()) {
    return json(
      {
        ok: false,
        error: "sign_in_required",
        message: WOOFTAG_X_MESSAGES.signInRequired,
      },
      { status: 403 },
    );
  }

  const store = getWooftagStore();
  if (!store) {
    console.error("[wooftag/mint] durable store unavailable");
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
    console.error("[wooftag/mint] issue secret missing");
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

  // Durable browser id cookie (set on first attempt if missing).
  const browser = ensureBrowserId(req);
  const pendingCookies = browser.cookie ? [browser.cookie] : [];

  if (alreadyIssued(req) || (await store.isBrowserBound(browser.id))) {
    const day = await store.getDay();
    return json(
      {
        ok: true,
        status: "already_issued",
        message: ALREADY_SNIFFED_COPY,
        remaining: day.remaining,
        utcDate: day.utcDate,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [...pendingCookies, doneCookie()] },
    );
  }

  if (gateTooFresh(req)) {
    return json(
      {
        ok: false,
        error: "too_fast",
        message: "Too speedy — sniff the courtyards first, then come back for Hosky’s tip.",
      },
      { status: 400, cookies: pendingCookies },
    );
  }

  let body: MintBody = {};
  try {
    body = (await req.json()) as MintBody;
  } catch {
    body = {};
  }

  // Authorization is server stamps only — ignore client-reported `woofed` lists.
  const stamps = await store.getSchoolStamps(browser.id);
  const stamped = new Set(stamps);
  const missingTopics = [...READY_SLUGS].filter((s) => !stamped.has(s));
  if (missingTopics.length > 0 || stamped.size < SNIFFER_THRESHOLD) {
    return json(
      {
        ok: false,
        error: "school_incomplete",
        missingTopics,
        message:
          "Finish the woof checks in each courtyard first — then Hosky can stamp a Wooftag.",
      },
      { status: 400, cookies: pendingCookies },
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
      { status: 400, cookies: pendingCookies },
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
      { status: 400, cookies: pendingCookies },
    );
  }

  const queueToken = validQueueToken(body.queueToken) || validQueueToken(readQueueToken(req));

  // Bowl is open (new UTC day = fresh 200; unused slots never roll over).
  // FIFO overflow from prior days drains first: only the head may mint while
  // the queue is non-empty; others keep/join the line. When empty, new mints
  // fill remaining slots up to 200. The store makes this decision and takes
  // the slot atomically, so concurrent requests cannot overshoot the cap or
  // share a queue position.
  const today = utcDateKey(now);
  const admission = await store.admitOrQueue({
    utcDate: today,
    token: queueToken,
    newToken: newOpaqueId(12),
    now,
    staleMs: STALE_QUEUE_MS,
  });

  if (admission.status === "queued") {
    return json(
      {
        ok: true,
        status: "queued",
        queueToken: admission.token,
        position: admission.position,
        remaining: admission.remaining,
        utcDate: admission.utcDate,
        cap: WOOFTAG_DAILY_CAP,
        message: WOOFTAG_BOWL_FULL,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [...pendingCookies, queueCookie(admission.token)] },
    );
  }

  let tag = "";
  let stored = false;
  const mintedAt = new Date(now).toISOString();
  for (let i = 0; i < 8; i++) {
    tag = generateWooftag();
    if (!isWooftagFormat(tag)) continue;
    stored = await store.putTagFingerprint(wooftagFingerprint(tag, pepper), mintedAt);
    if (stored) break;
  }

  if (!stored || !tag) {
    await store.releaseDailySlot(today);
    return json(
      { ok: false, error: "issue_failed", message: "Hosky dropped the stamp. Try again." },
      { status: 500, cookies: pendingCookies },
    );
  }

  // Bind browser id in the store so clearing localStorage alone cannot remint.
  const bound = await store.bindBrowser(browser.id, mintedAt);
  if (!bound) {
    await store.releaseDailySlot(today);
    return json(
      {
        ok: true,
        status: "already_issued",
        message: ALREADY_SNIFFED_COPY,
        remaining: (await store.getDay(today)).remaining,
        utcDate: today,
        claim: WOOFTAG_CLAIM_LATER,
      },
      { cookies: [...pendingCookies, doneCookie()] },
    );
  }

  const after = await store.getDay(today);
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
    { cookies: [...pendingCookies, doneCookie()] },
  );
}

/** Queue tokens are server-issued opaque ids — reject anything else (size/charset). */
function validQueueToken(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return QUEUE_TOKEN_RE.test(v) ? v : undefined;
}
