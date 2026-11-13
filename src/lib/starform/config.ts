/**
 * Hosky Star Form — every tunable number lives here.
 * Pure data (no React, no server imports) so the engine, the UI and the
 * server-side score check all read the same values.
 *
 * World units: the arena always holds WORLD_AREA (= 800 × 1000) square units, reshaped to the
 * player's screen so it fills the display edge to edge. Spawn rates and caps are per arena,
 * and the area never changes, so hazard and gas density are the same on every device.
 */

export const WORLD_W = 800; // default (4:5) arena, used before a screen is known and in tests
export const WORLD_H = 1000;
export const WORLD_AREA = WORLD_W * WORLD_H;
/** Arena shape limits (width / height); beyond these the view letterboxes. */
export const WORLD_ASPECT_MIN = 0.36;
export const WORLD_ASPECT_MAX = 2.6;
export const STEP = 1 / 60; // fixed sim step (seconds) — keeps the seed fair

export const START_LIVES = 5;
export const MAX_LIVES = 5;
/** Detonating one of these star types wins back a Hosky paw (up to MAX_LIVES). */
export const PAW_REGAIN_TYPES = ["B", "O"] as const;
export const HIT_INVULN_SEC = 3.2; // after losing a paw (the cloud blinks meanwhile)
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
  /**
   * Steering speed never depends on mass, score or run time. The only slowdown is this
   * deliberate compress trade-off (a packed cloud is a bit heavier); 1 = none.
   */
  compressSpeedMul: 0.85,
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
  /**
   * Share of mass lost per second while NOT compressing (scaled by 1 - compression) — but only
   * when starving: while you keep swallowing gas (one wisp within `leakGraceSec`) nothing leaks,
   * so an uncompressed cloud never stalls; it just grows slower than a compressed one.
   */
  decayPerSec: 0.01,
  leakGraceSec: 5,
  catchMul: 2.0,
  catchPad: 18,
} as const;

export const DETONATE_MIN_EFF_MASS = 1.5;
export const DETONATE_COOLDOWN_SEC = 0.35;
/**
 * Saved stars. SAVE STAR banks the cloud's current star instead of detonating it (the cloud
 * starts again from M); tapping a slot later detonates that star there and then, with its boost,
 * blast and remnant. Fair by design: only BANK.slots stars at once, a saved star detonates at
 * chain ×1 (it can't be stacked into a combo) and every save/deploy obeys the detonate cooldown,
 * so banking never earns more than detonating each star when it was made.
 */
export const BANK = {
  slots: 2,
  /** Smallest star worth a slot (an M leaves no remnant and barely boosts). */
  minType: "K" as SpectralId,
  /** Seconds the "you made an O" choice waits before detonating by default. */
  oChoiceSec: 4,
} as const;
/** Every detonation also pops a small free blast (radius = base + perRank·rank). */
export const BLAST = { base: 55, perRank: 9 } as const;

