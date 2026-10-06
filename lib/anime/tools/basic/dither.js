import { defineModule } from "./define.js";

export const DITHER = [
  defineModule({
    name: "ditherBayer2", doc: "Bayer 2x2 ordered dither of the house 3-step",
    glsl: /* glsl */ `
  vec3 ditherBayer2(vec3 col, vec2 fc) { return bkCap(mix(BK_FILL, BK_KEY, step(bkBayer2(fc), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherBayer2(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherBayer4", doc: "Bayer 4x4 ordered dither, finer than 2x2, still a printed screen",
    glsl: /* glsl */ `
  vec3 ditherBayer4(vec3 col, vec2 fc) {
    float q = bkAA(bkLuma(col) - bkBayer4(fc) + 0.5, 0.5);
    return bkCap(mix(BK_FILL, mix(BK_MID, BK_KEY, q), q)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherBayer4(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherBayer8", doc: "Bayer 8x8 ordered dither: the classic print screen",
    glsl: /* glsl */ `
  vec3 ditherBayer8(vec3 col, vec2 fc) {
    float L = bkLuma(col), thr = bkBayer8(fc), w = fwidth(L) * 0.15;
    return bkCap(mix(BK_FILL, BK_KEY, mix(step(thr, L), smoothstep(thr - w, thr + w, L), 0.35))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherBayer8(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherHash", doc: "hash dither: white threshold from a seeded hash, held if t is stepped",
    glsl: /* glsl */ `
  vec3 ditherHash(vec3 col, vec2 fc, float seed) { return bkCap(mix(BK_FILL, BK_KEY, step(bkHash(fc + seed), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherHash(bkCel3(bkNdL(p)), gl_FragCoord.xy, bkHold(t, 12.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherBlue", doc: "blue-noise-ish hash dither: IGN mixed with a coarse cluster, less snow than white",
    glsl: /* glsl */ `
  vec3 ditherBlue(vec3 col, vec2 fc, float seed) { return bkCap(mix(BK_FILL, BK_KEY, step(bkBlue(fc, seed), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherBlue(bkCel3(bkNdL(p)), gl_FragCoord.xy, bkHold(t, 12.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherOrdered3", doc: "3x3 ordered matrix, a different pitch from Bayer 2/4/8",
    glsl: /* glsl */ `
  float ditherM3(vec2 fc) {
    vec2 i = mod(floor(fc), 3.0); float v = i.y * 3.0 + i.x;
    float m = v < 0.5 ? 0.0 : v < 1.5 ? 5.0 : v < 2.5 ? 2.0 : v < 3.5 ? 7.0 : v < 4.5 ? 4.0 : v < 5.5 ? 8.0 : v < 6.5 ? 3.0 : v < 7.5 ? 6.0 : 1.0;
    return (m + 0.5) / 9.0; }
  vec3 ditherOrdered3(vec3 col, vec2 fc) { return bkCap(mix(BK_FILL, BK_KEY, step(ditherM3(fc), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherOrdered3(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherIgn", doc: "IGN interleaved gradient noise as a dither threshold",
    glsl: /* glsl */ `
  vec3 ditherIgn(vec3 col, vec2 fc, float seed) {
    float ign = fract(52.9829189 * fract(dot(fc + seed * 5.588238, vec2(0.06711056, 0.00583715))));
    return bkCap(mix(BK_FILL, BK_KEY, step(ign, bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherIgn(bkCel3(bkNdL(p)), gl_FragCoord.xy, bkHold(t, 12.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherTri", doc: "triangular-pdf dither: two hashes subtracted, softer grain than one hash",
    glsl: /* glsl */ `
  vec3 ditherTri(vec3 col, vec2 fc, float seed) {
    return bkCap(mix(BK_FILL, BK_KEY, step(0.5 + 0.5 * (bkHash(fc + seed) - bkHash(fc + seed + 19.7)), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherTri(bkCel3(bkNdL(p)), gl_FragCoord.xy, bkHold(t, 12.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherChecks", doc: "checker ordered dither: 2px checks as a crude print screen",
    glsl: /* glsl */ `
  vec3 ditherChecks(vec3 col, vec2 fc) {
    float chk = step(1.0, mod(floor(fc.x) + floor(fc.y), 2.0)), L = bkLuma(col);
    return bkCap(mix(BK_FILL, BK_KEY, mix(step(0.33, L), step(0.66, L), chk))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherChecks(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherCluster", doc: "clustered-dot: dots grow from cell centres like a newspaper screen",
    glsl: /* glsl */ `
  vec3 ditherCluster(vec3 col, vec2 fc) {
    vec2 c = fract(fc / 8.0) - 0.5; float r = mix(0.08, 0.62, bkLuma(col)), d = length(c);
    return bkCap(mix(BK_FILL, BK_KEY, 1.0 - smoothstep(r - fwidth(d), r + fwidth(d), d))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherCluster(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherVoid", doc: "void-and-cluster-ish: sparse dots that avoid each other via two scales",
    glsl: /* glsl */ `
  vec3 ditherVoid(vec3 col, vec2 fc) {
    float a = bkBlue(fc, 1.0);
    return bkCap(mix(BK_FILL, BK_KEY, step(min(a, mix(a, bkBlue(fc * 0.33 + 8.0, 2.0), 0.4)), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherVoid(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherInterleave", doc: "interleaved 4-pixel pattern, a cheap ordered screen",
    glsl: /* glsl */ `
  vec3 ditherInterleave(vec3 col, vec2 fc) {
    return bkCap(mix(BK_FILL, BK_KEY, step((mod(floor(fc.x) + 2.0 * floor(fc.y), 4.0) + 0.5) / 4.0, bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherInterleave(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherQuant4", doc: "4-level quantise then Bayer 8 residual, a poster plus screen",
    glsl: /* glsl */ `
  vec3 ditherQuant4(vec3 col, vec2 fc) { return bkCap(mix(BK_FILL, BK_KEY, clamp(floor(bkLuma(col) * 3.0 + bkBayer8(fc)) / 3.0, 0.0, 1.0))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherQuant4(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherDiagonal", doc: "diagonal ordered threshold, strokes instead of a Bayer grid",
    glsl: /* glsl */ `
  vec3 ditherDiagonal(vec3 col, vec2 fc) { return bkCap(mix(BK_FILL, BK_KEY, step(fract((fc.x + fc.y) * 0.125), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherDiagonal(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
  defineModule({
    name: "ditherSpiral", doc: "spiral-dot screen: threshold from polar cell index",
    glsl: /* glsl */ `
  vec3 ditherSpiral(vec3 col, vec2 fc) {
    vec2 q = fc - vec2(64.0);
    return bkCap(mix(BK_FILL, BK_KEY, step(fract(atan(q.y, q.x) * 0.8 + length(q) * 0.07), bkLuma(col)))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, ditherSpiral(bkCel3(bkNdL(p)), gl_FragCoord.xy), bkCover(p)); }`,
  }),
];
