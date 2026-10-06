// Family 4 — loop / deja-vu smear / cycle tick (5). Möbius, smear, clock, echo, knot.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "izanami", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const IZANAMI = [
  D("mythIzanamiLoop", "Möbius ribbon: theta identifies with a half-period v-flip",
    /* glsl */ `
    vec3 mythIzanamiLoop(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float u = fract(pol.y / 6.2831853 + t * 0.04);
      float v = clamp(pol.x * 2.4, 0.0, 1.0);
      float twist = mix(v, 1.0 - v, step(0.5, u));
      float band = myBand(twist, 0.32, 0.68);
      vec3 c = mix(MY_INDIGO, MY_SKYRED, twist);
      c = mix(c, MY_SEAL, band);
      c = mix(c, MY_INK, myLine(pol.x - 0.38, 1.6) * myFill(pol.x - 0.40));
      return myOut(c);
    }`),

  D("mythDejaVuSmear", "spatial stand-in for temporal smear: three offset samples of a seal plate",
    /* glsl */ `
    vec3 mythDejaVuSmear(vec2 p, float t) {
      float hold = myHold(t, 8.0);
      float n0 = myFbm(myWarp(p * 2.2, 0.3) + hold * 0.15);
      float n1 = myFbm(myWarp((p + vec2(0.014, -0.007)) * 2.2, 0.3) + hold * 0.15);
      float n2 = myFbm(myWarp((p - vec2(0.009, 0.011)) * 2.2, 0.3) + hold * 0.15);
      vec3 c0 = myMix3(n0, MY_INDIGO, MY_CINNABAR, MY_SEAL);
      vec3 c1 = myMix3(n1, MY_INDIGO, MY_CINNABAR, MY_SEAL);
      vec3 c2 = myMix3(n2, MY_INDIGO, MY_CINNABAR, MY_SEAL);
      vec3 c = mix(mix(c0, c1, 0.42), c2, 0.28);
      c = mix(c, MY_INK, myLine(length(p - MY_C) - 0.32, 1.4) * 0.65);
      return myOut(c);
    }`),

  D("mythCycleTick", "polar clock ticks plus a rotating hand — discrete cycle, not a smear",
    /* glsl */ `
    vec3 mythCycleTick(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float ticks = (1.0 - smoothstep(0.02, 0.055, mySaw(pol.y, 12.0))) * myBand(pol.x, 0.28, 0.36);
      float handA = myHold(t, 6.0) * 1.0471976;
      float ha = pol.y - handA;
      float hand = myFill(mySeg(p - MY_C, vec2(0.0), vec2(cos(handA), sin(handA)) * 0.30) - 0.012);
      vec3 c = mix(MY_INDIGO, MY_SOOT, myFill(pol.x - 0.38));
      c = mix(c, MY_SEAL, ticks);
      c = mix(c, MY_CINNABAR, hand);
      c = mix(c, MY_INK, myLine(pol.x - 0.38, 1.7));
      return myOut(c);
    }`),

  D("mythLoopEcho", "concentric phase rings sin(r - t) — echo, not a Möbius twist",
    /* glsl */ `
    vec3 mythLoopEcho(vec2 p, float t) {
      float r = length(p - MY_C);
      float wave = 0.5 + 0.5 * sin(r * 22.0 - t * 3.2);
      float rings = myCelN(wave, 4.0);
      vec3 c = myMix3(rings, MY_INDIGO, MY_SKYRED, MY_SEAL);
      c = mix(c, MY_INK, myLine(r - 0.36, 1.5) * 0.7);
      return myOut(c);
    }`),

  D("mythFateKnot", "trefoil / Lissajous tube — parametric knot, not concentric echoes",
    /* glsl */ `
    vec3 mythFateKnot(vec2 p, float t) {
      vec2 q = (p - MY_C) * 2.2;
      float d = 8.0;
      for (int i = 0; i < 48; i++) {
        float u = float(i) / 48.0 * 6.2831853 + t * 0.12;
        vec2 s = vec2(sin(u) + 0.35 * sin(3.0 * u), cos(u) - 0.35 * cos(3.0 * u)) * 0.38;
        d = min(d, length(q - s) - 0.045);
      }
      vec3 c = mix(MY_INDIGO, MY_CAVE, 0.55);
      c = mix(c, MY_SEAL, myFill(d));
      c = mix(c, MY_CINNABAR, myFill(d + 0.02) * 0.45);
      return myOut(c);
    }`),
];

export default IZANAMI;
