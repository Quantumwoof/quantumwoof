"use client";

import { CountryPicker } from "@/components/CountryPicker";
import { getTonightStars, seasonLabel } from "@/content/tonightStars";
import { useCountry } from "@/hooks/useCountry";

export function SkyTonight() {
  const { country, hemisphere, hydrated } = useCountry();
  const entries = getTonightStars(hemisphere);
  const season = seasonLabel(hemisphere);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {[...Array(18)].map((_, i) => (
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
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-lavender/35 bg-lavender/[0.12] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-lavender">
            Curated · no API
          </div>
          <CountryPicker variant="chip" />
        </div>
        <h2 className="text-lg font-semibold text-white">Tonight&apos;s stars</h2>
        <p className="mt-1 text-sm text-slate">
          {hydrated ? (
            <>
              A chill shortlist for{" "}
              <span className="text-electric-dim">{country.name}</span> — {season}. Not live
              ephemeris; just popular bright markers Hosky likes to point at.
            </>
          ) : (
            <>A quiet sample chart lining up with your hemisphere…</>
          )}
        </p>
        <ul className="mt-4 space-y-2">
          {entries.map((s) => (
            <li
              key={s.name}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5"
            >
              <span className="mt-0.5 text-electric">{s.kind === "constellation" ? "✧" : "✦"}</span>
              <div>
                <p className="text-sm font-medium text-white">
                  {s.name}
                  <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-wider text-slate-muted">
                    {s.kind}
                  </span>
                </p>
                <p className="text-xs text-slate-muted">{s.tip}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
