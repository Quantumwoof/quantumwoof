"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/country";
import { useCountry } from "@/hooks/useCountry";

type Props = {
  /** Compact inline chip for header / sky card. */
  variant?: "modal" | "inline" | "chip";
  /** Called after a successful save (modal flow). */
  onSaved?: () => void;
  /** Force modal open (play gate). */
  open?: boolean;
  title?: string;
  blurb?: string;
};

export function CountryPicker({
  variant = "inline",
  onSaved,
  open,
  title = "Where are you watching from?",
  blurb = "Pick a country so Hosky can tilt tonight’s stars toward your hemisphere. Stored only on this device — no accounts, no API keys.",
}: Props) {
  const { code, country, setCountry, needsPrompt, hydrated } = useCountry();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(code ?? "NG");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (code) setDraft(code);
  }, [code]);

  const showModal =
    variant === "modal" &&
    hydrated &&
    (open === true || (open === undefined && needsPrompt && !dismissed));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  function save(next: string) {
    setCountry(next);
    setDraft(next);
    setDismissed(true);
    onSaved?.();
  }

  if (variant === "chip") {
    if (!hydrated) {
      return (
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] text-slate-muted">
          Sky…
        </span>
      );
    }
    return (
      <label className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[0.65rem] text-slate">
        <span className="text-slate-muted">From</span>
        <select
          aria-label="Country for sky"
          className="max-w-[9.5rem] cursor-pointer bg-transparent font-medium text-electric-dim outline-none"
          value={code ?? "NG"}
          onChange={(e) => save(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-navy-card text-white">
              {c.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-muted" htmlFor="qw-country-inline">
          Country
        </label>
        <select
          id="qw-country-inline"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white outline-none transition hover:border-electric/40 focus:border-electric/50"
          value={code ?? "NG"}
          onChange={(e) => save(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-navy-card">
              {c.name}
            </option>
          ))}
        </select>
        <span className="text-[0.65rem] text-slate-muted">
          {country.hemisphere === "south" ? "Southern sky" : "Northern sky"}
        </span>
      </div>
    );
  }

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qw-country-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-navy-card p-5 shadow-2xl sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-40 rounded-full bg-electric/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 top-8 h-20 w-28 rounded-full bg-lavender/10 blur-2xl" />
        <p className="card-label mb-2">Before play</p>
        <h2 id="qw-country-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">{blurb}</p>

        <label className="mt-4 block text-xs text-slate-muted" htmlFor="qw-country-search">
          Search
        </label>
        <input
          id="qw-country-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nigeria, Australia…"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-muted focus:border-electric/40"
        />

        <label className="mt-3 block text-xs text-slate-muted" htmlFor="qw-country-select">
          Country
        </label>
        <select
          id="qw-country-select"
          size={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-navy-soft px-2 py-2 text-sm text-white outline-none focus:border-electric/40"
        >
          {filtered.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} · {c.hemisphere === "south" ? "S" : "N"}
            </option>
          ))}
        </select>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              save("NG");
            }}
            className="rounded-full px-3 py-1.5 text-xs text-slate-muted transition hover:text-white"
          >
            Use Lagos default
          </button>
          <button
            type="button"
            onClick={() => save(draft)}
            className="rounded-full border border-electric/40 bg-electric/15 px-4 py-2 text-sm font-medium text-electric-dim transition hover:bg-electric/25"
          >
            Save & continue
          </button>
        </div>
      </div>
    </div>
  );
}
