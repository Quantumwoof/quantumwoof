/**
 * Canvas rendering + particle effects for Hosky Star Form.
 * Reads engine state, never mutates it (only its own `Fx` state).
 */
import { HIT_INVULN_SEC, OBSTACLE, OBSTACLE_STARS, REMNANT, SPECTRAL, WORLD_H, WORLD_W, type SpectralId } from "@/lib/starform/config";
import { STAR_TEACH } from "@/content/starForm";
import { partsOf, type GameEvent, type Obstacle, type Remnant, type StarForm } from "@/lib/starform/engine";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; drag: number };
type Smoke = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; grow: number; rot: number; vr: number; color: string; variant: number; alpha: number };
type Floater = { x: number; y: number; text: string; color: string; life: number; big: boolean; /** smaller, educational note */ note?: boolean };
type Ring = { x: number; y: number; r: number; max: number; life: number; maxLife: number; color: string; width: number };
type Layer = { speed: number; size: number; alpha: number; pts: { x: number; y: number; tw: number; hue: number }[] };

export type Fx = {
  particles: Particle[];
  smoke: Smoke[];
  floaters: Floater[];
  rings: Ring[];
  shake: number;
  flash: number; // red hit flash 0..1
  toast: { text: string; life: number } | null;
  layers: Layer[];
  milky: HTMLCanvasElement | null;
  reduced: boolean;
  time: number;
  /** Distance "travelled" through the galaxy — drives the parallax scroll. */
  travel: number;
  /** Smoothed scroll-speed factor (1 = cruise). */
  rate: number;
  smokeAcc: number;
};

// ---------------------------------------------------------------- sprites
const TILE_W = 400;
const TILE_H = 800; // = 1600 world units; scaled 2x when drawn
const TILE_WORLD_H = 1600;

function lcg(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const puffCache = new Map<string, HTMLCanvasElement[]>();
const PUFF = 96;

/** A few billowy smoke sprites per colour: many soft overlapping blobs, no hard edges. */
function puffs(color: string): HTMLCanvasElement[] {
  const hit = puffCache.get(color);
  if (hit) return hit;
  const out: HTMLCanvasElement[] = [];
  for (let v = 0; v < 4; v++) {
    const c = document.createElement("canvas");
    c.width = c.height = PUFF;
    const x = c.getContext("2d");
    if (x) {
      const r = lcg(1000 + v * 77 + color.length * 13);
      const n = 13;
      for (let i = 0; i < n; i++) {
        const ang = r() * Math.PI * 2;
        const dist = r() * PUFF * 0.2;
        const px = PUFF / 2 + Math.cos(ang) * dist;
        const py = PUFF / 2 + Math.sin(ang) * dist;
        const rad = PUFF * (0.14 + r() * 0.17);
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        const al = 0.16 + r() * 0.18;
        g.addColorStop(0, hexA(color, al));
        g.addColorStop(0.55, hexA(color, al * 0.45));
        g.addColorStop(1, hexA(color, 0));
        x.fillStyle = g;
        x.beginPath();
        x.arc(px, py, rad, 0, Math.PI * 2);
        x.fill();
      }
    }
    out.push(c);
  }
  puffCache.set(color, out);
  return out;
}

function drawPuff(ctx: CanvasRenderingContext2D, color: string, variant: number, x: number, y: number, size: number, rot: number, alpha: number) {
  if (alpha <= 0.003) return;
  const sprite = puffs(color)[variant & 3];
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Faint Milky Way band + nebula haze + dust lanes, drawn once on a vertically seamless tile. */
function buildMilkyWay(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = TILE_W;
  c.height = TILE_H;
  const x = c.getContext("2d");
  if (!x) return null;
  const r = lcg(424242);
  const path = (y: number) => TILE_W * 0.52 + Math.sin((y / TILE_H) * Math.PI * 2) * TILE_W * 0.2;
  const wrap = (fn: (dy: number) => void) => {
    fn(-TILE_H);
    fn(0);
    fn(TILE_H);
  };
  const blob = (px: number, py: number, rad: number, col: string, al: number) => {
    wrap((dy) => {
      const g = x.createRadialGradient(px, py + dy, 0, px, py + dy, rad);
      g.addColorStop(0, hexA(col, al));
      g.addColorStop(1, hexA(col, 0));
      x.fillStyle = g;
      x.fillRect(px - rad, py + dy - rad, rad * 2, rad * 2);
    });
  };
  // band body
  for (let i = 0; i < 90; i++) {
    const y = r() * TILE_H;
    const off = (r() - 0.5) * TILE_W * 0.34;
    blob(path(y) + off, y, 70 + r() * 110, i % 3 === 0 ? "#b9a8ff" : i % 3 === 1 ? "#8fb4ff" : "#e6d2ff", 0.035 + r() * 0.045);
  }
  // warm core glints
  for (let i = 0; i < 14; i++) {
    const y = r() * TILE_H;
    blob(path(y) + (r() - 0.5) * 60, y, 50 + r() * 60, "#ffd9a0", 0.05 + r() * 0.04);
  }
  // coloured nebula haze off to the sides
  const neb = ["#d62b8a", "#2bb6d6", "#6a3bff", "#ff8a3d"];
  for (let i = 0; i < 12; i++) {
    const y = r() * TILE_H;
    const side = r() < 0.5 ? 0.12 : 0.9;
    blob(TILE_W * side + (r() - 0.5) * 90, y, 90 + r() * 90, neb[i % neb.length], 0.05 + r() * 0.05);
  }
  // dust lanes: dark blobs sliced across the band
  for (let i = 0; i < 26; i++) {
    const y = r() * TILE_H;
    blob(path(y) + (r() - 0.5) * 110, y, 22 + r() * 44, "#020617", 0.22 + r() * 0.16);
  }
  // dense tiny stars hugging the band
  for (let i = 0; i < 1100; i++) {
    const y = r() * TILE_H;
    const gx = (r() + r() + r() - 1.5) * TILE_W * 0.3;
    const px = path(y) + gx;
    const a = 0.12 + r() * 0.5;
    x.fillStyle = r() < 0.15 ? `rgba(255,224,190,${a})` : `rgba(215,228,255,${a})`;
    x.fillRect(px, y, r() < 0.1 ? 1.6 : 1, r() < 0.1 ? 1.6 : 1);
  }
  return c;
}

export function createFx(reduced: boolean): Fx {
  const r = lcg((Math.random() * 1e9) >>> 0);
  const mk = (n: number, speed: number, size: number, alpha: number): Layer => ({
    speed,
    size,
    alpha,
    pts: Array.from({ length: n }, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, tw: r() * 6.28, hue: r() })),
  });
  return {
    particles: [],
    smoke: [],
    floaters: [],
    rings: [],
    shake: 0,
    flash: 0,
    toast: null,
    layers: [mk(70, 5, 0.9, 0.38), mk(46, 13, 1.2, 0.55), mk(28, 30, 1.7, 0.75), mk(14, 68, 2.4, 0.95)],
    milky: buildMilkyWay(),
    reduced,
    time: 0,
    travel: 0,
    rate: 1,
    smokeAcc: 0,
  };
}

