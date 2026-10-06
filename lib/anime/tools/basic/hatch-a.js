import { defineModule } from "./define.js";

export const HATCH_A = [
  defineModule({
    name: "hatchDiag", doc: "diagonal screen hatch in shadow only, printed stroke not noise",
    glsl: /* glsl */ `
  vec3 hatchDiag(vec3 col, vec2 fc, float shadow, float ts) {
    float stroke = 1.0 - smoothstep(0.48, 0.56, abs(fract((fc.x + fc.y) / ts) - 0.5) * 2.0);
    return mix(col, BK_INK, stroke * bkAA(shadow, 0.35) * 0.72); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchDiag(bkCel3(h), gl_FragCoord.xy, 1.0 - h, 7.0), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchCross", doc: "two-weight cross-hatch: one direction in mid-shadow, both in the core",
    glsl: /* glsl */ `
  vec3 hatchCross(vec3 col, vec2 fc, float s, float ts) {
    float a = 1.0 - smoothstep(0.42, 0.58, abs(fract((fc.x + fc.y) / ts) - 0.5) * 2.0);
    float b = 1.0 - smoothstep(0.42, 0.58, abs(fract((fc.x - fc.y) / ts) - 0.5) * 2.0);
    return mix(col, BK_INK, max(a * bkAA(s, 0.32), b * bkAA(s, 0.72)) * 0.78); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchCross(bkCel3(h), gl_FragCoord.xy, 1.0 - h, 8.0), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchAraki", doc: "Araki speed-shadow: thick parallel bands in the core, tapering, high contrast",
    glsl: /* glsl */ `
  vec3 hatchAraki(vec3 col, vec2 p, float s) {
    vec2 q = mat2(0.92, -0.38, 0.38, 0.92) * (p - vec2(0.72, 0.5));
    float band = abs(sin(q.x * 38.0 + q.y * 2.0));
    float ink = (1.0 - smoothstep(0.22 - fwidth(band), 0.22 + fwidth(band), band)) * smoothstep(0.55, 0.05, abs(q.y * 2.2)) * bkAA(s, 0.28);
    return mix(col, BK_INK, ink); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.5, hatchAraki(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchStipple", doc: "stipple / toner dots: Ben-Day discs in shadow, AA'd, printed scale",
    glsl: /* glsl */ `
  vec3 hatchStipple(vec3 col, vec2 p, float s) {
    return mix(col, BK_INK, bkToner(p, mix(0.15, 0.7, clamp(s, 0.0, 1.0))) * bkAA(s, 0.2) * 0.85); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchStipple(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchToneWin", doc: "screentone window: a hard oval of toner over the house cel",
    glsl: /* glsl */ `
  vec3 hatchToneWin(vec3 col, vec2 p, vec2 c, vec2 r) {
    float d = length((p - c) / r) - 1.0;
    return mix(col, mix(col, BK_INK, bkToner(p, 0.55)), (1.0 - smoothstep(-fwidth(d), fwidth(d), d)) * 0.8); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return hatchToneWin(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), p, vec2(0.72, 0.48), vec2(0.28, 0.22)); }`,
  }),
  defineModule({
    name: "hatchFine", doc: "fine 60-ish lpi hatch, shadow only, tight printed pitch",
    glsl: /* glsl */ `
  vec3 hatchFine(vec3 col, vec2 fc, float s) {
    float stroke = 1.0 - smoothstep(0.36, 0.5, abs(fract((fc.x + fc.y) / 4.2) - 0.5) * 2.0);
    return mix(col, BK_INK, stroke * bkAA(s, 0.4) * 0.65); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchFine(bkCel3(h), gl_FragCoord.xy, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchCoarse", doc: "coarse 20-ish lpi hatch: fat printed bars in deep shadow",
    glsl: /* glsl */ `
  vec3 hatchCoarse(vec3 col, vec2 fc, float s) {
    float stroke = 1.0 - smoothstep(0.28, 0.48, abs(fract((fc.x + fc.y) / 14.0) - 0.5) * 2.0);
    return mix(col, BK_INK, stroke * bkAA(s, 0.55) * 0.8); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchCoarse(bkCel3(h), gl_FragCoord.xy, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchWeave", doc: "screen weave: two rotated grids beating, a printed rosette not CGI noise",
    glsl: /* glsl */ `
  vec3 hatchWeave(vec3 col, vec2 p, float s) {
    vec2 a = mat2(0.866, -0.5, 0.5, 0.866) * p * 36.0, b = mat2(0.866, 0.5, -0.5, 0.866) * p * 36.0;
    float ga = 1.0 - smoothstep(0.12, 0.2, min(abs(fract(a.x) - 0.5), abs(fract(a.y) - 0.5)));
    float gb = 1.0 - smoothstep(0.12, 0.2, min(abs(fract(b.x) - 0.5), abs(fract(b.y) - 0.5)));
    return mix(col, BK_INK, max(ga, gb) * bkAA(s, 0.3) * 0.55); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchWeave(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchContour", doc: "contour-following hatch: strokes run around the sphere, not screen-locked",
    glsl: /* glsl */ `
  vec3 hatchContour(vec3 col, vec2 p, float s) {
    float u = fract(atan(p.y - 0.5, p.x - 0.72) * 9.0 + length(p - vec2(0.72, 0.5)) * 2.0);
    return mix(col, BK_INK, (1.0 - smoothstep(0.34, 0.5, abs(u - 0.5) * 2.0)) * bkAA(s, 0.34) * 0.7); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchContour(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchScribble", doc: "scribble fill: short offset strokes, still a printed mass",
    glsl: /* glsl */ `
  vec3 hatchScribble(vec3 col, vec2 p, float s) {
    vec2 i = floor(p * 28.0), o = bkHash2(i) - 0.5;
    float u = fract(dot(p * 28.0 - i - o, normalize(vec2(1.0, 0.55 + o.x))));
    return mix(col, BK_INK, (1.0 - smoothstep(0.3, 0.5, abs(u - 0.5) * 2.0)) * bkAA(s, 0.38) * 0.68); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchScribble(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchDot60", doc: "60% Ben-Day: large toner discs, a mid-grey plate",
    glsl: /* glsl */ `
  vec3 hatchDot60(vec3 col, vec2 p) { return mix(col, BK_INK, bkToner(p, 0.62) * 0.8); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.58, hatchDot60(bkCel3(bkNdL(p)), p), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchDot30", doc: "30% Ben-Day: sparse toner, a light printed grey",
    glsl: /* glsl */ `
  vec3 hatchDot30(vec3 col, vec2 p) { return mix(col, BK_INK, bkToner(p, 0.28) * 0.7); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.6, hatchDot30(bkCel3(bkNdL(p)), p), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchGrad", doc: "tone gradient dots: disc radius follows shadow amount",
    glsl: /* glsl */ `
  vec3 hatchGrad(vec3 col, vec2 p, float s) { return mix(col, BK_INK, bkToner(p, clamp(s, 0.05, 0.85)) * 0.82); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchGrad(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
];
