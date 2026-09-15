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

/** Screen-level flow — lineup → continuous play → combined night-sky finale. */
type Screen = "pick" | "play" | "finale";
type Phase = "ready" | "playing" | "done" | "between";

type Jump = {
  from: StarPoint;
  to: StarPoint;
  key: number;
};

/** Slot a stylized 0–100 chart into a shared night canvas without total overlap. */
type FinaleSlot = { ox: number; oy: number; scale: number };

function finaleSlots(n: number): FinaleSlot[] {
  if (n <= 1) return [{ ox: 18, oy: 12, scale: 0.64 }];
  if (n === 2)
    return [
      { ox: 2, oy: 18, scale: 0.46 },
      { ox: 52, oy: 18, scale: 0.46 },
    ];
  if (n === 3)
    return [
      { ox: 2, oy: 6, scale: 0.42 },
      { ox: 54, oy: 6, scale: 0.42 },
      { ox: 28, oy: 48, scale: 0.42 },
    ];
  if (n === 4)
    return [
      { ox: 2, oy: 4, scale: 0.4 },
      { ox: 52, oy: 4, scale: 0.4 },
      { ox: 2, oy: 48, scale: 0.4 },
      { ox: 52, oy: 48, scale: 0.4 },
    ];
  // 5+
  return [
    { ox: 1, oy: 2, scale: 0.32 },
    { ox: 34, oy: 2, scale: 0.32 },
    { ox: 67, oy: 2, scale: 0.32 },
    { ox: 12, oy: 48, scale: 0.34 },
    { ox: 54, oy: 48, scale: 0.34 },
  ].slice(0, n);
}

