// node scripts/seal-gates.mjs : markings gates G-C1..G-C4, G-32 and G-P on a seal still (scoring only; the driver is not written yet).
// Inputs: an sRGB RGBA still and a region-id mask (one byte per pixel, REGION below). Gates are pure functions of those.
// A gate that cannot be computed returns "not_run", never "pass". Spec: ~/.uriel/house/wilson/specs/seal-skins.md section 4.
import { pathToFileURL } from "node:url";
import { lumaY } from "../lib/anime/tools/still-stats.js";

export const REGION = Object.freeze({ none: 0, back: 1, belly: 2, pad: 3, freckle: 4, eye: 5, worn: 6 });

export const EXPECT = Object.freeze({
  yRatioMin: 1.4,
  hueMin: 200,
  hueMax: 290,
  chromaMin: 4,
  dStarBMin: 6,
  padDLMin: -15,
  frecklesPerPad: 3,
  freckleDLMin: 20,
  p20LMax: 30,
  cellTall: 32,
  wornCellsMin: 6,
  wornDLMin: 20,
  eyeCellsMin: 1,
  eyeLMax: 30,
  heroDrawsMax: 3,
});

const mod360 = (x) => ((x % 360) + 360) % 360;
const DEG = 180 / Math.PI;

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function labFromLinear(R, G, B) {
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L: 116 * fy - 16, a, b, C: Math.hypot(a, b), h: mod360(Math.atan2(b, a) * DEG) };
}

export function srgbToLab(r, g, b) {
  return labFromLinear(linear(r), linear(g), linear(b));
}

function check(rgba, mask, w, h) {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) throw new TypeError("seal-gates: w and h must be positive integers");
  if (rgba.length !== w * h * 4) throw new TypeError(`seal-gates: rgba has ${rgba.length} bytes, want ${w * h * 4}`);
  if (mask.length !== w * h) throw new TypeError(`seal-gates: mask has ${mask.length} bytes, want ${w * h}`);
}

function pixelsOf(mask, id) {
  const out = [];
  for (let i = 0; i < mask.length; i++) if (mask[i] === id) out.push(i);
  return out;
}

const labAt = (rgba, i) => srgbToLab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);

function meanOf(idx, value) {
  let s = 0;
  for (const i of idx) s += value(i);
  return s / idx.length;
}

