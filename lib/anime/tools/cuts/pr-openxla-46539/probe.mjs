/* global process */
// node lib/anime/tools/cuts/pr-openxla-46539/probe.mjs <command> ...   (u, v are frame fractions, v from the top; colours in sRGB bytes)
//   mean <png> u0 v0 u1 v1 hex tol           box mean against a hex colour (levels); exit 1 when a channel is off by more than tol
//   share <png> u0 v0 u1 v1 hex tol minPct   share of pixels within tol levels of hex (percent); exit 1 below minPct
//   box <png> hex tol [u0 v0 u1 v1]          bounding box of the pixels within tol of hex; exit 1 when there are none
//   diff <pngA> <pngB> u0 v0 u1 v1 minPct    share of pixels that differ by more than 12 levels (percent); exit 1 below minPct
//   same <orig> <copy>                       the copy against its original, comments and blank lines removed; exit 1 on a change
//                                            that is not an import, the alpha 0.99 write, or an idSafe wrap
//   imports <dir>                            imports every module under dir with node; exit 1 on any failure
//   dock                                     the dock point of pr-openxla-46539 (lib/world/places.js dockPoint)
//   tone <hex>                               the site's last stage (tone.js toned, gamma 2.2 bytes: F7F0DB prints 239 231 210)
//   clock <t> ...                            phase(t, t) from clock.js at each time (clock-live lane)
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const DOCK = "pr-openxla-46539";
const PIX = 12;

const num = (x) => { const v = Number(x); if (x === undefined || !Number.isFinite(v)) throw new Error(`not a number: ${x}`); return v; };
const hex = (s) => { const m = /^#?([0-9a-f]{6})$/i.exec(s ?? ""); if (!m) throw new Error(`not a hex colour: ${s}`); const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const fx = (v, d = 3) => (typeof v === "number" ? v.toFixed(d) : String(v));
const cache = new Map();

async function load(file) {
  if (!cache.has(file)) {
    cache.set(file, sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => ({ data, w: info.width, h: info.height })));
  }
  return cache.get(file);
}
function region(img, u0, v0, u1, v1) {
  return {
    x0: Math.max(0, Math.floor(u0 * img.w)), x1: Math.min(img.w, Math.ceil(u1 * img.w)),
    y0: Math.max(0, Math.floor(v0 * img.h)), y1: Math.min(img.h, Math.ceil(v1 * img.h)),
  };
}
function each(img, r, fn) {
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const o = (y * img.w + x) * 3; fn(img.data[o], img.data[o + 1], img.data[o + 2], x, y); }
}
const gap = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

async function cmdMean([png, u0, v0, u1, v1, h, tol]) {
  const img = await load(png), r = region(img, num(u0), num(v0), num(u1), num(v1)), want = hex(h), T = num(tol ?? 20);
  const sum = [0, 0, 0];
  let n = 0;
  each(img, r, (R, G, B) => { sum[0] += R; sum[1] += G; sum[2] += B; n++; });
  const m = sum.map((s) => s / Math.max(1, n)), off = m.map((v, i) => v - want[i]);
  console.log(`mean ${m.map((v) => v.toFixed(1)).join(" ")} vs ${h} (${want.join(" ")}), off ${off.map((v) => v.toFixed(1)).join(" ")}, tol ${T}`);
  return Math.max(...off.map(Math.abs)) > T ? 1 : 0;
}

async function cmdShare([png, u0, v0, u1, v1, h, tol, minPct]) {
  const img = await load(png), r = region(img, num(u0), num(v0), num(u1), num(v1)), want = hex(h), T = num(tol ?? 20);
  const need = minPct === undefined ? 0 : num(minPct);
  let n = 0, hitN = 0;
  each(img, r, (R, G, B) => { n++; if (gap([R, G, B], want) <= T) hitN++; });
  const pct = (100 * hitN) / Math.max(1, n);
  console.log(`share ${pct.toFixed(2)} % within ${T} levels of ${h}, need ${need} %`);
  return pct < need ? 1 : 0;
}

async function cmdBox([png, h, tol, u0 = "0", v0 = "0", u1 = "1", v1 = "1"]) {
  const img = await load(png), want = hex(h), T = num(tol ?? 20);
  const r = region(img, num(u0), num(v0), num(u1), num(v1));
  let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1, n = 0;
  each(img, r, (R, G, B, x, y) => {
    if (gap([R, G, B], want) > T) return;
    n++; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
  });
  if (!n) { console.log(`box none within ${T} levels of ${h}`); return 1; }
  const b = [bx0 / img.w, by0 / img.h, (bx1 + 1) / img.w, (by1 + 1) / img.h];
  console.log(`box u0 ${b[0].toFixed(3)} v0 ${b[1].toFixed(3)} u1 ${b[2].toFixed(3)} v1 ${b[3].toFixed(3)} (height ${(b[3] - b[1]).toFixed(3)}, ${n} px)`);
  return 0;
}

