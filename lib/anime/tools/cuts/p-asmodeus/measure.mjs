// node lib/anime/tools/cuts/p-asmodeus/measure.mjs hue|luma|gaps <png...>: one JSON line per still, read from its pixels.
// hue: circular median of S > 0.25, V > 0.3 band pixels (320 wide). luma: max Y709 and 64x40 dark cells. gaps: dark share, bottom-right band.
import { createRequire } from "node:module";

const require = createRequire(new URL("../../../../../package.json", import.meta.url));
const sharp = require("sharp");

const [mode, ...files] = process.argv.slice(2);
if (!["hue", "luma", "gaps"].includes(mode) || !files.length) {
  console.error("usage: node measure.mjs hue|luma|gaps <png...>");
  process.exit(2);
}

const Y = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const wrap = (d, m) => ((d % m) + m) % m;
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

async function raw(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// the band is the rows between the letterbox bars: bar = round(H * (1 - (W / H) / 2.39) / 2)
function band(w, h) {
  const bar = Math.round((h * (1 - w / h / 2.39)) / 2);
  return { top: bar, bottom: h - bar };
}

function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return null;
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return wrap(60 * h, 360);
}

async function hue(file) {
  const { w, h } = await raw(file);
  const b = band(w, h);
  const { data, info } = await sharp(file).removeAlpha()
    .extract({ left: 0, top: b.top, width: w, height: b.bottom - b.top })
    .resize({ width: 320 }).raw().toBuffer({ resolveWithObject: true });
  const hs = [];
  for (let o = 0; o < data.length; o += info.channels) {
    const r = data[o], g = data[o + 1], bl = data[o + 2];
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    if (!mx || (mx - mn) / mx <= 0.25 || mx / 255 <= 0.3) continue;
    hs.push(hueOf(r, g, bl));
  }
  let sx = 0, sy = 0;
  for (const x of hs) { sx += Math.cos((x * Math.PI) / 180); sy += Math.sin((x * Math.PI) / 180); }
  const origin = (Math.atan2(sy, sx) * 180) / Math.PI;
  const med = median(hs.map((x) => wrap180(x - origin)));
  return { file, hue: Number(wrap(origin + med, 360).toFixed(1)), n: hs.length };
}

async function luma(file) {
  const { data, w, h } = await raw(file);
  const ys = new Float32Array(w * h);
  let maxY = 0;
  for (let i = 0, o = 0; i < ys.length; i++, o += 3) {
    const y = Y(data[o], data[o + 1], data[o + 2]);
    ys[i] = y;
    if (y > maxY) maxY = y;
  }
  let darkCells = 0;
  for (let cy = 0; cy < 40; cy++) {
    const y0 = Math.floor((cy * h) / 40), y1 = Math.floor(((cy + 1) * h) / 40);
    for (let cx = 0; cx < 64; cx++) {
      const x0 = Math.floor((cx * w) / 64), x1 = Math.floor(((cx + 1) * w) / 64);
      let s = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += ys[y * w + x]; n++; }
      if (n && s / n < 0.035) darkCells++;
    }
  }
  return { file, maxY: Number(maxY.toFixed(4)), darkCells };
}

async function gaps(file) {
  const { data, w, h } = await raw(file);
  const b = band(w, h);
  const y0 = b.bottom - Math.round(0.2 * (b.bottom - b.top)), x0 = Math.round(0.45 * w);
  let n = 0, dark = 0;
  for (let y = y0; y < b.bottom; y++) {
    for (let x = x0; x < w; x++) {
      const o = (y * w + x) * 3;
      n++;
      if (Y(data[o], data[o + 1], data[o + 2]) < 0.07) dark++;
    }
  }
  return { file, gapShare: Number((dark / n).toFixed(4)) };
}

const run = { hue, luma, gaps }[mode];
for (const f of files) console.log(JSON.stringify(await run(f)));
