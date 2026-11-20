import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCell } from '../run.mjs';
import { renderMarkdown } from '../report.mjs';
import { BARS } from '../verdict.mjs';

const withoutMs = (r) => {
  const { ms, timing, ...rest } = r;
  return rest;
};

test('runCell returns the full shape, with frames = tourFrames + 300 at roamSeconds 5', () => {
  const r = runCell({ h: 8, N: 20, seed: 1, roamSeconds: 5 });
  for (const k of ['h', 'N', 'seed', 'shuffle', 'water', 'delta', 'ncells', 'frames', 'seconds', 'tourFrames', 'raw', 'simp', 'b1', 'b2', 'ms']) {
    assert.ok(k in r, `missing key ${k}`);
  }
  assert.equal(r.frames, r.tourFrames + 300);
  assert.ok(Math.abs(r.seconds * 60 - r.frames) < 1e-9);
  for (const side of [r.raw, r.simp]) {
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

test('runCell: raw total >= simplified total >= 0 on six cells', () => {
  const cells = [
    { h: 8, N: 20, seed: 1 }, { h: 8, N: 20, seed: 2 }, { h: 8, N: 60, seed: 3 },
    { h: 4, N: 0, seed: 1 }, { h: 4, N: 20, seed: 2 }, { h: 4, N: 60, seed: 3 },
  ];
  for (const opts of cells) {
    const r = runCell({ ...opts, roamSeconds: 5 });
    assert.ok(r.raw.total >= r.simp.total, `raw ${r.raw.total} < simp ${r.simp.total} at ${JSON.stringify(opts)}`);
    assert.ok(r.simp.total >= 0, `negative simp total at ${JSON.stringify(opts)}`);
  }
});

const fakeSide = (total) => ({ birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0, total, medianPerSec: 0, seam: { birth: 0, death: 0, merge: 0, split: 0, holeOpen: 0, holeClose: 0, total: 0 } });
const fakeCell = (h, N, seed, extra = {}) => ({
  h, N, seed, shuffle: false, water: true, delta: 0.1, ncells: 100, frames: 300, seconds: 5, tourFrames: 0,
  raw: fakeSide(3), simp: fakeSide(1), b1: { perSec: 1, crossings: 5, loads: 15, seconds: 5, loadsPerSec: 3 },
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
  const md = renderMarkdown(results);
  assert.ok(md.includes('## Verdict'));
  assert.ok(md.includes('## Interpretation'));
  assert.ok(md.includes(BARS.pass));
});
