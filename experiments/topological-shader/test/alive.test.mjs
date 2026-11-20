import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mulberry32 } from "../../topo-field/field.mjs";
import { GRID, liveSamples } from "../heat.mjs";
import { roamWalk, ticksOf } from "../library.mjs";
import { classify } from "../critical.mjs";
import { BARS, DELTA, survivors, aliveShare, permuteField, verdictT3 } from "../alive.mjs";

const PREREG = readFileSync(new URL("../PREREGISTRATION-T3.md", import.meta.url), "utf8");
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

test("every bar string occurs verbatim in PREREGISTRATION-T3.md", () => {
  for (const s of Object.values(BARS)) assert.ok(PREREG.includes(s), `missing: ${s}`);
  assert.equal(DELTA, 0.05);
});

test("a single Gaussian bump: one surviving cell, the interior maximum, share exactly 7/1615", () => {
  const f = field(gauss(0, 0, 14));
  const s = survivors(f);
  assert.equal(s.count, 1);
  assert.equal(s.max, 1);
  assert.equal(s.mask[nearest(0, 0)], 1);
  assert.equal(aliveShare(f).share, 7 / n);
  assert.equal(s.unmatched, 0);
});

test("two bumps: 2 maxima and 1 saddle survive, disjoint one-rings, share exactly 21/1615", () => {
  const f = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.8)(x, z));
  const s = survivors(f);
  assert.deepEqual([s.count, s.max, s.saddle, s.min], [3, 2, 1, 0]);
  assert.equal(aliveShare(f).share, 21 / n);
});

test("a second bump of height 0.03 is below the 0.05 filter and does not survive", () => {
  const f = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.03)(x, z));
  assert.ok(classify(f).maxima >= 2, "the small peak is still a critical maximum");
  const s = survivors(f);
  assert.equal(s.count, 1);
  assert.equal(aliveShare(f).share, 7 / n);
});

test("a ring ridge: the enclosed minimum survives through its hole bar", () => {
  const f = field((x, z) => Math.exp(-((Math.hypot(x, z) - 40) ** 2) / (2 * 6 * 6)));
  const s = survivors(f);
  assert.ok(s.min >= 1);
  const c = nearest(0, 0);
  let mins = 0;
  for (let i = 0; i < n; i++) if (s.mask[i] && s.type[i] === 2 && Math.hypot(GRID.x[i], GRID.z[i]) < 8) mins++;
  assert.equal(mins, 1, `one surviving minimum near the origin (cell ${c})`);
  assert.ok(s.maxPersistence.min > 0.5);
});

test("a constant field has share 0 and no surviving cell", () => {
  const f = new Float64Array(n).fill(0.3);
  assert.equal(survivors(f).count, 0);
  assert.equal(aliveShare(f).share, 0);
});

test("the permuted single bump gives at least 3 times the real share", () => {
  const f = field(gauss(0, 0, 14));
  const rng = mulberry32(10000);
  const g = permuteField(f, rng);
  assert.notDeepEqual(Array.from(g), Array.from(f));
  assert.deepEqual(Array.from(g).sort(), Array.from(f).sort());
  assert.ok(aliveShare(g).share >= 3 * aliveShare(f).share);
});

test("a bar cell that is not critical is impossible: unmatched is 0 on 40 random fields and 5 D5 samples", () => {
  for (let i = 0; i < 40; i++) {
    const rng = mulberry32(i + 1);
    assert.equal(survivors(Float64Array.from({ length: n }, () => rng())).unmatched, 0);
  }
  const S = liveSamples(ticksOf(roamWalk(1)));
  for (const k of [5, 17, 29, 41, 53]) assert.equal(survivors(S[k]).unmatched, 0);
});

test("the persistence filter lowers the share: delta 0 marks at least as much as delta 0.05", () => {
  const rng = mulberry32(3);
  const f = Float64Array.from({ length: n }, () => rng());
  assert.ok(aliveShare(f, 0).share >= aliveShare(f).share);
  assert.ok(aliveShare(f, 0).share > aliveShare(f).share);
});

test("verdict: VOID, then DEAD, then PASS, else UNRESOLVED", () => {
  const bed = (med, ctrl) => ({ median: med, control: ctrl });
  const ok = Array.from({ length: 31 }, () => bed(0.05, 0.4));
  assert.equal(verdictT3({ gateOk: true, beds: ok }).verdict, "PASS");
  assert.equal(verdictT3({ gateOk: false, beds: ok }).verdict, "VOID");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.2501, 0.9)] }).verdict, "DEAD");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.25, 0.9)] }).verdict, "UNRESOLVED");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.1, 0.31)] }).verdict, "PASS");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.1001, 0.9)] }).verdict, "UNRESOLVED");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.05, 0.14)] }).verdict, "UNRESOLVED");
  assert.equal(verdictT3({ gateOk: true, beds: [...ok.slice(1), bed(0.3, 0.1)] }).verdict, "DEAD");
});
