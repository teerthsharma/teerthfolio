import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCell } from '../run.mjs';
import { economicsRows, renderMarkdown } from '../report.mjs';
import { BARS, verdict, verdictPostHoc } from '../verdict.mjs';

const withoutMs = (r) => {
  const { ms, timing, ...rest } = r;
  return rest;
};

test('runCell returns the full shape, with frames = tourFrames + 300 at roamSeconds 5', () => {
  const r = runCell({ h: 8, N: 20, seed: 1, roamSeconds: 5 });
  for (const k of ['h', 'N', 'seed', 'shuffle', 'water', 'delta', 'ncells', 'frames', 'seconds', 'tourFrames', 'raw', 'simp', 'simpH', 'b1', 'b2', 'ms']) {
    assert.ok(k in r, `missing key ${k}`);
  }
  assert.equal(r.frames, r.tourFrames + 300);
  assert.ok(Math.abs(r.seconds * 60 - r.frames) < 1e-9);
  for (const side of [r.raw, r.simp, r.simpH]) {
    for (const k of ['birth', 'death', 'merge', 'split', 'holeOpen', 'holeClose', 'total', 'medianPerSec', 'seam']) {
      assert.ok(k in side, `missing ${k}`);
    }
  }
  for (const k of ['noHystFlips', 'noHystPerSec', 'hystFlips', 'hystPerSec', 'perCellPerSec']) assert.ok(k in r.b2, `missing b2.${k}`);
  for (const k of ['coreMedian', 'coreP95', 'fullMedian', 'fullP95']) assert.ok(k in r.ms, `missing ms.${k}`);
});

test('runCell is deterministic: identical options give deep-equal results apart from timing', () => {
  const a = runCell({ h: 8, N: 20, seed: 2, roamSeconds: 5 });
  const b = runCell({ h: 8, N: 20, seed: 2, roamSeconds: 5 });
  assert.deepStrictEqual(withoutMs(a), withoutMs(b));
});

const SIX = [
  { h: 8, N: 20, seed: 1 }, { h: 8, N: 20, seed: 2 }, { h: 8, N: 60, seed: 3 },
  { h: 4, N: 0, seed: 1 }, { h: 4, N: 20, seed: 2 }, { h: 4, N: 60, seed: 3 },
];
let sixMemo = null;
const sixRuns = () => (sixMemo ??= SIX.map((opts) => ({ opts, r: runCell({ ...opts, roamSeconds: 5 }) })));

test('runCell: SIMP-H total <= RAW total + SIMP-H frame-0 births, and SIMP-H total >= 0, on six cells', () => {
  for (const { opts, r } of sixRuns()) {
    assert.ok(r.simpH.total <= r.raw.total + r.simpH.frame0Births, `SIMP-H ${r.simpH.total} > RAW ${r.raw.total} + frame-0 births ${r.simpH.frame0Births} at ${JSON.stringify(opts)}`);
    assert.ok(r.simpH.total >= 0, `negative SIMP-H total at ${JSON.stringify(opts)}`);
  }
});

