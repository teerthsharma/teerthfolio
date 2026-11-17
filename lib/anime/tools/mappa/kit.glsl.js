// mappa kit: MAPPA digital-TV palette, hashes, hard-band helpers, hue-shifted shade; every mappa shader depends on it.
export const KIT_GLSL = /* glsl */ `
#ifndef MP_KIT
#define MP_KIT
uniform float uMpSeed;
const vec3 MP_LUMA = vec3(0.2126, 0.7152, 0.0722);
const float MP_CAP = 0.92;
const vec3 MP_INK = vec3(0.055, 0.047, 0.086);
const vec3 MP_FAR = vec3(0.078, 0.090, 0.157);
const vec3 MP_MID = vec3(0.165, 0.188, 0.267);
const vec3 MP_NEAR = vec3(0.275, 0.306, 0.404);
const vec3 MP_GLOW = vec3(0.514, 0.557, 0.651);
const vec3 MP_WISP = vec3(0.682, 0.702, 0.725);
const vec3 MP_RIM = vec3(0.855, 0.878, 0.886);
const vec3 MP_BLUE = vec3(0.184, 0.490, 1.000);
const vec3 MP_BLUE_RIM = vec3(0.435, 0.651, 0.839);
const vec3 MP_RED = vec3(1.000, 0.169, 0.227);
const vec3 MP_RED_LINE = vec3(0.863, 0.353, 0.396);
const vec3 MP_PINK = vec3(0.965, 0.812, 0.847);
const vec3 MP_PURPLE = vec3(0.482, 0.173, 0.749);
const vec3 MP_VIOLET = vec3(0.914, 0.294, 1.000);
float mpLuma(vec3 c) { return dot(max(c, vec3(0.0)), MP_LUMA); }
vec3 mpCap(vec3 c) { return c * min(1.0, MP_CAP / max(mpLuma(c), 1e-4)); }
vec3 mpFloor(vec3 c) { return mix(MP_INK, c, smoothstep(0.035, 0.08, mpLuma(c))); }
vec3 mpOut(vec3 c) { return mpCap(mpFloor(c)); }
float mpH(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uMpSeed * 0.37); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float mpVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mpH(i), mpH(i + vec2(1.0, 0.0)), f.x), mix(mpH(i + vec2(0.0, 1.0)), mpH(i + vec2(1.0, 1.0)), f.x), f.y);
}
float mpFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 3; k++) { s += a * mpVn(p); p *= 2.03; a *= 0.5; } return s / 0.875; }
float mpTwos(float t, float fps) { return floor(t * fps + 1e-4) / fps; }
float mpAA(float v, float e) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(e - w, e + w, v); }
float mpFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float mpLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float mpBand(float v, float n) { return floor(clamp(v, 0.0, 0.9999) * n) / n; }
vec3 mpShade(vec3 lit, float k) { return min(lit * k * vec3(0.88, 0.95, 1.10), vec3(1.0)); }
#endif
`;

export const mappaKit = {
  name: "mappaKit",
  doc: "MAPPA digital-TV kit: cool desaturated palette, hard-band helpers, twos clock, hue-shifted shade; every mappa shader needs it",
  draws: "Nothing by itself: the shared palette and helpers of the MAPPA look.",
  use: "grade", suits: "p-aether-lang, pr-triton-kernels-22, pr-mujoco-3396",
  params: "uMpSeed: integer-valued seed that re-rolls every hash and noise",
  glsl: KIT_GLSL,
  uniforms: (o = {}) => ({ uMpSeed: { value: o.uMpSeed ?? 1 } }),
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float x = p.x / 1.6;
    vec3 c = mix(mix(MP_FAR, MP_MID, step(0.25, x)), mix(MP_NEAR, MP_RIM, step(0.75, x)), step(0.5, x));
    return mpOut(mix(c, mpShade(c, 0.6), step(p.y, 0.3))); }`,
};
