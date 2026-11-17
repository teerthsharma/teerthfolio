// PROBE for a captured frame: node probe.mjs <png> <op> <args> [<op> <args> ...]. Boxes are x,y,w,h as fractions of the frame (y down).
// mean <box> <hex> <tol> | share <box> <hex> <tol> <min> | maxshare <box> <hex> <tol> <max> | greyshare <box> <min> | luma <box> <min> <max> | diff <pngB> <box> <minMean>. Exit 1 on any FAIL.
import sharp from "sharp";

const ARITY = { mean: 3, share: 4, maxshare: 4, greyshare: 2, luma: 3, diff: 3 };
const [file, ...rest] = process.argv.slice(2);
if (!file || !rest.length) {
  console.error("usage: probe.mjs <png> <op> <args> [<op> <args> ...]");
  process.exit(2);
}

const load = async (p, size) => {
  let s = sharp(p);
  if (size) s = s.resize(size.w, size.h, { fit: "fill" });
  const { data, info } = await s.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
};

const parseBox = (s) => {
  const v = s.split(",").map(Number);
  if (v.length !== 4 || v.some(Number.isNaN)) throw new Error(`bad box "${s}" (want x,y,w,h)`);
  return v;
};
const hexRGB = (h) => {
  const s = h.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error(`bad hex "${h}"`);
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

const forEachPx = (img, [x, y, w, h], fn) => {
  const x0 = Math.max(0, Math.floor(x * img.w)), y0 = Math.max(0, Math.floor(y * img.h));
  const x1 = Math.min(img.w, Math.ceil((x + w) * img.w)), y1 = Math.min(img.h, Math.ceil((y + h) * img.h));
  let n = 0;
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const o = (j * img.w + i) * img.ch;
    fn(img.data[o], img.data[o + 1], img.data[o + 2]);
    n++;
  }
  if (!n) throw new Error(`empty box [${x},${y},${w},${h}] on ${img.w}x${img.h}`);
  return n;
};

const shareOf = (img, box, hex, tol) => {
  const c = hexRGB(hex), t = Number(tol);
  let hit = 0;
  const n = forEachPx(img, parseBox(box), (r, g, b) => {
    if (Math.max(Math.abs(r - c[0]), Math.abs(g - c[1]), Math.abs(b - c[2])) <= t) hit++;
  });
  return hit / n;
};

const OPS = {
  mean(img, [box, hex, tol]) {
    const c = hexRGB(hex), s = [0, 0, 0];
    const n = forEachPx(img, parseBox(box), (r, g, b) => { s[0] += r; s[1] += g; s[2] += b; });
    const m = s.map((v) => v / n), t = Number(tol);
    return { ok: m.every((v, k) => Math.abs(v - c[k]) <= t), text: `mean (${m.map((v) => v.toFixed(1)).join(",")}) vs #${hex} tol ${t}` };
  },
  share(img, [box, hex, tol, min]) {
    const sh = shareOf(img, box, hex, tol);
    return { ok: sh >= Number(min), text: `share ${sh.toFixed(4)} within ${tol} of ${hex}, need ${min}` };
  },
  maxshare(img, [box, hex, tol, max]) {
    const sh = shareOf(img, box, hex, tol);
    return { ok: sh <= Number(max), text: `maxshare ${sh.toFixed(4)} within ${tol} of ${hex}, need at most ${max}` };
  },
  greyshare(img, [box, min]) {
    let hit = 0;
    const n = forEachPx(img, parseBox(box), (r, g, b) => {
      const avg = (r + g + b) / 3;
      if (Math.max(r, g, b) - Math.min(r, g, b) <= 26 && avg >= 120 && avg <= 240) hit++;
    });
    const sh = hit / n;
    return { ok: sh >= Number(min), text: `greyshare ${sh.toFixed(4)}, need ${min}` };
  },
  luma(img, [box, min, max]) {
    let s = 0;
    const n = forEachPx(img, parseBox(box), (r, g, b) => { s += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; });
    const m = s / n;
    return { ok: m >= Number(min) && m <= Number(max), text: `luma ${m.toFixed(4)}, need ${min}..${max}` };
  },
  async diff(img, [pngB, box, minMean]) {
    const other = await load(pngB, { w: img.w, h: img.h });
    const ref = [];
    forEachPx(img, parseBox(box), (r, g, b) => ref.push(r, g, b));
    let k = 0, sum = 0;
    const n = forEachPx(other, parseBox(box), (r, g, b) => {
      sum += Math.abs(r - ref[k]) + Math.abs(g - ref[k + 1]) + Math.abs(b - ref[k + 2]);
      k += 3;
    });
    const md = sum / (n * 3);
    return { ok: md >= Number(minMean), text: `diff mean ${md.toFixed(2)} between frames, need ${minMean}` };
  },
};

const img = await load(file);
let fails = 0;
for (let i = 0; i < rest.length; ) {
  const op = rest[i++], n = ARITY[op];
  if (n === undefined || !OPS[op]) { console.error(`unknown op "${op}"`); process.exit(2); }
  const args = rest.slice(i, i + n);
  i += n;
  if (args.length < n) { console.error(`op ${op} wants ${n} args`); process.exit(2); }
  const r = await OPS[op](img, args);
  console.log(`${r.ok ? "PASS" : "FAIL"} ${op}: ${r.text}`);
  if (!r.ok) fails++;
}
if (fails) process.exitCode = 1;
