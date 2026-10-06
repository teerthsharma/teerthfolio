import { defineModule } from "./define.js";

export const CEL_B = [
  defineModule({
    name: "celKnee", doc: "highlight knee: mids hold, then a crushed specular rolloff under the luma cap",
    glsl: /* glsl */ `
  vec3 celKnee(float h) {
    float mid = smoothstep(0.30, 0.62, h);
    float knee = pow(clamp((h - 0.72) / 0.28, 0.0, 1.0), 2.4);
    vec3 c = mix(BK_FILL, BK_MID, mid);
    return bkCap(mix(c, BK_KEY, bkAA(knee, 0.35))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celKnee(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celVelvet", doc: "velvet: darkens toward the rim, lit only in the facing bowl",
    glsl: /* glsl */ `
  vec3 celVelvet(vec3 N, vec3 V, float h) {
    float pile = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 1.6);
    vec3 pileCol = vec3(0.10, 0.08, 0.16);
    return bkCap(mix(mix(pileCol, BK_MID, bkAA(h, 0.55)), pileCol, pile * 0.85)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.45, celVelvet(bkSphereN(p), vec3(0.0, 0.1, 1.0), bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSilk", doc: "silk: a shifted anisotropic band, one bright thread plate",
    glsl: /* glsl */ `
  vec3 celSilk(vec3 N, vec3 L, vec3 V) {
    vec3 T = normalize(vec3(0.0, 1.0, 0.0) - N * N.y + 1e-4);
    vec3 H = normalize(L + V);
    float th = dot(T, H);
    float band = pow(sqrt(max(0.0, 1.0 - th * th)), 18.0);
    vec3 base = bkCel3(0.5 * dot(N, L) + 0.5);
    return bkCap(mix(base, BK_KEY * vec3(1.02, 0.96, 0.88), bkAA(band, 0.55) * 0.5)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celSilk(bkSphereN(p), normalize(vec3(-0.45, 0.55, 0.7)), vec3(0.0, 0.1, 1.0)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celIris", doc: "iris cel: radial rings, dark limbus, one catchlight disc",
    glsl: /* glsl */ `
  vec3 celIris(vec2 q) {
    float r = length(q), aa = fwidth(r) + 1e-5;
    vec3 iris = mix(vec3(0.12, 0.18, 0.28), vec3(0.28, 0.42, 0.52), bkAA(0.62 - r, 0.0));
    iris = mix(iris, vec3(0.06, 0.07, 0.12), 1.0 - smoothstep(0.22 - aa, 0.22 + aa, r));
    iris = mix(iris, BK_INK, 1.0 - smoothstep(0.08 - aa, 0.08 + aa, r));
    float hi = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, length(q - vec2(-0.12, 0.14)));
    return bkCap(mix(iris, vec3(0.90, 0.88, 0.84), hi)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 q = (p - vec2(0.72, 0.5)) * 2.6; return mix(bkPaper(p) * 0.42, celIris(q), 1.0 - smoothstep(0.95, 1.05, length(q))); }`,
  }),
  defineModule({
    name: "celCheek", doc: "cheek blush plate: a soft oval keyed on facing, never a multiply stain",
    glsl: /* glsl */ `
  vec3 celCheek(vec3 col, vec2 p, float facing) {
    float d = length((p - vec2(0.58, 0.42)) / vec2(0.14, 0.08)) - 1.0;
    float blush = (1.0 - smoothstep(-fwidth(d) * 2.0, fwidth(d) * 2.0, d)) * bkAA(facing, 0.2);
    return bkCap(mix(col, vec3(0.78, 0.36, 0.40), blush * 0.35)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celCheek(bkCel3(bkNdL(p)), p, bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celUnder", doc: "underlight: cool fill from below, warm key from above, two authored plates",
    glsl: /* glsl */ `
  vec3 celUnder(vec3 N) {
    float key = 0.5 + 0.5 * dot(N, normalize(vec3(-0.3, 0.8, 0.4)));
    float fill = 0.5 + 0.5 * dot(N, normalize(vec3(0.2, -0.7, 0.3)));
    vec3 c = mix(BK_FILL, BK_KEY, bkAA(key, 0.55));
    return bkCap(mix(c, vec3(0.18, 0.28, 0.44), bkAA(fill, 0.62) * (1.0 - bkAA(key, 0.5)) * 0.7)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.48, celUnder(bkSphereN(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celOvercast", doc: "overcast: flattened two-band, almost no key, cool paper sky bounce",
    glsl: /* glsl */ `
  vec3 celOvercast(float h) {
    vec3 a = vec3(0.28, 0.30, 0.36), b = vec3(0.58, 0.56, 0.54);
    return bkCap(mix(a, b, bkAA(h, 0.48))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.55, celOvercast(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSunset", doc: "sunset wrap: warm wrap past the terminator, cool sky in the core shadow",
    glsl: /* glsl */ `
  vec3 celSunset(float h) {
    vec3 core = vec3(0.12, 0.14, 0.28), wrap = vec3(0.72, 0.32, 0.22), key = vec3(0.90, 0.70, 0.42);
    return bkCap(mix(mix(core, wrap, bkAA(h, 0.28)), key, bkAA(h, 0.68))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(vec3(0.18, 0.12, 0.22), celSunset(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSpecSheet", doc: "hard specular sheet: one lacquer plate, fwidth edge, under the luma cap",
    glsl: /* glsl */ `
  vec3 celSpecSheet(vec3 col, float spec, float amount) {
    float w = fwidth(spec) + 0.018;
    return bkCap(mix(col, vec3(0.90, 0.86, 0.80), smoothstep(0.55 - w, 0.55 + w, spec) * amount)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = bkSphereN(p); float spec = pow(max(dot(N, normalize(normalize(vec3(-0.45, 0.55, 0.7)) + vec3(0.0, 0.15, 1.0))), 0.0), 40.0);
    return mix(bkPaper(p) * 0.5, celSpecSheet(bkCel3(bkNdL(p)), spec, 0.85), bkCover(p)); }`,
  }),
  defineModule({
    name: "celShadowLift", doc: "shadow lift: fill never sinks to ink, a printed indigo floor",
    glsl: /* glsl */ `
  vec3 celShadowLift(vec3 col) {
    float L = bkLuma(col);
    vec3 lifted = mix(BK_INK * 1.8, col, smoothstep(0.04, 0.18, L));
    return bkCap(mix(col, lifted, 1.0)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celShadowLift(bkCel3(bkNdL(p) * 0.55)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celPoster4", doc: "4-level poster: floor of a stepped field with AA on the fracture",
    glsl: /* glsl */ `
  vec3 celPoster4(float h) {
    float q = h * 3.0, f = fract(q), w = fwidth(q) * 0.8 + 1e-5;
    float u = (floor(q) + smoothstep(0.5 - w, 0.5 + w, f)) / 3.0;
    return bkCap(mix(mix(BK_FILL, BK_MID, clamp(u * 1.5, 0.0, 1.0)), BK_KEY, clamp(u * 1.5 - 0.5, 0.0, 1.0))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celPoster4(bkNdL(p)), bkCover(p)); }`,
  }),
  defineModule({
    name: "celSplitComp", doc: "complementary split: key leans amber, fill leans teal, same value ladder",
    glsl: /* glsl */ `
  vec3 celSplitComp(float h) {
    vec3 teal = vec3(0.12, 0.24, 0.32), amber = vec3(0.88, 0.62, 0.36);
    vec3 mid = vec3(0.46, 0.40, 0.36);
    return bkCap(mix(mix(teal, mid, bkAA(h, 0.40)), amber, bkAA(h, 0.74))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mix(bkPaper(p) * 0.5, celSplitComp(bkNdL(p)), bkCover(p)); }`,
  }),
];
