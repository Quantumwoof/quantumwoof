import type { Metadata } from "next";
import Link from "next/link";
import { PlayCountryGate } from "@/components/PlayCountryGate";
import { ConstellationConnect } from "@/components/games/ConstellationConnect";
import { FetchPhoton } from "@/components/games/FetchPhoton";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Woof games · Hosky",
  description: "Optional chill games from Hosky’s QuantumWoof garden.",
  path: "/play",
});

export default function PlayPage() {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="card-label mb-2">Optional recess</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Woof games</h1>
        <p className="mt-2 max-w-2xl text-slate">
          Same sky language as School. Constellation Connect is the star — Photon sits quieter.
          Country first so tonight’s few stay honest.{" "}
          <Link href="/" className="text-electric hover:underline">
            Back to the garden
          </Link>
        </p>
      </div>

      <PlayCountryGate>
        {/* Primary — Constellation Connect */}
        <section
          id="constellation"
          className="bento-card border-lavender/40 p-4 sm:p-6"
        >
          <p className="card-label mb-2 text-lavender">Tonight&apos;s few</p>
          <ConstellationConnect />
        </section>

        {/* Secondary — Fetch the Photon */}
        <section
          id="photon"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="card-label mb-1 text-slate-muted">Also play</p>
              <h2 className="text-base font-semibold text-white">Fetch the Photon</h2>
              <p className="text-xs text-slate-muted">Quick catch · secondary to Connect</p>
            </div>
          </div>
          <FetchPhoton compact />
        </section>
      </PlayCountryGate>
    </div>
  );
}
