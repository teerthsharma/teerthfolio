// PROBE for pr-mujoco-3396: node probe.mjs px|cnt|bbox|sd|diff|adj|proj|portdiff|census|letters ...
// Stills are 1280 x 720 PNGs; boxes are fractions x0 y0 x1 y1 (y down). Exit 1 on any violated bar.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { PerspectiveCamera, Vector3 } from "three";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const D = path.join(ROOT, "lib/anime/cutscenes/pr-mujoco-3396");
const CEIL = { env: 14, world: 9, kit: 57, charcoal: 89 }; // HEAD counts from the first portdiff run (460bafd vs live/)

const argv = process.argv.slice(2);
const cmd = argv.shift();
const opt = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) pos.push(a);
  else if (a === "--box") { opt.box = argv.slice(i + 1, i + 5).map(Number); i += 4; }
  else opt[a.slice(2)] = argv[++i];
}

const fail = (msg) => { console.log(`FAIL ${msg}`); process.exit(1); };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const boxOf = (a) => (a && a.length >= 4 ? a.slice(0, 4).map(Number) : [0, 0, 1, 1]);
const cache = new Map();
async function load(f) {
  if (!cache.has(f)) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    cache.set(f, { data, w: info.width, h: info.height });
  }
  return cache.get(f);
}
function area(img, b) {
  return { x0: Math.floor(b[0] * img.w), y0: Math.floor(b[1] * img.h), x1: Math.ceil(b[2] * img.w), y1: Math.ceil(b[3] * img.h) };
}
function each(img, b, fn) {
  const { x0, y0, x1, y1 } = area(img, b);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * img.w + x) * 3; fn(img.data[k], img.data[k + 1], img.data[k + 2], x, y); }
}
const near = (r, g, b, [R, G, B], tol) => Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol;

function cntOf(img, hx, tol, b) {
  const want = hexRgb(hx); let n = 0;
  each(img, b, (r, g, bl) => { if (near(r, g, bl, want, tol)) n++; });
  return n;
}
function bboxOf(img, hx, tol, b) {
  const want = hexRgb(hx); let n = 0, x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  each(img, b, (r, g, bl, x, y) => {
    if (!near(r, g, bl, want, tol)) return;
    n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  });
  if (!n) return { n, u0: 0, u1: 0, v0: 0, v1: 0, w: 0, h: 0 };
  const u0 = x0 / img.w, u1 = (x1 + 1) / img.w, v0 = y0 / img.h, v1 = (y1 + 1) / img.h;
  return { n, u0, u1, v0, v1, w: u1 - u0, h: v1 - v0 };
}
function sdOf(img, b) {
  let s = 0, s2 = 0, n = 0;
  each(img, b, (r, g, bl) => { const l = 0.299 * r + 0.587 * g + 0.114 * bl; s += l; s2 += l * l; n++; });
  const mean = s / n;
  return { sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)), mean };
}
function diffOf(a, b, box) {
  if (a.w !== b.w || a.h !== b.h) fail("frame sizes differ");
  const { x0, y0, x1, y1 } = area(a, box);
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const k = (y * a.w + x) * 3;
    s += Math.abs(a.data[k] - b.data[k]) + Math.abs(a.data[k + 1] - b.data[k + 1]) + Math.abs(a.data[k + 2] - b.data[k + 2]);
    n += 3;
  }
  return s / n;
}
const bar = (label, v, o) => {
  if (o.min !== undefined && v < +o.min) fail(`${label} ${v} below --min ${o.min}`);
  if (o.max !== undefined && v > +o.max) fail(`${label} ${v} above --max ${o.max}`);
};

