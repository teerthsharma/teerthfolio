// Runs the occluder-topology cells (judged, shuffled control, sensitivities), the known-answer gate, and writes out/results.json and out/results.md.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makePath } from '../topo-field/path.mjs';
import { chunkCrossings } from '../topo-field/baselines.mjs';
import { sealStream, makeFollowCamera, pupBox, projectBox, buildOccluders, makeWalkers, castMask, frameValid, N as PIX } from './scene.mjs';
import { makeAnalyser, makeEvents } from './persist.mjs';
import { verdict, verdictLatched } from './verdict.mjs';
import { renderMarkdown } from './report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KINDS = ['birth', 'death', 'merge', 'split'];
const COLUMNS = ['raw', 'plain', 'latched'];
const paths = new Map();
const pathFor = (seed, roamSeconds) => {
  const key = `${seed}:${roamSeconds}`;
  if (!paths.has(key)) paths.set(key, makePath(seed, { roamSeconds }));
  return paths.get(key);
};
const median = (xs) => percentile(xs, 0.5);
const percentile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};
const tally = () => ({ birth: 0, death: 0, merge: 0, split: 0, total: 0 });
const addEvents = (t, ev) => {
  for (const k of KINDS) t[k] += ev[k];
  t.total += KINDS.reduce((s, k) => s + ev[k], 0);
};

export function b1For(seed) {
  const p = pathFor(seed, 60);
  return chunkCrossings(p.x, p.z);
}

export function walkersFor(seed, N, shuffle) {
  return N > 0 ? makeWalkers(seed, { N, shuffle }) : null;
}

export function runCell({ seed, shuffle = false, variant = 'nominal', N = 20, pOffset = 0.5, roamSeconds = 60, maxFrames = Infinity }) {
  const path = pathFor(seed, roamSeconds);
  const stream = sealStream(path);
  const camera = makeFollowCamera();
  const occ = buildOccluders({ variant });
  const walkers = walkersFor(seed, N, shuffle);
  const analyse = makeAnalyser({ pOffset });
  const trk = Object.fromEntries(COLUMNS.map((m) => [m, makeEvents({ mode: m })]));
  const F = Math.min(path.frames, maxFrames);

  const head = { raw: tally(), plain: tally(), latched: { ...tally(), frame0Births: 0 } };
  const excl = { raw: tally(), plain: tally(), latched: tally() };
  const all = { raw: 0, plain: 0, latched: 0 };
  const invalid = new Uint8Array(F);
  const mask = new Uint8Array(PIX);
  const times = [];
  let invalidCount = 0, seamCount = 0, excludedTransitions = 0, birthDeathSameFrame = 0;
  let framesWithOver = 0, framesWithBand = 0, framesWithSolid = 0, occludedSum = 0, solidSum = 0;

  for (let f = 0; f < F; f++) {
    const seal = stream.at(f);
    const cam = camera.step(seal);
    const box = pupBox(seal);
    const proj = projectBox(cam, box);
    if (walkers) walkers.step(seal.x, seal.z);
    invalid[f] = proj.ok && frameValid(seal) ? 0 : 1;
    invalidCount += invalid[f];
    if (proj.ok) castMask(cam, proj, box, occ, walkers, mask);
    else mask.fill(0);

    const t0 = performance.now();
    const an = analyse(mask);
    times.push(performance.now() - t0);
    let over = 0, band = 0, solid = 0, occludedPx = 0;
    for (let i = 0; i < PIX; i++) occludedPx += mask[i];
    for (let c = 0; c < an.k; c++) {
      if (an.cls[c] === 0) over++;
      else if (an.cls[c] === 1) band++;
      else solid++;
    }
    framesWithOver += over > 0 ? 1 : 0;
    framesWithBand += band > 0 ? 1 : 0;
    framesWithSolid += solid > 0 ? 1 : 0;
    occludedSum += occludedPx / PIX;
    solidSum += solid;

    const ev = Object.fromEntries(COLUMNS.map((m) => [m, trk[m].step(an)]));
    for (const m of COLUMNS) all[m] += KINDS.reduce((s, k) => s + ev[m][k], 0);
    if (f === 0) continue;

    if (f === path.tourFrames) seamCount++;
    if (ev.raw.birth > 0 && ev.raw.death > 0 && f !== path.tourFrames && !invalid[f - 1] && !invalid[f]) birthDeathSameFrame++;
    const excluded = f === path.tourFrames || invalid[f - 1] || invalid[f];
    if (excluded) excludedTransitions++;
    for (const m of COLUMNS) {
      if (excluded) addEvents(excl[m], ev[m]);
      else addEvents(head[m], ev[m]);
    }
    if (!excluded) head.latched.frame0Births += ev.latched.frame0Births;
  }

  const counted = (F - 1) - excludedTransitions;
  return {
    seed, shuffle, variant, N, pOffset,
    frames: F - 1, counted, seconds: counted / 60, seamCount,
    invalid: invalidCount, invalidShare: invalidCount / F,
    raw: head.raw, plain: head.plain, latched: head.latched,
    excluded: excl, all,
    b1: b1For(seed),
    cls: {
      framesWithOver, framesWithBand, framesWithSolid,
      meanOccludedShare: occludedSum / F, meanSolidComponents: solidSum / F,
    },
    tracking: { birthDeathSameFrame },
    invariant: {
      plainHolds: head.plain.total <= head.raw.total,
      latchedHolds: head.latched.total <= head.raw.total + head.latched.frame0Births,
    },
    ms: { analyseMedian: median(times), analyseP95: percentile(times, 0.95) },
  };
}

