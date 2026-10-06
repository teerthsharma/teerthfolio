// Named kits for each chunk. defineModule local so stack never imports layers/index.

import { GENSHIN_GLSL } from "./genshin.glsl.js";

function defineModule({ name, doc, deps = ["layerKit"], glsl, demo, uniforms }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`stack kit incomplete: ${name ?? "?"}`);
  return { name, doc, deps, glsl, demo, uniforms };
}

const DEMO = (fn) => /* glsl */ `vec3 demo(vec2 p, float t) { return ${fn}(p, t); }`;

export const genshinKit = defineModule({
  name: "genshinKit",
  doc: "Genshin lighting grammar: 5-row ramp, face SDF, Sobel rim, hull outline",
  deps: ["layerKit", "silhouette-lock", "ink-weight"],
  glsl: GENSHIN_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return gsStackCast(p, 1.0); }`,
});

const D = (name, doc, body) => defineModule({
  name,
  doc,
  deps: ["layerKit", "genshinKit", "silhouette-lock", "ink-weight", "cel-quantize", "hatch-shadow", "paper-print", "emit-isolate", "stepped-hold"],
  glsl: body,
  demo: DEMO(name),
});

export const STACK_KITS = [
  genshinKit,
  D("gsOutline", "CAST outline hull — indigo, concave thicken",
    /* glsl */ `
  vec3 gsOutline(vec2 p, float t) {
    float d = lyFigD(p);
    vec3 body = gsRamp3(lyNdL(p), 1.0, LY_FILL, LY_MID, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyCover(p));
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.9);
  }`),
  D("gsRamp", "CAST 5-row ramp — cloth row default",
    /* glsl */ `
  vec3 gsRamp(vec2 p, float t) {
    return mix(lyPaper(p) * 0.5, gsRamp3(lyNdL(p), 1.0, LY_FILL, LY_MID, LY_KEY), lyCover(p));
  }`),
  D("gsFaceSdf", "CAST face SDF — cheek sweep, not Lambert",
    /* glsl */ `
  vec3 gsFaceSdf(vec2 p, float t) {
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 skin = gsFaceMix(LY_FILL * 1.08, LY_KEY, q.x, vec2(-0.4, 0.6));
    return mix(lyPaper(p) * 0.5, skin, lyCover(p));
  }`),
  D("gsRimEdge", "FX Sobel rim — silhouette derivative",
    /* glsl */ `
  vec3 gsRimEdge(vec2 p, float t) {
    vec3 body = gsRamp3(lyNdL(p), 1.0, LY_FILL, LY_MID, LY_KEY);
    body = gsRim(body, lyCover(p), LY_KEY);
    return mix(lyPaper(p) * 0.48, body, lyCover(p));
  }`),
  D("gsHold", "CAST hold on twos",
    /* glsl */ `
  vec3 gsHold(vec2 p, float t) {
    float ht = lyHold(t, 12.0);
    vec2 q = p + (vec2(lyHash(vec2(ht, 2.1)), lyHash(vec2(ht, 8.4))) - 0.5) * 0.01;
    return mix(lyPaper(p) * 0.5, gsRamp3(lyNdL(q), 1.0, LY_FILL, LY_MID, LY_KEY), lyCover(q));
  }`),
  D("gsHairRing", "CAST Kajiya-Kay angel ring",
    /* glsl */ `
  vec3 gsHairRing(vec2 p, float t) {
    vec3 N = lyFigN(p);
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    vec3 V = vec3(0.0, 0.1, 1.0);
    vec3 body = gsRamp3(lyNdL(p), 3.0, LY_FILL, LY_MID, LY_KEY);
    body = gsHairMix(body, N, L, V, lyHash(p * 18.0));
    return mix(lyPaper(p) * 0.5, body, lyCover(p));
  }`),
  D("gsPaper", "WORLD paper tooth",
    /* glsl */ `
  vec3 gsPaper(vec2 p, float t) {
    return lyPolice(lyPaper(p) * 0.92);
  }`),
  D("gsPrint", "GRADE print plate",
    /* glsl */ `
  vec3 gsPrint(vec2 p, float t) {
    return lyPrint(gsStackCast(p, 1.0), p);
  }`),
  D("gsNight", "GRADE night lift",
    /* glsl */ `
  vec3 gsNight(vec2 p, float t) {
    return lyNight(gsStackCast(p, 1.0));
  }`),
  D("gsGold", "GRADE gold grade",
    /* glsl */ `
  vec3 gsGold(vec2 p, float t) {
    return lyGold(gsStackCast(p, 1.0));
  }`),
  D("gsHatch", "CAST shadow hatch",
    /* glsl */ `
  vec3 gsHatch(vec2 p, float t) {
    float h = lyNdL(p);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = lyHatchSh(body, gl_FragCoord.xy, 1.0 - h, 7.0);
    return mix(lyPaper(p) * 0.55, body, lyCover(p));
  }`),
  D("gsEmit", "FX emit isolate",
    /* glsl */ `
  vec3 gsEmit(vec2 p, float t) {
    vec3 albedo = gsRamp3(lyNdL(p), 1.0, LY_FILL, LY_MID, LY_KEY);
    float rim = gsRimSobel(lyCover(p));
    return lyEmitOnly(albedo, LY_KEY * rim * 0.7);
  }`),
  D("gsWash", "WORLD pigment wash",
    /* glsl */ `
  vec3 gsWash(vec2 p, float t) {
    vec3 plate = lyPaper(p) * vec3(0.86, 0.90, 0.78);
    return lyPolice(mix(plate, LY_MID * 0.7, lyVn(p * 6.0) * 0.22));
  }`),
  D("gsFluoro", "WORLD school tubes",
    /* glsl */ `
  vec3 gsFluoro(vec2 p, float t) {
    float tube = exp(-pow((p.y - 0.82) * 18.0, 2.0));
    vec3 plate = mix(vec3(0.20, 0.24, 0.34), vec3(0.78, 0.80, 0.62), tube);
    return lyPolice(plate);
  }`),
  D("gsBenday", "GRADE Ben-Day dots",
    /* glsl */ `
  vec3 gsBenday(vec2 p, float t) {
    vec3 body = gsStackCast(p, 1.0);
    vec2 q = mat2(0.966, -0.259, 0.259, 0.966) * gl_FragCoord.xy / 6.0;
    float dot_ = 1.0 - smoothstep(0.30, 0.36, length(fract(q) - 0.5));
    float sh = 1.0 - lyNdL(p);
    return lyPolice(mix(body, LY_INK, dot_ * step(0.35, sh) * 0.35));
  }`),
  D("gsGrey", "GRADE manhwa toner",
    /* glsl */ `
  vec3 gsGrey(vec2 p, float t) {
    vec3 body = gsStackCast(p, 1.0);
    float l = lyLuma(body);
    return lyPolice(mix(LY_INK * 1.4, vec3(0.78, 0.76, 0.72), l));
  }`),
  D("gsInvert", "OCCLUDE time-stop invert, never crush #000",
    /* glsl */ `
  vec3 gsInvert(vec2 p, float t) {
    vec3 body = gsStackCast(p, 1.0);
    vec3 inv = vec3(1.0) - body;
    return lyPolice(mix(body, inv, 0.55));
  }`),
];

export const STACK_KIT_COUNT = 18;
if (STACK_KITS.length !== STACK_KIT_COUNT) {
  throw new Error(`stack kit count ${STACK_KITS.length} != ${STACK_KIT_COUNT}`);
}