const MAX_PARTICLES = 650;

function burst(fx: Fx, x: number, y: number, color: string, n: number, speed: number, life: number, size = 2.4) {
  const count = fx.reduced ? Math.ceil(n / 3) : n;
  for (let i = 0; i < count && fx.particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.25 + Math.random());
    fx.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random()), color, drag: 1.6,
    });
  }
}

function toast(fx: Fx, text: string, life = 1.6) {
  fx.toast = { text, life };
}

const MAX_SMOKE = 150;

function puff(fx: Fx, x: number, y: number, color: string, size: number, speed: number, life: number, alpha = 0.5, grow = 1.8) {
  if (fx.smoke.length >= MAX_SMOKE) return;
  const a = Math.random() * Math.PI * 2;
  const sp = speed * Math.random();
  fx.smoke.push({
    x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    life, max: life, size, grow, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.2,
    color, variant: Math.floor(Math.random() * 4), alpha,
  });
}

/** Turn engine events into particles, rings and shake. */
export function applyEvents(fx: Fx, events: GameEvent[]) {
  for (const ev of events) {
    switch (ev.e) {
      case "gas":
        burst(fx, ev.x, ev.y, "#9fe8ff", 3, 70, 0.4, 1.8);
        puff(fx, ev.x, ev.y, "#9fe8ff", 34, 20, 0.5, 0.35, 0.6);
        break;
      case "jet":
        burst(fx, ev.x, ev.y, "#8fc0ff", 6, 120, 0.3, 2);
        break;
      case "paw":
        fx.floaters.push({ x: ev.x, y: ev.y - 70, text: "+1 paw 🐾", color: "#9dffb0", life: 1.9, big: false, note: false });
        burst(fx, ev.x, ev.y, "#9dffb0", 14, 150, 0.7, 2.4);
        break;
      case "kill":
        burst(fx, ev.x, ev.y, "#ff4d6d", 16, 190, 0.6, 2.6);
        burst(fx, ev.x, ev.y, "#ffd27a", 6, 110, 0.5, 2);
        fx.rings.push({ x: ev.x, y: ev.y, r: 4, max: 38, life: 0.35, maxLife: 0.35, color: "#ff7a90", width: 2 });
        puff(fx, ev.x, ev.y, "#ffb27a", 60, 40, 0.9, 0.5, 2.2);
        break;
      case "hit":
        fx.shake = Math.max(fx.shake, 14);
        fx.flash = 1;
        burst(fx, ev.x, ev.y, "#ff2d55", 30, 280, 0.8, 3.2);
        toast(fx, "Ouch — paw lost!", 1.2);
        break;
      case "detonate": {
        const c = SPECTRAL[ev.type].color;
        const g = SPECTRAL[ev.type].glow;
        const big = ev.boost >= 20;
        burst(fx, ev.x, ev.y, c, big ? 90 : 45, big ? 420 : 260, 0.9, 3);
        burst(fx, ev.x, ev.y, g, big ? 50 : 24, big ? 260 : 160, 1.1, 4);
        for (let i = 0; i < (big ? 9 : 5); i++) puff(fx, ev.x, ev.y, i % 2 ? c : g, 70 + Math.random() * 70, big ? 150 : 90, 1.4, 0.55, 2.6);
        fx.rings.push({ x: ev.x, y: ev.y, r: 10, max: ev.blast * 1.8, life: 0.7, maxLife: 0.7, color: c, width: 4 });
        fx.rings.push({ x: ev.x, y: ev.y, r: 5, max: ev.blast * 1.1, life: 0.5, maxLife: 0.5, color: "#ffffff", width: 2 });
        fx.shake = Math.max(fx.shake, big ? 12 : 5);
        fx.floaters.push({
          x: ev.x, y: ev.y - 30,
          text: `${ev.type}  boost ×${ev.boost >= 10 ? Math.round(ev.boost) : ev.boost.toFixed(1)}`,
          color: c, life: 1.5, big,
        });
        if (SPECTRAL[ev.type].kind === "none") {
          // M stars leave nothing behind — say so, briefly, where it happened.
          fx.floaters.push({ x: ev.x, y: ev.y + 14, text: `${STAR_TEACH[ev.type].name} – no remnant`, color: "#ffd2c8", life: 2.4, big: false, note: true });
        }
        break;
      }
      case "fizzle":
        toast(fx, "Too small — gather more gas first", 1.2);
        burst(fx, ev.x, ev.y, "#8aa0b8", 6, 60, 0.4, 1.6);
        break;
      case "remnantEnd": {
        burst(fx, ev.x, ev.y, SPECTRAL[ev.type].glow, 18, 130, 0.7, 2.4);
        puff(fx, ev.x, ev.y, SPECTRAL[ev.type].glow, 70, 50, 1.1, 0.4, 2);
        fx.rings.push({ x: ev.x, y: ev.y, r: 8, max: 60, life: 0.5, maxLife: 0.5, color: SPECTRAL[ev.type].glow, width: 2 });
        break;
      }
      case "warn":
      case "over":
        if (ev.e === "over") {
          fx.shake = Math.max(fx.shake, 18);
          fx.flash = 1;
        }
        break;
    }
  }
}

