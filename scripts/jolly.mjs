// node scripts/jolly.mjs <png>... [--assert] [--before <png>]: the jolly metric of a still.
// Ground is every pixel that is not sea (hue 170 to 240 at S >= 0.4). Families are 30-degree hue bins, blues skipped,
// each holding 2 percent of ground pixels at S >= 0.25. Dead ground is S < 0.10 and V > 0.55.
// --assert exits 1 unless mean S >= 0.20, dead <= 0.45, families >= 5, and (with --before) mean S is 0.08 above that still.
import { existsSync } from "node:fs";
import sharp from "sharp";

const BEFORE_DEFAULT = "verification/island/before-wide.png";
const opts = { assert: false, before: null, files: [] };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--assert") opts.assert = true;
  else if (a === "--before") opts.before = process.argv[++i];
  else opts.files.push(a);
}
if (opts.assert && !opts.before && existsSync(BEFORE_DEFAULT)) opts.before = BEFORE_DEFAULT;

const hsv = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, mx ? d / mx : 0, mx];
};

async function measure(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  let sum = 0;
  let dead = 0;
  const bins = new Array(12).fill(0);
  for (let i = 0; i < data.length; i += 3) {
    const [h, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
    const blue = h >= 170 && h <= 240;
    if (blue && s >= 0.4) continue;
    n++;
    sum += s;
    if (s < 0.1 && v > 0.55) dead++;
    if (s >= 0.25 && v >= 0.6 && !blue) bins[Math.floor(h / 30) % 12]++;
  }
  const families = bins.filter((b) => b / n >= 0.02).length;
  return { name: file.split(/[\\/]/).pop(), size: `${info.width}x${info.height}`, n, meanS: sum / n, dead: dead / n, families, bins: bins.map((b) => (100 * b) / n) };
}

const results = [];
for (const file of opts.files) {
  const r = await measure(file);
  results.push(r);
  console.log(r.name, r.size, "ground px", r.n, "meanS", r.meanS.toFixed(3), "dead", r.dead.toFixed(3), "families", r.families, "bins", r.bins.map((b) => b.toFixed(1)).join(","));
}

if (opts.assert) {
  const [r] = results;
  const base = opts.before ? await measure(opts.before) : null;
  const checks = [
    ["mean S >= 0.20", r.meanS >= 0.2],
    ["dead <= 0.45", r.dead <= 0.45],
    ["families >= 5", r.families >= 5],
  ];
  if (base) checks.push([`mean S >= ${(base.meanS + 0.08).toFixed(3)} (before ${base.meanS.toFixed(3)} + 0.08)`, r.meanS >= base.meanS + 0.08]);
  for (const [label, ok] of checks) console.log(ok ? "PASS" : "FAIL", label);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}