function components(mask, w, h, accept) {
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !accept(mask[start])) continue;
    const comp = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w;
      const y = (i - x) / w;
      const nbrs = [];
      if (x > 0) nbrs.push(i - 1);
      if (x < w - 1) nbrs.push(i + 1);
      if (y > 0) nbrs.push(i - w);
      if (y < h - 1) nbrs.push(i + w);
      for (const j of nbrs) {
        if (!seen[j] && accept(mask[j])) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

const result = (id, status, measured, expected) => ({ id, status, measured, expected });

export function gateC1({ rgba, mask }) {
  const back = pixelsOf(mask, REGION.back);
  const belly = pixelsOf(mask, REGION.belly);
  const expected = { yRatioMin: EXPECT.yRatioMin };
  if (!back.length || !belly.length) return result("G-C1", "not_run", { yRatio: null }, expected);
  const yBack = meanOf(back, (i) => lumaY(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  const yBelly = meanOf(belly, (i) => lumaY(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  if (!(yBack > 0)) return result("G-C1", "not_run", { yRatio: null }, expected);
  const yRatio = yBelly / yBack;
  return result("G-C1", yRatio >= EXPECT.yRatioMin ? "pass" : "fail", { yRatio }, expected);
}

export function gateC2({ rgba, mask }) {
  const back = pixelsOf(mask, REGION.back);
  const belly = pixelsOf(mask, REGION.belly);
  const expected = { hueMin: EXPECT.hueMin, hueMax: EXPECT.hueMax, chromaMin: EXPECT.chromaMin, dStarBMin: EXPECT.dStarBMin };
  if (!back.length || !belly.length) return result("G-C2", "not_run", { hueAb: null, chroma: null, dStarB: null }, expected);
  const meanLab = (idx) => {
    let a = 0;
    let b = 0;
    for (const i of idx) {
      const lab = labAt(rgba, i);
      a += lab.a;
      b += lab.b;
    }
    return { a: a / idx.length, b: b / idx.length };
  };
  const bk = meanLab(back);
  const bl = meanLab(belly);
  const hueAb = mod360(Math.atan2(bk.b, bk.a) * DEG);
  const chroma = Math.hypot(bk.a, bk.b);
  const dStarB = bl.b - bk.b;
  const pass = hueAb >= EXPECT.hueMin && hueAb <= EXPECT.hueMax && chroma >= EXPECT.chromaMin && dStarB >= EXPECT.dStarBMin;
  return result("G-C2", pass ? "pass" : "fail", { hueAb, chroma, dStarB }, expected);
}

export function gateC3({ rgba, mask, w, h }) {
  const pad = pixelsOf(mask, REGION.pad);
  const belly = pixelsOf(mask, REGION.belly);
  const expected = { padDLMin: EXPECT.padDLMin, frecklesPerPad: EXPECT.frecklesPerPad, freckleDLMin: EXPECT.freckleDLMin };
  if (!pad.length || !belly.length) return result("G-C3", "not_run", { padDL: null, pads: null, freckles: null }, expected);
  const lPad = meanOf(pad, (i) => labAt(rgba, i).L);
  const lBelly = meanOf(belly, (i) => labAt(rgba, i).L);
  const padDL = lPad - lBelly;
  const pads = components(mask, w, h, (v) => v === REGION.pad || v === REGION.freckle).length;
  const dots = components(mask, w, h, (v) => v === REGION.freckle);
  const freckles = dots.filter((comp) => lPad - meanOf(comp, (i) => labAt(rgba, i).L) >= EXPECT.freckleDLMin).length;
  const pass = padDL >= EXPECT.padDLMin && pads >= 1 && freckles >= EXPECT.frecklesPerPad * pads;
  return result("G-C3", pass ? "pass" : "fail", { padDL, pads, freckles }, expected);
}

export function gateC4({ rgba, mask }) {
  const eye = pixelsOf(mask, REGION.eye);
  const expected = { p20LMax: EXPECT.p20LMax };
  if (!eye.length) return result("G-C4", "not_run", { p20L: null }, expected);
  const Ls = eye.map((i) => labAt(rgba, i).L).sort((p, q) => p - q);
  const p20L = Ls[Math.max(0, Math.ceil(0.2 * Ls.length) - 1)];
  return result("G-C4", p20L <= EXPECT.p20LMax ? "pass" : "fail", { p20L }, expected);
}

export function gate32({ rgba, mask, w, h }) {
  const expected = { wornCellsMin: EXPECT.wornCellsMin, wornDLMin: EXPECT.wornDLMin, eyeCellsMin: EXPECT.eyeCellsMin, eyeLMax: EXPECT.eyeLMax };
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return result("G-32", "not_run", { wornCells: null, eyeCells: null }, expected);
  const X1 = x1 + 1;
  const Y1 = y1 + 1;
  const scale = (Y1 - y0) / EXPECT.cellTall;
  const cols = Math.max(1, Math.round((X1 - x0) / scale));
  const rows = EXPECT.cellTall;
  const cellWorn = new Uint8Array(rows * cols);
  const cellEye = new Uint8Array(rows * cols);
  const cellL = new Float64Array(rows * cols);
  for (let cy = 0; cy < rows; cy++) {
    const ya = Math.min(Y1 - 1, Math.floor(y0 + cy * scale));
    const yb = Math.min(Y1, Math.max(ya + 1, Math.floor(y0 + (cy + 1) * scale)));
    for (let cx = 0; cx < cols; cx++) {
      const xa = Math.min(X1 - 1, Math.floor(x0 + cx * scale));
      const xb = Math.min(X1, Math.max(xa + 1, Math.floor(x0 + (cx + 1) * scale)));
      let n = 0;
      let worn = 0;
      let eye = 0;
      let R = 0;
      let G = 0;
      let B = 0;
      for (let y = ya; y < yb; y++) {
        for (let x = xa; x < xb; x++) {
          const i = y * w + x;
          n++;
          if (mask[i] === REGION.worn) worn++;
          if (mask[i] === REGION.eye) eye++;
          R += linear(rgba[i * 4]);
          G += linear(rgba[i * 4 + 1]);
          B += linear(rgba[i * 4 + 2]);
        }
      }
      const c = cy * cols + cx;
      cellWorn[c] = worn / n >= 0.5 ? 1 : 0;
      cellEye[c] = eye / n >= 0.5 ? 1 : 0;
      cellL[c] = labFromLinear(R / n, G / n, B / n).L;
    }
  }
  let wornCells = 0;
  let eyeCells = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const c = cy * cols + cx;
      if (cellWorn[c]) {
        const nbrs = [];
        if (cx > 0) nbrs.push(c - 1);
        if (cx < cols - 1) nbrs.push(c + 1);
        if (cy > 0) nbrs.push(c - cols);
        if (cy < rows - 1) nbrs.push(c + cols);
        if (nbrs.some((j) => !cellWorn[j] && Math.abs(cellL[c] - cellL[j]) >= EXPECT.wornDLMin)) wornCells++;
      }
      if (cellEye[c] && cellL[c] <= EXPECT.eyeLMax) eyeCells++;
    }
  }
  const pass = wornCells >= EXPECT.wornCellsMin && eyeCells >= EXPECT.eyeCellsMin;
  return result("G-32", pass ? "pass" : "fail", { wornCells, eyeCells }, expected);
}

export function gateP({ programs }) {
  const expected = { programsEqual: true, heroDrawsMax: EXPECT.heroDrawsMax };
  const { withSkin, withoutSkin, heroDraws } = programs ?? {};
  const measured = { programsWithSkin: withSkin ?? null, programsWithoutSkin: withoutSkin ?? null, heroDraws: heroDraws ?? null };
  if (![withSkin, withoutSkin, heroDraws].every(Number.isFinite)) return result("G-P", "not_run", measured, expected);
  const pass = withSkin === withoutSkin && heroDraws <= EXPECT.heroDrawsMax;
  return result("G-P", pass ? "pass" : "fail", measured, expected);
}

export function scoreSeal({ rgba, mask, w, h, programs }) {
  check(rgba, mask, w, h);
  return [
    gateC1({ rgba, mask }),
    gateC2({ rgba, mask }),
    gateC3({ rgba, mask, w, h }),
    gateC4({ rgba, mask }),
    gate32({ rgba, mask, w, h }),
    gateP({ programs }),
  ];
}

function main() {
  console.log("driver not implemented");
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
