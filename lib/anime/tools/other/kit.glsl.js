// Shared other-world law. Every other/ module prepends this and ends colour with oCap (luma ≤ 0.92).
// Ink is deep indigo / umber, never #000. Edges use fwidth. Families own their palettes.

export const KIT_GLSL = /* glsl */ `
const vec3 O_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 O_INK = vec3(0.055, 0.042, 0.078);
const vec3 O_UMBER = vec3(0.14, 0.09, 0.07);
const vec3 O_VOID = vec3(0.048, 0.040, 0.072);
const float O_LUMA_MAX = 0.92;

float oLuma(vec3 c) { return dot(max(c, 0.0), O_LUMA); }
vec3 oCap(vec3 c) {
  c = max(c, O_VOID * 0.85);
  float L = oLuma(c);
  return c * min(1.0, O_LUMA_MAX / max(L, 1e-4));
}
float oAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float oFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float oLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }
float oBand(float v, float a, float b) { return oAA(v, a) * (1.0 - oAA(v, b)); }

float oH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 14.32); return fract(p.x * p.y); }
vec2 oH22(vec2 p) { float a = oH21(p); return vec2(a, oH21(p + a + 17.0)); }
float oVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(oH21(i), oH21(i + vec2(1.0, 0.0)), f.x), mix(oH21(i + vec2(0.0, 1.0)), oH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
const mat2 O_ROT = mat2(1.6, 1.2, -1.2, 1.6);
float oFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * oVn(p); p = O_ROT * p; a *= 0.5; } return s; }
float oRidge(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * (1.0 - abs(2.0 * oVn(p) - 1.0)); p = O_ROT * p; a *= 0.5; } return s; }
vec2 oVor(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); float d = length(g + oH22(i + g) - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2 - d1);
}
float oHatch(vec2 fc, float pitch) {
  float px = max(fc.y / 720.0, 1.0);
  float h = (fc.x - fc.y) / (pitch * px);
  float g = min(fract(h), 1.0 - fract(h));
  return 1.0 - smoothstep(0.08, 0.14, g);
}
float oTone(vec2 p, float amt) {
  vec2 q = mat2(0.866, -0.5, 0.5, 0.866) * p * 38.0;
  float d = length(fract(q) - 0.5);
  float r = mix(0.10, 0.36, clamp(amt, 0.0, 1.0));
  return 1.0 - smoothstep(r - fwidth(d) * 1.2, r + fwidth(d) * 1.2, d);
}
float oSeg(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return oFill(length(pa - ba * h) - w);
}
float oBox(vec2 p, vec2 a, vec2 b) { vec2 d = max(a - p, p - b); return oFill(max(d.x, d.y)); }
vec3 oCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, oAA(v, t1)), lit, oAA(v, t2));
}
vec3 oMix3(float u, vec3 a, vec3 b, vec3 c) {
  u = clamp(u, 0.0, 1.0);
  return u < 0.5 ? mix(a, b, u * 2.0) : mix(b, c, u * 2.0 - 1.0);
}
`;

export const otherKit = {
  name: "otherKit",
  doc: "shared other-world luma/ink kit: indigo ink, luma 0.92, fwidth AA, cheap fbm — not a demo shader",
  glsl: KIT_GLSL,
};

export function defineModule(name, family, doc, glsl, demoExpr) {
  return {
    name,
    family,
    doc,
    deps: ["otherKit"],
    glsl,
    demo: `vec3 demo(vec2 p, float t){ return oCap(${demoExpr}); }`,
  };
}
