// node lib/anime/tools/region-stats.check.mjs : mask geometry on synthetic frames
import assert from "node:assert/strict";
import { maskFrom, maskStats, regionStats, discFit } from "./region-stats.js";

const W = 1280, H = 800;
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `expected ${a} within ${tol} of ${b}`);

function disc(cx, cy, r) {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) m[y * W + x] = 1;
  return m;
}

const d = disc(640, 400, 200);

const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) rgba[i * 4 + 3] = d[i] ? 255 : 0;
assert.deepEqual(maskFrom(rgba, W, H, 4, (data, o) => data[o + 3] > 127), d);

const empty = maskStats(new Uint8Array(W * H), W, H);
assert.equal(empty.share, 0);
assert.equal(empty.bbox, null);
assert.equal(empty.centroid, null);
assert.equal(empty.components, 0);

const s = maskStats(d, W, H);
near(s.share, 0.123, 0.003);
assert.equal(s.components, 1);
near(s.centroid[0], 0.5, 0.005);
near(s.centroid[1], 0.5, 0.005);

const f = discFit(d, W, H);
assert.equal(f.count, 1);
near(f.diameterH, 0.5, 0.01);
near(f.centre[0], 0.5, 0.005);
near(f.centre[1], 0.5, 0.005);

const two = new Uint8Array(W * H);
for (let y = 100; y < 300; y++) for (let x = 100; x < 300; x++) two[y * W + x] = 1;
for (let y = 500; y < 700; y++) for (let x = 900; x < 1100; x++) two[y * W + x] = 1;
assert.equal(maskStats(two, W, H).components, 2);

const band = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = W / 4; x < (3 * W) / 4; x++) band[y * W + x] = 1;
const bb = maskStats(band, W, H).bbox;
near(bb[0], 0.25, 0.002);
near(bb[1], 0, 0.002);
near(bb[2], 0.75, 0.002);
near(bb[3], 1, 0.002);

const full = new Uint8Array(W * H).fill(1);
const fs = maskStats(full, W, H);
assert.equal(fs.components, 1);
assert.equal(fs.share, 1);

const speck = new Uint8Array(W * H);
speck[5 * W + 5] = 1;
assert.equal(maskStats(speck, W, H).components, 0);

const ids = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) if (d[i]) ids[i] = 7;
assert.equal(regionStats(ids, W, H, 6, 1).components, 1);
assert.equal(regionStats(ids, W, H, 6, 0).share, 0);
near(regionStats(ids, W, H, 7).share, 0.123, 0.003);

console.log("region-stats.check: ok");
