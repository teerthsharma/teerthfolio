// MAPPA screen effects and finish: stepped emitter bloom, blue and red orbs, split-tone finish, grain on twos.
import { defineModule } from "./define.js";

const SUITS = "p-aether-lang, pr-triton-kernels-22, pr-mujoco-3396";

export const FX = [
  defineModule({
    name: "mappaBloomBands", suits: SUITS, use: "screen",
    doc: "glow that exists only round emitters, quantised into hard concentric steps with a small hot core",
    draws: "Two warm lights on a cool dark plate, each wrapped in four flat rings of light that step down to nothing, the nearer one pulsing on twos.",
    params: "uMpBloomSigma: halo radius; uMpBloomI: emitter intensity; uMpBloomBands: number of steps in the halo",
    uni: { uMpBloomSigma: 0.13, uMpBloomI: 0.9, uMpBloomBands: 4.0 },
    glsl: /* glsl */ `
    vec3 mpBloom(vec3 base, vec2 p, vec2 e, float sigma, vec3 col, float I, float bands) {
      float d = length(p - e);
      float gq = floor(exp(-(d * d) / (sigma * sigma)) * bands) / bands;
      return base + col * (gq * I * 0.55 + mpFill(d - sigma * 0.12) * I);
    }
    vec3 mappaBloomBands(vec2 p, float t) {
      float pulse = 0.85 + 0.15 * step(0.5, fract(mpTwos(t, 12.0) * 1.5));
      vec3 c = mix(MP_FAR, MP_MID, mpAA(length(p - vec2(0.8, 0.5)), 0.45));
      c = mpBloom(c, p, vec2(0.62, 0.48), uMpBloomSigma, vec3(1.0, 0.48, 0.10), uMpBloomI * pulse, uMpBloomBands);
      c = mpBloom(c, p, vec2(1.0, 0.55), uMpBloomSigma * 0.7, vec3(0.35, 0.17, 0.08), uMpBloomI, uMpBloomBands);
      return c;
    }`,
  }),

  defineModule({
    name: "mappaOrbBlue", suits: "p-aether-lang", use: "card",
    doc: "black-hole orb: ink core, thin pale-blue rim and a stepped blue ring",
    draws: "A small black ball with a hairline light-blue edge, wrapped in four flat bands of electric blue that fade outward.",
    params: "uMpOrbR: core radius; uMpOrbSigma: ring reach; uMpOrbI: intensity, 0 hides the orb",
    uni: { uMpOrbR: 0.05, uMpOrbSigma: 0.06, uMpOrbI: 1.0 },
    glsl: /* glsl */ `
    vec3 mpOrbBlue(vec3 base, vec2 p, vec2 c, float r, float sigma, float I) {
      float d = length(p - c) - r;
      float g = max(d, 0.0) / sigma;
      vec3 col = base + MP_BLUE * (floor(exp(-g * g) * 4.0) / 4.0 * I * 0.8);
      col = mix(col, MP_BLUE_RIM, mpLine(d, 1.4) * min(I, 1.0));
      return mix(col, MP_INK, mpFill(d) * min(I, 1.0));
    }
    vec3 mappaOrbBlue(vec2 p, float t) {
      vec3 c = mpOrbBlue(MP_FAR, p, vec2(0.8, 0.5), uMpOrbR, uMpOrbSigma, uMpOrbI * (0.9 + 0.1 * step(0.5, fract(mpTwos(t, 12.0) * 2.0))));
      return c;
    }`,
  }),

  defineModule({
    name: "mappaRedCore", suits: "p-aether-lang", use: "card",
    doc: "hot red core with a stepped glow and five thin tapering tendrils tipped pale pink",
    draws: "A small solid red ball with a flat red halo and five hairline red strands reaching out of it, pale at their tips, drifting on twos.",
    params: "uMpRedR: core radius; uMpRedI: intensity, 0 hides it; uMpRedReach: tendril length in core radii",
    uni: { uMpRedR: 0.03, uMpRedI: 1.0, uMpRedReach: 1.0 },
    glsl: /* glsl */ `
    vec3 mpRedCore(vec3 base, vec2 p, vec2 c, float r, float I, float reach, float th) {
      vec2 q = p - c; float d = length(q) - r;
      float g = max(d, 0.0) / 0.06;
      vec3 col = base + MP_RED * (floor(exp(-g * g) * 3.0) / 3.0 * I * 0.6);
      col = mix(col, MP_RED, mpFill(d) * min(I, 1.0));
      float tend = 0.0; float tip = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float a = mpH(vec2(fi, 2.0)) * 6.2831853 + 0.35 * th * (mpH(vec2(fi, 4.0)) - 0.5);
        vec2 dir = vec2(cos(a), sin(a));
        float L = r * reach * (2.2 + 3.0 * mpH(vec2(fi, 6.0)));
        float s = clamp(dot(q, dir), r, L);
        float u = (s - r) / max(L - r, 1e-4);
        float m = mpAA(0.0035 * (1.0 - u) - length(q - dir * s), 0.0);
        tend = max(tend, m);
        tip = max(tip, m * mpAA(u, 0.6));
      }
      col = mix(col, MP_RED_LINE, tend * min(I, 1.0));
      return mix(col, MP_PINK, tip * min(I, 1.0));
    }
    vec3 mappaRedCore(vec2 p, float t) {
      return mpRedCore(MP_FAR, p, vec2(0.8, 0.5), uMpRedR, uMpRedI, uMpRedReach, mpTwos(t, 12.0));
    }`,
  }),

  defineModule({
    name: "mappaSplitFinish", suits: SUITS, use: "grade",
    doc: "final finish: cool shadow and pale highlight tint, desaturated darks that spare a saturated accent, luma cap and ink floor",
    draws: "The frame gets blue-tinted shadows, pale highlights, greyer dark areas except strongly saturated reds which stay vivid, nothing pure black or brighter than 0.92; the lower half of the demo is finished, the upper half is raw.",
    params: "uMpFinTone: strength of the split tint 0 to 1; uMpFinDarkSat: colour kept in the darks 0 to 1",
    uni: { uMpFinTone: 0.35, uMpFinDarkSat: 0.55 },
    glsl: /* glsl */ `
    vec3 mpFinish(vec3 c, float tone, float darkSat) {
      float w = smoothstep(0.2, 0.8, mpLuma(c));
      vec3 ts = MP_FAR / max(mpLuma(MP_FAR), 1e-3);
      vec3 th = MP_RIM / max(mpLuma(MP_RIM), 1e-3);
      c *= mix(mix(vec3(1.0), ts, tone), mix(vec3(1.0), th, tone), w);
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      float keep = smoothstep(0.3, 0.55, sat);
      return mpOut(mix(vec3(mpLuma(c)), c, mix(mix(darkSat, 1.0, w), 1.0, keep)));
    }
    vec3 mappaSplitFinish(vec2 p, float t) {
      float x = p.x / 1.6;
      vec3 raw = vec3(x) * vec3(1.05, 1.0, 0.95);
      raw = mix(raw, vec3(0.9, 0.2, 0.2) * (0.3 + 0.7 * x), step(fract(p.y * 2.0), 0.3));
      return p.y > 0.5 ? raw : mpFinish(raw, uMpFinTone, uMpFinDarkSat);
    }`,
  }),

  defineModule({
    name: "mappaTwosGrain", suits: SUITS, use: "noise",
    doc: "film grain re-rolled twelve times a second, heavier in the darks and absent in the ink floor",
    draws: "Fine pixel grain that boils on twos over a dark ramp, strongest in the shadows; the upper half of the demo is clean, the lower half grained.",
    params: "uMpGrainAmt: grain amplitude; uMpGrainRes: grain cells per frame height",
    uni: { uMpGrainAmt: 0.06, uMpGrainRes: 800.0 },
    glsl: /* glsl */ `
    vec3 mpGrain(vec3 c, vec2 p, float t, float amt, float res) {
      float f = floor(mpTwos(t, 12.0) * 12.0 + 0.5);
      float g = mpH(floor(p * res) + 17.0 * f) - 0.5;
      return c + amt * (1.0 - mpLuma(c)) * smoothstep(0.06, 0.12, mpLuma(c)) * g;
    }
    vec3 mappaTwosGrain(vec2 p, float t) {
      vec3 c = MP_FAR + (MP_NEAR - MP_FAR) * (p.x / 1.6);
      return mpOut(p.y > 0.5 ? c : mpGrain(c, p, t, uMpGrainAmt, uMpGrainRes));
    }`,
  }),
];