async function measure(name, files, rest) {
  if (name === "diff") return diffOf(await load(files[0]), await load(files[1]), boxOf(rest));
  const img = await load(files[0]);
  if (name === "sd") return sdOf(img, boxOf(rest)).sd;
  return cntOf(img, rest[0], +rest[1], boxOf(rest.slice(2)));
}
async function numeric(name) {
  const nFiles = name === "diff" ? 2 : 1;
  const files = pos.slice(0, nFiles), rest = pos.slice(nFiles);
  const v = await measure(name, files, rest);
  bar(name, v, opt);
  if (opt.vs) {
    const other = await measure(name, [opt.vs, ...files.slice(1)], rest);
    const r = v / other;
    if (opt["ratio-max"] !== undefined && r > +opt["ratio-max"]) fail(`${name} ratio ${r.toFixed(3)} above ${opt["ratio-max"]}`);
    if (opt["ratio-min"] !== undefined && r < +opt["ratio-min"]) fail(`${name} ratio ${r.toFixed(3)} below ${opt["ratio-min"]}`);
    console.log(`ratio ${r.toFixed(3)} (other ${other.toFixed(3)})`);
  }
  console.log(`${name} ${v.toFixed(name === "cnt" ? 0 : 3)}`);
}

async function bbox() {
  const r = bboxOf(await load(pos[0]), pos[1], +pos[2], boxOf(pos.slice(3)));
  console.log(`bbox n=${r.n} u0=${r.u0.toFixed(3)} u1=${r.u1.toFixed(3)} v0=${r.v0.toFixed(3)} v1=${r.v1.toFixed(3)} w=${r.w.toFixed(3)} h=${r.h.toFixed(3)}`);
  bar("bbox n", r.n, opt);
  console.log(`bbox ${r.n}`);
}

async function px() {
  const img = await load(pos[0]);
  const b = pos.slice(1, 5).map(Number), hx = pos[5], tol = +pos[6];
  const want = hexRgb(hx), sum = [0, 0, 0];
  let n = 0;
  each(img, b, (r, g, bl) => { sum[0] += r; sum[1] += g; sum[2] += bl; n++; });
  const mean = sum.map((v) => v / n);
  const dev = Math.max(...mean.map((v, i) => Math.abs(v - want[i])));
  const text = mean.map((v) => v.toFixed(1)).join(" ");
  if (dev > tol) fail(`px mean ${text} vs ${hx} tol ${tol}`);
  console.log(`PASS px mean ${text} vs ${hx}`);
  console.log(`px ${dev.toFixed(1)}`);
}

async function adj() {
  const box = boxOf(opt.box);
  const vals = [];
  for (let i = 0; i + 1 < pos.length; i++) vals.push(diffOf(await load(pos[i]), await load(pos[i + 1]), box));
  for (const v of vals) bar("adj pair", v, opt);
  console.log(`adj ${vals.map((v) => v.toFixed(2)).join(" ")}`);
}

function proj() {
  const [e, a, fov, ...pts] = pos;
  const cam = new PerspectiveCamera(+fov, 16 / 9, 0.1, 2000);
  cam.position.set(...e.split(",").map(Number));
  cam.lookAt(...a.split(",").map(Number));
  cam.updateMatrixWorld();
  let last = { u: 0, v: 0 };
  for (const p of pts) {
    const q = new Vector3(...p.split(",").map(Number)).project(cam);
    last = { u: (q.x + 1) / 2, v: (1 - q.y) / 2 };
    console.log(`point ${p} u=${last.u.toFixed(3)} v=${last.v.toFixed(3)}`);
  }
  console.log(`v ${last.v.toFixed(3)}`);
}

const stripped = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*import\b[\s\S]*?\bfrom\s*["'][^"'\n]+["'];?[^\n]*$/gm, "")
  .replace(/^\s*import\s*["'][^"'\n]+["'];?[^\n]*$/gm, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|\s)\/\/.*$/, "").trim())
  .filter((l) => l && !/^export\b/.test(l));
