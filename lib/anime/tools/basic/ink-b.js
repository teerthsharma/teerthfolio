import { defineModule } from "./define.js";

export const INK_B = [
  defineModule({
    name: "inkJag", doc: "jagged clumps: noise along the rim breaks it into tapered hair tips",
    glsl: /* glsl */ `
  float inkJag(vec2 p, float px) {
    float ang = atan(p.y - 0.5, p.x - 0.72);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * clamp(bkVn(vec2(ang * 14.0, 2.0)) * 1.5 - 0.25, 0.0, 1.5) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkJag(p, 2.6)); }`,
  }),
  defineModule({
    name: "inkIsoRim", doc: "iso rim: constant-pixel line on a level set of the lighting field",
    glsl: /* glsl */ `
  float inkIsoRim(float f, float level, float px) {
    float w = fwidth(f) + 1e-6;
    return 1.0 - smoothstep(px * 0.5 - 0.5, px * 0.5 + 0.5, abs(f - level) / w); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), max(inkIsoRim(bkNdL(p), 0.5, 1.8), inkIsoRim(bkNdL(p), 0.72, 1.2)) * bkCover(p)); }`,
  }),
  defineModule({
    name: "inkBrush", doc: "brush pressure: width follows a slow hash, like a loaded nib",
    glsl: /* glsl */ `
  float inkBrush(vec2 p, float px) {
    float ang = atan(p.y - 0.5, p.x - 0.72);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * (0.4 + 0.8 * bkFbm(vec2(ang * 1.6, 0.4))) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkBrush(p, 2.3)); }`,
  }),
  defineModule({
    name: "inkDry", doc: "dry brush: the line skips where paper tooth is high",
    glsl: /* glsl */ `
  float inkDry(vec2 p, float px) {
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px + 1e-5;
    return (1.0 - smoothstep(0.0, w, abs(d))) * (1.0 - smoothstep(0.55, 0.72, bkFbm(p * 28.0))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.52, bkCel3(bkNdL(p)), bkCover(p)), inkDry(p, 2.4)); }`,
  }),
  defineModule({
    name: "inkFat", doc: "fat marker outline: a wide indigo plate around the hull",
    glsl: /* glsl */ `
  float inkFat(vec2 p, float px) {
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    return 1.0 - smoothstep(0.0, fwidth(d) * px + 1e-5, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkFat(p, 5.2)); }`,
  }),
  defineModule({
    name: "inkHairline", doc: "0.75px hairline: the thinnest legal contour, still AA'd",
    glsl: /* glsl */ `
  float inkHairline(vec2 p) {
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    return 1.0 - smoothstep(0.0, fwidth(d) * 0.75 + 1e-5, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkHairline(p)); }`,
  }),
  defineModule({
    name: "inkContact", doc: "contact line: a grounded occlusion stroke under the form",
    glsl: /* glsl */ `
  float inkContact(vec2 p, float px) {
    float y = p.y - (0.5 - sqrt(0.22));
    return (1.0 - smoothstep(0.0, fwidth(y) * px + 1e-5, abs(y))) * smoothstep(0.52, 0.08, abs(p.x - 0.72)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float d = abs(length(p - vec2(0.72, 0.5)) - sqrt(0.22));
    return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), max(inkContact(p, 2.4), (1.0 - smoothstep(0.0, fwidth(d) * 1.8, d)) * 0.7)); }`,
  }),
  defineModule({
    name: "inkRimKey", doc: "rim-as-ink: the back edge is a dark key, not a lit Fresnel",
    glsl: /* glsl */ `
  float inkRimKey(vec3 N, vec3 V) {
    float nv = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    float w = fwidth(nv) + 1e-4;
    return smoothstep(0.78 - w, 0.78 + w, nv) * (1.0 - bkAA(dot(N, normalize(vec3(-0.45, 0.55, 0.7))), 0.2)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkRimKey(bkSphereN(p), vec3(0.0, 0.1, 1.0)) * bkCover(p)); }`,
  }),
  defineModule({
    name: "inkSketch", doc: "overlapping sketch passes: three slightly offset holds, printed not jittered every frame",
    glsl: /* glsl */ `
  float inkSketch(vec2 p, float t, float px) {
    float hold = bkHold(t, 8.0), acc = 0.0;
    for (int i = 0; i < 3; i++) {
      vec2 j = (bkHash2(vec2(hold, float(i) * 5.1)) - 0.5) * 0.006;
      float d = length(p + j - vec2(0.72, 0.5)) - sqrt(0.22);
      acc = max(acc, 1.0 - smoothstep(0.0, fwidth(d) * px + 1e-5, abs(d)));
    }
    return acc * 0.72; }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.52, bkCel3(bkNdL(p)), bkCover(p)), inkSketch(p, t, 1.6)); }`,
  }),
  defineModule({
    name: "inkHold8", doc: "8fps hold jitter: threes, a heavier boil than the 12fps line",
    glsl: /* glsl */ `
  float inkHold8(vec2 p, float t, float px) {
    vec2 j = (bkHash2(vec2(bkHold(t, 8.0), 11.0)) - 0.5) * 0.01;
    float d = length(p + j - vec2(0.72, 0.5)) - sqrt(0.22);
    return 1.0 - smoothstep(0.0, fwidth(d) * px + 1e-5, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 q = p + (bkHash2(vec2(bkHold(t, 8.0), 11.0)) - 0.5) * 0.01;
    return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(q)), bkCover(q)), inkHold8(p, t, 2.1)); }`,
  }),
  defineModule({
    name: "inkSkip", doc: "skip-tooth: contour punched through by paper grain so it reads drawn on stock",
    glsl: /* glsl */ `
  float inkSkip(vec2 p, float px) {
    float g = bkVn(p * 36.0 + 2.0);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    return (1.0 - smoothstep(0.0, fwidth(d) * px * mix(0.4, 1.6, g) + 1e-5, abs(d))) * step(0.28, g); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.52, bkCel3(bkNdL(p)), bkCover(p)), inkSkip(p, 2.2)); }`,
  }),
  defineModule({
    name: "inkPressure", doc: "pressure envelope: a sine load along the stroke, thick belly thin ends",
    glsl: /* glsl */ `
  float inkPressure(vec2 p, float px) {
    float load = pow(abs(sin(atan(p.y - 0.5, p.x - 0.72) * 0.5 + 0.7)), 1.4);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    return 1.0 - smoothstep(0.0, fwidth(d) * px * mix(0.45, 2.8, load) + 1e-5, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkPressure(p, 2.0)); }`,
  }),
];
