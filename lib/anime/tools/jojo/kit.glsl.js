// Shared Araki law. Every jojo/ module prepends this and ends colour with jCap (luma ≤ 0.92).
// Ink is deep indigo / umber, never #000. Edges use fwidth. Gold is wavelength-biased, not yellow paint.

export const KIT = /* glsl */ `
const vec3 JOJO_INK = vec3(0.0196, 0.0078, 0.0392);
const vec3 JOJO_UMBER = vec3(0.1020, 0.0627, 0.1255);
const vec3 JOJO_SINO = vec3(0.7255, 0.3412, 0.2275);
const vec3 JOJO_MAG = vec3(0.8157, 0.1647, 0.6039);
const vec3 JOJO_CITRUS = vec3(1.0000, 0.8824, 0.2902);
const vec3 JOJO_CREAM = vec3(0.9843, 0.9647, 0.9098);
const vec3 JOJO_COLD = vec3(0.1098, 0.1412, 0.2824);
const vec3 LUMA_W = vec3(0.2126, 0.7152, 0.0722);

float jLuma(vec3 c) { return dot(max(c, 0.0), LUMA_W); }
vec3 jCap(vec3 c) { float L = jLuma(c); return c * min(1.0, 0.92 / max(L, 1e-4)); }
float jAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float jFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float jLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }

float jH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 jH22(vec2 p) { float a = jH21(p); return vec2(a, jH21(p + a + 17.0)); }
float jVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(jH21(i), jH21(i + vec2(1.0, 0.0)), f.x), mix(jH21(i + vec2(0.0, 1.0)), jH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float jFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * jVn(p); p *= 2.03; a *= 0.5; } return s; }
vec2 jVor(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); float d = length(g + jH22(i + g) - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2 - d1);
}

vec3 jCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, jAA(v, t1)), lit, jAA(v, t2));
}
float jCut(vec2 p, float shift) {
  float s = dot(p, vec2(0.83, -0.56)) * 3.0 + shift, fs = fract(s), w = fwidth(s) + 1e-5;
  return clamp(min(fs - 0.64, 1.0 - fs) / w + 0.5, 0.0, 1.0);
}
float jHatch(vec2 fc, float pitch) {
  float px = max(fc.y / 720.0, 1.0);
  float h = (fc.x - fc.y) / (pitch * px);
  float g = min(fract(h), 1.0 - fract(h));
  return 1.0 - smoothstep(0.08, 0.14, g);
}
float jPanel(vec2 q, float px) {
  vec2 fw = fwidth(q) + 1e-6, g = abs(fract(q - 0.5) - 0.5) / fw;
  return (1.0 - smoothstep(0.5, 1.5, min(g.x, g.y))) * (1.0 - smoothstep(0.25, 0.5, max(fw.x, fw.y))) * step(0.5, px);
}
float jSaw(float a, float n) {
  float k = a * n / 6.2831853;
  return abs(fract(k + 0.5) - 0.5);
}
vec3 jGold(vec3 c) {
  vec3 g = vec3(c.r * 1.16 + 0.10, c.g * 0.88 + 0.06, c.b * 0.22);
  return jCap(g);
}
vec3 jInvert(vec3 c) { return jCap(1.0 - c); }
float jStar4(vec2 p, float r) {
  p = abs(p); float s = (sqrt(p.x) + sqrt(p.y)) / sqrt(max(r, 1e-4));
  return pow(clamp(1.0 - s, 0.0, 1.0), 1.6);
}
float jEmit(float k) { return k * 0.55; }
`;

export function defineModule(name, family, doc, glsl, demoExpr) {
  return {
    name,
    family,
    doc,
    glsl,
    demo: `vec3 demo(vec2 p, float t){ return jCap(${demoExpr}); }`,
  };
}
