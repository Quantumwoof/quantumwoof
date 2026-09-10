"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  formatCountdown,
  getFactForSlot,
  getSlotEndMs,
  getUtcFactSlot,
} from "@/content/astronomyFacts";

function getClientFact(): string {
  return getFactForSlot(getUtcFactSlot(Date.now()));
}

/** Stable SSR/hydration placeholder — real fact swaps in via useSyncExternalStore. */
function getServerFact(): string {
  return "A quiet astronomy note is lining up with the next sky window…";
}

function subscribeNoop() {
  return () => {};
}

export function AstronomyFactCard() {
  const fact = useSyncExternalStore(subscribeNoop, getClientFact, getServerFact);
  const [countdown, setCountdown] = useState("Changes every 12 hours");

  useEffect(() => {
    const tick = () => {
      setCountdown(formatCountdown(getSlotEndMs(Date.now()) - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/[0.08] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-dim">
          Every 12h (WAT)
        </div>
        <h2 className="text-lg font-semibold text-white">Sky fact</h2>
        <p
          className="mt-3 text-sm leading-relaxed text-slate"
          aria-live="polite"
          aria-atomic="true"
        >
          {fact}
        </p>
      </div>
      <p className="text-xs text-slate-muted" aria-live="polite">
        {countdown}
      </p>
    </div>
  );
}
