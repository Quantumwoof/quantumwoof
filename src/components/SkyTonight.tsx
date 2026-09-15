"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { seasonLabel } from "@/content/tonightStars";
import { useCountry } from "@/hooks/useCountry";
import { getTonightShortlist } from "@/lib/skyProjection";

/** Home “Tonight under your sky” — same constellation names as Play Connect. */
export function SkyTonight() {
  const { country, hemisphere, hydrated, code, needsPrompt, hasCountry } = useCountry();
  const season = hemisphere ? seasonLabel(hemisphere) : null;

  const shortlist = useMemo(() => {
    if (!hydrated || !code || !hemisphere) return [];
    return getTonightShortlist(code, hemisphere);
  }, [hydrated, code, hemisphere]);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{
              left: `${8 + ((i * 37) % 84)}%`,
              top: `${12 + ((i * 53) % 70)}%`,
              animationDelay: `${(i % 7) * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="card-label mb-0 text-lavender">Tonight under your sky</p>
          <CountryPicker variant="chip" />
        </div>

        {!hydrated ? (
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              Lining up tonight&apos;s few…
            </h2>
            <p className="mt-1 text-sm text-slate">A quiet shortlist for your hemisphere…</p>
          </div>
        ) : needsPrompt || !hasCountry || !country ? (
          <div className="space-y-3 rounded-xl border border-electric/25 bg-electric/[0.06] px-4 py-4">
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              Where are you watching from?
            </h2>
            <p className="text-sm leading-relaxed text-slate">
              Pick a country so Hosky can tilt tonight&apos;s few toward your sky — no Nigeria
              assumption until you choose. Stored only on this device.
            </p>
            <CountryPicker variant="inline" />
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Up for <span className="text-electric-dim">{country.name}</span> tonight
              </h2>
              <p className="mt-1 text-sm text-slate">
                Same shapes you&apos;ll connect in Play
                {season ? <> — {season}</> : null}. Short tips, not a topic dump.
              </p>
            </div>

            {shortlist.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {shortlist.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-sm text-white"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            ) : null}

            <ul className="space-y-2">
              {shortlist.slice(0, 3).map((s) => (
                <li
                  key={`tip-${s.id}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5"
                >
                  <span className="mt-0.5 text-lavender" aria-hidden>
                    ✧
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs leading-relaxed text-slate-muted">{s.tip}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-xs text-slate-muted">Same names → Play · Constellation Connect</p>

            <Link
              href="/play#constellation"
              className="inline-flex w-full items-center justify-center rounded-full bg-lavender px-5 py-3 text-sm font-semibold text-navy transition hover:bg-lavender-soft sm:w-auto"
            >
              Play tonight&apos;s sky
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
