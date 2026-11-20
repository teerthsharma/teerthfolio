// L4 runner: known-answer gate, E1 sweep, K5 shuffled control, water-off sensitivity, E2 microbench, verdict, results.
// Usage: node experiments/topo-field/run.mjs [--out experiments/topo-field/out]
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeHexGrid } from './hexgrid.mjs';
import { makeDetector, touchMask } from './cc.mjs';
import { makeField } from './field.mjs';
import { makePath } from './path.mjs';
import { chunkCrossings, makeFlipCounter } from './baselines.mjs';
import { verdict } from './verdict.mjs';
import { renderMarkdown } from './report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WARMUP = 300;
const SEAM_STEP_M = 0.5;

const gridCache = new Map();
const pathCache = new Map();
export function getGrid(h) {
  if (!gridCache.has(h)) gridCache.set(h, makeHexGrid(84, h));
  return gridCache.get(h);
}
export function getPath(seed, roamSeconds) {
  const key = `${seed}:${roamSeconds}`;
  if (!pathCache.has(key)) pathCache.set(key, makePath(seed, { roamSeconds }));
  return pathCache.get(key);
}

const sumCounts = (c) => c.birth + c.death + c.merge + c.split + c.holeOpen + c.holeClose;
const zeroCounts = () => ({ birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0 });
const addCounts = (acc, e) => {
  acc.birth += e.birth; acc.death += e.death; acc.merge += e.merge;
  acc.split += e.split; acc.holeOpen += e.holeOpen; acc.holeClose += e.holeClose;
};
const median = (a) => {
  const s = Float64Array.from(a).sort();
  const m = s.length;
  if (m === 0) return NaN;
  return m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
};
const quantile95 = (a) => {
  const s = Float64Array.from(a).sort();
  return s[Math.ceil(0.95 * s.length) - 1];
};

// Seam: transitions where the seal moves further than any real frame allows (max 15 m/s = 0.25 m per frame).
export function seamFrames(path) {
  const out = [];
  for (let f = 1; f < path.frames; f++) {
    if (Math.hypot(path.x[f] - path.x[f - 1], path.z[f] - path.z[f - 1]) > SEAM_STEP_M) out.push(f);
  }
  return out;
}

export function runCell({ h, N, seed, shuffle = false, water = true, roamSeconds = 60, delta = 0.10, keepTiming = false }) {
  const g = getGrid(h);
  const path = getPath(seed, roamSeconds);
  const F = path.frames;
  const field = makeField(g, { N, seed, shuffle, water });
  const touch = touchMask(g, water ? field.water : null);
  const det = makeDetector(g, { touch, delta });
  const flips = makeFlipCounter(g.n);
  const seams = new Set(seamFrames(path));

  const raw = zeroCounts(), simp = zeroCounts(), rawSeam = zeroCounts(), simpSeam = zeroCounts();
  const nBins = Math.floor((F - 1) / 60);
  const rawBins = new Array(nBins).fill(0), simpBins = new Array(nBins).fill(0);
  let hystFlips = 0;
  const core = new Float64Array(F), full = new Float64Array(F);

  for (let f = 0; f < F; f++) {
    const t0 = performance.now();
    field.update(path.x[f], path.z[f]);
    det.tag(field.c);
    det.count();
    const t1 = performance.now();
    const ev = det.events();
    const t2 = performance.now();
    core[f] = t1 - t0;
    full[f] = t2 - t0;

    flips.step(field.c);
    if (f >= 1) {
      for (let i = 0; i < g.n; i++) if (det.prevLive[i] !== det.live[i]) hystFlips++;
      if (seams.has(f)) {
        addCounts(rawSeam, ev.raw);
        addCounts(simpSeam, ev.simp);
      } else {
        addCounts(raw, ev.raw);
        addCounts(simp, ev.simp);
        const b = Math.floor((f - 1) / 60);
        if (b < nBins) {
          rawBins[b] += sumCounts(ev.raw);
          simpBins[b] += sumCounts(ev.simp);
        }
      }
    }
  }

  const seconds = (F - 1) / 60;
  const b1 = chunkCrossings(path.x, path.z, { chunk: 16, window: 48 });
  const coreStats = core.subarray(WARMUP), fullStats = full.subarray(WARMUP);
  const result = {
    h, N, seed, shuffle, water, delta,
    ncells: g.n,
    frames: F - 1,
    seconds,
    tourFrames: path.tourFrames,
    raw: { ...raw, total: sumCounts(raw), medianPerSec: median(rawBins), seam: { ...rawSeam, total: sumCounts(rawSeam) } },
    simp: { ...simp, total: sumCounts(simp), medianPerSec: median(simpBins), seam: { ...simpSeam, total: sumCounts(simpSeam) } },
    b1,
    b2: {
      noHystFlips: flips.total,
      noHystPerSec: flips.total / seconds,
      hystFlips,
      hystPerSec: hystFlips / seconds,
      perCellPerSec: hystFlips / (g.n * seconds),
    },
    ms: {
      coreMedian: median(coreStats),
      coreP95: quantile95(coreStats),
      fullMedian: median(fullStats),
      fullP95: quantile95(fullStats),
    },
  };
  if (keepTiming) result.timing = { core: core.slice(WARMUP), full: full.slice(WARMUP) };
  return result;
}

