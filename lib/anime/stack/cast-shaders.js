// Named CAST stacks. Each one is ramp + face + outline + rim + one extra.
// Depth on the figure. defineModule is local so this file never imports layers/index.

function defineModule({ name, doc, deps = ["layerKit"], glsl, demo, uniforms }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`stack kit incomplete: ${name ?? "?"}`);
  return { name, doc, deps, glsl, demo, uniforms };
}

const DEPS = [
  "layerKit",
  "genshinKit",
  "silhouette-lock",
  "ink-weight",
  "cel-quantize",
  "hatch-shadow",
  "paper-print",
  "emit-isolate",
  "stepped-hold",
];

const DEMO = (fn) => /* glsl */ `vec3 demo(vec2 p, float t) { return ${fn}(p, t); }`;

const D = (name, doc, body) => defineModule({
  name,
  doc,
  deps: DEPS,
  glsl: body,
  demo: DEMO(name),
});

export const CAST_SHADERS = [
  D("gsClothRampFace", "CAST cloth row — weave extra on the mid plate",
    /* glsl */ `
  vec3 gsClothRampFace(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = LY_FILL * vec3(0.92, 0.96, 1.08);
    vec3 mid = LY_MID * vec3(0.90, 0.94, 1.04);
    vec3 body = gsRamp3(h, 1.0, fill, mid, LY_KEY);
    body = mix(body, gsFaceMix(fill * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    float weave = lyVn(p * 22.0);
    body = mix(body, mid, weave * (1.0 - h) * 0.18);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.88);
  }`),

  D("gsSkinRampFace", "CAST skin row — cheek SDF extra, not Lambert facets",
    /* glsl */ `
  vec3 gsSkinRampFace(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.40, 0.24, 0.30);
    vec3 mid = vec3(0.70, 0.50, 0.44);
    vec3 key = vec3(0.88, 0.70, 0.58);
    vec3 body = gsRamp3(h, 0.0, fill, mid, key);
    float cheek = gsFaceLit(q.x, vec2(-0.40, 0.60));
    body = mix(body, gsFaceMix(fill * 1.08, key, q.x, vec2(-0.40, 0.60)), step(q.y, 0.22) * cover);
    body = mix(body, key, cheek * step(q.y, 0.08) * cover * 0.22);
    body = gsRim(body, cover, key);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
  }`),

  D("gsMetalRamp", "CAST metal row — half-Lambert punch extra",
    /* glsl */ `
  vec3 gsMetalRamp(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    vec3 N = lyFigN(p);
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    float h = gsHalfL(N, L);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.22, 0.26, 0.34);
    vec3 mid = vec3(0.48, 0.52, 0.58);
    vec3 key = vec3(0.78, 0.80, 0.84);
    vec3 body = gsRamp3(h, 2.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.04, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.12) * cover);
    body = mix(body, key, lyAA(h, 0.78) * 0.28);
    body = gsRim(body, cover, key);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.90);
  }`),

  D("gsHairRowRing", "CAST hair row — Kajiya-Kay angel ring extra",
    /* glsl */ `
  vec3 gsHairRowRing(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 N = lyFigN(p);
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    vec3 V = vec3(0.0, 0.1, 1.0);
    vec3 fill = vec3(0.20, 0.18, 0.32);
    vec3 mid = vec3(0.38, 0.28, 0.42);
    vec3 key = vec3(0.64, 0.50, 0.42);
    vec3 body = gsRamp3(h, 3.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.06, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.10) * cover);
    body = gsHairMix(body, N, L, V, lyHash(p * 18.0));
    body = gsRim(body, cover, key);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.90);
  }`),

  D("gsSchoolFluoroCast", "CAST school tubes — fluoro plate extra",
    /* glsl */ `
  vec3 gsSchoolFluoroCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    float tube = exp(-pow((p.y - 0.82) * 18.0, 2.0));
    vec3 room = mix(vec3(0.20, 0.24, 0.34), vec3(0.78, 0.80, 0.62), tube);
    vec3 plate = mix(lyPolice(room), body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
  }`),

  D("gsJojoHatchCast", "CAST JoJo hatch — shadow strokes extra",
    /* glsl */ `
  vec3 gsJojoHatchCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = lyHatchSh(body, gl_FragCoord.xy, 1.0 - h, 7.0);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.55, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.90);
  }`),

  D("gsFateGoldCast", "CAST Fate gold — print-gold grade extra",
    /* glsl */ `
  vec3 gsFateGoldCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.28, 0.18, 0.16);
    vec3 mid = vec3(0.62, 0.42, 0.24);
    vec3 key = vec3(0.90, 0.68, 0.36);
    vec3 body = gsRamp3(h, 2.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.08, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, key);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
    return lyGold(plate);
  }`),

  D("gsMythNightCast", "CAST myth night — night lift extra",
    /* glsl */ `
  vec3 gsMythNightCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = LY_FILL * vec3(0.78, 0.82, 1.06);
    vec3 mid = LY_MID * vec3(0.80, 0.84, 1.04);
    vec3 body = gsRamp3(h, 1.0, fill, mid, LY_KEY);
    body = mix(body, gsFaceMix(fill * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY * vec3(0.82, 0.86, 1.04));
    vec3 plate = mix(lyPaper(p) * 0.45, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.88);
    return lyNight(plate);
  }`),

  D("gsManhwaGreyCast", "CAST manhwa toner — grey plate extra",
    /* glsl */ `
  vec3 gsManhwaGreyCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.88);
    float l = lyLuma(plate);
    return lyPolice(mix(LY_INK * 1.4, vec3(0.78, 0.76, 0.72), l));
  }`),

  D("gsGhibliWashCast", "CAST Ghibli wash — pigment paper extra",
    /* glsl */ `
  vec3 gsGhibliWashCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.28, 0.36, 0.28);
    vec3 mid = vec3(0.52, 0.58, 0.40);
    vec3 key = vec3(0.78, 0.74, 0.52);
    vec3 body = gsRamp3(h, 1.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.08, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, key);
    vec3 wash = lyPaper(p) * vec3(0.86, 0.90, 0.78);
    wash = mix(wash, mid * 0.7, lyVn(p * 6.0) * 0.22);
    vec3 plate = mix(lyPolice(wash), body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.78);
  }`),

  D("gsHeroBendayCast", "CAST hero Ben-Day — screen dots extra",
    /* glsl */ `
  vec3 gsHeroBendayCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
    vec2 dots = mat2(0.966, -0.259, 0.259, 0.966) * gl_FragCoord.xy / 6.0;
    float dot_ = 1.0 - smoothstep(0.30, 0.36, length(fract(dots) - 0.5));
    return lyPolice(mix(plate, LY_INK, dot_ * step(0.35, 1.0 - h) * 0.35));
  }`),

  D("gsBleachDuskCast", "CAST Bleach dusk — orange-on-indigo plate extra",
    /* glsl */ `
  vec3 gsBleachDuskCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.16, 0.22, 0.40);
    vec3 mid = vec3(0.40, 0.32, 0.38);
    vec3 key = vec3(0.86, 0.62, 0.40);
    vec3 body = gsRamp3(h, 1.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.08, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, key);
    vec3 dusk = mix(vec3(0.20, 0.22, 0.42), vec3(0.86, 0.52, 0.32), lyAA(p.y, 0.42));
    vec3 plate = mix(lyPolice(dusk * 0.8), body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.88);
  }`),

  D("gsSlimeEmitCast", "CAST slime emit — rim glow rides uEmit",
    /* glsl */ `
  vec3 gsSlimeEmitCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 fill = vec3(0.18, 0.32, 0.30);
    vec3 mid = vec3(0.32, 0.56, 0.48);
    vec3 key = vec3(0.58, 0.80, 0.68);
    vec3 body = gsRamp3(h, 1.0, fill, mid, key);
    body = mix(body, gsFaceMix(fill * 1.08, key, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, key);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.84);
    float rim = gsRimSobel(cover);
    vec3 glow = key * rim * 0.70;
    return lyEmitOnly(plate, glow);
  }`),

  D("gsTvCartoonCast", "CAST TV cartoon — 3-step cel extra",
    /* glsl */ `
  vec3 gsTvCartoonCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = mix(body, lyCel(h, 3.0), 0.55);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.90);
  }`),

  D("gsHoldTwosCast", "CAST hold on twos — 12 fps jitter extra",
    /* glsl */ `
  vec3 gsHoldTwosCast(vec2 p, float t) {
    float ht = lyHold(t, 12.0);
    vec2 q = p + (vec2(lyHash(vec2(ht, 2.1)), lyHash(vec2(ht, 8.4))) - 0.5) * 0.01;
    float d = lyFigD(q);
    float cover = lyCover(q);
    float h = lyNdL(q);
    vec2 f = (q - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, f.x, vec2(-0.45, 0.55)), step(f.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(q)) * 0.88);
  }`),

  D("gsSobelRimCast", "CAST Sobel rim — silhouette derivative extra",
    /* glsl */ `
  vec3 gsSobelRimCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    float rim = gsRimSobel(cover);
    body = lyPolice(mix(body, min(LY_KEY, vec3(LY_CAP)), rim * 0.35));
    vec3 plate = mix(lyPaper(p) * 0.48, body, cover);
    return mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.84);
  }`),

  D("gsHullConcaveCast", "CAST concave hull — outline width extra",
    /* glsl */ `
  vec3 gsHullConcaveCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    float cave = lyConcave(p);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.50, body, cover);
    float hull = gsHullW(d, cave) * mix(0.88, 1.0, clamp(cave * 8.0, 0.0, 1.0));
    return mix(plate, LY_INK, hull);
  }`),

  D("gsPrintGradeCast", "CAST print grade — magenta/green split extra",
    /* glsl */ `
  vec3 gsPrintGradeCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
    return lyPrint(plate, p);
  }`),

  D("gsInvertStopCast", "CAST time-stop invert — never crush #000",
    /* glsl */ `
  vec3 gsInvertStopCast(vec2 p, float t) {
    float d = lyFigD(p);
    float cover = lyCover(p);
    float h = lyNdL(p);
    vec2 q = (p - lyFigC()) / max(lyFigR(), 1e-4);
    vec3 body = gsRamp3(h, 1.0, LY_FILL, LY_MID, LY_KEY);
    body = mix(body, gsFaceMix(LY_FILL * 1.05, LY_KEY, q.x, vec2(-0.45, 0.55)), step(q.y, 0.15) * cover);
    body = gsRim(body, cover, LY_KEY);
    vec3 plate = mix(lyPaper(p) * 0.52, body, cover);
    plate = mix(plate, LY_INK, gsHullW(d, lyConcave(p)) * 0.86);
    vec3 inv = vec3(1.0) - plate;
    return lyPolice(mix(plate, inv, 0.55));
  }`),

  D("gsFullCoreCast", "CAST full core — gsStackCast then print tooth",
    /* glsl */ `
  vec3 gsFullCoreCast(vec2 p, float t) {
    float row = gsRow(1.0);
    vec3 core = gsStackCast(p, row);
    return lyPolice(mix(core, lyPrint(core, p), 0.16));
  }`),
];

export const CAST_SHADER_COUNT = 20;
if (CAST_SHADERS.length !== CAST_SHADER_COUNT) {
  throw new Error(`cast shader count ${CAST_SHADERS.length} != ${CAST_SHADER_COUNT}`);
}
