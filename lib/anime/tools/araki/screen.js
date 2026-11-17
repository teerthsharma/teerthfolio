// araki screen: stepped colour shift, posterised held negative, grain on twos with paper tooth, hard stepped glow.
import { defineModule as M, v2, v3, rgb } from "./define.js";

export const arakiColourShift = M({
  name: "arakiColourShift",
  doc: "remaps the four value bands of a plate to flat palette colours and rotates the hue by a fixed angle every hold",
  glsl: `
uniform vec3 uArkPalA;
uniform vec3 uArkPalB;
uniform vec3 uArkPalC;
uniform vec3 uArkPalD;
uniform float uArkSpin;
uniform float uArkHold;
vec3 arakiColourShiftC(vec3 c, float stepN) {
  float L = arkLuma(c);
  vec3 pal = mix(mix(mix(uArkPalA, uArkPalB, arkAA(L, 0.25)), uArkPalC, arkAA(L, 0.5)), uArkPalD, arkAA(L, 0.75));
  return arkHue(pal, stepN * uArkSpin);
}
vec3 arakiColourShift(vec2 p, float t) {
  return arakiColourShiftC(arkDemoPlate(p), floor(t * 12.0 / max(uArkHold, 1.0)));
}`,
  demoExpr: "arakiColourShift(p, t)",
  draws: "The same picture repainted in four flat palette colours that jump to a new hue family every few drawings, like a JoJo colour-shift panel.",
  use: "grade",
  params: "uArkPalA-D: dark-to-light band colours; uArkSpin: radians of hue rotation added per hold; uArkHold: drawings (12 fps ticks) per hold.",
  uniforms: { uArkPalA: v3(0.18, 0.10, 0.28), uArkPalB: v3(0.80, 0.16, 0.60), uArkPalC: v3(1.0, 0.54, 0.23), uArkPalD: v3(0.95, 0.85, 0.35), uArkSpin: 2.399, uArkHold: 3 },
});

export const arakiNegativeFrame = M({
  name: "arakiNegativeFrame",
  doc: "held negative: hue-rotated inverse posterised to four values, with a hard-edged disc left in normal colour",
  glsl: `
uniform vec3 uArkKeep;
uniform float uArkNegHue;
uniform float uArkNeg;
vec3 arakiNegativeFrameC(vec3 c, vec2 p) {
  vec3 n = arkHue(vec3(1.0) - c, uArkNegHue);
  float L = arkLuma(n);
  float band = floor(clamp(L, 0.0, 0.999) * 4.0) / 3.0;
  n *= mix(0.12, 0.88, band) / max(L, 1e-3);
  float keep = arkFill(length(p - uArkKeep.xy) - uArkKeep.z);
  return mix(c, n, uArkNeg * (1.0 - keep));
}
vec3 arakiNegativeFrame(vec2 p, float t) { return arakiNegativeFrameC(arkDemoPlate(p), p); }`,
  demoExpr: "arakiNegativeFrame(p, t)",
  draws: "The whole picture flipped to a flat four-value negative with shifted hues, except one round patch that keeps its true colour.",
  use: "grade",
  params: "uArkKeep: x, y and radius of the disc left un-inverted (radius 0 for none); uArkNegHue: radians the negative is rotated; uArkNeg: 1 when the negative is held.",
  uniforms: { uArkKeep: v3(0.8, 0.52, 0.13), uArkNegHue: 0.6, uArkNeg: 1 },
});

export const arakiTwosGrain = M({
  name: "arakiTwosGrain",
  doc: "film grain re-rolled 12 times a second and weighted to the shadows, plus a static paper tooth",
  glsl: `
uniform vec2 uArkCells;
uniform float uArkAmp;
uniform float uArkTooth;
uniform float uArkSeed;
vec3 arakiTwosGrainC(vec3 c, vec2 p, float t) {
  float L = arkLuma(c);
  float k = floor(t * 12.0);
  float g = arkH21(floor(p * uArkCells) + vec2(17.0, 31.0) * k + uArkSeed) - 0.5;
  float tooth = arkVn(p * uArkCells * 0.5 + uArkSeed) - 0.5;
  return c + uArkAmp * (1.0 - L) * g + uArkTooth * tooth * (1.0 - 0.5 * L);
}
vec3 arakiTwosGrain(vec2 p, float t) { return arakiTwosGrainC(arkDemoPlate(p), p, t); }`,
  demoExpr: "arakiTwosGrain(p, t)",
  draws: "A fine speckle over the picture, strongest in the dark areas, that changes twelve times a second, over a faint fixed paper pitting.",
  use: "noise",
  params: "uArkCells: grain cells across p (frame pixels); uArkAmp: moving grain amount; uArkTooth: fixed paper tooth amount; uArkSeed: pattern seed.",
  uniforms: { uArkCells: v2(800, 800), uArkAmp: 0.06, uArkTooth: 0.03, uArkSeed: 5 },
});

export const arakiStepGlow = M({
  name: "arakiStepGlow",
  doc: "light as three hard concentric steps with a ragged edge, outer step hue-shifted, pulsing on twos; no soft falloff",
  glsl: `
uniform vec2 uArkGlowAt;
uniform vec3 uArkGlowR;
uniform vec3 uArkGlowCol;
vec3 arakiStepGlowC(vec3 base, vec2 p, float t) {
  vec2 q = p - uArkGlowAt;
  vec2 u = normalize(q + vec2(1e-5));
  float k = 1.0 + 0.04 * mod(floor(t * 12.0), 2.0);
  float r = length(q) * (1.0 + 0.10 * (arkVn(u * 1.7 + floor(t * 12.0) * 0.37) - 0.5)) / k;
  float o = 1.0 - arkAA(r, uArkGlowR.z), m = 1.0 - arkAA(r, uArkGlowR.y), c = 1.0 - arkAA(r, uArkGlowR.x);
  vec3 g = uArkGlowCol;
  return base + o * 0.16 * arkHue(g, 0.3) + m * 0.2 * g + c * 0.4 * mix(g, ARK_PLASTER, 0.4);
}
vec3 arakiStepGlow(vec2 p, float t) { return arakiStepGlowC(vec3(0.20, 0.12, 0.16), p, t); }`,
  demoExpr: "arakiStepGlow(p, t)",
  draws: "A dark plum field with a gold light made of three flat rings, brightest in the middle, with wobbly edges that twitch twice a second.",
  use: "card",
  params: "uArkGlowAt: light centre; uArkGlowR: radii of the core, middle and outer steps; uArkGlowCol: light colour (add before the luma cap).",
  uniforms: { uArkGlowAt: v2(0.8, 0.5), uArkGlowR: v3(0.08, 0.17, 0.28), uArkGlowCol: rgb("#d9a441") },
});

export const SCREEN = [arakiColourShift, arakiNegativeFrame, arakiTwosGrain, arakiStepGlow];
