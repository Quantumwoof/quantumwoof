"use client";

import Link from "next/link";
import { SNIFFER_THRESHOLD } from "@/content/woofSchool";
import { useWoofProgress } from "@/hooks/useWoofProgress";

export function CampusProgress() {
  const { ready, woofedCount, totalTopics, isSniffer } = useWoofProgress();

  if (!ready) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-muted">
        Loading sniff stamps…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label mb-1">Coverage</p>
          <p className="text-lg font-semibold text-white">
            {woofedCount} / {totalTopics} topics woofed
          </p>
          <p className="mt-1 text-sm text-slate">
            Hit {SNIFFER_THRESHOLD} of {totalTopics} → Certified Nebula Sniffer. Miss the two
            sniff-later stubs if you want; still a sniffer.
          </p>
        </div>
        <div className="font-mono text-sm text-electric">
          {Math.min(100, Math.round((woofedCount / SNIFFER_THRESHOLD) * 100))}% to sniffer
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-electric to-lavender transition-all"
          style={{
            width: `${Math.min(100, (woofedCount / SNIFFER_THRESHOLD) * 100)}%`,
          }}
        />
      </div>
      {isSniffer ? (
        <div className="mt-4 rounded-xl border border-lavender/35 bg-lavender/10 p-4">
          <p className="text-sm font-semibold text-lavender">Certified Nebula Sniffer</p>
          <p className="mt-1 text-sm text-slate">
            This husky confirms you sniffed enough nebulae to be dangerous at dinner parties.
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
