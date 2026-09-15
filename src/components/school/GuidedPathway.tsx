"use client";

import Link from "next/link";
import { getTopic, liveGuidedOrder } from "@/content/woofSchool";
import { useGuidedPath } from "@/hooks/useGuidedPath";
import { useWoofProgress } from "@/hooks/useWoofProgress";

export function GuidedPathway() {
  const { ready, mode, isGuided, continueHref, setMode, path } = useGuidedPath();
  const { ready: progressReady, isWoofed } = useWoofProgress();
  const live = liveGuidedOrder();
  const first = live[0];

  if (!ready) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-muted">
        Warming the pathway picker…
      </div>
    );
  }

  const continueTopic = path.topicSlug ? getTopic(path.topicSlug) : first;
  const continueReady = continueTopic?.status === "ready";
  const resumeHref =
    continueHref ?? (first ? `/school/${first.slug}` : "/school");

  let smartHref = resumeHref;
  let resumeLabel = continueTopic?.title ?? "Looking up";
  let resumeStep = "";
  if (progressReady) {
    const cursor = path.topicSlug;
    const cursorIdx = cursor ? live.findIndex((t) => t.slug === cursor) : 0;
    const from = cursorIdx >= 0 ? cursorIdx : 0;
    const nextOpen =
      live.slice(from).find((t) => !isWoofed(t.slug)) ??
      live.find((t) => !isWoofed(t.slug));
    if (nextOpen) {
      smartHref = `/school/${nextOpen.slug}`;
      resumeLabel = nextOpen.title;
    } else if (continueReady && continueTopic) {
      smartHref = `/school/${continueTopic.slug}`;
      resumeLabel = continueTopic.title;
    }
    if (path.topicSlug && path.stepIndex > 0) {
      const topic = getTopic(path.topicSlug);
      const total = (topic?.lessons.length ?? 0) + (topic?.woofCheck ? 1 : 0);
      if (total > 0) {
        resumeStep = ` · lesson ${Math.min(path.stepIndex + 1, total)} of ${total}`;
      }
    }
  }

  const hasResume = Boolean(path.topicSlug) || mode === "guided";
  const guidedActive = mode === "guided" || mode === null;

  return (
    <section className="space-y-3">
      <div>
        <p className="card-label mb-1">Pathway</p>
        <p className="text-sm leading-relaxed text-slate">
          Guided leads. Open sniff wanders. Campus map stays open either way — never a gate.
        </p>
      </div>

      {/* Guided — recommended / primary */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          guidedActive
            ? "border-gold/55 bg-gold/[0.07]"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-navy">
            Recommended
          </span>
          {mode === "guided" ? (
            <span className="text-[0.65rem] uppercase tracking-wide text-gold-dim">Active</span>
          ) : null}
        </div>
        <h2 className="text-lg font-semibold text-white">Guided sniff</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate">
          Ordered courtyards. Continue where you left off. Best first visit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={first ? `/school/${first.slug}` : "/school"}
            onClick={() => setMode("guided")}
            className="inline-flex rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-gold-dim"
          >
            {path.topicSlug ? "Continue guided →" : "Start guided"}
          </Link>
          {mode !== "guided" ? (
            <button
              type="button"
              onClick={() => setMode("guided")}
              className="rounded-full border border-gold/40 px-4 py-2.5 text-sm text-gold-dim transition hover:bg-gold/10"
            >
              Prefer guided
            </button>
          ) : null}
        </div>
      </div>

      {/* Open sniff — secondary */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
          mode === "open"
            ? "border-lavender/40 bg-lavender/[0.08]"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">Open sniff</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-muted">
            Wander the map freely · secondary
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode("open");
            document.getElementById("campus-map")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="shrink-0 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-lavender/40"
        >
          Browse map
        </button>
      </div>

      {/* Continue — when resume exists */}
      {hasResume && continueReady ? (
        <Link
          href={isGuided || mode === null ? smartHref : smartHref}
          onClick={() => {
            if (mode !== "guided") setMode("guided");
          }}
          className="block rounded-2xl border border-lavender/40 bg-lavender/[0.08] p-4 transition hover:border-lavender/60"
        >
          <p className="text-base font-semibold text-lavender">Continue</p>
          <p className="mt-0.5 text-sm text-slate">
            {resumeLabel}
            {resumeStep}
          </p>
        </Link>
      ) : null}
    </section>
  );
}
