import { describe, expect, test } from "bun:test";
import { CLOUD, HIT_INVULN_SEC, LB, MAX_LIVES, START_LIVES, SPECTRAL, SPECTRAL_ORDER, STEP, MAX_REMNANTS, LS_PER_LY, TRAVEL, type SpectralId } from "./config";
import { DistanceTracker, formatDistance, simulateDistance } from "./distance";
import { StarForm, classify, partsOf } from "./engine";
import { elapsedLooksRight, parseRun, sanitizeName, verifyRun, type RunDet } from "./validate";

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
    expect(g.speedNow()).toBeGreaterThan(100); // stacked boosts, soft-capped
    expect(g.remnants.filter((r) => r.fade <= 0).length).toBeLessThanOrEqual(MAX_REMNANTS);
    for (let i = 0; i < 90; i++) g.step(); // fade completes
    expect(g.remnants.length).toBeLessThanOrEqual(MAX_REMNANTS);
  });

  test("losing all paws ends the run; a hit grants a long blink-and-safe window", () => {
    expect(START_LIVES).toBe(5);
    const g = new StarForm(3);
    g.cloud.invuln = 0;
    g.obstacles.push({ id: 899, kind: "drifter", style: 0, planets: [], x: g.cloud.x, y: g.cloud.y, vx: 0, vy: 0, r: 24, age: 0, warn: 0, heading: 0, phase: 0 });
    g.step();
    expect(g.lives).toBe(START_LIVES - 1);
    expect(g.cloud.invuln).toBeGreaterThan(HIT_INVULN_SEC - 0.05);
    expect(HIT_INVULN_SEC).toBeGreaterThanOrEqual(3);
    g.cloud.invuln = 0;
    for (let guard = 0; guard < START_LIVES && !g.ended; guard++) {
      g.obstacles.push({ id: 900 + guard, kind: "drifter", style: 0, planets: [], x: g.cloud.x, y: g.cloud.y, vx: 0, vy: 0, r: 24, age: 0, warn: 0, heading: 0, phase: 0 });
      g.step();
      g.cloud.invuln = 0;
    }
    expect(g.lives).toBe(0);
    expect(g.ended).toBe(true);
    expect(STEP).toBeGreaterThan(0);
  });

  test("detonating B or O wins a paw back (capped); other stars do not", () => {
    const det = (mass: number, lives: number) => {
      const g = new StarForm(4);
      g.cloud.invuln = 999;
      g.cloud.mass = mass;
      g.cloud.comp = 1;
      g.lives = lives;
      g.detonate();
      const evs = g.drain();
      return { lives: g.lives, paw: evs.some((e) => e.e === "paw") };
    };
    expect(det(60, 3)).toEqual({ lives: 4, paw: true }); // O
    expect(det(32, 3)).toEqual({ lives: 4, paw: true }); // B (eff 51)
    expect(det(60, MAX_LIVES)).toEqual({ lives: MAX_LIVES, paw: false }); // capped
    expect(det(12, 3)).toEqual({ lives: 3, paw: false }); // F / lower
  });

  test("black hole follows the cloud at a distance, never touching gas or the player", () => {
    const g = new StarForm(5);
    g.cloud.invuln = 9999;
    g.cloud.mass = CLOUD.maxMass;
    g.cloud.comp = 1;
    g.detonate();
    g.obstacles.length = 0;
    const bh = g.remnants.find((r) => r.type === "O")!;
    expect(bh).toBeDefined();
    const start = { x: bh.x, y: bh.y };
    g.input.tx = g.cloud.x < 400 ? 700 : 100;
    g.input.ty = g.cloud.y;
    const lives = g.lives;
    for (let i = 0; i < 180; i++) {
      g.obstacles.length = 0;
      g.step();
    }
    expect(g.lives).toBe(lives);
    expect(Math.hypot(bh.x - start.x, bh.y - start.y)).toBeGreaterThan(150); // it travelled with the cloud
    const d = Math.hypot(bh.x - g.cloud.x, bh.y - g.cloud.y);
    expect(d).toBeGreaterThan(40); // not parked on top of the player
    expect(d).toBeLessThan(400);
  });

  test("black hole is deterministic for the same seed and inputs", () => {
    const pos = () => {
      const g = new StarForm(9);
      g.cloud.invuln = 9999;
      g.cloud.mass = CLOUD.maxMass;
      g.cloud.comp = 1;
      g.detonate();
      g.input.tx = 700;
      g.input.ty = 200;
      for (let i = 0; i < 200; i++) g.step();
      const r = g.remnants.find((x) => x.type === "O");
      return r ? [r.x, r.y] : null;
    };
    expect(pos()).toEqual(pos());
  });

  test("black hole remnant destroys a nearby obstacle", () => {
    const g = new StarForm(5);
    g.cloud.invuln = 999;
    g.cloud.mass = CLOUD.maxMass;
    g.cloud.comp = 1;
    g.detonate();
    g.obstacles.length = 0;
    g.obstacles.push({ id: 901, kind: "drifter", style: 0, planets: [], x: g.cloud.x + 60, y: g.cloud.y, vx: 0, vy: 0, r: 20, age: 0, warn: 0, heading: 0, phase: 0 });
    for (let i = 0; i < 60; i++) g.step();
    expect(g.obstacles.find((o) => o.id === 901)).toBeUndefined();
  });
});

