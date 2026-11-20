// Known-answer tests for the hex grid, the component tracker and the persistence filter (L1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHexGrid } from '../hexgrid.mjs';
import { makeDetector, diffComponents } from '../cc.mjs';
import { h0Superlevel } from '../../../lib/anime/topology.js';

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

const G = makeHexGrid(84, 4);
const K1 = (x, z) => (Math.hypot(x, z) < 20 ? 0 : 1);
const ZERO = { birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0 };
const KEYS = Object.keys(ZERO);

function run(g, at, frames = 300) {
  const det = makeDetector(g);
  const c = new Float64Array(g.n);
  const raw = { ...ZERO }, simp = { ...ZERO };
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < g.n; i++) c[i] = at(i, f);
    const ev = det.step(c);
    for (const k of KEYS) { raw[k] += ev.raw[k]; simp[k] += ev.simp[k]; }
  }
  return { raw, simp };
}

function nearest(g, x0, z0) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < g.n; i++) {
    const d = Math.hypot(g.x[i] - x0, g.z[i] - z0);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function componentMins(g, c, inSet) {
  const seen = new Uint8Array(g.n);
  const mins = [];
  for (let s = 0; s < g.n; s++) {
    if (seen[s] || !inSet(c[s])) continue;
    let m = Infinity;
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop();
      m = Math.min(m, c[i]);
      for (let k = g.off[i]; k < g.off[i + 1]; k++) {
        const j = g.adj[k];
        if (!seen[j] && inSet(c[j])) { seen[j] = 1; stack.push(j); }
      }
    }
    mins.push(m);
  }
  return mins;
}

test('T0 geometry: cell counts at R=84 for h=2, 4, 8', () => {
  assert.equal(makeHexGrid(84, 2).n, 6409);
  assert.equal(makeHexGrid(84, 4).n, 1615);
  assert.equal(makeHexGrid(84, 8).n, 397);
});

test('T0 geometry: deg-6 neighbours at distance h, symmetric adjacency, border ring', () => {
  for (const h of [2, 4, 8]) {
    const g = makeHexGrid(84, h);
    let borders = 0;
    for (let i = 0; i < g.n; i++) {
      const deg = g.off[i + 1] - g.off[i];
      assert.equal(g.deg[i], deg);
      assert.equal(g.border[i], deg < 6 ? 1 : 0);
      if (g.border[i]) {
        borders++;
        assert.ok(Math.hypot(g.x[i], g.z[i]) >= 84 - h - 1e-9);
      }
      for (let k = g.off[i]; k < g.off[i + 1]; k++) {
        const j = g.adj[k];
        assert.notEqual(j, i);
        assert.ok(g.adj.subarray(g.off[j], g.off[j + 1]).includes(i));
        if (deg === 6) {
          assert.ok(Math.abs(Math.hypot(g.x[j] - g.x[i], g.z[j] - g.z[i]) - h) <= 1e-9);
        }
      }
    }
    assert.ok(borders > 0);
  }
});

test('T1 diffComponents: birth, death, continuation, merge, split, 2 to 2, zero-overlap move', () => {
  const n = 6;
  const d = (p, kp, c, kc) => diffComponents(Int32Array.from(p), kp, Int32Array.from(c), kc, n);
  const N = -1;
  assert.deepEqual(d([N, N, N, N, N, N], 0, [0, N, N, N, N, N], 1), { birth: 1, death: 0, merge: 0, split: 0 });
  assert.deepEqual(d([0, N, N, N, N, N], 1, [N, N, N, N, N, N], 0), { birth: 0, death: 1, merge: 0, split: 0 });
  assert.deepEqual(d([0, 0, N, N, N, N], 1, [N, 0, 0, N, N, N], 1), { birth: 0, death: 0, merge: 0, split: 0 });
  assert.deepEqual(d([0, 0, 1, 1, N, N], 2, [0, 0, 0, 0, N, N], 1), { birth: 0, death: 0, merge: 1, split: 0 });
  assert.deepEqual(d([0, 0, 0, 0, N, N], 1, [0, 0, 1, 1, N, N], 2), { birth: 0, death: 0, merge: 0, split: 1 });
  assert.deepEqual(d([0, 0, 1, 1, N, N], 2, [1, 0, 0, 1, N, N], 2), { birth: 0, death: 0, merge: 1, split: 1 });
  assert.deepEqual(d([0, N, N, N, N, N], 1, [N, N, N, 0, N, N], 1), { birth: 1, death: 1, merge: 0, split: 0 });
});

