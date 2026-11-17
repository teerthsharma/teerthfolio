// Shonen plates and grade: four-band sky with flat clouds, dry-brush paper grain, posterised luma grade.
import { defineModule as M, SUITS } from "./define.js";

export const PLATE = [
  M({
    name: "shoSkyBands", suits: SUITS, use: "plate",
    doc: "Shonen sky plate: four flat colour bands from horizon to zenith with cel clouds cut to a lit top and a shade underside, day to dusk by one dial.",
    draws: "A sky in four hard horizontal bands of blue, deeper toward the top, with cream clouds that have a blue-grey shaded underside, or the same in violet and orange at dusk.",
    params: "uShoSkyHor: height of the horizon line; uShoSkyCloud: cloud cover 0 to 1; uShoSkyDusk: 0 day blue to 1 dusk violet and orange.",
    uniforms: () => ({ uShoSkyHor: { value: 0.28 }, uShoSkyCloud: { value: 0.35 }, uShoSkyDusk: { value: 0.0 } }),
    glsl: /* glsl */ `
uniform float uShoSkyHor;
uniform float uShoSkyCloud;
uniform float uShoSkyDusk;
float shoSkyF(vec2 p, float dr, float h) {
  return shoFbm(vec2(p.x * 1.6 + dr, p.y * 5.0)) + 0.25 * (0.5 - h);
}
vec3 shoSkyBands(vec2 p, float t) {
  float h = clamp((p.y - uShoSkyHor) / max(1.0 - uShoSkyHor, 1e-3), 0.0, 0.999);
  vec3 zen = mix(vec3(0.247, 0.498, 0.816), vec3(0.353, 0.247, 0.604), uShoSkyDusk);
  vec3 hor = mix(vec3(0.749, 0.886, 0.965), vec3(0.949, 0.627, 0.353), uShoSkyDusk);
  vec3 col = mix(hor, zen, floor(h * 4.0) / 3.0);
  float dr = shoTwos(t) * 0.02;
  float thr = 0.9 - 0.55 * uShoSkyCloud;
  float m = shoAA(shoSkyF(p, dr, h), thr) * step(uShoSkyHor, p.y);
  float below = shoAA(shoSkyF(p - vec2(0.0, 0.035), dr, h), thr);
  vec3 cl = mix(vec3(0.90, 0.93, 0.97), vec3(0.98, 0.82, 0.68), uShoSkyDusk);
  vec3 cs = mix(vec3(0.62, 0.70, 0.84), vec3(0.66, 0.48, 0.62), uShoSkyDusk);
  col = mix(col, cl, m);
  col = mix(col, cs, m * (1.0 - below));
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoSkyBands(p, t); }`,
  }),

  M({
    name: "shoBrushGrain", suits: SUITS, use: "noise",
    doc: "Shonen painted-plate texture: horizontal dry-brush stroke bands lighter and darker in hard steps, pale dry-brush flecks, and grain that changes only on twos.",
    draws: "A flat teal-grey plate crossed by faint horizontal brush strokes, some a touch lighter or darker, a few pale dry-brush flecks and fine grain that shifts every other frame.",
    params: "uShoBrushAmt: strength of the strokes, flecks and grain, 0 clean to 1 full.",
    uniforms: () => ({ uShoBrushAmt: { value: 1.0 } }),
    glsl: /* glsl */ `
uniform float uShoBrushAmt;
vec3 shoBrushGrain(vec2 p, float t, vec3 base) {
  float T = shoTwos(t);
  float st = shoVn(vec2(p.x * 2.5, p.y * 140.0)) * 0.6 + shoVn(vec2(p.x * 9.0 + 3.0, p.y * 55.0)) * 0.4;
  vec3 c = base * (1.0 + uShoBrushAmt * (0.07 * shoAA(st, 0.66) - 0.08 * (1.0 - shoAA(st, 0.34))));
  float dry = shoAA(shoVn(vec2(p.x * 5.0, p.y * 220.0)), 0.88) * shoAA(shoFbm(p * 3.0), 0.55);
  c = mix(c, c * 1.18 + 0.03, dry * uShoBrushAmt);
  c += (shoH21(floor(p * 420.0) + T * 13.0) - 0.5) * 0.04 * uShoBrushAmt;
  return shoOut(c);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoBrushGrain(p, t, mix(vec3(0.20, 0.34, 0.40), vec3(0.28, 0.42, 0.50), shoAA(p.y, 0.5))); }`,
  }),

  M({
    name: "shoGradePoster", suits: SUITS, use: "grade",
    doc: "Shonen posterised grade: luma snapped to a few flat levels, shadows cooled toward violet and highs warmed, saturation pushed, luma cap and ink lift last.",
    draws: "The whole frame cut into a few flat brightness levels like cel paint, with cool violet shadows, warm clean highlights and richer colour, and no pixel black.",
    params: "uShoGradeLevels: number of luma levels; uShoGradeMix: 0 untouched to 1 fully posterised; uShoGradeSat: saturation, 1 unchanged; uShoGradeSplit: strength of the cool shadow and warm highlight tone.",
    uniforms: () => ({ uShoGradeLevels: { value: 5 }, uShoGradeMix: { value: 1.0 }, uShoGradeSat: { value: 1.1 }, uShoGradeSplit: { value: 0.6 } }),
    glsl: /* glsl */ `
uniform float uShoGradeLevels;
uniform float uShoGradeMix;
uniform float uShoGradeSat;
uniform float uShoGradeSplit;
vec3 shoGradePoster(vec2 p, float t, vec3 col) {
  float y = shoLuma(col);
  float n = max(uShoGradeLevels, 2.0);
  float yq = (floor(clamp(y, 0.0, 0.999) * n) + 0.5) / n;
  vec3 c = mix(col, col * (yq / max(y, 1e-3)), uShoGradeMix);
  float lq = shoLuma(c);
  c = mix(vec3(lq), c, uShoGradeSat);
  vec3 sh = c * vec3(0.86, 0.88, 1.12);
  vec3 hi = c * vec3(1.06, 1.02, 0.94);
  vec3 toned = mix(mix(sh, c, smoothstep(0.1, 0.45, lq)), hi, smoothstep(0.55, 0.9, lq));
  return shoOut(mix(c, toned, uShoGradeSplit));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float v = 0.5 + 0.5 * sin(p.x * 4.0) * sin(p.y * 5.0 + t); return shoGradePoster(p, t, mix(vec3(0.15, 0.2, 0.5), vec3(1.0, 0.7, 0.3), v) * (0.3 + 0.7 * p.y)); }`,
  }),
];
