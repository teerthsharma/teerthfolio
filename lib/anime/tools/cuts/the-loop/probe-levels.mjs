/* global process */
// node lib/anime/tools/cuts/the-loop/probe-levels.mjs <png> <x> <y> <w> <h>   |   --selftest
// Distinct Y709 levels in a crop. Levels within 3 of a cluster's first level merge; a pixel within 2 px of an edge (a 4-neighbour more than 6 levels away) is ignored, so seams and the plum line do not count.
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const EDGE = 6, GUARD = 2, MERGE = 3;

export async function load(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const nearEdge = (edge, W, H, i, j) => {
  for (let dj = -GUARD; dj <= GUARD; dj++) for (let di = -GUARD; di <= GUARD; di++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < W && b < H && edge[b * W + a]) return true;
  }
  return false;
};

export function levels(img, [x, y, w, h]) {
  if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > img.w || y + h > img.h) {
    throw new Error(`crop ${[x, y, w, h].join(" ")} is not inside ${img.w}x${img.h}`);
  }
  const W = img.w, H = img.h, Y = new Int16Array(W * H), edge = new Uint8Array(W * H), hist = new Uint32Array(256);
  for (let p = 0; p < W * H; p++) Y[p] = Math.round(0.2126 * img.data[3 * p] + 0.7152 * img.data[3 * p + 1] + 0.0722 * img.data[3 * p + 2]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const p = j * W + i, v = Y[p];
    if ((i + 1 < W && Math.abs(Y[p + 1] - v) > EDGE) || (i > 0 && Math.abs(Y[p - 1] - v) > EDGE) || (j + 1 < H && Math.abs(Y[p + W] - v) > EDGE) || (j > 0 && Math.abs(Y[p - W] - v) > EDGE)) edge[p] = 1;
  }
  let kept = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (nearEdge(edge, W, H, i, j)) continue;
    hist[Y[j * W + i]]++;
    kept++;
  }
  let count = 0, start = -Infinity;
  for (let v = 0; v < 256; v++) if (hist[v] && v - start > MERGE) { count++; start = v; }
  return { levels: count, kept, total: w * h };
}

async function png(w, h, colour) {
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(colour(x, y), (y * w + x) * 3);
  return load(await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer());
}

async function selftest() {
  const flat = await png(180, 40, (x) => (x < 60 ? [32, 32, 32] : x < 120 ? [128, 128, 128] : [224, 224, 224]));
  const ramp = await png(256, 40, (x) => [x, x, x]);
  const checks = [
    ["3 flat colours", levels(flat, [0, 0, 180, 40]).levels, 3, "eq"],
    ["crop on the first band only", levels(flat, [0, 0, 50, 40]).levels, 1, "eq"],
    ["0 to 255 ramp", levels(ramp, [0, 0, 256, 40]).levels, 40, "ge"],
  ];
  let ok = true;
  for (const [name, got, want, op] of checks) {
    const pass = op === "eq" ? got === want : got >= want;
    ok &&= pass;
    console.log(`${pass ? "PASS" : "FAIL"} selftest ${name}: ${got} (want ${op === "eq" ? "" : "at least "}${want})`);
  }
  return ok;
}

async function main(args) {
  if (args[0] === "--selftest") return (await selftest()) ? 0 : 1;
  const [file, ...box] = args;
  if (!file || box.length !== 4) {
    console.log("usage: probe-levels.mjs <png> <x> <y> <w> <h>   |   --selftest");
    return 2;
  }
  const r = levels(await load(path.resolve(file)), box.map(Number));
  console.log(`levels ${r.levels} (kept ${r.kept} of ${r.total} pixels in ${box.join(" ")})`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.log(`probe-levels: ${e.message}`); process.exitCode = 1; });
}
