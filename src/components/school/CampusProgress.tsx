"use client";

import Link from "next/link";
import { READY_TOPIC_COUNT, SNIFFER_THRESHOLD, schoolTopics } from "@/content/woofSchool";

const LATER_COUNT = schoolTopics.length - READY_TOPIC_COUNT;
import { useWoofProgress } from "@/hooks/useWoofProgress";

export function CampusProgress() {
  const { ready, woofedCount, totalTopics, isSniffer } = useWoofProgress();

  // Render the real card (empty progress) before hydration, so the page does not
  // jump when saved progress loads in.
  const count = ready ? woofedCount : 0;
  const sniffer = ready && isSniffer;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-busy={!ready}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label mb-1">Coverage</p>
          <p className="text-lg font-semibold text-white">
            {count} / {totalTopics} topics woofed
          </p>
          <p className="mt-1 text-sm text-slate">
            Woof {SNIFFER_THRESHOLD} of {totalTopics} open courtyards → Certified Nebula
            Sniffer.
            {LATER_COUNT > 0
              ? ` ${LATER_COUNT} more ${LATER_COUNT === 1 ? "is" : "are"} sniff-later and don’t count yet.`
              : ""}
          </p>
        </div>
        <div className="font-mono text-sm text-electric">
          {Math.min(100, Math.round((count / SNIFFER_THRESHOLD) * 100))}% to sniffer
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-electric to-lavender transition-all"
          style={{
            width: `${Math.min(100, (count / SNIFFER_THRESHOLD) * 100)}%`,
          }}
        />
      </div>
      {sniffer ? (
        <div className="mt-4 rounded-xl border border-lavender/35 bg-lavender/10 p-4">
          <p className="text-sm font-semibold text-lavender">Certified Nebula Sniffer</p>
          <p className="mt-1 text-sm text-slate">
            Hosky confirms you sniffed enough nebulae to be dangerous at dinner parties.
          </p>
          <Link
            href="/school#certificate"
            className="mt-2 inline-block text-sm text-electric hover:text-white"
          >
            View certificate →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