export function stepFx(fx: Fx, dt: number, g?: StarForm) {
  fx.time += dt;
  // The galaxy rushes past faster the harder you are boosting.
  const target = g ? Math.min(8, 1 + 1.25 * Math.log(Math.max(1, g.speedNow()))) : 1;
  fx.rate += (target - fx.rate) * Math.min(1, dt * (target > fx.rate ? 7 : 2.2));
  fx.travel += dt * fx.rate;
  fx.shake = Math.max(0, fx.shake - dt * 40);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  if (fx.toast) {
    fx.toast.life -= dt;
    if (fx.toast.life <= 0) fx.toast = null;
  }
  // trailing smoke shed by the cloud
  if (g && !g.ended) {
    fx.smokeAcc += dt * (fx.reduced ? 7 : 16);
    while (fx.smokeAcc >= 1) {
      fx.smokeAcc -= 1;
      const c = g.cloud;
      const R = g.radius();
      const tiny = g.effMass() < 1.5;
      const col = tiny ? "#7fd0ff" : SPECTRAL[g.currentType()].glow;
      puff(fx, c.x + (Math.random() - 0.5) * R, c.y + (Math.random() - 0.5) * R, col, R * (1.3 + Math.random()), 14, 0.9 + Math.random() * 0.6, 0.3, 1.5);
    }
  }
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d;
    p.vy *= d;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const sm of fx.smoke) {
    sm.life -= dt;
    sm.x += sm.vx * dt;
    sm.y += sm.vy * dt + 4 * dt; // drift with the travel
    sm.vx *= Math.max(0, 1 - 1.2 * dt);
    sm.vy *= Math.max(0, 1 - 1.2 * dt);
    sm.rot += sm.vr * dt;
    sm.size += sm.grow * 18 * dt;
  }
  fx.smoke = fx.smoke.filter((sm) => sm.life > 0);
  for (const f of fx.floaters) {
    f.life -= dt;
    if (!fx.reduced) f.y -= (f.note ? 14 : 34) * dt;
  }
  fx.floaters = fx.floaters.filter((f) => f.life > 0);
  for (const r of fx.rings) r.life -= dt;
  fx.rings = fx.rings.filter((r) => r.life > 0);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

const PLANET_COLORS = ["#5ec8ff", "#c58bff", "#ff9f6b", "#7de3a0", "#f0d29a"];
const HAZARD = "255,90,120";

function hazardRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.strokeStyle = `rgba(${HAZARD},${0.5 + 0.2 * Math.sin(t * 6)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.3);
  ctx.stroke();
}

/** A glowing star: soft halo, flickering corona rays, bright limb-darkened disc. */
function drawStarBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glowC: string, t: number, rays = 8, seed = 0) {
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, x, y, r * 3.4, glowC, 0.42);
  ctx.strokeStyle = hexA(color, 0.5);
  ctx.lineWidth = 2;
  for (let i = 0; i < rays; i++) {
    const a = (i * Math.PI * 2) / rays + t * 0.4 + seed;
    const len = r * (1.5 + 0.35 * Math.sin(t * 5 + i * 1.7 + seed));
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, color);
  g.addColorStop(1, hexA(glowC, 0.95));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.3);
  ctx.fill();
}

function drawPlanetBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, lx: number, ly: number, ring: boolean, tilt: number) {
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, x, y, r * 2.6, color, 0.3);
  ctx.globalCompositeOperation = "source-over";
  const dx = lx - x;
  const dy = ly - y;
  const d = Math.hypot(dx, dy) || 1;
  const g = ctx.createRadialGradient(x + (dx / d) * r * 0.45, y + (dy / d) * r * 0.45, 0, x, y, r * 1.15);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, color);
  g.addColorStop(1, "#10142a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.3);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = hexA("#ffe9c4", 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.9, r * 0.6, tilt, 0, 6.3);
    ctx.stroke();
  }
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, t: number) {
  // --- dart telegraph (before launch)
  if (o.kind === "dart" && o.warn > 0) {
    const blink = 0.35 + 0.35 * Math.sin(t * 24);
    ctx.save();
    ctx.setLineDash([14, 12]);
    ctx.strokeStyle = `rgba(${HAZARD},${blink})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x + Math.cos(o.heading) * 1400, o.y + Math.sin(o.heading) * 1400);
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, o.x, o.y, 40, o.style === 0 ? "#9fd0ff" : "#c58bff", 0.7);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffe0e6";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", o.x, o.y + 1);
    return;
  }

  if (o.kind === "drifter") {
    const st = OBSTACLE_STARS[o.style % OBSTACLE_STARS.length];
    // orbit lanes first, then the star, then planets on top
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = hexA(st.color, 0.16);
    ctx.lineWidth = 1;
    for (const p of o.planets) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, p.orbit, 0, 6.3);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    drawStarBody(ctx, o.x, o.y, o.r, st.color, st.glow, t, 8, o.phase);
    hazardRing(ctx, o.x, o.y, o.r * OBSTACLE.hitShare + 2, t);
    const parts = partsOf(o);
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const pl = o.planets[i - 1];
      drawPlanetBody(ctx, p.x, p.y, p.r, PLANET_COLORS[Math.floor(pl.phase * 7) % PLANET_COLORS.length], o.x, o.y, pl.ring, pl.phase);
      hazardRing(ctx, p.x, p.y, p.r * OBSTACLE.hitShare + 2, t + i);
    }
    return;
  }

  const back = o.heading + Math.PI;
  if (o.kind === "chaser") {
    // rogue star dragged toward you: gravity wake behind it, flare spikes
    const st = OBSTACLE_STARS[o.style % 3];
    ctx.globalCompositeOperation = "lighter";
    for (let i = 1; i <= 5; i++) {
      drawPuff(ctx, st.glow, i, o.x + Math.cos(back) * i * 17, o.y + Math.sin(back) * i * 17, o.r * (2.6 - i * 0.25), t + i, 0.34 - i * 0.05);
    }
    ctx.globalCompositeOperation = "source-over";
    drawStarBody(ctx, o.x, o.y, o.r, st.color, st.glow, t * 1.6, 4, o.phase);
    // gravity ripple toward the target
    ctx.strokeStyle = hexA(st.color, 0.3);
    ctx.lineWidth = 1.5;
    const k = (t * 1.4) % 1;
    ctx.beginPath();
    ctx.arc(o.x + Math.cos(o.heading) * 10, o.y + Math.sin(o.heading) * 10, o.r * (1.3 + k * 1.2), o.heading - 0.9, o.heading + 0.9);
    ctx.stroke();
    hazardRing(ctx, o.x, o.y, o.r * OBSTACLE.hitShare + 2, t);
    return;
  }

  // dart: runaway star (style 0) or rogue planet (style 1), long comet tail
  const col = o.style === 0 ? "#bfe0ff" : "#c58bff";
  const gl = o.style === 0 ? "#4f8dff" : "#8a4bff";
  const tail = ctx.createLinearGradient(o.x, o.y, o.x + Math.cos(back) * 150, o.y + Math.sin(back) * 150);
  tail.addColorStop(0, hexA(gl, 0.75));
  tail.addColorStop(1, hexA(gl, 0));
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = tail;
  ctx.lineWidth = o.r * 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(o.x + Math.cos(back) * 150, o.y + Math.sin(back) * 150);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  if (o.style === 0) {
    drawStarBody(ctx, o.x, o.y, o.r, col, gl, t * 2, 6, o.phase);
    ctx.strokeStyle = hexA("#e8f2ff", 0.6); // bow shock
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 2, o.heading - 0.8, o.heading + 0.8);
    ctx.stroke();
  } else {
    drawPlanetBody(ctx, o.x, o.y, o.r, "#a98bff", o.x + Math.cos(back) * 40, o.y + Math.sin(back) * 40, true, o.heading);
  }
  hazardRing(ctx, o.x, o.y, o.r * OBSTACLE.hitShare + 2, t);
}

