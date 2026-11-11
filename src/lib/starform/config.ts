/**
 * Hosky Star Form — every tunable number lives here.
 * Pure data (no React, no server imports) so the engine, the UI and the
 * server-side score check all read the same values.
 *
 * World units: the arena is a fixed WORLD_W × WORLD_H box on every device
 * (the canvas just scales it), so the daily seeded run is identical for all.
 */

export const WORLD_W = 800;
export const WORLD_H = 1000;
export const STEP = 1 / 60; // fixed sim step (seconds) — keeps the seed fair

export const START_LIVES = 3;
export const HIT_INVULN_SEC = 1.6; // after losing a paw
export const HIT_MASS_KEEP = 0.65; // cloud keeps this share of mass when hit
export const NEW_CLOUD_GRACE_SEC = 0.6;

// ---------------------------------------------------------------- cloud
export const CLOUD = {
  baseRadius: 22,
  radiusPerSqrtMass: 5.5,
  maxMass: 60,
  /** Free trickle of mass so a cloud always grows a little (per second). */
  passiveMassPerSec: 0.03,
  maxSpeed: 560, // world units / s toward the drag target
  compressSpeedMul: 0.6, // compressing makes the cloud heavy
  compressRiseSec: 1.4, // 0 → 1 while held
  compressFallSec: 3.2, // 1 → 0 when released
  compressHitboxShrink: 0.3, // hitbox shrinks by up to 30%
  compressCatchShrink: 0.38, // gas pickup range shrinks by up to 38%
  compressMassBoost: 0.6, // effective mass ×(1 + 0.6·compression)
  /**
   * Diminishing gas: each puff adds GAS.mass / (1 + mass / diminishMass), so the
   * bigger the cloud, the more gas it takes to grow further.
   */
  diminishMass: 20,
  /** Share of mass lost per second while NOT compressing (scaled by 1 - compression). */
  decayPerSec: 0.01,
  catchMul: 2.0,
  catchPad: 18,
} as const;

export const DETONATE_MIN_EFF_MASS = 1.5;
export const DETONATE_COOLDOWN_SEC = 0.35;
/** Every detonation also pops a small free blast (radius = base + perRank·rank). */
export const BLAST = { base: 55, perRank: 9 } as const;

// ---------------------------------------------------------------- gas
export const GAS = {
  mass: 0.5,
  radius: 7,
  /** gas wisps per second (constant — gas never brings obstacles). */
  spawnPerSec: 1.7,
  maxOnField: 26,
  startOnField: 14,
  drift: 26,
  lifeSec: 22,
} as const;

// ---------------------------------------------------------------- types
export type SpectralId = "O" | "B" | "A" | "F" | "G" | "K" | "M";
export const SPECTRAL_ORDER: SpectralId[] = ["O", "B", "A", "F", "G", "K", "M"];

export type RemnantKind = "blackhole" | "neutron" | "dwarf-clear" | "orbiter" | "patroller" | "dwarf" | "none";

export type SpectralSpec = {
  id: SpectralId;
  /**
   * Speed boost on detonation, as a multiple of cruise speed (stacks, then soft-caps).
   * The chain multiplier scales it.
   */
  boost: number;
  /** Time constant (s) of the boost's exponential decay. */
  boostSec: number;
  /** Effective mass needed to become this type. */
  minEffMass: number;
  color: string; // star colour
  glow: string;
  kind: RemnantKind;
  remnantName: string;
  /** Remnant lifetime (s); drains in real time. */
  life: number;
  /** Life (s) removed per obstacle destroyed. */
  killCost: number;
  /** Main effect radius. */
  radius: number;
  /** Grants this many seconds of invulnerability on detonation (niche bonus). */
  shieldSec: number;
};

export const SPECTRAL: Record<SpectralId, SpectralSpec> = {
  O: { id: "O", boost: 520, boostSec: 10, minEffMass: 53, color: "#6fa8ff", glow: "#3b6dff", kind: "blackhole", remnantName: "Black hole", life: 15, killCost: 0.45, radius: 200, shieldSec: 0 },
  B: { id: "B", boost: 230, boostSec: 8, minEffMass: 44, color: "#a8d8ff", glow: "#5fb4ff", kind: "neutron", remnantName: "Neutron star", life: 13, killCost: 0.7, radius: 170, shieldSec: 0 },
  A: { id: "A", boost: 95, boostSec: 6, minEffMass: 28, color: "#f2f6ff", glow: "#b9c8ff", kind: "dwarf-clear", remnantName: "White dwarf + shell", life: 6, killCost: 0.5, radius: 420, shieldSec: 0 },
  F: { id: "F", boost: 22, boostSec: 4, minEffMass: 15, color: "#fff2b8", glow: "#ffe27a", kind: "orbiter", remnantName: "Guardian white dwarf", life: 12, killCost: 0.8, radius: 105, shieldSec: 0 },
  G: { id: "G", boost: 3, boostSec: 3, minEffMass: 8.5, color: "#ffd84a", glow: "#ffb800", kind: "patroller", remnantName: "Patrol white dwarf", life: 11, killCost: 0.8, radius: 62, shieldSec: 0.6 },
  K: { id: "K", boost: 1.5, boostSec: 2, minEffMass: 3.8, color: "#ffa24d", glow: "#ff7a1a", kind: "dwarf", remnantName: "Weak white dwarf", life: 6, killCost: 1.0, radius: 66, shieldSec: 1.0 },
  M: { id: "M", boost: 0.4, boostSec: 1.5, minEffMass: 0, color: "#ff8f7a", glow: "#ff5a4a", kind: "none", remnantName: "No remnant", life: 0, killCost: 0, radius: 0, shieldSec: 1.8 },
};

