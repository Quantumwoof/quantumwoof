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
  radiusPerSqrtMass: 7.5,
  maxMass: 24,
  /** Free trickle of mass so a cloud always grows a little (per second). */
  passiveMassPerSec: 0.05,
  maxSpeed: 560, // world units / s toward the drag target
  compressSpeedMul: 0.6, // compressing makes the cloud heavy
  compressRiseSec: 1.4, // 0 → 1 while held
  compressFallSec: 3.2, // 1 → 0 when released
  compressHitboxShrink: 0.3, // hitbox shrinks by up to 30%
  compressCatchShrink: 0.38, // gas pickup range shrinks by up to 38%
  compressMassBoost: 0.6, // effective mass ×(1 + 0.6·compression)
  catchMul: 2.0,
  catchPad: 18,
} as const;

export const DETONATE_MIN_EFF_MASS = 1.4;
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
  /** Points per detonation (before the chain multiplier). */
  points: number;
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
  O: { id: "O", points: 15, minEffMass: 10.6, color: "#6fa8ff", glow: "#3b6dff", kind: "blackhole", remnantName: "Black hole", life: 15, killCost: 0.45, radius: 200, shieldSec: 0 },
  B: { id: "B", points: 12.5, minEffMass: 8.8, color: "#a8d8ff", glow: "#5fb4ff", kind: "neutron", remnantName: "Neutron star", life: 13, killCost: 0.7, radius: 170, shieldSec: 0 },
  A: { id: "A", points: 10, minEffMass: 7.0, color: "#f2f6ff", glow: "#b9c8ff", kind: "dwarf-clear", remnantName: "White dwarf + shell", life: 6, killCost: 0.5, radius: 420, shieldSec: 0 },
  F: { id: "F", points: 8, minEffMass: 5.6, color: "#fff2b8", glow: "#ffe27a", kind: "orbiter", remnantName: "Guardian white dwarf", life: 12, killCost: 0.8, radius: 105, shieldSec: 0 },
  G: { id: "G", points: 6, minEffMass: 4.2, color: "#ffd84a", glow: "#ffb800", kind: "patroller", remnantName: "Patrol white dwarf", life: 11, killCost: 0.8, radius: 62, shieldSec: 0.6 },
  K: { id: "K", points: 4, minEffMass: 2.8, color: "#ffa24d", glow: "#ff7a1a", kind: "dwarf", remnantName: "Weak white dwarf", life: 6, killCost: 1.0, radius: 66, shieldSec: 1.0 },
  M: { id: "M", points: 2, minEffMass: 0, color: "#ff8f7a", glow: "#ff5a4a", kind: "none", remnantName: "No remnant", life: 0, killCost: 0, radius: 0, shieldSec: 1.8 },
};

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

export const OBSTACLE = {
  drifter: { radius: 24, speed: 62, unlockSec: 0 },
  chaser: { radius: 19, speed: 82, turn: 1.7, unlockSec: 18, lifeSec: 13 },
  dart: { radius: 14, speed: 430, unlockSec: 38, warnSec: 0.9 },
  /** Spawn interval (s) eases from `start` to `min` over `rampSec`. */
  spawn: { start: 2.6, min: 0.5, rampSec: 210 },
  /** Obstacle speed multiplier grows from 1 to `maxMul` over `rampSec`. */
  speedMul: { maxMul: 2.4, rampSec: 220 },
  maxOnField: 30,
  margin: 70,
} as const;

// ---------------------------------------------------------------- all-time top 3 / validation
export const LB = {
  /** Global all-time board size. */
  top: 3,
  nameMax: 16,
  maxDurationSec: 30 * 60,
  minDurationSec: 3,
  maxScore: 6000,
  maxDetonations: 400,
  /** Posts per IP per window. */
  rateLimit: 10,
  rateWindowSec: 10 * 60,
  /** Redis keys — NEW prefix, never shared with wooftag:* keys. */
  prefix: "qw:starform",
} as const;
export const TOP3_KEY = `${LB.prefix}:top3`;