function runKnown() {
  const file = join(HERE, 'test', 'known.test.mjs');
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { encoding: 'utf8' });
  const tests = [];
  for (const line of (r.stdout || '').split('\n')) {
    const m = /^(ok|not ok) \d+ - (.*)$/.exec(line.trim());
    if (m) tests.push({ name: m[2], pass: m[1] === 'ok' });
  }
  return { passed: r.status === 0, status: r.status, tests };
}

function gitHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: HERE });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

// Ratio of event rates shuffled/real (zero real rate gives Infinity if the shuffled rate is above zero).
function ratioOf(sEvents, sFrames, rEvents, rFrames) {
  const shuffled = sEvents / sFrames;
  const real = rEvents / rFrames;
  if (real === 0) return shuffled > 0 ? Infinity : 0;
  return shuffled / real;
}

const rate = (cells, key) => {
  const ev = cells.reduce((s, c) => s + c[key].total, 0);
  const fr = cells.reduce((s, c) => s + c.frames, 0);
  return { ev, fr, perFrame: ev / fr };
};

function main(argv) {
  const outIdx = argv.indexOf('--out');
  const outDir = outIdx >= 0 ? resolve(argv[outIdx + 1]) : join(HERE, 'out');
  const sweepStart = performance.now();
  const log = (s) => process.stderr.write(s + '\n');

  const known = runKnown();
  log(`known-answer gate: ${known.passed ? 'PASS' : 'FAIL'} (exit ${known.status}, ${known.tests.filter((t) => t.pass).length}/${known.tests.length} tests ok)`);

  const e1 = [];
  for (const h of [2, 4, 8]) for (const N of [0, 20, 60]) for (const seed of [1, 2, 3]) {
    const keepTiming = h === 4 && N === 20;
    const c = runCell({ h, N, seed, keepTiming });
    e1.push(c);
    log(`E1 h=${h} N=${N} seed=${seed}: simp ${c.simp.total}, raw ${c.raw.total}, ${(performance.now() - sweepStart) / 1000 | 0}s`);
  }
  const e1Judged = e1.filter((c) => c.h === 4 && c.N === 20);

  const k5 = [];
  for (const h of [2, 4, 8]) for (const seed of [1, 2, 3]) {
    const c = runCell({ h, N: 20, seed, shuffle: true });
    k5.push(c);
    log(`K5 h=${h} seed=${seed}: simp ${c.simp.total}, raw ${c.raw.total}`);
  }

  const water = [];
  for (const seed of [1, 2, 3]) {
    const c = runCell({ h: 4, N: 20, seed, water: false });
    water.push(c);
    log(`water-off h=4 N=20 seed=${seed}: simp ${c.simp.total}`);
  }

  const byH = {};
  for (const h of [2, 4, 8]) {
    const real = e1.filter((c) => c.h === h && c.N === 20);
    const shuf = k5.filter((c) => c.h === h);
    const rR = rate(real, 'raw'), rS = rate(real, 'simp');
    const sR = rate(shuf, 'raw'), sS = rate(shuf, 'simp');
    byH[h] = {
      raw: ratioOf(sR.ev, sR.fr, rR.ev, rR.fr),
      simp: ratioOf(sS.ev, sS.fr, rS.ev, rS.fr),
      realPerFrame: { raw: rR.perFrame, simp: rS.perFrame },
      shuffledPerFrame: { raw: sR.perFrame, simp: sS.perFrame },
    };
  }
  const k5Ratio = { judged: byH[4].simp, byH };

  const e2ByCell = [];
  for (const h of [2, 4, 8]) for (const N of [0, 20, 60]) {
    const cells = e1.filter((c) => c.h === h && c.N === N);
    const avg = (k) => cells.reduce((s, c) => s + c.ms[k], 0) / cells.length;
    e2ByCell.push({ h, N, coreMedian: avg('coreMedian'), coreP95: avg('coreP95'), fullMedian: avg('fullMedian'), fullP95: avg('fullP95') });
  }
  const coreAll = Float64Array.from(e1Judged.flatMap((c) => Array.from(c.timing.core)));
  const fullAll = Float64Array.from(e1Judged.flatMap((c) => Array.from(c.timing.full)));
  const pooled = {
    coreMedian: median(coreAll), coreP95: quantile95(coreAll),
    fullMedian: median(fullAll), fullP95: quantile95(fullAll),
  };
  for (const c of e1) delete c.timing;

  const v = verdict({
    kPassed: known.passed,
    k5Ratio: byH[4].simp,
    e1Cells: e1Judged.map((c) => ({ seed: c.seed, frames: c.frames, simpEvents: c.simp.total, simpMedianPerSec: c.simp.medianPerSec, b1PerSec: c.b1.perSec })),
    e2P95Ms: pooled.coreP95,
  });

  const results = {
    env: {
      head: gitHead(),
      node: process.version,
      cpu: cpus()[0].model,
      cpuCount: cpus().length,
      date: new Date().toISOString(),
    },
    known,
    e1,
    k5,
    water,
    k5Ratio,
    e2: { byCell: e2ByCell, pooled, judged: 'h=4,N=20' },
    verdict: v,
    sweepSeconds: (performance.now() - sweepStart) / 1000,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : x), 2) + '\n');
  writeFileSync(join(outDir, 'results.md'), renderMarkdown(results) + '\n');
  log(`verdict: E1 ${v.e1}, E2 ${v.e2}; K5 ratio (SIMP, h=4) ${byH[4].simp}; wall ${results.sweepSeconds.toFixed(1)} s; wrote ${outDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