test('runCell: SIMP-H death, merge, split, holeOpen and holeClose are each <= RAW on six cells', () => {
  const bad = [];
  for (const { opts, r } of sixRuns()) {
    for (const k of ['death', 'merge', 'split', 'holeOpen', 'holeClose']) {
      if (r.simpH[k] > r.raw[k]) bad.push(`${JSON.stringify(opts)} ${k}: SIMP-H ${r.simpH[k]} > RAW ${r.raw[k]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('KNOWN DEFECT 1 (recorded, not fixed): pre-registered SIMPLIFIED can exceed RAW (h8 N20 seed1, 5 s roam: raw 121, simp 127)', () => {
  const r = runCell({ h: 8, N: 20, seed: 1, roamSeconds: 5 });
  assert.ok(r.simp.total > r.raw.total, `expected the recorded defect, got raw ${r.raw.total}, simp ${r.simp.total}`);
});

test('KNOWN DEFECT 2 (recorded, not fixed): frame-0 warm start, SIMP-H exceeds RAW by no more than its frame-0 births (h4 N60 seed3: RAW 361, SIMP-H 362)', () => {
  const r = runCell({ h: 4, N: 60, seed: 3, roamSeconds: 5 });
  assert.ok(r.simpH.total > r.raw.total, `expected the recorded defect, got raw ${r.raw.total}, SIMP-H ${r.simpH.total}`);
  assert.ok(r.simpH.total - r.raw.total <= r.simpH.frame0Births, `excess ${r.simpH.total - r.raw.total} exceeds frame-0 births ${r.simpH.frame0Births}`);
});

const fakeSide = (total) => ({ birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0, total, medianPerSec: 0, seam: { birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0, total: 0 } });
const fakeCell = (h, N, seed, extra = {}) => ({
  h, N, seed, shuffle: false, water: true, delta: 0.1, ncells: 100, frames: 300, seconds: 5, tourFrames: 0,
  raw: fakeSide(3), simp: fakeSide(1), simpH: { ...fakeSide(2), frame0Births: 1 }, b1: { perSec: 1, crossings: 5, loads: 15, seconds: 5, loadsPerSec: 3 },
  b2: { noHystFlips: 4, noHystPerSec: 0.8, hystFlips: 2, hystPerSec: 0.4, perCellPerSec: 0.01 },
  ms: { coreMedian: 0.1, coreP95: 0.2, fullMedian: 0.1, fullP95: 0.2 },
  ...extra,
});

test('renderMarkdown contains the Verdict and Interpretation sections and the pass bar verbatim', () => {
  const results = {
    env: { head: 'abc1234', node: 'v25.8.1', cpu: 'Test CPU', cpuCount: 8, date: '2026-11-20T00:00:00.000Z' },
    verdict: { e1: 'UNRESOLVED', e2: 'PASS', reasons: ['E1 UNRESOLVED on seed 1: example.'] },
    known: { status: 0, tests: [{ name: 'K1 static disc: no events', pass: true }] },
    e1: [fakeCell(4, 20, 1)],
    k5: [],
    water: [],
    k5Ratio: { judged: 25, byH: {} },
    e2: { byCell: [], pooled: null, judged: 'h=4,N=20' },
    sweepSeconds: 1,
  };
  results.postHoc = {
    k5: 25,
    verdict: { e1: 'UNRESOLVED', e2: 'PASS', reasons: ['E1 UNRESOLVED on seed 1: SIMP-H example.'] },
    economics: { rows: [{ seed: 1, rawPerSec: 2, simpHPerSec: 1, b1PerSec: 0.5 }], pooled: { rawPerSec: 2, simpHPerSec: 1, b1PerSec: 0.5 } },
  };
  const md = renderMarkdown(results);
  assert.ok(md.includes('## Verdict'));
  assert.ok(md.includes('## Interpretation'));
  assert.ok(md.includes(BARS.pass));
  assert.ok(md.includes('## Post-hoc variant SIMP-H (not pre-registered)'));
  assert.ok(md.includes('post-hoc reading'));
  assert.ok(md.indexOf('## Verdict') < md.indexOf('## Post-hoc variant SIMP-H'));
});

test('economicsRows: per-seed rates and a pooled row weighted by seconds', () => {
  const cell = (seed, seconds, raw, simpH, b1PerSec) => ({ seed, seconds, raw: { total: raw }, simpH: { total: simpH }, b1: { perSec: b1PerSec } });
  const { rows, pooled } = economicsRows([cell(1, 10, 20, 10, 1), cell(2, 30, 30, 60, 3)]);
  assert.deepEqual(rows.map((r) => r.rawPerSec), [2, 1]);
  assert.deepEqual(rows.map((r) => r.simpHPerSec), [1, 2]);
  assert.deepEqual(rows.map((r) => r.b1PerSec), [1, 3]);
  assert.equal(pooled.rawPerSec, 50 / 40);
  assert.equal(pooled.simpHPerSec, 70 / 40);
  assert.equal(pooled.b1PerSec, (10 + 90) / 40);
});

test('verdictPostHoc is the same verdict fed with SIMP-H counts, with SIMPLIFIED relabelled SIMP-H', () => {
  const cells = [1, 2, 3].map((seed) => ({ seed, frames: 3600, b1: { perSec: 10 }, simpH: { total: 0, medianPerSec: 0 } }));
  const ok = verdictPostHoc({ kPassed: true, k5Ratio: 25, simpHCells: cells, e2P95Ms: 0.1 });
  assert.equal(ok.e1, 'PASS');
  assert.equal(ok.e2, 'PASS');
  const dead = verdictPostHoc({ kPassed: true, k5Ratio: 25, simpHCells: cells.map((c) => ({ ...c, simpH: { total: 3600, medianPerSec: 0 } })), e2P95Ms: 0.1 });
  assert.equal(dead.e1, 'DEAD');
  assert.ok(dead.reasons.some((s) => s.startsWith('E1 DEAD: SIMP-H events')));
  const pre = verdict({ kPassed: true, k5Ratio: 25, e1Cells: cells.map((c) => ({ seed: c.seed, frames: c.frames, simpEvents: 0, simpMedianPerSec: 0, b1PerSec: 10 })), e2P95Ms: 0.1 });
  assert.equal(pre.e1, 'PASS');
});
