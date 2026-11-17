/* global process */
// node lib/anime/tools/cuts/the-loop/probe-eyeline.mjs <png>   |   --selftest
// Centroid of the red pixels (hue 340 to 15, S > 0.5, V > 0.35) as (x / width, (y - 92) / 536): the eye line in the picture band (y 92 to 628 of a 720-high still). Pixel centres count at i + 0.5.
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { hueOf } from "../../still-stats.js";
import { load } from "./probe-levels.mjs";

const BAND_TOP = 92, BAND_H = 536;

export function eyeline(img) {
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const o = 3 * (y * img.w + x), c = hueOf(img.data[o], img.data[o + 1], img.data[o + 2]);
    if (!((c.h >= 340 || c.h <= 15) && c.s > 0.5 && c.v > 0.35)) continue;
    n++;
    sx += x + 0.5;
    sy += y + 0.5;
  }
  return n ? { x: sx / n / img.w, y: (sy / n - BAND_TOP) / BAND_H, n } : { x: NaN, y: NaN, n: 0 };
}

async function selftest() {
  const W = 1280, H = 720, raw = Buffer.alloc(W * H * 3);
  for (let y = 350; y < 370; y++) for (let x = 630; x < 650; x++) raw.set([255, 0, 0], (y * W + x) * 3);
  const img = await load(await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer());
  const r = eyeline(img);
  const ok = r.n === 400 && Math.abs(r.x - 0.5) < 1e-9 && Math.abs(r.y - 0.5) < 1e-9;
  console.log(`${ok ? "PASS" : "FAIL"} selftest 20x20 red square centred on (640, 360): (${r.x}, ${r.y}) count ${r.n} (want (0.5, 0.5) count 400)`);
  return ok;
}

async function main(args) {
  if (args[0] === "--selftest") return (await selftest()) ? 0 : 1;
  if (!args[0]) {
    console.log("usage: probe-eyeline.mjs <png>   |   --selftest");
    return 2;
  }
  const r = eyeline(await load(path.resolve(args[0])));
  if (!r.n) {
    console.log("eyeline none count 0");
    return 1;
  }
  console.log(`eyeline (${r.x.toFixed(4)}, ${r.y.toFixed(4)}) count ${r.n}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.log(`probe-eyeline: ${e.message}`); process.exitCode = 1; });
}
