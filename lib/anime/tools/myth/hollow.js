// Family 8 — hollow mouth / cave indigo / torch (5). Maw, depth, flicker, teeth, arches.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "hollow", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const HOLLOW = [
  D("mythHollowMouth", "cave mouth ellipse with a noisy lip — aperture, not teeth",
    /* glsl */ `
    vec3 mythHollowMouth(vec2 p, float t) {
      vec2 q = (p - vec2(0.72, 0.42)) / vec2(0.42, 0.28);
      float a = atan(q.y, q.x);
      float n = (myVn(vec2(a * 3.0, 4.0)) - 0.5) * 0.10;
      float d = length(q) - 1.0 - n;
      vec3 lip = mix(MY_CINNABAR, MY_SEAL, myFill(abs(d) - 0.08));
      vec3 cave = mix(MY_SOOT, MY_CAVE, clamp(-d * 0.35, 0.0, 1.0));
      vec3 rock = mix(MY_INDIGO, MY_CROW, myFbm(p * 3.0));
      vec3 c = mix(cave, rock, myFill(d));
      c = mix(c, lip, myLine(d, 2.2));
      return myOut(c);
    }`),

  D("mythCaveIndigo", "indigo depth gradient plus hanging stalactites — 1D noise icicles",
    /* glsl */ `
    vec3 mythCaveIndigo(vec2 p, float t) {
      float depth = clamp(1.0 - p.y * 0.75, 0.0, 1.0);
      vec3 c = myMix3(depth, MY_CAVE, MY_INDIGO, MY_SOOT);
      float x = p.x * 8.0;
      float id = floor(x);
      float f = fract(x) - 0.5;
      float h = 0.18 + 0.28 * myH21(vec2(id, 3.0));
      float icicle = myFill(length(vec2(f * 0.22, max(0.92 - p.y, 0.0))) - 0.04) * step(0.92 - p.y, h);
      c = mix(c, MY_CROW, icicle);
      c = mix(c, MY_TORCH * 0.35, exp(-dot(p - vec2(0.72, 0.18), p - vec2(0.72, 0.18)) * 8.0) * 0.4);
      return myOut(c);
    }`),

  D("mythTorchFlicker", "torch disc plus hash flicker plus glow falloff — light, not a maw",
    /* glsl */ `
    vec3 mythTorchFlicker(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.28);
      float flick = 0.85 + 0.15 * myH21(vec2(myHold(t, 12.0), 2.0));
      float r = length(p - c);
      float core = myFill(r - 0.045 * flick);
      float glow = exp(-r * r * 14.0) * flick;
      vec3 cave = mix(MY_CAVE, MY_INDIGO, clamp(p.y, 0.0, 1.0));
      vec3 c0 = mix(cave, MY_EMBER * 0.55, glow * 0.65);
      c0 = mix(c0, MY_TORCH, core);
      float stick = myFill(myBox(p - vec2(0.72, 0.14), vec2(0.012, 0.10)));
      c0 = mix(c0, MY_CROW, stick);
      return myOut(c0);
    }`),

  D("mythMawTeeth", "radial triangles around a dark hole — dentition, not a smooth lip",
    /* glsl */ `
    vec3 mythMawTeeth(vec2 p, float t) {
      vec2 pol = myPolar(p, vec2(0.72, 0.44));
      float hole = myFill(pol.x - 0.16);
      float n = 14.0;
      float saw = mySaw(pol.y + t * 0.05, n);
      float tooth = myFill((0.16 + saw * 0.14) - pol.x) * (1.0 - hole);
      vec3 c = mix(MY_INDIGO, MY_CAVE, hole);
      c = mix(c, MY_SOOT, myFill(pol.x - 0.42));
      c = mix(c, MY_CINNABAR * 0.75, tooth);
      c = mix(c, MY_INK, myFill(pol.x - 0.10));
      return myOut(c);
    }`),

  D("mythCaveEcho", "nested arch SDFs receding — depth stacks, not a single mouth",
    /* glsl */ `
    vec3 mythCaveEcho(vec2 p, float t) {
      vec3 c = MY_CAVE;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float s = 1.0 - fi * 0.14;
        vec2 o = vec2(0.72, 0.22 + fi * 0.04);
        float d = myArch((p - o) / s, 0.28, 0.22);
        vec3 col = mix(MY_INDIGO, MY_SOOT, fi / 5.0);
        col = mix(col, MY_SEAL * 0.35, step(3.0, fi) * 0.4);
        c = mix(c, col, myFill(d));
        c = mix(c, MY_INK, myLine(d, 1.4));
      }
      return myOut(c);
    }`),
];

export default HOLLOW;
