import { defineModule } from "./define.js";

const p = (name, doc, glsl) => defineModule({
  name, doc, glsl,
  demo: /* glsl */ `vec3 demo(vec2 q, float t) { return ${name}(mix(bkPaper(q) * 0.55, bkCel3(bkNdL(q)), bkCover(q)), q, t); }`,
});

export const PAPER = [
  p("paperGrain", "paper grain: low-frequency pulp tooth, printed stock not CGI snow", /* glsl */ `
  vec3 paperGrain(vec3 col, vec2 q, float t) {
    float g = (bkFbm(q * 11.0) - 0.5) * 0.08 + (bkVn(q * 28.0) - 0.5) * 0.03;
    return bkCap(col * (1.0 + g) * mix(vec3(0.96, 0.94, 0.90), vec3(1.0), 0.7)); }`),
  p("paperBleed", "pigment bleed: chroma seeps a few pixels into the tooth", /* glsl */ `
  vec3 paperBleed(vec3 col, vec2 q, float t) {
    vec2 o = (bkHash2(floor(q * 40.0)) - 0.5) * 0.008;
    vec3 seep = mix(BK_FILL, BK_KEY, bkNdL(q + o));
    float wet = smoothstep(0.35, 0.7, bkFbm(q * 6.0));
    return bkCap(mix(col, seep, wet * 0.28)); }`),
  p("paperMisreg", "misregister: cyan and magenta plates offset a hair, print accident", /* glsl */ `
  vec3 paperMisreg(vec3 col, vec2 q, float t) {
    float c = bkLuma(mix(BK_FILL, BK_KEY, bkNdL(q + vec2(0.004, 0.0))));
    float m = bkLuma(mix(BK_FILL, BK_KEY, bkNdL(q - vec2(0.003, 0.002))));
    return bkCap(vec3(m, col.g, c) * 0.92 + col * 0.18); }`),
  p("paperWeave", "screen weave over paper: two rotated grids as a printed rosette", /* glsl */ `
  vec3 paperWeave(vec3 col, vec2 q, float t) {
    vec2 a = mat2(0.866, -0.5, 0.5, 0.866) * q * 48.0, b = mat2(0.866, 0.5, -0.5, 0.866) * q * 48.0;
    float w = max(1.0 - smoothstep(0.14, 0.22, min(abs(fract(a.x) - 0.5), abs(fract(a.y) - 0.5))),
                 1.0 - smoothstep(0.14, 0.22, min(abs(fract(b.x) - 0.5), abs(fract(b.y) - 0.5))));
    return bkCap(mix(col, col * 0.82, w * 0.22)); }`),
  p("paperTooth", "cold-press tooth: pits that catch pigment, not a noise overlay", /* glsl */ `
  vec3 paperTooth(vec3 col, vec2 q, float t) {
    float pit = smoothstep(0.55, 0.82, bkFbm(q * 14.0));
    return bkCap(mix(col, col * vec3(0.86, 0.82, 0.78), pit * 0.35)); }`),
  p("paperFiber", "laid fiber: long pulp streaks in one direction", /* glsl */ `
  vec3 paperFiber(vec3 col, vec2 q, float t) {
    float f = bkVn(vec2(q.x * 3.0 + q.y * 28.0, q.y * 2.0));
    return bkCap(col * mix(0.92, 1.04, f)); }`),
  p("paperFoxing", "foxing: warm brown age spots, sparse, printed not dirty", /* glsl */ `
  vec3 paperFoxing(vec3 col, vec2 q, float t) {
    float spot = smoothstep(0.72, 0.88, bkFbm(q * 3.2 + 4.0)) * smoothstep(0.55, 0.8, bkVn(q * 7.0));
    return bkCap(mix(col, col * vec3(0.72, 0.52, 0.36), spot * 0.45)); }`),
  p("paperDeckle", "deckle edge: ragged paper rim, AA'd, indigo not black", /* glsl */ `
  vec3 paperDeckle(vec3 col, vec2 q, float t) {
    vec2 uv = vec2(q.x / 1.44, q.y);
    float m = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float ragged = m - 0.03 - (bkFbm(uv * 18.0) - 0.5) * 0.02;
    float edge = 1.0 - smoothstep(0.0, fwidth(ragged) * 2.0, ragged);
    return mix(col, vec3(0.78, 0.74, 0.68), edge); }`),
  p("paperPulp", "pulp clumps: soft value masses in the stock, low frequency", /* glsl */ `
  vec3 paperPulp(vec3 col, vec2 q, float t) {
    float clump = smoothstep(0.4, 0.7, bkFbm(q * 4.5));
    return bkCap(col * mix(0.94, 1.03, clump)); }`),
  p("paperShowThru", "show-through: a faint reverse plate ghosts from the back of the sheet", /* glsl */ `
  vec3 paperShowThru(vec3 col, vec2 q, float t) {
    float ghost = bkCel3(bkNdL(vec2(1.44 - q.x, q.y))).r;
    return bkCap(mix(col, BK_INK * 2.2, (1.0 - ghost) * 0.08)); }`),
  p("paperCockle", "cockle: wet-stretch warp of UVs, pigment follows the buckle", /* glsl */ `
  vec3 paperCockle(vec3 col, vec2 q, float t) {
    vec2 w = vec2(bkFbm(q * 3.0) - 0.5, bkFbm(q * 3.0 + 8.0) - 0.5) * 0.02;
    return bkCap(mix(col, bkCel3(bkNdL(q + w)), 0.35)); }`),
  p("paperLaid", "laid lines: parallel chain lines of handmade stock", /* glsl */ `
  vec3 paperLaid(vec3 col, vec2 q, float t) {
    float laid = 1.0 - smoothstep(0.35, 0.5, abs(fract(q.y * 22.0) - 0.5) * 2.0);
    float chain = 1.0 - smoothstep(0.4, 0.55, abs(fract(q.x * 4.0) - 0.5) * 2.0);
    return bkCap(col * (1.0 - laid * 0.06 - chain * 0.04)); }`),
  p("paperWove", "wove: a fine even mesh, quieter than laid", /* glsl */ `
  vec3 paperWove(vec3 col, vec2 q, float t) {
    float mesh = 0.5 * (sin(q.x * 90.0) * sin(q.y * 90.0)) + 0.5;
    return bkCap(col * mix(0.97, 1.02, mesh)); }`),
  p("paperNews", "newsprint: grey stock, visible fiber, slight yellowing", /* glsl */ `
  vec3 paperNews(vec3 col, vec2 q, float t) {
    float fiber = bkVn(vec2(q.x * 40.0, q.y * 8.0));
    vec3 stock = vec3(0.78, 0.74, 0.64);
    return bkCap(mix(col * stock / 0.85, col, 0.35) * mix(0.94, 1.02, fiber)); }`),
  p("paperCelDust", "cel dust: sparse specks on a painted cel, held on twos", /* glsl */ `
  vec3 paperCelDust(vec3 col, vec2 q, float t) {
    float hold = bkHold(t, 12.0);
    float speck = step(0.992, bkHash(floor(q * 180.0) + hold));
    return mix(col, vec3(0.86, 0.84, 0.80), speck); }`),
  p("paperGate", "gate weave: a 12fps vertical hold jitter of the whole plate", /* glsl */ `
  vec3 paperGate(vec3 col, vec2 q, float t) {
    vec2 j = vec2(0.0, (bkHash(vec2(bkHold(t, 12.0), 3.0)) - 0.5) * 0.006);
    return bkCap(mix(col, bkCel3(bkNdL(q + j)), bkCover(q + j) * 0.4)); }`),
  p("paperHalation", "halation: a warm fringe on the key edge, not bloom, under the luma cap", /* glsl */ `
  vec3 paperHalation(vec3 col, vec2 q, float t) {
    float h = bkNdL(q);
    float fringe = bkBand(h, 0.68, 0.78);
    return bkCap(mix(col, vec3(0.88, 0.70, 0.48), fringe * 0.35)); }`),
  p("paperOffset", "offset: CMY plates slightly sheared, a press miss", /* glsl */ `
  vec3 paperOffset(vec3 col, vec2 q, float t) {
    float y = bkLuma(bkCel3(bkNdL(q + vec2(0.0, 0.003))));
    return bkCap(vec3(col.r, mix(col.g, y, 0.35), mix(col.b, bkLuma(col), 0.2))); }`),
  p("paperPlate", "plate wear: worn patches where the ink sits thinner", /* glsl */ `
  vec3 paperPlate(vec3 col, vec2 q, float t) {
    float wear = smoothstep(0.6, 0.85, bkFbm(q * 2.4 + 1.7));
    return bkCap(mix(col, mix(col, bkPaper(q), 0.4), wear * 0.5)); }`),
  p("paperSoak", "ink soak: darks feather into the fiber, a wet print", /* glsl */ `
  vec3 paperSoak(vec3 col, vec2 q, float t) {
    float L = bkLuma(col);
    float soak = (1.0 - L) * smoothstep(0.3, 0.7, bkFbm(q * 8.0));
    return bkCap(mix(col, BK_INK * 2.0, soak * 0.22)); }`),
];
