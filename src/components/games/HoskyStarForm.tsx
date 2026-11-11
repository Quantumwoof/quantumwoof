"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { DISTANCE_TEACH, OBSTACLE_TEACH, STAR_FORM_INTRO, STAR_FORM_NOTE, STAR_FORM_TRAVEL, STAR_TEACH } from "@/content/starForm";
import {
  COMBO_STEPS,
  COMBO_WINDOW_SEC,
  DETONATE_MIN_EFF_MASS,
  LB,
  SPECTRAL,
  SPECTRAL_ORDER,
  START_LIVES,
  STEP,
  WORLD_H,
  WORLD_W,
  type SpectralId,
} from "@/lib/starform/config";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDistance } from "@/lib/starform/distance";
import { StarForm, chainMultiplier } from "@/lib/starform/engine";
import { applyEvents, createFx, draw, stepFx, type Fx } from "./starFormRender";

type Phase = "intro" | "playing" | "over";
type TopRow = { name: string; distance: number; at: string };
type Summary = ReturnType<StarForm["summary"]>;

type Hud = {
  lives: number;
  /** Light-seconds travelled (game scale). */
  distance: number;
  speed: number;
  type: SpectralId;
  progress: number;
  chain: number; // next chain multiplier shown
  chainLeft: number;
  canDet: boolean;
};

const BEST_KEY = "qw-starform-best-dist"; // light-seconds; the old points best used a different key
const NAME_KEY = "qw-starform-name";
const HELD_TAP_MS = 220;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtMul = (n: number) => (n >= 100 ? String(Math.round(n)) : n >= 10 ? n.toFixed(0) : n.toFixed(1));

function randomSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

async function fetchBoard(): Promise<{ available: boolean; top: TopRow[] }> {
  try {
    const res = await fetch("/api/starform/leaderboard", { cache: "no-store" });
    const data = (await res.json()) as { available?: boolean; top?: TopRow[] };
    return { available: Boolean(data.available), top: Array.isArray(data.top) ? data.top : [] };
  } catch {
    return { available: false, top: [] };
  }
}

const EMPTY_HUD: Hud = { lives: START_LIVES, distance: 0, speed: 1, type: "M", progress: 0, chain: 1, chainLeft: 0, canDet: false };

