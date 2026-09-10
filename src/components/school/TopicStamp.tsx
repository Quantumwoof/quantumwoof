"use client";

import { useWoofProgress } from "@/hooks/useWoofProgress";

export function TopicStamp({ slug }: { slug: string }) {
  const { ready, isWoofed, progress } = useWoofProgress();
  if (!ready) return null;
  if (isWoofed(slug)) {
    return (
      <span className="rounded-full bg-electric/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-electric">
        Woofed
      </span>
    );
  }
  if (progress.visited.includes(slug)) {
    return (
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-muted">
        Visited
      </span>
    );
  }
  return null;
}
