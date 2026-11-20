import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict, BARS } from '../verdict.mjs';

const cell = (seed, o = {}) => ({ seed, frames: 7200, simpEvents: 10, simpMedianPerSec: 0, b1PerSec: 20, ...o });
const three = (o = {}) => [cell(1, o), cell(2, o), cell(3, o)];
const input = (cells, extra = {}) => ({ kPassed: true, k5Ratio: 50, e1Cells: cells, e2P95Ms: 0.2, ...extra });

test('PASS: three seeds with zero median and event rate far under 0.1 x B1', () => {
  const r = verdict(input(three()));
  assert.equal(r.e1, 'PASS');
  assert.equal(r.e2, 'PASS');
});

test('DEAD: pooled 2193 events over 21900 frames is above 0.1 per frame', () => {
  const dead = [1, 2, 3].map((seed) => cell(seed, { frames: 7300, simpEvents: 731 }));
  assert.equal(verdict(input(dead)).e1, 'DEAD');
});

test('not DEAD: pooled exactly 0.1 per frame (2190 over 21900) is not dead', () => {
  const edge = [1, 2, 3].map((seed) => cell(seed, { frames: 7300, simpEvents: 730 }));
  assert.notEqual(verdict(input(edge)).e1, 'DEAD');
});

test('UNRESOLVED: one seed has median 2 per second', () => {
  const cells = [cell(1), cell(2, { simpMedianPerSec: 2 }), cell(3)];
  assert.equal(verdict(input(cells)).e1, 'UNRESOLVED');
});

test('INVALID: known-answer gate failed', () => {
  const r = verdict(input(three(), { kPassed: false }));
  assert.equal(r.e1, 'INVALID');
  assert.ok(r.reasons.some((s) => /known-answer/i.test(s)));
});

test('INVALID: K5 ratio 19.9 is below 20x', () => {
  const r = verdict(input(three(), { k5Ratio: 19.9 }));
  assert.equal(r.e1, 'INVALID');
  assert.ok(r.reasons.some((s) => /K5/.test(s)));
});

test('K5 ratio Infinity (real walk has zero events) is valid', () => {
  assert.equal(verdict(input(three(), { k5Ratio: Infinity })).e1, 'PASS');
});

test('median boundary: simpMedianPerSec 1 passes, 1.0001 does not', () => {
  assert.equal(verdict(input(three({ simpMedianPerSec: 1 }))).e1, 'PASS');
  assert.equal(verdict(input(three({ simpMedianPerSec: 1.0001 }))).e1, 'UNRESOLVED');
});

test('mean rate boundary: exactly 0.1 x B1 passes, just above fails', () => {
  const at = verdict(input(three({ frames: 6000, simpEvents: 10, b1PerSec: 1 })));
  assert.equal(at.e1, 'PASS');
  const above = verdict(input(three({ frames: 6000, simpEvents: 10, b1PerSec: 0.99999 })));
  assert.equal(above.e1, 'UNRESOLVED');
});

test('E2 boundary: p95 0.5 ms PASS, 0.5001 ms FAIL', () => {
  assert.equal(verdict(input(three(), { e2P95Ms: 0.5 })).e2, 'PASS');
  assert.equal(verdict(input(three(), { e2P95Ms: 0.5001 })).e2, 'FAIL');
});

test('an INVALID E1 does not change the E2 verdict', () => {
  assert.equal(verdict(input(three(), { kPassed: false, e2P95Ms: 0.2 })).e2, 'PASS');
  assert.equal(verdict(input(three(), { k5Ratio: 1, e2P95Ms: 0.9 })).e2, 'FAIL');
});

test('BARS strings are the prereg text verbatim', () => {
  assert.equal(BARS.pass, 'PASS bar (fixed now): SIMPLIFIED topology events median <= 1 per second AND <= 0.1 x B1 chunk crossings per second, at h=4, N=20, on all 3 seeds.');
  assert.equal(BARS.dead, 'DEAD if SIMPLIFIED events > 1 per 10 frames at h=4, N=20. Anything between is reported as unresolved, not as a pass.');
  assert.equal(BARS.e2, 'Bar: p95 <= 0.5 ms CPU per frame.');
  assert.equal(BARS.k5, 'K5 negative control: same walk with mover positions re-randomised every frame: events/frame must be at least 20x the real walk (shows the detector can see events).');
});
