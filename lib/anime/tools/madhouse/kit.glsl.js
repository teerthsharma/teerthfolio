// Madhouse kit: ink floor, luma cap, hard fills, seeded hash and fbm shared by every mh shader.
export const KIT_GLSL = /* glsl */ `
uniform float uMhSeed;
const vec3 MH_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 MH_INK = vec3(0.039, 0.055, 0.047);
const vec3 MH_CREAM = vec3(0.949, 0.902, 0.847);
const vec3 MH_RED = vec3(0.702, 0.090, 0.122);
const vec3 MH_GOLD = vec3(0.851, 0.643, 0.255);
const vec3 MH_DEEPV = vec3(0.102, 0.047, 0.141);
const vec3 MH_COAT = vec3(0.525, 0.667, 0.839);

float mhLuma(vec3 c) { return dot(max(c, vec3(0.0)), MH_LUMA); }
vec3 mhOut(vec3 c) {
  c *= min(1.0, 0.92 / max(mhLuma(c), 1e-4));
  return mix(MH_INK, c, smoothstep(0.035, 0.08, mhLuma(c)));
}
float mhAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float mhFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float mhLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float mhH21(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uMhSeed * 0.137); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float mhVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mhH21(i), mhH21(i + vec2(1.0, 0.0)), f.x), mix(mhH21(i + vec2(0.0, 1.0)), mhH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float mhFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * mhVn(p); p *= 2.03; a *= 0.5; } return s; }
float mhHold(float t, float fps) { return floor(t * fps + 1e-5) / fps; }
float mhNdL(vec2 p, vec2 c, float r, vec3 L) {
  vec2 q = (p - c) / r; float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  return dot(normalize(vec3(q, z + 1e-4)), normalize(L));
}
`;
export const mhKit = {
  name: "mhKit",
  doc: "Madhouse shared law: ink #0a0e0c floor, 0.92 luma cap, hard fills, seeded hash and fbm; every mh shader needs it",
  draws: "nothing on screen by itself; it supplies the Madhouse ink colour, luma cap, hard-edge fills, seeded noise and a sphere N.L helper",
  use: "noise", suits: ["p-nerve", "pr-topograph-432", "p-resolvent"],
  params: "uMhSeed: integer-valued seed that shifts every hash and noise",
  family: "madhouse", glsl: KIT_GLSL,
  uniforms: () => ({ uMhSeed: { value: 7 } }),
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float n = mhFbm(p * 6.0); return mhOut(mix(MH_INK, MH_COAT, mhAA(n, 0.5))); }`,
};