function gate() {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join(HERE, 'test', 'known.test.mjs')], { encoding: 'utf8' });
  const count = (r.stdout || '').split('\n').filter((l) => /^ok \d+ - /.test(l.trim())).length;
  return { pass: r.status === 0, count };
}

function environment() {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: HERE });
  return {
    head: head.status === 0 ? head.stdout.trim() : 'unknown',
    node: process.version,
    cpu: cpus()[0].model,
    cpuCount: cpus().length,
    date: new Date().toISOString(),
  };
}

// Pooled shuffled events per counted transition over pooled real events per counted transition; zero real rate gives Infinity if shuffled is above zero.
function controlRatioFor(shuffled, real, column) {
  const rate = (cells) => sum(cells.map((c) => c[column].total)) / sum(cells.map((c) => c.counted));
  const s = rate(shuffled);
  const r = rate(real);
  if (r === 0) return s > 0 ? Infinity : 0;
  return s / r;
}
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runAll({ roamSeconds = 60, seeds = [1, 2, 3], sensSeeds = seeds } = {}) {
  const known = gate();
  const real = seeds.map((seed) => runCell({ seed, roamSeconds }));
  const shuffled = seeds.map((seed) => runCell({ seed, roamSeconds, shuffle: true }));
  const sens = {
    envelope: sensSeeds.map((seed) => runCell({ seed, roamSeconds, variant: 'envelope' })),
    n0: sensSeeds.map((seed) => runCell({ seed, roamSeconds, N: 0 })),
    pOffset0: sensSeeds.map((seed) => runCell({ seed, roamSeconds, pOffset: 0 })),
  };
  const controlRatio = { plain: controlRatioFor(shuffled, real, 'plain'), latched: controlRatioFor(shuffled, real, 'latched') };
  const seedsFor = (column) => real.map((c) => ({ seed: c.seed, perSec: c[column].total / c.seconds, b1PerSec: c.b1.perSec }));
  const judged = {
    plain: verdict({ kPassed: known.pass, controlRatio: controlRatio.plain, seeds: seedsFor('plain') }),
    latched: verdictLatched({ kPassed: known.pass, controlRatio: controlRatio.latched, seeds: seedsFor('latched') }),
  };
  return { env: environment(), known, judged, controlRatio, real, shuffled, sens };
}

export function writeOut(dir, results) {
  mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(results, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 2);
  writeFileSync(join(dir, 'results.json'), json + '\n');
  writeFileSync(join(dir, 'results.md'), renderMarkdown(results) + '\n');
}

function main(argv) {
  const i = argv.indexOf('--out');
  const dir = i >= 0 ? resolve(argv[i + 1]) : join(HERE, 'out');
  const results = runAll();
  writeOut(dir, results);
  process.stderr.write(`verdict: plain ${results.judged.plain.verdict}, LATCHED ${results.judged.latched.verdict}; written to ${dir}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