// ---------------------------------------------------------------- gas
export const GAS = {
  mass: 0.5,
  radius: 7,
  /** gas wisps per second (constant — gas never brings obstacles). */
  spawnPerSec: 2.1,
  maxOnField: 28,
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
  O: { id: "O", boost: 520, boostSec: 10, minEffMass: 58, color: "#6fa8ff", glow: "#3b6dff", kind: "blackhole", remnantName: "Black hole", life: 22, killCost: 0.28, radius: 430, shieldSec: 0 },
  B: { id: "B", boost: 350, boostSec: 8, minEffMass: 50, color: "#a8d8ff", glow: "#5fb4ff", kind: "neutron", remnantName: "Neutron star", life: 17, killCost: 0.4, radius: 330, shieldSec: 0 },
  A: { id: "A", boost: 80, boostSec: 6, minEffMass: 29, color: "#f2f6ff", glow: "#b9c8ff", kind: "dwarf-clear", remnantName: "White dwarf + shell", life: 14, killCost: 0.42, radius: 420, shieldSec: 0 },
  F: { id: "F", boost: 16, boostSec: 4, minEffMass: 15, color: "#fff2b8", glow: "#ffe27a", kind: "orbiter", remnantName: "Guardian white dwarf", life: 12, killCost: 0.7, radius: 100, shieldSec: 0 },
  G: { id: "G", boost: 4, boostSec: 3, minEffMass: 8.5, color: "#ffd84a", glow: "#ffb800", kind: "patroller", remnantName: "Patrol white dwarf", life: 10, killCost: 0.9, radius: 56, shieldSec: 0.6 },
  K: { id: "K", boost: 1.0, boostSec: 2, minEffMass: 3.8, color: "#ffa24d", glow: "#ff7a1a", kind: "dwarf", remnantName: "Weak white dwarf", life: 7, killCost: 1.3, radius: 40, shieldSec: 1.0 },
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
  /**
   * Remnants are HUNTERS: each roams the arena after the hazards, with a loose `leash`
   * (from the cloud) so it stays in play, and circles `home` beside you when nothing is
   * left to chase. Power rises strictly K < G < F < A < B < O in life, speed, reach and
   * kill rate (see the table in the how-to / report). Remnants never touch gas or the player.
   * Targets are scored by distance to the hunter plus `threatBias` × distance to the cloud.
   */
  threatBias: 0.35,
  /** K: weak white dwarf — slow, short reach, short life. */
  dwarf: {
    speed: 190,
    strike: 40,
    leash: 340,
    home: { dist: 70, ease: 2.0, orbitSpin: 0.9, startAngle: (3 * Math.PI) / 2 },
  },
  /** G: patrol white dwarf. */
  patroller: {
    speed: 290,
    quench: 56,
    leash: 440,
    home: { dist: 85, ease: 3.0, orbitSpin: 1.6, startAngle: -Math.PI / 2 },
  },
  /** F: guardian white dwarf — hunts with two satellites circling it, so its reach is wide. */
  orbiter: {
    bodies: 2,
    orbit: 62,
    bodyRadius: 32,
    spin: 3.0,
    speed: 360,
    leash: 540,
    home: { dist: 95, ease: 3.0, orbitSpin: 1.2, startAngle: 0 },
  },
  /** A: one-time shell clear at detonation, then a fast, long-reach hunter. */
  clear: {
    auraRadius: 100,
    hunt: {
      speed: 520,
      leash: 680,
      home: { dist: 105, ease: 3.0, orbitSpin: -1.3, startAngle: Math.PI },
    },
  },
  /**
   * B: neutron star — drifts toward obstacle clusters, gravitationally draws nearby
   * hazards in (never the player's cloud or gas) and destroys whatever touches it; its
   * rotating beams also kill.
   */
  neutron: {
    beams: 2,
    beamLen: 220,
    beamWidth: 18,
    spin: 2.6,
    core: 38,
    speed: 270,
    leash: 780,
    pull: 330,
    pullRadius: 330,
    home: { dist: 110, ease: 2.4, orbitSpin: 1.0, startAngle: Math.PI / 2 },
  },
  /**
   * O: black hole — strongest pull, swallows hazards at the horizon, and fires homing jets
   * at distant hazards. Keeps `minGap` from the player and never drags a hazard across them.
   */
  blackhole: {
    core: 56,
    pull: 860,
    pullRadius: 430,
    speed: 240,
    leash: 900,
    minGap: 190,
    /** Never pull hazards already this close to the cloud's edge. */
    safeGap: 45,
    jet: { every: 1.0, count: 2, minRange: 140, range: 850, speed: 1150, radius: 18, life: 1.4, cost: 0.2 },
    home: { dist: 220, ease: 2.2, orbitSpin: 0.8, startAngle: 0 },
  },
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

// ---------------------------------------------------------------- all-time top 5 / validation
export const LB = {
  /** Global all-time board size (was 3; the Redis key below keeps its old name so past entries carry over). */
  top: 5,
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
/** Historic name from when the board was a top 3 — same ZSET now holds the top 5 (nothing migrated or deleted). */
export const TOP3_KEY = `${LB.prefix}:top3:dist`;
export const RUN_PREFIX = `${LB.prefix}:run:`;
