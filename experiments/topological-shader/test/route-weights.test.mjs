import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRouteWeights } from "../../../lib/world/heat/route-weights.js";

// Readings are numbered in PREREGISTRATION-D10.md.
const N = 8;
const M = 4;
const g = { n: N };
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

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

// Plate k lights cells 2k and 2k+1 with value 1.
function plates(m = M, n = N) {
  const legs = [];
  for (let k = 0; k < m; k++) {
    const heat = new Array(n).fill(0);
    heat[(2 * k) % n] = 1;
    heat[(2 * k + 1) % n] = 1;
    legs.push({ id: `L${k}`, from: "a", to: "b", lengthM: 10, heat });
  }
  return { version: 1, grid: { R: 84, h: 4, n }, legs };
}

const f32 = (...xs) => Float32Array.from(xs);
const ones = () => new Float32Array(N).fill(1);
// Hn that is plate k scaled by s
function hnOf(k, s) {
  const h = new Float32Array(N);
  h[2 * k] = s;
  h[2 * k + 1] = s;
  return h;
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
// Advance the gate with zero heat on the proxy count, M absent.
function pastGate(rw) {
  for (let i = 0; i < 80; i++) rw.observe(ones(), new Float32Array(N), i);
}

test("reading 10: the plate object is validated", () => {
  assert.throws(() => makeRouteWeights({ ...plates(), version: 2 }, g));
  assert.throws(() => makeRouteWeights(plates(M, N + 1), g));
  assert.throws(() => makeRouteWeights({ ...plates(), legs: [] }, g));
  const bad = plates();
  bad.legs[1].heat.pop();
  assert.throws(() => makeRouteWeights(bad, g));
});

test("D6: w_k is the clamped projection of Hn on plate k, each plate on its own", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), hnOf(2, 0.5), 0, 100);
  near(rw.w[2], 0.5);
  near(rw.w[0], 0);
  near(rw.w[1], 0);
  near(rw.w[3], 0);
  rw.observe(ones(), hnOf(2, 3), 1, 100);
  near(rw.w[2], 1);
});

test("reading 11: a plate with no mass has weight 0", () => {
  const p = plates();
  p.legs[3].heat.fill(0);
  const rw = makeRouteWeights(p, g);
  rw.observe(ones(), new Float32Array(N).fill(0.4), 0, 100);
  assert.equal(rw.w[3], 0);
});

test("D6, I8: e is 1 where there is no heat and in [0,1] on random fields", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), new Float32Array(N), 0, 100);
  assert.equal(rw.e, 1);
  assert.deepEqual([...rw.eCell], new Array(N).fill(1));
  const r = rng(5);
  for (let i = 0; i < 200; i++) {
    const hn = new Float32Array(N).map(() => (r() < 0.3 ? 0 : r()));
    rw.observe(ones(), hn, i, 100);
    assert.ok(rw.e >= 0 && rw.e <= 1, `e ${rw.e}`);
    for (const x of rw.eCell) assert.ok(x >= 0 && x <= 1);
    for (const x of rw.w) assert.ok(x >= 0 && x <= 1);
  }
});

test("D6: a field made of one plate is fully explained; a disjoint field is not", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), hnOf(1, 0.7), 0, 100);
  near(rw.e, 1);
  const hn = hnOf(1, 0.7);
  hn[0] = 0.7;
  rw.observe(ones(), hn, 1, 100);
  // plate 0 takes w 0.35 from the 0.7 on cell 0, so 0.35 of the 2.1 mass stays unexplained
  near(rw.e, 1 - 0.35 / 2.1);
  near(rw.eCell[0], 0.5);
  near(rw.eCell[2], 1);
});

test("D6: e uses eps0 = 1/255 as the floor of the denominator", () => {
  const rw = makeRouteWeights(plates(3), g);
  const hn = new Float32Array(N);
  hn[7] = 0.001;
  rw.observe(ones(), hn, 0, 100);
  near(rw.eCell[7], 1 - 0.001 * 255, 1e-6);
});

