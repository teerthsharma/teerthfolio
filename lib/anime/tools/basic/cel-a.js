import { defineModule } from "./define.js";

export const CEL_A = [
  defineModule({
    name: "celHard2", doc: "hard 2-step cel: one fwidth cut between cool fill and warm key",
    glsl: /* glsl */ `
  vec3 celHard2(float h) { return bkCap(mix(BK_FILL, BK_KEY, bkAA(h, 0.5))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celHard2(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celHard3", doc: "hard 3-step house cel: fill, mid, key with two razor bands",
    glsl: /* glsl */ `
  vec3 celHard3(float h) { return bkCel3(h); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celHard3(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celHard5", doc: "hard 5-step cel: four cuts, each tone a printed plate",
    glsl: /* glsl */ `
  vec3 celHard5(float h) {
    vec3 a = BK_FILL * 0.82, b = mix(BK_FILL, BK_MID, 0.45), c = BK_MID, d = mix(BK_MID, BK_KEY, 0.55), e = BK_KEY;
    float t = h * 4.0, f = fract(t), w = fwidth(t) * 0.75 + 1e-5;
    float u = (floor(t) + smoothstep(0.5 - w, 0.5 + w, f)) / 4.0;
    return bkCap(u < 0.25 ? mix(a, b, u * 4.0) : u < 0.5 ? mix(b, c, u * 4.0 - 1.0) : u < 0.75 ? mix(c, d, u * 4.0 - 2.0) : mix(d, e, u * 4.0 - 3.0)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celHard5(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSoft", doc: "soft smoothstep cel: wide terminator, still a 3-plate house grade",
    glsl: /* glsl */ `
  vec3 celSoft(float h) {
    float s1 = smoothstep(0.28, 0.48, h), s2 = smoothstep(0.62, 0.86, h);
    return bkCap(mix(mix(BK_FILL, BK_MID, s1), BK_KEY, s2)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celSoft(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celWarmKey", doc: "warm-key / cold-fill split: hue flips at the terminator, value stays authored",
    glsl: /* glsl */ `
  vec3 celWarmKey(float h) { return bkWarmCool(h); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.48, celWarmKey(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celFace", doc: "face ramp: higher threshold so cheeks stay lit, warm mid, no hard cloth cut",
    glsl: /* glsl */ `
  vec3 celFace(float h) {
    vec3 skin = vec3(0.86, 0.64, 0.54), shade = vec3(0.42, 0.28, 0.34), key = vec3(0.90, 0.78, 0.68);
    return bkCap(mix(mix(shade, skin, bkAA(h, 0.58)), key, bkAA(h, 0.84))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celFace(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celCloth", doc: "cloth ramp: lower threshold, cooler fill, harder crease than skin",
    glsl: /* glsl */ `
  vec3 celCloth(float h) {
    vec3 dye = vec3(0.38, 0.22, 0.28), fold = vec3(0.16, 0.14, 0.28), lit = vec3(0.62, 0.46, 0.42);
    return bkCap(mix(mix(fold, dye, bkAA(h, 0.32)), lit, bkAA(h, 0.70))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celCloth(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celMetal", doc: "metal cel: dark body, hard specular sheet, indigo bounce in the fill",
    glsl: /* glsl */ `
  vec3 celMetal(float h, float spec) {
    vec3 body = mix(vec3(0.12, 0.14, 0.22), vec3(0.42, 0.40, 0.44), bkAA(h, 0.46));
    float sw = fwidth(spec) + 0.02;
    return bkCap(mix(body, vec3(0.88, 0.84, 0.78), smoothstep(0.62 - sw, 0.62 + sw, spec))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = bkSphereN(p); vec3 H = normalize(normalize(vec3(-0.45, 0.55, 0.7)) + vec3(0.0, 0.1, 1.0));
    return mix(bkPaper(p) * 0.45, celMetal(bkNdL(p), pow(max(dot(N, H), 0.0), 28.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSkin", doc: "skin cel: warm subsurface mid, cool terminator, never a grey shadow",
    glsl: /* glsl */ `
  vec3 celSkin(float h) {
    vec3 deep = vec3(0.28, 0.12, 0.16), sss = vec3(0.62, 0.32, 0.30), lit = vec3(0.88, 0.70, 0.60);
    float wrap = h * 0.72 + 0.14;
    return bkCap(mix(mix(deep, sss, bkAA(wrap, 0.40)), lit, bkAA(h, 0.74))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celSkin(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celHair", doc: "hair cel: dark mass, one broken highlight band like a drawn zigzag",
    glsl: /* glsl */ `
  vec3 celHair(float h, vec2 p) {
    vec3 mass = mix(vec3(0.10, 0.08, 0.14), vec3(0.28, 0.16, 0.12), bkAA(h, 0.42));
    float ang = atan(p.y - 0.5, p.x - 0.72);
    float strand = bkHash(vec2(floor(ang * 18.0), 3.0));
    float ring = bkAA(h + strand * 0.08, 0.78);
    return bkCap(mix(mass, vec3(0.72, 0.56, 0.40), ring * 0.55)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.48, celHair(bkNdL(p), p), bkCover(p)); }`,
  }),
  defineModule({
    name: "celRimBand", doc: "thin hard rim band on the light-facing back edge, not a Fresnel wash",
    glsl: /* glsl */ `
  vec3 celRimBand(vec3 col, float nv, float facing) {
    float rw = fwidth(nv) + 1e-4;
    float rim = smoothstep(0.86 - rw, 0.86 + rw, nv) * bkAA(facing, 0.15);
    return bkCap(mix(col, min(BK_KEY * 1.05, vec3(BK_LUMA_MAX)), rim * 0.65)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = bkSphereN(p); vec3 V = vec3(0.0, 0.1, 1.0);
    float nv = 1.0 - clamp(dot(N, normalize(V)), 0.0, 1.0);
    return mix(bkPaper(p) * 0.5, celRimBand(bkCel3(bkNdL(p)), nv, dot(N, normalize(vec3(-0.45, 0.55, 0.7)))), bkCover(p)); }`,
  }),
  defineModule({
    name: "celHalfLambert", doc: "half-Lambert field quantised to the house 3-step, no raw cosine facets",
    glsl: /* glsl */ `
  vec3 celHalfLambert(vec3 N, vec3 L) { return bkCel3(0.5 * dot(N, L) + 0.5); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celHalfLambert(bkSphereN(p), normalize(vec3(-0.45, 0.55, 0.7))), bkCover(p)); }`,
  }),
  defineModule({
    name: "celTwinTone", doc: "twin-tone: only core shadow and a thin highlight plate, mid deleted",
    glsl: /* glsl */ `
  vec3 celTwinTone(float h) {
    float core = 1.0 - bkAA(h, 0.34), hi = bkAA(h, 0.82);
    vec3 c = mix(BK_MID * 1.05, BK_FILL, core);
    return bkCap(mix(c, BK_KEY, hi)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celTwinTone(bkNdL(p)), bkCover(p)); }`,
  }),
];
