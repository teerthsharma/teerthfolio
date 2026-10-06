// Family 1 — pinwheel / tomoe / kaleidoscope (8). Polar saw, comma SDF, fold, not a copied iris.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "mangekyo", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const MANGEKYO = [
  D("mythPinwheel3", "3-blade polar saw: rotating pinwheel, cinnabar on indigo",
    /* glsl */ `
    vec3 mythPinwheel3(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float blade = myPin(pol.y - t * 0.55, 3.0);
      float disc = myFill(pol.x - 0.34);
      float cut = myAA(0.16 - blade);
      vec3 c = mix(MY_INDIGO, MY_SEAL, cut);
      c = mix(c, MY_INK, myLine(pol.x - 0.34, 1.6) * disc);
      c = mix(myNight(p, t), c, disc);
      return myOut(c);
    }`),

  D("mythPinwheel6", "6-blade pinwheel: alternating seal/cinnabar plates, ink seams",
    /* glsl */ `
    vec3 mythPinwheel6(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float n = 6.0, k = (pol.y - t * 0.4) * n / 6.2831853;
      float id = mod(floor(k), 2.0);
      float seam = mySaw(pol.y - t * 0.4, n);
      float disc = myFill(pol.x - 0.36);
      vec3 plate = mix(MY_SEAL, MY_CINNABAR, id);
      vec3 c = mix(plate, MY_INK, myAA(0.055 - seam));
      c = mix(myNight(p, t), c, disc);
      return myOut(c);
    }`),

  D("mythTomoeTriple", "three comma SDFs orbit a seal pupil — magatama, not a frame copy",
    /* glsl */ `
    vec3 mythTomoeTriple(vec2 p, float t) {
      vec2 q = p - MY_C;
      float pupil = myFill(length(q) - 0.055);
      float d = 8.0;
      for (int i = 0; i < 3; i++) {
        float a = t * 0.35 + float(i) * 2.0943951;
        vec2 o = vec2(cos(a), sin(a)) * 0.16;
        vec2 r = q - o;
        r = mat2(cos(a), -sin(a), sin(a), cos(a)) * r;
        d = min(d, myTomoe(r * 2.15));
      }
      vec3 c = mix(MY_INDIGO, MY_SEAL * 0.45, myFill(length(q) - 0.34));
      c = mix(c, MY_CINNABAR, myFill(d));
      c = mix(c, MY_INK, pupil);
      c = mix(c, MY_INK, myLine(length(q) - 0.34, 1.8));
      return myOut(c);
    }`),

  D("mythTomoeSpiral", "logarithmic spiral of comma SDFs — r = a*exp(b*theta)",
    /* glsl */ `
    vec3 mythTomoeSpiral(vec2 p, float t) {
      vec2 q = p - MY_C;
      float d = 8.0;
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float a = fi * 0.72 + t * 0.22;
        float r = 0.05 * exp(0.22 * fi);
        vec2 o = vec2(cos(a), sin(a)) * r;
        vec2 s = q - o;
        s = mat2(cos(a), -sin(a), sin(a), cos(a)) * s;
        d = min(d, myTomoe(s * (6.5 - fi * 0.35)));
      }
      vec3 c = mix(MY_INDIGO, MY_SKYRED * 0.55, myFbm(p * 2.0));
      c = mix(c, MY_SEAL, myFill(d));
      return myOut(c);
    }`),

  D("mythKaleid6", "6-fold polar domain fold: soot wedge mirrored, not a saw blade",
    /* glsl */ `
    vec3 mythKaleid6(vec2 p, float t) {
      vec2 k = myFold(p - MY_C, 6.0);
      k = myWarp(k * 3.2 + t * 0.08, 0.35);
      float n = myFbm(k);
      float disc = myFill(length(p - MY_C) - 0.38);
      vec3 c = myMix3(n, MY_SOOT, MY_CINNABAR, MY_SEAL);
      c = mix(myNight(p, t), c, disc);
      c = mix(c, MY_INK, myLine(length(p - MY_C) - 0.38, 1.5));
      return myOut(c);
    }`),

  D("mythKaleid12", "12-fold kaleidoscope with ink fold-seams (fold + line, not pinwheel)",
    /* glsl */ `
    vec3 mythKaleid12(vec2 p, float t) {
      vec2 q = p - MY_C;
      vec2 k = myFold(q, 12.0);
      float a = atan(q.y, q.x);
      float fold = 6.2831853 / 12.0;
      float seam = abs(mod(a, fold) - fold * 0.5);
      float n = myRidge(k * 8.0 + t * 0.1);
      float disc = myFill(length(q) - 0.36);
      vec3 c = mix(MY_INDIGO, MY_SEAL, myCelN(n, 3.0));
      c = mix(c, MY_INK, myAA(0.018 - seam) * disc);
      c = mix(myNight(p, t), c, disc);
      return myOut(c);
    }`),

  D("mythIrisRings", "concentric iris rings with tomoe ticks on one annulus",
    /* glsl */ `
    vec3 mythIrisRings(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float rings = 0.0;
      rings += myLine(myRing(pol.x, 0.10, 0.0), 1.4);
      rings += myLine(myRing(pol.x, 0.18, 0.0), 1.3);
      rings += myLine(myRing(pol.x, 0.26, 0.0), 1.5);
      rings += myLine(myRing(pol.x, 0.34, 0.0), 1.8);
      float tick = mySaw(pol.y - t * 0.2, 3.0);
      float band = myBand(pol.x, 0.22, 0.30) * myAA(0.08 - tick);
      vec3 c = mix(MY_INDIGO, MY_SOOT, myFill(pol.x - 0.36));
      c = mix(c, MY_SEAL, rings * 0.85);
      c = mix(c, MY_CINNABAR, band);
      c = mix(c, MY_INK, myFill(pol.x - 0.05));
      return myOut(c);
    }`),

  D("mythBladeTriskel", "three cubic-arc blades unioned as a triskelion — abstract, not a copyrighted star",
    /* glsl */ `
    vec3 mythBladeTriskel(vec2 p, float t) {
      vec2 q = p - MY_C;
      float d = 8.0;
      for (int i = 0; i < 3; i++) {
        float a = float(i) * 2.0943951 + t * 0.18;
        float ca = cos(a), sa = sin(a);
        vec2 r = mat2(ca, -sa, sa, ca) * q;
        float blade = mySeg(r, vec2(0.04, 0.0), vec2(0.28, 0.06)) - 0.028;
        blade = min(blade, mySeg(r, vec2(0.16, 0.04), vec2(0.22, 0.18)) - 0.018);
        d = min(d, blade);
      }
      float disc = myFill(length(q) - 0.36);
      vec3 c = mix(MY_INDIGO, MY_SOOT, disc);
      c = mix(c, MY_SEAL, myFill(d));
      c = mix(c, MY_INK, myFill(length(q) - 0.045));
      return myOut(c);
    }`),
];

export default MANGEKYO;
