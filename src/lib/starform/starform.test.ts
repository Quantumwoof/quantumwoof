import { describe, expect, test } from "bun:test";
import { CLOUD, HIT_INVULN_SEC, REMNANT, LB, MAX_LIVES, START_LIVES, SPECTRAL, SPECTRAL_ORDER, STEP, MAX_REMNANTS, LS_PER_LY, TRAVEL, type SpectralId } from "./config";
import { DistanceTracker, formatDistance, simulateDistance } from "./distance";
import { StarForm, classify, partsOf } from "./engine";
import { elapsedLooksRight, parseRun, sanitizeName, verifyRun, type RunDet } from "./validate";


const KILL_MASS: Record<string, number> = { K: 3, G: 7, F: 12, A: 20, B: 32, O: 60 };
/** Fixed scenario: parked invulnerable cloud, one drifter every 0.4 s for 30 s; kills by `type`'s remnant. */
function killsInStream(type: SpectralId): number {
  const g = new StarForm(21);
  g.obstacles.length = 0;
  g.cloud.invuln = 1e9;
  g.cloud.x = 400;
  g.cloud.y = 620;
  g.input.tx = 400;
  g.input.ty = 620;
  g.cloud.mass = KILL_MASS[type];
  g.cloud.comp = 1;
  g.detonate();
  g.drain();
  let kills = 0;
  let spawned = 0;
  let t = 0;
  let next = 0.4;
  let sid = 1_000_000;
  while (t < 40) {
    if (t >= next && t < 30) {
      const a = spawned * 2.399963;
      const x = 400 + Math.cos(a) * 400;
      const y = 620 + Math.sin(a) * 400;
      const tx = 400 + Math.cos(a + 1) * 120;
      const ty = 620 + Math.sin(a + 1) * 120;
      const d = Math.hypot(tx - x, ty - y);
      g.obstacles.push({ id: sid++, kind: "drifter", style: spawned % 3, planets: [], x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(970, y)), vx: ((tx - x) / d) * 110, vy: ((ty - y) / d) * 110, r: 22, age: 0, warn: 0, heading: 0, phase: 0 });
      spawned++;
      next += 0.4;
    }
    g.obstacles = g.obstacles.filter((o) => o.id >= 1_000_000);
    g.step();
    t += STEP;
    for (const e of g.drain()) if (e.e === "kill" && e.by === type) kills++;
    if (t > 0.5 && !g.remnants.some((r) => r.type === type)) break;
  }
  return kills;
}

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

  test("A-star white dwarf hunts a hazard within its leash, stays leashed, and orbits home otherwise", () => {
    const g = new StarForm(6);
    g.cloud.invuln = 9999;
    g.cloud.mass = 20; // A (eff 32: ≥ 29, below B)
    g.cloud.comp = 1;
    g.detonate();
    g.obstacles.length = 0;
    const wd = g.remnants.find((r) => r.type === "A")!;
    expect(wd).toBeDefined();
    const q = REMNANT.clear.hunt;
    // far-off hazard (outside leash) is ignored; a nearer one gets hunted down
    g.obstacles.push({ id: 960, kind: "drifter", style: 0, planets: [], x: g.cloud.x + 240, y: g.cloud.y, vx: 0, vy: 0, r: 20, age: 0, warn: 0, heading: 0, phase: 0 });
    let maxLeash = 0;
    for (let i = 0; i < 120; i++) {
      g.step();
      maxLeash = Math.max(maxLeash, Math.hypot(wd.x - g.cloud.x, wd.y - g.cloud.y));
    }
    expect(g.obstacles.find((o) => o.id === 960)).toBeUndefined();
    expect(maxLeash).toBeLessThanOrEqual(q.leash + 1);
    // nothing to hunt: it settles into an orbit around the cloud at the home distance
    g.obstacles.length = 0;
    for (let i = 0; i < 120; i++) {
      g.obstacles.length = 0;
      g.step();
    }
    const d = Math.hypot(wd.x - g.cloud.x, wd.y - g.cloud.y);
    expect(Math.abs(d - q.home.dist)).toBeLessThan(25);
  });

  test("star type ratchets: it never drops back within a cloud, and a new cloud starts again", () => {
    const g = new StarForm(14);
    g.obstacles.length = 0;
    g.cloud.invuln = 9999;
    g.cloud.mass = 20; // A once compressed
    g.cloud.comp = 1;
    g.input.compress = true;
    g.step();
    expect(g.currentType()).toBe("A");
    // release compress, leak mass, lose mass to a hit: still A
    g.input.compress = false;
    for (let i = 0; i < 60 * 8; i++) {
      g.obstacles.length = 0;
      g.step();
    }
    expect(g.cloud.comp).toBeLessThan(0.5);
    expect(classify(g.effMass())).not.toBe("A");
    expect(g.currentType()).toBe("A");
    g.cloud.mass *= 0.65;
    g.step();
    expect(g.currentType()).toBe("A");
    // detonating gives the ratcheted star, then the next cloud is back at M
    const det = g.detonate();
    expect(det?.k).toBe("A");
    expect(g.currentType()).toBe("M");
    expect(g.cloud.peakEff).toBe(0);
  });

  test("remnants hunt: each one chases a hazard, stays within its leash, and idles beside the cloud", () => {
    const leash: Record<string, number> = {
      K: REMNANT.dwarf.leash,
      G: REMNANT.patroller.leash,
      F: REMNANT.orbiter.leash,
      A: REMNANT.clear.hunt.leash,
      B: REMNANT.neutron.leash,
      O: REMNANT.blackhole.leash,
    };
    for (const [type, mass] of Object.entries(KILL_MASS) as [SpectralId, number][]) {
      const g = new StarForm(12);
      g.obstacles.length = 0;
      g.cloud.invuln = 9999;
      g.cloud.mass = mass;
      g.cloud.comp = 1;
      g.detonate();
      const r = g.remnants.find((x) => x.type === type)!;
      expect(r).toBeDefined();
      // a slow drifter far from the cloud: the remnant should leave its spot to go after it
      g.obstacles.push({ id: 970, kind: "drifter", style: 0, planets: [], x: g.cloud.x + 250, y: g.cloud.y - 150, vx: 0, vy: 0, r: 22, age: 0, warn: 0, heading: 0, phase: 0 });
      let maxFromCloud = 0;
      for (let i = 0; i < 60 * 3; i++) {
        g.input.tx = g.cloud.x;
        g.step();
        maxFromCloud = Math.max(maxFromCloud, Math.hypot(r.x - g.cloud.x, r.y - g.cloud.y));
      }
      expect(`${type} sought ${g.obstacles.find((o) => o.id === 970) === undefined}`).toBe(`${type} sought true`);
      expect(maxFromCloud).toBeLessThanOrEqual(leash[type] + 1);
    }
  });

  test("power ladder: kills in a fixed hazard stream strictly increase K < G < F < A < B < O", () => {
    const kills = (["K", "G", "F", "A", "B", "O"] as SpectralId[]).map((t) => killsInStream(t));
    for (let i = 1; i < kills.length; i++) expect(kills[i]).toBeGreaterThan(kills[i - 1]);
    // life and reach also rise up the ladder
    const order: SpectralId[] = ["K", "G", "F", "A", "B", "O"];
    for (let i = 1; i < order.length; i++) expect(SPECTRAL[order[i]].life).toBeGreaterThan(SPECTRAL[order[i - 1]].life);
  });

  test("black hole: keeps its distance from the cloud, never touches gas, fires jets that kill", () => {
    const g = new StarForm(15);
    g.obstacles.length = 0;
    g.cloud.invuln = 9999;
    g.cloud.mass = 60;
    g.cloud.comp = 1;
    g.detonate();
    const bh = g.remnants.find((r) => r.type === "O")!;
    g.gas.length = 0;
    for (let i = 0; i < 6; i++) g.gas.push({ id: 7000 + i, x: 650 + i * 12, y: 150, vx: 0, vy: 0, age: 0, pulled: false });
    const gasPos = g.gas.map((q) => `${q.x},${q.y}`);
    let minGap = Infinity;
    let jets = 0;
    let by = 0;
    for (let i = 0; i < 60 * 6; i++) {
      // distant hazards in range for the jets, parked so only jets/pull can reach them
      if (i % 30 === 0) g.obstacles.push({ id: 980 + i, kind: "drifter", style: 0, planets: [], x: g.cloud.x - 330, y: g.cloud.y - 380 + (i % 90), vx: 0, vy: 0, r: 22, age: 0, warn: 0, heading: 0, phase: 0 });
      g.step();
      for (const e of g.drain()) {
        if (e.e === "jet") jets++;
        if (e.e === "kill" && e.by === "O") by++;
      }
      if (i > 60) minGap = Math.min(minGap, Math.hypot(bh.x - g.cloud.x, bh.y - g.cloud.y));
    }
    expect(jets).toBeGreaterThan(0);
    expect(by).toBeGreaterThan(2);
    expect(minGap).toBeGreaterThan(REMNANT.blackhole.minGap - 15);
    // gas is never pulled or removed by the hole (these wisps sit still, out of the cloud's reach)
    expect(g.gas.filter((q) => q.id >= 7000).map((q) => `${q.x},${q.y}`).sort()).toEqual([...gasPos].sort());
  });

  test("neutron star pulls hazards toward itself", () => {
    const g = new StarForm(16);
    g.obstacles.length = 0;
    g.cloud.invuln = 9999;
    g.cloud.mass = 32;
    g.cloud.comp = 1;
    g.detonate();
    const ns = g.remnants.find((r) => r.type === "B")!;
    ns.x = 200;
    ns.y = 200;
    g.cloud.x = 650;
    g.cloud.y = 850;
    g.input.tx = 650;
    g.input.ty = 850;
    const o = { id: 990, kind: "drifter" as const, style: 0, planets: [], x: 200 + 280, y: 200, vx: 0, vy: 0, r: 22, age: 0, warn: 0, heading: 0, phase: 0 };
    g.obstacles.push(o);
    const d0 = Math.hypot(o.x - ns.x, o.y - ns.y);
    g.step();
    const d1 = Math.hypot(o.x - ns.x, o.y - ns.y);
    // pulled in (the hunter also moves toward it, so the gap shrinks either way)
    expect(d1).toBeLessThan(d0 - 2);
  });

  test("steering speed does not depend on mass or run time", () => {
    const travel = (mass: number, warm: number) => {
      const g = new StarForm(8);
      g.obstacles.length = 0;
      g.cloud.invuln = 9999;
      g.cloud.mass = mass;
      g.cloud.comp = 0;
      for (let i = 0; i < warm; i++) {
        g.obstacles.length = 0;
        g.step();
      }
      g.cloud.x = 100;
      g.cloud.mass = mass;
      g.cloud.comp = 0;
      g.input.tx = 700;
      g.input.ty = g.cloud.y;
      g.input.compress = false;
      const x0 = g.cloud.x;
      for (let i = 0; i < 30; i++) g.step();
      return g.cloud.x - x0;
    };
    const a = travel(0, 0);
    expect(travel(55, 0)).toBeCloseTo(a, 5);
    expect(travel(0, 60 * 120)).toBeCloseTo(a, 5);
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
