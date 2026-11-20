import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mulberry32 } from "../../topo-field/field.mjs";
import { h0Superlevel } from "../../../lib/anime/topology.js";
import { GRID } from "../heat.mjs";
import { BARS, classify, h0Bars, holeBars, holesAt, detectorHoles, thresholds, links } from "../critical.mjs";

const PREREG = readFileSync(new URL("../PREREGISTRATION-T2.md", import.meta.url), "utf8");
const n = GRID.n;
const field = (fn) => Float64Array.from({ length: n }, (_, i) => fn(GRID.x[i], GRID.z[i]));
const gauss = (cx, cz, s, a = 1) => (x, z) => a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
const nearest = (x0, z0) => {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(GRID.x[i] - x0, GRID.z[i] - z0);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};

test("every bar string occurs verbatim in PREREGISTRATION-T2.md", () => {
  for (const s of Object.values(BARS)) assert.ok(PREREG.includes(s), `missing: ${s}`);
});

test("cyclic links: 6 for interior cells, 7 (with the cone vertex) for the 144 border cells", () => {
  const L = links();
  let border = 0;
  for (let i = 0; i < n; i++) {
    if (GRID.border[i]) { border++; assert.ok(L[i].includes(-1)); assert.equal(L[i].length, GRID.deg[i] + 1); } else assert.equal(L[i].length, 6);
  }
  assert.equal(border, 144);
});

test("a single Gaussian bump: 1 maximum, no saddle, Banchoff sum 2, no hole, no finite H0 bar", () => {
  const f = field(gauss(0, 0, 14));
  const c = classify(f);
  assert.deepEqual([c.maxima, c.saddles, c.saddleMult, c.minima, c.banchoff], [1, 0, 0, 1, 2]);
  assert.equal(h0Bars(f).length, 0);
  for (const t of thresholds(f)) assert.equal(holesAt(holeBars(f), t), 0);
});

test("two bumps: 2 maxima, 1 saddle, one finite H0 bar from the lower peak to the saddle", () => {
  const f = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.8)(x, z));
  const c = classify(f);
  assert.deepEqual([c.maxima, c.saddles, c.saddleMult, c.banchoff], [2, 1, 1, 2]);
  const bars = h0Bars(f);
  assert.equal(bars.length, 1);
  assert.equal(bars[0].birth, f[nearest(20, 0)]);
  assert.ok(bars[0].death < bars[0].birth && bars[0].death > 0);
  assert.equal(c.type[nearest(0, 0)] === 3, true);
});

test("a ring ridge encloses exactly one hole at half height, in the dual sweep and in holeLabels", () => {
  const f = field((x, z) => Math.exp(-((Math.hypot(x, z) - 40) ** 2) / (2 * 6 * 6)));
  assert.equal(classify(f).banchoff, 2);
  const bars = holeBars(f);
  assert.equal(holesAt(bars, 0.5), 1);
  assert.equal(detectorHoles(f, 0.5), 1);
  assert.equal(holesAt(bars, 1e-12), 0);
  assert.equal(detectorHoles(f, 1e-12), 0);
  for (const t of thresholds(f)) assert.equal(holesAt(bars, t), detectorHoles(f, t));
});

test("a saddle: two equal bumps leave a saddle of multiplicity 1 at the origin cell", () => {
  const f = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10)(x, z));
  const c = classify(f);
  assert.deepEqual([c.maxima, c.saddles, c.saddleMult, c.banchoff], [2, 1, 1, 2]);
  const o = nearest(0, 0);
  assert.equal(c.type[o], 3);
  assert.equal(c.mult[o], 1);
});

test("a monkey saddle f = x^3 - 3 x z^2: the origin cell has multiplicity 2 and the sum is 2", () => {
  const f = field((x, z) => x ** 3 - 3 * x * z * z);
  const c = classify(f);
  const o = nearest(0, 0);
  assert.equal(c.type[o], 3);
  assert.equal(c.mult[o], 2);
  assert.equal(c.banchoff, 2);
});

test("tie order: a constant field has maxima only where every neighbour has a larger id, and the identities hold", () => {
  const f = new Float64Array(n).fill(0.25);
  const c = classify(f);
  assert.equal(c.banchoff, 2);
  assert.equal(c.type[0], 1);
  assert.equal(h0Bars(f).length, c.maxima - 1);
  assert.equal(h0Superlevel(f, GRID).pairs.length, 0);
  assert.equal(holesAt(holeBars(f), 0.25), 0);
});

test("random fields: Banchoff 2, bars = maxima - 1, positive bars equal h0Superlevel, dual holes equal holeLabels", () => {
  const rng = mulberry32(99);
  for (let k = 0; k < 8; k++) {
    const f = Float64Array.from({ length: n }, () => rng());
    const c = classify(f);
    assert.equal(c.banchoff, 2);
    const bars = h0Bars(f);
    assert.equal(bars.length, c.maxima - 1);
    const pos = bars.filter((b) => b.birth > b.death).map((b) => [b.birth, b.death]);
    const ref = h0Superlevel(f, GRID).pairs.map((p) => [p.birth, p.death]);
    const key = (a, b) => a[0] - b[0] || a[1] - b[1];
    assert.deepEqual(pos.sort(key), ref.sort(key));
    const hb = holeBars(f);
    for (const t of thresholds(f)) assert.equal(holesAt(hb, t), detectorHoles(f, t));
  }
});

test("random smooth fields with plateaus of exact zeros keep every identity", () => {
  const f = field((x, z) => Math.max(0, gauss(-20, 10, 8)(x, z) + gauss(25, -5, 6, 0.7)(x, z) - 0.3));
  const c = classify(f);
  assert.equal(c.banchoff, 2);
  assert.equal(h0Bars(f).length, c.maxima - 1);
  const hb = holeBars(f);
  for (const t of thresholds(f)) assert.equal(holesAt(hb, t), detectorHoles(f, t));
});

test("K4 field: the dual sweep and holeLabels both see 0 holes at frame 99 and 1 at frame 100", () => {
  const c = (frame) => field((x, z) => { const r = Math.hypot(x, z); return frame >= 100 && r <= 6 ? 1 : r < 30 ? 0 : 1; });
  for (const [frame, want] of [[99, 0], [100, 1]]) {
    const f = c(frame).map((v) => -v);
    assert.equal(holesAt(holeBars(f), -0.35), want);
    assert.equal(detectorHoles(f, -0.35), want);
  }
});
