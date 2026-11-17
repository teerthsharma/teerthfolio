// J.C.Staff screen effects: hard-cored electric arc, spark ticks, stepped glow with glint, banded smoke.
import { defineModule } from "./define.js";

const D = (name, o) => defineModule({ name, ...o, demo: `vec3 demo(vec2 p, float t) { return ${name}(p, t); }` });

export const FX = [
  D("jcsArcBolt", {
    doc: "electric arc with a hard white core and a flat pale-cyan body, a branch and a thin ghost arc, redrawn every drawing on twos",
    draws: "A jagged blue-white lightning arc across a glass tower, a white wire in a pale cyan band with a short branch and a thin second arc, jumping to a new path twelve times a second.",
    use: "screen", params: "uJcsAx/uJcsAy and uJcsBx/uJcsBy are the two ends in frame units; uJcsArcAmp is the sideways wander as a fraction of length (0.07); uJcsSeed picks the family of paths.",
    uniforms: { uJcsAx: 0.35, uJcsAy: 0.8, uJcsBx: 1.45, uJcsBy: 0.25, uJcsArcAmp: 0.07 },
    glsl: /* glsl */ `
    uniform float uJcsAx;
    uniform float uJcsAy;
    uniform float uJcsBx;
    uniform float uJcsBy;
    uniform float uJcsArcAmp;
    float jcsArcOff(float u, float seed, float amp, float L) {
      float n = (jcsVn(vec2(u * 7.0, seed)) - 0.5) + (jcsVn(vec2(u * 19.0, seed + 3.7)) - 0.5) * 0.5 + (jcsVn(vec2(u * 47.0, seed + 8.1)) - 0.5) * 0.25;
      return n * amp * L * sin(3.14159265 * clamp(u, 0.0, 1.0));
    }
    float jcsArcBoltD(vec2 p, vec2 a, vec2 b, float seed, float amp) {
      vec2 ba = b - a;
      float L = length(ba);
      vec2 dir = ba / L;
      vec2 pa = p - a;
      float u = dot(pa, dir) / L;
      float v = dot(pa, vec2(-dir.y, dir.x));
      float o = jcsArcOff(u, seed, amp, L);
      float sl = (jcsArcOff(u + 0.01, seed, amp, L) - o) / (0.01 * L);
      float d = abs(v - o) * inversesqrt(1.0 + sl * sl);
      float ex = max(max(-u, u - 1.0), 0.0) * L;
      return sqrt(d * d + ex * ex);
    }
    vec3 jcsArcBolt(vec2 p, float t) {
      float s = uJcsSeed + floor(t * 12.0) * 3.17;
      vec2 a = vec2(uJcsAx, uJcsAy), b = vec2(uJcsBx, uJcsBy);
      vec2 ba = b - a;
      float L = length(ba);
      vec2 dir = ba / L;
      vec2 mid = a + ba * 0.45 + vec2(-dir.y, dir.x) * jcsArcOff(0.45, s, uJcsArcAmp, L);
      float cs = cos(0.6), sn = sin(0.6);
      vec2 b2 = mid + vec2(dir.x * cs - dir.y * sn, dir.x * sn + dir.y * cs) * L * 0.35;
      float d0 = jcsArcBoltD(p, a, b, s, uJcsArcAmp);
      float d1 = jcsArcBoltD(p, mid, b2, s + 11.0, uJcsArcAmp * 1.2);
      float d2 = jcsArcBoltD(p, a, b + vec2(0.0, 0.06), s + 5.0, uJcsArcAmp * 0.7);
      vec3 c = JCS_GL_MID * 0.8;
      float halo = min(d0, min(d1 * 1.4, d2 * 1.4));
      c = mix(c, mix(c, JCS_ARC, 0.28), jcsFill(halo - 0.028));
      c = mix(c, JCS_ARC, jcsFill(min(d0 - 0.010, min(d1 - 0.007, d2 - 0.0045))));
      c = mix(c, JCS_ARC_W, jcsFill(min(d0 - 0.0035, min(d1 - 0.0025, d2 - 0.0015))));
      return jcsOut(c);
    }`,
  }),

  D("jcsSparkTicks", {
    doc: "fourteen short tapered spark ticks flung from a point, each flying out and thinning, reborn at a new angle every cycle",
    draws: "A burst of small pale-blue sparks with white tips flying outward from one point over a dark glass wall, each one a short tapered dash.",
    use: "screen", params: "uJcsSx/uJcsSy is the origin (0.89, 0.5); uJcsSparkRate is cycles per second (1.5).",
    uniforms: { uJcsSx: 0.89, uJcsSy: 0.5, uJcsSparkRate: 1.5 },
    glsl: /* glsl */ `
    uniform float uJcsSx;
    uniform float uJcsSy;
    uniform float uJcsSparkRate;
    vec3 jcsSparkTicks(vec2 p, float t) {
      vec2 o = vec2(uJcsSx, uJcsSy);
      float T = jcsHold(t, 12.0);
      float d = 9.0;
      for (int i = 0; i < 14; i++) {
        float fi = float(i);
        float h1 = jcsH21(vec2(fi, 1.7 + uJcsSeed));
        float h2 = jcsH21(vec2(fi, 5.3 + uJcsSeed));
        float h3 = jcsH21(vec2(fi, 9.1 + uJcsSeed));
        float ph = T * uJcsSparkRate + h1;
        float age = fract(ph);
        float ang = 6.2831853 * h2 + floor(ph) * 2.399;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 a = o + dir * (0.06 + 0.28 * age);
        vec2 b = a + dir * (0.03 + 0.05 * h3) * (1.0 - age);
        d = min(d, jcsTaper(p, a, b, 0.0045 * (1.0 - age) + 0.0008, 0.0008));
      }
      vec3 c = JCS_GL_SHADE;
      c = mix(c, JCS_ARC, jcsFill(d));
      c = mix(c, JCS_ARC_W, jcsFill(d + 0.0025));
      return jcsOut(c);
    }`,
  }),

  D("jcsGlowStep", {
    doc: "stepped emissive glow: two flat orange halo rings, a pale core, and an upright four-point glint that pulses on twos",
    draws: "A bright cream point on a dark blue wall, ringed by two flat orange halos that get fainter outward, with a thin four-point sparkle crossing it.",
    use: "screen", params: "uJcsGlowR is the halo radius in frame units (0.16); uJcsGlowK scales the glint length against the halo (1.9).",
    uniforms: { uJcsGlowR: 0.16, uJcsGlowK: 1.9 },
    glsl: /* glsl */ `
    uniform float uJcsGlowR;
    uniform float uJcsGlowK;
    vec3 jcsGlowStep(vec2 p, float t) {
      vec2 q = p - vec2(0.89, 0.5);
      float pul = 1.0 + 0.1 * step(0.5, fract(jcsHold(t, 12.0) * 3.0));
      float R = uJcsGlowR * pul;
      float r = length(q);
      vec3 c = JCS_DEEP;
      c = mix(c, JCS_GLOW_O, 0.22 * jcsFill(r - R));
      c = mix(c, JCS_GLOW_O, 0.50 * jcsFill(r - R * 0.62));
      vec2 g = abs(q) / (R * uJcsGlowK);
      float star = sqrt(g.x) + sqrt(g.y) - 1.0;
      c = mix(c, JCS_CORE, jcsFill(star * 0.1));
      c = mix(c, JCS_CORE, jcsFill(r - R * 0.30));
      return jcsOut(c);
    }`,
  }),

  D("jcsSmokeBands", {
    doc: "eight rising smoke puffs in two flat bands, a lit disc with a shade crescent on the lower left, growing and stepping on twos",
    draws: "Grey cartoon smoke puffs climbing from the ground over a blue tower, each a pale disc with a darker crescent on its lower left, growing as they rise and vanishing near the top.",
    use: "screen", params: "uJcsSmokeX is the column the smoke rises from in frame units (0.89); uJcsSeed reshuffles the puff spread.",
    uniforms: { uJcsSmokeX: 0.89 },
    glsl: /* glsl */ `
    uniform float uJcsSmokeX;
    vec3 jcsSmokeBands(vec2 p, float t) {
      float T = jcsHold(t, 12.0);
      vec3 c = JCS_GL_MID;
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float h = jcsH21(vec2(fi, 4.2 + uJcsSeed));
        float age = fract(T * 0.22 + fi * 0.125);
        vec2 pos = vec2(uJcsSmokeX + (h - 0.5) * 0.30 + 0.03 * sin(fi * 2.0 + age * 3.0), 0.12 + age * 0.5);
        float r = (0.4 + 1.0 * age) * 0.1;
        float d = length(p - pos) - r;
        float shade = jcsFill(d) * (1.0 - jcsFill(length(p - (pos + vec2(0.02, 0.025))) - r * 0.9));
        float vis = 1.0 - jcsAA(age, 0.85);
        c = mix(c, JCS_SMOKE_L, jcsFill(d) * vis);
        c = mix(c, JCS_SMOKE_S, shade * vis);
      }
      return jcsOut(c);
    }`,
  }),
];
