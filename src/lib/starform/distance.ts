/**
 * Distance travelled — shared by the engine (live) and the server (recompute).
 * Pure and deterministic: same detonation steps in = same distance out.
 */
import {
  COMBO_STEPS,
  LS_PER_LD,
  LS_PER_LH,
  LS_PER_LM,
  LS_PER_LY,
  SPECTRAL,
  SPECTRAL_ORDER,
  STEP,
  TRAVEL,
  type SpectralId,
} from "./config";

const DECAY = SPECTRAL_ORDER.map((k) => Math.exp(-STEP / SPECTRAL[k].boostSec));

export class DistanceTracker {
  /** Light-seconds travelled. */
  dist = 0;
  private acc = new Float64Array(SPECTRAL_ORDER.length);

  /** A detonation of type `k` at chain index `m` adds a decaying boost. */
  add(k: SpectralId, m: number) {
    const i = SPECTRAL_ORDER.indexOf(k);
    const mult = COMBO_STEPS[Math.max(0, Math.min(COMBO_STEPS.length - 1, m))];
    this.acc[i] += SPECTRAL[k].boost * mult;
  }

  /** Current speed as a multiple of cruise (1 = cruise). */
  speedMul(): number {
    let sum = 0;
    for (let i = 0; i < this.acc.length; i++) sum += this.acc[i];
    return 1 + TRAVEL.softCap * Math.tanh(sum / TRAVEL.softCap);
  }

  /** Advance one fixed step: integrate distance, then decay the boosts. */
  step() {
    this.dist += TRAVEL.baseLsPerSec * STEP * this.speedMul();
    for (let i = 0; i < this.acc.length; i++) this.acc[i] *= DECAY[i];
  }
}

/** Server-side: rebuild a run's distance from its detonation steps. */
export function simulateDistance(steps: number, dets: ReadonlyArray<{ k: SpectralId; m: number; s: number }>): number {
  const tr = new DistanceTracker();
  let di = 0;
  for (let i = 0; i < steps; i++) {
    while (di < dets.length && dets[di].s === i) {
      tr.add(dets[di].k, dets[di].m);
      di++;
    }
    tr.step();
  }
  return tr.dist;
}

/** Game-scale distance label: light-seconds → minutes → hours → days → years. */
export function formatDistance(ls: number): { value: string; unit: string; text: string } {
  const f = (n: number, dp: number) => n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  let value: string;
  let unit: string;
  if (ls < LS_PER_LM) {
    value = f(ls, 0);
    unit = ls === 1 ? "light-second" : "light-seconds";
  } else if (ls < LS_PER_LH) {
    value = f(ls / LS_PER_LM, 1);
    unit = "light-minutes";
  } else if (ls < LS_PER_LD) {
    value = f(ls / LS_PER_LH, 1);
    unit = "light-hours";
  } else if (ls < LS_PER_LY) {
    const d = ls / LS_PER_LD;
    value = f(d, d < 100 ? 1 : 0);
    unit = "light-days";
  } else {
    const y = ls / LS_PER_LY;
    value = f(y, y < 100 ? 2 : 0);
    unit = "light-years";
  }
  return { value, unit, text: `${value} ${unit}` };
}