describe("stars and planets", () => {
  test("a planet orbiting a drifter hurts the cloud even when the star itself misses", () => {
    const g = new StarForm(11);
    g.cloud.invuln = 0;
    g.obstacles.length = 0;
    const planet = { orbit: 60, r: 9, phase: 0, speed: 0, ring: false };
    g.obstacles.push({ id: 950, kind: "drifter", style: 2, planets: [planet], x: g.cloud.x - 60, y: g.cloud.y, vx: 0, vy: 0, r: 20, age: 0, warn: 0, heading: 0, phase: 0 });
    expect(partsOf(g.obstacles[0]).length).toBe(2);
    g.step();
    expect(g.lives).toBe(START_LIVES - 1);
  });

  test("drifters spawn with 1-3 planets, chasers/darts with none", () => {
    const g = new StarForm(21);
    g.cloud.invuln = 9999;
    const seen = new Map<string, Set<number>>();
    for (let i = 0; i < 120 * 60; i++) {
      g.step();
      g.drain();
      for (const o of g.obstacles) {
        const set = seen.get(o.kind) ?? new Set<number>();
        set.add(o.planets.length);
        seen.set(o.kind, set);
      }
    }
    for (const n of seen.get("drifter") ?? []) expect(n >= 1 && n <= 3).toBe(true);
    for (const n of seen.get("chaser") ?? []) expect(n).toBe(0);
    for (const n of seen.get("dart") ?? []) expect(n).toBe(0);
    expect(seen.has("drifter")).toBe(true);
  });

  test("a black hole remnant also removes an obstacle whose planet is in range", () => {
    const g = new StarForm(5);
    g.cloud.invuln = 9999;
    g.cloud.mass = 60;
    g.cloud.comp = 1;
    g.detonate();
    g.obstacles.length = 0;
    // star far out, planet parked inside the black hole's core
    g.obstacles.push({ id: 951, kind: "drifter", style: 0, planets: [{ orbit: 60, r: 8, phase: 0, speed: 0, ring: false }], x: g.cloud.x + 120, y: g.cloud.y, vx: 0, vy: 0, r: 20, age: 0, warn: 0, heading: 0, phase: 0 });
    for (let i = 0; i < 90; i++) g.step();
    expect(g.obstacles.find((o) => o.id === 951)).toBeUndefined();
  });
});