function mapStar(slot: FinaleSlot, s: StarPoint): { x: number; y: number } {
  return { x: slot.ox + s.x * slot.scale, y: slot.oy + s.y * slot.scale };
}

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
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState("Tap the stars in order. Quiet focus beats speed.");
  const [shake, setShake] = useState(false);
  const [jump, setJump] = useState<Jump | null>(null);
  const [dogPos, setDogPos] = useState<{ x: number; y: number; facing: number } | null>(null);
  /** 0 = playing board / empty finale, 1 = settled night picture */
  const [morph, setMorph] = useState(0);
  const jumpKey = useRef(0);
  const advanceTimer = useRef<number | null>(null);

  const sky: TonightPuzzle | null = useMemo(() => {
    if (puzzles.length === 0) return null;
    return puzzles[Math.min(puzzleIndex, puzzles.length - 1)] ?? null;
  }, [puzzles, puzzleIndex]);

  const progressLabel = useMemo(() => {
    if (puzzles.length === 0) return "";
    return `${Math.min(puzzleIndex + 1, puzzles.length)} of ${puzzles.length}`;
  }, [puzzleIndex, puzzles.length]);

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

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  const resetBoardState = useCallback((hint?: string) => {
    setNextId(1);
    setPhase("ready");
    setShake(false);
    setJump(null);
    setDogPos(null);
    setMorph(0);
    if (hint) setMessage(hint);
  }, []);

  const goToPicker = useCallback(() => {
    clearAdvanceTimer();
    setScreen("pick");
    setPuzzleIndex(0);
    resetBoardState("Tonight’s few are ready — Start when you are.");
  }, [clearAdvanceTimer, resetBoardState]);

  const startTonight = useCallback(() => {
    if (puzzles.length === 0) return;
    clearAdvanceTimer();
    const first = puzzles[0]!;
    setScreen("play");
    setPuzzleIndex(0);
    resetBoardState(first.hint);
  }, [puzzles, clearAdvanceTimer, resetBoardState]);

  const playAgain = useCallback(() => {
    startTonight();
  }, [startTonight]);

  // Reset when country / session changes
  useEffect(() => {
    if (!session) return;
    clearAdvanceTimer();
    setScreen("pick");
    setPuzzleIndex(0);
    resetBoardState("Tonight’s few are ready — Start when you are.");
  }, [session, clearAdvanceTimer, resetBoardState]);

  // Finale morph: ease into combined night-sky picture
  useEffect(() => {
    if (screen !== "finale") {
      if (phase !== "done") setMorph(0);
      return;
    }
    if (reducedMotion) {
      setMorph(1);
      return;
    }
    const duration = 1600;
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
  }, [screen, reducedMotion, puzzles.length]);

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

  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer]);

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

  function enterFinale() {
    clearAdvanceTimer();
    setScreen("finale");
    setPhase("done");
    setJump(null);
    setDogPos(null);
    setMorph(reducedMotion ? 1 : 0);
    setMessage("Soft howl — tonight’s sky, all together. Sit with the picture a breath.");
  }

  /** After a completed shape: next puzzle, or shared finale after the last. */
  function continueSession() {
    clearAdvanceTimer();
    const next = puzzleIndex + 1;
    if (next >= puzzles.length) {
      enterFinale();
      return;
    }
    const upcoming = puzzles[next]!;
    setPuzzleIndex(next);
    resetBoardState(upcoming.hint);
    setScreen("play");
  }

  function resetCurrent() {
    if (!sky) return;
    clearAdvanceTimer();
    resetBoardState(sky.hint);
  }

  function onStar(id: number) {
    if (!sky || screen !== "play") return;
    if (phase === "done" || phase === "between") return;

    if (phase === "ready") setPhase("playing");

    if (id === nextId) {
      const toStar = sky.stars.find((s) => s.id === id)!;
      const fromStar = sky.stars.find((s) => s.id === id - 1);
      launchJump(fromStar, toStar);

      const upcoming = nextId + 1;
      if (upcoming > sky.stars.length) {
        setNextId(upcoming);
        setPhase("between");
        const tip = tonightTip ? ` ${tonightTip}` : "";
        const isLast = puzzleIndex >= puzzles.length - 1;
        const nextName = !isLast ? puzzles[puzzleIndex + 1]?.name : null;
        setMessage(
          isLast
            ? `${sky.fact}${tip} Continue for tonight’s shared picture, or Reset to hop this shape again.`
            : `${sky.fact}${tip} Continue to ${nextName}, or Reset to redo ${sky.name}.`,
        );
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

  /* ─── Picker / lineup screen ─── */
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
            One continuous sky walk — Start and Hosky hops you through all {puzzles.length}.
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

        <div className="flex flex-wrap gap-2" aria-label="Tonight’s constellation chips">
          {puzzles.map((c) => (
            <span
              key={`chip-${c.id}`}
              className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-sm text-white"
            >
              {c.name}
            </span>
          ))}
        </div>

        <ol className="grid gap-3 sm:grid-cols-2" aria-label="Tonight’s constellation lineup">
          {puzzles.map((c, i) => (
            <li key={c.id}>
              <div className="flex w-full flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
                <div className="flex w-full flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.65rem] text-slate-muted">
                    {i + 1}/{puzzles.length}
                  </span>
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
                {c.shapeNote ? <span className="text-xs text-slate">{c.shapeNote}</span> : null}
                <span className="font-mono text-[0.65rem] text-slate-muted">
                  {c.stars.length} stars
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-muted">
            Continuous run · finish with a shared night picture of all {puzzles.length}.
          </p>
          <button
            type="button"
            onClick={startTonight}
            className="inline-flex w-full items-center justify-center rounded-full bg-lavender px-5 py-3 text-sm font-semibold text-navy transition hover:bg-lavender-soft sm:w-auto"
          >
            Start tonight&apos;s sky
          </button>
        </div>
      </div>
    );
  }

  /* ─── Finale: all tonight’s shapes on one night canvas ─── */
  if (screen === "finale") {
    const slots = finaleSlots(puzzles.length);
    const fieldOpacity = 0.2 + morph * 0.55;
    const bgNight = 0.45 + morph * 0.5;
    const glowBoost = 0.14 + morph * 0.28;

    // Shared decorative field from first puzzle + a few extras
    const field = [
      ...(puzzles[0]?.fieldStars ?? []),
      { x: 12, y: 88, r: 0.35 },
      { x: 88, y: 18, r: 0.4 },
      { x: 72, y: 92, r: 0.3 },
    ];

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
            <p className="mt-1 text-sm text-slate">
              Tonight’s sky for{" "}
              <span className="text-electric-dim">{country.name}</span> — all {puzzles.length}{" "}
              shapes together.
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-slate-muted">
              {puzzles[0]?.observerNote} · {puzzles[0]?.whenLabel} · finale
            </p>
          </div>
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-navy-soft constellation-morph-done`}
          role="img"
          aria-label={`Tonight’s night sky with ${puzzles.map((p) => p.name).join(", ")}`}
        >
          <svg viewBox="0 0 100 100" className="h-72 w-full sm:h-80" aria-hidden="true">
            <defs>
              <radialGradient id={`${gid}-fg-glow`} cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor={`rgba(62,207,255,${glowBoost})`} />
                <stop offset="55%" stopColor={`rgba(88,80,180,${morph * 0.14})`} />
                <stop offset="100%" stopColor="rgba(2,6,23,0)" />
              </radialGradient>
              <radialGradient id={`${gid}-fg-night`} cx="50%" cy="100%" r="80%">
                <stop offset="0%" stopColor={`rgba(15,23,42,${bgNight})`} />
                <stop offset="100%" stopColor="rgba(2,6,23,0)" />
              </radialGradient>
              <filter id={`${gid}-fg-soft`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={0.35 + morph * 0.55} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="100" height="100" fill={`url(#${gid}-fg-night)`} />
            <rect width="100" height="100" fill={`url(#${gid}-fg-glow)`} />
            <ellipse
              cx="50"
              cy="108"
              rx="70"
              ry={14 + morph * 6}
              fill={`rgba(15,23,42,${0.25 + morph * 0.4})`}
            />

            {field.map((f, i) => (
              <circle
                key={`ff-${i}`}
                cx={f.x}
                cy={f.y}
                r={f.r * (0.75 + morph * 0.55)}
                fill={`rgba(248,250,252,${fieldOpacity * (0.45 + (i % 3) * 0.15)})`}
                className={morph > 0.2 && !reducedMotion ? "animate-twinkle" : undefined}
                style={{ animationDelay: `${(i % 9) * 0.28}s` }}
              />
            ))}

            {puzzles.map((pz, i) => {
              const slot = slots[i] ?? slots[slots.length - 1]!;
              const reveal = Math.max(0, Math.min(1, (morph - i * 0.08) / 0.55));
              const pts = pz.stars.map((s) => {
                const m = mapStar(slot, s);
                return `${m.x},${m.y}`;
              });
              const line = pts.join(" ");
              const closed =
                pz.closeLoop && pz.stars[0]
                  ? `${line} ${mapStar(slot, pz.stars[0]).x},${mapStar(slot, pz.stars[0]).y}`
                  : line;
              const labelAt = mapStar(slot, {
                id: 0,
                x: 50,
                y: Math.min(...pz.stars.map((s) => s.y)) - 8,
              });
              const labelY = Math.max(slot.oy + 2, labelAt.y);

              return (
                <g key={pz.id} opacity={0.15 + reveal * 0.85} filter={reveal > 0.5 ? `url(#${gid}-fg-soft)` : undefined}>
                  {pz.stars.length > 1 ? (
                    <polyline
                      points={pz.closeLoop ? closed : line}
                      fill="none"
                      stroke={`rgba(62,207,255,${0.5 + reveal * 0.4})`}
                      strokeWidth={0.55 + reveal * 0.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {pz.stars.map((star) => {
                    const m = mapStar(slot, star);
                    const r = (1.4 + reveal * 0.7) * Math.max(0.85, slot.scale * 1.8);
                    return (
                      <g key={`${pz.id}-${star.id}`}>
                        <circle
                          cx={m.x}
                          cy={m.y}
                          r={r * 1.8}
                          fill="none"
                          stroke={`rgba(212,196,253,${0.15 + reveal * 0.3})`}
                          strokeWidth="0.35"
                        />
                        <circle cx={m.x} cy={m.y} r={r} fill="var(--electric)" />
                      </g>
                    );
                  })}
                  <text
                    x={slot.ox + 50 * slot.scale}
                    y={labelY}
                    textAnchor="middle"
                    fill={`rgba(226,232,240,${0.4 + reveal * 0.55})`}
                    fontSize={2.2 + slot.scale}
                    fontWeight="600"
                  >
                    {pz.name}
                  </text>
                </g>
              );
            })}

            <g opacity={0.4 + morph * 0.55}>
              <text
                x="50"
                y="96"
                textAnchor="middle"
                fill="rgba(168,182,200,0.95)"
                fontSize="2.4"
              >
                tonight · {country.name}
              </text>
            </g>
          </svg>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-medium text-electric-dim">Night picture · all together</p>
          <p className="mt-1 text-sm leading-relaxed text-lavender" aria-live="polite">
            {message}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-slate-muted">
            Finale · {puzzles.length} shapes on one sky
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
              onClick={playAgain}
              className="rounded-full border border-electric/40 bg-electric/15 px-4 py-1.5 text-xs font-semibold text-electric-dim transition hover:bg-electric/25"
            >
              Play again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Play screen (continuous) ─── */
  if (!sky) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
        <p className="text-sm text-slate">Tonight’s lineup isn’t ready.</p>
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

  const between = phase === "between";
  const doneBeat = phase === "done" || between;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Constellation connect</h2>
          <p className="mt-1 text-sm text-slate">
            Tracing{" "}
            <span className="text-electric-dim">{sky.name}</span>
            <span className="text-slate-muted"> · {progressLabel}</span> — classic shape for{" "}
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
        }`}
        role="application"
        aria-label={`${sky.name} constellation board, ${progressLabel}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-64 w-full sm:h-72"
          role="img"
          aria-labelledby={`${gid}-title`}
        >
          <title id={`${gid}-title`}>
            {sky.name} ({progressLabel})
          </title>
          <defs>
            <radialGradient id={`${gid}-glow`} cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="rgba(62,207,255,0.14)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
            <radialGradient id={`${gid}-night`} cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="rgba(15,23,42,0.45)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
          </defs>

          <rect width="100" height="100" fill={`url(#${gid}-night)`} className="pointer-events-none" />
          <rect width="100" height="100" fill={`url(#${gid}-glow)`} className="pointer-events-none" />

          <ellipse
            cx="50"
            cy="108"
            rx="70"
            ry="12"
            fill="rgba(15,23,42,0.25)"
            className="pointer-events-none"
          />

          {sky.fieldStars.map((f, i) => (
            <circle
              key={`f-${i}`}
              cx={f.x}
              cy={f.y}
              r={f.r * 0.75}
              fill={`rgba(248,250,252,${0.18 * (0.5 + (i % 3) * 0.15)})`}
              className="pointer-events-none"
            />
          ))}

          {connected.length > 1 ? (
            <polyline
              points={doneBeat && sky.closeLoop ? closedPoints : linePoints}
              fill="none"
              stroke="rgba(62,207,255,0.65)"
              strokeWidth="0.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          ) : null}

          {sky.stars.map((star) => {
            const lit = star.id < nextId;
            const isNext = star.id === nextId && !doneBeat;
            const visualR = lit || doneBeat ? 2.4 : isNext ? 2.2 : 1.8;
            const hitR = Math.max(7, visualR + (isNext ? 5 : 3.5));
            return (
              <g key={star.id}>
                {(isNext || doneBeat) && (
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={4.2}
                    fill="none"
                    stroke={doneBeat ? "rgba(212,196,253,0.4)" : "rgba(62,207,255,0.35)"}
                    strokeWidth="0.5"
                    className={`pointer-events-none ${isNext ? "animate-pulse-glow" : ""}`.trim()}
                  />
                )}
                {!doneBeat ? (
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
                    lit || doneBeat
                      ? "var(--electric)"
                      : isNext
                        ? "var(--electric-dim)"
                        : "rgba(248,250,252,0.7)"
                  }
                  className="pointer-events-none"
                />
                {star.label && (isNext || lit || doneBeat) ? (
                  <text
                    x={star.x}
                    y={star.y - 5}
                    textAnchor="middle"
                    fill="rgba(168,182,200,0.7)"
                    fontSize="2.4"
                    className="pointer-events-none select-none"
                  >
                    {star.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {dogPos && !doneBeat ? <JumpDog x={dogPos.x} y={dogPos.y} facing={dogPos.facing} /> : null}
        </svg>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-xs font-medium text-electric-dim">
          {sky.name}
          <span className="ml-2 font-mono text-slate-muted">{progressLabel}</span>
        </p>
        <p
          className={`mt-1 text-sm leading-relaxed ${
            doneBeat ? "text-lavender" : "text-slate"
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-slate-muted">
          {between
            ? puzzleIndex >= puzzles.length - 1
              ? "Shape complete · continue for night picture"
              : "Shape complete · continue or reset"
            : `Stars ${Math.min(nextId - 1, sky.stars.length)} / ${sky.stars.length} · ${progressLabel}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToPicker}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
          >
            Change constellation
          </button>
          {between ? (
            <>
              <button
                type="button"
                onClick={resetCurrent}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={continueSession}
                className="rounded-full border border-electric/40 bg-electric/15 px-4 py-1.5 text-xs font-semibold text-electric-dim transition hover:bg-electric/25"
              >
                {puzzleIndex >= puzzles.length - 1 ? "Continue to night picture" : "Continue"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={resetCurrent}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
