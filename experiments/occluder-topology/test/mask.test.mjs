// Exact Euclidean distance transform checked against a brute-force reference and hand masks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edt } from '../mask.mjs';

const W = 32, N = W * W;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reference: nearest background centre inside the box, or the one-pixel border outside it.
function brute(mask) {
  const out = new Float64Array(N);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    let best = Math.min(x + 1, y + 1, W - x, W - y);
    for (let j = 0; j < N; j++) {
      if (mask[j]) continue;
      const dx = (j % W) - x, dy = ((j / W) | 0) - y;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
    }
    out[y * W + x] = best;
  }
  return out;
}

function blob(rand) {
  const m = new Uint8Array(N);
  const cx = rand() * W, cy = rand() * W, rad = 0.5 + rand() * 19.5;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    m[y * W + x] = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rad ? 1 : 0;
  }
  return m;
}

function noise(rand) {
  const m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = rand() < 0.5 ? 1 : 0;
  return m;
}

function assertEdt(mask, name) {
  const got = edt(mask, W), want = brute(mask);
  for (let i = 0; i < N; i++) {
    assert.ok(Math.abs(got[i] - want[i]) <= 1e-9, `${name} pixel ${i}: got ${got[i]}, want ${want[i]}`);
  }
}

test('edt equals the brute-force reference on 300 blob masks and 10 noise masks', () => {
  const rand = rng(7);
  for (let t = 0; t < 300; t++) assertEdt(blob(rand), `blob ${t}`);
  for (let t = 0; t < 10; t++) assertEdt(noise(rand), `noise ${t}`);
});

test('edt of an empty mask is all zero', () => {
  assert.ok(edt(new Uint8Array(N), W).every((v) => v === 0));
});

// At (15,15) the nearest background is the border: min(16, 16, 17, 17) = 16.
test('edt of a full mask peaks at 16 (distance to the border)', () => {
  const d = edt(new Uint8Array(N).fill(1), W);
  assert.equal(d[15 * W + 15], 16);
  assert.equal(Math.max(...d), 16);
});

test('edt of a single pixel is 1', () => {
  const m = new Uint8Array(N);
  m[10 * W + 10] = 1;
  assert.equal(edt(m, W)[10 * W + 10], 1);
});

test('edt of a 1 px line is 1 on every line pixel', () => {
  const m = new Uint8Array(N);
  for (let x = 0; x < W; x++) m[10 * W + x] = 1;
  const d = edt(m, W);
  for (let x = 0; x < W; x++) assert.equal(d[10 * W + x], 1);
});

test('edt of a 7 px wide full-height column peaks at 4 at its centre column', () => {
  const m = new Uint8Array(N);
  for (let y = 0; y < W; y++) for (let x = 12; x <= 18; x++) m[y * W + x] = 1;
  assert.equal(edt(m, W)[15 * W + 15], 4);
});
