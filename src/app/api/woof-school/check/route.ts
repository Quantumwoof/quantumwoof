import type { NextRequest } from "next/server";
import { getTopic } from "@/content/woofSchool";
import { gradeWoofCheck } from "@/content/woofSchool-answers";
import { utcDateKey } from "@/lib/wooftag";
import { getWooftagStore } from "@/lib/wooftag-store";
import { clientIp, ensureBrowserId, json } from "@/lib/wooftag-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckBody = {
  topic?: unknown;
  answers?: unknown;
};

export async function POST(req: NextRequest) {
  const store = getWooftagStore();
  if (!store) {
    console.error("[woof-school/check] durable store unavailable");
    return json(
      {
        ok: false,
        error: "service_unavailable",
        message: "Woof School check pad is napping — try again later.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const burst = await store.rateLimit(`check:${ip}`, 60, 10 * 60);
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

  let body: CheckBody = {};
  try {
    body = (await req.json()) as CheckBody;
  } catch {
    body = {};
  }

  const topicSlug = typeof body.topic === "string" ? body.topic.trim() : "";
  const topic = topicSlug ? getTopic(topicSlug) : undefined;
  if (!topic || topic.status !== "ready" || !topic.woofCheck) {
    return json(
      {
        ok: false,
        error: "unknown_topic",
        message: "That courtyard is not open for a woof check.",
      },
      { status: 400, cookies: pendingCookies },
    );
  }

  const answersRaw =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};

  const graded = gradeWoofCheck(topic.slug, answersRaw);
  if (!graded) {
    return json(
      {
        ok: false,
        error: "unknown_topic",
        message: "That courtyard is not open for a woof check.",
      },
      { status: 400, cookies: pendingCookies },
    );
  }

  const passAt = topic.woofCheck.passAt;
  const passed = graded.score >= passAt;

  if (passed) {
    // Undated stamps keep anonymous mint working while X claim is off.
    await store.addSchoolStamp(browser.id, topic.slug);
    // Day-scoped stamps gate X daily claims (undated keys are ignored for claims).
    await store.addDaySchoolStamp(browser.id, utcDateKey(), topic.slug);
  }

  const today = utcDateKey();
  const stamps = await store.getSchoolStamps(browser.id);
  const dayStamps = await store.getDaySchoolStamps(browser.id, today);

  return json(
    {
      ok: true,
      topic: topic.slug,
      passed,
      score: graded.score,
      passAt,
      total: graded.total,
      results: graded.results,
      stamps,
      dayStamps,
      utcDate: today,
    },
    { cookies: pendingCookies },
  );
}
