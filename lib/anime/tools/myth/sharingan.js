// Family 6 — focus ring / genjutsu ripple (5). Rings, sine, lock, spiral, iris shutter.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "sharingan", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const SHARINGAN = [
  D("mythFocusRing", "concentric focus rings with 1/r falloff — lock-on, not a ripple",
    /* glsl */ `
    vec3 mythFocusRing(vec2 p, float t) {
      float r = length(p - MY_C);
      float rings = 0.0;
      rings += myLine(myRing(r, 0.08, 0.0), 1.6);
      rings += myLine(myRing(r, 0.16, 0.0), 1.4);
      rings += myLine(myRing(r, 0.26, 0.0), 1.8);
      rings += myLine(myRing(r, 0.38, 0.0), 2.0);
      float fade = clamp(0.18 / max(r, 0.04), 0.0, 1.0);
      vec3 c = mix(MY_INDIGO, MY_SOOT, myFill(r - 0.42));
      c = mix(c, MY_SEAL, rings * fade);
      c = mix(c, MY_INK, myFill(r - 0.035));
      return myOut(c);
    }`),

  D("mythGenjutsuRipple", "radial sine ripples sin(r*k - t) — wave, not a static ring",
    /* glsl */ `
    vec3 mythGenjutsuRipple(vec2 p, float t) {
      float r = length(p - MY_C);
      float w = 0.5 + 0.5 * sin(r * 28.0 - t * 4.0);
      float crest = myAA(w - 0.72);
      vec3 c = mix(MY_INDIGO, MY_SKYRED, clamp(r * 1.4, 0.0, 1.0) * 0.45);
      c = mix(c, MY_SEAL, crest);
      c = mix(c, MY_CINNABAR, crest * myFill(r - 0.08) * 0.4);
      return myOut(c);
    }`),

  D("mythFocusLock", "crosshair plus ring lock — orthogonal bars, not concentric-only",
    /* glsl */ `
    vec3 mythFocusLock(vec2 p, float t) {
      vec2 q = p - MY_C;
      float r = length(q);
      float ring = myLine(myRing(r, 0.22, 0.0), 1.8);
      float barX = myFill(myBox(q, vec2(0.28, 0.008)));
      float barY = myFill(myBox(q, vec2(0.008, 0.28)));
      float gap = 1.0 - myFill(r - 0.06);
      vec3 c = mix(MY_INDIGO, MY_SOOT, 0.55);
      c = mix(c, MY_SEAL, (barX + barY) * gap);
      c = mix(c, MY_CINNABAR, ring);
      c = mix(c, MY_INK, myFill(r - 0.03));
      return myOut(c);
    }`),

  D("mythHypnoSpiral", "Archimedean spiral r = a + b*theta — one arm, not ripples",
    /* glsl */ `
    vec3 mythHypnoSpiral(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float arm = pol.x - (0.02 + 0.045 * (pol.y + 3.14159265 + t * 0.8));
      float wrap = abs(mod(arm, 0.09) - 0.045);
      float stroke = myAA(0.016 - wrap) * myFill(pol.x - 0.40);
      vec3 c = mix(MY_INDIGO, MY_SOOT, myFill(pol.x - 0.42));
      c = mix(c, MY_SEAL, stroke);
      c = mix(c, MY_INK, myFill(pol.x - 0.04));
      return myOut(c);
    }`),

  D("mythIrisGate", "iris aperture shutter: angular leaves closing — wipe, not a spiral",
    /* glsl */ `
    vec3 mythIrisGate(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float k = 8.0;
      float leaf = mySaw(pol.y, k);
      float open = 0.12 + 0.28 * (0.5 + 0.5 * sin(t * 0.9));
      float d = pol.x - open * (0.55 + leaf * 1.6);
      vec3 plate = myNight(p, t);
      vec3 glue = MY_INK;
      vec3 c = mix(plate, glue, myFill(-d));
      c = mix(c, MY_SEAL, myLine(d, 1.5));
      return myOut(c);
    }`),
];

export default SHARINGAN;
