/**
 * Server-side sanity check for a submitted run. The engine runs in the browser,
 * so this can't prove a run was played honestly — it rejects impossible ones:
 * wrong arithmetic, absurd durations/scores, or more star mass than the game's
 * gas supply could ever have delivered in that time.
 */
import { CLOUD, DETONATE_MIN_EFF_MASS, GAS, LB, SPECTRAL, SPECTRAL_ORDER, minRawGasFor, type SpectralId } from "./config";
import { scoreOf } from "./engine";

export type RunSubmission = {
  score: number;
  durationSec: number;
  detonations: { k: SpectralId; m: number }[];
  name: string;
};

export type ParsedRun =
  | { ok: true; run: RunSubmission }
  | { ok: false; error: string };

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

export function parseRun(body: unknown): ParsedRun {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_body" };
  const b = body as Record<string, unknown>;
  const score = Number(b.score);
  const durationSec = Number(b.durationSec);
  if (!Number.isFinite(score) || !Number.isFinite(durationSec)) return { ok: false, error: "bad_numbers" };
  if (!Array.isArray(b.detonations)) return { ok: false, error: "bad_detonations" };
  if (b.detonations.length === 0 || b.detonations.length > LB.maxDetonations) {
    return { ok: false, error: "bad_detonation_count" };
  }
  const detonations: { k: SpectralId; m: number }[] = [];
  for (const d of b.detonations) {
    const o = d as { k?: unknown; m?: unknown };
    if (!isKind(o?.k) || !Number.isInteger(o?.m) || (o.m as number) < 0 || (o.m as number) > 4) {
      return { ok: false, error: "bad_detonation" };
    }
    detonations.push({ k: o.k, m: o.m as number });
  }
  const name = sanitizeName(b.name);
  if (!name) return { ok: false, error: "bad_name" };
  return { ok: true, run: { score, durationSec, detonations, name } };
}

/** Returns null when the run is plausible, else a short reason code. */
export function checkRun(run: RunSubmission): string | null {
  if (run.durationSec < LB.minDurationSec || run.durationSec > LB.maxDurationSec) return "bad_duration";
  const recomputed = scoreOf(run.detonations);
  if (Math.abs(recomputed - run.score) > 0.01) return "score_mismatch";
  if (recomputed > LB.maxScore) return "score_too_high";
  // Chain steps must be reachable: a chain index can only rise by one per detonation.
  let prev = -1;
  for (const d of run.detonations) {
    if (d.m > prev + 1) return "bad_chain";
    prev = d.m;
  }
  // Star mass consumed can't exceed the gas the game ever supplies.
  let needed = 0;
  for (const d of run.detonations) {
    needed += minRawGasFor(Math.max(SPECTRAL[d.k].minEffMass, DETONATE_MIN_EFF_MASS));
  }
  const supplied =
    (GAS.startOnField + GAS.spawnPerSec * run.durationSec) * GAS.mass +
    CLOUD.passiveMassPerSec * run.durationSec +
    1;
  if (needed > supplied) return "impossible_mass";
  return null;
}
