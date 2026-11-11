/**
 * Canvas rendering + particle effects for Hosky Star Form.
 * Reads engine state, never mutates it (only its own `Fx` state).
 */
import { REMNANT, SPECTRAL, WORLD_H, WORLD_W, type SpectralId } from "@/lib/starform/config";
import type { GameEvent, Obstacle, Remnant, StarForm } from "@/lib/starform/engine";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; drag: number };
type Floater = { x: number; y: number; text: string; color: string; life: number; big: boolean };
type Ring = { x: number; y: number; r: number; max: number; life: number; maxLife: number; color: string; width: number };

export type Fx = {
  particles: Particle[];
  floaters: Floater[];
  rings: Ring[];
  shake: number;
  flash: number; // red hit flash 0..1
  toast: { text: string; life: number } | null;
  bgStars: { x: number; y: number; r: number; tw: number; depth: number }[];
  reduced: boolean;
  time: number;
};

export function createFx(reduced: boolean): Fx {
  const bgStars = Array.from({ length: 110 }, () => ({
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    r: 0.4 + Math.random() * 1.5,
    tw: Math.random() * 6.28,
    depth: 0.2 + Math.random() * 0.8,
  }));
  return { particles: [], floaters: [], rings: [], shake: 0, flash: 0, toast: null, bgStars, reduced, time: 0 };
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

/** Turn engine events into particles, rings and shake. */
export function applyEvents(fx: Fx, events: GameEvent[]) {
  for (const ev of events) {
    switch (ev.e) {
      case "gas":
        burst(fx, ev.x, ev.y, "#9fe8ff", 3, 70, 0.4, 1.8);
        break;
      case "kill":
        burst(fx, ev.x, ev.y, "#ff4d6d", 16, 190, 0.6, 2.6);
        burst(fx, ev.x, ev.y, "#ffd27a", 6, 110, 0.5, 2);
        fx.rings.push({ x: ev.x, y: ev.y, r: 4, max: 38, life: 0.35, maxLife: 0.35, color: "#ff7a90", width: 2 });
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
        const big = ev.points >= 8;
        burst(fx, ev.x, ev.y, c, big ? 90 : 45, big ? 420 : 260, 0.9, 3);
        burst(fx, ev.x, ev.y, g, big ? 50 : 24, big ? 260 : 160, 1.1, 4);
        fx.rings.push({ x: ev.x, y: ev.y, r: 10, max: ev.blast * 1.8, life: 0.7, maxLife: 0.7, color: c, width: 4 });
        fx.rings.push({ x: ev.x, y: ev.y, r: 5, max: ev.blast * 1.1, life: 0.5, maxLife: 0.5, color: "#ffffff", width: 2 });
        fx.shake = Math.max(fx.shake, big ? 12 : 5);
        fx.floaters.push({
          x: ev.x, y: ev.y - 30,
          text: `${ev.type}  +${Number.isInteger(ev.points) ? ev.points : ev.points.toFixed(1)}${ev.mult > 1 ? `  ×${ev.mult}` : ""}`,
          color: c, life: 1.5, big,
        });
        break;
      }
      case "fizzle":
        toast(fx, "Too small — gather more gas first", 1.2);
        burst(fx, ev.x, ev.y, "#8aa0b8", 6, 60, 0.4, 1.6);
        break;
      case "remnantEnd": {
        burst(fx, ev.x, ev.y, SPECTRAL[ev.type].glow, 18, 130, 0.7, 2.4);
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

export function stepFx(fx: Fx, dt: number) {
  fx.time += dt;
  fx.shake = Math.max(0, fx.shake - dt * 40);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  if (fx.toast) {
    fx.toast.life -= dt;
    if (fx.toast.life <= 0) fx.toast = null;
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
  for (const f of fx.floaters) {
    f.life -= dt;
    f.y -= 34 * dt;
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

function spiky(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spikes: number, rot: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = rot + (i * Math.PI) / spikes;
    const rr = i % 2 === 0 ? r : r * inner;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, t: number) {
  if (o.kind === "dart" && o.warn > 0) {
    const blink = 0.35 + 0.35 * Math.sin(t * 24);
    ctx.save();
    ctx.setLineDash([14, 12]);
    ctx.strokeStyle = `rgba(255,70,100,${blink})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x + Math.cos(o.heading) * 1400, o.y + Math.sin(o.heading) * 1400);
    ctx.stroke();
    ctx.restore();
    glow(ctx, o.x, o.y, 34, "#ff3355", 0.6);
    ctx.fillStyle = "#ffe0e6";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", o.x, o.y + 1);
    return;
  }
  const rot = o.age * (o.kind === "chaser" ? 3 : 1.4) + o.phase;
  glow(ctx, o.x, o.y, o.r * 2.4, "#ff2d55", 0.35);
  if (o.kind === "dart") {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.heading);
    ctx.fillStyle = "#ff3358";
    ctx.strokeStyle = "#ffd0d8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(o.r * 1.9, 0);
    ctx.lineTo(-o.r * 0.8, o.r * 0.9);
    ctx.lineTo(-o.r * 0.2, 0);
    ctx.lineTo(-o.r * 0.8, -o.r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  const spikes = o.kind === "chaser" ? 6 : 9;
  spiky(ctx, o.x, o.y, o.r, spikes, rot, o.kind === "chaser" ? 0.5 : 0.62);
  const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
  g.addColorStop(0, o.kind === "chaser" ? "#ffb066" : "#ff6a86");
  g.addColorStop(1, "#c4122f");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#ffd0d8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (o.kind === "chaser") {
    // "eye" looks where it is heading
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(o.x + Math.cos(o.heading) * 5, o.y + Math.sin(o.heading) * 5, 4, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = "#300";
    ctx.beginPath();
    ctx.arc(o.x + Math.cos(o.heading) * 7, o.y + Math.sin(o.heading) * 7, 2, 0, 6.3);
    ctx.fill();
  }
}

function lifeArc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frac: number, color: string, alpha: number) {
  ctx.strokeStyle = hexA(color, 0.8 * alpha);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, frac));
  ctx.stroke();
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
        ctx.arc(r.x, r.y, spec.radius * sh, 0, 6.3);
        ctx.stroke();
        glow(ctx, r.x, r.y, spec.radius * sh * 0.9, "#b9c8ff", 0.18 * (1 - sh));
      }
      glow(ctx, r.x, r.y, REMNANT.clear.auraRadius, "#d8e2ff", 0.4);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 9, 0, 6.3);
      ctx.fill();
      lifeArc(ctx, r.x, r.y, 20, frac, "#e8eeff", alpha);
      break;
    }
    case "orbiter": {
      const q = REMNANT.orbiter;
      const cx = g.cloud.x;
      const cy = g.cloud.y;
      const orbit = q.orbit + g.radius() * 0.5;
      ctx.setLineDash([4, 10]);
      ctx.strokeStyle = hexA("#ffe27a", 0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, orbit, 0, 6.3);
      ctx.stroke();
      ctx.setLineDash([]);
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
      glow(ctx, r.x, r.y, spec.radius * 1.2, "#ff7a1a", 0.35);
      ctx.fillStyle = "#ffd0a0";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8, 0, 6.3);
      ctx.fill();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = hexA("#ffa24d", 0.45);
      ctx.beginPath();
      ctx.arc(r.x, r.y, spec.radius, 0, 6.3);
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

export type DrawOpts = { width: number; height: number; dpr: number };

export function draw(ctx: CanvasRenderingContext2D, g: StarForm, fx: Fx, o: DrawOpts, type: SpectralId, progress: number) {
  const sx = (o.width * o.dpr) / WORLD_W;
  const t = fx.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, o.width * o.dpr, o.height * o.dpr);
  const sh = fx.reduced ? 0 : fx.shake;
  const ox = sh ? (Math.random() - 0.5) * sh * o.dpr : 0;
  const oy = sh ? (Math.random() - 0.5) * sh * o.dpr : 0;
  ctx.setTransform(sx, 0, 0, sx, ox, oy);

  // background: deep gradient + soft nebula + twinkling stars
  const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  bg.addColorStop(0, "#07102b");
  bg.addColorStop(0.55, "#0b0a2a");
  bg.addColorStop(1, "#1a0a2a");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, WORLD_W + 40, WORLD_H + 40);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 180 + Math.sin(t * 0.15) * 30, 260, 320, "#4b2bd6", 0.16);
  glow(ctx, 640, 700 + Math.cos(t * 0.12) * 30, 340, "#d62b8a", 0.12);
  glow(ctx, 420, 980, 300, "#2bb6d6", 0.1);
  ctx.globalCompositeOperation = "source-over";
  for (const s of fx.bgStars) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + s.depth) + s.tw));
    ctx.fillStyle = `rgba(220,235,255,${a * s.depth})`;
    ctx.fillRect(s.x, (s.y + t * 6 * s.depth) % WORLD_H, s.r, s.r);
  }

  // arena frame
  ctx.strokeStyle = "rgba(148,163,184,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);

  // gas wisps
  ctx.globalCompositeOperation = "lighter";
  for (const gs of g.gas) {
    const tw = 0.7 + 0.3 * Math.sin(t * 5 + gs.id);
    glow(ctx, gs.x, gs.y, 17, gs.pulled ? "#ffffff" : "#5fd0ff", 0.55 * tw);
    ctx.fillStyle = `rgba(210,245,255,${0.9 * tw})`;
    ctx.beginPath();
    ctx.arc(gs.x, gs.y, 3.4, 0, 6.3);
    ctx.fill();
    if (gs.pulled) {
      ctx.strokeStyle = "rgba(160,230,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gs.x, gs.y);
      ctx.lineTo(g.cloud.x, g.cloud.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // remnants (under the cloud)
  for (const r of g.remnants) drawRemnant(ctx, r, g, t);

  // obstacles
  for (const ob of g.obstacles) drawObstacle(ctx, ob, t);

  // cloud / protostar
  const c = g.cloud;
  const spec = SPECTRAL[type];
  const R = g.radius() * (1 - 0.18 * c.comp);
  const tiny = g.effMass() < 1.4;
  const col = tiny ? "#9ad8ff" : spec.color;
  const gl = tiny ? "#4aa8e0" : spec.glow;
  ctx.save();
  if (c.invuln > 0 && Math.floor(t * 14) % 2 === 0 && c.invuln < 1.6) ctx.globalAlpha = 0.55;
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = hexA(col, 0.2);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, g.catchRadius(), 0, 6.3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, c.x, c.y, R * 3.2, gl, 0.35 + 0.25 * c.comp);
  for (let i = 0; i < 6; i++) {
    const a = t * (0.9 + i * 0.27) * (1 + c.comp) + i * 1.05;
    const off = R * 0.34;
    glow(ctx, c.x + Math.cos(a) * off, c.y + Math.sin(a) * off, R * 0.85, col, 0.32);
  }
  glow(ctx, c.x, c.y, R * (0.7 - 0.15 * c.comp), "#ffffff", 0.75 + 0.2 * c.comp);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
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

  // particles
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

  // floating score text
  for (const f of fx.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.4);
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.big ? 34 : 26}px system-ui, sans-serif`;
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
    ctx.fillRect(WORLD_W / 2 - 230, 60, 460, 46);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fx.toast.text, WORLD_W / 2, 84);
    ctx.globalAlpha = 1;
  }

  // hit flash
  if (fx.flash > 0 && !fx.reduced) {
    ctx.fillStyle = `rgba(255,30,70,${fx.flash * 0.28})`;
    ctx.fillRect(-20, -20, WORLD_W + 40, WORLD_H + 40);
  }
}
