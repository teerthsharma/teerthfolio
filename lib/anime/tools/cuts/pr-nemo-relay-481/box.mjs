// BOX probe: mean or share of a frame box, or the median seal height over verify json samples (usage in the sheet).
import { readFileSync } from "node:fs";
import sharp from "sharp";

const [file, mode, ...a] = process.argv.slice(2);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const done = (ok, text) => { console.log(`${text} | ${ok ? "PASS" : "FAIL"}`); process.exit(ok ? 0 : 1); };

if (mode === "sealh") {
  const [t0, t1, min] = a.map(Number);
  const hs = JSON.parse(readFileSync(file, "utf8")).samples.filter((s) => s.t >= t0 && s.t <= t1).map((s) => Math.min(1, s.box[3]) - Math.max(0, s.box[1])).sort((p, q) => p - q);
  const med = hs[Math.floor(hs.length / 2)] ?? 0;
  done(med >= min, `SEALH median ${med.toFixed(3)} over ${hs.length}`);
}

const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const [x0, y0, x1, y1] = a.slice(0, 4).map((v, i) => Math.round(Number(v) * (i % 2 ? H : W)));
const target = hex(a[4]), tol = Number(a[5]);
const sum = [0, 0, 0];
let hit = 0, n = 0;
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const o = (y * W + x) * C;
  const p = [data[o], data[o + 1], data[o + 2]];
  p.forEach((v, k) => (sum[k] += v));
  if (p.every((v, k) => Math.abs(v - target[k]) <= tol)) hit++;
  n++;
}
if (mode === "mean") {
  const mean = sum.map((s) => Math.round(s / n));
  done(mean.every((v, k) => Math.abs(v - target[k]) <= tol), `MEAN ${mean.join(" ")} | TARGET ${target.join(" ")}`);
}
const share = hit / n, min = a[6], atMost = min.startsWith("<=");
done(atMost ? share <= Number(min.slice(2)) : share >= Number(min), `SHARE ${share.toFixed(4)} (need ${min})`);
