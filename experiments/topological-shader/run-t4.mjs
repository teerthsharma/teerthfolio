// Runs T4, as pre-registered (PREREGISTRATION-T4.md), and writes out/t4.json and out/t4.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../topo-field/field.mjs";
import { diffComponents } from "../topo-field/cc.mjs";
import { makeHexGrid } from "../../lib/world/heat/hexgrid.js";
import { GRID, liveSamples } from "./heat.mjs";
import { roamWalk, tourWalk, ticksOf } from "./library.mjs";
import { median } from "./explain.mjs";
import { h0Bars, holeBars } from "./critical.mjs";
import { permuteField } from "./alive.mjs";
import {
  DELTA, barsOf, kappaFrom, lambdaFrom, edgesOfCsr, edgeShare, spearman, componentsAbove, lifetimes, knownAnswers, verdictT4,
} from "./phase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const n = GRID.n;
const t0 = performance.now();
const f4 = (x) => x.toFixed(4);

const file = JSON.parse(readFileSync(join(HERE, "..", "..", "public", "topo", "route-plates.json"), "utf8"));
const plates = file.legs.map((l) => Float64Array.from(l.heat));
const lib = makeHexGrid(84, 4);
const edges = edgesOfCsr(lib.adj.offsets, lib.adj.indices);
const experimentEdges = edgesOfCsr(GRID.off, GRID.adj);

const EPS = 0.01;
const perPlate = plates.map((f, k) => {
  const bars = barsOf(f);
  const kappa = kappaFrom(f, bars);
  const lambda = lambdaFrom(f, bars);
  const rng = mulberry32(100 + k);
  const g = Float64Array.from(f, (v) => v + (2 * rng() - 1) * EPS);
  const kg = kappaFrom(g, barsOf(g));
  let supMove = 0;
  for (let v = 0; v < n; v++) supMove = Math.max(supMove, Math.abs(kappa[v] - kg[v]));
  let lip = true;
  let maxEdge = 0;
  for (let q = 0; q < edges.length; q += 2) {
    const d = Math.abs(kappa[edges[q]] - kappa[edges[q + 1]]);
    if (d > Math.abs(f[edges[q]] - f[edges[q + 1]]) + 1e-12) lip = false;
    if (d > maxEdge) maxEdge = d;
  }
  const long = (bs) => bs.filter((b) => Math.abs(b.birth - b.death) >= DELTA).length;
  return {
    id: file.legs[k].id, share: edgeShare(kappa, edges), kappa, lambda, supMove, lip, maxEdge,
    kappaBelowCap: kappa.reduce((c, v) => c + (v < 2 * DELTA ? 1 : 0), 0) / n,
    maxBar: Math.max(0, ...bars.map((b) => Math.abs(b.birth - b.death))),
    longH0: long(h0Bars(f)), longHoles: long(holeBars(f)), lambdaCells: lambda.reduce((c, v) => c + (v > 0 ? 1 : 0), 0) / n,
  };
});

const gateKnown = knownAnswers();
const gateChecks = {
  ...gateKnown.checks,
  fileShape: file.version === 1 && file.grid.n === n && file.grid.R === 84 && file.grid.h === 4 && plates.length === 8 && plates.every((f) => f.length === n && Math.max(...f) === 1),
  sameEdgeSet: edges.length / 2 === 4698 && edges.length === experimentEdges.length && edges.every((v, i) => v === experimentEdges[i]),
  sameCells: lib.n === n && lib.xs.every((v, i) => v === GRID.x[i] && lib.zs[i] === GRID.z[i]),
  edgeBound: perPlate.every((p) => p.lip),
  supBound: perPlate.every((p) => p.supMove <= 4 * EPS + 1e-12),
};

const lambdaLib = new Float64Array(n);
for (const p of perPlate) for (let v = 0; v < n; v++) if (p.lambda[v] > lambdaLib[v]) lambdaLib[v] = p.lambda[v];

const beds = [{ name: "tour", b: 0, walk: tourWalk() }];
for (let seed = 1; seed <= 30; seed++) beds.push({ name: `roam-${seed}`, b: seed, walk: roamWalk(seed) });

