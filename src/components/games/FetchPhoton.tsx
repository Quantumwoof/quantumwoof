"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { photonTips } from "@/content/games";

type Phase = "idle" | "countdown" | "running" | "ended";

const ROUND_MS = 12_000;
const PHOTON_SIZE = 28;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function FetchPhoton() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [countdown, setCountdown] = useState(3);
  const [tip] = useState(
    () => photonTips[Math.floor(Math.random() * photonTips.length)],
  );
  const [flash, setFlash] = useState(false);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const velocity = useRef({ vx: 0.08, vy: -0.06 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("qw-photon-best");
      if (stored) setBest(Number(stored) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const placePhoton = useCallback(() => {
    const el = arenaRef.current;
    if (!el) return;
    const w = el.clientWidth - PHOTON_SIZE;
    const h = el.clientHeight - PHOTON_SIZE;
    setPos({
      x: rand(8, Math.max(9, w - 8)),
      y: rand(h * 0.45, Math.max(h * 0.5, h - 8)),
    });
    const speed = rand(0.06, 0.12);
    const angle = rand((-Math.PI * 2) / 3, -Math.PI / 6);
    velocity.current = {
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed,
    };
  }, []);

  const endRound = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase("ended");
    setTimeLeft(0);
    setBest((b) => {
      const next = Math.max(b, scoreRef.current);
      try {
        localStorage.setItem("qw-photon-best", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const tick = useCallback(
    (now: number) => {
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, ROUND_MS - elapsed);
      setTimeLeft(remaining);

      const el = arenaRef.current;
      if (el) {
        const maxX = el.clientWidth - PHOTON_SIZE;
        const maxY = el.clientHeight - PHOTON_SIZE;
        setPos((p) => {
          let x = p.x + velocity.current.vx * 16;
          let y = p.y + velocity.current.vy * 16;
          if (x <= 0 || x >= maxX) {
            velocity.current.vx *= -1;
            x = Math.min(maxX, Math.max(0, x));
          }
          if (y <= 0 || y >= maxY) {
            velocity.current.vy *= -1;
            y = Math.min(maxY, Math.max(0, y));
          }
          // gentle upward bias — rising blip feel
          velocity.current.vy -= 0.0008;
          if (Math.abs(velocity.current.vy) > 0.18) {
            velocity.current.vy *= 0.92;
          }
          return { x, y };
        });
      }

      if (remaining <= 0) {
        endRound();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [endRound],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function startCountdown() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(ROUND_MS);
    setPhase("countdown");
    setCountdown(3);
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      placePhoton();
      setPhase("running");
      startRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, countdown, placePhoton, tick]);

  function catchPhoton() {
    if (phase !== "running") return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    // nudge speed up slightly after each catch
    const boost = 1.04;
    velocity.current.vx *= boost;
    velocity.current.vy *= boost;
    placePhoton();
  }

  function onArenaKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (phase === "idle" || phase === "ended") startCountdown();
      else if (phase === "running") catchPhoton();
    }
  }

  const seconds = (timeLeft / 1000).toFixed(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Fetch the photon</h2>
          <p className="mt-1 text-sm text-slate">
            Short rounds. Catch the rising blip — tasteful reflexes, not arcade noise.
          </p>
        </div>
        <div className="flex gap-4 font-mono text-xs text-slate-muted">
          <span>
            Score{" "}
            <span className="text-electric" aria-live="polite">
              {score}
            </span>
          </span>
          <span>
            Best <span className="text-lavender">{best}</span>
          </span>
          <span>
            {phase === "running" ? `${seconds}s` : phase === "ended" ? "0.0s" : "12.0s"}
          </span>
        </div>
      </div>

      <div
        ref={arenaRef}
        tabIndex={0}
        role="application"
        aria-label="Photon fetch arena. Press Enter to start or catch."
        onKeyDown={onArenaKey}
        className={`relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-navy-soft outline-none focus-visible:ring-2 focus-visible:ring-electric/50 sm:h-72 ${
          flash ? "ring-1 ring-electric/50" : ""
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(62,207,255,0.1), transparent 55%)",
          }}
        />

        {phase === "idle" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate">{tip}</p>
            <button
              type="button"
              onClick={startCountdown}
              className="rounded-full border border-electric/40 bg-electric/15 px-4 py-2 text-sm font-medium text-electric-dim transition hover:bg-electric/25"
            >
              Start round
            </button>
          </div>
        )}

        {phase === "countdown" && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-live="assertive"
          >
            <span className="text-5xl font-semibold text-electric">{countdown || "Go"}</span>
          </div>
        )}

        {phase === "running" && (
          <button
            type="button"
            aria-label="Catch photon"
            onClick={catchPhoton}
            className="absolute z-10 rounded-full transition active:scale-95"
            style={{
              left: pos.x,
              top: pos.y,
              width: PHOTON_SIZE,
              height: PHOTON_SIZE,
              background:
                "radial-gradient(circle at 35% 30%, #fff, var(--electric) 45%, rgba(62,207,255,0.2) 70%, transparent)",
              boxShadow: "0 0 18px rgba(62,207,255,0.55)",
            }}
          />
        )}

        {phase === "ended" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate">
              Round done. You gathered{" "}
              <span className="font-medium text-electric">{score}</span> photon
              {score === 1 ? "" : "s"}.
            </p>
            <p className="text-xs text-slate-muted">
              {score >= best && score > 0
                ? "Personal best — tidy work."
                : "Another run is always allowed."}
            </p>
            <button
              type="button"
              onClick={startCountdown}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-muted">
        Click or tap the photon. Keyboard: focus the arena, then Space / Enter.
      </p>
    </div>
  );
}
