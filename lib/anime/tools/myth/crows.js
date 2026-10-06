// Family 9 — abstract crow flock / afterimage (5). Chevron, trail, orbit, feather, shear pass.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "crows", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const CROWS = [
  D("mythCrowFlock", "hashed chevron silhouettes — flock field, not a trail",
    /* glsl */ `
    vec3 mythCrowFlock(vec2 p, float t) {
      vec3 c = myNight(p, t);
      vec2 gv = floor(p * 9.0);
      vec2 f = fract(p * 9.0) - 0.5;
      float keep = step(0.58, myH21(gv));
      vec2 j = (myH22(gv) - 0.5) * 0.25;
      float d = myCrow((f - j) * 2.8);
      c = mix(c, MY_CROW, myFill(d) * keep);
      return myOut(c);
    }`),

  D("mythCrowAfterimage", "same flock with two trail offsets — smear, not a static hash",
    /* glsl */ `
    vec3 mythCrowAfterimage(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_SKYRED * 0.4, clamp(p.y, 0.0, 1.0) * 0.35);
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        vec2 off = vec2(-0.035, 0.012) * fk;
        vec2 gv = floor((p - off) * 8.5);
        vec2 f = fract((p - off) * 8.5) - 0.5;
        float keep = step(0.60, myH21(gv));
        float d = myCrow(f * 2.6);
        float fade = 1.0 - fk * 0.32;
        c = mix(c, mix(MY_CROW, MY_SEAL, fk * 0.25), myFill(d) * keep * fade);
      }
      return myOut(c);
    }`),

  D("mythCrowOrbit", "crows on circular paths — orbit, not a hashed field",
    /* glsl */ `
    vec3 mythCrowOrbit(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_CAVE, 0.45);
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float a = t * (0.4 + 0.05 * mod(fi, 3.0)) + fi * 0.698;
        float rad = 0.12 + 0.08 * mod(fi, 3.0);
        vec2 o = MY_C + vec2(cos(a), sin(a)) * rad;
        vec2 q = p - o;
        q = mat2(cos(a + 1.57), -sin(a + 1.57), sin(a + 1.57), cos(a + 1.57)) * q;
        float d = myCrow(q * 7.5);
        c = mix(c, MY_CROW, myFill(d));
      }
      c = mix(c, MY_SEAL, myFill(length(p - MY_C) - 0.04) * 0.55);
      return myOut(c);
    }`),

  D("mythFeatherHash", "hashed teardrop feathers — down, not a bird silhouette",
    /* glsl */ `
    vec3 mythFeatherHash(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_SOOT, 0.4);
      vec2 uv = p * 11.0 + vec2(t * 0.05, -t * 0.12);
      vec2 gv = floor(uv), f = fract(uv) - 0.5;
      float keep = step(0.55, myH21(gv));
      vec2 q = f * vec2(1.0, 1.6);
      float tear = length(q) - 0.18 * (0.6 + 0.4 * myH21(gv + 2.0));
      tear = min(tear, mySeg(f, vec2(0.0, -0.15), vec2(0.0, 0.22)) - 0.012);
      c = mix(c, MY_CROW, myFill(tear) * keep);
      c = mix(c, MY_CINNABAR, myFill(tear) * keep * step(0.85, myH21(gv + 5.0)) * 0.45);
      return myOut(c);
    }`),

  D("mythMurderPass", "shear-translated flock crossing the frame — pass, not an orbit",
    /* glsl */ `
    vec3 mythMurderPass(vec2 p, float t) {
      vec3 c = myNight(p, t);
      float march = fract(t * 0.22);
      vec2 uv = p + vec2(march * 1.6 - 0.4, (p.x - 0.72) * 0.12);
      vec2 gv = floor(uv * 7.0);
      vec2 f = fract(uv * 7.0) - 0.5;
      float keep = step(0.48, myH21(gv));
      float d = myCrow(f * 2.4);
      c = mix(c, MY_CROW, myFill(d) * keep);
      c = mix(c, MY_SEAL * 0.5, myFill(d + 0.02) * keep * 0.25);
      return myOut(c);
    }`),
];

export default CROWS;
