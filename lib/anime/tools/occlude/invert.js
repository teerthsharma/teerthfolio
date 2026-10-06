// Family 3 — invert family (15). Invert first, then remap so luma <= 0.92. Never leave 1.0 whites.
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const INVERT = [
  D("lumaSafeInvert", "luma-safe invert: 1-rgb then compress so luma <= 0.92",
    /* glsl */ `
  vec3 lumaSafeInvert(vec3 c) { return ocInvert(c); }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return lumaSafeInvert(ocPlate(p, t)); }`),

  D("rbSwapInvert", "JoJo-ish RB channel-swap then invert, then luma-cap (never raw 1-rgb whites)",
    /* glsl */ `
  vec3 rbSwapInvert(vec3 c) { return ocInvert(vec3(c.b, c.g, c.r)); }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return rbSwapInvert(ocPlate(p, t)); }`),

  D("posterInvert", "posterize then invert: floor to N bins, invert, luma-cap",
    /* glsl */ `
  vec3 posterInvert(vec3 c, float bins) {
    vec3 q = floor(c * bins + 0.5) / max(bins, 1.0);
    return ocInvert(q);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return posterInvert(ocPlate(p, t), 4.0); }`),

  D("solarize", "solarize: invert only where luma > hinge, then cap; keeps shadows",
    /* glsl */ `
  vec3 solarize(vec3 c, float hinge) {
    float L = ocLuma(c);
    return ocCap(mix(c, vec3(1.0) - c, step(hinge, L)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return solarize(ocPlate(p, t), 0.42 + 0.08 * sin(t)); }`),

  D("lumaOnlyInvert", "invert luma, keep chromaticity: Y' = 1-Y then recap, rgb scaled",
    /* glsl */ `
  vec3 lumaOnlyInvert(vec3 c) {
    float L = ocLuma(c);
    vec3 chroma = c / max(L, 1e-4);
    return ocCap(chroma * (1.0 - L));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return lumaOnlyInvert(ocPlate(p, t)); }`),

  D("midInvert", "invert the mids only: ends stay, a smooth-step window around 0.5 luma",
    /* glsl */ `
  vec3 midInvert(vec3 c, float w) {
    float L = ocLuma(c);
    float m = smoothstep(0.5 - w, 0.5, L) * (1.0 - smoothstep(0.5, 0.5 + w, L));
    return ocCap(mix(c, vec3(1.0) - c, m));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return midInvert(ocPlate(p, t), 0.22); }`),

  D("hueRotateInvert", "rotate hue 180 then invert value: complement wash, luma-capped",
    /* glsl */ `
  vec3 hueRotateInvert(vec3 c) {
    vec3 comp = vec3(c.g, c.b, c.r);
    return ocInvert(comp);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return hueRotateInvert(ocPlate(p, t)); }`),

  D("valueInvertKeepHue", "HSV-ish: invert value, keep rg/b ratios (hue), then cap",
    /* glsl */ `
  vec3 valueInvertKeepHue(vec3 c) {
    float mx = max(c.r, max(c.g, c.b));
    vec3 hue = c / max(mx, 1e-4);
    return ocCap(hue * (1.0 - mx));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return valueInvertKeepHue(ocPlate(p, t)); }`),

  D("channelRotateInvert", "RGB to GBR then invert and cap — a third JoJo-ish swap, not RB",
    /* glsl */ `
  vec3 channelRotateInvert(vec3 c) { return ocInvert(vec3(c.g, c.b, c.r)); }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return channelRotateInvert(ocPlate(p, t)); }`),

  D("softInvert", "partial invert: mix(c, 1-c, k) then cap, for a held-frame wash",
    /* glsl */ `
  vec3 softInvert(vec3 c, float k) { return ocCap(mix(c, vec3(1.0) - c, clamp(k, 0.0, 1.0))); }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return softInvert(ocPlate(p, t), 0.55 + 0.35 * sin(t)); }`),

  D("thresholdInvert", "hard two-tone: invert then threshold on luma, two inked swatches, no pure black",
    /* glsl */ `
  vec3 thresholdInvert(vec3 c, float cut, vec3 hi, vec3 lo) {
    vec3 inv = vec3(1.0) - c;
    return ocCap(mix(lo, hi, step(cut, ocLuma(inv))));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return thresholdInvert(ocPlate(p, t), 0.5, vec3(0.88, 0.78, 0.42), vec3(0.12, 0.08, 0.20)); }`),

  D("dualToneInvert", "invert, then map luma onto a two-stop grade (shadow/light), capped",
    /* glsl */ `
  vec3 dualToneInvert(vec3 c, vec3 shadow, vec3 light) {
    float L = ocLuma(vec3(1.0) - c);
    return ocCap(mix(shadow, light, L));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return dualToneInvert(ocPlate(p, t), vec3(0.14, 0.08, 0.28), vec3(0.86, 0.72, 0.38)); }`),

  D("invertThenGrade", "invert, cap, then a 3-stop gradient map on the inverted luma",
    /* glsl */ `
  vec3 invertThenGrade(vec3 c, vec3 a, vec3 b, vec3 d) {
    vec3 inv = ocInvert(c);
    float L = ocLuma(inv);
    return ocCap(L < 0.5 ? mix(a, b, L * 2.0) : mix(b, d, L * 2.0 - 1.0));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return invertThenGrade(ocPlate(p, t), vec3(0.12, 0.06, 0.22), vec3(0.62, 0.18, 0.42), vec3(0.86, 0.74, 0.40)); }`),

  D("invertEdgesOnly", "invert only on fwidth luma edges; interiors keep the plate",
    /* glsl */ `
  vec3 invertEdgesOnly(vec3 c) {
    float L = ocLuma(c);
    float e = smoothstep(0.02, 0.12, fwidth(L) * 18.0);
    return ocCap(mix(c, vec3(1.0) - c, e));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return invertEdgesOnly(ocPlate(p, t)); }`),

  D("invertOutsideSeal", "luma-safe invert everywhere except an ellipse hole (hero keeps locked colour)",
    /* glsl */ `
  vec3 invertOutsideSeal(vec2 p, vec3 c, vec2 seat, vec2 rad) {
    float m = ocAA(ocEllipse(p, seat, rad));
    return mix(ocInvert(c), c, m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return invertOutsideSeal(p, ocPlate(p, t), vec2(0.72, 0.40), vec2(0.20, 0.26)); }`),
];
