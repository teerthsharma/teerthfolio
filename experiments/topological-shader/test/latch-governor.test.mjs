import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLatch } from "../../../lib/world/heat/latch.js";
import { makeGovernor } from "../../../lib/world/heat/governor.js";

// Thresholds are exact in Float32, so the boundary cases compare exact values.
const T = { lo: 0.25, hi: 0.75 };
const LIVE = 0;
const BAKED = 1;
const BAND = 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function one(latch, c, u = 0) {
  latch.step(Float32Array.of(c), u);
  return latch.type[0];
}

test("every cell starts LIVE", () => {
  assert.deepEqual([...makeLatch(5, T).type], [LIVE, LIVE, LIVE, LIVE, LIVE]);
});

test("default thresholds are 0.35 and 0.65", () => {
  assert.equal(one(makeLatch(1), 0.6), LIVE);
  assert.equal(one(makeLatch(1), 0.7), BAKED);
});

test("I4: a LIVE cell turns BAKED only when C is above the whole gap, and C at hi holds it", () => {
  const L = makeLatch(1, T);
  assert.equal(one(L, 0.75), LIVE);
  assert.equal(one(L, 0.8), BAKED);
});

test("I4: a BAKED cell turns LIVE only when C is below the whole gap, and C at lo holds it", () => {
  const L = makeLatch(1, T);
  one(L, 0.8);
  assert.equal(one(L, 0.25), BAND);
  assert.equal(one(L, 0.2), LIVE);
});

test("I4 over a random walk: every flip happens only after C has crossed the far threshold", () => {
  const next = rng(7);
  const L = makeLatch(64, T);
  const C = new Float32Array(64);
  let prev = new Uint8Array(64);
  let flips = 0;
  for (let t = 0; t < 2000; t++) {
    for (let v = 0; v < 64; v++) C[v] = next();
    const before = Float32Array.from(C);
    prev.set(L.type);
    L.step(C, 0);
    for (let v = 0; v < 64; v++) {
      if (prev[v] === LIVE && L.type[v] !== LIVE) {
        flips++;
        assert.ok(before[v] > T.hi, `LIVE to BAKED at C=${before[v]}`);
      }
      if (prev[v] !== LIVE && L.type[v] === LIVE) {
        flips++;
        assert.ok(before[v] < T.lo, `BAKED to LIVE at C=${before[v]}`);
      }
    }
  }
  assert.ok(flips > 1000);
});

test("hysteresis: C oscillating inside the gap never flips a LIVE cell", () => {
  const L = makeLatch(1, T);
  for (let t = 0; t < 1000; t++) assert.equal(one(L, t % 2 ? 0.7 : 0.3), LIVE);
});

test("hysteresis: C oscillating inside the gap never flips a BAKED cell back to LIVE", () => {
  const L = makeLatch(1, T);
  one(L, 0.9);
  for (let t = 0; t < 1000; t++) assert.equal(one(L, t % 2 ? 0.7 : 0.3), BAND);
});

test("the shift u moves both thresholds: C = 0.7 is BAKED at u = -0.1 and LIVE at u = 0", () => {
  assert.equal(one(makeLatch(1, T), 0.7, 0), LIVE);
  assert.equal(one(makeLatch(1, T), 0.7, -0.1), BAKED);
});

test("I7: a lower shift never adds a LIVE cell, at every step", () => {
  const next = rng(11);
  const n = 200;
  const hi = makeLatch(n, T);
  const lo = makeLatch(n, T);
  const C = new Float32Array(n);
  for (let t = 0; t < 300; t++) {
    const u = -0.5 * next();
    const uLow = u - 0.3 * next();
    for (let v = 0; v < n; v++) C[v] = next();
    hi.step(C, u);
    lo.step(C, uLow);
    for (let v = 0; v < n; v++) {
      if (lo.type[v] === LIVE) assert.equal(hi.type[v], LIVE, `cell ${v} at step ${t}`);
    }
  }
});

test("determinism: the same input gives the same types", () => {
  const run = () => {
    const next = rng(3);
    const L = makeLatch(50, T);
    const C = new Float32Array(50);
    const out = [];
    for (let t = 0; t < 200; t++) {
      for (let v = 0; v < 50; v++) C[v] = next();
      L.step(C, -0.05 * (t % 4));
      out.push(...L.type);
    }
    return out;
  };
  assert.deepEqual(run(), run());
});

test("u is never positive, from the first update on", () => {
  const next = rng(5);
  const g = makeGovernor({ stepS: 10 });
  assert.equal(g.update(40, 0), 0);
  for (let k = 1; k <= 2000; k++) assert.ok(g.update(60 * next(), k * 0.25) <= 0);
});

test("a governor under budget never moves u", () => {
  const g = makeGovernor({ stepS: 10 });
  for (let k = 0; k <= 240; k++) assert.equal(g.update(10, k * 0.25), 0);
});

test("over budget lowers u no sooner than stepS, and never raises it", () => {
  const g = makeGovernor({ stepS: 10 });
  const changes = [];
  let prev = 0;
  for (let k = 0; k <= 240; k++) {
    const t = k * 0.25;
    const u = g.update(50, t);
    if (u !== prev) changes.push({ t, u });
    assert.ok(u <= prev, "u rose");
    prev = u;
  }
  assert.equal(changes[0].t, 10);
  for (let i = 1; i < changes.length; i++) assert.ok(changes[i].t - changes[i - 1].t >= 10);
});

test("determinism: the same frame trace gives the same u trace", () => {
  const run = () => {
    const next = rng(9);
    const g = makeGovernor({ stepS: 10 });
    const out = [];
    for (let k = 0; k <= 800; k++) out.push(g.update(20 + 40 * next(), k * 0.25));
    return out;
  };
  assert.deepEqual(run(), run());
});
