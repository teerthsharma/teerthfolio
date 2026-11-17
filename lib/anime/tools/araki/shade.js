// araki shade: hue-shifted cel ramp, hard gold rim band, fur clumps, seal eye and heavy brow lines.
import { defineModule as M, v2, v3, rgb } from "./define.js";

export const arakiCelRamp = M({
  name: "arakiCelRamp",
  doc: "three-tone cel ramp whose shade is darkened, saturated and hue-rotated, lit lifted toward plaster",
  glsl: `
uniform vec3 uArkBase;
uniform float uArkHue;
uniform vec2 uArkCut;
vec3 arakiCelRampC(vec3 base, float ndl) {
  vec3 sh = arkHue(base * 0.62, uArkHue);
  sh = mix(vec3(arkLuma(sh)), sh, 1.25);
  vec3 li = arkHue(mix(base, ARK_PLASTER, 0.26), -uArkHue * 0.4);
  return mix(mix(sh, base, arkAA(ndl, uArkCut.x)), li, arkAA(ndl, uArkCut.y));
}
vec3 arakiCelRamp(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.32;
  vec3 N = vec3(q, sqrt(max(1.0 - dot(q, q), 0.0)));
  vec3 c = arakiCelRampC(uArkBase, dot(N, normalize(vec3(-0.45, 0.75, 0.48))));
  return mix(ARK_PLASTER * 0.85, c, arkFill(length(q) - 1.0));
}`,
  demoExpr: "arakiCelRamp(p, t)",
  draws: "A sphere in three flat tones: a pale pink lit band, a mid pink and a deeper violet-leaning shade, with hard edges between them.",
  use: "surface",
  params: "uArkBase: coat colour; uArkHue: radians the shade is rotated (shade turns violet); uArkCut: N.L thresholds of shade-to-mid and mid-to-lit.",
  uniforms: { uArkBase: rgb("#d985bd"), uArkHue: 0.45, uArkCut: v2(0.29, 0.78) },
});

export const arakiRimBand = M({
  name: "arakiRimBand",
  doc: "one hard gold rim band on the Stand side of a form, with a narrower cream core for the emissive mask",
  glsl: `
uniform vec3 uArkRimDir;
uniform vec3 uArkRimCol;
uniform float uArkRimK;
float arakiRimBandM(vec3 N, float cut) {
  float e = pow(1.0 - max(N.z, 0.0), uArkRimK);
  return arkAA(e, cut) * arkAA(dot(N, normalize(uArkRimDir)) + 0.3, 0.0);
}
vec3 arakiRimBandC(vec3 col, vec3 N) {
  col = mix(col, uArkRimCol, arakiRimBandM(N, 0.5));
  return mix(col, mix(uArkRimCol, ARK_PLASTER, 0.55), arakiRimBandM(N, 0.82));
}
vec3 arakiRimBand(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.32;
  vec3 N = vec3(q, sqrt(max(1.0 - dot(q, q), 0.0)));
  vec3 base = mix(vec3(0.255, 0.322, 0.420), vec3(0.525, 0.667, 0.839), arkAA(dot(N, normalize(vec3(-0.45, 0.75, 0.48))), 0.29));
  return mix(ARK_PLASTER * 0.85, arakiRimBandC(base, N), arkFill(length(q) - 1.0));
}`,
  demoExpr: "arakiRimBand(p, t)",
  draws: "A blue-grey sphere in two tones with one hard gold band along its right edge and a thin cream line inside the band.",
  use: "surface",
  params: "uArkRimDir: world light direction the rim comes from; uArkRimCol: band colour; uArkRimK: fresnel power (bigger is thinner).",
  uniforms: { uArkRimDir: v3(0.6, 0.35, -0.7), uArkRimCol: rgb("#d9a441"), uArkRimK: 5 },
});

export const arakiFurClump = M({
  name: "arakiFurClump",
  doc: "rows of pointed dark fur clumps with ragged tip lengths, gated to the shadow side",
  glsl: `
uniform float uArkFurAng;
uniform float uArkFurSize;
vec3 arakiFurClumpC(vec3 col, vec2 p, float shade) {
  float a = uArkFurAng;
  vec2 q = vec2(cos(a) * p.x + sin(a) * p.y, -sin(a) * p.x + cos(a) * p.y) / uArkFurSize;
  q.x += 0.5 * mod(floor(q.y), 2.0);
  vec2 id = floor(q), f = fract(q);
  float h = arkH21(id + 3.0);
  float len = 0.55 + 0.45 * h;
  float d = abs(f.y - 0.5) - 0.5 * (1.0 - f.x / len);
  float tooth = arkFill(d * uArkFurSize) * (1.0 - arkAA(f.x, len));
  return mix(col, vec3(0.110, 0.094, 0.086), tooth * arkAA(shade, 0.35 + 0.3 * h) * 0.92);
}
vec3 arakiFurClump(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.32;
  vec3 N = vec3(q, sqrt(max(1.0 - dot(q, q), 0.0)));
  float ndl = dot(N, normalize(vec3(-0.45, 0.75, 0.48)));
  vec3 c = mix(vec3(0.255, 0.322, 0.420), vec3(0.525, 0.667, 0.839), arkAA(ndl, 0.29));
  c = arakiFurClumpC(c, p, 1.0 - ndl);
  return mix(ARK_PLASTER * 0.85, c, arkFill(length(q) - 1.0));
}`,
  demoExpr: "arakiFurClump(p, t)",
  draws: "A blue-grey sphere whose shaded left side is covered in rows of dark triangular fur points of uneven length, none on the lit side.",
  use: "surface",
  params: "uArkFurAng: direction the clump tips point, radians (112.5 degrees is 1.963); uArkFurSize: clump size in frame-height units.",
  uniforms: { uArkFurAng: 1.963, uArkFurSize: 0.045 },
});

