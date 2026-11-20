import { test } from "node:test";
import assert from "node:assert/strict";
import { explainedMass, median, sampleMedian, permutePlates } from "../explain.mjs";
import { knownAnswerGate } from "../verdict.mjs";

const v = (...xs) => Float64Array.from(xs);

test("a plate equal to the heat explains all of it", () => {
  const Hn = v(0.2, 0.6, 1, 0);
  assert.ok(Math.abs(explainedMass(Hn, [Hn]) - 1) < 1e-12);
});

test("a plate on disjoint cells explains none of it", () => {
  assert.equal(explainedMass(v(0.5, 0.5, 0, 0), [v(0, 0, 1, 1)]), 0);
});

test("the weight is clamped to 1, so a smaller plate explains what it covers and no more", () => {
  const Hn = v(0.5, 0.5);
  assert.ok(Math.abs(explainedMass(Hn, [v(0.25, 0.25)]) - 0.5) < 1e-12);
  assert.ok(Math.abs(explainedMass(v(1, 0), [v(0.5, 0.5)]) - 0.5) < 1e-12);
});

test("a uniform plate explains the heat up to its mean", () => {
  const Hn = v(0, 0.5, 1, 0.5);
  const one = v(1, 1, 1, 1);
  const mean = 0.5;
  const expect = 1 - (0.5 * 0 + 0 + 0.5 + 0) / 2;
  assert.ok(Math.abs(explainedMass(Hn, [one]) - expect) < 1e-12, `${explainedMass(Hn, [one])} vs ${expect} (mean ${mean})`);
});

test("sample medians skip samples with no heat and use the mean of the middle pair", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  const samples = [v(0, 0), v(1, 0), v(0.5, 0.5)];
  assert.equal(sampleMedian(samples, [v(1, 0)]), median([1, explainedMass(v(0.5, 0.5), [v(1, 0)])]));
});

test("permuting plate cells lowers the explanation of a non-uniform walk", () => {
  const Hn = v(1, 0, 0, 0, 0, 0, 0, 0);
  const plate = [v(1, 0, 0, 0, 0, 0, 0, 0)];
  const perm = Int32Array.from([3, 4, 5, 6, 7, 0, 1, 2]);
  assert.equal(explainedMass(Hn, plate), 1);
  assert.equal(explainedMass(Hn, permutePlates(plate, perm)), 0);
});

test("the known-answer gate passes only when the walk is explained and the permutation loses at least 0.2", () => {
  const Hn = v(1, 0.2, 0, 0);
  const plates = [v(1, 0.2, 0, 0)];
  const perm = Int32Array.from([2, 3, 0, 1]);
  const ok = knownAnswerGate([Hn], plates, perm);
  assert.equal(ok.xWalk, 1);
  assert.ok(ok.xWalk - ok.xPerm >= 0.2);
  assert.equal(ok.ok, true);
  const bad = knownAnswerGate([v(0, 0, 1, 1)], plates, perm);
  assert.equal(bad.ok, false);
});
