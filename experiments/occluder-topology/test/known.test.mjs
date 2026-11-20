// Known-answer gate for the occluder event tracker (run.mjs spawns this file; every test name is a gate line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAnalyser, makeEvents } from '../persist.mjs';

const W = 32, N = W * W;
const MODES = ['raw', 'plain', 'latched'];
const KEYS = ['birth', 'death', 'merge', 'split', 'frame0Births'];

function rect(x0, x1, y0, y1) {
  const m = new Uint8Array(N);
  for (let y = Math.max(0, y0); y < Math.min(W, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) m[y * W + x] = 1;
  return m;
}

function columns(x0, width) {
  return rect(x0, x0 + width, 0, W);
}

// Per-frame event list for one mode: [{ f, birth, death, merge, split, frame0Births }] for frames with any event.
function eventsOf(mode, count, maskAt) {
  const an = makeAnalyser(), ev = makeEvents({ mode });
  const out = [];
  for (let f = 0; f < count; f++) {
    const e = ev.step(an(maskAt(f)));
    if (KEYS.some((k) => e[k] !== 0)) out.push({ f, ...e });
  }
  return out;
}

function totals(count, maskAt) {
  const out = {};
  for (const mode of MODES) {
    const t = Object.fromEntries(KEYS.map((k) => [k, 0]));
    for (const e of eventsOf(mode, count, maskAt)) for (const k of KEYS) t[k] += e[k];
    out[mode] = t;
  }
  return out;
}

const ZERO = { birth: 0, death: 0, merge: 0, split: 0, frame0Births: 0 };
const pick = (t, keys) => Object.fromEntries(keys.map((k) => [k, t[k]]));

test('K0 an empty scene is a valid stream with no events', () => {
  const t = totals(5, () => new Uint8Array(N));
  for (const mode of MODES) assert.deepEqual(t[mode], ZERO);
});

test('K1 a static 10x10 square has no events after frame 0 in any mode', () => {
  const t = totals(20, () => rect(10, 20, 10, 20));
  for (const mode of MODES) assert.deepEqual(t[mode], ZERO, mode);
});

test('K2 a square that appears at frame 10 and vanishes at 20 is one birth and one death', () => {
  const maskAt = (f) => (f >= 10 && f < 20 ? rect(10, 20, 10, 20) : new Uint8Array(N));
  const t = totals(30, maskAt);
  for (const mode of ['raw', 'plain']) assert.deepEqual(pick(t[mode], ['birth', 'death', 'merge', 'split']), { birth: 1, death: 1, merge: 0, split: 0 }, mode);
});

test('K3 two 10x10 squares that bridge into a 10x24 block at frame 10 are one merge, and the reverse is one split', () => {
  const two = () => { const b = rect(14, 24, 5, 15); return rect(0, 10, 5, 15).map((v, i) => v | b[i]); };
  const block = () => rect(0, 24, 5, 15);
  const merge = totals(20, (f) => (f < 10 ? two() : block()));
  const split = totals(20, (f) => (f < 10 ? block() : two()));
  for (const mode of MODES) {
    assert.equal(merge[mode].merge, 1, `merge ${mode}`);
    assert.equal(merge[mode].birth + merge[mode].death + merge[mode].split, 0, `merge only ${mode}`);
    assert.equal(split[mode].split, 1, `split ${mode}`);
    assert.equal(split[mode].merge + split[mode].birth + split[mode].death, 0, `split only ${mode}`);
  }
});

function sweep(width) {
  return (f) => columns(-width + f, width);
}

test('K4 POLE 8 px wide slides across the box: raw 1 birth 1 death, plain p>3 1 birth 1 death at width 7 and 26', () => {
  const pole = sweep(8);
  const t = totals(60, pole);
  for (const mode of MODES) assert.deepEqual(pick(t[mode], ['birth', 'death', 'merge', 'split']), { birth: 1, death: 1, merge: 0, split: 0 }, mode);
  // x0 = -8 + f: width 7 first at x0 = -1 (f 7); width 6 at x0 = 26 (f 34). Latched keeps it until it leaves (f 40).
  const plain = eventsOf('plain', 60, pole);
  assert.deepEqual(plain.map((e) => [e.f, e.birth ? 'birth' : 'death']), [[7, 'birth'], [34, 'death']]);
  const latched = eventsOf('latched', 60, pole);
  assert.deepEqual(latched.map((e) => [e.f, e.birth ? 'birth' : 'death']), [[7, 'birth'], [40, 'death']]);
});

test('K5 THIN pole 3 px wide is a band occluder: raw 1 birth 1 death, plain no events', () => {
  const t = totals(60, sweep(3));
  assert.deepEqual(pick(t.raw, ['birth', 'death', 'merge', 'split']), { birth: 1, death: 1, merge: 0, split: 0 });
  assert.deepEqual(pick(t.plain, ['birth', 'death', 'merge', 'split']), { birth: 0, death: 0, merge: 0, split: 0 });
});

// A 1 px line moves its own width per frame, so consecutive masks share no pixel: every visible frame is a
// tracking break (death plus birth, as K9), not the 1/1 the prereg sketch implied. Plain must still see nothing.
test('K5 a 1 px line (p 0.5, over class) breaks tracking every visible frame; plain sees nothing', () => {
  const t = totals(40, sweep(1));
  assert.deepEqual(pick(t.raw, ['birth', 'death', 'merge', 'split']), { birth: 32, death: 32, merge: 0, split: 0 });
  assert.deepEqual(pick(t.plain, ['birth', 'death']), { birth: 0, death: 0 });
});

test('K6 wobble 6x6 and 7x7 alternating for 40 frames: plain flickers, latched holds one birth, raw none', () => {
  const maskAt = (f) => (f % 2 === 0 ? rect(10, 16, 10, 16) : rect(10, 17, 10, 17));
  const t = totals(40, maskAt);
  assert.deepEqual(pick(t.raw, ['birth', 'death']), { birth: 0, death: 0 });
  // 39 transitions after frame 0, starting with a birth at frame 1: births at odd frames (20), deaths at even (19).
  assert.equal(t.plain.birth + t.plain.death, 39);
  assert.equal(t.plain.birth, 20);
  assert.equal(t.plain.death, 19);
  assert.deepEqual(pick(t.latched, ['birth', 'death']), { birth: 1, death: 0 });
});

test('K7 warm start: a 6x6 that grows to 7x7 at frame 5 is raw 0, plain 1 birth, latched 1 birth and frame0Births 1', () => {
  // The 6x6 is in lineage at frame 0; the grow at frame 5 is one frame0Birth (no prior S pixel).
  const maskAt = (f) => (f < 5 ? rect(10, 16, 10, 16) : rect(10, 17, 10, 17));
  const t = totals(10, maskAt);
  assert.deepEqual(pick(t.raw, ['birth', 'death']), { birth: 0, death: 0 });
  assert.deepEqual(pick(t.plain, ['birth', 'death']), { birth: 1, death: 0 });
  assert.deepEqual(pick(t.latched, ['birth', 'death', 'frame0Births']), { birth: 1, death: 0, frame0Births: 1 });
});

test('K8 p classes of the known masks match the thresholds', () => {
  const cases = [
    ['1 px line', rect(0, W, 10, 11), 0],
    ['2x2', rect(10, 12, 10, 12), 0],
    ['3x3', rect(10, 13, 10, 13), 1],
    ['6 px wide column', columns(10, 6), 1],
    ['7 px wide column', columns(10, 7), 2],
    ['15x15 square', rect(8, 23, 8, 23), 2],
  ];
  for (const [name, m, want] of cases) assert.equal(makeAnalyser()(m).cls[0], want, name);
});

test('K9 a jump with no overlap is a death plus a birth (tracking break, not a bug)', () => {
  const t = totals(10, (f) => (f < 5 ? rect(0, 10, 0, 10) : rect(20, 30, 20, 30)));
  assert.deepEqual(pick(t.raw, ['birth', 'death']), { birth: 1, death: 1 });
});
