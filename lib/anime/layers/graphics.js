// Graphic passes as data. Sit ON the shader body. Not a sixth stash.
// paint / print / sakuga / paper / film-gate / multiplane / hold-on-twos.
// Each pass: id, stash 0-4, blend, when, uniforms. Engine already has the five.

import { BLENDS, WHENS, STASHES } from "./protocol.js";

export const BLEND_INDEX = Object.freeze({
  replace: 0,
  multiply: 1,
  screen: 2,
  "add-clamped": 3,
});

function uv(n) {
  return Object.freeze({ value: n });
}

function freezePass(p) {
  if (!p || typeof p.id !== "string") throw new Error("graphic pass missing id");
  if (!Number.isInteger(p.stash) || p.stash < 0 || p.stash > 4) {
    throw new Error(`graphic pass ${p.id}: stash ${p.stash}`);
  }
  if (!STASHES[p.stash]) throw new Error(`graphic pass ${p.id}: no stash ${p.stash}`);
  if (!BLENDS.includes(p.blend)) throw new Error(`graphic pass ${p.id}: blend ${p.blend}`);
  if (!WHENS.includes(p.when)) throw new Error(`graphic pass ${p.id}: when ${p.when}`);
  const uniforms = Object.freeze({ ...p.uniforms });
  return Object.freeze({
    id: p.id,
    name: p.name,
    stash: p.stash,
    blend: p.blend,
    blendIndex: BLEND_INDEX[p.blend],
    when: p.when,
    uniforms,
  });
}

export const PASSES = Object.freeze({
  PAINT: freezePass({
    id: "paint",
    name: "cel-paint",
    stash: 1,
    blend: "replace",
    when: "shot",
    uniforms: {
      uPaintWet: uv(0.62),
      uPaintChip: uv(0.38),
      uPaintShadow: uv(0.34),
    },
  }),
  PRINT: freezePass({
    id: "print",
    name: "print-register",
    stash: 4,
    blend: "multiply",
    when: "shot",
    uniforms: {
      uPrintOff: uv(0.85),
      uPrintDot: uv(7.0),
      uPrintKey: uv(0.72),
    },
  }),
  SAKUGA: freezePass({
    id: "sakuga",
    name: "sakuga-ones",
    stash: 2,
    blend: "add-clamped",
    when: "frame",
    uniforms: {
      uSakuga: uv(0.8),
      uSmear: uv(0.7),
      uImpact: uv(0.45),
    },
  }),
  PAPER: freezePass({
    id: "paper",
    name: "paper-tooth",
    stash: 0,
    blend: "multiply",
    when: "build",
    uniforms: {
      uPaperTooth: uv(0.55),
      uPaperLaid: uv(1.4),
    },
  }),
  FILM_GATE: freezePass({
    id: "film-gate",
    name: "film-gate",
    stash: 3,
    blend: "multiply",
    when: "frame",
    uniforms: {
      uGateWeave: uv(0.4),
      uSprocket: uv(1.0),
      uSafe: uv(0.85),
    },
  }),
  MULTIPLANE: freezePass({
    id: "multiplane",
    name: "multiplane",
    stash: 0,
    blend: "replace",
    when: "shot",
    uniforms: {
      uNear: uv(1.0),
      uMid: uv(0.55),
      uFar: uv(0.7),
      uParallax: uv(0.65),
    },
  }),
  HOLD_ON_TWOS: freezePass({
    id: "hold-on-twos",
    name: "hold-on-twos",
    stash: 1,
    blend: "replace",
    when: "frame",
    uniforms: {
      uHoldFps: uv(12),
      uBoil: uv(0.55),
    },
  }),
});

export const PASS_LIST = Object.freeze([
  PASSES.PAINT,
  PASSES.PRINT,
  PASSES.SAKUGA,
  PASSES.PAPER,
  PASSES.FILM_GATE,
  PASSES.MULTIPLANE,
  PASSES.HOLD_ON_TWOS,
]);

