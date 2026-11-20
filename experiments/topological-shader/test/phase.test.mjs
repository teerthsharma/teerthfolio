import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mulberry32 } from "../../topo-field/field.mjs";
import { makeHexGrid } from "../../../lib/world/heat/hexgrid.js";
import { GRID } from "../heat.mjs";
import {
  BARS, DELTA, NORM, barsOf, kappaFrom, lambdaFrom, edgesOfCsr, edgeShare, spearman, componentsAbove, lifetimes,
  knownAnswers, verdictT4,
} from "../phase.mjs";

const PREREG = readFileSync(new URL("../PREREGISTRATION-T4.md", import.meta.url), "utf8");
const near = (a, b, e = 1e-12) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const bar = (birth, death) => ({ birth, death });

test("every bar string occurs verbatim in PREREGISTRATION-T4.md, delta is 0.05", () => {
  for (const s of Object.values(BARS)) assert.ok(PREREG.includes(s), `missing: ${s}`);
  assert.equal(DELTA, 0.05);
  assert.equal(NORM, 2 * DELTA);
});

test("kappa on hand-built bars (reading 16)", () => {
  const f = Float64Array.from([1.0, 0.7, 0.72, 0.85]);
  const k = kappaFrom(f, [bar(1.0, 0.7)]);
  near(k[0], 0);
  near(k[1], 0);
  near(k[2], 0.02);
  near(k[3], 0.1);
  near(kappaFrom(Float64Array.from([0.5]), [bar(0.5, 0.46)])[0], 0.06);
  near(kappaFrom(Float64Array.from([0.3, 0.9]), [])[1], 0.1);
});

test("kappa uses the absolute persistence, so a hole bar (birth below death) acts like an H0 bar", () => {
  const f = Float64Array.from([0.7, 0.72]);
  const k = kappaFrom(f, [bar(0.7, 1.0)]);
  near(k[0], 0);
  near(k[1], 0.02);
});

test("a bar of persistence 0 never lowers kappa below 2 delta", () => {
  const k = kappaFrom(Float64Array.from([0.4, 0.45]), [bar(0.4, 0.4)]);
  near(k[0], 0.1);
  near(k[1], 0.1);
});

test("lambda: the tent of (1.0, 0.7), N = 2 delta; a bar under delta is ignored, one of exactly delta counts", () => {
  const f = Float64Array.from([0.85, 0.7, 1.0, 0.5, 1.2, 0.775]);
  const L = lambdaFrom(f, [bar(1.0, 0.7)]);
  near(L[0], 0.15 / NORM);
  near(L[1], 0);
  near(L[2], 0);
  near(L[3], 0);
  near(L[4], 0);
  near(L[5], 0.075 / NORM);
  assert.equal(lambdaFrom(Float64Array.from([0.5]), [bar(0.53, 0.5)])[0], 0);
  assert.ok(lambdaFrom(Float64Array.from([0.625]), [bar(0.75, 0.5)], 0.25)[0] > 0, "persistence exactly delta counts");
  assert.equal(lambdaFrom(Float64Array.from([0.625]), [bar(0.74, 0.5)], 0.25)[0], 0, "persistence below delta is ignored");
  near(lambdaFrom(Float64Array.from([0.85]), [bar(1.0, 0.7), bar(0.9, 0.8)])[0], 0.15 / NORM, 1e-12);
  near(lambdaFrom(Float64Array.from([0.7]), [bar(0.7, 1.0)])[0], 0);
});

test("barsOf concatenates the H0 and hole bars of critical.mjs", () => {
  const f = Float64Array.from({ length: GRID.n }, (_, i) => Math.exp(-((GRID.x[i] + 20) ** 2 + GRID.z[i] ** 2) / 200) + 0.8 * Math.exp(-((GRID.x[i] - 20) ** 2 + GRID.z[i] ** 2) / 200));
  assert.ok(barsOf(f).filter((b) => Math.abs(b.birth - b.death) > 0.5).length >= 1);
});

test("single bump and two bumps known answers", () => {
  const k = knownAnswers();
  for (const [name, ok] of Object.entries(k.checks)) assert.ok(ok, name);
  assert.ok(k.ok);
});

test("edges: the lib CSR has 4,698 undirected edges, i < j, and the experiment grid has the same set", () => {
  const lib = makeHexGrid(84, 4);
  const e = edgesOfCsr(lib.adj.offsets, lib.adj.indices);
  assert.equal(e.length / 2, 4698);
  for (let k = 0; k < e.length; k += 2) assert.ok(e[k] < e[k + 1]);
  assert.deepEqual(e, edgesOfCsr(GRID.off, GRID.adj));
});

test("edgeShare counts a difference strictly above delta", () => {
  const e = Int32Array.from([0, 1, 1, 2, 2, 3, 0, 3]);
  const k = Float64Array.from([0, 0.0501, 0.0501, 0.1]);
  assert.equal(edgeShare(k, e, 0.05), 0.5);
  assert.equal(edgeShare(Float64Array.from([0, 0.05, 0.05, 0.1]), e, 0.05), 0.25);
});

