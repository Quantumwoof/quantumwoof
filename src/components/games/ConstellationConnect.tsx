"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { constellations, type Constellation } from "@/content/games";

type Phase = "ready" | "playing" | "done";

export function ConstellationConnect() {
  const gid = useId();
  const [index, setIndex] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState("Tap the stars in order. Quiet focus beats speed.");
  const [shake, setShake] = useState(false);

  const sky: Constellation = constellations[index];

  const connected = useMemo(
    () => sky.stars.filter((s) => s.id < nextId),
    [sky.stars, nextId],
  );

  const reset = useCallback(
    (constellationIndex = index) => {
      setIndex(constellationIndex);
      setNextId(1);
      setPhase("ready");
      setMessage(constellations[constellationIndex].hint);
      setShake(false);
    },
    [index],
  );

  useEffect(() => {
    setMessage(sky.hint);
  }, [sky.hint]);

  function onStar(id: number) {
    if (phase === "done") return;

    if (phase === "ready") setPhase("playing");

    if (id === nextId) {
      const upcoming = nextId + 1;
      if (upcoming > sky.stars.length) {
        setNextId(upcoming);
        setPhase("done");
        setMessage(sky.fact);
      } else {
        setNextId(upcoming);
        setMessage(
          upcoming === sky.stars.length
            ? "Last star. Steady paw."
            : `Nice. ${sky.stars.length - upcoming + 1} remaining.`,
        );
      }
      return;
    }

    setShake(true);
    setMessage(
      id < nextId
        ? "Already lit. Keep the sequence."
        : "Not yet — follow the order, not the nearest glow.",
    );
    window.setTimeout(() => setShake(false), 280);
  }

  function onKeyStar(e: KeyboardEvent, id: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onStar(id);
    }
  }

  const linePoints = connected
    .map((s) => `${s.x},${s.y}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
          <p className="mt-1 text-sm text-slate">
            Connect-the-dots under a chill sky. No rush — the stars wait.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {constellations.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => reset(i)}
              aria-pressed={i === index}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                i === index
                  ? "border-electric/50 bg-electric/15 text-electric-dim"
                  : "border-white/10 bg-white/5 text-slate hover:border-electric/30 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-navy-soft ${
          shake ? "ring-1 ring-lavender/40" : ""
        }`}
        role="application"
        aria-label={`${sky.name} constellation board`}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-64 w-full sm:h-72"
          role="img"
          aria-labelledby={`${gid}-title`}
        >
          <title id={`${gid}-title`}>{sky.name}</title>
          <defs>
            <radialGradient id={`${gid}-glow`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(62,207,255,0.12)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${gid}-glow)`} />
          {/* faint background stars */}
          {[
            [8, 12],
            [90, 18],
            [12, 88],
            [94, 78],
            [55, 12],
            [40, 90],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={0.45}
              fill="rgba(248,250,252,0.35)"
              className="animate-twinkle"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}

          {connected.length > 1 ? (
            <polyline
              points={linePoints}
              fill="none"
              stroke="rgba(62,207,255,0.75)"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {sky.stars.map((star) => {
            const lit = star.id < nextId;
            const isNext = star.id === nextId && phase !== "done";
            const done = phase === "done";
            return (
              <g key={star.id}>
                {(isNext || done) && (
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={4.2}
                    fill="none"
                    stroke={done ? "rgba(212,196,253,0.45)" : "rgba(62,207,255,0.35)"}
                    strokeWidth="0.5"
                    className={isNext ? "animate-pulse-glow" : undefined}
                  />
                )}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={lit || done ? 2.4 : isNext ? 2.2 : 1.8}
                  fill={
                    lit || done
                      ? "var(--electric)"
                      : isNext
                        ? "var(--electric-dim)"
                        : "rgba(248,250,252,0.7)"
                  }
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${star.label ?? `Star ${star.id}`}${
                    isNext ? ", next" : lit ? ", connected" : ""
                  }`}
                  onClick={() => onStar(star.id)}
                  onKeyDown={(e) => onKeyStar(e, star.id)}
                />
                {star.label ? (
                  <text
                    x={star.x}
                    y={star.y - 5}
                    textAnchor="middle"
                    fill="rgba(168,182,200,0.9)"
                    fontSize="2.6"
                    className="pointer-events-none select-none"
                  >
                    {star.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/5 bg-navy/70 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-electric-dim">{sky.name}</p>
          <p
            className={`mt-1 text-sm leading-relaxed ${
              phase === "done" ? "text-lavender" : "text-slate"
            }`}
            aria-live="polite"
          >
            {message}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-slate-muted">
          {phase === "done"
            ? "Constellation complete"
            : `Progress ${Math.min(nextId - 1, sky.stars.length)} / ${sky.stars.length}`}
        </p>
        <button
          type="button"
          onClick={() => reset(index)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
        >
          {phase === "done" ? "Trace again" : "Reset"}
        </button>
      </div>
    </div>
  );
}
