// Pierrot TV family kit: ink floor, luma cap, cel steps, hashes, anti-aliased fills shared by every pierrot shader.
export const KIT_GLSL = /* glsl */ `
#ifndef PRR_KIT
#define PRR_KIT
uniform float uPrrSeed;
const float PRR_CAP = 0.92;
const vec3 PRR_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 PRR_INK = vec3(0.071, 0.039, 0.063);
const vec3 PRR_CREAM = vec3(0.957, 0.910, 0.784);
const vec3 PRR_SHADE_K = vec3(0.67, 0.71, 0.75);

float prrLuma(vec3 c) { return dot(max(c, vec3(0.0)), PRR_LUMA); }
vec3 prrOut(vec3 c) {
  c = max(c, PRR_INK);
  return c * min(1.0, PRR_CAP / max(prrLuma(c), 1e-4));
}
float prrAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float prrFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float prrLine(float d, float px) {
  float f = fwidth(d) + 1e-6;
  return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d));
}
float prrH(vec2 p) {
  p = fract(p * vec2(127.1, 311.7) + uPrrSeed * 0.137);
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float prrVn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(prrH(i), prrH(i + vec2(1.0, 0.0)), f.x), mix(prrH(i + vec2(0.0, 1.0)), prrH(i + vec2(1.0, 1.0)), f.x), f.y);
}
float prrHold(float t, float fps) { return floor(t * fps + 1e-5) / max(fps, 1.0); }
vec3 prrSphereN(vec2 q) { return vec3(q, sqrt(max(0.0, 1.0 - dot(q, q)))); }
float prrNdL(vec3 n) { return dot(n, normalize(vec3(-0.5, 0.8, 0.4))); }
vec3 prrCel(vec3 key, float ndl, float t1, float t2) {
  vec3 shade = key * PRR_SHADE_K;
  vec3 deep = shade * vec3(0.80, 0.82, 0.90);
  return mix(mix(deep, shade, prrAA(ndl, t1)), key, prrAA(ndl, t2));
}
#endif
`;

export const pierrotKit = {
  name: "pierrotKit",
  doc: "shared Pierrot TV law: ink floor, 0.92 luma cap, hue-shifted cel steps, anti-aliased fills, seeded hashes",
  draws: "nothing on screen alone: it supplies the ink floor, luma cap, cel step helper and hashes every pierrot shader calls",
  use: "noise",
  suits: ["p-epsilon-hollow", "pr-pyrefly-4180", "pr-xnnpack-10801"],
  params: "uPrrSeed re-rolls every hash (default 1)",
  family: "pierrot",
  uniforms: () => ({ uPrrSeed: { value: 1 } }),
  glsl: KIT_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(prrCel(vec3(0.85, 0.5, 0.3), prrNdL(prrSphereN((p - vec2(0.8, 0.5)) * 3.0)), -0.15, 0.35) + 0.0 * prrVn(p)); }`,
};
