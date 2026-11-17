// Shinkai kit: measured twilight palette helper, luma cap 0.92, ink floor #1a0e16, AA step, seeded hash and fbm.
export const KIT_GLSL = /* glsl */ `
uniform float uShinSeed;
const vec3 SHN_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 SHN_INK = vec3(0.0103, 0.0044, 0.0080);
vec3 shnC(float r, float g, float b) { return pow(vec3(r, g, b) / 255.0, vec3(2.2)); }
float shnLuma(vec3 c) { return dot(max(c, vec3(0.0)), SHN_LUMA); }
vec3 shnCap(vec3 c) { float l = shnLuma(c); return max(c * min(1.0, 0.92 / max(l, 1e-4)), SHN_INK); }
float shnAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
float shnSeg(float h, float a, float b) { return clamp((h - a) / (b - a), 0.0, 1.0); }
float shnH(vec2 p) { p = fract((p + uShinSeed) * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
float shnVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(shnH(i), shnH(i + vec2(1.0, 0.0)), f.x), mix(shnH(i + vec2(0.0, 1.0)), shnH(i + vec2(1.0, 1.0)), f.x), f.y);
}
float shnFbm(vec2 p) { return shnVn(p) * 0.55 + shnVn(p * 2.07 + 1.3) * 0.30 + shnVn(p * 4.13 + 4.1) * 0.15; }
float shnPaint(float v, float n) { float q = v * n; return (floor(q) + smoothstep(0.35, 0.65, fract(q))) / n; }
float shnHex(vec2 q, float r) { vec2 a = abs(q); return max(a.x * 0.8660254 + a.y * 0.5, a.y) - r * 0.8660254; }
`;

export const shinKit = {
  name: "shinKit",
  family: "shinkai",
  doc: "Shinkai grammar: sRGB hex helper, luma cap 0.92, ink floor #1a0e16, AA step, seeded hash and fbm, painted-band step",
  deps: [],
  glsl: KIT_GLSL,
  uniforms: () => ({ uShinSeed: { value: 0 } }),
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnCap(vec3(shnPaint(shnFbm(p * 6.0), 6.0)) * 0.8 + shnC(38.0, 70.0, 112.0) * 0.2); }`,
};
