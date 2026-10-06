import { defineModule } from "./define.js";

export const LINES = [
  defineModule({
    name: "linePanel15", doc: "1.5px panel rule: a constant-pixel frame in indigo",
    glsl: /* glsl */ `
  float linePanel15(vec2 uv) {
    float m = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    return 1.0 - smoothstep(0.0, fwidth(m) * 1.5 + 1e-5, m - 0.012); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), linePanel15(vec2(p.x / 1.44, p.y))); }`,
  }),
  defineModule({
    name: "lineSpeedRadial", doc: "radial speedlines from a focus, density falls with radius",
    glsl: /* glsl */ `
  float lineSpeedRadial(vec2 p, vec2 at, float n) {
    vec2 q = p - at; float a = atan(q.y, q.x), r = length(q);
    float spoke = 1.0 - smoothstep(0.04, 0.14, abs(fract(a * n) - 0.5));
    return spoke * smoothstep(0.04, 0.12, r) * (1.0 - smoothstep(0.55, 0.95, r)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.55), lineSpeedRadial(p, vec2(0.72, 0.5), 28.0)); }`,
  }),
  defineModule({
    name: "lineFocus", doc: "focus lines: longer rays, a hole in the middle for the subject",
    glsl: /* glsl */ `
  float lineFocus(vec2 p, vec2 at) {
    vec2 q = p - at; float a = atan(q.y, q.x), r = length(q), id = floor(a * 22.0);
    float spoke = 1.0 - smoothstep(0.03, 0.1, abs(fract(a * 22.0 + bkHash(vec2(id, 3.0)) * 0.2) - 0.5));
    return spoke * smoothstep(0.16, 0.28, r) * (1.0 - smoothstep(0.7, 1.1, r)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.6, bkCel3(bkNdL(p)), bkCover(p) * 0.7), lineFocus(p, vec2(0.72, 0.5))); }`,
  }),
  defineModule({
    name: "lineGutter", doc: "gutter: a paper gap between two panel rules",
    glsl: /* glsl */ `
  float lineGutter(vec2 uv, float x) {
    float g = abs(uv.x - x), w = fwidth(g) + 1e-5;
    return (1.0 - smoothstep(0.0, w * 1.4, abs(g - 0.022))) + (1.0 - smoothstep(0.0, w * 1.4, abs(g + 0.022))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec2 uv = vec2(p.x / 1.44, p.y);
    vec3 c = mix(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), mix(bkPaper(p + 0.2) * 0.5, bkWarmCool(bkNdL(p)), 0.4), bkAA(uv.x, 0.5));
    c = mix(c, bkPaper(p), 1.0 - smoothstep(0.0, 0.02, abs(uv.x - 0.5)));
    return bkMixInk(c, lineGutter(uv, 0.5)); }`,
  }),
  defineModule({
    name: "lineSpeedHoriz", doc: "horizontal speedlines: motion to the right, thicker near the subject",
    glsl: /* glsl */ `
  float lineSpeedHoriz(vec2 p) {
    float row = floor(p.y * 40.0);
    float keep = step(0.35, bkHash(vec2(row, 4.0)));
    float thin = 1.0 - smoothstep(0.0, 0.008, abs(fract(p.y * 40.0) - 0.5) * 0.04);
    return thin * keep * smoothstep(0.15, 0.4, p.x) * (1.0 - smoothstep(1.1, 1.4, p.x)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.5), lineSpeedHoriz(p)); }`,
  }),
  defineModule({
    name: "lineSpeedVert", doc: "vertical speedlines: a drop or rise, not a hatch",
    glsl: /* glsl */ `
  float lineSpeedVert(vec2 p) {
    float col = floor(p.x * 36.0);
    float thin = 1.0 - smoothstep(0.08, 0.22, abs(fract(p.x * 36.0) - 0.5));
    return thin * step(0.4, bkHash(vec2(col, 8.0))) * smoothstep(0.08, 0.25, p.y) * (1.0 - smoothstep(0.8, 1.0, p.y)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.45), lineSpeedVert(p)); }`,
  }),
  defineModule({
    name: "lineBurst", doc: "burst: short radial ticks around a hit, 12fps hold safe",
    glsl: /* glsl */ `
  float lineBurst(vec2 p, vec2 at, float t) {
    float hold = bkHold(t, 12.0);
    vec2 q = p - at; float a = atan(q.y, q.x), r = length(q), id = floor(a * 16.0 + hold);
    float spoke = 1.0 - smoothstep(0.06, 0.18, abs(fract(a * 16.0) - 0.5));
    return spoke * bkBand(r, 0.12, 0.12 + 0.04 + 0.05 * bkHash(vec2(id, hold))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineBurst(p, vec2(0.72, 0.5), t)); }`,
  }),
  defineModule({
    name: "lineImpact", doc: "impact ring: a hard shock ellipse, fwidth AA",
    glsl: /* glsl */ `
  float lineImpact(vec2 p, vec2 at, float r, float px) {
    float d = abs(length((p - at) / vec2(1.15, 0.85)) - r);
    return 1.0 - smoothstep(0.0, fwidth(d) * px + 1e-5, d); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), max(lineImpact(p, vec2(0.72, 0.5), 0.42, 2.0), lineImpact(p, vec2(0.72, 0.5), 0.30, 1.2))); }`,
  }),
  defineModule({
    name: "lineTrail", doc: "action trail: smeared afterimages held on twos",
    glsl: /* glsl */ `
  vec3 lineTrail(vec3 col, vec2 p, float t) {
    vec3 acc = col;
    for (int i = 1; i <= 3; i++) {
      vec2 o = vec2(-0.04 * float(i), 0.0);
      acc = mix(acc, bkCel3(bkNdL(p - o)) * 0.85, bkCover(p - o) * (0.35 / float(i)));
    }
    return bkCap(acc); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return lineTrail(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), p, t); }`,
  }),
  defineModule({
    name: "lineVanishing", doc: "vanishing-point rays: perspective speed, not radial from centre",
    glsl: /* glsl */ `
  float lineVanishing(vec2 p, vec2 vp) {
    vec2 q = p - vp; float spoke = 1.0 - smoothstep(0.035, 0.12, abs(fract(atan(q.y, q.x) * 18.0) - 0.5));
    return spoke * smoothstep(0.08, 0.2, length(q)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.4), lineVanishing(p, vec2(1.15, 0.55))); }`,
  }),
  defineModule({
    name: "lineZip", doc: "zip lines: staggered dashes racing across the frame",
    glsl: /* glsl */ `
  float lineZip(vec2 p) {
    float row = floor(p.y * 22.0);
    float u = fract(p.x * 6.0 + row * 0.37);
    return (1.0 - smoothstep(0.45, 0.7, u)) * step(0.4, bkHash(vec2(row, 2.0))) * (1.0 - smoothstep(0.0, 0.03, abs(fract(p.y * 22.0) - 0.5))); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.4), lineZip(p)); }`,
  }),
  defineModule({
    name: "lineSlash", doc: "slash: one diagonal cut with AA, a panel action mark",
    glsl: /* glsl */ `
  float lineSlash(vec2 p, float px) {
    float d = abs((p.x - 0.4) * 0.7 - (p.y - 0.2));
    return (1.0 - smoothstep(0.0, fwidth(d) * px + 1e-5, d)) * smoothstep(0.1, 0.2, p.y) * (1.0 - smoothstep(0.8, 0.95, p.y)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineSlash(p, 2.4)); }`,
  }),
  defineModule({
    name: "lineCircleFocus", doc: "circle focus: concentric rules around the subject",
    glsl: /* glsl */ `
  float lineCircleFocus(vec2 p, vec2 at) {
    float r = length(p - at), ring = abs(fract(r * 8.0) - 0.5);
    return (1.0 - smoothstep(0.18, 0.32, ring)) * smoothstep(0.12, 0.2, r) * (1.0 - smoothstep(0.55, 0.75, r)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.65), lineCircleFocus(p, vec2(0.72, 0.5))); }`,
  }),
  defineModule({
    name: "lineCorner", doc: "corner ticks: four panel registration marks",
    glsl: /* glsl */ `
  float lineCorner(vec2 uv, float px) {
    vec2 d = min(uv, 1.0 - uv);
    float arm = min(d.x, d.y);
    float tick = step(d.x, 0.07) * step(d.y, 0.07);
    return (1.0 - smoothstep(0.0, fwidth(arm) * px + 1e-5, abs(arm - 0.03))) * tick; }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineCorner(vec2(p.x / 1.44, p.y), 1.6)); }`,
  }),
  defineModule({
    name: "lineCaption", doc: "caption rule: a thin bar in the lower third, paper-safe",
    glsl: /* glsl */ `
  float lineCaption(vec2 uv) {
    float y = abs(uv.y - 0.14), x = smoothstep(0.08, 0.16, uv.x) * (1.0 - smoothstep(0.84, 0.92, uv.x));
    return (1.0 - smoothstep(0.0, fwidth(y) * 1.4 + 1e-5, y)) * x; }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineCaption(vec2(p.x / 1.44, p.y))); }`,
  }),
  defineModule({
    name: "lineDoubleRule", doc: "double rule: two parallel panel lines, a printed border",
    glsl: /* glsl */ `
  float lineDoubleRule(vec2 uv) {
    float m = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float w = fwidth(m) * 1.3 + 1e-5;
    return max(1.0 - smoothstep(0.0, w, abs(m - 0.018)), (1.0 - smoothstep(0.0, w, abs(m - 0.032))) * 0.7); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineDoubleRule(vec2(p.x / 1.44, p.y))); }`,
  }),
  defineModule({
    name: "lineFadeEdge", doc: "fade edge: vignette rule that dissolves into paper, not a black card",
    glsl: /* glsl */ `
  vec3 lineFadeEdge(vec3 col, vec2 uv) {
    vec2 d = uv - 0.5;
    float v = smoothstep(0.42, 0.22, dot(d, d) * 2.2);
    return mix(bkPaper(uv) * 0.7, col, v); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return lineFadeEdge(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), vec2(p.x / 1.44, p.y)); }`,
  }),
  defineModule({
    name: "lineAction", doc: "action streaks: short hashes that lean with motion, 12fps hold",
    glsl: /* glsl */ `
  float lineAction(vec2 p, float t) {
    float hold = bkHold(t, 12.0);
    vec2 i = floor(p * 18.0);
    vec2 o = bkHash2(i + hold) - 0.5;
    float u = abs(dot(p * 18.0 - i - o, normalize(vec2(1.0, 0.25))));
    return (1.0 - smoothstep(0.06, 0.18, u)) * step(0.62, bkHash(i + 3.0)) * (1.0 - bkCover(p)); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.58, bkCel3(bkNdL(p)), bkCover(p) * 0.7), lineAction(p, t)); }`,
  }),
  defineModule({
    name: "lineSfx", doc: "sfx burst: a starburst of short ink ticks, held on twos",
    glsl: /* glsl */ `
  float lineSfx(vec2 p, vec2 at, float t) {
    float hold = bkHold(t, 12.0);
    vec2 q = p - at; float a = atan(q.y, q.x), r = length(q);
    float n = 12.0 + floor(bkHash(vec2(hold, 1.0)) * 4.0);
    float spoke = 1.0 - smoothstep(0.05, 0.16, abs(fract(a * n) - 0.5));
    return spoke * bkBand(r, 0.18, 0.34); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineSfx(p, vec2(0.72, 0.5), t)); }`,
  }),
  defineModule({
    name: "lineHoldFrame", doc: "hold-frame rule: a 12fps vibrating panel border from hashed offsets",
    glsl: /* glsl */ `
  float lineHoldFrame(vec2 uv, float t) {
    vec2 j = (bkHash2(vec2(bkHold(t, 12.0), 6.0)) - 0.5) * 0.006;
    float m = min(min(uv.x + j.x, 1.0 - uv.x - j.x), min(uv.y + j.y, 1.0 - uv.y - j.y));
    return 1.0 - smoothstep(0.0, fwidth(m) * 1.6 + 1e-5, m - 0.02); }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return bkMixInk(mix(bkPaper(p) * 0.55, bkCel3(bkNdL(p)), bkCover(p)), lineHoldFrame(vec2(p.x / 1.44, p.y), t)); }`,
  }),
];
