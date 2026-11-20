// Runs T3, L1 half, as pre-registered (PREREGISTRATION-T3.md) and writes out/t3.json and out/t3.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../topo-field/field.mjs";
import { GRID, liveSamples } from "./heat.mjs";
import { roamWalk, tourWalk, ticksOf } from "./library.mjs";
import { median } from "./explain.mjs";
import { aliveShare, permuteField, survivors, verdictT3 } from "./alive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const n = GRID.n;
const t0 = performance.now();
const field = (fn) => Float64Array.from({ length: n }, (_, i) => fn(GRID.x[i], GRID.z[i]));
const gauss = (cx, cz, s, a = 1) => (x, z) => a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
const p95 = (xs) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(0.95 * xs.length) - 1)];
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// known answers (reading 11): the run is void if one fails
const gate = (() => {
  const one = field(gauss(0, 0, 14));
  const two = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.8)(x, z));
  const small = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.03)(x, z));
  const ring = field((x, z) => Math.exp(-((Math.hypot(x, z) - 40) ** 2) / 72));
  const rs = survivors(ring);
  let ringMin = 0;
  for (let i = 0; i < n; i++) if (rs.mask[i] && rs.type[i] === 2 && Math.hypot(GRID.x[i], GRID.z[i]) < 8) ringMin++;
  const pm = permuteField(one, mulberry32(10000));
  const checks = {
    singleBump: survivors(one).count === 1 && aliveShare(one).share === 7 / n,
    twoBumps: survivors(two).count === 3 && aliveShare(two).share === 21 / n,
    belowFilter: aliveShare(small).share === 7 / n,
    ring: ringMin === 1 && rs.maxPersistence.min > 0.5,
    constant: aliveShare(new Float64Array(n).fill(0.3)).share === 0,
    permutedBump: aliveShare(pm).share >= 3 * aliveShare(one).share,
  };
  return { ok: Object.values(checks).every(Boolean), checks };
})();

const beds = [{ name: "tour", b: 0, walk: tourWalk() }];
for (let seed = 1; seed <= 30; seed++) beds.push({ name: `roam-${seed}`, b: seed, walk: roamWalk(seed) });

let unmatched = 0;
const results = beds.map(({ name, b, walk }) => {
  const rng = mulberry32(10000 + b);
  const real = [];
  const ctrl = [];
  const all = [];
  const counts = { max: [], saddle: [], min: [] };
  let skipped = 0;
  for (const Hn of liveSamples(ticksOf(walk))) {
    let hi = -Infinity;
    let lo = Infinity;
    for (const v of Hn) { if (v > hi) hi = v; if (v < lo) lo = v; }
    if (hi === lo) { skipped++; continue; }
    const a = aliveShare(Hn);
    unmatched += a.survivors.unmatched;
    real.push(a.share);
    ctrl.push(aliveShare(permuteField(Hn, rng)).share);
    all.push(aliveShare(Hn, 0).share);
    counts.max.push(a.survivors.max);
    counts.saddle.push(a.survivors.saddle);
    counts.min.push(a.survivors.min);
  }
  const m = median(real);
  const c = median(ctrl);
  return {
    name, samples: real.length, skipped, median: m, p95: p95(real), control: c, controlOk: c >= 3 * m,
    unfiltered: median(all), meanMax: mean(counts.max), meanSaddle: mean(counts.saddle), meanMin: mean(counts.min),
  };
});

const gateOk = gate.ok && unmatched === 0;
const v = verdictT3({ gateOk, beds: results });
const costMs = performance.now() - t0;
const roams = results.slice(1);
const range = (k) => [Math.min(...results.map((r) => r[k])), Math.max(...results.map((r) => r[k]))];
const summary = {
  verdict: v.verdict, gate, unmatched, bedsOverTenth: results.filter((r) => r.median > 0.1).length,
  bedsOverQuarter: results.filter((r) => r.median > 0.25).length, controlFailures: results.filter((r) => !r.controlOk).length,
  maxMedian: Math.max(...results.map((r) => r.median)), medianOfMedians: median(results.map((r) => r.median)),
  beds: results, costMs, node: process.version,
};
const outDir = join(HERE, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "t3.json"), JSON.stringify(summary, null, 2) + "\n");

const f = (x) => x.toFixed(4);
const lines = [
  `# T3 (L1 half) verdict: ${v.verdict}`,
  "",
  `${results.length} beds (the tour and 30 roams), ${results.reduce((s, r) => s + r.samples, 0)} one-second samples, ${results.reduce((s, r) => s + r.skipped, 0)} skipped. Median share per bed ranges ${f(range("median")[0])} to ${f(range("median")[1])} (median of medians ${f(summary.medianOfMedians)}); beds above 0.10: ${summary.bedsOverTenth}; beds above 0.25: ${summary.bedsOverQuarter}; beds where the permuted control fails the 3 times condition: ${summary.controlFailures}.`,
  "",
  "## Known-answer gate",
  "",
  `${gateOk ? "ok" : "void"}: ${Object.entries(gate.checks).map(([k, x]) => `${k} ${x ? "ok" : "FAIL"}`).join(", ")}; bar cells that are not classify-critical: ${unmatched}.`,
  "",
  "## Per bed (share of the 1,615 cells within one ring of a surviving critical cell)",
  "",
  "| bed | samples | median | p95 | permuted median | control >= 3x | no filter median | mean surviving max | saddle | min |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...results.map((r) => `| ${r.name} | ${r.samples} | ${f(r.median)} | ${f(r.p95)} | ${f(r.control)} | ${r.controlOk ? "yes" : "NO"} | ${f(r.unfiltered)} | ${r.meanMax.toFixed(1)} | ${r.meanSaddle.toFixed(1)} | ${r.meanMin.toFixed(1)} |`),
  "",
  `Roams only: median share ${f(median(roams.map((r) => r.median)))}, permuted ${f(median(roams.map((r) => r.control)))}.`,
  "",
  "## Cost",
  "",
  `${costMs.toFixed(0)} ms for the whole run on Node ${process.version}.`,
  "",
];
writeFileSync(join(outDir, "t3.md"), lines.join("\n"));

console.log(`T3 (L1) verdict: ${v.verdict}; beds ${results.length}; max median ${f(summary.maxMedian)}; over 0.10: ${summary.bedsOverTenth}; over 0.25: ${summary.bedsOverQuarter}; control failures ${summary.controlFailures}; unmatched ${unmatched}; ${costMs.toFixed(0)} ms`);