test("D3: the control input is min(c, e) and neither input is written", () => {
  const rw = makeRouteWeights(plates(), g);
  const c = f32(0.9, 0.2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9);
  const hn = hnOf(1, 0.7);
  hn[0] = 0.7;
  const cCopy = Float32Array.from(c);
  const hCopy = Float32Array.from(hn);
  const out = rw.observe(c, hn, 0, 100);
  assert.equal(out, rw.C);
  for (let v = 0; v < N; v++) near(out[v], Math.min(c[v], rw.eCell[v]));
  near(out[0], 0.5);
  near(out[1], 0.2);
  near(out[2], 0.9);
  assert.deepEqual([...c], [...cCopy]);
  assert.deepEqual([...hn], [...hCopy]);
});

test("gate: the first 80 samples hold w = 0, e = 0 and C = 0 (all LIVE), the 81st does not", () => {
  const rw = makeRouteWeights(plates(), g);
  for (let i = 0; i < 80; i++) {
    const C = rw.observe(ones(), hnOf(1, 0.9), i);
    assert.deepEqual([...rw.w], [0, 0, 0, 0], `sample ${i}`);
    assert.equal(rw.e, 0);
    assert.deepEqual([...C], new Array(N).fill(0));
    assert.deepEqual(rw.pick(), [0, 1]);
  }
  const C = rw.observe(ones(), hnOf(1, 0.9), 80);
  near(rw.w[1], 0.9);
  assert.ok(C.some((x) => x > 0));
});

test("gate: an explicit M below 80 gates and M at 80 opens it, whatever the sample count", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), hnOf(1, 0.9), 0, 79.9);
  assert.deepEqual([...rw.w], [0, 0, 0, 0]);
  rw.observe(ones(), hnOf(1, 0.9), 1, 80);
  near(rw.w[1], 0.9);
});

test("gate: a gated sample frees the slots", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), hnOf(2, 0.9), 0, 100);
  assert.deepEqual(rw.pick()[0], 2);
  rw.observe(ones(), hnOf(2, 0.9), 1, 10);
  assert.deepEqual(rw.pick(), [0, 1]);
});

test("D10: pick returns two distinct valid indices on random weights", () => {
  const rw = makeRouteWeights(plates(8, 16), { n: 16 });
  const r = rng(11);
  for (let i = 0; i < 300; i++) {
    const hn = new Float32Array(16).map(() => r());
    rw.observe(new Float32Array(16).fill(1), hn, i, 100);
    const [a, b] = rw.pick();
    assert.notEqual(a, b);
    for (const k of [a, b]) assert.ok(Number.isInteger(k) && k >= 0 && k < 8);
  }
});

test("D10: the pick is the highest-w latched plate, ties to the lower index", () => {
  const rw = makeRouteWeights(plates(), g);
  const hn = new Float32Array(N);
  hn.set(hnOf(3, 0.9));
  hn[0] = 0.8;
  hn[1] = 0.8;
  rw.observe(ones(), hn, 0, 100);
  assert.deepEqual(rw.pick(), [3, 0]);
  const tie = new Float32Array(N);
  for (const k of [1, 2]) {
    tie[2 * k] = 0.9;
    tie[2 * k + 1] = 0.9;
  }
  const rw2 = makeRouteWeights(plates(), g);
  rw2.observe(ones(), tie, 0, 100);
  assert.deepEqual(rw2.pick(), [1, 2]);
});

test("D10: latch hysteresis on w_k, a plate enters above wHi, stays through the gap, leaves below wLo", () => {
  const rw = makeRouteWeights(plates(), g, { wLo: 0.25, wHi: 0.75 });
  const at = (k, s) => rw.observe(ones(), hnOf(k, s), 0, 100);
  at(0, 0.75);
  assert.equal(rw.latched[0], 0, "w at wHi does not enter (strict)");
  at(0, 0.8);
  assert.equal(rw.latched[0], 1);
  assert.equal(rw.pick()[0], 0);
  at(0, 0.5);
  assert.equal(rw.latched[0], 1, "held in the gap");
  at(0, 0.25);
  assert.equal(rw.latched[0], 1, "w at wLo does not release (strict)");
  at(0, 0.2);
  assert.equal(rw.latched[0], 0);
});

