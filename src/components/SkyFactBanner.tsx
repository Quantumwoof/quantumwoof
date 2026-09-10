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

function getServerFact(): string {
  return "A quiet astronomy note is lining up with the next sky window…";
}

function subscribeNoop() {
  return () => {};
}

/**
 * Floating sky-fact strip — sits high among soft clouds near the garden header,
 * not buried mid-grid.
 */
export function SkyFactBanner() {
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
    <div className="sky-fact-banner relative mb-5 overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-4 py-4 sm:px-5 sm:py-4">
      {/* Soft cloud blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="sky-cloud sky-cloud-a" />
        <span className="sky-cloud sky-cloud-b" />
        <span className="sky-cloud sky-cloud-c" />
        <span className="sky-cloud-star" style={{ left: "12%", top: "22%" }} />
        <span className="sky-cloud-star" style={{ left: "78%", top: "18%", animationDelay: "0.8s" }} />
        <span className="sky-cloud-star" style={{ left: "92%", top: "55%", animationDelay: "1.4s" }} />
      </div>

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/[0.08] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-dim">
            High sky · every 12h (WAT)
          </div>
          <p
            className="text-sm leading-relaxed text-slate sm:text-[0.95rem]"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="mr-2 font-semibold text-white">Sky fact</span>
            {fact}
          </p>
        </div>
        <p
          className="shrink-0 self-start rounded-full border border-white/10 bg-navy/40 px-2.5 py-1 font-mono text-[0.65rem] text-slate-muted backdrop-blur-sm"
          aria-live="polite"
        >
          {countdown}
        </p>
      </div>
    </div>
  );
}
