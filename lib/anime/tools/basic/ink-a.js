import { defineModule } from "./define.js";

export const INK_A = [
  defineModule({
    name: "inkHull", doc: "inverted hull outline: a constant-pixel silhouette ring in indigo, never #000",
    glsl: /* glsl */ `
  float inkHull(vec2 p, float px) {
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 c = mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)); return bkMixInk(c, inkHull(p, 2.2)); }`,
  }),
  defineModule({
    name: "inkSobel", doc: "sobel / luma screen edge from neighboring lighting samples, fwidth-scaled taps",
    glsl: /* glsl */ `
  float inkSobel(vec2 p) {
    float e = max(fwidth(p.x), fwidth(p.y)) * 1.4;
    float gx = bkLuma(bkCel3(bkNdL(p + vec2(e, 0.0)))) - bkLuma(bkCel3(bkNdL(p - vec2(e, 0.0))));
    float gy = bkLuma(bkCel3(bkNdL(p + vec2(0.0, e)))) - bkLuma(bkCel3(bkNdL(p - vec2(0.0, e))));
    return smoothstep(0.06, 0.16, length(vec2(gx, gy))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkSobel(p)); }`,
  }),
  defineModule({
    name: "inkQuill", doc: "concave quill: line weight grows where the lighting field bends in",
    glsl: /* glsl */ `
  float inkQuill(vec2 p, float px) {
    float bend = fwidth(fwidth(bkNdL(p))) * 80.0;
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * mix(0.7, 2.6, clamp(bend, 0.0, 1.0)) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkQuill(p, 1.8)); }`,
  }),
  defineModule({
    name: "inkBoil", doc: "12fps line boil: hashed silhouette jitter held on stepped time",
    glsl: /* glsl */ `
  vec2 inkBoilP(vec2 p, float t) { return p + (bkHash2(vec2(bkHold(t, 12.0), 4.7)) - 0.5) * 0.007; }
  float inkBoil(vec2 p, float t, float px) {
    float d = length(inkBoilP(p, t) - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 q = inkBoilP(p, t); return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(q)), bkCover(q)), inkBoil(p, t, 2.0)); }`,
  }),
  defineModule({
    name: "inkWeight", doc: "variable weight from curvature of N, thick in hollows, hairline on flats",
    glsl: /* glsl */ `
  float inkWeight(vec2 p, float px) {
    vec3 N = bkSphereN(p);
    float crv = length(vec2(dFdx(N.x) + dFdy(N.x), dFdx(N.y) + dFdy(N.y)));
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * mix(0.55, 2.8, smoothstep(0.02, 0.18, crv)) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkWeight(p, 1.7)); }`,
  }),
  defineModule({
    name: "inkIndigo", doc: "deep indigo key line, lifted off black so the print still has air",
    glsl: /* glsl */ `
  vec3 inkIndigo(vec3 col, float k) { return mix(col, BK_INK, clamp(k, 0.0, 1.0)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float d = abs(length(p - vec2(0.72, 0.5)) - sqrt(0.22));
    return inkIndigo(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), 1.0 - smoothstep(0.0, fwidth(d) * 2.1, d)); }`,
  }),
  defineModule({
    name: "inkUmber", doc: "umber key line: warm brown contour for earth plates",
    glsl: /* glsl */ `
  vec3 inkUmber(vec3 col, float k) { return mix(col, BK_UMBER, clamp(k, 0.0, 1.0)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float d = abs(length(p - vec2(0.72, 0.5)) - sqrt(0.22));
    return inkUmber(mix(bkPaper(p) * 0.52, bkCel3(bkNdL(p)), bkCover(p)), 1.0 - smoothstep(0.0, fwidth(d) * 2.0, d)); }`,
  }),
  defineModule({
    name: "inkTinted", doc: "coloured ink: albedo darkened and saturated, then mixed toward indigo",
    glsl: /* glsl */ `
  vec3 inkTinted(vec3 alb, float k) {
    float L = bkLuma(alb);
    return mix(alb, max(mix(vec3(L), alb, 1.35) * 0.32, BK_INK), clamp(k, 0.0, 1.0)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float d = abs(length(p - vec2(0.72, 0.5)) - sqrt(0.22));
    return inkTinted(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), 1.0 - smoothstep(0.0, fwidth(d) * 2.3, d)); }`,
  }),
  defineModule({
    name: "inkTaper", doc: "tapered stroke: width breathes along the silhouette, tails fade to a hairline",
    glsl: /* glsl */ `
  float inkTaper(vec2 p, float px) {
    float ang = atan(p.y - 0.5, p.x - 0.72);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * (0.35 + 0.65 * abs(sin(ang * 3.0))) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkTaper(p, 2.4)); }`,
  }),
  defineModule({
    name: "inkBroken", doc: "broken contour: gaps where a hash along the line drops out",
    glsl: /* glsl */ `
  float inkBroken(vec2 p, float px) {
    float ang = atan(p.y - 0.5, p.x - 0.72);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px + 1e-5;
    return (1.0 - smoothstep(0.0, w, abs(d))) * step(0.22, bkHash(vec2(floor(ang * 22.0), 9.0))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkBroken(p, 2.0)); }`,
  }),
  defineModule({
    name: "inkDouble", doc: "double contour: a tight inner ring plus a loose outer echo",
    glsl: /* glsl */ `
  float inkDouble(vec2 p, float px) {
    float r = length(p - vec2(0.72, 0.5));
    float w = fwidth(r) * px + 1e-5;
    return max(1.0 - smoothstep(0.0, w, abs(r - sqrt(0.22))), (1.0 - smoothstep(0.0, w * 0.7, abs(r - sqrt(0.22) - 0.018))) * 0.55); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkDouble(p, 1.8)); }`,
  }),
  defineModule({
    name: "inkCrease", doc: "interior crease: ink where the lighting field crosses a mid threshold",
    glsl: /* glsl */ `
  float inkCrease(float h, float level, float px) {
    float w = fwidth(h) + 1e-6;
    return 1.0 - smoothstep(px * 0.45, px * 0.55 + 0.5, abs(h - level) / w); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkCrease(bkNdL(p), 0.38, 2.2) * bkCover(p)); }`,
  }),
  defineModule({
    name: "inkSetDepth", doc: "set-line: thicker where the sphere falls away from the lens, a depth-ish weight",
    glsl: /* glsl */ `
  float inkSetDepth(vec2 p, float px) {
    float recede = 1.0 - clamp(bkSphereN(p).z, 0.0, 1.0);
    float d = length(p - vec2(0.72, 0.5)) - sqrt(0.22);
    float w = fwidth(d) * px * mix(0.7, 2.2, recede) + 1e-5;
    return 1.0 - smoothstep(0.0, w, abs(d)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.5, bkCel3(bkNdL(p)), bkCover(p)), inkSetDepth(p, 1.9)); }`,
  }),
];