test('K1 static disc: no events', () => {
  const { raw, simp } = run(G, (i) => K1(G.x[i], G.z[i]));
  assert.deepEqual(raw, ZERO);
  assert.deepEqual(simp, ZERO);
});

test('K2 disc split by a slit at frame 100: exactly one split, no hole', () => {
  const at = (i, f) => (f >= 100 && Math.abs(G.x[i]) < 2.5 ? 1 : K1(G.x[i], G.z[i]));
  const { raw, simp } = run(G, at);
  assert.deepEqual(raw, { ...ZERO, split: 1 });
  assert.deepEqual(simp, { ...ZERO, split: 1 });
});

test('K3 smooth grow then shrink: no events', () => {
  const at = (i, f) => {
    const rho = 20 + 10 * Math.sin(Math.PI * f / 299);
    return Math.hypot(G.x[i], G.z[i]) < rho ? 0 : 1;
  };
  const { raw, simp } = run(G, at);
  assert.deepEqual(raw, ZERO);
  assert.deepEqual(simp, ZERO);
});

test('K4 baked island opens inside the disc at frame 100: exactly one hole-open', () => {
  const at = (i, f) => {
    const r = Math.hypot(G.x[i], G.z[i]);
    return f >= 100 && r <= 6 ? 1 : (r < 30 ? 0 : 1);
  };
  const { raw, simp } = run(G, at);
  assert.deepEqual(raw, { ...ZERO, holeOpen: 1 });
  assert.deepEqual(simp, { ...ZERO, holeOpen: 1 });
});

test('K6 persistence filter: blip at 0.30 is raw-only, 0.20 and 0.25 pass the filter', () => {
  const idx = nearest(G, 60, 0);
  const blipRun = (blip) => run(G, (i, f) => (i === idx ? (f >= 50 && f < 150 ? blip : 1) : K1(G.x[i], G.z[i])));
  const ev = { ...ZERO, birth: 1, death: 1 };

  const dip05 = blipRun(0.30);
  assert.deepEqual(dip05.raw, ev);
  assert.deepEqual(dip05.simp, ZERO);

  const dip15 = blipRun(0.20);
  assert.deepEqual(dip15.raw, ev);
  assert.deepEqual(dip15.simp, ev);

  const dip10 = blipRun(0.25);
  assert.deepEqual(dip10.raw, ev);
  assert.deepEqual(dip10.simp, ev);
});

test('K7 hysteresis: 0.30/0.60 oscillation makes no events; 0.30 to 0.70 to 0.30 makes one death and one birth', () => {
  const idx = nearest(G, 60, 0);
  const osc = run(G, (i, f) => (i === idx ? (f % 2 === 0 ? 0.30 : 0.60) : K1(G.x[i], G.z[i])));
  assert.deepEqual(osc.raw, ZERO);
  assert.deepEqual(osc.simp, ZERO);

  const hold = run(G, (i, f) => (i === idx ? (f >= 10 && f < 20 ? 0.70 : 0.30) : K1(G.x[i], G.z[i])), 30);
  assert.deepEqual(hold.raw, { ...ZERO, birth: 1, death: 1 });
  assert.deepEqual(hold.simp, ZERO);
});

test('det.live keeps its identity across calls', () => {
  const det = makeDetector(G);
  const live0 = det.live;
  const c = Float64Array.from(G.x, (x, i) => (Math.hypot(x, G.z[i]) < 20 ? 0 : 1));
  for (let f = 0; f < 5; f++) det.step(c);
  assert.equal(det.live, live0);
});

test('K8 persistence filter matches h0Superlevel on five seeds', () => {
  const g = makeHexGrid(84, 8);
  const live = (v) => v < 0.35;
  const cut = -0.35 + 0.10 - 1e-12;
  for (let seed = 1; seed <= 5; seed++) {
    const rng = mulberry32(seed);
    const c = Float64Array.from({ length: g.n }, () => rng());
    const bc = h0Superlevel(Float64Array.from(c, (v) => -v), g);
    const direct = componentMins(g, c, live).filter((m) => m <= 0.25 + 1e-12).length;
    const viaPairs = bc.pairs.filter((p) => p.death < -0.35 && p.birth >= cut).length + (bc.essential >= cut ? 1 : 0);
    assert.equal(direct, viaPairs);
  }
});