function lifeArc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frac: number, color: string, alpha: number) {
  ctx.strokeStyle = hexA(color, 0.8 * alpha);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, frac));
  ctx.stroke();
}

/** Where (below the remnant's centre) its name label sits, so it clears the remnant's own art. */
function labelOffset(r: Remnant): number {
  switch (SPECTRAL[r.type].kind) {
    case "blackhole": return REMNANT.blackhole.core * 0.75 + 30;
    case "neutron": return 50;
    case "orbiter": return REMNANT.orbiter.orbit + REMNANT.orbiter.bodyRadius + 26;
    case "dwarf-clear": return 44;
    case "patroller": return 50;
    default: return 36;
  }
}

/**
 * Educational name tags that follow each remnant for its whole life. Outlined for
 * legibility on small screens, faded with the remaining life, and nudged apart so
 * stacked remnants don't print over each other. Render-only.
 */
function drawRemnantLabels(ctx: CanvasRenderingContext2D, g: StarForm, top: number, bottom: number) {
  const placed: { x: number; y: number }[] = [];
  ctx.save();
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  for (const r of g.remnants) {
    const spec = SPECTRAL[r.type];
    const frac = Math.max(0, r.life / r.maxLife);
    const a = (0.35 + 0.65 * frac) * Math.min(1, frac * 6) * (r.fade > 0 ? r.fade / REMNANT.fadeOutSec : 1);
    if (a <= 0.02) continue;
    // stay clear of the HUD (top) and the floating buttons (bottom)
    const x = Math.max(70, Math.min(g.W - 70, r.x));
    let y = Math.max(top + 30, Math.min(bottom - 10, r.y + labelOffset(r)));
    for (let i = 0; i < 4; i++) {
      if (placed.some((p) => Math.abs(p.x - x) < 150 && Math.abs(p.y - y) < 28)) y = Math.min(bottom - 10, y + 28);
    }
    placed.push({ x, y });
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(2,6,23,0.92)";
    ctx.lineWidth = 5;
    ctx.strokeText(spec.remnantName, x, y);
    ctx.fillStyle = spec.color;
    ctx.fillText(spec.remnantName, x, y);
  }
  ctx.restore();
}