function delta(a, b) {
  const ca = new Map(), cb = new Map();
  for (const l of a) ca.set(l, (ca.get(l) ?? 0) + 1);
  for (const l of b) cb.set(l, (cb.get(l) ?? 0) + 1);
  let n = 0;
  for (const [l, k] of ca) n += Math.max(0, k - (cb.get(l) ?? 0));
  for (const [l, k] of cb) n += Math.max(0, k - (ca.get(l) ?? 0));
  return n;
}
function portdiff() {
  let bad = false;
  for (const f of ["env", "kit", "world", "charcoal"]) {
    const deployed = execFileSync("git", ["show", `460bafd:components/world/cutscene/moves/pr-mujoco-3396/${f}.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });
    let ours = readFileSync(path.join(D, "live", `${f}.js`), "utf8");
    if (f === "charcoal") ours += "\n" + readFileSync(path.join(D, "ink.js"), "utf8");
    const n = delta(stripped(deployed), stripped(ours));
    const ok = n <= CEIL[f];
    if (!ok) bad = true;
    console.log(`${ok ? "PASS" : "FAIL"} portdiff ${f} ${n} lines (ceiling ${CEIL[f]})`);
  }
  if (bad) process.exit(1);
  console.log("portdiff PASS");
}

async function census() {
  const { buildKit } = await import(pathToFileURL(path.join(D, "live/kit.js")).href);
  const { N, FOOT } = await import(pathToFileURL(path.join(D, "clock.js")).href);
  const { FISH } = await import(pathToFileURL(path.join(D, "live/world.js")).href);
  const k = buildKit();
  const counts = new Set();
  k.group.traverse((o) => { if (o.isInstancedMesh) counts.add(o.count); });
  const need = [N.near, N.far, N.penguins, N.gulls, N.colony, N.prints, N.steam, N.ash, FISH];
  const missing = need.filter((c) => !counts.has(c));
  console.log(`census instanced counts: ${[...counts].sort((x, y) => x - y).join(" ")}`);
  k.dispose();
  if (missing.length) fail(`census missing ${missing.join(" ")}`);
  if (FOOT.length !== 13) fail(`census FOOT.length ${FOOT.length}`);
  console.log("census PASS");
}

function letters() {
  const area = readFileSync(path.join(ROOT, ".oneshot/pr-mujoco-3396/AREA.md"), "utf8");
  const line = (re) => { const m = area.match(re); if (!m) fail(`AREA.md has no line ${re}`); return m; };
  const A = line(/^- line A \([^)]*\): (.*?)\r?$/m)[1];
  const B = line(/^- line B \([^)]*\): (.*?)\r?$/m)[1];
  const C = line(/^- line C \([^)]*\): (.*?)\r?$/m)[1];
  const [, CT, CS] = line(/^- credit card: (.*?) :: (.*?)\r?$/m);
  const fx = readFileSync(opt.fx ?? path.join(D, "fx/index.js"), "utf8");
  const page = readFileSync(opt.page ?? path.join(D, "fx/page.js"), "utf8");
  const get = (src, re) => { const m = src.match(re); return m ? m[1] : null; };
  const got = {
    A: get(fx, /const LINE_A = "([^"]*)"/), B: get(fx, /const TEXT_B = "([^"]*)"/), C: get(fx, /const TEXT_C = "([^"]*)"/),
    CT: get(fx, /title: "([^"]*)"/), CS: get(fx, /sub: "([^"]*)"/),
    TITLE: get(page, /const TITLE = "([^"]*)"/), HOME: get(page, /const HOME = "([^"]*)"/),
  };
  const want = { A, B, C, CT, CS, TITLE: "THE WALLS WERE TITANS", HOME: "The Wall is open. The drawing burns away, and the seal comes home." };
  const bad = Object.keys(want).filter((key) => got[key] !== want[key]);
  for (const key of Object.keys(want)) console.log(`${got[key] === want[key] ? "PASS" : "FAIL"} letters ${key}`);
  if (bad.length) fail(`letters ${bad.join(" ")}`);
  console.log("letters PASS");
}

async function main() {
  if (cmd === "px") return px();
  if (cmd === "adj") return adj();
  if (cmd === "bbox") return bbox();
  if (cmd === "cnt" || cmd === "sd" || cmd === "diff") return numeric(cmd);
  if (cmd === "proj") return proj();
  if (cmd === "portdiff") return portdiff();
  if (cmd === "census") return census();
  if (cmd === "letters") return letters();
  fail(`unknown command ${cmd}`);
}
main().catch((e) => fail(e.message));
