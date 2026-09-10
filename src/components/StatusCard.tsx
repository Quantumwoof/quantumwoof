"use client";

import { useEffect, useState } from "react";

const LAGOS_TZ = "Africa/Lagos";

const moods = [
  { emoji: "🔭", label: "Skywatching", detail: "Ears up. Horizon clear enough." },
  { emoji: "📚", label: "Reading", detail: "One paper, two metaphors, zero rush." },
  { emoji: "🦴", label: "Thinking walk", detail: "Best ideas arrive between lampposts." },
  { emoji: "✨", label: "Garden tending", detail: "Polishing notes. Leaving trails." },
];

function formatLagosClock(date: Date): string {
  const base = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LAGOS_TZ,
  }).format(date);
  // Explicit WAT — avoid browser "GMT" / "GMT+1" labels
  return `${base} WAT`;
}

export function StatusCard() {
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => setNow(formatLagosClock(new Date()));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % moods.length), 8000);
    return () => clearInterval(t);
  }, []);

  const mood = moods[idx];

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric opacity-50" />
            <span className="status-dot relative inline-flex h-2.5 w-2.5 rounded-full bg-electric" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-electric">Live-ish</span>
        </div>
        <p className="text-3xl leading-none">{mood.emoji}</p>
        <h2 className="mt-3 text-lg font-semibold text-white">{mood.label}</h2>
        <p className="mt-1 text-sm text-slate">{mood.detail}</p>
      </div>
      {/* Opaque pill + z-index so decorative bg lines never strike through the clock */}
      <p className="status-clock relative z-10 mt-1 inline-flex max-w-full items-center rounded-full border border-white/10 bg-[#121c30] px-2.5 py-1 font-mono text-xs text-slate-muted">
        {now || "…"}
      </p>
    </div>
  );
}