function drawRemnant(ctx: CanvasRenderingContext2D, r: Remnant, g: StarForm, t: number) {
  const spec = SPECTRAL[r.type];
  const frac = r.life / r.maxLife;
  let alpha = r.fade > 0 ? r.fade / REMNANT.fadeOutSec : 1;
  if (frac < 0.2 && r.fade <= 0) alpha *= 0.55 + 0.45 * Math.sin(t * 16);
  ctx.save();
  ctx.globalAlpha = Math.max(0.05, alpha);
  switch (spec.kind) {
    case "blackhole": {
      const R = spec.radius;
      ctx.setLineDash([6, 10]);
      ctx.strokeStyle = hexA("#6fa8ff", 0.28);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, R, 0, 6.3);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const a = t * (2.6 - i * 0.4) + i * 1.6;
        const rr = REMNANT.blackhole.core + 12 + i * 14;
        ctx.strokeStyle = hexA(i % 2 ? "#a8d8ff" : "#6fa8ff", 0.55 - i * 0.1);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, a, a + 3.6);
        ctx.stroke();
      }
      glow(ctx, r.x, r.y, 90, "#3b6dff", 0.4);
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(r.x, r.y, REMNANT.blackhole.core * 0.75, 0, 6.3);
      ctx.fill();
      ctx.strokeStyle = "#cfe4ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      lifeArc(ctx, r.x, r.y, REMNANT.blackhole.core * 0.75 + 5, frac, "#a8d8ff", alpha);
      break;
    }
    case "neutron": {
      const q = REMNANT.neutron;
      ctx.setLineDash([4, 12]);
      ctx.strokeStyle = hexA("#8fd0ff", 0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, q.pullRadius, 0, 6.3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < q.beams * 2; i++) {
        const a = r.angle + (i * Math.PI) / q.beams;
        const ex = r.x + Math.cos(a) * q.beamLen;
        const ey = r.y + Math.sin(a) * q.beamLen;
        const gr = ctx.createLinearGradient(r.x, r.y, ex, ey);
        gr.addColorStop(0, "rgba(190,230,255,0.95)");
        gr.addColorStop(1, "rgba(95,180,255,0)");
        ctx.strokeStyle = gr;
        ctx.lineWidth = q.beamWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      glow(ctx, r.x, r.y, 48, "#9fd8ff", 0.8);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#f4fbff";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 9, 0, 6.3);
      ctx.fill();
      lifeArc(ctx, r.x, r.y, 20, frac, "#a8d8ff", alpha);
      break;
    }
    case "dwarf-clear": {
      const sh = r.shell;
      if (sh < 1) {
        ctx.strokeStyle = hexA("#e8eeff", 0.8 * (1 - sh));
        ctx.lineWidth = 10 * (1 - sh) + 2;
        ctx.beginPath();
        ctx.arc(r.ox, r.oy, spec.radius * sh, 0, 6.3);
        ctx.stroke();
        glow(ctx, r.ox, r.oy, spec.radius * sh * 0.9, "#b9c8ff", 0.18 * (1 - sh));
      }
      glow(ctx, r.x, r.y, REMNANT.clear.auraRadius, "#d8e2ff", 0.4);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12, 0, 6.3);
      ctx.fill();
      lifeArc(ctx, r.x, r.y, 24, frac, "#e8eeff", alpha);
      break;
    }
    case "orbiter": {
      const q = REMNANT.orbiter;
      const cx = r.x;
      const cy = r.y;
      const orbit = q.orbit;
      ctx.setLineDash([4, 10]);
      ctx.strokeStyle = hexA("#ffe27a", 0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, orbit, 0, 6.3);
      ctx.stroke();
      ctx.setLineDash([]);
      glow(ctx, cx, cy, 50, "#ffe27a", 0.5);
      ctx.fillStyle = "#fffbe0";
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, 6.3);
      ctx.fill();
      for (let i = 0; i < q.bodies; i++) {
        const a = r.angle + (i * Math.PI * 2) / q.bodies;
        const bx = cx + Math.cos(a) * orbit;
        const by = cy + Math.sin(a) * orbit;
        glow(ctx, bx, by, q.bodyRadius * 1.8, "#ffe27a", 0.55);
        ctx.fillStyle = "#fff6cc";
        ctx.beginPath();
        ctx.arc(bx, by, q.bodyRadius * 0.45, 0, 6.3);
        ctx.fill();
        ctx.strokeStyle = hexA("#ffe27a", 0.6);
        ctx.beginPath();
        ctx.arc(bx, by, q.bodyRadius, 0, 6.3);
        ctx.stroke();
      }
      lifeArc(ctx, cx, cy, orbit + q.bodyRadius + 6, frac, "#ffe27a", alpha * 0.6);
      break;
    }
    case "patroller": {
      glow(ctx, r.x, r.y, 70, "#ffb800", 0.5);
      ctx.strokeStyle = hexA("#ffd84a", 0.9);
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = r.angle + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(r.x + Math.cos(a) * 16, r.y + Math.sin(a) * 16);
        ctx.lineTo(r.x + Math.cos(a) * 30, r.y + Math.sin(a) * 30);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff3a8";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12, 0, 6.3);
      ctx.fill();
      lifeArc(ctx, r.x, r.y, 36, frac, "#ffd84a", alpha);
      break;
    }
    case "dwarf": {
      glow(ctx, r.x, r.y, REMNANT.dwarf.strike * 1.8, "#ff7a1a", 0.35);
      ctx.fillStyle = "#ffd0a0";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8, 0, 6.3);
      ctx.fill();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = hexA("#ffa24d", 0.45);
      ctx.beginPath();
      ctx.arc(r.x, r.y, REMNANT.dwarf.strike, 0, 6.3);
      ctx.stroke();
      ctx.setLineDash([]);
      lifeArc(ctx, r.x, r.y, 17, frac, "#ffa24d", alpha);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** `insetTop` / `insetBottom`: CSS px covered by floating HUD / buttons (labels and toasts avoid them). */
export type DrawOpts = { width: number; height: number; dpr: number; insetTop?: number; insetBottom?: number };

/**
 * How the W × H arena sits in a canvas of `width` × `height` CSS px: scaled to fit and centred.
 * In full-screen play the arena is reshaped to the screen (StarForm.setAspect), so this fills
 * edge to edge; only the inline (paused, on-page) view can show margins.
 */
export function fitView(width: number, height: number, W = WORLD_W, H = WORLD_H) {
  const scale = Math.max(0.01, Math.min(width / W, height / H));
  return { scale, ox: (width - W * scale) / 2, oy: (height - H * scale) / 2 };
}

