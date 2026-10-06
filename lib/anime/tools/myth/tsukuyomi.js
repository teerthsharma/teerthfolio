// Family 3 — moon / inverted night / red sky (6). Disc, invert, bands, halo, lattice, crescent.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "tsukuyomi", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const TSUKUYOMI = [
  D("mythTsukiMoon", "hard moon disc plus umbra gradient on a red-indigo night",
    /* glsl */ `
    vec3 mythTsukiMoon(vec2 p, float t) {
      vec2 c = MY_C + vec2(0.06 * sin(t * 0.15), 0.08);
      float d = length(p - c);
      float moon = myFill(d - 0.16);
      float umbra = smoothstep(0.16, 0.42, d);
      vec3 c0 = myNight(p, t);
      c0 = mix(c0, MY_SKYRED, (1.0 - umbra) * 0.35);
      vec3 face = mix(MY_CINNABAR * 0.55, MY_MOON, myCelN(0.55 + 0.35 * (p.x - c.x), 3.0));
      return myOut(mix(c0, face, moon));
    }`),

  D("mythInvertNight", "invert-then-remap night plate so luma stays ≤ 0.92",
    /* glsl */ `
    vec3 mythInvertNight(vec2 p, float t) {
      vec3 src = myNight(p, t);
      src = mix(src, MY_SEAL, myFill(length(p - MY_C) - 0.14) * 0.45);
      vec3 inv = vec3(1.0) - src;
      return myOut(inv);
    }`),

  D("mythRedSkyBands", "posterized horizontal sky bands — value steps, not a disc",
    /* glsl */ `
    vec3 mythRedSkyBands(vec2 p, float t) {
      float y = p.y + 0.04 * sin(p.x * 3.0 + t * 0.3);
      float b = myCelN(clamp(y, 0.0, 1.0), 5.0);
      vec3 c = myMix3(b, MY_INDIGO, MY_SKYRED, MY_SEAL);
      c = mix(c, MY_CINNABAR, myBand(b, 0.38, 0.62) * 0.35);
      return myOut(c);
    }`),

  D("mythBloodHalo", "moon disc plus corona rings (radial isolines), not a lone disc",
    /* glsl */ `
    vec3 mythBloodHalo(vec2 p, float t) {
      float r = length(p - MY_C);
      float moon = myFill(r - 0.12);
      float halo = 0.0;
      halo += myLine(myRing(r, 0.18, 0.0), 1.6);
      halo += myLine(myRing(r, 0.26, 0.0), 1.3);
      halo += myLine(myRing(r, 0.36, 0.0), 1.1);
      vec3 c = myNight(p, t);
      c = mix(c, MY_SKYRED, smoothstep(0.5, 0.12, r) * 0.55);
      c = mix(c, MY_MOON * 0.85, moon);
      c = mix(c, MY_SEAL, clamp(halo, 0.0, 1.0));
      return myOut(c);
    }`),

  D("mythNightLattice", "inverted hexagonal lattice over a moon field — grid, not bands",
    /* glsl */ `
    vec3 mythNightLattice(vec2 p, float t) {
      vec2 q = p * 7.0 + vec2(t * 0.08, 0.0);
      q = mat2(1.0, 0.0, 0.5, 0.866) * q;
      vec2 f = abs(fract(q) - 0.5);
      float hex = max(f.x * 1.732, f.x + f.y * 0.577);
      float rule = myLine(hex - 0.42, 1.2);
      vec3 c = myNight(p, t);
      float moon = myFill(length(p - MY_C) - 0.15);
      c = mix(c, MY_MOON * 0.7, moon);
      vec3 inv = myOut(vec3(1.0) - c);
      return myOut(mix(c, inv, rule));
    }`),

  D("mythLunarPhase", "crescent via two-disc boolean subtract — phase, not a halo",
    /* glsl */ `
    vec3 mythLunarPhase(vec2 p, float t) {
      vec2 c = MY_C + vec2(0.0, 0.06);
      float phase = 0.10 * sin(t * 0.4);
      float d0 = length(p - c) - 0.18;
      float d1 = length(p - c - vec2(0.12 + phase, 0.02)) - 0.17;
      float cres = max(d0, -d1);
      vec3 c0 = mix(MY_INDIGO, MY_SKYRED, clamp(p.y * 0.7, 0.0, 1.0));
      vec3 face = mix(MY_CINNABAR, MY_MOON, myCelN(0.6 + 0.3 * (p.x - c.x), 2.0));
      return myOut(mix(c0, face, myFill(cres)));
    }`),
];

export default TSUKUYOMI;
