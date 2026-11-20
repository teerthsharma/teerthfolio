import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verdict, verdictLatched, BARS } from '../verdict.mjs';

const PREREG = readFileSync(new URL('../PREREGISTRATION.md', import.meta.url), 'utf8');
const B1 = [0.78829, 0.68975, 0.78829];
const seeds = (perSec = [0, 0, 0], control = 50) => ({
  kPassed: true,
  controlRatio: control,
  seeds: perSec.map((p, i) => ({ seed: i + 1, perSec: p, b1PerSec: B1[i] })),
});

test('PASS: three seeds at zero filtered rate with control 50x', () => {
  assert.equal(verdict(seeds()).verdict, 'PASS');
});

test('PASS boundary: filtered exactly 0.1 x B1 passes', () => {
  assert.equal(verdict({ kPassed: true, controlRatio: 20, seeds: [{ seed: 1, perSec: 0.1, b1PerSec: 1 }] }).verdict, 'PASS');
});

test('UNRESOLVED boundary: filtered just above 0.1 x B1 is not a pass', () => {
  assert.equal(verdict({ kPassed: true, controlRatio: 20, seeds: [{ seed: 1, perSec: 0.1000001, b1PerSec: 1 }] }).verdict, 'UNRESOLVED');
});

test('prereg numbers: seed 1 at 0.0788/s is under 0.1 x 0.78829 and passes', () => {
  assert.equal(verdict(seeds([0.0788, 0, 0])).verdict, 'PASS');
});

test('DEAD boundary: filtered exactly B1 is DEAD', () => {
  assert.equal(verdict({ kPassed: true, controlRatio: 50, seeds: [{ seed: 1, perSec: 0.78829, b1PerSec: 0.78829 }] }).verdict, 'DEAD');
});

test('DEAD: one seed over B1 is DEAD even when the other two are PASS-level', () => {
  assert.equal(verdict(seeds([0, 0.7, 0])).verdict, 'DEAD');
});

test('control 19.99 blocks PASS even when every seed is under 0.1 x B1', () => {
  const r = verdict(seeds([0, 0, 0], 19.99));
  assert.equal(r.verdict, 'UNRESOLVED');
  assert.ok(r.reasons.some((s) => /19\.99/.test(s) && /below the 20x bar/.test(s) && /PASS is blocked/.test(s)));
});

test('control exactly 20 passes', () => {
  assert.equal(verdict(seeds([0, 0, 0], 20)).verdict, 'PASS');
});

test('control Infinity (real walk has zero events, shuffled has some) passes', () => {
  assert.equal(verdict(seeds([0, 0, 0], Infinity)).verdict, 'PASS');
});

test('control NaN blocks PASS', () => {
  assert.equal(verdict(seeds([0, 0, 0], NaN)).verdict, 'UNRESOLVED');
});

test('NaN filtered rate is never a PASS', () => {
  assert.equal(verdict(seeds([NaN, 0, 0])).verdict, 'UNRESOLVED');
});

test('INVALID: failed known-answer gate, and it wins over a DEAD seed', () => {
  const r = verdict({ ...seeds([0.9, 0, 0]), kPassed: false });
  assert.equal(r.verdict, 'INVALID');
  assert.ok(r.reasons.some((s) => /known-answer/.test(s)));
});

test('no seeds gives UNRESOLVED, not a vacuous PASS', () => {
  assert.equal(verdict({ kPassed: true, controlRatio: 50, seeds: [] }).verdict, 'UNRESOLVED');
});

test('every seed gets a reason line, and the control line is always present', () => {
  const r = verdict(seeds([0, 0.5, 0]));
  assert.equal(r.reasons.filter((s) => s.startsWith('seed ')).length, 3);
  assert.ok(r.reasons.some((s) => s.startsWith('control ratio')));
});

test('verdictLatched: same verdict, reasons relabelled LATCHED', () => {
  const plain = verdict(seeds([0, 0.7, 0]));
  const latched = verdictLatched(seeds([0, 0.7, 0]));
  assert.equal(latched.verdict, plain.verdict);
  assert.equal(latched.verdict, 'DEAD');
  assert.equal(latched.reasons.length, plain.reasons.length);
  assert.ok(latched.reasons.every((s) => s.startsWith('LATCHED: ')));
});

test('BARS strings occur verbatim in PREREGISTRATION.md', () => {
  for (const s of [BARS.pass, BARS.dead, BARS.mid]) assert.ok(PREREG.includes(s), s);
});

test('BARS are the prereg text', () => {
  assert.equal(BARS.pass, 'PASS: filtered events <= 0.1 x B1 (0.069-0.079/s) on all 3 seeds, and the control rate >= 20x the real rate.');
  assert.equal(BARS.dead, "DEAD: filtered events >= that seed's B1 (0.69-0.79/s) on any seed.");
  assert.equal(BARS.mid, 'Anything between: UNRESOLVED.');
});
