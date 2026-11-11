/**
 * Hosky Star Form — pure, deterministic game engine (no DOM, no React).
 * Advance with `step()` at the fixed STEP; the UI only renders state + events.
 *
 * Fairness note: obstacle and gas *spawn schedules* depend only on the seed and
 * on elapsed sim time, never on what the player does, so one seed = one pattern.
 */
import { DistanceTracker } from "./distance";
import {
  BLAST,
  CLOUD,
  COMBO_STEPS,
  COMBO_WINDOW_SEC,
  DETONATE_COOLDOWN_SEC,
  DETONATE_MIN_EFF_MASS,
  GAS,
  HIT_INVULN_SEC,
  HIT_MASS_KEEP,
  MAX_REMNANTS,
  NEW_CLOUD_GRACE_SEC,
  OBSTACLE,
  OBSTACLE_STARS,
  REMNANT,
  SPECTRAL,
  SPECTRAL_ORDER,
  START_LIVES,
  STEP,
  WORLD_H,
  WORLD_W,
  type ObstacleKind,
  type SpectralId,
} from "./config";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Input = { tx: number; ty: number; compress: boolean };

export type Cloud = { x: number; y: number; mass: number; comp: number; invuln: number };
export type Gas = { id: number; x: number; y: number; vx: number; vy: number; age: number; pulled: boolean };
export type Planet = { orbit: number; r: number; phase: number; speed: number; ring: boolean };
/** One circle of an obstacle that can hurt (star body or planet). */
export type HitPart = { x: number; y: number; r: number; planet: boolean };
export type Obstacle = {
  id: number;
  kind: ObstacleKind;
  /** Palette: index into OBSTACLE_STARS (drifter/chaser/runaway star) or rogue-planet look for darts. */
  style: number;
  /** Drifters: orbiting planets (they hit too). */
  planets: Planet[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  /** darts: seconds of telegraph left before launch. */
  warn: number;
  heading: number;
  phase: number;
};
export type Remnant = {
  id: number;
  type: SpectralId;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  age: number;
  angle: number;
  /** >0 while being evicted by the remnant cap. */
  fade: number;
  /** A-star shell animation 0..1. */
  shell: number;
};

export type Detonation = { k: SpectralId; m: number; t: number; /** engine step count at detonation */ s: number };

export type GameEvent =
  | { e: "gas"; x: number; y: number }
  | { e: "kill"; x: number; y: number; by: SpectralId | "blast" }
  | { e: "hit"; x: number; y: number }
  | { e: "detonate"; x: number; y: number; type: SpectralId; boost: number; mult: number; blast: number }
  | { e: "fizzle"; x: number; y: number }
  | { e: "remnantEnd"; x: number; y: number; type: SpectralId }
  | { e: "warn"; x: number; y: number }
  | { e: "over" };

export function classify(effMass: number): SpectralId {
  for (const id of SPECTRAL_ORDER) if (effMass >= SPECTRAL[id].minEffMass) return id;
  return "M";
}

export function chainMultiplier(idx: number): number {
  return COMBO_STEPS[Math.max(0, Math.min(COMBO_STEPS.length - 1, idx))];
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const l2 = abx * abx + aby * aby || 1;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / l2, 0, 1);
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

/** All hurtful circles of an obstacle at its current age. */
export function partsOf(o: Obstacle): HitPart[] {
  const parts: HitPart[] = [{ x: o.x, y: o.y, r: o.r, planet: false }];
  for (const p of o.planets) {
    const a = p.phase + o.age * p.speed;
    parts.push({ x: o.x + Math.cos(a) * p.orbit, y: o.y + Math.sin(a) * p.orbit, r: p.r, planet: true });
  }
  return parts;
}

/** True if any part of the obstacle satisfies `test(part)`. */
function anyPart(o: Obstacle, test: (p: HitPart) => boolean): boolean {
  for (const p of partsOf(o)) if (test(p)) return true;
  return false;
}

export class StarForm {
  readonly seed: number;
  t = 0;
  lives = START_LIVES;
  steps = 0;
  tracker = new DistanceTracker();
  ended = false;
  cloud: Cloud = { x: WORLD_W / 2, y: WORLD_H * 0.62, mass: 0, comp: 0, invuln: NEW_CLOUD_GRACE_SEC };
  gas: Gas[] = [];
  obstacles: Obstacle[] = [];
  remnants: Remnant[] = [];
  detonations: Detonation[] = [];
  events: GameEvent[] = [];
  input: Input = { tx: WORLD_W / 2, ty: WORLD_H * 0.62, compress: false };
  chain = -1; // chain index of the last detonation (−1 = none)
  lastDetT = -Infinity;
  detCooldown = 0;
  kills = 0;
  lastLost = 0;

  private rngSpawn: Rng;
  private rngGas: Rng;
  private nextObstacleAt = 1.8;
  private nextGasAt = 0;
  private nid = 1;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.rngSpawn = mulberry32(this.seed ^ 0x9e3779b9);
    this.rngGas = mulberry32(this.seed ^ 0x85ebca6b);
    this.input.tx = this.cloud.x;
    this.input.ty = this.cloud.y;
    for (let i = 0; i < GAS.startOnField; i++) this.spawnGas(true);
  }

  // ------------------------------------------------------------ derived
  /** Distance travelled so far, in game-scale light-seconds. */
  get distance() {
    return this.tracker.dist;
  }
  /** Current speed as a multiple of cruise. */
  speedNow() {
    return this.tracker.speedMul();
  }
  radius(c: Cloud = this.cloud) {
    return CLOUD.baseRadius + CLOUD.radiusPerSqrtMass * Math.sqrt(c.mass);
  }
  hitRadius() {
    return this.radius() * (1 - CLOUD.compressHitboxShrink * this.cloud.comp);
  }
  catchRadius() {
    return (
      this.radius() * CLOUD.catchMul * (1 - CLOUD.compressCatchShrink * this.cloud.comp) + CLOUD.catchPad
    );
  }
  effMass() {
    return this.cloud.mass * (1 + CLOUD.compressMassBoost * this.cloud.comp);
  }
  currentType(): SpectralId {
    return classify(this.effMass());
  }
  canDetonate() {
    return !this.ended && this.detCooldown <= 0 && this.effMass() >= DETONATE_MIN_EFF_MASS;
  }
  /** 0..1 progress of the live chain window (for the HUD). */
  chainLeft() {
    if (this.chain < 0) return 0;
    return clamp(1 - (this.t - this.lastDetT) / COMBO_WINDOW_SEC, 0, 1);
  }
  nextChainIndex() {
    return this.chain >= 0 && this.t - this.lastDetT <= COMBO_WINDOW_SEC
      ? Math.min(this.chain + 1, COMBO_STEPS.length - 1)
      : 0;
  }
  speedMul() {
    return lerp(1, OBSTACLE.speedMul.maxMul, clamp(this.t / OBSTACLE.speedMul.rampSec, 0, 1));
  }

  // ------------------------------------------------------------ spawns
  private spawnGas(initial = false) {
    const r = this.rngGas;
    const x = 40 + r() * (WORLD_W - 80);
    const y = 60 + r() * (WORLD_H - 160);
    const a = r() * Math.PI * 2;
    const sp = GAS.drift * (0.4 + r());
    if (this.gas.length >= GAS.maxOnField) return;
    this.gas.push({ id: this.nid++, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: initial ? r() * 4 : 0, pulled: false });
  }

  private spawnObstacle() {
    const r = this.rngSpawn;
    const t = this.t;
    // Always draw the same number of values, whatever the outcome.
    const pickKind = r();
    const edge = Math.floor(r() * 4);
    const along = r();
    const aimX = WORLD_W * (0.2 + 0.6 * r());
    const aimY = WORLD_H * (0.25 + 0.5 * r());
    const speedJit = 0.8 + 0.4 * r();
    const phase = r() * Math.PI * 2;
    const styleRoll = r();
    const countRoll = r();
    const planetDraws = [0, 1, 2].map(() => ({ a: r(), b: r(), c: r(), d: r(), e: r(), f: r() }));

    const wDrift = 1;
    const wChase = t >= OBSTACLE.chaser.unlockSec ? 0.7 * clamp((t - OBSTACLE.chaser.unlockSec) / 60, 0.15, 1) : 0;
    const wDart = t >= OBSTACLE.dart.unlockSec ? 0.6 * clamp((t - OBSTACLE.dart.unlockSec) / 60, 0.15, 1) : 0;
    const total = wDrift + wChase + wDart;
    const roll = pickKind * total;
    const kind: ObstacleKind = roll < wDrift ? "drifter" : roll < wDrift + wChase ? "chaser" : "dart";

    const planets: Planet[] = [];
    let style = Math.floor(styleRoll * OBSTACLE_STARS.length);
    if (kind === "drifter") {
      const odds = OBSTACLE.drifter.planetOdds;
      const n = countRoll < odds[0] ? 1 : countRoll < odds[1] ? 2 : 3;
      const [o0, o1] = OBSTACLE.drifter.planetOrbit;
      const [r0, r1] = OBSTACLE.drifter.planetRadius;
      const [s0, s1] = OBSTACLE.drifter.planetSpin;
      for (let i = 0; i < n; i++) {
        const d = planetDraws[i];
        // spread orbits so planets never share a lane
        const lane = (i + d.a * 0.8) / 3;
        planets.push({
          orbit: o0 + (o1 - o0) * lane,
          r: r0 + (r1 - r0) * d.b,
          phase: d.c * Math.PI * 2,
          speed: (s0 + (s1 - s0) * d.d) * (d.e < 0.5 ? -1 : 1),
          ring: d.f < 0.25,
        });
      }
    } else if (kind === "chaser") {
      style = style % 3; // warm rogue stars: red / orange / yellow
    } else {
      style = styleRoll < 0.5 ? 0 : 1; // 0 = runaway star, 1 = rogue planet
    }

    if (this.obstacles.length >= OBSTACLE.maxOnField) return;

    const m = OBSTACLE.margin * 0.5;
    let x: number;
    let y: number;
    if (edge === 0) { x = along * WORLD_W; y = -m; }
    else if (edge === 1) { x = WORLD_W + m; y = along * WORLD_H; }
    else if (edge === 2) { x = along * WORLD_W; y = WORLD_H + m; }
    else { x = -m; y = along * WORLD_H; }

    const spec = OBSTACLE[kind];
    const heading = Math.atan2(aimY - y, aimX - x);
    const sp = spec.speed * this.speedMul() * speedJit;
    const o: Obstacle = {
      id: this.nid++,
      kind,
      style,
      planets,
      x,
      y,
      vx: Math.cos(heading) * sp,
      vy: Math.sin(heading) * sp,
      r: spec.radius,
      age: 0,
      warn: kind === "dart" ? OBSTACLE.dart.warnSec : 0,
      heading,
      phase,
    };
    if (kind === "dart") {
      // Telegraph from just inside the arena so the warning is visible.
      o.x = clamp(x, 14, WORLD_W - 14);
      o.y = clamp(y, 14, WORLD_H - 14);
      const h = Math.atan2(aimY - o.y, aimX - o.x);
      o.heading = h;
      o.vx = Math.cos(h) * sp;
      o.vy = Math.sin(h) * sp;
      this.events.push({ e: "warn", x: o.x, y: o.y });
    }
    this.obstacles.push(o);
  }

  private killObstacle(o: Obstacle, by: SpectralId | "blast") {
    const i = this.obstacles.indexOf(o);
    if (i >= 0) this.obstacles.splice(i, 1);
    this.kills++;
    this.events.push({ e: "kill", x: o.x, y: o.y, by });
  }

  // ------------------------------------------------------------ actions
  detonate(): Detonation | null {
    const c = this.cloud;
    if (this.ended) return null;
    if (this.detCooldown > 0) return null;
    if (this.effMass() < DETONATE_MIN_EFF_MASS) {
      this.events.push({ e: "fizzle", x: c.x, y: c.y });
      return null;
    }
    const type = this.currentType();
    const spec = SPECTRAL[type];
    const idx = this.nextChainIndex();
    const mult = chainMultiplier(idx);
    const det: Detonation = { k: type, m: idx, t: Math.round(this.t * 100) / 100, s: this.steps };
    this.tracker.add(type, idx);
    this.detonations.push(det);
    this.chain = idx;
    this.lastDetT = this.t;
    this.detCooldown = DETONATE_COOLDOWN_SEC;

    const rank = SPECTRAL_ORDER.length - 1 - SPECTRAL_ORDER.indexOf(type);
    const blast = BLAST.base + BLAST.perRank * rank;
    for (const o of [...this.obstacles]) {
      if (o.warn > 0) continue;
      if (anyPart(o, (p) => Math.hypot(p.x - c.x, p.y - c.y) < blast + p.r)) this.killObstacle(o, "blast");
    }

    if (spec.kind !== "none") {
      const rem: Remnant = {
        id: this.nid++,
        type,
        x: c.x,
        y: c.y,
        life: spec.life,
        maxLife: spec.life,
        age: 0,
        angle: 0,
        fade: 0,
        shell: 0,
      };
      this.remnants.push(rem);
      if (spec.kind === "dwarf-clear") {
        for (const o of [...this.obstacles]) {
          if (o.warn > 0) continue;
          if (anyPart(o, (p) => Math.hypot(p.x - c.x, p.y - c.y) < spec.radius + p.r)) this.killObstacle(o, type);
        }
      }
      const live = this.remnants.filter((r) => r.fade <= 0);
      if (live.length > MAX_REMNANTS) live[0].fade = REMNANT.fadeOutSec;
    }

    this.events.push({ e: "detonate", x: c.x, y: c.y, type, boost: spec.boost * mult, mult, blast });
    // New cloud right away, same place; small-star niche = brief shield.
    c.mass = 0;
    c.comp = 0;
    c.invuln = Math.max(c.invuln, spec.shieldSec, NEW_CLOUD_GRACE_SEC);
    return det;
  }

  // ------------------------------------------------------------ step
  step() {
    if (this.ended) return;
    const dt = STEP;
    this.tracker.step();
    this.steps++;
    this.t += dt;
    const c = this.cloud;
    const inp = this.input;

    this.detCooldown = Math.max(0, this.detCooldown - dt);
    c.invuln = Math.max(0, c.invuln - dt);

    // compression
    if (inp.compress) c.comp = Math.min(1, c.comp + dt / CLOUD.compressRiseSec);
    else c.comp = Math.max(0, c.comp - dt / CLOUD.compressFallSec);

    // movement toward the drag target
    const speed = CLOUD.maxSpeed * (1 - (1 - CLOUD.compressSpeedMul) * c.comp);
    const dx = inp.tx - c.x;
    const dy = inp.ty - c.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.01) {
      const v = Math.min(speed, d * 14);
      c.x += (dx / d) * v * dt;
      c.y += (dy / d) * v * dt;
    }
    const rad = this.radius();
    c.x = clamp(c.x, rad, WORLD_W - rad);
    c.y = clamp(c.y, rad, WORLD_H - rad);

    // slow decay unless compressing; tiny free trickle so a cloud always grows a bit
    c.mass = Math.max(0, c.mass - c.mass * CLOUD.decayPerSec * (1 - c.comp) * dt);
    c.mass = Math.min(CLOUD.maxMass, c.mass + CLOUD.passiveMassPerSec * dt);

    // gas (never harmful)
    this.nextGasAt -= dt;
    while (this.nextGasAt <= 0) {
      this.spawnGas();
      this.nextGasAt += 1 / GAS.spawnPerSec;
    }
    const catchR = this.catchRadius();
    for (const g of [...this.gas]) {
      g.age += dt;
      const gd = Math.hypot(c.x - g.x, c.y - g.y);
      if (gd < catchR + GAS.radius) g.pulled = true;
      if (g.pulled) {
        const k = 300 * dt;
        g.x += ((c.x - g.x) / (gd || 1)) * k;
        g.y += ((c.y - g.y) / (gd || 1)) * k;
        if (gd < rad * 0.8 + 4) {
          this.gas.splice(this.gas.indexOf(g), 1);
          c.mass = Math.min(CLOUD.maxMass, c.mass + GAS.mass / (1 + c.mass / CLOUD.diminishMass));
          this.events.push({ e: "gas", x: g.x, y: g.y });
          continue;
        }
      } else {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.x < 20 || g.x > WORLD_W - 20) g.vx *= -1;
        if (g.y < 20 || g.y > WORLD_H - 20) g.vy *= -1;
      }
      if (g.age > GAS.lifeSec && !g.pulled) this.gas.splice(this.gas.indexOf(g), 1);
    }

    // obstacle spawns
    this.nextObstacleAt -= dt;
    while (this.nextObstacleAt <= 0) {
      this.spawnObstacle();
      const iv = lerp(OBSTACLE.spawn.start, OBSTACLE.spawn.min, clamp(this.t / OBSTACLE.spawn.rampSec, 0, 1));
      this.nextObstacleAt += iv;
    }

    // obstacle motion
    const mul = this.speedMul();
    for (const o of [...this.obstacles]) {
      o.age += dt;
      if (o.kind === "dart" && o.warn > 0) {
        o.warn -= dt;
        continue;
      }
      if (o.kind === "chaser") {
        const want = Math.atan2(c.y - o.y, c.x - o.x);
        let diff = want - o.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = OBSTACLE.chaser.turn * dt;
        o.heading += clamp(diff, -maxTurn, maxTurn);
        const sp = OBSTACLE.chaser.speed * mul;
        o.vx = Math.cos(o.heading) * sp;
        o.vy = Math.sin(o.heading) * sp;
        if (o.age > OBSTACLE.chaser.lifeSec) {
          this.obstacles.splice(this.obstacles.indexOf(o), 1);
          continue;
        }
      }
      let wob = 0;
      if (o.kind === "drifter") wob = Math.sin(o.age * 1.6 + o.phase) * 18;
      const nx = -Math.sin(o.heading);
      const ny = Math.cos(o.heading);
      o.x += (o.vx + nx * wob) * dt;
      o.y += (o.vy + ny * wob) * dt;
      const m = OBSTACLE.margin * 2.5;
      if (o.x < -m || o.x > WORLD_W + m || o.y < -m || o.y > WORLD_H + m) {
        this.obstacles.splice(this.obstacles.indexOf(o), 1);
      }
    }

    // remnants
    this.updateRemnants(dt);

    // cloud vs obstacles
    if (c.invuln <= 0) {
      const hr = this.hitRadius();
      for (const o of this.obstacles) {
        if (o.warn > 0) continue;
        let hitAt: HitPart | null = null;
        for (const p of partsOf(o)) {
          if (Math.hypot(p.x - c.x, p.y - c.y) < hr + p.r * OBSTACLE.hitShare) {
            hitAt = p;
            break;
          }
        }
        if (hitAt) {
          this.lives--;
          this.lastLost = this.t;
          c.invuln = HIT_INVULN_SEC;
          c.mass *= HIT_MASS_KEEP;
          c.comp = 0;
          this.events.push({ e: "hit", x: hitAt.x, y: hitAt.y });
          this.killObstacle(o, "blast");
          if (this.lives <= 0) {
            this.ended = true;
            this.events.push({ e: "over" });
          }
          break;
        }
      }
    }
  }

  private updateRemnants(dt: number) {
    const c = this.cloud;
    for (const r of [...this.remnants]) {
      r.age += dt;
      if (r.fade > 0) {
        r.fade -= dt;
        if (r.fade <= 0) this.removeRemnant(r);
        continue;
      }
      r.life -= dt;
      if (r.life <= 0) {
        this.removeRemnant(r);
        continue;
      }
      const spec = SPECTRAL[r.type];
      const hit = (o: Obstacle) => {
        this.killObstacle(o, r.type);
        r.life -= spec.killCost;
      };
      const live = () => this.obstacles.filter((o) => o.warn <= 0);

      switch (spec.kind) {
        case "blackhole": {
          const { pull, core } = REMNANT.blackhole;
          for (const o of live()) {
            const d = Math.hypot(r.x - o.x, r.y - o.y);
            if (d < spec.radius + o.r) {
              const f = pull * (1 - Math.min(1, d / spec.radius)) * dt;
              o.x += ((r.x - o.x) / (d || 1)) * f;
              o.y += ((r.y - o.y) / (d || 1)) * f;
            }
            if (anyPart(o, (p) => Math.hypot(p.x - r.x, p.y - r.y) < core + p.r * 0.6)) hit(o);
          }
          break;
        }
        case "neutron": {
          const q = REMNANT.neutron;
          r.angle += q.spin * dt;
          for (const o of live()) {
            const touched = anyPart(o, (p) => {
              if (Math.hypot(p.x - r.x, p.y - r.y) < 30 + p.r) return true;
              for (let i = 0; i < q.beams * 2; i++) {
                const a = r.angle + (i * Math.PI) / q.beams;
                const ex = r.x + Math.cos(a) * q.beamLen;
                const ey = r.y + Math.sin(a) * q.beamLen;
                if (segDist(p.x, p.y, r.x, r.y, ex, ey) < q.beamWidth / 2 + p.r) return true;
              }
              return false;
            });
            if (touched) hit(o);
          }
          break;
        }
        case "dwarf-clear": {
          r.shell = Math.min(1, r.shell + dt / 0.7);
          for (const o of live()) {
            if (anyPart(o, (p) => Math.hypot(p.x - r.x, p.y - r.y) < REMNANT.clear.auraRadius + p.r)) hit(o);
          }
          break;
        }
        case "orbiter": {
          const q = REMNANT.orbiter;
          r.angle += q.spin * dt;
          r.x = c.x;
          r.y = c.y;
          const orbit = q.orbit + this.radius() * 0.5;
          for (const o of live()) {
            const touched = anyPart(o, (p) => {
              for (let i = 0; i < q.bodies; i++) {
                const a = r.angle + (i * Math.PI * 2) / q.bodies;
                const bx = r.x + Math.cos(a) * orbit;
                const by = r.y + Math.sin(a) * orbit;
                if (Math.hypot(p.x - bx, p.y - by) < q.bodyRadius + p.r) return true;
              }
              return false;
            });
            if (touched) hit(o);
          }
          break;
        }
        case "patroller": {
          const q = REMNANT.patroller;
          let tx = c.x;
          let ty = c.y;
          let best = Infinity;
          for (const o of live()) {
            const d = Math.hypot(o.x - r.x, o.y - r.y);
            if (d < best) {
              best = d;
              tx = o.x;
              ty = o.y;
            }
          }
          const d = Math.hypot(tx - r.x, ty - r.y);
          if (d > 1) {
            const v = Math.min(q.speed, d * 6);
            r.x += ((tx - r.x) / d) * v * dt;
            r.y += ((ty - r.y) / d) * v * dt;
          }
          r.angle += 2 * dt;
          for (const o of live()) {
            if (anyPart(o, (p) => Math.hypot(p.x - r.x, p.y - r.y) < q.quench + p.r)) hit(o);
          }
          break;
        }
        case "dwarf": {
          for (const o of live()) {
            if (anyPart(o, (p) => Math.hypot(p.x - r.x, p.y - r.y) < spec.radius + p.r)) hit(o);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private removeRemnant(r: Remnant) {
    const i = this.remnants.indexOf(r);
    if (i >= 0) this.remnants.splice(i, 1);
    this.events.push({ e: "remnantEnd", x: r.x, y: r.y, type: r.type });
  }

  /** UI: take and clear queued events. */
  drain(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  summary() {
    const counts: Record<SpectralId, number> = { O: 0, B: 0, A: 0, F: 0, G: 0, K: 0, M: 0 };
    for (const d of this.detonations) counts[d.k]++;
    return {
      distance: this.tracker.dist,
      steps: this.steps,
      durationSec: Math.round(this.t * 100) / 100,
      detonations: this.detonations.map((d) => ({ k: d.k, m: d.m, s: d.s })),
      counts,
      kills: this.kills,
      bestChain: this.detonations.reduce((m, d) => Math.max(m, d.m), -1) + 1,
    };
  }
}