export const PASS_NAMES = Object.freeze(PASS_LIST.map((p) => p.id));

export function passById(id) {
  const p = PASS_LIST.find((x) => x.id === id);
  if (!p) throw new Error(`graphic pass not found: ${id}`);
  return p;
}

export const GRAPHIC_GLSL = /* glsl */ `
#ifndef LY_GRAPHIC_KIT
#define LY_GRAPHIC_KIT
// Graphic treatment. Input is already-lit shader colour. Output is the pass.
const int LY_G_PAINT_BLEND = 0;
const int LY_G_PRINT_BLEND = 1;
const int LY_G_SAKUGA_BLEND = 3;
const int LY_G_PAPER_BLEND = 1;
const int LY_G_GATE_BLEND = 1;
const int LY_G_PLANE_BLEND = 0;
const int LY_G_TWOS_BLEND = 0;

uniform float uPaintWet;
uniform float uPaintChip;
uniform float uPaintShadow;
uniform float uPrintOff;
uniform float uPrintDot;
uniform float uPrintKey;
uniform float uSakuga;
uniform float uSmear;
uniform float uImpact;
uniform float uPaperTooth;
uniform float uPaperLaid;
uniform float uGateWeave;
uniform float uSprocket;
uniform float uSafe;
uniform float uNear;
uniform float uMid;
uniform float uFar;
uniform float uParallax;
uniform float uHoldFps;
uniform float uBoil;

// Painted chips. Shadow is a hue, never albedo * 0.2. Wet edge at the cut.
vec3 lyGPaint(vec3 shaderCol, vec2 p, float wet, float chip) {
  float h = lyNdL(p);
  vec3 sh = vec3(0.30, 0.20, 0.32);
  vec3 hi = vec3(0.86, 0.70, 0.52);
  float cut = lyAA(h, clamp(chip, 0.18, 0.72));
  vec3 body = mix(mix(sh, shaderCol, 0.42), mix(shaderCol, hi, 0.32), cut);
  float seam = lyLine(h - chip, 1.35) * clamp(wet, 0.0, 1.0);
  return lyPolice(mix(body, mix(sh, hi, 0.46), seam * 0.38));
}

vec3 lyGPaintShadow(vec3 shaderCol, vec2 p, float shadow) {
  float h = lyNdL(p);
  float well = 1.0 - lyAA(h, clamp(shadow, 0.16, 0.5));
  vec3 hue = vec3(0.34, 0.22, 0.28);
  return lyPolice(mix(shaderCol, mix(shaderCol, hue, 0.72), well));
}

vec3 lyGPaintKey(vec3 shaderCol, vec2 p) {
  float h = lyNdL(p);
  float chip = lyAA(h, 0.68);
  vec3 hi = vec3(0.88, 0.74, 0.54);
  return lyPolice(mix(shaderCol, hi, chip * 0.42));
}

// Register split + key overprint. Grade stash. Not P6 lyPrint.
vec3 lyGPrint(vec3 shaderCol, vec2 p, float off) {
  float L = lyLuma(shaderCol);
  vec2 o = vec2(off * 0.012, -off * 0.009);
  float cCut = lyAA(L + o.x * 3.4, 0.46);
  float mCut = lyAA(L + o.y * 3.4, 0.46);
  vec3 cyan = shaderCol * vec3(0.70, 1.05, 1.12);
  vec3 mag = shaderCol * vec3(1.12, 0.72, 1.04);
  vec3 split = mix(shaderCol, cyan, (1.0 - cCut) * 0.24);
  split = mix(split, mag, (1.0 - mCut) * 0.22);
  return lyPolice(split);
}

vec3 lyGPrintDot(vec3 shaderCol, vec2 p, float pitch) {
  vec2 fc = gl_FragCoord.xy;
  vec2 g = fract(fc / max(pitch, 2.0)) - 0.5;
  float dotc = lyFill(length(g) * 2.0 - 0.62);
  float sh = 1.0 - lyAA(lyNdL(p), 0.36);
  vec3 toner = mix(shaderCol, LY_INK * 1.7, 0.55);
  return lyPolice(mix(shaderCol, toner, dotc * sh * 0.58));
}

vec3 lyGPrintKey(vec3 shaderCol, vec2 p, float key) {
  float rim = lyLine(lyFigD(p), 2.0);
  return lyPolice(mix(shaderCol, LY_INK, rim * clamp(key, 0.0, 1.0) * 0.78));
}

// Sakuga: smear shapes on ones, not a blur. Impact rides add-clamped + uEmit.
vec3 lyGSakuga(vec3 shaderCol, vec2 p, float t, float smear, float impact) {
  float ht = lyHold(t, 24.0);
  vec2 dir = vec2(0.94, 0.16);
  float trail = 0.0;
  for (int i = 1; i <= 4; i++) {
    float k = float(i);
    vec2 q = p - dir * smear * k * 0.02;
    trail += lyCover(q) * (1.0 - k * 0.2);
  }
  vec3 smearCol = mix(shaderCol, LY_KEY, 0.34);
  vec3 outc = mix(shaderCol, smearCol, clamp(trail * 0.26, 0.0, 1.0));
  float flash = clamp(impact, 0.0, 1.0) * exp(-dot(p - lyFigC(), p - lyFigC()) * 7.5);
  return lyPolice(outc + LY_KEY * flash * 0.2 * max(uEmit, 0.15));
}

vec3 lyGSakugaSplit(vec3 shaderCol, vec2 p, float t) {
  float ones = lyHold(t, 24.0);
  float twos = lyHold(t, 12.0);
  float side = lyAA(p.x, 0.72);
  vec2 j1 = (vec2(lyHash(vec2(ones, 2.2)), lyHash(vec2(ones, 5.8))) - 0.5) * 0.01;
  vec2 j2 = (vec2(lyHash(vec2(twos, 2.2)), lyHash(vec2(twos, 5.8))) - 0.5) * 0.004;
  float d = mix(lyFigD(p + j2), lyFigD(p + j1), side);
  return lyPolice(mix(shaderCol, LY_INK, lyLine(d, 1.7) * 0.8));
}

// Laid tooth on the already-lit plate. Paper is a multiply, compiled at build.
vec3 lyGPaper(vec3 shaderCol, vec2 p, float tooth, float laid) {
  float fiber = lyVn(vec2(p.x * 20.0 + p.y * laid, p.y * 3.6));
  vec3 page = lyPaper(p);
  float grain = (fiber - 0.5) * clamp(tooth, 0.0, 1.0) * 0.14;
  vec3 mixed = mix(shaderCol, shaderCol * page / max(lyLuma(page), 0.22), tooth * 0.2);
  return lyPolice(mixed + vec3(grain));
}

vec3 lyGPaperDeckle(vec3 shaderCol, vec2 p) {
  float m = min(min(p.x, 1.44 - p.x), min(p.y, 1.0 - p.y));
  float n = lyVn(p * 34.0 + vec2(0.0, p.x * 9.0));
  float edge = m - 0.045 - (n - 0.5) * 0.028;
  float page = lyFill(-edge);
  return lyPolice(mix(LY_INK * 1.55, shaderCol, page));
}

vec3 lyGPaperLaid(vec3 shaderCol, vec2 p, float laid) {
  float g = abs(fract((p.x * 1.35 + p.y * 0.06) * 50.0 * max(laid, 0.4)) - 0.5) * 2.0;
  float w = fwidth(g) + 1e-5;
  float stroke = 1.0 - smoothstep(0.46 - w, 0.56 + w, g);
  return lyPolice(mix(shaderCol, shaderCol * vec3(0.86, 0.82, 0.76), stroke * 0.22));
}

// Gate, sprocket, academy. Occlude stash. Holes are indigo, never #000.
vec3 lyGGate(vec3 shaderCol, vec2 p, float weave, float sprocket, float safe) {
  float ht = lyHold(p.x + weave * 3.0, 24.0);
  vec2 q = p + vec2(sin(ht * 6.2) * weave * 0.01, cos(ht * 5.1) * weave * -0.007);
  float ycell = fract(q.y * 6.4);
  float holeL = lyFill(length(vec2((q.x + 0.07) * 7.2, (ycell - 0.5) * 3.1)) - 0.32);
  float holeR = lyFill(length(vec2((q.x - 1.51) * 7.2, (ycell - 0.5) * 3.1)) - 0.32);
  float holes = max(holeL, holeR) * clamp(sprocket, 0.0, 1.0);
  float frame = min(min(q.x - 0.055, 1.385 - q.x), min(q.y - 0.07, 0.93 - q.y));
  float bar = (1.0 - lyFill(frame)) * clamp(safe, 0.0, 1.0);
  return lyPolice(mix(shaderCol, LY_INK * 1.45, max(holes, bar) * 0.8));
}

// Multiplane: near is the shader figure. Far is a card. Mid is a wash.
vec3 lyGPlane(vec3 shaderCol, vec2 p, float t, float nearA, float farA, float par) {
  float ht = lyHold(t, 12.0);
  float shift = sin(ht * 0.65) * par;
  vec2 pn = p - vec2(shift * 0.045, 0.0);
  vec2 pf = p - vec2(shift * 0.008, 0.0);
  vec3 farCol = mix(vec3(0.40, 0.36, 0.50), vec3(0.62, 0.48, 0.38), lyAA(pf.y, 0.58));
  vec2 box = abs(pf - vec2(0.28, 0.62)) - vec2(0.22, 0.16);
  float farM = lyFill(max(box.x, box.y)) * clamp(farA, 0.0, 1.0);
  float nearM = lyCover(pn) * clamp(nearA, 0.0, 1.0);
  vec3 midCol = mix(vec3(0.26, 0.30, 0.42), shaderCol, 0.3);
  vec3 plate = mix(lyPaper(p) * 0.5, farCol, farM);
  plate = mix(plate, midCol, (1.0 - nearM) * uMid * 0.32);
  plate = mix(plate, shaderCol, nearM);
  return lyPolice(plate);
}

// Hold on twos: time is floor(t*fps)/fps. Boil is tracing, not interpolation.
vec3 lyGTwos(vec3 shaderCol, vec2 p, float t, float fps, float boil) {
  float ht = lyHold(t, max(fps, 1.0));
  vec2 j = (vec2(lyHash(vec2(ht, 3.1)), lyHash(vec2(ht + 2.4, 8.7))) - 0.5) * boil * 0.013;
  float rim = lyLine(lyFigD(p + j), 1.9);
  vec3 held = mix(shaderCol, LY_INK, rim * 0.82);
  vec3 crawl = lyPaper(p + j);
  return lyPolice(mix(held, held * crawl / max(lyLuma(crawl), 0.24), boil * 0.1));
}
#endif
`;

function graphicUniforms() {
  const u = {};
  for (const p of PASS_LIST) Object.assign(u, p.uniforms);
  return u;
}

export const graphicKit = {
  name: "graphicKit",
  doc: "graphic passes as data: paint print sakuga paper film-gate multiplane hold-on-twos — on top of the shader, five stashes only",
  deps: ["layerKit"],
  uniforms: graphicUniforms,
  glsl: GRAPHIC_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec3 lit = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    vec3 body = mix(lyPaper(p) * 0.5, lit, lyCover(p));
    return lyGPaint(body, p, uPaintWet, uPaintChip);
  }`,
};

export const graphics = {
  PASSES,
  PASS_LIST,
  PASS_NAMES,
  BLEND_INDEX,
  passById,
  graphicKit,
};
