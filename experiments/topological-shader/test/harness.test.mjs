import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHexGrid } from "../../../lib/world/heat/hexgrid.js";
import { packTh, unpackTh, TH_COLS, TH_ROWS } from "../../../lib/world/heat/harness.js";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = 84;
const H = 4;
const G = makeHexGrid(R, H);
const S = (H * Math.sqrt(3)) / 2;

// Independent texel address for each cell: odd-r row from z, column from x, both
// shifted so the grid's smallest index sits at texel 0.
function texelOf(g) {
  const cells = [];
  let minI = Infinity;
  let minJ = Infinity;
  for (let c = 0; c < g.n; c++) {
    const j = Math.round(g.zs[c] / S);
    const off = j & 1 ? H / 2 : 0;
    const i = Math.round((g.xs[c] - off) / H);
    cells.push({ i, j });
    minI = Math.min(minI, i);
    minJ = Math.min(minJ, j);
  }
  return cells.map(({ i, j }) => ({ col: i - minI, row: j - minJ }));
}

function randomInputs(n, seed, { nullKappa = false, nullLambda = false } = {}) {
  const rng = mulberry32(seed);
  const type = new Uint8Array(n);
  const crit = new Uint8Array(n);
  const mult = new Uint8Array(n);
  const C = new Float32Array(n);
  const kappa = nullKappa ? null : new Float32Array(n);
  const lambda = nullLambda ? null : new Float32Array(n);
  for (let c = 0; c < n; c++) {
    type[c] = Math.floor(rng() * 3);
    crit[c] = Math.floor(rng() * 4);
    mult[c] = Math.floor(rng() * 16);
    C[c] = rng();
    if (kappa) kappa[c] = rng();
    if (lambda) lambda[c] = rng();
  }
  return { type, crit, mult, C, kappa, lambda };
}

test("texture constants are the 43 by 49 harness size and match the test grid", () => {
  assert.equal(TH_COLS, 43);
  assert.equal(TH_ROWS, 49);
  assert.equal(G.cols, TH_COLS);
  assert.equal(G.rows, TH_ROWS);
});

test("round trip returns every cell's region, critical type, multiplicity and fields", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const inp = randomInputs(G.n, 7);
  packTh(data, inp.type, inp.crit, inp.mult, inp.C, inp.kappa, inp.lambda, G);
  const texel = texelOf(G);
  for (let c = 0; c < G.n; c++) {
    const { col, row } = texel[c];
    const u = unpackTh(data, col, row);
    assert.equal(u.s, inp.type[c], `cell ${c} region`);
    assert.equal(u.crit, inp.crit[c], `cell ${c} crit`);
    assert.equal(u.mult, inp.mult[c], `cell ${c} mult`);
    assert.ok(Math.abs(u.C - inp.C[c]) <= 0.5 / 255 + 1e-9, `cell ${c} C`);
    assert.ok(Math.abs(u.kappa - inp.kappa[c]) <= 0.5 / 255 + 1e-9, `cell ${c} kappa`);
    assert.ok(Math.abs(u.lambda - inp.lambda[c]) <= 0.5 / 255 + 1e-9, `cell ${c} lambda`);
  }
});

test("texels with no hex cell are all zero, even over a dirty buffer", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4).fill(0xff);
  const inp = randomInputs(G.n, 3);
  packTh(data, inp.type, inp.crit, inp.mult, inp.C, inp.kappa, inp.lambda, G);
  const occupied = new Set(texelOf(G).map(({ col, row }) => row * TH_COLS + col));
  let unknown = 0;
  for (let t = 0; t < TH_COLS * TH_ROWS; t++) {
    if (occupied.has(t)) continue;
    unknown++;
    const col = t % TH_COLS;
    const row = Math.floor(t / TH_COLS);
    assert.deepEqual(unpackTh(data, col, row), { s: 0, crit: 0, mult: 0, C: 0, kappa: 0, lambda: 0 }, `texel ${col},${row}`);
  }
  assert.ok(unknown > 0);
});

test("mult clamps at 15", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const n = G.n;
  const mult = new Uint8Array(n).fill(40);
  const z = new Uint8Array(n);
  const C = new Float32Array(n);
  packTh(data, z, z, mult, C, null, null, G);
  const { col, row } = texelOf(G)[0];
  assert.equal(unpackTh(data, col, row).mult, 15);
  assert.equal(data[(row * TH_COLS + col) * 4] & 15, 15);
});

test("null kappa and lambda write zero channels", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4).fill(0x55);
  const inp = randomInputs(G.n, 11, { nullKappa: true, nullLambda: true });
  packTh(data, inp.type, inp.crit, inp.mult, inp.C, null, null, G);
  const texel = texelOf(G);
  for (let c = 0; c < G.n; c++) {
    const { col, row } = texel[c];
    const u = unpackTh(data, col, row);
    assert.equal(u.kappa, 0);
    assert.equal(u.lambda, 0);
    assert.equal(data[(row * TH_COLS + col) * 4 + 2], 0);
    assert.equal(data[(row * TH_COLS + col) * 4 + 3], 0);
    assert.ok(Math.abs(u.C - inp.C[c]) <= 0.5 / 255 + 1e-9);
  }
});

test("C is clamped to 0..255 and every byte is in range", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const n = G.n;
  const C = new Float32Array(n).fill(1.7);
  C[1] = -0.4;
  const kappa = new Float32Array(n).fill(9);
  const lambda = new Float32Array(n).fill(NaN);
  const z = new Uint8Array(n);
  packTh(data, z, z, z, C, kappa, lambda, G);
  for (const b of data) {
    assert.ok(Number.isInteger(b) && b >= 0 && b <= 255);
  }
  const t0 = texelOf(G)[0];
  assert.equal(data[(t0.row * TH_COLS + t0.col) * 4 + 1], 255);
});

test("the packed byte layout is region<<6 | crit<<4 | mult", () => {
  const data = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const n = G.n;
  const type = new Uint8Array(n).fill(2);
  const crit = new Uint8Array(n).fill(3);
  const mult = new Uint8Array(n).fill(5);
  const z = new Uint8Array(n);
  packTh(data, type, crit, mult, new Float32Array(n), null, null, G);
  const t0 = texelOf(G)[0];
  assert.equal(data[(t0.row * TH_COLS + t0.col) * 4], (2 << 6) | (3 << 4) | 5);
});
