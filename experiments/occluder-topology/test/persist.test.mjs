// Per-occluder persistence (h0Superlevel bars mapped to components) against flood fill and brute-force EDT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAnalyser, classify, showProb, P_OFFSET } from '../persist.mjs';

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

// 4-connected flood fill: the reference partition.
function flood(mask) {
  const lab = new Int32Array(N).fill(-1);
  let k = 0;
  for (let s = 0; s < N; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    const stack = [s];
    lab[s] = k;
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
        const j = ny * W + nx;
        if (mask[j] && lab[j] < 0) { lab[j] = k; stack.push(j); }
      }
    }
    k++;
  }
  return { lab, k };
}

function blob(r) {
  const m = new Uint8Array(N);
  const cx = r() * W, cy = r() * W, rad = 0.5 + r() * 19.5;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) m[y * W + x] = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rad ? 1 : 0;
  return m;
}

function noise(r) {
  const m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = r() < 0.5 ? 1 : 0;
  return m;
}

function assertSame(mask, name) {
  const an = makeAnalyser()(mask);
  const d = brute(mask);
  const { lab, k } = flood(mask);
  const peak = new Float64Array(k);
  for (let i = 0; i < N; i++) if (lab[i] >= 0) peak[lab[i]] = Math.max(peak[lab[i]], d[i]);
  assert.equal(an.k, k, `${name}: component count`);
  const toAn = new Map();
  for (let i = 0; i < N; i++) {
    if (lab[i] < 0) { assert.equal(an.labels[i], -1, `${name}: background label`); continue; }
    const r = lab[i], a = an.labels[i];
    if (toAn.has(r)) assert.equal(toAn.get(r), a, `${name}: partition differs at pixel ${i}`);
    else toAn.set(r, a);
    assert.ok(Math.abs(an.p[a] - (peak[r] - P_OFFSET)) <= 1e-9, `${name}: p of component ${r} is ${an.p[a]}`);
  }
  assert.equal(new Set(toAn.values()).size, k, `${name}: components not one-to-one`);
}

test('bar-to-component p equals flood fill and brute-force EDT on 300 blob and 10 noise masks', () => {
  const r = rng(11);
  for (let t = 0; t < 300; t++) assertSame(blob(r), `blob ${t}`);
  for (let t = 0; t < 10; t++) assertSame(noise(r), `noise ${t}`);
});

function rect(x0, x1, y0, y1) {
  const m = new Uint8Array(N);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1;
  return m;
}

function column(x0, width) {
  const m = new Uint8Array(N);
  for (let y = 0; y < W; y++) for (let x = x0; x < x0 + width; x++) if (x >= 0 && x < W) m[y * W + x] = 1;
  return m;
}

function pOf(mask) {
  const an = makeAnalyser()(mask);
  return { k: an.k, p: Array.from(an.p), cls: Array.from(an.cls) };
}

test('two equal discs give two components with equal p', () => {
  const m = new Uint8Array(N);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (Math.hypot(x - 7, y - 7) <= 4 || Math.hypot(x - 24, y - 24) <= 4) m[y * W + x] = 1;
  }
  const { k, p } = pOf(m);
  assert.equal(k, 2);
  assert.equal(p[0], p[1]);
  assertSame(m, 'equal discs');
});

test('diagonally touching squares are two components under 4-connectivity', () => {
  const m = rect(0, 5, 0, 5);
  for (let y = 5; y < 10; y++) for (let x = 5; x < 10; x++) m[y * W + x] = 1;
  assert.equal(pOf(m).k, 2);
  assertSame(m, 'diagonal');
});

test('a disc with a background hole is one component matching the reference', () => {
  const m = new Uint8Array(N);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const r = Math.hypot(x - 16, y - 16);
    if (r <= 8 && r > 3) m[y * W + x] = 1;
  }
  assert.equal(pOf(m).k, 1);
  assertSame(m, 'hole');
});

test('a full mask is one component with p 15.5', () => {
  const { k, p, cls } = pOf(new Uint8Array(N).fill(1));
  assert.equal(k, 1);
  assert.equal(p[0], 15.5);
  assert.equal(cls[0], 2);
});

// peaks (min distance to the box edge or to background) are 1, 1, 2, 3, 4, 8, so p = peak - 0.5 gives the list below.
test('known shapes have the p of the design note', () => {
  const cases = [
    ['1 px line', rect(0, W, 10, 11), 0.5],
    ['2x2', rect(10, 12, 10, 12), 0.5],
    ['3x3', rect(10, 13, 10, 13), 1.5],
    ['6 px wide column', column(10, 6), 2.5],
    ['7 px wide column', column(10, 7), 3.5],
    ['15x15 square', rect(8, 23, 8, 23), 7.5],
  ];
  for (const [name, m, want] of cases) {
    const { k, p } = pOf(m);
    assert.equal(k, 1, name);
    assert.equal(p[0], want, name);
  }
});

test('an empty mask has no components', () => {
  const { k, p, cls } = pOf(new Uint8Array(N));
  assert.equal(k, 0);
  assert.equal(p.length, 0);
  assert.equal(cls.length, 0);
});

test('pOffset 0 uses the peak EDT itself', () => {
  const an = makeAnalyser({ pOffset: 0 })(rect(0, W, 10, 11));
  assert.equal(an.p[0], 1);
});

test('classify: 0 below 1, 1 in the band [1, 3], 2 above 3', () => {
  assert.equal(classify(0.999), 0);
  assert.equal(classify(1.0), 1);
  assert.equal(classify(3.0), 1);
  assert.equal(classify(3.001), 2);
});

test('showProb: 1 below 1, 0 above 3, linear in the band', () => {
  assert.equal(showProb(0.5), 1);
  assert.equal(showProb(1), 1);
  assert.equal(showProb(1.5), 0.75);
  assert.equal(showProb(3), 0);
  assert.equal(showProb(3.5), 0);
});
