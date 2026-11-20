// Runs T1 as pre-registered (PREREGISTRATION.md section 6.5) and writes out/t1.json and out/t1.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../topo-field/field.mjs";
import { GRID, bakePlate, liveSamples, staticPrior } from "./heat.mjs";
import { buildL8, tourLegs, pairDocks, walkLeg, ticksOf, tourWalk, roamWalk, criticalIds } from "./library.mjs";
import { sampleMedian, median } from "./explain.mjs";
import { knownAnswerGate, verdict } from "./verdict.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROAM_SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const B_DRAWS = 30;
const B_PAIRS = 8;
const permSeed = 7;

const t0 = performance.now();

const legPlates = (legs) => legs.map((l) => bakePlate(ticksOf(walkLeg(l.start, l.end))));
const concatTicks = (parts) => {
  const x = [];
  const z = [];
  for (const p of parts) {
    for (let i = 0; i < p.x.length; i++) {
      x.push(p.x[i]);
      z.push(p.z[i]);
    }
  }
  return { x: Float64Array.from(x), z: Float64Array.from(z) };
};

const L8 = buildL8();
const armA = legPlates(L8);
const armU = [new Float64Array(GRID.n).fill(1)];
const docks = pairDocks();
const armC = [staticPrior(docks)];
const armD = legPlates(tourLegs().slice(0, 8));
const armB = Array.from({ length: B_DRAWS }, (_, d) => {
  const rng = mulberry32(d + 1);
  const legs = [];
  for (let k = 0; k < B_PAIRS; k++) {
    const a = Math.floor(rng() * docks.length);
    let b = Math.floor(rng() * (docks.length - 1));
    if (b >= a) b++;
    legs.push({ start: docks[a], end: docks[b] });
  }
  return legPlates(legs);
});

const bArm = (samples) => {
  const xs = armB.map((plates) => sampleMedian(samples, plates));
  return { draws: xs, median: median(xs) };
};

const arms = (samples) => ({
  A: sampleMedian(samples, armA),
  U: sampleMedian(samples, armU),
  B: bArm(samples),
  C: sampleMedian(samples, armC),
  D: sampleMedian(samples, armD),
});

const tourSamples = liveSamples(ticksOf(tourWalk()));
const tour = arms(tourSamples);

const roams = ROAM_SEEDS.map((seed) => {
  const a = arms(liveSamples(ticksOf(roamWalk(seed))));
  return { seed, xA: a.A, xU: a.U, xC: a.C, xD: a.D, xB: a.B.median, bDraws: a.B.draws, medB: a.B.median, margin: a.A - Math.max(a.U, a.B.median) };
});

const knownSamples = liveSamples(concatTicks(L8.map((l) => ticksOf(walkLeg(l.start, l.end)))));
const permRng = mulberry32(permSeed);
const perm = Int32Array.from({ length: GRID.n }, (_, i) => i);
for (let i = GRID.n - 1; i > 0; i--) {
  const j = Math.floor(permRng() * (i + 1));
  [perm[i], perm[j]] = [perm[j], perm[i]];
}
const gate = knownAnswerGate(knownSamples, armA, perm);

const result = verdict({ gate, tourXA: tour.A, roams: roams.map((r) => ({ xA: r.xA, xU: r.xU, medB: r.medB })) });
const costMs = performance.now() - t0;

const summary = {
  verdict: result.verdict,
  bar: result.bar,
  margin: result.margin,
  medianXA: result.medXA,
  tourXA: tour.A,
  gate,
  tour: { xA: tour.A, xU: tour.U, xB: tour.B.median, xBdraws: tour.B.draws, xC: tour.C, xD: tour.D, samples: tourSamples.length },
  roams,
  medians: {
    xA: median(roams.map((r) => r.xA)),
    xU: median(roams.map((r) => r.xU)),
    xB: median(roams.map((r) => r.xB)),
    xC: median(roams.map((r) => r.xC)),
    xD: median(roams.map((r) => r.xD)),
    margin: median(roams.map((r) => r.margin)),
  },
  criticalIds: criticalIds(),
  legs: L8.map((l) => ({ name: l.name, length: l.length })),
  costMs,
  node: process.version,
};

const outDir = join(HERE, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "t1.json"), JSON.stringify(summary, null, 2) + "\n");

const f = (x) => (x === null || x === undefined || Number.isNaN(x) ? "n/a" : x.toFixed(4));
const lines = [
  `# T1 verdict: ${result.verdict}`,
  "",
  result.bar,
  "",
  `Margin (median over roams of X_A - max(X_U, median X_B)): ${f(result.margin)}. Median X_A over roams: ${f(result.medXA)}. Tour X_A: ${f(tour.A)}.`,
  "",
  "## Known-answer gate",
  "",
  `Walk of the 8 L8 legs: X = ${f(gate.xWalk)}. Same walk with permuted plate cells: X = ${f(gate.xPerm)}. Gate: ${gate.ok ? "ok" : "void"}.`,
  "",
  "## Tour (n = 1)",
  "",
  `| arm | X |`,
  `|---|---|`,
  `| A (L8) | ${f(tour.A)} |`,
  `| U (uniform) | ${f(tour.U)} |`,
  `| B (random pairs, median of ${B_DRAWS}) | ${f(tour.B.median)} |`,
  `| C (static layout prior) | ${f(tour.C)} |`,
  `| D (oracle, first 8 tour legs) | ${f(tour.D)} |`,
  "",
  "## Roams (30 seeds)",
  "",
  `| seed | X_A | X_U | medX_B | X_C | X_D | margin |`,
  `|---|---|---|---|---|---|---|`,
  ...roams.map((r) => `| ${r.seed} | ${f(r.xA)} | ${f(r.xU)} | ${f(r.medB)} | ${f(r.xC)} | ${f(r.xD)} | ${f(r.margin)} |`),
  "",
  "## Medians over roams",
  "",
  `X_A ${f(summary.medians.xA)}, X_U ${f(summary.medians.xU)}, medX_B ${f(summary.medians.xB)}, X_C ${f(summary.medians.xC)}, X_D ${f(summary.medians.xD)}, margin ${f(summary.medians.margin)}.`,
  "",
  "## Cost",
  "",
  `${costMs.toFixed(0)} ms for the whole run on Node ${process.version}.`,
  "",
];
writeFileSync(join(outDir, "t1.md"), lines.join("\n"));

console.log(`T1 verdict: ${result.verdict}; tour X_A ${f(tour.A)}; margin ${f(result.margin)}; gate ${gate.ok ? "ok" : "void"}; ${costMs.toFixed(0)} ms`);
