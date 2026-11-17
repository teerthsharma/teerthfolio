// Shonen cast shaders: hue-shifted three-step cel with bounce band, angle-weighted ink hull, spike hair clumps, bold-lid eye.
import { defineModule as M, SUITS } from "./define.js";

export const SURFACE = [
  M({
    name: "shoRamp", suits: SUITS, use: "surface",
    doc: "Shonen cel ramp: lit, hue-shifted shade and deep shade in three flat steps, with a lifted bounce band on the far rim.",
    draws: "A blue-grey sphere in three flat tones, the shade slid toward violet or rose, and a thin lighter bounce band along the lower-right rim inside the deep shade.",
    params: "uShoRampT1/uShoRampT2: N.L thresholds of the two steps; uShoWarm: shade hue from -1 cold violet to +1 warm rose; uShoBounce: strength of the rim bounce band.",
    uniforms: () => ({ uShoRampT1: { value: 0.3 }, uShoRampT2: { value: -0.15 }, uShoWarm: { value: 0.6 }, uShoBounce: { value: 0.8 } }),
    glsl: /* glsl */ `
uniform float uShoRampT1;
uniform float uShoRampT2;
uniform float uShoWarm;
uniform float uShoBounce;
vec3 shoRampC(float nl, float edge, vec3 lit) {
  vec3 tint = mix(vec3(0.10, 0.12, 0.36), vec3(0.42, 0.12, 0.16), uShoWarm * 0.5 + 0.5);
  vec3 sh = lit * 0.64 + tint * 0.38;
  vec3 deep = lit * 0.38 + tint * 0.5;
  float bounce = (1.0 - shoAA(nl, uShoRampT2)) * shoAA(edge, 0.62) * uShoBounce;
  deep = mix(deep, sh * 1.12 + vec3(0.0, 0.02, 0.06), bounce);
  return mix(mix(deep, sh, shoAA(nl, uShoRampT2)), lit, shoAA(nl, uShoRampT1));
}
vec3 shoRamp(vec2 p, float t) {
  vec2 c = vec2(0.8, 0.5);
  vec2 q = (p - c) / 0.32;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  float nl = dot(normalize(vec3(q, z + 1e-4)), normalize(vec3(-0.5, 0.6, 0.62)));
  return shoOut(mix(shoDemoBg(p), shoRampC(nl, 1.0 - z, SHO_COAT), shoFill(length(p - c) - 0.32)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoRamp(p, t); }`,
  }),

  M({
    name: "shoHull", suits: SUITS, use: "line",
    doc: "Shonen energetic hull line: contour width swings with the angle to the light, thick on the shade side, and re-rolls each drawing on twos.",
    draws: "A lumpy blue-grey blob with a dark ink outline that is hair-thin on the lit upper left and heavy on the lower right, its width shivering slightly every other frame.",
    params: "uShoHullW: base width of the contour in frame height; uShoHullAng: angle of the light in radians (the thin side faces it).",
    uniforms: () => ({ uShoHullW: { value: 0.014 }, uShoHullAng: { value: 2.3 } }),
    glsl: /* glsl */ `
uniform float uShoHullW;
uniform float uShoHullAng;
float shoHullBand(float d, float ang, float t) {
  float k = 0.5 + 0.5 * cos(ang - uShoHullAng);
  float w = uShoHullW * (0.45 + 1.2 * (1.0 - k));
  w *= 0.85 + 0.3 * shoH21(vec2(floor(ang * 5.0), floor(t * 12.0)));
  return shoFill(d) * (1.0 - shoAA(-d, w));
}
vec3 shoHull(vec2 p, float t) {
  vec2 q = p - vec2(0.8, 0.5);
  float ang = atan(q.y, q.x + 1e-5);
  float d = (length(q / vec2(0.34, 0.26)) - 1.0) * 0.26 + 0.016 * sin(ang * 3.0 + 1.0);
  vec3 fill = mix(SHO_COAT * 0.62, SHO_COAT, shoAA(dot(normalize(q + 1e-5), vec2(-0.7, 0.7)), -0.15));
  vec3 col = mix(shoDemoBg(p), fill, shoFill(d));
  return shoOut(mix(col, SHO_INK, shoHullBand(d, ang, t)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoHull(p, t); }`,
  }),

  M({
    name: "shoHair", suits: SUITS, use: "surface",
    doc: "Shonen spike hair: seven tapered clumps fanned up from the crown, each with a cut highlight sliver on its lit edge and a hard shade edge.",
    draws: "A round head topped by seven sharp upright hair spikes, each with a bright sliver down its left side and a darker right side, outlined in ink.",
    params: "uShoHairFan: how wide the spikes fan in radians; uShoHairLen: spike length in frame height; uShoHairLit: 0 black hair to 1 silver; uShoHairHi: strength of the cut highlight.",
    uniforms: () => ({ uShoHairFan: { value: 0.85 }, uShoHairLen: { value: 0.32 }, uShoHairLit: { value: 1.0 }, uShoHairHi: { value: 1.0 } }),
    glsl: /* glsl */ `
uniform float uShoHairFan;
uniform float uShoHairLen;
uniform float uShoHairLit;
uniform float uShoHairHi;
vec3 shoHair(vec2 p, float t) {
  vec2 c = vec2(0.8, 0.4);
  float hd = length((p - c) / vec2(0.26, 0.24)) - 1.0;
  vec3 head = mix(SHO_COAT * 0.62, SHO_COAT, shoAA(dot(normalize(p - c + 1e-5), vec2(-0.6, 0.8)), -0.1));
  vec3 col = mix(shoDemoBg(p), head, shoFill(hd));
  col = mix(col, SHO_INK, shoLine(hd, 2.5));
  vec3 lit = mix(vec3(0.20, 0.16, 0.14), vec3(0.875, 0.91, 0.973), uShoHairLit);
  vec3 sh = mix(vec3(0.09, 0.06, 0.05), vec3(0.659, 0.722, 0.847), uShoHairLit);
  float best = 1e3;
  float relB = 0.0;
  float sB = 0.0;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float a = 1.5708 + (fk / 6.0 - 0.5) * 2.0 * uShoHairFan;
    float L = uShoHairLen * (0.75 + 0.5 * shoH21(vec2(fk, 3.0)));
    vec2 dir = vec2(cos(a), sin(a));
    vec2 q = p - (c + dir * 0.17);
    float s = dot(q, dir) / L;
    float v = dot(q, vec2(-dir.y, dir.x));
    float w = 0.075 * (1.0 - clamp(s, 0.0, 1.0));
    float d = max(abs(v) - w, max(-s, s - 1.0) * L);
    if (d < best) { best = d; relB = v / max(w, 1e-3); sB = s; }
  }
  float inside = shoFill(best);
  float hi = shoAA(-relB, 0.45) * (1.0 - shoAA(-relB, 0.85)) * shoAA(sB, 0.12) * (1.0 - shoAA(sB, 0.75)) * uShoHairHi;
  vec3 hair = mix(lit, sh, shoAA(relB, 0.35));
  hair = mix(hair, lit * 1.35 + 0.04, hi);
  col = mix(col, hair, inside);
  col = mix(col, SHO_INK, inside * (1.0 - shoAA(-best, 0.007)));
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoHair(p, t); }`,
  }),

  M({
    name: "shoEye", suits: SUITS, use: "surface",
    doc: "Shonen eye: round sclera, bold ink upper lid, two-step iris with a lighter lower crescent, one big catchlight and one small.",
    draws: "A pair of large round cream eyes with a heavy slanted dark upper lid, a dark or silver iris in two steps, and two white catchlights, the big one upper left.",
    params: "uShoEyeOpen: lid opening 0 shut to 1 open; uShoEyeIris: 0 dark iris with pupil to 1 silver pupil-less iris; uShoEyeTilt: lid slant, positive for a calm drop, negative for an angry brow.",
    uniforms: () => ({ uShoEyeOpen: { value: 1.0 }, uShoEyeIris: { value: 0.0 }, uShoEyeTilt: { value: 0.12 } }),
    glsl: /* glsl */ `
uniform float uShoEyeOpen;
uniform float uShoEyeIris;
uniform float uShoEyeTilt;
vec3 shoEye(vec2 p, float t) {
  vec2 c = vec2(0.8, 0.5);
  float sd = step(0.0, p.x - c.x) * 2.0 - 1.0;
  vec2 e = p - vec2(c.x + sd * 0.25, c.y);
  float R = 0.15;
  float open = clamp(uShoEyeOpen, 0.0, 1.0);
  float ds = length(e / vec2(R, R * 1.12)) - 1.0;
  float lidY = R * (0.95 - 1.5 * (1.0 - open)) - sd * e.x * uShoEyeTilt * 1.5;
  float u = e.y - lidY;
  float vis = shoFill(ds) * (1.0 - shoAA(u, 0.0));
  vec3 col = mix(shoDemoBg(p), vec3(0.93, 0.89, 0.82) * 0.97, shoFill(ds + 0.02));
  vec3 irisHi = mix(vec3(0.125, 0.137, 0.173), vec3(0.784, 0.816, 0.878), uShoEyeIris);
  vec3 irisLo = mix(vec3(0.22, 0.25, 0.32), vec3(0.659, 0.722, 0.847), uShoEyeIris);
  float iris = shoFill(length(e - vec2(0.0, -0.012)) - R * 0.72);
  vec3 ic = mix(irisHi, irisLo, shoAA(-e.y, 0.01));
  float pup = shoFill(length(e - vec2(0.0, -0.012)) - R * 0.3) * (1.0 - uShoEyeIris);
  col = mix(col, ic, iris * vis);
  col = mix(col, SHO_INK, pup * vis);
  col = mix(col, vec3(0.92), shoFill(length(e - vec2(-0.034, 0.036)) - 0.026) * vis);
  col = mix(col, vec3(0.9), shoFill(length(e - vec2(0.03, -0.036)) - 0.012) * vis);
  float lid = shoFill(ds - 0.1) * shoAA(u, -0.014) * (1.0 - shoAA(u, 0.02));
  col = mix(col, SHO_INK, max(lid, shoLine(ds, 2.0) * (1.0 - shoAA(u, 0.0))));
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoEye(p, t); }`,
  }),
];
