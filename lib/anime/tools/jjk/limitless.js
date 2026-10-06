// Reusable Infinity / cursed-energy aura. Any dock can wrap a figure with this.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "limitless", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const LIMITLESS = [
  D("jjkInfHalt", "halt rings around JJK_C over domain — approach stops at the sphere",
    /* glsl */ `
    vec3 jjkInfHalt(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, 0.55), jjkHalt(p, JJK_C, 0.28));
      return jjkOut(c);
    }`),

  D("jjkInfAura", "jjkAura on domain; dust ticks freeze on the shell, never enter",
    /* glsl */ `
    vec3 jjkInfAura(vec2 p, float t) {
      vec3 plate = jjkDomain(p, t);
      vec3 a = jjkAura(plate, p, t, JJK_C);
      float r = length(p - JJK_C);
      float rad = 0.28;
      float inner = jjkFill(r - rad);
      float shell = jjkHalt(p, JJK_C, rad);
      vec3 c = mix(a, plate, inner * (1.0 - shell));
      float tick = step(0.82, jjkH21(floor(p * 48.0 + t * 3.0)));
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, 0.55), tick * shell);
      return jjkOut(c);
    }`),

  D("jjkInfDust", "halted particle ticks only — frozen on the sphere, no ring wash",
    /* glsl */ `
    vec3 jjkInfDust(vec2 p, float t) {
      vec3 c = jjkOut(JJK_BLUE * 0.14);
      float ht = jjkHold(t, 12.0);
      float r = length(p - JJK_C);
      float rad = 0.28;
      float tick = step(0.86, jjkH21(floor(p * 52.0 + ht)));
      float stopped = (1.0 - jjkFill(r - rad)) * jjkLine(r - rad, 6.0);
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, 0.65), tick * stopped);
      return jjkOut(c);
    }`),

  D("jjkInfShell", "double sphere: outer halt + inner 0.72 scale",
    /* glsl */ `
    vec3 jjkInfShell(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      float r = length(p - JJK_C);
      float rad = 0.28;
      c = mix(c, JJK_BLUE, jjkLine(r - rad, 2.2));
      c = mix(c, JJK_CYAN, jjkLine(r - rad * 0.72, 1.2));
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, 0.4), jjkHalt(p, JJK_C, rad) * 0.35);
      return jjkOut(c);
    }`),

  D("jjkInfPulse", "12fps hold; halt radius steps, never eases",
    /* glsl */ `
    vec3 jjkInfPulse(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      float ht = jjkHold(t, 12.0);
      float rad = 0.12 + floor(fract(ht * 0.4) * 5.0) * 0.045;
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, 0.5), jjkHalt(p, JJK_C, rad));
      return jjkOut(c);
    }`),

  D("jjkInfOnCast", "aura gated to jjkCover — wrap the figure only",
    /* glsl */ `
    vec3 jjkInfOnCast(vec2 p, float t) {
      vec3 plate = jjkDomain(p, t);
      vec3 wrapped = jjkAura(plate, p, t, JJK_C);
      return jjkOut(mix(plate, wrapped, jjkCover(p)));
    }`),

  D("jjkInfSixRim", "cyan silhouette rim on cover disc — contour, not Fresnel",
    /* glsl */ `
    vec3 jjkInfSixRim(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      c = mix(c, mix(JJK_BLUE * 0.55, JJK_CYAN * 0.35, jjkNdL(p)), jjkCover(p));
      c = mix(c, JJK_CYAN, jjkLine(dot(p - JJK_C, p - JJK_C) - 0.13, 2.0));
      return jjkOut(c);
    }`),

  D("jjkInfBlindfoldOff", "limiter off: domain + full aura, figure unmasked",
    /* glsl */ `
    vec3 jjkInfBlindfoldOff(vec2 p, float t) {
      vec3 c = jjkDomain(p, t);
      c = mix(c, mix(JJK_BLUE, JJK_CYAN, jjkNdL(p)), jjkCover(p) * 0.5);
      return jjkAura(c, p, t, JJK_C);
    }`),
];

if (LIMITLESS.length !== 8) throw new Error(`limitless ${LIMITLESS.length} != 8`);