test("defaults: the w latch uses 0.35 and 0.65 (reading 1)", () => {
  const rw = makeRouteWeights(plates(), g);
  const at = (s) => rw.observe(ones(), hnOf(0, s), 0, 100);
  at(0.6);
  assert.equal(rw.latched[0], 0);
  at(0.7);
  assert.equal(rw.latched[0], 1);
  at(0.4);
  assert.equal(rw.latched[0], 1);
  at(0.3);
  assert.equal(rw.latched[0], 0);
});

test("D10: a plate holds its slot through the gap, and a freed slot goes to a plate above wHi", () => {
  const rw = makeRouteWeights(plates(), g);
  const two = (a, sa, b, sb) => {
    const h = new Float32Array(N);
    h[2 * a] = h[2 * a + 1] = sa;
    h[2 * b] = h[2 * b + 1] = sb;
    return h;
  };
  rw.observe(ones(), two(0, 0.7, 1, 0.8), 0, 100);
  assert.deepEqual(rw.pick(), [1, 0], "plate 1 has the larger w and fills slot A first");
  rw.observe(ones(), two(0, 0.5, 1, 0.5), 1, 100);
  assert.deepEqual(rw.pick(), [1, 0], "both stay in the gap");
  rw.observe(ones(), two(2, 1, 0, 0.5), 2, 100);
  assert.equal(rw.latched[1], 0);
  assert.deepEqual(rw.pick(), [2, 0], "plate 1 left, plate 2 (w 1) takes its slot, plate 0 holds the other at w 0.5");
});

test("D10: when a slot releases, the best waiting latched plate takes it", () => {
  const rw = makeRouteWeights(plates(), g);
  const h = (...pairs) => {
    const x = new Float32Array(N);
    for (const [k, s] of pairs) x[2 * k] = x[2 * k + 1] = s;
    return x;
  };
  rw.observe(ones(), h([0, 0.9], [1, 0.9], [2, 0.7], [3, 0.8]), 0, 100);
  assert.deepEqual(rw.pick(), [0, 1], "two slots, ties to the lower index");
  assert.equal(rw.latched[2], 1);
  assert.equal(rw.latched[3], 1);
  rw.observe(ones(), h([0, 0.2], [1, 0.9], [2, 0.7], [3, 0.8]), 1, 100);
  assert.deepEqual(rw.pick(), [3, 1], "slot A released plate 0 and takes the best waiting plate, 3");
});

test("D10: with no latched plate the return fills by w then index and leaves the state alone", () => {
  const rw = makeRouteWeights(plates(), g);
  rw.observe(ones(), hnOf(2, 0.3), 0, 100);
  assert.equal(rw.latched[2], 0);
  assert.deepEqual(rw.pick(), [2, 0]);
  rw.observe(ones(), hnOf(2, 0.7), 1, 100);
  assert.deepEqual(rw.pick(), [2, 0]);
  assert.equal(rw.latched[2], 1);
});

test("determinism: the same inputs give the same state, and the input plates may be mutated afterwards", () => {
  const p = plates();
  const a = makeRouteWeights(p, g);
  const b = makeRouteWeights(plates(), g);
  const r1 = rng(3);
  const r2 = rng(3);
  for (let i = 0; i < 200; i++) {
    const h1 = new Float32Array(N).map(() => r1());
    const h2 = new Float32Array(N).map(() => r2());
    if (i === 5) p.legs.forEach((l) => l.heat.fill(9));
    a.observe(ones(), h1, i);
    b.observe(ones(), h2, i);
    assert.deepEqual([...a.w], [...b.w]);
    assert.deepEqual([...a.C], [...b.C]);
    assert.deepEqual(a.pick(), b.pick());
    assert.equal(a.e, b.e);
  }
});

test("no sum rule: weights are independent projections, so two overlapping plates can both be 1", () => {
  const p = plates();
  p.legs[1].heat = p.legs[0].heat.slice();
  const rw = makeRouteWeights(p, g);
  rw.observe(ones(), hnOf(0, 1), 0, 100);
  near(rw.w[0], 1);
  near(rw.w[1], 1);
  assert.ok(sum(rw.w) > 1);
});

test("pastGate helper sanity: after 80 empty samples weights respond", () => {
  const rw = makeRouteWeights(plates(), g);
  pastGate(rw);
  rw.observe(ones(), hnOf(0, 0.8), 80);
  near(rw.w[0], 0.8);
});