describe("harder progression", () => {
  test("O needs far more gas than before and a lone puff of gas buys less as the cloud grows", () => {
    const g = new StarForm(2);
    g.gas.length = 0;
    g.cloud.mass = 0;
    const gain = (m: number) => {
      const h = new StarForm(2);
      h.cloud.mass = m;
      h.cloud.comp = 1;
      h.gas.length = 0;
      h.gas.push({ id: 1, x: h.cloud.x, y: h.cloud.y, vx: 0, vy: 0, age: 0, pulled: true });
      for (let i = 0; i < 5; i++) h.step();
      return h.cloud.mass - m;
    };
    expect(gain(1)).toBeGreaterThan(gain(30) * 2);
    expect(SPECTRAL.O.minEffMass).toBeGreaterThanOrEqual(50);
  });

  test("an uncompressed cloud slowly loses mass; a compressed one keeps it", () => {
    const g = new StarForm(3);
    g.cloud.invuln = 9999;
    g.gas.length = 0;
    g.cloud.mass = 20;
    g.input.compress = false;
    for (let i = 0; i < 600; i++) g.step();
    expect(g.cloud.mass).toBeLessThan(20);
    const h = new StarForm(3);
    h.cloud.invuln = 9999;
    h.gas.length = 0;
    h.cloud.mass = 20;
    h.cloud.comp = 1;
    h.input.compress = true;
    for (let i = 0; i < 600; i++) h.step();
    expect(h.cloud.mass).toBeGreaterThanOrEqual(20);
  });
});

describe("distance travelled", () => {
  test("cruise only: distance = base speed × time", () => {
    const t = new DistanceTracker();
    for (let i = 0; i < 600; i++) t.step();
    expect(t.dist).toBeCloseTo(TRAVEL.baseLsPerSec * 10, 3);
    expect(t.speedMul()).toBe(1);
  });

  test("boost scales with star size, decays back to cruise, and chain scales it", () => {
    const peak = (k: SpectralId, m = 0) => {
      const t = new DistanceTracker();
      t.add(k, m);
      return t.speedMul();
    };
    const order = [...SPECTRAL_ORDER].reverse(); // M … O
    for (let i = 1; i < order.length; i++) expect(peak(order[i])).toBeGreaterThan(peak(order[i - 1]));
    expect(peak("M")).toBeLessThan(1.5);
    expect(peak("O")).toBeGreaterThan(200);
    expect(peak("G", 4)).toBeGreaterThan(peak("G", 0));
    const t = new DistanceTracker();
    t.add("G", 0);
    for (let i = 0; i < 60 * 30; i++) t.step();
    expect(t.speedMul()).toBeLessThan(1.01);
  });

  test("stacking is sensible: two boosts beat one but never exceed the soft cap", () => {
    const one = new DistanceTracker();
    one.add("A", 0);
    const two = new DistanceTracker();
    two.add("A", 0);
    two.add("A", 1);
    expect(two.speedMul()).toBeGreaterThan(one.speedMul());
    const many = new DistanceTracker();
    for (let i = 0; i < 20; i++) many.add("O", 4);
    expect(many.speedMul()).toBeLessThanOrEqual(1 + TRAVEL.softCap + 1e-9);
  });

  test("the engine's live distance equals the server's recomputation", () => {
    const g = new StarForm(99);
    g.cloud.invuln = 99999;
    for (let i = 0; i < 60 * 40; i++) {
      if (i === 300 || i === 700 || i === 1500) {
        g.cloud.mass = 60;
        g.cloud.comp = 1;
        g.detonate();
      }
      g.input.tx = g.gas[0]?.x ?? 400;
      g.input.ty = g.gas[0]?.y ?? 500;
      g.step();
      g.drain();
    }
    const sum = g.summary();
    expect(sum.detonations.length).toBe(3);
    expect(simulateDistance(sum.steps, sum.detonations)).toBeCloseTo(sum.distance, 3);
    expect(sum.distance).toBeGreaterThan(TRAVEL.baseLsPerSec * 40 * 3);
  });

  test("formatDistance rolls up seconds → minutes → hours → days → years", () => {
    expect(formatDistance(30).unit).toBe("light-seconds");
    expect(formatDistance(600).unit).toBe("light-minutes");
    expect(formatDistance(7200).unit).toBe("light-hours");
    expect(formatDistance(3 * 86_400).unit).toBe("light-days");
    expect(formatDistance(LS_PER_LY * 2).text).toBe("2.00 light-years");
  });
});

