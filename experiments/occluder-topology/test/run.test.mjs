import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCell, b1For, walkersFor, runAll, writeOut } from '../run.mjs';
import { makePath } from '../../topo-field/path.mjs';
import { renderMarkdown } from '../report.mjs';
import { BARS } from '../verdict.mjs';

const ROAM = 5;
const strip = (c) => {
  const { ms, ...rest } = c;
  return rest;
};

let real;
let shuffled;
const realCell = () => (real ??= runCell({ seed: 1, roamSeconds: ROAM }));
const shuffledCell = () => (shuffled ??= runCell({ seed: 1, roamSeconds: ROAM, shuffle: true }));

test('B1 on the full unmodified path matches topo-field for seeds 1, 2, 3', () => {
  const want = [0.78829, 0.68975, 0.78829];
  [1, 2, 3].forEach((seed, i) => assert.ok(Math.abs(b1For(seed).perSec - want[i]) < 1e-4, `seed ${seed}`));
});

test('walkersFor: N=0 has no walker occluders, N=20 has 20 walkers', () => {
  assert.equal(walkersFor(1, 0, false), null);
  assert.equal(walkersFor(1, 20, false).x.length, 20);
});

test('runCell shape: frames are path transitions, seconds are counted/60, one seam', () => {
  const c = realCell();
  const path = makePath(1, { roamSeconds: ROAM });
  assert.equal(c.frames, path.frames - 1);
  assert.equal(c.seconds, c.counted / 60);
  assert.equal(c.seamCount, 1);
  for (const k of ['raw', 'plain', 'latched']) assert.ok(typeof c[k].total === 'number', k);
  assert.ok(c.latched.frame0Births >= 0);
  for (const k of ['cls', 'tracking', 'invariant', 'b1', 'excluded', 'ms']) assert.ok(k in c, k);
});

test('excluded plus headline equals every transition, per column', () => {
  const c = realCell();
  for (const k of ['raw', 'plain', 'latched']) assert.equal(c[k].total + c.excluded[k].total, c.all[k], k);
});

test('invariant flags equal their arithmetic', () => {
  const c = realCell();
  assert.equal(c.invariant.plainHolds, c.plain.total <= c.raw.total);
  assert.equal(c.invariant.latchedHolds, c.latched.total <= c.raw.total + c.latched.frame0Births);
});

test('determinism: two runs of 120 frames are identical apart from timing', () => {
  const a = runCell({ seed: 1, roamSeconds: ROAM, maxFrames: 120 });
  const b = runCell({ seed: 1, roamSeconds: ROAM, maxFrames: 120 });
  assert.deepEqual(strip(a), strip(b));
});

test('shuffled control has more plain events than the real walk on the same cell', () => {
  assert.ok(shuffledCell().plain.total > realCell().plain.total);
});

test('N=0 cell is configured with no movers', () => {
  const c = runCell({ seed: 1, roamSeconds: ROAM, N: 0, maxFrames: 60 });
  assert.equal(c.N, 0);
  assert.equal(walkersFor(1, c.N, false), null);
});

test('runAll smoke: gate runs, results render with the bars and Limits last, files written', () => {
  const results = runAll({ roamSeconds: ROAM, seeds: [1], sensSeeds: [] });
  assert.equal(results.known.pass, true);
  assert.equal(results.real.length, 1);
  assert.equal(results.shuffled.length, 1);
  const md = renderMarkdown(results);
  for (const b of [BARS.pass, BARS.dead, BARS.mid]) assert.ok(md.includes(b), b);
  assert.ok(md.indexOf('## Limits') > md.indexOf('## Verdict'));
  assert.equal(/results\//.test(md), false);
  const dir = mkdtempSync(join(tmpdir(), 'occ-'));
  writeOut(dir, results);
  assert.ok(existsSync(join(dir, 'results.json')) && existsSync(join(dir, 'results.md')));
});
