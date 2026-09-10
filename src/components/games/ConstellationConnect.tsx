"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { constellations, type Constellation, type StarPoint } from "@/content/games";

type Phase = "ready" | "playing" | "done";

type Jump = {
  from: StarPoint;
  to: StarPoint;
  key: number;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Tiny husky silhouette for viewBox star jumps (units ≈ star coords). */
function JumpDog({ x, y, facing }: { x: number; y: number; facing: number }) {
  return (
    <g
      className="constellation-jump-dog"
      transform={`translate(${x} ${y}) scale(${facing}, 1)`}
      style={{ pointerEvents: "none" }}
    >
      {/* shadow */}
      <ellipse cx="0" cy="3.2" rx="3.2" ry="0.7" fill="rgba(2,6,23,0.45)" />
      {/* body */}
      <ellipse cx="-0.4" cy="0" rx="2.6" ry="1.55" fill="rgba(226,232,240,0.92)" />
      {/* head */}
      <ellipse cx="2.1" cy="-0.9" rx="1.45" ry="1.2" fill="rgba(226,232,240,0.95)" />
      {/* ears */}
      <path d="M1.2 -1.6 L0.9 -3.1 L2.1 -1.8 Z" fill="rgba(203,213,225,0.95)" />
      <path d="M2.5 -1.7 L3.4 -3.2 L3.5 -1.5 Z" fill="rgba(203,213,225,0.95)" />
      {/* eyes */}
      <circle cx="2.3" cy="-1.05" r="0.35" fill="var(--electric)" />
      <circle cx="2.95" cy="-1.05" r="0.35" fill="var(--electric)" />
      {/* snout */}
      <ellipse cx="3.35" cy="-0.55" rx="0.85" ry="0.55" fill="rgba(241,245,249,0.9)" />
      <circle cx="4.05" cy="-0.5" r="0.22" fill="var(--lavender)" />
      {/* tail */}
      <path
        d="M-2.8 0 Q-4.2 -1.4 -3.9 -2.6"
        stroke="rgba(226,232,240,0.9)"
        strokeWidth="0.55"
        strokeLinecap="round"
        fill="none"
        className="constellation-jump-tail"
      />
      {/* legs tucked for jump */}
      <path
        d="M-1.6 1.2 L-2.1 2.4 M0.2 1.3 L0.5 2.5 M1.2 1.1 L1.6 2.3"
        stroke="rgba(148,163,184,0.85)"
        strokeWidth="0.45"
        strokeLinecap="round"
      />
    </g>
  );
}

export function ConstellationConnect() {
  const gid = useId();
  const [index, setIndex] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState("Tap the stars in order. Quiet focus beats speed.");
  const [shake, setShake] = useState(false);
  const [jump, setJump] = useState<Jump | null>(null);
  const [dogPos, setDogPos] = useState<{ x: number; y: number; facing: number } | null>(null);
  const jumpKey = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

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
      setJump(null);
      setDogPos(null);
    },
    [index],
  );

  useEffect(() => {
    setMessage(sky.hint);
  }, [sky.hint]);

  useEffect(() => {
    if (!jump || reducedMotion) return;
    const duration = 480;
    const start = performance.now();
    const { from, to } = jump;
    const dx = to.x - from.x;
    const facing = dx >= 0 ? 1 : -1;
    let raf = 0;

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out cubic + parabolic hop
      const ease = 1 - (1 - t) ** 3;
      const x = from.x + (to.x - from.x) * ease;
      const yLinear = from.y + (to.y - from.y) * ease;
      const hop = -Math.sin(Math.PI * t) * Math.min(14, 6 + Math.hypot(dx, to.y - from.y) * 0.18);
      setDogPos({ x, y: yLinear + hop, facing });
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        setDogPos({ x: to.x, y: to.y, facing });
        setJump(null);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [jump, reducedMotion]);

  function launchJump(fromStar: StarPoint | undefined, toStar: StarPoint) {
    if (!fromStar) {
      setDogPos({ x: toStar.x, y: toStar.y, facing: 1 });
      return;
    }
    if (reducedMotion) {
      setDogPos({ x: toStar.x, y: toStar.y, facing: toStar.x >= fromStar.x ? 1 : -1 });
      return;
    }
    jumpKey.current += 1;
    setJump({ from: fromStar, to: toStar, key: jumpKey.current });
  }

  function onStar(id: number) {
    if (phase === "done") return;

    if (phase === "ready") setPhase("playing");

    if (id === nextId) {
      const toStar = sky.stars.find((s) => s.id === id)!;
      const fromStar = sky.stars.find((s) => s.id === id - 1);
      launchJump(fromStar, toStar);

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
            : `Nice hop. ${sky.stars.length - upcoming + 1} remaining.`,
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

  const linePoints = connected.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
          <p className="mt-1 text-sm text-slate">
            Connect-the-dots under a chill sky. Watch the little dog hop star to star.
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

          {dogPos ? <JumpDog x={dogPos.x} y={dogPos.y} facing={dogPos.facing} /> : null}
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
