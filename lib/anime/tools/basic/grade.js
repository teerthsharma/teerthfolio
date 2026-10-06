import { defineModule } from "./define.js";

const g = (name, doc, glsl) => defineModule({
  name, doc, glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(mix(bkPaper(p) * 0.52, bkCel3(bkNdL(p)), bkCover(p))); }`,
});

export const GRADE = [
  g("gradePrint", "print-grade: magenta fill, green key, a split plate", /* glsl */ `
  vec3 gradePrint(vec3 col) {
    float L = bkLuma(col);
    return bkCap(mix(col * vec3(1.06, 0.94, 1.04), col * vec3(0.94, 1.05, 0.96), smoothstep(0.28, 0.72, L))); }`),
  g("gradeNight", "night-grade: lifted indigo blacks, compressed highlights", /* glsl */ `
  vec3 gradeNight(vec3 col) {
    float L = bkLuma(col);
    vec3 lifted = mix(BK_INK * 1.6, col, smoothstep(0.02, 0.22, L));
    return bkCap(mix(lifted, lifted * vec3(0.82, 0.86, 0.95), smoothstep(0.55, 0.92, L)) * vec3(0.78, 0.82, 1.02)); }`),
  g("gradeDusk", "dusk: amber wrap, violet fill, the sun already gone", /* glsl */ `
  vec3 gradeDusk(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.14, 0.10, 0.22), b = vec3(0.62, 0.32, 0.28), c = vec3(0.88, 0.62, 0.40);
    return bkCap(mix(col, L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0), 0.72)); }`),
  g("gradeBleach", "bleach bypass: retain silver, crush chroma, keep the luma ladder", /* glsl */ `
  vec3 gradeBleach(vec3 col) {
    float L = bkLuma(col);
    vec3 mixed = mix(col, vec3(L), 0.62);
    return bkCap(mix(mixed * 0.82, mixed * 1.08, smoothstep(0.2, 0.8, L))); }`),
  g("gradeSepia", "sepia-safe: brown plate that never sinks to #000 or blows past 0.92", /* glsl */ `
  vec3 gradeSepia(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.16, 0.10, 0.07), b = vec3(0.52, 0.36, 0.22), c = vec3(0.86, 0.74, 0.56);
    return bkCap(mix(col, L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, min(L * 2.0 - 1.0, 1.0)), 0.85)); }`),
  g("gradeTealOrange", "teal-orange: fill pushed cyan, key pushed amber, value held", /* glsl */ `
  vec3 gradeTealOrange(vec3 col) {
    float L = bkLuma(col);
    vec3 gcol = mix(vec3(0.14, 0.28, 0.32), vec3(0.88, 0.56, 0.28), smoothstep(0.25, 0.75, L));
    vec3 m = mix(col, gcol, 0.55);
    return bkCap(m * (L / max(bkLuma(m), 1e-4))); }`),
  g("gradeCyanotype", "cyanotype: Prussian blue plate, paper highlights", /* glsl */ `
  vec3 gradeCyanotype(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.06, 0.10, 0.22), b = vec3(0.20, 0.42, 0.58), c = vec3(0.78, 0.84, 0.86);
    return bkCap(L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0)); }`),
  g("gradeWarmStock", "warm film stock: yellow-red gain, mids stay brown not orange plastic", /* glsl */ `
  vec3 gradeWarmStock(vec3 col) {
    col *= vec3(1.06, 0.99, 0.90);
    return bkCap(mix(col * vec3(1.0, 0.96, 0.92), col, smoothstep(0.2, 0.8, bkLuma(col)))); }`),
  g("gradeCoolStock", "cool film stock: cyan shadows, restrained highlights", /* glsl */ `
  vec3 gradeCoolStock(vec3 col) {
    col *= vec3(0.92, 0.98, 1.06);
    return bkCap(mix(col * vec3(0.88, 0.94, 1.04), col, smoothstep(0.25, 0.8, bkLuma(col)))); }`),
  g("gradeCrush", "crushed mids: a harder S-curve, still lifted off ink", /* glsl */ `
  vec3 gradeCrush(vec3 col) {
    float L = bkLuma(col), mapped = pow(clamp((L - 0.08) / 0.84, 0.0, 1.0), 1.35);
    return bkCap(mix(BK_INK * 1.7, col * (mapped / max(L, 1e-4)), mapped)); }`),
  g("gradeLiftFog", "lifted fog: a cool haze added by value, never a bloom", /* glsl */ `
  vec3 gradeLiftFog(vec3 col) { return bkCap(mix(col, vec3(0.62, 0.68, 0.74), (1.0 - bkLuma(col)) * 0.44)); }`),
  g("gradeGolden", "golden hour: key goes honey, fill stays earth, luma capped", /* glsl */ `
  vec3 gradeGolden(vec3 col) {
    return bkCap(mix(col, mix(vec3(0.28, 0.18, 0.16), vec3(0.90, 0.68, 0.36), smoothstep(0.3, 0.78, bkLuma(col))), 0.6)); }`),
  g("gradeMoon", "moonlight: cool key, green-silver mids, indigo floor", /* glsl */ `
  vec3 gradeMoon(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.07, 0.09, 0.16), b = vec3(0.28, 0.36, 0.40), c = vec3(0.72, 0.78, 0.82);
    return bkCap(mix(col, L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0), 0.78)); }`),
  g("gradeBlood", "blood plate: crimson fill, bone key", /* glsl */ `
  vec3 gradeBlood(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.10, 0.02, 0.05), b = vec3(0.48, 0.06, 0.10), c = vec3(0.86, 0.70, 0.66);
    return bkCap(mix(col, L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0), 0.8)); }`),
  g("gradePastel", "pastel: chroma pulled, value lifted off the floor, still under 0.92", /* glsl */ `
  vec3 gradePastel(vec3 col) {
    float L = bkLuma(col);
    return bkCap(mix(col, mix(vec3(L), col, 0.45) * 0.85 + vec3(0.12), 0.7)); }`),
  g("gradeInkWash", "ink wash grade: one hue, value does the drawing", /* glsl */ `
  vec3 gradeInkWash(vec3 col) { return bkCap(mix(BK_INK, vec3(0.72, 0.74, 0.76), pow(bkLuma(col), 0.9))); }`),
  g("gradeTechnicolor", "3-strip: primaries pulled apart, then recapped so nothing milks", /* glsl */ `
  vec3 gradeTechnicolor(vec3 col) {
    vec3 p3 = vec3(pow(col.r, 0.85), pow(col.g, 0.9), pow(col.b, 0.8));
    return bkCap(mix(p3, vec3(p3.r, p3.g * 0.92, p3.b * 1.05), 0.4)); }`),
  g("gradeMonoSafe", "mono-safe: luma plate on indigo/paper, no pure black", /* glsl */ `
  vec3 gradeMonoSafe(vec3 col) { return bkCap(mix(BK_INK * 1.4, vec3(0.86, 0.84, 0.80), bkLuma(col))); }`),
  g("gradeEmber", "ember: near-black umber with a held warm coal in the mids", /* glsl */ `
  vec3 gradeEmber(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.10, 0.05, 0.04), b = vec3(0.58, 0.18, 0.08), c = vec3(0.88, 0.62, 0.32);
    return bkCap(mix(col, L < 0.45 ? mix(a, b, L / 0.45) : mix(b, c, (L - 0.45) / 0.55), 0.75)); }`),
  g("gradeIce", "ice: lifted cyan-grey, highlights stay glass not bloom", /* glsl */ `
  vec3 gradeIce(vec3 col) {
    float L = bkLuma(col);
    vec3 a = vec3(0.14, 0.18, 0.24), b = vec3(0.46, 0.56, 0.62), c = vec3(0.82, 0.88, 0.90);
    return bkCap(mix(col, L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, L * 2.0 - 1.0), 0.7)); }`),
];