async function cmdDiff([pa, pb, u0, v0, u1, v1, minPct]) {
  const A = await load(pa), B = await load(pb);
  if (A.w !== B.w || A.h !== B.h) throw new Error(`size differs: ${A.w}x${A.h} vs ${B.w}x${B.h}`);
  const r = region(A, num(u0), num(v0), num(u1), num(v1)), need = minPct === undefined ? 0 : num(minPct);
  let n = 0, d = 0;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
    const o = (y * A.w + x) * 3;
    n++;
    if (Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2])) > PIX) d++;
  }
  const pct = (100 * d) / Math.max(1, n);
  console.log(`diff ${pct.toFixed(2)} % of the region differs by more than ${PIX} levels, need ${need} %`);
  return pct < need ? 1 : 0;
}

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, "").trim()).filter(Boolean);
function lcsOps(A, B) {
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push(["=", A[i]]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { ops.push(["-", A[i]]); i++; }
    else { ops.push(["+", B[j]]); j++; }
  }
  while (i < n) ops.push(["-", A[i++]]);
  while (j < m) ops.push(["+", B[j++]]);
  return ops;
}
async function cmdSame([orig, copy]) {
  const A = strip(readFileSync(path.resolve(ROOT, orig), "utf8")), B = strip(readFileSync(path.resolve(ROOT, copy), "utf8"));
  const counts = { same: 0, import: 0, alpha: 0, idSafe: 0, other: 0 }, others = [];
  let minus = [], plus = [];
  const settle = () => {
    const alphaSet = new Set(minus.flatMap((l) => [l.replace(/(gl_FragColor = vec4\([^;]*), 1\.0\);/g, "$1, 0.99);"), l.replace(/\b1\.0\b/g, "0.99")]));
    const wrapSet = new Set(minus);
    const unwrap = (l) => l.replace(/idSafe\(/g, "").replace(/\)(?=[;,]?$)/, "");
    for (const p of plus) {
      let k = "other";
      if (/^import /.test(p) || minus.some((m) => /^import /.test(m))) k = "import";
      else if (alphaSet.has(p)) k = "alpha";
      else if (p.includes("idSafe(") || (wrapSet.has(unwrap(p)) && p !== unwrap(p))) k = "idSafe";
      counts[k]++;
      if (k === "other") others.push(p);
    }
    if (!plus.length) for (const m of minus) {
      if (/^import /.test(m)) counts.import++;
      else { counts.other++; others.push(`(removed) ${m}`); }
    }
    minus = []; plus = [];
  };
  for (const [op, line] of lcsOps(A, B)) {
    if (op === "=") { if (minus.length || plus.length) settle(); counts.same++; }
    else if (op === "-") minus.push(line);
    else plus.push(line);
  }
  if (minus.length || plus.length) settle();
  console.log(`same ${path.basename(copy)}: ${counts.same} lines equal; changes: import ${counts.import}, alpha 0.99 ${counts.alpha}, idSafe ${counts.idSafe}, other ${counts.other}`);
  for (const l of others.slice(0, 12)) console.log(`  other: ${l.slice(0, 180)}`);
  return counts.other ? 1 : 0;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? walk(f) : /\.m?js$/.test(e.name) ? [f] : [];
  });
}
async function cmdImports([dir]) {
  if (!dir) throw new Error("imports needs a directory");
  const files = walk(path.resolve(ROOT, dir));
  let bad = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    try { await import(pathToFileURL(f).href); console.log(`OK ${rel}`); }
    catch (e) { bad++; console.log(`FAIL ${rel}: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`); }
  }
  console.log(`${files.length - bad} of ${files.length} modules import`);
  return bad ? 1 : 0;
}

async function cmdDock() {
  const { PLACE_BY_ID, dockPoint } = await import(pathToFileURL(path.join(ROOT, "lib/world/places.js")).href);
  const place = PLACE_BY_ID[DOCK];
  if (!place) throw new Error(`${DOCK} is not in PLACE_BY_ID`);
  const d = dockPoint(place);
  console.log(`DOCK [${d.x}, 0, ${d.z}]   (place [${place.x}, ${place.z}] radius ${place.radius}, dockPoint = z + radius + 1.6)`);
  return 0;
}

const GAMMA = (v) => Math.round(255 * Math.min(1, Math.max(0, v)) ** (1 / 2.2));
async function cmdTone([h]) {
  const { Color } = await import("three");
  hex(h);
  let c = new Color(h).toArray().map((v) => v * 1.055);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : 0.04));
  const peak = Math.max(...c);
  if (peak > 0.76) { const np = 1 - 0.0576 / (peak - 0.52), g = 1 - 1 / (0.15 * (peak - np) + 1); c = c.map((v) => (v * np) / peak).map((v) => v + (np - v) * g); }
  console.log(c.map(GAMMA).join(" "));
  return 0;
}

async function cmdClock(ts) {
  const file = path.join(ROOT, "lib/anime/cutscenes", DOCK, "clock.js");
  if (!existsSync(file)) { console.log("clock.js is not written yet (lane clock-live, T2)"); return 1; }
  const C = await import(pathToFileURL(file).href);
  const list = ts.length ? ts.map(num) : [10.5, 10.6, 11.6, 14.4, 18.8, 18.9];
  for (const t of list) {
    const p = C.phase(t, t);
    console.log(`t ${t}: tt ${fx(p.tt)} age ${fx(p.age)} brk ${fx(p.brk)} dk ${fx(p.dk)} broken ${p.broken}`);
  }
  return 0;
}

const COMMANDS = { mean: cmdMean, share: cmdShare, box: cmdBox, diff: cmdDiff, same: cmdSame, imports: cmdImports, dock: cmdDock, tone: cmdTone, clock: cmdClock };
const [cmd, ...rest] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.log("usage: probe.mjs mean|share|box|diff|same|imports|dock|tone|clock ... (see the header of this file)");
  process.exit(2);
}
try { process.exitCode = await COMMANDS[cmd](rest); }
catch (e) { console.log(`probe ${cmd}: ${e.message}`); process.exitCode = 2; }
