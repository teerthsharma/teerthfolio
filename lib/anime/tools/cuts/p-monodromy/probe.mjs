/* global window */
// The p-monodromy checks on a still or on the live page. Every command exits 0 on a pass and 1 on a fail.
//   node lib/anime/tools/cuts/p-monodromy/probe.mjs pix <png> <x0,y0,x1,y1> <hex> <tol>
//     the box (frame fractions, y down) has a mean sRGB colour within tol (max channel difference) of hex
//   node lib/anime/tools/cuts/p-monodromy/probe.mjs share <png> <x0,y0,x1,y1> <hex> <tol> <minShare>
//     the share of pixels in the box within tol of hex is at least minShare
//   node lib/anime/tools/cuts/p-monodromy/probe.mjs box <t> <minH> <maxH>
//     the player's box at scene t (a live page, one GPU slot) has its height, clipped to the frame, in [minH, maxH]
//   node lib/anime/tools/cuts/p-monodromy/probe.mjs cmp <liveFile> <portedFile>
//     the differing lines after comments and whitespace are stripped; exit 1 unless each one is an import or an alpha 1.0 <-> 0.99
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { closeServe, cutUrl } from "../../../../../scripts/cut-serve.mjs";

// hex is read after its leading '#' is stripped: offsets 0, 2 and 4
const rgb = (hex) => { const h = hex.replace(/^#/, ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const parseBox = (s) => s.split(",").map(Number);

async function pixels(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
// the pixel rectangle of a fractional box, clipped to the frame
function rect(img, [x0, y0, x1, y1]) {
  const px0 = Math.max(0, Math.floor(x0 * img.w)), px1 = Math.min(img.w, Math.ceil(x1 * img.w));
  const py0 = Math.max(0, Math.floor(y0 * img.h)), py1 = Math.min(img.h, Math.ceil(y1 * img.h));
  return { px0, px1, py0, py1 };
}

async function pix(file, boxS, hex, tol) {
  const img = await pixels(file), r = rect(img, parseBox(boxS)), t = rgb(hex);
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = r.py0; y < r.py1; y++) for (let x = r.px0; x < r.px1; x++) { const i = (y * img.w + x) * 3; for (let c = 0; c < 3; c++) sum[c] += img.data[i + c]; n++; }
  const mean = sum.map((v) => v / n), diff = Math.max(...mean.map((v, c) => Math.abs(v - t[c])));
  const ok = diff <= Number(tol);
  console.log(`${ok ? "PASS" : "FAIL"} pix ${boxS} mean ${mean.map((v) => v.toFixed(1)).join(",")} vs ${hex} max diff ${diff.toFixed(1)} (tol ${tol})`);
  return ok ? 0 : 1;
}

async function share(file, boxS, hex, tol, minShare) {
  const img = await pixels(file), r = rect(img, parseBox(boxS)), t = rgb(hex);
  let hit = 0, n = 0;
  for (let y = r.py0; y < r.py1; y++) for (let x = r.px0; x < r.px1; x++) {
    const i = (y * img.w + x) * 3;
    if (Math.max(Math.abs(img.data[i] - t[0]), Math.abs(img.data[i + 1] - t[1]), Math.abs(img.data[i + 2] - t[2])) <= Number(tol)) hit++;
    n++;
  }
  const s = hit / n, ok = s >= Number(minShare);
  console.log(`${ok ? "PASS" : "FAIL"} share ${boxS} of ${hex} within ${tol}: ${(s * 100).toFixed(2)}% (min ${(Number(minShare) * 100).toFixed(2)}%)`);
  return ok ? 0 : 1;
}

async function boxAt(t, minH, maxH) {
  return withGpuLock(`p-monodromy probe box ${t} pid ${process.pid}`, async () => {
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      await page.goto(await cutUrl("p-monodromy", `t=${t}&paused`), { waitUntil: "load", timeout: 180000 });
      await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
      await page.evaluate((s) => window.__cut.seek(s), Number(t));
      await page.waitForTimeout(900);
      const box = await page.evaluate(() => window.__cut.player.box);
      if (!box) { console.log(`FAIL box ${t}: no box (null)`); return 1; }
      const h = Math.max(0, Math.min(1, box[3]) - Math.max(0, box[1]));
      const ok = h >= Number(minH) && h <= Number(maxH);
      console.log(`${ok ? "PASS" : "FAIL"} box ${t} [${box.map((v) => Number(v).toFixed(3)).join(", ")}] height ${h.toFixed(3)} in [${minH}, ${maxH}]`);
      return ok ? 0 : 1;
    } finally {
      await browser.close();
      closeServe();
    }
  });
}

// comments and whitespace out; a line comment after a ':' (a URL) or a quote is not one
const clean = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/)
  .map((l) => l.replace(/(^|[^:"'\\])\/\/.*$/, "$1").trim().replace(/\s+/g, " "))
  .filter(Boolean);

// the longest-common-subsequence diff of two line lists: [sign, line] entries in file order
function diff(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", a[i++]]);
    else out.push(["+", b[j++]]);
  }
  while (i < n) out.push(["-", a[i++]]);
  while (j < m) out.push(["+", b[j++]]);
  return out;
}
// an alpha write: 1.0 on one side and 0.99 on the other, the rest of the line equal
const alphaKey = (l) => l.replace(/0\.99/g, "1.0");

function cmp(liveFile, portedFile) {
  const d = diff(clean(readFileSync(liveFile, "utf8")), clean(readFileSync(portedFile, "utf8")));
  let bad = 0;
  for (const [sign, line] of d) {
    const isImport = /^import\s/.test(line);
    const isAlpha = !isImport && d.some(([s, l]) => s !== sign && alphaKey(l) === alphaKey(line));
    const tag = isImport ? "import" : isAlpha ? "alpha" : "OTHER";
    if (tag === "OTHER") bad++;
    console.log(`${sign} [${tag}] ${line}`);
  }
  console.log(`${d.length} differing lines, ${bad} not an import or an alpha write`);
  return bad ? 1 : 0;
}

async function main(args) {
  const [cmd, ...rest] = args;
  if (cmd === "pix" && rest.length === 4) return pix(...rest);
  if (cmd === "share" && rest.length === 5) return share(...rest);
  if (cmd === "box" && rest.length === 3) return boxAt(...rest);
  if (cmd === "cmp" && rest.length === 2) return cmp(...rest);
  console.log("usage: probe.mjs pix|share <png> <box> <hex> <tol> [<minShare>] | box <t> <minH> <maxH> | cmp <live> <ported>");
  return 2;
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.log(`probe: ${e.message}`); process.exitCode = 2; });
