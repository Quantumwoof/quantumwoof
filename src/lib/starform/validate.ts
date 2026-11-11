/**
 * Server-side check for a submitted run. The engine runs in the browser, so
 * this can't prove a run was played honestly. It rebuilds the distance from the
 * submitted stars and timings with the same code the game uses, and rejects
 * impossible runs: absurd lengths, detonations faster than the cooldown, chain
 * multipliers that don't follow the timing, or more star mass than the gas
 * supply could have delivered by that moment.
 */
import {
  CLOUD,
  COMBO_STEPS,
  COMBO_WINDOW_SEC,
  DETONATE_COOLDOWN_SEC,
  DETONATE_MIN_EFF_MASS,
  GAS,
  LB,
  SPECTRAL,
  SPECTRAL_ORDER,
  STEP,
  minRawGasFor,
  type SpectralId,
} from "./config";
import { simulateDistance } from "./distance";

export type RunDet = { k: SpectralId; m: number; s: number };

export type RunSubmission = {
  name: string;
  steps: number;
  detonations: RunDet[];
  runId: string;
};

export type ParsedRun = { ok: true; run: RunSubmission } | { ok: false; error: string };

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _.\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LB.nameMax)
    .trim();
}

const isKind = (v: unknown): v is SpectralId =>
  typeof v === "string" && (SPECTRAL_ORDER as string[]).includes(v);

const RUN_ID_RE = /^[0-9A-HJKMNP-TV-Z]{8,64}$/;

export function parseRun(body: unknown): ParsedRun {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_body" };
  const b = body as Record<string, unknown>;
  if (!Number.isInteger(b.steps)) return { ok: false, error: "bad_numbers" };
  if (typeof b.runId !== "string" || !RUN_ID_RE.test(b.runId)) return { ok: false, error: "bad_run_id" };
  if (!Array.isArray(b.detonations)) return { ok: false, error: "bad_detonations" };
  if (b.detonations.length === 0 || b.detonations.length > LB.maxDetonations) {
    return { ok: false, error: "bad_detonation_count" };
  }
  const detonations: RunDet[] = [];
  for (const d of b.detonations) {
    const o = d as { k?: unknown; m?: unknown; s?: unknown };
    if (
      !isKind(o?.k) ||
      !Number.isInteger(o?.m) ||
      (o.m as number) < 0 ||
      (o.m as number) >= COMBO_STEPS.length ||
      !Number.isInteger(o?.s) ||
      (o.s as number) < 0
    ) {
      return { ok: false, error: "bad_detonation" };
    }
    detonations.push({ k: o.k, m: o.m as number, s: o.s as number });
  }
  const name = sanitizeName(b.name);
  if (!name) return { ok: false, error: "bad_name" };
  return { ok: true, run: { name, steps: b.steps as number, detonations, runId: b.runId } };
}

const COOLDOWN_STEPS = Math.floor(DETONATE_COOLDOWN_SEC / STEP) - 1; // tolerate float drift
const WINDOW_STEPS = Math.round(COMBO_WINDOW_SEC / STEP);

export type Verdict = { ok: true; distance: number } | { ok: false; error: string };

/** Plausibility + recomputation. `distance` is in game-scale light-seconds. */
export function verifyRun(run: RunSubmission): Verdict {
  const minSteps = Math.round(LB.minDurationSec / STEP);
  const maxSteps = Math.round(LB.maxDurationSec / STEP);
  if (run.steps < minSteps || run.steps > maxSteps) return { ok: false, error: "bad_duration" };

  let prev: RunDet | null = null;
  let needed = 0;
  for (const d of run.detonations) {
    if (d.s >= run.steps) return { ok: false, error: "bad_timing" };
    if (prev) {
      const gap = d.s - prev.s;
      if (gap < COOLDOWN_STEPS) return { ok: false, error: "bad_timing" };
      // Chain index must follow the timing (a couple of steps of slack at the window edge).
      const rise = Math.min(prev.m + 1, COMBO_STEPS.length - 1);
      const mustChain = gap <= WINDOW_STEPS - 2;
      const mustReset = gap >= WINDOW_STEPS + 2;
      if (mustChain && d.m !== rise) return { ok: false, error: "bad_chain" };
      if (mustReset && d.m !== 0) return { ok: false, error: "bad_chain" };
      if (!mustChain && !mustReset && d.m !== rise && d.m !== 0) return { ok: false, error: "bad_chain" };
    } else if (d.m !== 0) {
      return { ok: false, error: "bad_chain" };
    }
    // Star mass consumed so far can't exceed the gas supplied so far.
    needed += minRawGasFor(Math.max(SPECTRAL[d.k].minEffMass, DETONATE_MIN_EFF_MASS));
    const t = d.s * STEP;
    const supplied = (GAS.startOnField + GAS.spawnPerSec * t) * GAS.mass + CLOUD.passiveMassPerSec * t + 1;
    if (needed > supplied) return { ok: false, error: "impossible_mass" };
    prev = d;
  }

  const distance = simulateDistance(run.steps, run.detonations);
  if (!Number.isFinite(distance) || distance <= 0 || distance > LB.maxDistance) {
    return { ok: false, error: "distance_out_of_range" };
  }
  return { ok: true, distance };
}

/** Wall-clock check: the run can't have lasted longer than the time since it was started. */
export function elapsedLooksRight(steps: number, startedAtMs: number, nowMs: number): boolean {
  const claimedMs = steps * STEP * 1000;
  const realMs = nowMs - startedAtMs;
  return realMs >= claimedMs * 0.95 - 2000 && realMs <= LB.runTtlSec * 1000;
}