function Paws({ lives }: { lives: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${lives} of ${START_LIVES} Hosky paws left`}>
      {Array.from({ length: START_LIVES }, (_, i) => (
        <span key={i} className={`text-xl transition ${i < lives ? "" : "opacity-20 grayscale"}`} aria-hidden>
          🐾
        </span>
      ))}
    </span>
  );
}

function TopBoard({ top, available, highlightDistance }: { top: TopRow[]; available: boolean; highlightDistance?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="card-label mb-2 text-gold-dim">All-time top 3 · farthest</p>
      {!available ? (
        <p className="text-xs text-slate-muted">Global board is napping right now. Your best is saved on this device.</p>
      ) : top.length === 0 ? (
        <p className="text-xs text-slate-muted">No runs yet — be the first Hosky pup on the board.</p>
      ) : (
        <ol className="space-y-1">
          {top.map((r, i) => (
            <li
              key={`${r.name}-${r.at}-${i}`}
              className={`flex items-center justify-between gap-3 text-sm ${
                highlightDistance !== undefined && highlightDistance === r.distance ? "text-gold" : "text-slate"
              }`}
            >
              <span className="truncate">
                <span className="mr-2 font-mono text-slate-muted">{i + 1}.</span>
                {r.name}
              </span>
              <span className="font-mono text-white">{formatDistance(r.distance).text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function HoskyStarForm() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<StarForm | null>(null);
  const fxRef = useRef<Fx | null>(null);
  const sizeRef = useRef({ width: 400, height: 500, dpr: 1 });
  const pausedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const compressRef = useRef({ held: false, latched: false, pressAt: 0 });
  const hudKeyRef = useRef("");
  const overAtRef = useRef<number | null>(null);
  const hudAtRef = useRef(0);
  const [runId, setRunId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [compressUi, setCompressUi] = useState({ held: false, latched: false });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [top, setTop] = useState<TopRow[]>([]);
  const [boardOk, setBoardOk] = useState(true);
  const [name, setName] = useState("");
  const [post, setPost] = useState<"idle" | "sending" | "done" | "lost" | "error">("idle");
  const [postMsg, setPostMsg] = useState("");

  // ---- saved best + name, board
  const loadBoard = useCallback(() => {
    fetchBoard().then((b) => {
      setBoardOk(b.available);
      setTop(b.top);
    });
  }, []);

  // Saved best + name: loaded once after hydration (render-phase, no extra commit).
  const hydrated = useHydrated();
  const [loaded, setLoaded] = useState(false);
  if (hydrated && !loaded) {
    setLoaded(true);
    setBest(readBest());
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let alive = true;
    fetchBoard().then((b) => {
      if (!alive) return;
      setBoardOk(b.available);
      setTop(b.top);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ---- canvas size
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = wrap.clientWidth;
      const height = (width * WORLD_H) / WORLD_W;
      sizeRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const pushHud = useCallback((g: StarForm) => {
    const type = g.currentType();
    const idx = SPECTRAL_ORDER.indexOf(type);
    const eff = g.effMass();
    const cur = type === "M" ? 0 : SPECTRAL[type].minEffMass;
    const next = idx > 0 ? SPECTRAL[SPECTRAL_ORDER[idx - 1]].minEffMass : cur;
    const progress = idx === 0 ? 1 : Math.max(0, Math.min(1, (eff - cur) / (next - cur)));
    const h: Hud = {
      lives: g.lives,
      distance: g.distance,
      speed: Math.round(g.speedNow() * 10) / 10,
      type: eff < DETONATE_MIN_EFF_MASS ? "M" : type,
      progress: Math.round(progress * 20) / 20,
      chain: chainMultiplier(g.nextChainIndex()),
      chainLeft: Math.round(g.chainLeft() * 10) / 10,
      canDet: g.canDetonate(),
    };
    const now = performance.now();
    // distance ticks every frame — repaint the HUD about 12×/s, plus instantly on other changes
    const key = JSON.stringify({ ...h, distance: 0, speed: 0 });
    const fast = key !== hudKeyRef.current;
    if (fast || now - hudAtRef.current > 80) {
      hudAtRef.current = now;
      hudKeyRef.current = key;
      setHud(h);
    }
  }, []);

  const finish = useCallback(
    (g: StarForm) => {
      const s = g.summary();
      const prev = readBest();
      const isBest = s.distance > prev;
      if (isBest) {
        try {
          localStorage.setItem(BEST_KEY, String(s.distance));
        } catch {
          /* ignore */
        }
      }
      setBest(Math.max(prev, s.distance));
      setNewBest(isBest && s.detonations.length > 0);
      setSummary(s);
      setPost("idle");
      setPostMsg("");
      setPhase("over");
      loadBoard();
    },
    [loadBoard],
  );

  const detonate = useCallback(() => {
    const g = gameRef.current;
    if (g && !pausedRef.current) g.detonate();
  }, []);

  const setCompress = useCallback((held: boolean, latched: boolean) => {
    const c = compressRef.current;
    c.held = held;
    c.latched = latched;
    setCompressUi({ held, latched });
  }, []);

  const start = useCallback(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    gameRef.current = new StarForm(randomSeed());
    // Dev/test hook only (never set in production builds).
    if (process.env.NODE_ENV !== "production") (window as unknown as { __sf?: StarForm }).__sf = gameRef.current;
    fxRef.current = createFx(reduced);
    overAtRef.current = null;
    hudKeyRef.current = "";
    pausedRef.current = false;
    setPaused(false);
    setCompress(false, false);
    setHud(EMPTY_HUD);
    setSummary(null);
    setPhase("playing");
    // One-time run id lets the server confirm the run's length when posting to the board.
    setRunId(null);
    fetch("/api/starform/start", { method: "POST" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; runId?: string }) => {
        if (d.ok && typeof d.runId === "string") {
          setRunId(d.runId);
        }
      })
      .catch(() => {});
  }, [setCompress]);

  // ---- game loop
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const frame = (now: number) => {
      const g = gameRef.current;
      const fx = fxRef.current;
      if (!g || !fx) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (!pausedRef.current) {
        acc += dt;
        while (acc >= STEP) {
          acc -= STEP;
          // keyboard steering
          const k = keysRef.current;
          const dx = (k.has("ArrowRight") || k.has("d") ? 1 : 0) - (k.has("ArrowLeft") || k.has("a") ? 1 : 0);
          const dy = (k.has("ArrowDown") || k.has("s") ? 1 : 0) - (k.has("ArrowUp") || k.has("w") ? 1 : 0);
          if (dx || dy) {
            const n = Math.hypot(dx, dy);
            g.input.tx = Math.max(0, Math.min(WORLD_W, g.cloud.x + (dx / n) * 240));
            g.input.ty = Math.max(0, Math.min(WORLD_H, g.cloud.y + (dy / n) * 240));
          }
          const cr = compressRef.current;
          g.input.compress = cr.held || cr.latched;
          g.step();
          applyEvents(fx, g.drain());
          stepFx(fx, STEP, g);
          if (g.ended && overAtRef.current === null) overAtRef.current = now;
          if (g.ended) break;
        }
      }

      const type = g.currentType();
      const idx = SPECTRAL_ORDER.indexOf(type);
      const cur = type === "M" ? 0 : SPECTRAL[type].minEffMass;
      const nxt = idx > 0 ? SPECTRAL[SPECTRAL_ORDER[idx - 1]].minEffMass : cur;
      const progress = idx === 0 ? 1 : Math.max(0, Math.min(1, (g.effMass() - cur) / (nxt - cur)));
      draw(ctx, g, fx, sizeRef.current, type, progress);
      pushHud(g);

      if (g.ended && overAtRef.current !== null) {
        stepFx(fx, dt); // keep sparks flying during the short end beat
        if (now - overAtRef.current > 1100) {
          finish(g);
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, pushHud, finish]);

  // ---- keyboard + visibility
  useEffect(() => {
    if (phase !== "playing") return;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(key)) e.preventDefault();
      if (e.repeat) return;
      if (key === " ") {
        compressRef.current.pressAt = performance.now();
        setCompress(true, compressRef.current.latched);
      } else if (key === "Enter" || key === "e" || key === "Shift") {
        detonate();
      } else if (key === "p" || key === "Escape") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
      } else {
        keysRef.current.add(key);
      }
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === " ") {
        const c = compressRef.current;
        const tap = performance.now() - c.pressAt < HELD_TAP_MS;
        setCompress(false, tap ? !c.latched : false);
      } else {
        keysRef.current.delete(key);
        const g = gameRef.current;
        if (g && keysRef.current.size === 0) {
          g.input.tx = g.cloud.x;
          g.input.ty = g.cloud.y;
        }
      }
    };
    const vis = () => {
      if (document.hidden) {
        pausedRef.current = true;
        setPaused(true);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", vis);
    const keys = keysRef.current;
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", vis);
      keys.clear();
    };
  }, [phase, detonate, setCompress]);

  // ---- pointer steering on the canvas
  const pointer = useRef<{ id: number | null; x: number; y: number }>({ id: null, x: 0, y: 0 });
  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WORLD_W,
      y: ((clientY - rect.top) / rect.height) * WORLD_H,
    };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || phase !== "playing") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (e.pointerType === "mouse") {
      const w = toWorld(e.clientX, e.clientY);
      g.input.tx = w.x;
      g.input.ty = w.y;
      compressRef.current.pressAt = performance.now();
      setCompress(true, compressRef.current.latched);
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || phase !== "playing" || pausedRef.current) return;
    if (e.pointerType === "mouse") {
      const w = toWorld(e.clientX, e.clientY);
      g.input.tx = w.x;
      g.input.ty = w.y;
      return;
    }
    if (pointer.current.id !== e.pointerId) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const k = WORLD_W / rect.width;
    g.input.tx = Math.max(0, Math.min(WORLD_W, g.input.tx + (e.clientX - pointer.current.x) * k * 1.15));
    g.input.ty = Math.max(0, Math.min(WORLD_H, g.input.ty + (e.clientY - pointer.current.y) * k * 1.15));
    pointer.current.x = e.clientX;
    pointer.current.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current.id === e.pointerId) pointer.current.id = null;
    if (e.pointerType === "mouse") {
      const c = compressRef.current;
      const tap = performance.now() - c.pressAt < HELD_TAP_MS;
      setCompress(false, tap ? !c.latched : false);
    }
    const g = gameRef.current;
    if (g && e.pointerType !== "mouse") {
      g.input.tx = Math.min(WORLD_W, Math.max(0, g.input.tx));
    }
  };

  // ---- compress button: hold, or tap to latch
  const onCompressDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    compressRef.current.pressAt = performance.now();
    setCompress(true, compressRef.current.latched);
  };
  const onCompressUp = () => {
    const c = compressRef.current;
    if (!c.held) return;
    const tap = performance.now() - c.pressAt < HELD_TAP_MS;
    setCompress(false, tap ? !c.latched : false);
  };

  // ---- top 3 submit
  const qualifies =
    summary !== null &&
    summary.detonations.length > 0 &&
    boardOk &&
    runId !== null &&
    (top.length < LB.top || summary.distance > (top[top.length - 1]?.distance ?? 0));

  const submitScore = async (e: FormEvent) => {
    e.preventDefault();
    if (!summary || post === "sending" || post === "done") return;
    const clean = name.trim();
    if (!clean) return;
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    setPost("sending");
    try {
      const res = await fetch("/api/starform/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: clean,
          runId,
          steps: summary.steps,
          detonations: summary.detonations,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; placed?: boolean; top?: TopRow[]; message?: string };
      setRunId(null); // the run id is single use
      if (!res.ok || !data.ok) {
        setPost("error");
        setPostMsg(data.message ?? "Could not post that run.");
        return;
      }
      if (Array.isArray(data.top)) setTop(data.top);
      if (data.placed) {
        setPost("done");
        setPostMsg("You're on the all-time board!");
      } else {
        setPost("lost");
        setPostMsg("Someone just went farther — the board stayed as it was.");
      }
    } catch {
      setPost("error");
      setPostMsg("Could not reach the board — try again.");
    }
  };

  const typeSpec = SPECTRAL[hud.type];
  const compressOn = compressUi.held || compressUi.latched;
  const topType = summary
    ? SPECTRAL_ORDER.find((k) => summary.counts[k] > 0)
    : undefined;

  return (
    <div className="mx-auto w-full select-none" style={{ maxWidth: "min(520px, max(280px, calc((100dvh - 330px) * 0.8)))" }}>
      {/* HUD */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Paws lives={phase === "playing" ? hud.lives : START_LIVES} />
        <div className="min-w-0 text-center">
          <p className="card-label leading-none">Distance</p>
          <p className="font-mono text-xl font-semibold leading-tight text-white sm:text-2xl" data-testid="sf-distance">
            {formatDistance(hud.distance).value}{" "}
            <span className="text-xs font-medium text-electric-dim">{formatDistance(hud.distance).unit}</span>
          </p>
          <p className="font-mono text-[0.7rem] leading-none text-slate-muted" data-testid="sf-speed">
            speed <span className={hud.speed > 1.5 ? "text-electric" : ""}>×{fmtMul(hud.speed)}</span>
          </p>
        </div>
        <div className="w-20 text-right">
          <p className="card-label leading-none">Chain</p>
          <p className="font-mono text-lg font-semibold leading-tight text-gold">×{hud.chain}</p>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full bg-gold transition-[width]" style={{ width: `${hud.chainLeft * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Playfield */}
      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-navy shadow-[0_0_40px_rgba(62,120,255,0.18)]" style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}>
        <canvas
          ref={canvasRef}
          data-testid="sf-canvas"
          role="img"
          aria-label="Hosky Star Form play area: steer a gas cloud, collect gas, avoid red spiky obstacles"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {phase === "intro" && (
          <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto bg-navy/85 p-4 backdrop-blur-sm">
            <div>
              <p className="card-label text-lavender">New game</p>
              <h2 className="text-2xl font-semibold text-white">Hosky Star Form</h2>
              <p className="mt-1 text-sm text-slate">
                Collapse smoky gas clouds into stars and ride the boost as far as you can. Bigger stars launch you faster and leave stronger remnants — but the other stars will not make way.
              </p>
            </div>
            <ul className="space-y-1.5 text-sm text-slate">
              <li>You cruise through the Milky Way and <span className="text-electric">distance</span> is your score. It rolls up from light-seconds to light-years (a <em>game scale</em>, not real physics).</li>
              <li><span className="text-electric">Drag</span> to steer your gas cloud and swallow the smoke wisps. Gas is always safe. <span className="text-electric">Hold</span> COMPRESS (or tap to toggle) to pack mass in — a loose cloud slowly leaks it, and a bigger cloud needs more gas to grow.</li>
              <li><span className="text-gold">DETONATE</span> to make a star: it gives a <span className="text-gold">speed boost</span> that fades over a few seconds — bigger stars boost far more — and leaves a remnant that destroys hazards. An <span className="text-gold">O star</span>&rsquo;s black hole follows you, a little behind, and swallows hazards near it &mdash; it never pulls in you or your gas.</li>
              <li>Chain detonations within {COMBO_WINDOW_SEC}s to scale the boost up to ×{COMBO_STEPS[COMBO_STEPS.length - 1]}. Small stars (M, K, G) also grant a short shield.</li>
              <li><span className="text-rose-300">Red-ringed</span> stars, their planets, rogue stars and runaway stars cost a Hosky paw 🐾. Lose all {START_LIVES} and the run ends — survive, boost, go farthest.</li>
            </ul>
            <TopBoard top={top} available={boardOk} />
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex items-center justify-between gap-3 bg-navy px-4 py-3">
              <p className="text-xs text-slate-muted">Your best: <span className="font-mono text-white">{best}</span></p>
              <button type="button" onClick={start} data-testid="sf-start" className="rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-navy transition hover:bg-white">
                Start
              </button>
            </div>
            <p className="hidden text-[0.7rem] text-slate-muted sm:block">Desktop: mouse moves, click-hold compresses · arrows/WASD · Space compress · Enter detonate · P pause.</p>
          </div>
        )}

        {phase === "playing" && paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy/80 backdrop-blur-sm">
            <p className="text-xl font-semibold text-white">Paused</p>
            <button
              type="button"
              onClick={() => {
                pausedRef.current = false;
                setPaused(false);
              }}
              className="rounded-full bg-electric px-6 py-2 text-sm font-semibold text-navy"
            >
              Resume
            </button>
          </div>
        )}

        {phase === "over" && summary && (
          <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto bg-navy/90 p-4 backdrop-blur-sm" data-testid="sf-over">
            <div className="flex items-end justify-between gap-3">
              <div className="shrink-0">
                <p className="card-label text-lavender">Run over</p>
                <p className="font-mono text-3xl font-semibold leading-tight text-white" data-testid="sf-final">
                  {formatDistance(summary.distance).value}
                  <span className="ml-1.5 whitespace-nowrap text-sm font-medium text-electric-dim">{formatDistance(summary.distance).unit}</span>
                </p>
              </div>
              <p className="min-w-0 shrink pb-1 text-right text-xs text-slate-muted">
                {newBest ? <span className="text-gold">New personal best!</span> : <>Best: <span className="font-mono text-white">{formatDistance(best).text}</span></>}
                <br />
                {Math.round(summary.durationSec)}s · {summary.detonations.length} stars made · {summary.kills} hazards destroyed
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="card-label mb-2">Stars made</p>
              {summary.detonations.length === 0 ? (
                <p className="text-xs text-slate-muted">No stars made — cruise speed only. Detonate a star for a speed boost next time.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {SPECTRAL_ORDER.filter((k) => summary.counts[k] > 0).map((k) => (
                      <tr key={k} className="text-slate">
                        <td className="py-0.5">
                          <span className="font-mono font-semibold" style={{ color: SPECTRAL[k].color }}>{k}</span>{" "}
                          <span className="text-slate-muted">{STAR_TEACH[k].name}</span>
                        </td>
                        <td className="py-0.5 text-right font-mono text-white">× {summary.counts[k]}</td>
                        <td className="py-0.5 text-right font-mono text-gold">boost ×{fmt(SPECTRAL[k].boost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {summary.bestChain > 1 && (
                <p className="mt-1 text-xs text-slate-muted">Best chain: ×{chainMultiplier(summary.bestChain - 1)} (scales the boost)</p>
              )}
            </div>

            {topType && (
              <p className="rounded-xl border border-lavender/20 bg-lavender/[0.06] p-3 text-xs leading-relaxed text-slate">
                <span className="font-semibold text-lavender">{topType} — {STAR_TEACH[topType].name}.</span>{" "}
                {STAR_TEACH[topType].fact} {STAR_TEACH[topType].remnant}
              </p>
            )}

            <TopBoard top={top} available={boardOk} highlightDistance={post === "done" ? summary.distance : undefined} />

            {qualifies && post !== "done" && post !== "lost" && (
              <form onSubmit={submitScore} className="rounded-xl border border-gold/40 bg-gold/[0.06] p-3" data-testid="sf-name-form">
                <p className="text-sm font-semibold text-gold">That run makes the all-time top 3!</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/[^\p{L}\p{N} _.\-]/gu, "").slice(0, LB.nameMax))}
                    maxLength={LB.nameMax}
                    placeholder="Display name"
                    aria-label="Display name for the top 3 board"
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    disabled={post === "sending" || !name.trim()}
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50"
                  >
                    {post === "sending" ? "Posting…" : "Post"}
                  </button>
                </div>
                <p className="mt-1 text-[0.7rem] text-slate-muted">Up to {LB.nameMax} letters/numbers. Shown publicly.</p>
                {post === "error" && <p className="mt-1 text-xs text-red-300">{postMsg}</p>}
              </form>
            )}
            {(post === "done" || post === "lost") && (
              <p className={`text-sm ${post === "done" ? "text-gold" : "text-slate"}`}>{postMsg}</p>
            )}

            <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex justify-end bg-navy px-4 py-3">
              <button type="button" onClick={start} data-testid="sf-again" className="rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-navy transition hover:bg-white">
                Play again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Current star readout */}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs" aria-live="off">
        <p className="text-slate-muted">
          Growing: <span className="font-mono font-semibold" style={{ color: typeSpec.color }}>{phase === "playing" ? hud.type : "–"}</span>
          {phase === "playing" && (
            <span> · {STAR_TEACH[hud.type].name} · boost ×{fmt(typeSpec.boost)} · {typeSpec.remnantName}</span>
          )}
        </p>
        {phase === "playing" && (
          <button type="button" onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }} className="rounded-full border border-white/15 px-3 py-1 text-slate hover:text-white">
            {paused ? "Resume" : "Pause"}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="mt-2 grid grid-cols-[1fr_1.5fr] gap-3">
        <button
          type="button"
          data-testid="sf-compress"
          disabled={phase !== "playing"}
          aria-pressed={compressOn}
          onPointerDown={onCompressDown}
          onPointerUp={onCompressUp}
          onPointerCancel={onCompressUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-none rounded-2xl border px-3 py-5 text-sm font-bold uppercase tracking-wide transition disabled:opacity-40 ${
            compressOn
              ? "border-electric bg-electric/25 text-electric shadow-[0_0_24px_rgba(62,207,255,0.35)]"
              : "border-white/20 bg-white/[0.05] text-slate"
          }`}
        >
          Compress
          <span className="mt-0.5 block text-[0.65rem] font-medium normal-case tracking-normal text-slate-muted">
            {compressUi.latched ? "on — tap to release" : "hold · or tap to toggle"}
          </span>
        </button>
        <button
          type="button"
          data-testid="sf-detonate"
          disabled={phase !== "playing"}
          onPointerDown={(e) => {
            e.preventDefault();
            detonate();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={`touch-none rounded-2xl border-2 px-3 py-5 text-lg font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-40 ${
            hud.canDet
              ? "border-gold bg-gold/25 text-gold shadow-[0_0_28px_rgba(245,197,66,0.4)]"
              : "border-white/20 bg-white/[0.05] text-slate"
          }`}
        >
          Detonate
          <span className="mt-0.5 block text-[0.65rem] font-medium normal-case tracking-normal text-slate-muted">
            {hud.canDet ? `make ${hud.type} · boost ×${fmt(typeSpec.boost * hud.chain)}` : "gather more gas"}
          </span>
        </button>
      </div>

      {/* Star guide */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby="star-guide">
        <h2 id="star-guide" className="text-base font-semibold text-white">How stars form — and what they leave behind</h2>
        {STAR_FORM_INTRO.map((p) => (
          <p key={p} className="mt-2 text-sm leading-relaxed text-slate">{p}</p>
        ))}
        <ul className="mt-3 space-y-2">
          {SPECTRAL_ORDER.map((k) => (
            <li key={k} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-slate">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-md px-2 py-0.5 font-mono text-sm font-bold text-navy" style={{ background: SPECTRAL[k].color }}>{k}</span>
                <span className="font-semibold text-white">{STAR_TEACH[k].name}</span>
                <span className="text-slate-muted">boost ×{fmt(SPECTRAL[k].boost)} · in game: {SPECTRAL[k].remnantName}</span>
              </p>
              <p className="mt-1">{STAR_TEACH[k].fact}</p>
              <p className="mt-0.5 text-slate-muted">{STAR_TEACH[k].remnant}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-muted">{STAR_FORM_NOTE}</p>

        <h3 className="mt-5 text-sm font-semibold text-white">Light units: how far is far?</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate">{DISTANCE_TEACH.intro}</p>
        <ul className="mt-2 space-y-1.5">
          {DISTANCE_TEACH.units.map((u) => (
            <li key={u.unit} className="rounded-xl border border-electric/15 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate">
              <span className="font-semibold text-white">{u.unit}</span> — {u.fact}
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-semibold text-white">What you are flying through</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate">{STAR_FORM_TRAVEL}</p>
        <ul className="mt-2 space-y-2">
          {OBSTACLE_TEACH.map((o) => (
            <li key={o.name} className="rounded-xl border border-rose-300/20 bg-black/20 p-3 text-xs leading-relaxed text-slate">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{o.name}</span>
                <span className="text-slate-muted">in game: {o.game}</span>
              </p>
              <p className="mt-1">{o.fact}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