let deathMismatch = 0;
const results = beds.map(({ name, b, walk }) => {
  const samples = liveSamples(ticksOf(walk));
  const comps = samples.map((Hn) => componentsAbove(Hn, 0.2));
  const labels = comps.map((c) => c.labels);
  const ks = comps.map((c) => c.k);
  const { life, reaches, deaths } = lifetimes(labels, ks, n);
  let dc = 0;
  for (let t = 0; t + 1 < labels.length; t++) dc += diffComponents(labels[t], ks[t], labels[t + 1], ks[t + 1], n).death;
  if (dc !== deaths) deathMismatch++;
  const perm = permuteField(lambdaLib, mulberry32(20000 + b));
  const x = [];
  const y = [];
  const xFree = [];
  const yFree = [];
  const xLive = [];
  const xPerm = [];
  for (let t = 0; t < samples.length; t++) {
    const live = lambdaFrom(samples[t], barsOf(samples[t]));
    for (let v = 0; v < n; v++) {
      const c = labels[t][v];
      if (c < 0) continue;
      x.push(lambdaLib[v]);
      y.push(life[t][c]);
      xLive.push(live[v]);
      xPerm.push(perm[v]);
      if (!reaches[t][c]) { xFree.push(lambdaLib[v]); yFree.push(life[t][c]); }
    }
  }
  const main = spearman(x, y);
  return {
    name, samples: samples.length, pairs: x.length, rho: main.rho, defined: main.defined,
    shareLambdaPositive: x.length ? x.reduce((c, v) => c + (v > 0 ? 1 : 0), 0) / x.length : 0,
    rhoUncensored: spearman(xFree, yFree).rho, pairsUncensored: xFree.length,
    rhoLive: spearman(xLive, y).rho, rhoPermuted: spearman(xPerm, y).rho,
    meanLife: x.length ? y.reduce((s, v) => s + v, 0) / x.length : 0,
  };
});
gateChecks.deathsMatchDiffComponents = deathMismatch === 0;
const gateOk = Object.values(gateChecks).every(Boolean);

const roams = results.slice(1);
const v = verdictT4({ gateOk, plateShares: perPlate.map((p) => p.share), roamRhos: roams.map((r) => r.rho) });
const costMs = performance.now() - t0;
const summary = {
  verdict: v.verdict, L2: v.L2, L3: v.L3, gate: gateChecks, gateOk, deathMismatch,
  plates: perPlate.map(({ kappa, lambda, ...p }) => p),
  maxPlateShare: Math.max(...perPlate.map((p) => p.share)),
  roamsBelowBar: roams.filter((r) => !(r.rho >= 0.3)).length, undefinedRoams: roams.filter((r) => !r.defined).length,
  minRho: Math.min(...roams.map((r) => r.rho)), medianRho: median(roams.map((r) => r.rho)), maxRho: Math.max(...roams.map((r) => r.rho)),
  beds: results, costMs, node: process.version,
};
const outDir = join(HERE, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "t4.json"), JSON.stringify(summary, null, 2) + "\n");

const lines = [
  `# T4 verdict: ${v.verdict}`,
  "",
  `L2 (phase): the share of the 4,698 edges with |kappa(u) - kappa(v)| > ${DELTA} is at most ${f4(summary.maxPlateShare)} over the 8 plates (bar: DEAD above 0.10). L3 (amplitude): Spearman between Lambda of the plates at a cell and the remaining life of its {Hn >= 0.20} component, over the 30 roams: min ${f4(summary.minRho)}, median ${f4(summary.medianRho)}, max ${f4(summary.maxRho)}; roams below 0.3: ${summary.roamsBelowBar} of 30, undefined (constant variable, counted 0): ${summary.undefinedRoams} (bar: DEAD if any roam is below 0.3).`,
  "",
  "## Known-answer gate",
  "",
  `${gateOk ? "ok" : "void"}: ${Object.entries(gateChecks).map(([k, x]) => `${k} ${x ? "ok" : "FAIL"}`).join(", ")}; death count against diffComponents mismatching on ${deathMismatch} beds.`,
  "",
  "## L2 per plate",
  "",
  "| plate | share of edges over delta | max edge difference | cells with kappa below 2 delta | largest finite bar | long H0 bars | long hole bars | cells with Lambda > 0 | sup move under eps 0.01 |",
  "|---|---|---|---|---|---|---|---|---|",
  ...perPlate.map((p) => `| ${p.id} | ${f4(p.share)} | ${f4(p.maxEdge)} | ${f4(p.kappaBelowCap)} | ${f4(p.maxBar)} | ${p.longH0} | ${p.longHoles} | ${f4(p.lambdaCells)} | ${f4(p.supMove)} |`),
  "",
  "## L3 per bed",
  "",
  "Pairs are (Lambda of the plates at a cell, remaining life in seconds of its component) pooled over the samples. The last four columns are context, not bars.",
  "",
  "| bed | samples | pairs | Spearman | share of pairs with Lambda > 0 | mean life s | censored lineages dropped | live-field Lambda | Lambda cells permuted |",
  "|---|---|---|---|---|---|---|---|---|",
  ...results.map((r) => `| ${r.name} | ${r.samples} | ${r.pairs} | ${f4(r.rho)}${r.defined ? "" : " (undefined)"} | ${f4(r.shareLambdaPositive)} | ${r.meanLife.toFixed(2)} | ${f4(r.rhoUncensored)} | ${f4(r.rhoLive)} | ${f4(r.rhoPermuted)} |`),
  "",
  "## Cost",
  "",
  `${costMs.toFixed(0)} ms for the whole run on Node ${process.version}.`,
  "",
];
writeFileSync(join(outDir, "t4.md"), lines.join("\n"));

console.log(`T4 verdict: ${v.verdict}; max plate share ${f4(summary.maxPlateShare)}; roam rho min ${f4(summary.minRho)} median ${f4(summary.medianRho)} max ${f4(summary.maxRho)}; below bar ${summary.roamsBelowBar}; gate ${gateOk ? "ok" : "VOID " + JSON.stringify(gateChecks)}; ${costMs.toFixed(0)} ms`);
