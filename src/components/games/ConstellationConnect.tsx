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
import type { StarPoint } from "@/content/games";
import { getTonightStars } from "@/content/tonightStars";
import { useCountry } from "@/hooks/useCountry";
import {
  buildTonightSkySession,
  type TonightPuzzle,
} from "@/lib/skyProjection";

/** Screen-level flow — picker first; Start before any star taps. */
type Screen = "pick" | "play";
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
      <ellipse cx="0" cy="3.2" rx="3.2" ry="0.7" fill="rgba(2,6,23,0.45)" />
      <ellipse cx="-0.4" cy="0" rx="2.6" ry="1.55" fill="rgba(226,232,240,0.92)" />
      <ellipse cx="2.1" cy="-0.9" rx="1.45" ry="1.2" fill="rgba(226,232,240,0.95)" />
      <path d="M1.2 -1.6 L0.9 -3.1 L2.1 -1.8 Z" fill="rgba(203,213,225,0.95)" />
      <path d="M2.5 -1.7 L3.4 -3.2 L3.5 -1.5 Z" fill="rgba(203,213,225,0.95)" />
      <circle cx="2.3" cy="-1.05" r="0.35" fill="var(--electric)" />
      <circle cx="2.95" cy="-1.05" r="0.35" fill="var(--electric)" />
      <ellipse cx="3.35" cy="-0.55" rx="0.85" ry="0.55" fill="rgba(241,245,249,0.9)" />
      <circle cx="4.05" cy="-0.5" r="0.22" fill="var(--lavender)" />
      <path
        d="M-2.8 0 Q-4.2 -1.4 -3.9 -2.6"
        stroke="rgba(226,232,240,0.9)"
        strokeWidth="0.55"
        strokeLinecap="round"
        fill="none"
        className="constellation-jump-tail"
      />
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
  const { country, hemisphere, hydrated, code } = useCountry();
  const reducedMotion = usePrefersReducedMotion();

  const session = useMemo(() => {
    if (!hydrated) return null;
    return buildTonightSkySession(code ?? country.code, hemisphere);
  }, [hydrated, code, country.code, hemisphere]);

  const puzzles = session?.puzzles ?? [];
  const [screen, setScreen] = useState<Screen>("pick");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState("Tap the stars in order. Quiet focus beats speed.");
  const [shake, setShake] = useState(false);
  const [jump, setJump] = useState<Jump | null>(null);
  const [dogPos, setDogPos] = useState<{ x: number; y: number; facing: number } | null>(null);
  /** 0 = playing board, 1 = finished night-sky picture */
  const [morph, setMorph] = useState(0);
  const jumpKey = useRef(0);

  const sky: TonightPuzzle | null = useMemo(() => {
    if (!selectedId) return null;
    return puzzles.find((p) => p.id === selectedId) ?? null;
  }, [puzzles, selectedId]);

  const tonightTip = useMemo(() => {
    if (!sky) return null;
    const entries = getTonightStars(hemisphere);
    const hit = entries.find(
      (e) =>
        e.name.toLowerCase() === sky.name.toLowerCase() ||
        sky.name.toLowerCase().includes(e.name.toLowerCase()) ||
        e.name.toLowerCase().includes(sky.name.toLowerCase().split(" ")[0] ?? ""),
    );
    return hit?.tip ?? null;
  }, [sky, hemisphere]);

  const connected = useMemo(
    () => (sky ? sky.stars.filter((s) => s.id < nextId) : []),
    [sky, nextId],
  );

  const goToPicker = useCallback(() => {
    setScreen("pick");
    setNextId(1);
    setPhase("ready");
    setShake(false);
    setJump(null);
    setDogPos(null);
    setMorph(0);
    setMessage("Pick one of tonight’s few, then Start.");
  }, []);

  const resetBoard = useCallback(() => {
    if (!sky) return;
    setNextId(1);
    setPhase("ready");
    setMessage(sky.hint);
    setShake(false);
    setJump(null);
    setDogPos(null);
    setMorph(0);
  }, [sky]);

  const startPlay = useCallback(() => {
    if (!selectedId) return;
    const p = puzzles.find((x) => x.id === selectedId);
    if (!p) return;
    setScreen("play");
    setNextId(1);
    setPhase("ready");
    setMessage(p.hint);
    setShake(false);
    setJump(null);
    setDogPos(null);
    setMorph(0);
  }, [selectedId, puzzles]);

  // Reset picker when country / session changes
  useEffect(() => {
    if (!session) return;
    setScreen("pick");
    setSelectedId(session.puzzles[0]?.id ?? null);
    setNextId(1);
    setPhase("ready");
    setJump(null);
    setDogPos(null);
    setMorph(0);
    setMessage("Pick one of tonight’s few, then Start.");
  }, [session]);

  // Finish morph: ease into night-sky picture
  useEffect(() => {
    if (phase !== "done") {
      setMorph(0);
      return;
    }
    if (reducedMotion) {
      setMorph(1);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      setMorph(ease);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion, sky?.id]);

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
    if (!sky || phase === "done" || screen !== "play") return;

    if (phase === "ready") setPhase("playing");

    if (id === nextId) {
      const toStar = sky.stars.find((s) => s.id === id)!;
      const fromStar = sky.stars.find((s) => s.id === id - 1);
      launchJump(fromStar, toStar);

      const upcoming = nextId + 1;
      if (upcoming > sky.stars.length) {
        setNextId(upcoming);
        setPhase("done");
        const tip = tonightTip ? ` ${tonightTip}` : "";
        setMessage(`${sky.fact}${tip}`);
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

  if (!hydrated || !session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-slate">Lining up tonight’s chart…</p>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-slate">No shapes ready — try another country.</p>
      </div>
    );
  }

  /* ─── Picker screen ─── */
  if (screen === "pick") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
          <p className="mt-1 text-sm text-slate">
            Tonight’s few for{" "}
            <span className="text-electric-dim">{country.name}</span>
            {session.usedFallback
              ? " — classic seasonal shapes (sky shortlist empty)."
              : " — familiar outlines, ranked from what’s up."}{" "}
            Choose one, then Start. Hosky will hop the line with you.
          </p>
          {session.usedFallback && session.fallbackReason ? (
            <p className="mt-1 font-mono text-[0.65rem] text-slate-muted">
              {session.fallbackReason}
            </p>
          ) : (
            <p className="mt-1 font-mono text-[0.65rem] text-slate-muted">
              {puzzles[0]?.observerNote} · {puzzles[0]?.whenLabel} · stylized boards
            </p>
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Tonight’s constellations">
          {puzzles.map((c) => {
            const selected = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-electric/50 bg-electric/10 ring-1 ring-electric/30"
                      : "border-white/10 bg-white/[0.03] hover:border-electric/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    {c.upTonight ? (
                      <span className="rounded-full border border-electric/30 bg-electric/10 px-2 py-0.5 text-[0.65rem] font-medium text-electric-dim">
                        up tonight
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] font-medium text-slate-muted">
                        classic
                      </span>
                    )}
                  </div>
                  {c.shapeNote ? (
                    <span className="text-xs text-slate">{c.shapeNote}</span>
                  ) : null}
                  <span className="font-mono text-[0.65rem] text-slate-muted">
                    {c.stars.length} stars
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-muted">
            {selectedId
              ? `Selected · ${puzzles.find((p) => p.id === selectedId)?.name ?? ""}`
              : "Select a constellation to unlock Start."}
          </p>
          <button
            type="button"
            disabled={!selectedId}
            onClick={startPlay}
            className="rounded-full border border-electric/40 bg-electric/15 px-5 py-2 text-sm font-semibold text-electric-dim transition hover:bg-electric/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  /* ─── Play screen ─── */
  if (!sky) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
        <p className="text-sm text-slate">Pick a constellation to begin.</p>
        <button
          type="button"
          onClick={goToPicker}
          className="mt-3 rounded-full border border-electric/40 bg-electric/15 px-4 py-1.5 text-xs font-semibold text-electric-dim"
        >
          Back to tonight’s few
        </button>
      </div>
    );
  }

  const linePoints = connected.map((s) => `${s.x},${s.y}`).join(" ");
  const closedPoints =
    sky.closeLoop && connected.length === sky.stars.length && sky.stars[0]
      ? `${linePoints} ${sky.stars[0].x},${sky.stars[0].y}`
      : linePoints;

  const fieldOpacity = 0.15 + morph * 0.55;
  const bgNight = 0.35 + morph * 0.55;
  const glowBoost = 0.12 + morph * 0.22;
  const done = phase === "done";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
          <p className="mt-1 text-sm text-slate">
            Tracing{" "}
            <span className="text-electric-dim">{sky.name}</span> — classic shape for{" "}
            {country.name}. Tap stars in order; Hosky hops along.
          </p>
          <p className="mt-1 font-mono text-[0.65rem] text-slate-muted">
            {sky.observerNote} · {sky.whenLabel} · stylized chart
          </p>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-navy-soft ${
          shake ? "ring-1 ring-lavender/40" : ""
        } ${done ? "constellation-morph-done" : ""}`}
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
            <radialGradient id={`${gid}-glow`} cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor={`rgba(62,207,255,${glowBoost})`} />
              <stop offset="55%" stopColor={`rgba(88,80,180,${morph * 0.12})`} />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
            <radialGradient id={`${gid}-night`} cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor={`rgba(15,23,42,${bgNight})`} />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
            <filter id={`${gid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={0.4 + morph * 0.6} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="100" height="100" fill={`url(#${gid}-night)`} className="pointer-events-none" />
          <rect width="100" height="100" fill={`url(#${gid}-glow)`} className="pointer-events-none" />

          <ellipse
            cx="50"
            cy="108"
            rx="70"
            ry={12 + morph * 8}
            fill={`rgba(15,23,42,${0.2 + morph * 0.45})`}
            className="pointer-events-none"
          />

          {sky.fieldStars.map((f, i) => (
            <circle
              key={`f-${i}`}
              cx={f.x}
              cy={f.y}
              r={f.r * (0.7 + morph * 0.6)}
              fill={`rgba(248,250,252,${fieldOpacity * (0.5 + (i % 3) * 0.15)})`}
              className={`pointer-events-none ${morph > 0.2 ? "animate-twinkle" : ""}`.trim()}
              style={{ animationDelay: `${(i % 9) * 0.28}s` }}
            />
          ))}

          {connected.length > 1 ? (
            <polyline
              points={done && sky.closeLoop ? closedPoints : linePoints}
              fill="none"
              stroke={`rgba(62,207,255,${0.55 + morph * 0.35})`}
              strokeWidth={0.7 + morph * 0.35}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={morph > 0.4 ? `url(#${gid}-soft)` : undefined}
              className="pointer-events-none"
            />
          ) : null}

          {sky.stars.map((star) => {
            const lit = star.id < nextId;
            const isNext = star.id === nextId && phase !== "done";
            const settle = morph * 0.35;
            const visualR = (lit || done ? 2.4 : isNext ? 2.2 : 1.8) + settle;
            const hitR = Math.max(7, visualR + (isNext ? 5 : 3.5));
            return (
              <g key={star.id}>
                {(isNext || done) && (
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={4.2 + morph * 1.2}
                    fill="none"
                    stroke={
                      done ? `rgba(212,196,253,${0.35 + morph * 0.35})` : "rgba(62,207,255,0.35)"
                    }
                    strokeWidth="0.5"
                    className={`pointer-events-none ${isNext ? "animate-pulse-glow" : ""}`.trim()}
                  />
                )}
                {!done ? (
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={hitR}
                    fill="transparent"
                    className="cursor-pointer"
                    style={{ touchAction: "manipulation" }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${star.label ?? `Star ${star.id}`}${
                      isNext ? ", next" : lit ? ", connected" : ""
                    }`}
                    onClick={() => onStar(star.id)}
                    onKeyDown={(e) => onKeyStar(e, star.id)}
                  />
                ) : null}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={visualR}
                  fill={
                    lit || done
                      ? "var(--electric)"
                      : isNext
                        ? "var(--electric-dim)"
                        : "rgba(248,250,252,0.7)"
                  }
                  filter={done ? `url(#${gid}-soft)` : undefined}
                  className="pointer-events-none"
                />
                {star.label && (isNext || lit || done) ? (
                  <text
                    x={star.x}
                    y={star.y - 5 - morph}
                    textAnchor="middle"
                    fill={`rgba(168,182,200,${0.55 + morph * 0.4})`}
                    fontSize={2.4 + morph * 0.4}
                    className="pointer-events-none select-none"
                  >
                    {star.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {dogPos && !done ? <JumpDog x={dogPos.x} y={dogPos.y} facing={dogPos.facing} /> : null}

          {done ? (
            <g opacity={0.35 + morph * 0.65} className="pointer-events-none">
              <text
                x="50"
                y="10"
                textAnchor="middle"
                fill="rgba(226,232,240,0.95)"
                fontSize="3.2"
                fontWeight="600"
              >
                {sky.name}
              </text>
              <text
                x="50"
                y="14.5"
                textAnchor="middle"
                fill="rgba(168,182,200,0.9)"
                fontSize="2.2"
              >
                tonight · {sky.whenLabel}
              </text>
            </g>
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/5 bg-navy/70 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-electric-dim">
            {done ? `Night picture · ${sky.name}` : sky.name}
          </p>
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
            ? "Night picture settled"
            : `Progress ${Math.min(nextId - 1, sky.stars.length)} / ${sky.stars.length}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToPicker}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
          >
            Change constellation
          </button>
          <button
            type="button"
            onClick={resetBoard}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
          >
            {phase === "done" ? "Trace again" : "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