// ---------------------------------------------------------------- distance
/**
 * Score = distance travelled. Speed = baseLsPerSec × (1 + softCap·tanh(Σboost / softCap)).
 * Distance is measured in light-seconds on a GAME scale (not real physics).
 */
export const TRAVEL = {
  baseLsPerSec: 25_000,
  softCap: 400,
} as const;

export const LS_PER_LM = 60;
export const LS_PER_LH = 3600;
export const LS_PER_LD = 86_400;
export const LS_PER_LY = 31_557_600;

// ---------------------------------------------------------------- remnants
export const MAX_REMNANTS = 3; // effects stack; the oldest fades when a 4th is made

export const REMNANT = {
  /** Black hole: pull strength (units/s at the centre, fades to 0 at the rim) and event horizon. */
  blackhole: { pull: 620, core: 48 },
  /** Neutron star beams. */
  neutron: { beams: 2, beamLen: 190, beamWidth: 15, spin: 2.3 },
  /** A star: one-time shell clear then a small white dwarf aura. */
  clear: { auraRadius: 72 },
  /** F star: satellites orbiting the player's cloud. */
  orbiter: { bodies: 2, orbit: 100, bodyRadius: 34, spin: 2.6 },
  /** G star: hunts the nearest obstacle. */
  patroller: { speed: 260, quench: 58 },
  fadeOutSec: 0.8, // visual fade when evicted by the cap
} as const;

// ---------------------------------------------------------------- niche bonus
/**
 * Chain multiplier: detonate again within COMBO_WINDOW_SEC and the chain grows.
 * Small stars chain fast, big stars pay more — both are viable.
 */
export const COMBO_WINDOW_SEC = 9;
export const COMBO_STEPS = [1, 1.25, 1.5, 1.75, 2] as const;

// ---------------------------------------------------------------- obstacles
export type ObstacleKind = "drifter" | "chaser" | "dart";

/** Star palette for obstacle stars (index chosen from the seed). */
export const OBSTACLE_STARS = [
  { name: "red dwarf", color: "#ff7a5a", glow: "#ff3d2e" },
  { name: "orange dwarf", color: "#ffb25a", glow: "#ff8a1a" },
  { name: "yellow star", color: "#ffe680", glow: "#ffc21a" },
  { name: "white star", color: "#f4f8ff", glow: "#9fb8ff" },
  { name: "blue star", color: "#9fd0ff", glow: "#4f8dff" },
] as const;

export const OBSTACLE = {
  /** Star with 1-3 orbiting planets. Star and planets all hurt. */
  drifter: {
    radius: 22,
    speed: 62,
    unlockSec: 0,
    planetOrbit: [42, 78] as readonly [number, number],
    planetRadius: [8, 13] as readonly [number, number],
    planetSpin: [1.1, 2.3] as readonly [number, number],
    /** Cumulative chance of 1 / 2 / 3 planets. */
    planetOdds: [0.5, 0.85, 1] as readonly number[],
  },
  /** Rogue star pulled toward you. */
  chaser: { radius: 18, speed: 82, turn: 1.7, unlockSec: 18, lifeSec: 13 },
  /** Runaway star or rogue planet, telegraphed, very fast. */
  dart: { radius: 13, speed: 430, unlockSec: 38, warnSec: 0.9 },
  /** Spawn interval (s) eases from `start` to `min` over `rampSec`. */
  spawn: { start: 2.6, min: 0.5, rampSec: 210 },
  /** Obstacle speed multiplier grows from 1 to `maxMul` over `rampSec`. */
  speedMul: { maxMul: 2.4, rampSec: 220 },
  maxOnField: 30,
  margin: 70,
  /** Hit circles count at this share of their drawn radius (1 = what you see). */
  hitShare: 0.92,
} as const;

/** Lowest raw gas (mass units) that could have built a cloud of this effective mass. */
export function minRawGasFor(effMass: number): number {
  const m = effMass / (1 + CLOUD.compressMassBoost); // best case: fully compressed
  return m + (m * m) / (2 * CLOUD.diminishMass);
}

// ---------------------------------------------------------------- all-time top 3 / validation
export const LB = {
  /** Global all-time board size. */
  top: 3,
  nameMax: 16,
  maxDurationSec: 30 * 60,
  minDurationSec: 3,
  /** Hard cap on a recomputed distance (light-seconds). */
  maxDistance: 5e9,
  /** Longest wall-clock gap between run start and submit. */
  runTtlSec: 60 * 60 * 2,
  startRateLimit: 60,
  maxDetonations: 400,
  /** Posts per IP per window. */
  rateLimit: 10,
  rateWindowSec: 10 * 60,
  /** Redis keys — NEW prefix, never shared with wooftag:* keys. */
  prefix: "qw:starform",
} as const;
/** Distance board (the old points board `qw:starform:top3` is left untouched). */
export const TOP3_KEY = `${LB.prefix}:top3:dist`;
export const RUN_PREFIX = `${LB.prefix}:run:`;
