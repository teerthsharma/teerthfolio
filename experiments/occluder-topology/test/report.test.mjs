import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../report.mjs';
import { BARS } from '../verdict.mjs';

const kinds = (birth, death, merge = 0, split = 0) => ({ birth, death, merge, split, total: birth + death + merge + split });

const cell = (seed, o = {}) => {
  const counted = 7200;
  return {
    seed, shuffle: false, variant: 'nominal', N: 20, pOffset: 0.5,
    frames: counted + 1, counted, seconds: counted / 60, seamCount: 1,
    invalid: 40, invalidShare: 40 / 7308,
    raw: kinds(2, 2, 1, 1),
    plain: kinds(0, 0),
    latched: { ...kinds(0, 0), frame0Births: 0 },
    excluded: { raw: kinds(0, 0), plain: kinds(0, 0), latched: kinds(0, 0) },
    b1: { crossings: 95, perSec: [0.78829, 0.68975, 0.78829][seed - 1] },
    cls: { framesWithOver: 10, framesWithBand: 5, framesWithSolid: 2, meanOccludedShare: 0.04, meanSolidComponents: 0.3 },
    tracking: { birthDeathSameFrame: 0 },
    invariant: { plainHolds: true, latchedHolds: true },
    ms: { analyseMedian: 0.1, analyseP95: 0.3 },
    ...o,
  };
};

const fixture = () => ({
  env: { head: 'abc1234', node: 'v25.8.1', cpu: 'Intel Core fixture', cpuCount: 8, date: '2026-11-20' },
  known: { pass: true, count: 9 },
  judged: {
    plain: {
      verdict: 'UNRESOLVED',
      reasons: ['seed 1: filtered 0.0000/s, B1 0.7883/s, 0.1 x B1 0.0788/s: under 0.1 x B1.', 'seed 2: filtered 0.2000/s, B1 0.6898/s, 0.1 x B1 0.0690/s: between.', 'control ratio 25x meets the 20x bar.'],
    },
    latched: { verdict: 'DEAD', reasons: ['LATCHED: seed 2: filtered 0.8000/s, B1 0.6898/s, 0.1 x B1 0.0690/s: DEAD-level.'] },
  },
  controlRatio: { plain: 25, latched: 3 },
  real: [cell(1), cell(2, { plain: kinds(12, 12) }), cell(3)],
  shuffled: [1, 2, 3].map((s) => cell(s, { shuffle: true, plain: kinds(10, 10), latched: { ...kinds(8, 8), frame0Births: 1 } })),
  sens: {
    envelope: [1, 2, 3].map((s) => cell(s, { variant: 'envelope' })),
    n0: [1, 2, 3].map((s) => cell(s, { N: 0 })),
    pOffset0: [1, 2, 3].map((s) => cell(s, { pOffset: 0 })),
  },
});

const at = (text, needle) => {
  const i = text.indexOf(needle);
  assert.ok(i >= 0, `missing: ${needle}`);
  return i;
};

test('sections appear in the fixed order', () => {
  const md = renderMarkdown(fixture());
  const order = ['## Verdict', '## LATCHED reading', '## Per-seed table', '## K control', '## Sensitivities', '## Invariants', '## Interpretation', '## Limits'];
  const idx = order.map((h) => at(md, h));
  assert.deepEqual([...idx].sort((a, b) => a - b), idx);
});

test('the three bars are quoted verbatim in the Verdict section', () => {
  const md = renderMarkdown(fixture());
  const verdictSection = md.slice(at(md, '## Verdict'), at(md, '## LATCHED reading'));
  for (const b of [BARS.pass, BARS.dead, BARS.mid]) assert.ok(verdictSection.includes(b), b);
});

test('the plain verdict is printed in the Verdict section, the latched one is labelled as not pre-registered', () => {
  const md = renderMarkdown(fixture());
  assert.ok(md.slice(at(md, '## Verdict'), at(md, '## LATCHED reading')).includes('**UNRESOLVED**'));
  const latched = md.slice(at(md, '## LATCHED reading'), at(md, '## Per-seed table'));
  assert.ok(latched.includes('specified before the run, not pre-registered'));
  assert.ok(latched.includes('**DEAD**'));
  assert.ok(latched.includes('never replaces the verdict'));
});

test('the per-seed table has a row per seed and column with the invariant column', () => {
  const md = renderMarkdown(fixture());
  const table = md.slice(at(md, '## Per-seed table'), at(md, '## K control'));
  assert.ok(table.includes('| seed | column |'));
  assert.ok(table.includes('| invariant |'));
  assert.equal(table.split('\n').filter((l) => /^\| [123] \| (RAW|filtered|LATCHED)/.test(l)).length, 9);
});

test('K control states the 20x bar for each column', () => {
  const md = renderMarkdown(fixture());
  const k = md.slice(at(md, '## K control'), at(md, '## Sensitivities'));
  assert.ok(k.includes('25.00') && k.includes('met'));
  assert.ok(k.includes('3.00') && k.includes('NOT met'));
});

test('Limits is the last section and a single paragraph', () => {
  const md = renderMarkdown(fixture());
  const tail = md.slice(at(md, '## Limits') + '## Limits'.length).trim();
  assert.ok(tail.length > 300);
  assert.equal(tail.includes('\n'), false);
  for (const s of ['sculpture', 'Roofs', 'Toy heights', 'penguin', 'Q3 and E0', 'Intel UHD']) assert.ok(tail.includes(s), s);
});

test('a violated invariant is written out as a witness, not hidden', () => {
  const f = fixture();
  f.real[1].invariant.latchedHolds = false;
  f.real[1].latched.total = 99;
  const md = renderMarkdown(f);
  const inv = md.slice(at(md, '## Invariants'), at(md, '## Interpretation'));
  assert.ok(inv.includes('VIOLATED latched <= raw + frame0Births'));
  assert.ok(inv.includes('seed 2'));
});

test('a holding fixture reports that every invariant holds', () => {
  const md = renderMarkdown(fixture());
  assert.ok(md.slice(at(md, '## Invariants'), at(md, '## Interpretation')).includes('Every cell holds'));
});

test('no results/ path and no first-person prose in the output', () => {
  const md = renderMarkdown(fixture());
  assert.equal(/results\//.test(md), false);
  assert.equal(/\b(I|I'd|I'm|my|unsolicited|no rush|happy to|feel free)\b/.test(md), false);
});

test('the Interpretation section carries D1 to D9 with the grass sentence in full', () => {
  const md = renderMarkdown(fixture());
  const interp = md.slice(at(md, '## Interpretation'), at(md, '## Limits'));
  for (let i = 1; i <= 9; i++) assert.ok(interp.includes(`D${i} `), `D${i}`);
  assert.ok(interp.includes("The island's only grass is the Covenant meadow"));
  assert.ok(interp.includes('so a grass term would be an empty set.'));
});
