// Tests for baseline B1 (chunk-boundary crossings) and B2 (per-cell live flips).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkCrossings, makeFlipCounter } from '../baselines.mjs';

function track(frames, fn) {
  const x = new Float64Array(frames);
  const z = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    const [px, pz] = fn(f);
    x[f] = px;
    z[f] = pz;
  }
  return { x, z };
}

test('B1 straight line along +x at 15 m/s for 4 s: 3 crossings, 9 loads, 0.75 per second', () => {
  const { x, z } = track(241, (f) => [0.1 + 0.25 * f, 0]);
  const r = chunkCrossings(x, z, { chunk: 16, window: 48 });
  assert.equal(r.crossings, 3);
  assert.equal(r.loads, 9);
  assert.equal(r.seconds, 4);
  assert.equal(r.perSec, 3 / 4);
  assert.equal(r.loadsPerSec, 9 / 4);
});

test('B1 diagonal step through a corner: 1 crossing, 5 loads', () => {
  const { x, z } = track(2, (f) => (f === 0 ? [15.9, 15.9] : [16.1, 16.1]));
  const r = chunkCrossings(x, z, { chunk: 16, window: 48 });
  assert.equal(r.crossings, 1);
  assert.equal(r.loads, 5);
});

test('B1 stationary seal: 0 crossings', () => {
  const { x, z } = track(100, () => [5, 5]);
  const r = chunkCrossings(x, z, { chunk: 16, window: 48 });
  assert.equal(r.crossings, 0);
  assert.equal(r.loads, 0);
  assert.equal(r.perSec, 0);
});

test('B1 back and forth over a boundary every frame: crossings = F-1', () => {
  const frames = 50;
  const { x, z } = track(frames, (f) => (f % 2 === 0 ? [15.9, 0] : [16.1, 0]));
  const r = chunkCrossings(x, z, { chunk: 16, window: 48 });
  assert.equal(r.crossings, frames - 1);
});

test('B2 flip counter: a cell toggling 0.30/0.40 every frame flips frames-1 times; first call returns 0', () => {
  const n = 5;
  const frames = 100;
  const counter = makeFlipCounter(n, 0.35);
  const c = new Float64Array(n).fill(0.9);
  const returned = [];
  for (let f = 0; f < frames; f++) {
    c[0] = f % 2 === 0 ? 0.30 : 0.40;
    returned.push(counter.step(c));
  }
  assert.equal(returned[0], 0);
  assert.ok(returned.slice(1).every((v) => v === 1));
  assert.equal(counter.total, frames - 1);
});

test('B2 flip counter: wobble inside 0.36..0.64 flips 0 times', () => {
  const n = 8;
  const counter = makeFlipCounter(n, 0.35);
  const c = new Float64Array(n);
  let total = 0;
  for (let f = 0; f < 200; f++) {
    for (let i = 0; i < n; i++) c[i] = 0.36 + 0.28 * (((f * 7 + i * 13) % 11) / 10);
    total += counter.step(c);
  }
  assert.equal(total, 0);
  assert.equal(counter.total, 0);
});
