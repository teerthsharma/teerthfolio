// Madhouse screen shaders: TV iris with 2.39:1 letterbox, and the studio grade (split tone, twos grain, cap, ink lift).
import { defineModule as M, SUITS } from "./define.js";

export const SCREEN = [
  M({
    name: "mhIris", suits: SUITS, use: "screen",
    doc: "Madhouse TV iris: a circle that opens from a point in twos, a 3 px ink ring at its edge, and the 2.39:1 letterbox bars in studio ink.",
    draws: "The picture opening from a small round hole into the full frame, held by thick ink bars top and bottom, with a thin ring at the iris edge.",
    params: "uMhIrisAt: iris centre; uMhIrisK: opening progress 0 closed to 1 open (stepped to 11 drawings); uMhIrisBars: bar height as a fraction of frame height.",
    uniforms: () => ({ uMhIrisAt: { value: [0.8, 0.5] }, uMhIrisK: { value: 0.5 }, uMhIrisBars: { value: 0.1655 } }),
    glsl: /* glsl */ `
uniform vec2 uMhIrisAt;
uniform float uMhIrisK;
uniform float uMhIrisBars;
vec3 mhIrisOver(vec3 c, vec2 p) {
  float k = floor(clamp(uMhIrisK, 0.0, 1.0) * 11.0 + 0.5) / 11.0;
  float d = length(p - uMhIrisAt) - k * 1.75;
  c = mix(MH_INK, c, mhFill(d));
  c = mix(c, MH_INK * 1.5, mhLine(d, 3.0) * step(0.001, k) * (1.0 - step(0.999, k)));
  return mix(MH_INK, c, mhAA(p.y, uMhIrisBars) * mhAA(1.0 - p.y, uMhIrisBars));
}
vec3 mhIris(vec2 p, float t) {
  vec3 pic = mix(MH_DEEPV * 2.2, MH_COAT * 0.7, smoothstep(0.1, 0.9, p.y)) * (0.8 + 0.2 * sin(p.x * 9.0));
  return mhOut(mhIrisOver(pic, p));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhIris(p, t); }`,
  }),

  M({
    name: "mhGradeInk", suits: SUITS, use: "grade",
    doc: "Madhouse final grade: cold split tone weighted by luma, silver grain stepped on twos, then the 0.92 cap and the ink-floor lift.",
    draws: "The whole frame tinted blue-violet in the shadows and grey-lilac in the lights, with fine grain that jumps twelve times a second and no pure black or blown white.",
    params: "uMhGradeLo/uMhGradeHi: shadow and highlight tints; uMhGradeMix: tint strength; uMhGradeGrain: grain amplitude.",
    uniforms: () => ({ uMhGradeLo: { value: [0.086, 0.094, 0.133] }, uMhGradeHi: { value: [0.314, 0.325, 0.404] }, uMhGradeMix: { value: 0.2 }, uMhGradeGrain: { value: 0.025 } }),
    glsl: /* glsl */ `
uniform vec3 uMhGradeLo;
uniform vec3 uMhGradeHi;
uniform float uMhGradeMix;
uniform float uMhGradeGrain;
vec3 mhGrade(vec3 c, vec2 p, float t) {
  c = mix(c, mix(uMhGradeLo, uMhGradeHi, smoothstep(0.2, 0.8, mhLuma(c))), uMhGradeMix);
  float g = mhH21(floor(p * 900.0) + mhHold(t, 12.0) * 31.0) - 0.5;
  return mhOut(c * (1.0 + g * uMhGradeGrain * 2.0));
}
vec3 mhGradeInk(vec2 p, float t) {
  vec3 c = mix(vec3(0.02), vec3(1.2, 1.1, 1.0), smoothstep(0.0, 1.0, p.x * 0.6 + p.y * 0.4));
  c = mix(c, vec3(1.3), mhFill(length(p - vec2(0.55, 0.62)) - 0.12));
  return mhGrade(c, p, t);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mhGradeInk(p, t); }`,
  }),
];
