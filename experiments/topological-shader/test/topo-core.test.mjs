import test from "node:test";
import assert from "node:assert/strict";
import { NearestFilter } from "three";
import { createTopo } from "../../../components/world/topo/core.js";
import { TH_COLS, TH_ROWS, unpackTh } from "../../../lib/world/heat/harness.js";
import { topoChunk } from "../../../components/world/topo/uber.glsl.js";

const H = 4;
const SQ = Math.sqrt(3) / 2;

function run(topo, seconds, x = 0, z = 0, frameMs = 8) {
  let t = 0;
  for (let i = 0; i < seconds * 60; i++) {
    t += 1 / 60;
    topo.step(x, z, t, frameMs);
  }
  return t;
}

function texelOf(topo, cx, cz) {
  const o = topo.uniforms.uGridOrigin.value;
  const c = topo.uniforms.uCell.value;
  const row = Math.floor((cz - o.y) / c.y + 0.5);
  const col = Math.floor((cx - o.x - (row % 2) * 0.5 * c.x) / c.x + 0.5);
  return { row, col };
}

test("the texture is a nearest-filtered 43x49 RGBA8 DataTexture over the one preallocated array", () => {
  const topo = createTopo("on");
  assert.equal(topo.tex.image.width, TH_COLS);
  assert.equal(topo.tex.image.height, TH_ROWS);
  assert.equal(topo.tex.image.data, topo.th);
  assert.equal(topo.th.length, TH_COLS * TH_ROWS * 4);
  assert.equal(topo.tex.minFilter, NearestFilter);
  assert.equal(topo.tex.magFilter, NearestFilter);
  assert.equal(topo.tex.generateMipmaps, false);
});

test("the uniforms carry the chunk's names, a = 0 and the reserved zeros", () => {
  const topo = createTopo("on");
  for (const name of Object.keys(topo.uniforms)) assert.ok(topoChunk.includes(`uniform`) && topoChunk.includes(name), name);
  assert.equal(topo.uniforms.uA.value, 0);
  assert.equal(topo.uniforms.uCell.value.x, H);
  assert.ok(Math.abs(topo.uniforms.uCell.value.y - H * SQ) < 1e-12);
});

test("every cell's texel read through the shader's odd-r lookup returns the C the controller holds", () => {
  const topo = createTopo("on");
  run(topo, 4, 10, -6);
  const g = topo.grid;
  for (let c = 0; c < g.n; c++) {
    const { row, col } = texelOf(topo, g.xs[c], g.zs[c]);
    assert.ok(row >= 0 && row < TH_ROWS && col >= 0 && col < TH_COLS);
    assert.equal(unpackTh(topo.th, col, row).C, Math.round(topo.C[c] * 255) / 255, `cell ${c}`);
  }
});

test("neutral: after 40 s at one spot every cell is LIVE (type 0) and a = 0", () => {
  const topo = createTopo("neutral");
  run(topo, 40);
  const g = topo.grid;
  let hot = 0;
  for (let c = 0; c < g.n; c++) {
    const { row, col } = texelOf(topo, g.xs[c], g.zs[c]);
    assert.equal(unpackTh(topo.th, col, row).s, 0);
    if (topo.C[c] > 0.65) hot++;
  }
  assert.ok(hot > 0, "the heat field did move, so type 0 is forced, not accidental");
  assert.equal(topo.uniforms.uA.value, 0);
});

test("on: the hot centre latches BAKED, the cold rim stays LIVE, and the maximum is marked critical", () => {
  const topo = createTopo("on");
  run(topo, 40);
  const g = topo.grid;
  const centre = topo.grid.cell(0, 0);
  const far = topo.grid.cell(70, 0);
  const at = (c) => { const { row, col } = texelOf(topo, g.xs[c], g.zs[c]); return unpackTh(topo.th, col, row); };
  assert.equal(at(centre).s, 1);
  assert.equal(at(centre).crit, 1);
  assert.equal(at(far).s, 0);
  assert.equal(topo.uniforms.uA.value, 0);
});

test("on: a governor shift u < 0 lowers both thresholds, so a cell at C 0.5 flips from BAND to BAKED", () => {
  const topo = createTopo("on");
  run(topo, 40);
  const g = topo.grid;
  let probe = -1;
  for (let c = 0; c < g.n; c++) if (topo.C[c] > 0.36 && topo.C[c] < 0.64) { probe = c; break; }
  assert.ok(probe >= 0);
  const s = () => { const { row, col } = texelOf(topo, g.xs[probe], g.zs[probe]); return unpackTh(topo.th, col, row).s; };
  assert.equal(s(), 0, "an unlatched cell below tau_hi has not left LIVE");
  let t = 40;
  while (topo.u > -0.3 && t < 400) { t += 1 / 60; topo.step(0, 0, t, 80); }
  assert.ok(topo.u < 0);
  assert.notEqual(s(), 0);
});

test("the texture version moves when the field is repacked and the stepped time follows the clock", () => {
  const topo = createTopo("on");
  const v0 = topo.tex.version;
  run(topo, 1);
  assert.ok(topo.tex.version > v0);
  topo.step(0, 0, 3.01, 8);
  assert.equal(topo.uniforms.uTq.value, Math.floor(3.01 * 12) / 12);
});
