// ufotable character kit: cel ramp, coloured line, contour fur clumps, eye.
import { defineUfo, H } from "./define.js";

const S = "pr-highway-3244, pr-polychrom-79";

export const CEL = [
  defineUfo("ufoCel3", {
    doc: "three-band cel at N.L -0.12 and 0.30, tones 0.58 / 0.80 / 1.0, shade shifted toward blue, light toward warm",
    draws: "A seal-blue sphere cut into a cool violet-tinted shade, a flat mid and a warm lit cap by two hard terminators.",
    use: "surface", suits: S,
    params: "base: local colour; ndl: signed N.L in -1..1, the two cuts sit at -0.12 and 0.30 with one-pixel width.",
    glsl: `vec3 ufoCel3(vec3 base, float ndl) {
  vec3 shade = base * vec3(0.50, 0.54, 0.70);
  vec3 lit = base * vec3(1.03, 1.00, 0.94);
  return mix(mix(shade, base * 0.80, ufoAA(ndl, -0.12)), lit, ufoAA(ndl, 0.30));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.34;
  float ndl = dot(ufoSphN(q), normalize(vec3(0.55 + 0.3 * sin(t), 0.5, 0.6)));
  return ufoOut(mix(UFO_NIGHT_LOW, ufoCel3(${H("#86aad6")}, ndl), ufoFill(length(q) - 1.0)));
}`,
  }),

  defineUfo("ufoInk", {
    doc: "coloured line: local colour x 0.32 floored at ink, 3.0 px outer contour, 1.4 px inner, +60 percent on the shadow side",
    draws: "A thin dark-blue outline round a cel sphere, heavier on the shadowed flank, with one lighter inner crease.",
    use: "line", suits: S, deps: ["ufoCel3"],
    params: "col: colour under the line; local: colour the line is derived from; d: signed distance to the stroke centre in uv; inner: 0 outer contour, 1 interior; shadow: 0..1 on the shadow side.",
    glsl: `vec3 ufoLineCol(vec3 local) { return max(local * 0.32, UFO_INK); }
vec3 ufoInk(vec3 col, vec3 local, float d, float inner, float shadow) {
  return mix(col, ufoLineCol(local), ufoStroke(d, mix(3.0, 1.4, inner) * (1.0 + 0.6 * shadow)));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.34;
  float ndl = dot(ufoSphN(q), normalize(vec3(0.55, 0.5, 0.6)));
  vec3 base = ${H("#86aad6")};
  vec3 c = mix(UFO_NIGHT_LOW, ufoCel3(base, ndl), ufoFill(length(q) - 1.0));
  float sh = 1.0 - ufoAA(ndl, 0.30);
  c = ufoInk(c, base, (length(q) - 1.0) * 0.34, 0.0, sh);
  return ufoOut(ufoInk(c, base, dot(q, vec2(0.6, 0.8)) * 0.34 + 0.05, 1.0, sh));
}`,
  }),

  defineUfo("ufoFur", {
    doc: "fur as tapered contour clumps leaning off an SDF edge, each 0.01 to 0.04 H, redrawn on twos",
    draws: "Hard pointed fur tufts fringe the outer edge of a round seal body, each leaning its own way and jumping every second frame.",
    use: "line", suits: S,
    params: "d: signed distance outside the body (>0 outside); ang: atan angle round the body centre; n: clump count, integer; len: longest clump length in d units; t: seconds, held to twos.",
    glsl: `float ufoFur(float d, float ang, float n, float len, float t) {
  float x = (ang / 6.2831853 + 0.5) * n;
  float cell = floor(x);
  float h = ufoH(vec2(cell, 3.7));
  float L = len * (0.3 + 0.7 * h);
  float lean = (h - 0.5) * 0.8 + 0.15 * sin(cell + ufoHold(t, 12.0) * 2.0);
  float k = clamp(d / L, 0.0, 1.0);
  float v = abs(fract(x) - 0.5 - lean * k * 0.5) * 2.0;
  return ufoFill(v - (1.0 - k)) * ufoAA(d, -0.002) * (1.0 - ufoAA(d, L));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec2 q = (p - vec2(0.8, 0.5)) / 0.28;
  float d = length(q) - 1.0;
  vec3 body = ${H("#86aad6")};
  vec3 c = mix(UFO_NIGHT_LOW, body * 0.8, ufoFill(d));
  return ufoOut(mix(c, body * 0.45, ufoFur(d, atan(q.y, q.x), 36.0, 0.20, t)));
}`,
  }),

  defineUfo("ufoEye", {
    doc: "half-lidded eye: cream lens, iris with a lower band, slit pupil, a hard upper-left highlight plus a small second",
    draws: "A narrow smirking eye with a coloured iris, a dark slit pupil and two hard white catch-lights; it flips to a red iris on cue.",
    use: "card", suits: S,
    params: "q: eye-local coordinates, lens radius 1, y up; iris, irisLow: upper and lower-band iris colours; uUfoEyeHot: 0 normal, 1 red iris and red catch-light.",
    uni: { uUfoEyeHot: 0 },
    glsl: `vec4 ufoEye(vec2 q, vec3 iris, vec3 irisLow) {
  float lens = max(length(q / vec2(1.0, 0.62)) - 1.0, (q.y - 0.30 + 0.12 * q.x) * 0.6);
  float hot = uUfoEyeHot;
  vec3 ic = mix(mix(iris, irisLow, ufoAA(-q.y, 0.18)), ${H("#ff2a3a")}, hot);
  vec3 c = mix(${H("#f1e6cf")} * 0.92, ic, ufoFill(length(q - vec2(0.0, -0.02)) - 0.52));
  c = mix(c, UFO_INK, ufoFill(length(q / vec2(0.12, 0.46)) - 1.0));
  vec3 hl = mix(UFO_CORE, ${H("#ff2a3a")}, hot);
  c = mix(c, hl, max(ufoFill(length(q - vec2(-0.20, 0.14)) - 0.13), ufoFill(length(q - vec2(0.22, -0.20)) - 0.06)));
  return vec4(c, ufoFill(lens));
}`,
    demo: `vec3 demo(vec2 p, float t) {
  vec4 e = ufoEye((p - vec2(0.8, 0.5)) / 0.3, ${H("#d83a28")}, ${H("#7a0c09")});
  return ufoOut(mix(${H("#86aad6")} * 0.7, e.rgb, e.a));
}`,
  }),
];