describe("run verification", () => {
  const mk = (dets: RunDet[], steps = (dets[dets.length - 1]?.s ?? 0) + 900): Parameters<typeof verifyRun>[0] => ({
    name: "Pup",
    runId: "ABCDEFGH23",
    steps,
    detonations: dets,
  });
  const G = (s: number, m = 0): RunDet => ({ k: "G", m, s });

  test("honest run passes and the server distance equals the simulation", () => {
    const dets = [G(1500), G(1800, 1), G(2100, 2)];
    const v = verifyRun(mk(dets));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.distance).toBeCloseTo(simulateDistance(mk(dets).steps, dets), 6);
  });

  test("bad timing, chain, mass and duration are rejected", () => {
    expect((verifyRun(mk([G(1500), G(1505, 1)])) as { error: string }).error).toBe("bad_timing"); // inside the cooldown
    expect((verifyRun(mk([G(1500), G(1800, 3)])) as { error: string }).error).toBe("bad_chain"); // jump in chain
    expect((verifyRun(mk([G(1500), G(5000, 1)])) as { error: string }).error).toBe("bad_chain"); // window long gone
    expect((verifyRun(mk([G(1500, 2)])) as { error: string }).error).toBe("bad_chain"); // first must be 0
    const fast = Array.from({ length: 12 }, (_, i) => ({ k: "O" as const, m: Math.min(i, 4), s: 700 + i * 60 }));
    expect((verifyRun(mk(fast)) as { error: string }).error).toBe("impossible_mass");
    expect((verifyRun(mk([G(100)], 100)) as { error: string }).error).toBe("bad_duration");
    expect((verifyRun(mk([G(1500)], Math.round((LB.maxDurationSec + 5) / STEP))) as { error: string }).error).toBe("bad_duration");
    expect((verifyRun(mk([G(1500)], 1000)) as { error: string }).error).toBe("bad_timing"); // after the run ended
  });

  test("honest simulated bot runs pass verification", () => {
    for (const target of ["M", "G"] as const) {
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
      const sum = g.summary();
      const parsed = parseRun({ name: "Bot", runId: "ABCDEFGH23", steps: sum.steps, detonations: sum.detonations });
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        const v = verifyRun(parsed.run);
        expect(v.ok).toBe(true);
        if (v.ok) expect(v.distance).toBeCloseTo(sum.distance, 2);
      }
    }
  });

  test("wall-clock check: a run can't last longer than the time since it started", () => {
    const now = 1_000_000_000;
    expect(elapsedLooksRight(6000, now - 101_000, now)).toBe(true); // 100 s run, 101 s elapsed
    expect(elapsedLooksRight(6000, now - 5_000, now)).toBe(false); // claimed 100 s in 5 s
    expect(elapsedLooksRight(6000, now - (LB.runTtlSec + 10) * 1000, now)).toBe(false);
  });

  test("parseRun rejects junk and sanitizeName cleans names", () => {
    expect(parseRun(null).ok).toBe(false);
    expect(parseRun({ name: "x", runId: "bad id", steps: 1000, detonations: [G(1)] }).ok).toBe(false);
    expect(parseRun({ name: "x", runId: "ABCDEFGH23", steps: 1000, detonations: [{ k: "Z", m: 0, s: 1 }] }).ok).toBe(false);
    expect(parseRun({ name: "   ", runId: "ABCDEFGH23", steps: 1000, detonations: [G(1)] }).ok).toBe(false);
    expect(sanitizeName("<script>alert(1)</script> Hosky pup 🐾 way too long name here")).not.toMatch(/[<>()]/);
    expect(sanitizeName("a".repeat(100)).length).toBe(LB.nameMax);
  });
});
