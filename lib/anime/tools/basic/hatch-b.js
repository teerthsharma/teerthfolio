import { defineModule } from "./define.js";

export const HATCH_B = [
  defineModule({
    name: "hatchWood", doc: "woodcut: heavy parallel gouges, slightly wavy, umber ink",
    glsl: /* glsl */ `
  vec3 hatchWood(vec3 col, vec2 p, float s) {
    float gouge = 1.0 - smoothstep(0.2, 0.42, abs(fract(p.y * 22.0 + bkVn(p * 6.0) * 0.8) - 0.5) * 2.0);
    return mix(col, BK_UMBER, gouge * bkAA(s, 0.3) * 0.88); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchWood(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchZip", doc: "zipper shade: staggered dashes that read as a manga zip",
    glsl: /* glsl */ `
  vec3 hatchZip(vec3 col, vec2 fc, float s) {
    float u = fract((fc.x + floor(fc.y / 6.0) * 3.5) / 9.0);
    return mix(col, BK_INK, (1.0 - smoothstep(0.55, 0.72, u)) * bkAA(s, 0.4) * 0.75); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchZip(bkCel3(h), gl_FragCoord.xy, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchRain", doc: "rain-line hatch: long vertical strokes, denser in shadow",
    glsl: /* glsl */ `
  vec3 hatchRain(vec3 col, vec2 p, float s) {
    float x = fract(p.x * 40.0 + bkHash(vec2(floor(p.x * 40.0), 2.0)) * 0.4);
    return mix(col, BK_INK, (1.0 - smoothstep(0.12, 0.28, abs(x - 0.5))) * bkAA(s, 0.28) * 0.6); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.52, hatchRain(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchFlame", doc: "flame-shape shade: rising tongues in the core shadow",
    glsl: /* glsl */ `
  vec3 hatchFlame(vec3 col, vec2 p, float s) {
    vec2 q = (p - vec2(0.72, 0.42)) * vec2(6.0, 4.2);
    float tongue = smoothstep(0.45, 0.75, bkFbm(q + vec2(0.0, q.x * 0.4))) * smoothstep(1.2, 0.1, q.y);
    return mix(col, BK_INK, tongue * bkAA(s, 0.25) * 0.8); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.5, hatchFlame(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchBlock", doc: "solid manga black: a lifted indigo plate, not #000",
    glsl: /* glsl */ `
  vec3 hatchBlock(vec3 col, float s) { return mix(col, BK_INK, bkAA(s, 0.62)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchBlock(bkCel3(h), 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchWhite", doc: "white-on-dark scratch: paper cuts through a dark plate",
    glsl: /* glsl */ `
  vec3 hatchWhite(vec3 col, vec2 fc, float s) {
    vec3 plate = mix(col, BK_INK, bkAA(s, 0.4));
    float cut = 1.0 - smoothstep(0.4, 0.56, abs(fract((fc.x - fc.y) / 9.0) - 0.5) * 2.0);
    return mix(plate, bkPaper(fc * 0.004) * 0.9, cut * bkAA(s, 0.45) * 0.7); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.45, hatchWhite(bkCel3(h), gl_FragCoord.xy, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchMezzo", doc: "mezzotint: pit density, a copper-plate grey, not white noise",
    glsl: /* glsl */ `
  vec3 hatchMezzo(vec3 col, vec2 p, float s) {
    return mix(col, BK_INK, smoothstep(mix(0.72, 0.28, clamp(s, 0.0, 1.0)), 0.9, bkVn(p * 55.0)) * 0.75); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchMezzo(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchLino", doc: "linocut chunks: large carved blocks with ragged AA edges",
    glsl: /* glsl */ `
  vec3 hatchLino(vec3 col, vec2 p, float s) {
    float cut = step(0.42, bkHash(floor(p * 10.0) + floor(s * 3.0)));
    float aa = smoothstep(0.0, 0.08, min(fract(p.x * 10.0), fract(p.y * 10.0)));
    return mix(col, BK_INK, cut * aa * bkAA(s, 0.3) * 0.85); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchLino(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchSai", doc: "sai / ink wash: pooled pigment darker in the hollows, granulation not noise",
    glsl: /* glsl */ `
  vec3 hatchSai(vec3 col, vec2 p, float s) {
    return bkCap(mix(col, BK_INK, smoothstep(0.35, 0.75, bkFbm(p * 5.5)) * s * 0.55) + (bkVn(p * 30.0) - 0.5) * 0.08 * s); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.58, hatchSai(bkCel3(h), p, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchMoire", doc: "moiré beat: two close pitches interfere, a print accident used as tone",
    glsl: /* glsl */ `
  vec3 hatchMoire(vec3 col, vec2 fc, float s) {
    float beat = sin((fc.x + fc.y) * 0.85) * sin((fc.x + fc.y) * 0.93) * 0.5 + 0.5;
    return mix(col, BK_INK, smoothstep(0.45 - fwidth(beat), 0.55 + fwidth(beat), beat) * bkAA(s, 0.25) * 0.55); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return mix(bkPaper(p) * 0.55, hatchMoire(bkCel3(h), gl_FragCoord.xy, 1.0 - h), bkCover(p)); }`,
  }),
  defineModule({
    name: "hatchAshi", doc: "ashiato: clustered footprint shadow under the form, not a hatch grid",
    glsl: /* glsl */ `
  vec3 hatchAshi(vec3 col, vec2 p, float s) {
    float blob = 1.0 - smoothstep(0.08, 0.28, length((p - vec2(0.72, 0.28)) * vec2(0.7, 1.6)));
    return mix(col, BK_INK, blob * bkToner(p + vec2(0.0, -0.1), 0.45) * 0.7 * (0.4 + 0.6 * s)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return hatchAshi(mix(bkPaper(p) * 0.55, bkCel3(h), bkCover(p)), p, 1.0 - h); }`,
  }),
  defineModule({
    name: "hatchSpeedOnly", doc: "speed-shadow only: Araki bands with the fill deleted to paper",
    glsl: /* glsl */ `
  vec3 hatchSpeedOnly(vec3 col, vec2 p, float s) {
    vec2 q = mat2(0.95, -0.3, 0.3, 0.95) * (p - vec2(0.55, 0.5));
    float k = (1.0 - smoothstep(0.18, 0.3, abs(sin(q.x * 46.0)))) * smoothstep(0.7, 0.1, abs(q.y)) * bkAA(s, 0.2);
    return mix(col, BK_INK, k); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h = bkNdL(p); return hatchSpeedOnly(mix(bkPaper(p) * 0.62, bkCel3(h), bkCover(p) * 0.35), p, 1.0 - h); }`,
  }),
];
