// Madhouse cast shaders: hard cel ramps, ink hull line, fur-notched terminator, ringed eye.
import { defineModule as M, SUITS } from "./define.js";

const BG = `vec3 bg = mix(MH_DEEPV * 1.4, MH_INK * 2.0, mhAA(p.x, 0.0));`;
const LDIR = `vec3(-0.5, 0.6, 0.62)`;

export const SURFACE = [
  M({
    name: "mhCel2", suits: SUITS, use: "surface",
    doc: "Death Note two-tone cel: one authored threshold, shade hue-shifted cold toward the fill colour, never a gradient.",
    draws: "A blue-grey sphere split by one hard terminator into a lit coat and a cool violet-tinged shade, no mid tone.",
    params: "uMhCel2Tau: N.L threshold of the terminator; uMhCel2Shift: how far the shade slides toward cold violet (0 = plain darken).",
    uniforms: () => ({ uMhCel2Tau: { value: -0.04 }, uMhCel2Shift: { value: 0.6 } }),
    glsl: /* glsl */ `
uniform float uMhCel2Tau;
uniform float uMhCel2Shift;
vec3 mhCel2Ramp(float nl, vec3 lit) {
  vec3 sh = mix(lit * 0.6, lit * vec3(0.62, 0.64, 0.80) + MH_DEEPV * 0.5, uMhCel2Shift);
  return mix(sh, lit, mhAA(nl, uMhCel2Tau));
}
vec3 mhCel2(vec2 p, float t) {
  ${BG}
  vec2 c = vec2(0.8, 0.5);
  float nl = mhNdL(p, c, 0.32, ${LDIR});
  return mhOut(mix(bg, mhCel2Ramp(nl, MH_COAT), mhFill(length(p - c) - 0.32)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhCel2(p, t); }`,
  }),

  M({
    name: "mhCelGold", suits: ["pr-topograph-432"], use: "surface",
    doc: "Overlord cel: coat, shade and a deep shade in three flat steps, plus one hard gold rim band on the throne side.",
    draws: "A violet-robed sphere in three flat tones with a thin crisp gold crescent hugging the edge that faces the light behind it.",
    params: "uMhGoldT1/uMhGoldT2: N.L thresholds of the two shade steps; uMhGoldRim: width of the gold crescent (0 = none).",
    uniforms: () => ({ uMhGoldT1: { value: -0.04 }, uMhGoldT2: { value: -0.5 }, uMhGoldRim: { value: 0.1 } }),
    glsl: /* glsl */ `
uniform float uMhGoldT1;
uniform float uMhGoldT2;
uniform float uMhGoldRim;
vec3 mhCelGoldRamp(float nl, float rim, vec3 coat) {
  vec3 c = mix(coat * 0.30, coat * 0.62, mhAA(nl, uMhGoldT2));
  c = mix(c, coat, mhAA(nl, uMhGoldT1));
  return mix(c, MH_GOLD * 0.85, rim);
}
vec3 mhCelGold(vec2 p, float t) {
  ${BG}
  vec2 c = vec2(0.8, 0.5); float r = 0.32;
  float nl = mhNdL(p, c, r, ${LDIR});
  vec2 q = (p - c) / r;
  float rim = mhAA(length(q), 1.0 - uMhGoldRim) * mhAA(dot(normalize(q + 1e-4), normalize(vec2(0.7, 0.55))), 0.35);
  return mhOut(mix(bg, mhCelGoldRamp(nl, rim, vec3(0.21, 0.125, 0.31)), mhFill(length(q) - 1.0)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhCelGold(p, t); }`,
  }),

  M({
    name: "mhInkHull", suits: SUITS, use: "line",
    doc: "Madhouse variable ink line: thin on the lit side, thick on the shadow side, drawn inside the silhouette in warm ink.",
    draws: "A pale disc rimmed by a hard dark line that swells from a hairline at the lit edge to a heavy stroke on the shadow edge.",
    params: "uMhInkThin/uMhInkThick: line width in pixels at the lit and shadow edge; uMhInkScale: frame height over 800.",
    uniforms: () => ({ uMhInkThin: { value: 1.0 }, uMhInkThick: { value: 2.8 }, uMhInkScale: { value: 1.0 } }),
    glsl: /* glsl */ `
uniform float uMhInkThin;
uniform float uMhInkThick;
uniform float uMhInkScale;
float mhInkW(float nlEdge) { return mix(uMhInkThin, uMhInkThick, smoothstep(0.3, -0.5, nlEdge)) * uMhInkScale; }
float mhInkHull(float d, float nlEdge) { return mhFill(d) - mhFill(d + mhInkW(nlEdge) * max(fwidth(d), 1e-4)); }
vec3 mhInkLine(vec2 p, float t) {
  ${BG}
  vec2 c = vec2(0.8, 0.5); float d = length(p - c) - 0.3;
  float nlE = dot(normalize(p - c + 1e-4), normalize(${LDIR}).xy);
  vec3 body = mix(MH_COAT * 0.55, MH_COAT, mhAA(mhNdL(p, c, 0.3, ${LDIR}), -0.04));
  return mhOut(mix(mix(bg, body, mhFill(d)), MH_INK * 1.3, clamp(mhInkHull(d, nlE), 0.0, 1.0)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhInkLine(p, t); }`,
  }),

  M({
    name: "mhFurNotch", suits: ["p-nerve", "pr-topograph-432"], use: "surface",
    doc: "Seal fur shade: the cel terminator is cut into short saw teeth so the shade edge reads as fur, not as a plastic split.",
    draws: "A pale-blue seal-coat sphere whose shadow edge is a row of small hard teeth, with a cooler dorsal shade below it.",
    params: "uMhFurTeeth: teeth across the sphere; uMhFurDepth: how far each tooth bites into the lit side (N.L units).",
    uniforms: () => ({ uMhFurTeeth: { value: 14.0 }, uMhFurDepth: { value: 0.16 } }),
    glsl: /* glsl */ `
uniform float uMhFurTeeth;
uniform float uMhFurDepth;
float mhFurNl(float nl, vec2 q, vec2 ldir) {
  float s = abs(fract(dot(q, vec2(-ldir.y, ldir.x)) * uMhFurTeeth) - 0.5) * 2.0;
  return nl + uMhFurDepth * (s - 0.5);
}
vec3 mhFurNotch(vec2 p, float t) {
  ${BG}
  vec2 c = vec2(0.8, 0.5); float r = 0.32;
  float nl = mhFurNl(mhNdL(p, c, r, ${LDIR}), (p - c) / r, normalize(${LDIR}).xy);
  vec3 coat = vec3(0.827, 0.886, 0.945);
  vec3 col = mix(vec3(0.247, 0.318, 0.369), coat, mhAA(nl, 0.0));
  col = mix(col, MH_COAT * 0.75, (1.0 - mhAA((p.y - c.y) / r, -0.25)) * mhAA(nl, 0.0));
  return mhOut(mix(bg, col, mhFill(length(p - c) - r)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhFurNotch(p, t); }`,
  }),

  M({
    name: "mhEyeRing", suits: SUITS, use: "card",
    doc: "Madhouse eye: pale sclera, dark lens inside a hard ring 1.4x the lens, a dot pupil, one catchlight, a hard upper lid.",
    draws: "A large round eye with a thick amber ring around a dark lens, a tiny pupil dot, one cream catchlight and a flat lid line across the top.",
    params: "uMhEyeRing: ring colour (amber by default, red at the kill); uMhEyeOpen: lid opening 0 closed to 1 open; uMhEyeLens: lens radius.",
    uniforms: () => ({ uMhEyeRing: { value: [0.659, 0.4, 0.165] }, uMhEyeOpen: { value: 1.0 }, uMhEyeLens: { value: 0.085 } }),
    glsl: /* glsl */ `
uniform vec3 uMhEyeRing;
uniform float uMhEyeOpen;
uniform float uMhEyeLens;
vec3 mhEyeRing(vec2 p, float t) {
  ${BG}
  vec2 c = vec2(0.8, 0.5); vec2 q = p - c; float R = uMhEyeLens * 1.4;
  float white = mhFill(length(q * vec2(0.8, 1.0)) - 0.2);
  vec3 col = mix(bg, vec3(0.851, 0.867, 0.835), white);
  col = mix(col, uMhEyeRing, mhFill(length(q) - R));
  col = mix(col, vec3(0.125, 0.137, 0.173), mhFill(length(q) - uMhEyeLens));
  col = mix(col, MH_INK * 1.5, mhFill(length(q) - uMhEyeLens * 0.32));
  col = mix(col, MH_CREAM, mhFill(length(q - vec2(-0.03, 0.035)) - 0.013));
  float lid = mhAA(c.y + (uMhEyeOpen * 2.0 - 1.0) * 0.2 - p.y, 0.0);
  col = mix(MH_DEEPV * 1.6, col, lid);
  col = mix(col, MH_INK * 1.4, mhLine(c.y + (uMhEyeOpen * 2.0 - 1.0) * 0.2 - p.y, 2.2) * white);
  return mhOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhEyeRing(p, t); }`,
  }),
];