test("kappa is 1-Lipschitz across edges of a random field (property)", () => {
  const rng = mulberry32(5);
  const f = Float64Array.from({ length: GRID.n }, () => rng());
  const k = kappaFrom(f, barsOf(f));
  const e = edgesOfCsr(GRID.off, GRID.adj);
  for (let q = 0; q < e.length; q += 2) assert.ok(Math.abs(k[e[q]] - k[e[q + 1]]) <= Math.abs(f[e[q]] - f[e[q + 1]]) + 1e-12);
});

test("spearman: monotone 1, reversed -1, the tied case 0.9487, a constant variable is undefined", () => {
  near(spearman([1, 2, 3, 4], [10, 20, 30, 40]).rho, 1);
  near(spearman([1, 2, 3, 4], [4, 3, 2, 1]).rho, -1);
  const t = spearman([1, 2, 2, 3], [1, 3, 2, 4]);
  near(t.rho, 4.5 / Math.sqrt(22.5), 1e-12);
  assert.equal(t.defined, true);
  assert.equal(spearman([1, 1, 1], [1, 2, 3]).defined, false);
  assert.equal(spearman([1, 2, 3], [5, 5, 5]).defined, false);
  near(spearman([1, 2, 3, 4], [1, 4, 2, 3]).rho, 0.4, 1e-12);
});

test("componentsAbove: the set {Hn >= 0.20} is inclusive and uses the 6-adjacency", () => {
  const Hn = new Float64Array(GRID.n);
  const c = GRID.n >> 1;
  Hn[c] = 0.2;
  Hn[GRID.adj[GRID.off[c]]] = 0.2;
  Hn[0] = 0.1999;
  const r = componentsAbove(Hn, 0.2);
  assert.equal(r.k, 1);
  assert.equal(r.labels[c], 0);
  assert.equal(r.labels[0], -1);
});

const seq = (rows) => rows.map((r) => Int32Array.from(r));
const ksOf = (L) => L.map((a) => a.reduce((m, v) => Math.max(m, v + 1), 0));

test("lifetimes: a blob alive for samples 0 to 4 has life 4, 3, 2, 1, 0 and does not reach the end", () => {
  const L = seq([[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [-1, -1, -1]]);
  const r = lifetimes(L, ksOf(L), 3);
  assert.deepEqual(r.life.map((a) => a[0] ?? null), [4, 3, 2, 1, 0, null]);
  assert.ok(r.reaches.slice(0, 5).every((a) => a[0] === 0));
  assert.equal(r.deaths, 1);
});

test("lifetimes: two blobs that merge keep both lives; a blob alive at the last sample reaches the end", () => {
  const L = seq([[0, 0, 1], [0, 0, 0], [0, 0, 0], [-1, -1, -1]]);
  const r = lifetimes(L, ksOf(L), 3);
  assert.deepEqual([...r.life[0]], [2, 2]);
  assert.deepEqual([r.life[1][0], r.life[2][0]], [1, 0]);
  const E = seq([[0, 0], [0, 0], [0, 0]]);
  const re = lifetimes(E, [1, 1, 1], 2);
  assert.deepEqual(re.life.map((a) => a[0]), [2, 1, 0]);
  assert.deepEqual(re.reaches.map((a) => a[0]), [1, 1, 1]);
  assert.equal(re.deaths, 0);
});

test("lifetimes: a split takes the longest branch", () => {
  const L = seq([[0, 0, 0, 0], [0, 0, 1, 1], [-1, -1, 0, 0], [-1, -1, -1, -1]]);
  const r = lifetimes(L, ksOf(L), 4);
  assert.deepEqual([...r.life[1]], [0, 1]);
  assert.equal(r.life[0][0], 2);
  assert.equal(r.deaths, 2);
});

test("verdict: VOID first; strict bars at 0.10 and 0.3; a non-finite correlation is DEAD", () => {
  const ok = { gateOk: true, plateShares: Array(8).fill(0.05), roamRhos: Array(30).fill(0.5) };
  assert.equal(verdictT4({ ...ok, gateOk: false, plateShares: Array(8).fill(0.9) }).verdict, "VOID");
  assert.deepEqual([verdictT4(ok).L2, verdictT4(ok).L3], ["SURVIVES", "SURVIVES"]);
  assert.equal(verdictT4({ ...ok, plateShares: [0.05, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] }).L2, "SURVIVES");
  assert.equal(verdictT4({ ...ok, plateShares: [0.05, 0.1000001, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] }).L2, "DEAD");
  assert.equal(verdictT4({ ...ok, roamRhos: [...Array(29).fill(0.9), 0.3] }).L3, "SURVIVES");
  assert.equal(verdictT4({ ...ok, roamRhos: [...Array(29).fill(0.9), 0.2999] }).L3, "DEAD");
  assert.equal(verdictT4({ ...ok, roamRhos: [...Array(29).fill(0.9), NaN] }).L3, "DEAD");
  const both = verdictT4({ ...ok, plateShares: Array(8).fill(0.5), roamRhos: Array(30).fill(0) });
  assert.equal(both.verdict, "L2 DEAD, L3 DEAD");
});
