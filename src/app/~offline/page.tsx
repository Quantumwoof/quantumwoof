/* eslint-disable @next/next/no-html-link-for-pages -- offline fallback needs full-page navigations so the service worker can answer from cache. */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline · Hosky",
  description: "You are offline — pages you already opened still work.",
  robots: { index: false, follow: false },
};

/**
 * Precached by the service worker (next-pwa picks up `app/~offline`) and served
 * when a page was never opened on this device and the network is down.
 * Plain <a> links on purpose: full navigations let the service worker answer
 * from its cache, while client-side router fetches would just fail offline.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start py-16 sm:py-24">
      <p className="card-label mb-2">No signal</p>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Hosky lost the scent
      </h1>
      <p className="mt-3 text-slate">
        You look offline, and this page has not been sniffed on this device yet. Pages you
        already opened still work — try one below, or come back when the signal returns.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="/"
          className="rounded-full bg-electric/15 px-4 py-2 text-sm font-medium text-electric ring-1 ring-electric/30 transition hover:bg-electric/25 hover:text-white"
        >
          Back to the garden
        </a>
        <a
          href="/school"
          className="rounded-full px-4 py-2 text-sm text-slate ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
        >
          School
        </a>
        <a
          href="/notes"
          className="rounded-full px-4 py-2 text-sm text-slate ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
        >
          Notes
        </a>
      </div>
      <p className="mt-10 font-mono text-xs text-slate-muted">offline · QuantumWoof garden</p>
    </div>
  );
}