export const arakiSealEye = M({
  name: "arakiSealEye",
  doc: "seal lens eye: dark round lens, coloured spoked iris, heavy double lid, hatched under-eye, cream catchlight that turns gold",
  glsl: `
uniform vec3 uArkIris;
uniform vec3 uArkEyeSkin;
uniform float uArkLid;
uniform float uArkGold;
vec3 arakiSealEye(vec2 p, float t) {
  vec2 q = p - vec2(0.8, 0.5);
  vec3 c = uArkEyeSkin;
  float lidY = mix(0.17, -0.12, clamp(uArkLid, 0.0, 1.0));
  float dl = q.y - (lidY - 1.2 * q.x * q.x);
  float vis = 1.0 - arkAA(dl, 0.0);
  c = mix(c, vec3(0.075, 0.063, 0.090), arkFill(length(q) - 0.14) * vis);
  float spoke = 1.0 - arkAA(abs(fract(atan(q.y, q.x) * 1.9099) - 0.5), 0.12);
  vec3 iris = mix(uArkIris, uArkIris * 0.5, spoke);
  c = mix(c, iris, arkFill(length(q) - 0.085) * vis);
  c = mix(c, vec3(0.075, 0.063, 0.090), arkFill(length(q) - 0.035) * vis);
  vec3 glint = mix(vec3(0.957, 0.937, 0.890), ARK_GOLD, clamp(uArkGold, 0.0, 1.0));
  c = mix(c, glint, arkFill(length(q - vec2(0.04, 0.045)) - 0.014) * vis);
  float lid = max(arkLine(dl, 3.4), arkLine(dl - 0.028, 2.0) * arkAA(q.y, -0.2));
  float hatch = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    hatch = max(hatch, arkLine(arkSeg(q, vec2(-0.07 + 0.07 * fk, -0.17), vec2(-0.09 + 0.07 * fk, -0.205)) - 0.003, 1.2));
  }
  return mix(c, ARK_INK, max(lid, hatch));
}`,
  demoExpr: "arakiSealEye(p, t)",
  draws: "A pale blue-grey ground with a dark round eye holding a green spoked iris and a small glint, a heavy double lid line above and three short strokes below.",
  use: "card",
  params: "uArkIris: iris colour; uArkEyeSkin: fur colour around the eye; uArkLid: 0 open to 1 shut; uArkGold: 0 cream catchlight to 1 gold.",
  uniforms: { uArkIris: rgb("#3fbf8a"), uArkEyeSkin: rgb("#d3e2f1"), uArkLid: 0.25, uArkGold: 0 },
});

export const arakiBrowLines = M({
  name: "arakiBrowLines",
  doc: "heavy angular tapered brow and two under-eye crease lines, the brow slope set by a rage value",
  glsl: `
uniform float uArkRage;
uniform vec3 uArkBrowSkin;
float arakiBrowSeg(vec2 q, vec2 a, vec2 b, float wa, float wb) {
  vec2 pa = q - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(wa, wb, h);
}
vec3 arakiBrowLines(vec2 p, float t) {
  vec2 q = p - vec2(0.8, 0.5);
  float yi = 0.20 - 0.07 * uArkRage, yo = 0.18 + 0.04 * uArkRage;
  vec2 a = vec2(-0.15, yi), b = vec2(0.0, max(yi, yo) + 0.02), c = vec2(0.17, yo);
  float brow = min(arakiBrowSeg(q, a, b, 0.024, 0.016), arakiBrowSeg(q, b, c, 0.016, 0.005));
  float crease = min(arkSeg(q, vec2(-0.10, -0.19), vec2(0.10, -0.21)) - 0.004, arkSeg(q, vec2(-0.06, -0.235), vec2(0.06, -0.25)) - 0.003);
  float m = max(arkFill(brow), arkLine(crease, 1.6));
  return mix(uArkBrowSkin, ARK_INK, m);
}`,
  demoExpr: "arakiBrowLines(p, t)",
  draws: "A pale ground with one thick ink brow that kinks at the middle and thins to a point at the outer end, and two thin curved crease lines below.",
  use: "card",
  params: "uArkRage: 0 level brow to 1 inner end dropped toward the nose and outer end raised; uArkBrowSkin: ground colour.",
  uniforms: { uArkRage: 0.8, uArkBrowSkin: rgb("#d3e2f1") },
});

export const SHADE = [arakiCelRamp, arakiRimBand, arakiFurClump, arakiSealEye, arakiBrowLines];
