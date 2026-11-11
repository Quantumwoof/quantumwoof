import { describe, expect, test } from "bun:test";
import { CLOUD, LB, SPECTRAL, SPECTRAL_ORDER, STEP, MAX_REMNANTS, type SpectralId } from "./config";
import { StarForm, classify, scoreOf } from "./engine";
import { checkRun, parseRun, sanitizeName } from "./validate";

function snapshot(seed: number, seconds: number) {
  const g = new StarForm(seed);
  const out: string[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    g.step();
    g.drain();
    // obstacles + gas don't depend on the player
    if (i % 60 === 0) out.push(g.obstacles.map((o) => `${o.kind}:${o.x.toFixed(1)}`).join(",") + "|" + g.gas.length);
  }
  return out;
}

describe("star form engine", () => {
  test("classify follows the thresholds, O is the biggest", () => {
    expect(classify(0)).toBe("M");
    for (const id of SPECTRAL_ORDER) expect(classify(SPECTRAL[id].minEffMass + 0.001)).toBe(id);
    expect(classify(1000)).toBe("O");
  });

  test("same seed + same (idle) input = same obstacle pattern; different seed differs", () => {
    const a = snapshot(42, 30);
    const b = snapshot(42, 30);
    const c = snapshot(43, 30);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  test("gas never spawns obstacles: collecting gas does not change the spawn schedule", () => {
    const spawnLog = (collect: boolean) => {
      const g = new StarForm(7);
      g.cloud.invuln = 999;
      const seen = new Set<number>();
      const log: string[] = [];
      let gasEvents = 0;
      for (let i = 0; i < 25 * 60; i++) {
        if (collect && g.gas[0]) {
          g.input.tx = g.gas[0].x;
          g.input.ty = g.gas[0].y;
        }
        g.step();
        for (const e of g.drain()) if (e.e === "gas") gasEvents++;
        for (const o of g.obstacles) {
          if (!seen.has(o.id)) {
            seen.add(o.id);
            log.push(`${o.kind}@${g.t.toFixed(2)}`);
          }
        }
      }
      return { log, gasEvents };
    };
    const a = spawnLog(true);
    const b = spawnLog(false);
    expect(a.gasEvents).toBeGreaterThan(5);
    expect(b.gasEvents).toBeLessThan(a.gasEvents);
    expect(a.log.length).toBeGreaterThan(5);
    expect(a.log).toEqual(b.log);
  });

  test("detonate: needs mass, scores, starts a fresh cloud, chains, caps remnants", () => {
    const g = new StarForm(1);
    g.cloud.invuln = 999;
    expect(g.detonate()).toBeNull(); // too small
    let last: SpectralId = "M";
    for (let n = 0; n < 6; n++) {
      g.cloud.mass = CLOUD.maxMass;
      g.cloud.comp = 1;
      g.detCooldown = 0;
      const d = g.detonate();
      expect(d).not.toBeNull();
      last = d!.k;
      expect(g.cloud.mass).toBe(0); // a new cloud starts immediately
      expect(g.detonations[n].m).toBe(Math.min(n, 4)); // chain grows within the window
    }
    expect(last).toBe("O");
    expect(g.score).toBe(scoreOf(g.detonations));
    expect(g.remnants.filter((r) => r.fade <= 0).length).toBeLessThanOrEqual(MAX_REMNANTS);
    for (let i = 0; i < 90; i++) g.step(); // fade completes
    expect(g.remnants.length).toBeLessThanOrEqual(MAX_REMNANTS);
  });

  test("three hits end the run", () => {
    const g = new StarForm(3);
    g.cloud.invuln = 0;
    for (let guard = 0; guard < 3 && !g.ended; guard++) {
      g.obstacles.push({ id: 900 + guard, kind: "drifter", x: g.cloud.x, y: g.cloud.y, vx: 0, vy: 0, r: 24, age: 0, warn: 0, heading: 0, phase: 0 });
      g.step();
      g.cloud.invuln = 0;
    }
    expect(g.lives).toBe(0);
    expect(g.ended).toBe(true);
    expect(STEP).toBeGreaterThan(0);
  });

  test("black hole remnant destroys a nearby obstacle", () => {
    const g = new StarForm(5);
    g.cloud.invuln = 999;
    g.cloud.mass = CLOUD.maxMass;
    g.cloud.comp = 1;
    g.detonate();
    g.obstacles.length = 0;
    g.obstacles.push({ id: 901, kind: "drifter", x: g.cloud.x + 60, y: g.cloud.y, vx: 0, vy: 0, r: 20, age: 0, warn: 0, heading: 0, phase: 0 });
    for (let i = 0; i < 60; i++) g.step();
    expect(g.obstacles.find((o) => o.id === 901)).toBeUndefined();
  });
});

describe("honest simulated runs pass the server check", () => {
  for (const target of ["M", "G", "O"] as const) {
    test(`bot aiming for ${target}`, () => {
      const g = new StarForm(1234);
      const idx = SPECTRAL_ORDER.indexOf(target);
      while (!g.ended && g.t < 240) {
        const c = g.cloud;
        let best: { x: number; y: number } | null = null;
        let bd = Infinity;
        for (const s of g.gas) {
          const d = Math.hypot(s.x - c.x, s.y - c.y);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
        if (best) {
          g.input.tx = best.x;
          g.input.ty = best.y;
        }
        g.input.compress = true;
        if (SPECTRAL_ORDER.indexOf(g.currentType()) <= idx && g.canDetonate()) g.detonate();
        g.step();
        g.drain();
      }
      const s = g.summary();
      if (s.detonations.length === 0) return;
      const r = parseRun({ ...s, name: "Bot" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(checkRun(r.run)).toBeNull();
    });
  }
});

describe("star form score validation", () => {
  const run = (dets: { k: SpectralId; m: number }[], score = scoreOf(dets), durationSec = 120) => ({
    name: "Pup",
    score,
    durationSec,
    detonations: dets,
  });

  test("honest run passes; wrong arithmetic fails", () => {
    const dets = [{ k: "G" as const, m: 0 }, { k: "K" as const, m: 1 }];
    expect(checkRun(run(dets))).toBeNull();
    expect(checkRun(run(dets, 999))).toBe("score_mismatch");
  });

  test("impossible mass, bad chain, bad duration are rejected", () => {
    const many = Array.from({ length: 60 }, () => ({ k: "O" as const, m: 0 }));
    expect(checkRun(run(many, scoreOf(many), 20))).toBe("impossible_mass");
    expect(checkRun(run([{ k: "G", m: 3 }]))).toBe("bad_chain");
    expect(checkRun(run([{ k: "G", m: 0 }], undefined, 1))).toBe("bad_duration");
    expect(checkRun(run([{ k: "G", m: 0 }], undefined, LB.maxDurationSec + 1))).toBe("bad_duration");
  });

  test("parseRun rejects junk and sanitizeName cleans names", () => {
    expect(parseRun(null).ok).toBe(false);
    expect(parseRun({ score: 1, durationSec: 10, detonations: [{ k: "Z", m: 0 }], name: "x" }).ok).toBe(false);
    expect(parseRun({ score: 6, durationSec: 10, detonations: [{ k: "G", m: 0 }], name: "   " }).ok).toBe(false);
    expect(sanitizeName("<script>alert(1)</script> Hosky pup 🐾 way too long name here")).not.toMatch(/[<>()]/);
    expect(sanitizeName("a".repeat(100)).length).toBe(LB.nameMax);
  });
});