export function draw(ctx: CanvasRenderingContext2D, g: StarForm, fx: Fx, o: DrawOpts, type: SpectralId, progress: number) {
  const W = g.W;
  const H = g.H;
  const view = fitView(o.width, o.height, W, H);
  const topW = Math.max(0, ((o.insetTop ?? 0) - view.oy) / view.scale);
  const botW = H - Math.max(0, ((o.insetBottom ?? 0) - view.oy) / view.scale);
  const sx = view.scale * o.dpr;
  const t = fx.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, o.width * o.dpr, o.height * o.dpr);
  const sh = fx.reduced ? 0 : fx.shake;
  const ox = view.ox * o.dpr + (sh ? (Math.random() - 0.5) * sh * o.dpr : 0);
  const oy = view.oy * o.dpr + (sh ? (Math.random() - 0.5) * sh * o.dpr : 0);
  ctx.setTransform(sx, 0, 0, sx, ox, oy);
  // visible area in world units (bigger than the arena when the screen's shape differs)
  const ex0 = -view.ox / view.scale - 20;
  const ey0 = -view.oy / view.scale - 20;
  const ex1 = W + view.ox / view.scale + 20;
  const ey1 = H + view.oy / view.scale + 20;

  // ---- deep space + Milky Way band, scrolling slowly past
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#050b22");
  bg.addColorStop(0.55, "#0a0926");
  bg.addColorStop(1, "#140926");
  ctx.fillStyle = bg;
  ctx.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
  if (fx.milky) {
    const off = (fx.travel * 9) % TILE_WORLD_H;
    ctx.globalAlpha = 0.95;
    // the band fills the whole screen; tiles repeat to cover any extra height
    for (let y = off - TILE_WORLD_H * Math.ceil((off - ey0) / TILE_WORLD_H); y < ey1; y += TILE_WORLD_H) {
      ctx.drawImage(fx.milky, ex0, y, ex1 - ex0, TILE_WORLD_H);
    }
    ctx.globalAlpha = 1;
  }
  // star copies needed to fill the screen around the arena
  const kx0 = Math.floor(ex0 / WORLD_W);
  const kx1 = Math.floor(ex1 / WORLD_W);
  const ky0 = Math.floor(ey0 / WORLD_H);
  const ky1 = Math.floor(ey1 / WORLD_H);

  // ---- parallax star layers (near ones streak with speed)
  for (let li = 0; li < fx.layers.length; li++) {
    const L = fx.layers[li];
    const off = fx.travel * L.speed;
    const streak = Math.min(220, (li + 1) * L.speed * 0.006 * (fx.rate - 1) * 3 + (li === 3 ? 7 : li === 2 ? 3 : 0));
    for (const s of L.pts) {
      const y = (s.y + off) % WORLD_H;
      const a = L.alpha * (0.6 + 0.4 * Math.sin(t * (0.8 + li * 0.5) + s.tw));
      ctx.fillStyle =
        s.hue < 0.12 ? `rgba(255,214,170,${a})` : s.hue < 0.25 ? `rgba(170,205,255,${a})` : `rgba(235,242,255,${a})`;
      for (let kx = kx0; kx <= kx1; kx++) {
        for (let ky = ky0; ky <= ky1; ky++) {
          const px = s.x + kx * WORLD_W;
          const py = y + ky * WORLD_H;
          if (px < ex0 || px > ex1 || py < ey0 - streak || py > ey1) continue;
          if (streak) ctx.fillRect(px, py - streak, L.size * 0.7, L.size + streak);
          else ctx.fillRect(px, py, L.size, L.size);
        }
      }
    }
  }

  // boost tint: the faster we go, the more the edges glow
  if (fx.rate > 1.6) {
    const k = Math.min(1, (fx.rate - 1.6) / 5);
    const R = Math.max(W, H);
    const vg = ctx.createRadialGradient(W / 2, H * 0.6, R * 0.25, W / 2, H * 0.6, R * 0.75);
    vg.addColorStop(0, "rgba(120,170,255,0)");
    vg.addColorStop(1, `rgba(120,170,255,${0.22 * k})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // inline (paused, on-page) view only: dim any space outside the arena. Full screen has none.
  if (ex0 < -24 || ey0 < -24) {
    ctx.fillStyle = "rgba(2,6,23,0.38)";
    ctx.fillRect(ex0, ey0, ex1 - ex0, -ey0);
    ctx.fillRect(ex0, H, ex1 - ex0, ey1 - H);
    ctx.fillRect(ex0, 0, -ex0, H);
    ctx.fillRect(W, 0, ex1 - W, H);
  }

  // ---- gas: soft billowing smoke wisps with fading trails
  ctx.globalCompositeOperation = "lighter";
  for (const gs of g.gas) {
    const ph = gs.id * 1.7;
    const fade = Math.min(1, gs.age / 0.8) * (gs.pulled ? 1 : Math.min(1, (22 - gs.age) / 2.5));
    const bob = 1 + 0.12 * Math.sin(t * 2.1 + ph);
    let dirx: number;
    let diry: number;
    if (gs.pulled) {
      const dx = g.cloud.x - gs.x;
      const dy = g.cloud.y - gs.y;
      const d = Math.hypot(dx, dy) || 1;
      dirx = dx / d;
      diry = dy / d;
    } else {
      const sp = Math.hypot(gs.vx, gs.vy) || 1;
      dirx = gs.vx / sp;
      diry = gs.vy / sp;
    }
    const trailStep = gs.pulled ? 15 : 7;
    for (let k = 3; k >= 1; k--) {
      drawPuff(ctx, gs.pulled ? "#bfeaff" : "#6cc8ff", gs.id + k, gs.x - dirx * trailStep * k, gs.y - diry * trailStep * k, 40 * bob * (1 - k * 0.12), t * 0.3 + ph + k, 0.26 * fade * (1 - k * 0.24));
    }
    for (let k = 0; k < 3; k++) {
      const a = t * (0.5 + k * 0.23) + ph + k * 2.1;
      const rr = 5 + k * 2;
      drawPuff(
        ctx,
        k === 1 ? "#b79bff" : "#7fd8ff",
        gs.id + k,
        gs.x + Math.cos(a) * rr,
        gs.y + Math.sin(a * 1.2) * rr,
        (60 + k * 10) * bob,
        t * (0.35 - k * 0.2) + ph,
        (gs.pulled ? 0.62 : 0.46) * fade,
      );
    }
  }
  // smoke shed by the cloud, detonations and remnants
  for (const sm of fx.smoke) {
    const k = sm.life / sm.max;
    drawPuff(ctx, sm.color, sm.variant, sm.x, sm.y, sm.size, sm.rot, sm.alpha * Math.min(1, k * 1.6) * (0.35 + 0.65 * k));
  }
  ctx.globalCompositeOperation = "source-over";

  // remnants (under the cloud)
  for (const r of g.remnants) drawRemnant(ctx, r, g, t);
  // black-hole jets
  if (g.shots.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const sh of g.shots) {
      const sp = Math.hypot(sh.vx, sh.vy) || 1;
      const len = 46;
      ctx.strokeStyle = "rgba(130,190,255,0.9)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sh.x - (sh.vx / sp) * len, sh.y - (sh.vy / sp) * len);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sh.x - (sh.vx / sp) * len * 0.5, sh.y - (sh.vy / sp) * len * 0.5);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // obstacles: stars, planets, rogue stars and runaway stars
  for (const ob of g.obstacles) drawObstacle(ctx, ob, t);

  // ---- cloud / protostar: layered smoke around a hot core
  const c = g.cloud;
  const spec = SPECTRAL[type];
  const R = g.radius() * (1 - 0.18 * c.comp);
  const tiny = g.effMass() < 1.5;
  const col = tiny ? "#8fd8ff" : spec.color;
  const gl = tiny ? "#4aa8e0" : spec.glow;
  ctx.save();
  if (c.invuln > 0 && Math.floor(t * 14) % 2 === 0 && c.invuln < HIT_INVULN_SEC + 0.1) ctx.globalAlpha = 0.55;
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = hexA(col, 0.2);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, g.catchRadius(), 0, 6.3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, c.x, c.y, R * 3, gl, 0.28 + 0.2 * c.comp);
  const n = fx.reduced ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const a = t * (0.35 + i * 0.09) * (1 + c.comp * 1.2) + i * 0.63;
    const dist = R * (0.16 + 0.2 * ((i % 3) / 2)) * (1 - 0.3 * c.comp);
    drawPuff(
      ctx,
      i % 2 ? gl : col,
      i,
      c.x + Math.cos(a) * dist,
      c.y + Math.sin(a * 1.15) * dist,
      R * (2.5 - 0.55 * c.comp) + (i % 3) * 9,
      -a * 0.6,
      0.42 + 0.14 * c.comp,
    );
  }
  glow(ctx, c.x, c.y, R * (0.5 - 0.1 * c.comp), "#ffffff", 0.6 + 0.2 * c.comp);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  // compress-on ring (tap the cloud or use the button)
  if (g.input.compress) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = "rgba(120,230,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R + 14, 0, 6.3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // shield ring (invulnerable)
  if (c.invuln > 0) {
    ctx.strokeStyle = `rgba(160,240,255,${Math.min(0.9, 0.3 + c.invuln * 0.4)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, g.radius() + 10 + Math.sin(t * 10) * 2, 0, 6.3);
    ctx.stroke();
  }
  // mass progress ring toward the next spectral class
  ctx.strokeStyle = hexA(col, 0.95);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(c.x, c.y, g.radius() + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, progress));
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(14 + R * 0.25)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!tiny) ctx.fillText(type, c.x, c.y + 1);

  // sparks and shock rings
  ctx.globalCompositeOperation = "lighter";
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = hexA(p.color, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + a), 0, 6.3);
    ctx.fill();
  }
  for (const r of fx.rings) {
    const k = 1 - r.life / r.maxLife;
    ctx.strokeStyle = hexA(r.color, 1 - k);
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + (r.max - r.r) * Math.sqrt(k), 0, 6.3);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  drawRemnantLabels(ctx, g, topW, botW);

  // floating score text
  for (const f of fx.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * (f.note ? 0.9 : 1.4));
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.big ? 34 : f.note ? 22 : 26}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(2,6,23,0.8)";
    ctx.lineWidth = 5;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // toast
  if (fx.toast) {
    ctx.globalAlpha = Math.min(1, fx.toast.life * 2);
    ctx.fillStyle = "rgba(2,6,23,0.7)";
    const ty = topW + 24;
    ctx.fillRect(W / 2 - 230, ty, 460, 46);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fx.toast.text, W / 2, ty + 24);
    ctx.globalAlpha = 1;
  }

  // hit flash
  if (fx.flash > 0 && !fx.reduced) {
    ctx.fillStyle = `rgba(255,30,70,${fx.flash * 0.28})`;
    ctx.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
  }
}
