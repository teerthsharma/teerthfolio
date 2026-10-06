// Family — Hollow Purple collision (8). Lapse Blue, Reversal Red, imaginary mass.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "hollow", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const HOLLOW = [
  D("jjkLapseBlue", "Lapse Blue orb at (0.58, 0.48) — attraction well, not a flare",
    /* glsl */ `
    vec3 jjkLapseBlue(vec2 p, float t) {
      vec2 c0 = vec2(0.58, 0.48);
      vec3 c = jjkDomain(p, t);
      float well = jjkFill(length(p - c0) - 0.12);
      c = mix(c, jjkBlue(p, c0), well);
      c = mix(c, JJK_BLUE, jjkLine(length(p - c0) - 0.15, 1.8) * 0.4);
      return jjkOut(c);
    }`),

  D("jjkReversalRed", "Reversal Red orb at (0.86, 0.48) — repulsion well, not Blue",
    /* glsl */ `
    vec3 jjkReversalRed(vec2 p, float t) {
      vec2 c0 = vec2(0.86, 0.48);
      vec3 c = jjkDomain(p, t);
      float well = jjkFill(length(p - c0) - 0.12);
      c = mix(c, jjkRed(p, c0), well);
      c = mix(c, JJK_FLARE, jjkLine(length(p - c0) - 0.15, 1.8) * 0.45);
      return jjkOut(c);
    }`),

  D("jjkPurpleCore", "Hollow Purple naming sphere at JJK_C — 4 ndv bands, no caption",
    /* glsl */ `
    vec3 jjkPurpleCore(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      float ndv = clamp(1.0 - length(jjkN(p)) * 2.6, 0.0, 1.0);
      c = mix(c, jjkPurple(p, t, JJK_C), jjkAA(ndv, 0.04));
      return jjkOut(c);
    }`),

  D("jjkPurpleCollide", "Blue and Red still visible; Purple born at the midpoint",
    /* glsl */ `
    vec3 jjkPurpleCollide(vec2 p, float t) {
      vec2 bl = vec2(0.58, 0.48), rd = vec2(0.86, 0.48), mid = vec2(0.72, 0.48);
      vec3 c = jjkDomain(p, t);
      c = mix(c, jjkBlue(p, bl), jjkFill(length(p - bl) - 0.11));
      c = mix(c, jjkRed(p, rd), jjkFill(length(p - rd) - 0.11));
      c = mix(c, jjkPurple(p, t, mid), jjkFill(length(p - mid) - 0.13));
      float seam = jjkLine(p.x - mid.x, 2.0) * jjkFill(abs(p.y - mid.y) - 0.10);
      c = mix(c, JJK_VIOLET, seam * 0.5);
      return jjkOut(c);
    }`),

  D("jjkPurpleTunnel", "concentric erase rings — jjkLine on fract radius, not a worm call",
    /* glsl */ `
    vec3 jjkPurpleTunnel(vec2 p, float t) {
      vec2 q = jjkN(p);
      float r = length(q);
      float rr = r * 8.0 - t * 2.2;
      float cell = fract(rr);
      vec3 c = jjkDomain(p, t);
      c = mix(c, JJK_DEEP, jjkFill(cell - 0.22) * 0.72);
      c = mix(c, JJK_VIOLET, jjkLine(cell - 0.5, 2.2));
      c = mix(c, JJK_FLARE, jjkLine(cell - 0.5, 1.0) * 0.35);
      c = mix(c, JJK_INK, jjkFill(r - 0.05));
      return jjkOut(c);
    }`),

  D("jjkPurpleFlare", "star-flare plus dusted ring, halo JJK_FLARE — impact, not the kill",
    /* glsl */ `
    vec3 jjkPurpleFlare(vec2 p, float t) {
      vec2 q = abs(jjkN(p));
      float r = length(jjkN(p));
      float s = (sqrt(q.x) + sqrt(q.y)) / sqrt(0.22);
      float star = pow(clamp(1.0 - s, 0.0, 1.0), 1.6);
      float ring = jjkLine(r - 0.18, 2.4);
      float dust = step(0.78, jjkH21(floor(p * 52.0 + jjkHold(t, 12.0) * 2.4)));
      dust *= jjkFill(r - 0.28) * (1.0 - jjkFill(r - 0.10));
      vec3 c = jjkDomain(p, t);
      float ndv = clamp(1.0 - r * 2.6, 0.0, 1.0);
      c = mix(c, jjkPurple(p, t, JJK_C), jjkAA(ndv, 0.08) * 0.55);
      c = mix(c, JJK_VIOLET, star * 0.72);
      c = mix(c, JJK_FLARE, star * 0.55 + ring * 0.65);
      c = mix(c, JJK_FLARE, dust * 0.40);
      return jjkOut(c);
    }`),

  D("jjkBlueBolt", "Lapse Blue with cyan bolt fringe — jagged, not a smooth halo",
    /* glsl */ `
    vec3 jjkBlueBolt(vec2 p, float t) {
      vec2 c0 = vec2(0.58, 0.48);
      vec2 q = p - c0;
      vec3 c = jjkDomain(p, t);
      c = mix(c, jjkBlue(p, c0), jjkFill(length(q) - 0.12));
      float jag = jjkVn(q * 12.0 + t) * 0.02;
      float bolt = jjkLine(abs(q.y) - 0.01 - jag, 1.4) * (1.0 - jjkAA(abs(q.x), 0.22));
      float ang = atan(q.y, q.x);
      float ray = jjkLine(abs(sin(ang * 3.0 + t)) - 0.08, 1.2);
      ray *= jjkFill(length(q) - 0.26) * (1.0 - jjkFill(length(q) - 0.06));
      c = mix(c, JJK_CYAN, bolt * 0.7);
      c = mix(c, JJK_CYAN, ray * 0.45);
      return jjkOut(c);
    }`),

  D("jjkHollowKill", "Blue+Red collision still: kit jjkKill, no letters",
    /* glsl */ `
    vec3 jjkHollowKill(vec2 p, float t) {
      return jjkKill(p, t);
    }`),
];

if (HOLLOW.length !== 8) throw new Error(`jjk hollow count ${HOLLOW.length} != 8`);
