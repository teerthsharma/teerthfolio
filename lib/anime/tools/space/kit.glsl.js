// space kit — one night-sky grammar for every module in this folder.
//   voids sit on deep indigo SP_VOID, never crushed #000, never milky
//   lit luma ≤ 0.92 via spCap; bloom only through spEmit (caller feeds uEmit)
//   discs, rings, spikes use fwidth (spAA / spDisc / spRing / spSpike4)
//   cheap fbm: 4 octaves (spFbm). Two showcase modules may call spFbm5.
//   prefixed names so this never clashes with the shared noise tool
//
// p is frame-height units, y up. Polar: spPolar(p, c) -> (r, theta).

export const SPACE_KIT = /* glsl */ `
  const vec3 SP_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const vec3 SP_VOID = vec3(0.016, 0.020, 0.052);
  const vec3 SP_INK  = vec3(0.010, 0.012, 0.028);
  const vec3 SP_HOT  = vec3(0.86, 0.72, 0.52);
  const vec3 SP_COLD = vec3(0.38, 0.52, 0.82);
  const vec3 SP_ORCH = vec3(0.40, 0.14, 0.38);
  const vec3 SP_TEAL = vec3(0.10, 0.28, 0.42);
  const vec3 SP_EMBER= vec3(0.46, 0.16, 0.08);
  const vec3 SP_GOLD = vec3(0.78, 0.62, 0.28);
  const vec3 SP_MOON = vec3(0.72, 0.70, 0.62);

  float spH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2  spH22(vec2 p) { float a = spH21(p); return vec2(a, spH21(p + a + 17.0)); }
  float spVn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(spH21(i), spH21(i + vec2(1.0, 0.0)), f.x), mix(spH21(i + vec2(0.0, 1.0)), spH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  const mat2 SP_ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float spFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * spVn(p); p = SP_ROT * p; a *= 0.5; } return s; }
  float spFbm5(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * spVn(p); p = SP_ROT * p; a *= 0.5; } return s; }
  float spRidge(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(2.0 * spVn(p) - 1.0)); p = SP_ROT * p; a *= 0.5; } return s; }
  vec2  spWarp(vec2 p, float k) { return p + k * vec2(spFbm(p + vec2(1.7, 9.2)), spFbm(p + vec2(8.3, 2.8))); }
  float spAA(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float spDisc(float r, float r0) { return spAA(r - r0); }
  float spRing(float r, float r0, float halfW) { return spAA(abs(r - r0) - halfW); }
  float spSpike4(vec2 q) { return pow(abs(q.x), 0.55) + pow(abs(q.y), 0.55); }
  float spSpike6(vec2 q) {
    float a = atan(q.y, q.x), r = length(q);
    float s = abs(fract(a / 3.14159265 * 3.0) * 2.0 - 1.0);
    return r - 0.02 / max(s, 0.12);
  }
  vec3  spCap(vec3 c) { float L = dot(max(c, vec3(0.0)), SP_LUMA); return c * min(1.0, 0.92 / max(L, 1e-4)); }
  vec3  spLift(vec3 c) { return max(c, SP_VOID); }
  vec3  spOut(vec3 c) { return spCap(spLift(c)); }
  float spEmit(float e) { return max(e, 0.0); }
  vec2  spPolar(vec2 p, vec2 c) { vec2 q = p - c; return vec2(length(q), atan(q.y, q.x)); }
  float spEl(vec2 p) { return p.y - 0.38; }
  vec3  spMix3(float t, vec3 a, vec3 b, vec3 c) { t = clamp(t, 0.0, 1.0); return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0); }
`;

export default {
  name: "space-kit",
  doc: "night-sky grammar: indigo void, luma 0.92, fwidth discs/rings/spikes, cheap 4-octave fbm, emit split from albedo",
  glsl: SPACE_KIT,
};

export function T(name, doc, glsl, demoCall) {
  return {
    name,
    doc,
    deps: ["space-kit"],
    glsl: /* glsl */ `\n${glsl}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return spOut(${demoCall}); }`,
  };
}
