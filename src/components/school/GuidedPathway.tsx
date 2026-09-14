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

  // Find first un-woofed live topic for a smarter Continue when cursor is stale.
  let smartHref = resumeHref;
  if (isGuided && progressReady) {
    const cursor = path.topicSlug;
    const cursorIdx = cursor ? live.findIndex((t) => t.slug === cursor) : 0;
    const from = cursorIdx >= 0 ? cursorIdx : 0;
    const nextOpen =
      live.slice(from).find((t) => !isWoofed(t.slug)) ??
      live.find((t) => !isWoofed(t.slug));
    if (nextOpen) smartHref = `/school/${nextOpen.slug}`;
    else if (continueReady && continueTopic) smartHref = `/school/${continueTopic.slug}`;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <p className="card-label mb-1">How do you want to stroll?</p>
      <h2 className="text-lg font-semibold text-white">Pathway</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate">
        Guided is Hosky’s optional order. Open sniff lets you pick any courtyard. Campus map
        stays open either way — never a gate.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("guided")}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === "guided"
              ? "border-electric/50 bg-electric/[0.1]"
              : "border-white/10 bg-white/[0.03] hover:border-electric/30"
          }`}
        >
          <p className="text-sm font-semibold text-white">Guided</p>
          <p className="mt-1 text-xs leading-relaxed text-slate">
            Hosky’s ordered path. We remember your courtyard and lesson step in this browser.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("open")}
          className={`rounded-2xl border p-4 text-left transition ${
            mode === "open"
              ? "border-lavender/45 bg-lavender/[0.1]"
              : "border-white/10 bg-white/[0.03] hover:border-lavender/30"
          }`}
        >
          <p className="text-sm font-semibold text-white">Open sniff</p>
          <p className="mt-1 text-xs leading-relaxed text-slate">
            Wander any ready path. Sniff-later stubs stay closed until Hosky opens them.
          </p>
        </button>
      </div>

      {isGuided && first ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={smartHref}
            className="inline-flex rounded-full bg-electric px-4 py-2 text-sm font-semibold text-navy transition hover:bg-electric-dim"
          >
            {path.topicSlug ? "Continue →" : "Start guided stroll →"}
          </Link>
          {continueTopic && continueReady ? (
            <p className="text-xs text-slate-muted">
              Cursor · {continueTopic.emoji} {continueTopic.title}
              {path.stepIndex > 0 ? ` · step ${path.stepIndex + 1}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === "open" ? (
        <p className="mt-4 text-xs text-slate-muted">
          Open sniff on — pick any card on the campus map below.
        </p>
      ) : null}

      {mode === null ? (
        <p className="mt-4 text-xs text-slate-muted">
          Pick Guided or Open sniff — or just tap a courtyard. Hosky does not mind.
        </p>
      ) : null}
    </section>
  );
}
