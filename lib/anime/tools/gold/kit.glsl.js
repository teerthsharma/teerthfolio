// One Giorno / GER grammar. Every gold/ module prepends this and ends colour with gOut.
// Laws: luma ≤ 0.92; fwidth AA; ink is deep indigo, never #000;
// gold is wavelength-biased grade + ladybug flake, not yellow paint;
// magenta streak, sinopia sketch, cream zero-disc, requiem arrow glint.

export const KIT_GLSL = /* glsl */ `
const vec3 G_INK   = vec3(0.0353, 0.0216, 0.0549);
const vec3 G_UMBER = vec3(0.1020, 0.0627, 0.1255);
const vec3 G_SINO  = vec3(0.7020, 0.0706, 0.1647);
const vec3 G_MAG   = vec3(0.8157, 0.1647, 0.6039);
const vec3 G_CREAM = vec3(0.9569, 0.9098, 0.7843);
const vec3 G_LEAF  = vec3(0.8510, 0.6431, 0.2549);
const vec3 G_WIG   = vec3(0.9098, 0.7216, 0.2902);
const vec3 G_CRIM  = vec3(0.7529, 0.1490, 0.8275);
const vec3 G_PINK  = vec3(0.8510, 0.5216, 0.7412);
const vec3 G_IRIS  = vec3(0.1216, 0.4784, 0.3529);
const vec3 G_SAP   = vec3(0.2902, 0.3529, 0.1647);
const vec3 G_LUMA  = vec3(0.2126, 0.7152, 0.0722);

float gLuma(vec3 c) { return dot(max(c, 0.0), G_LUMA); }
vec3 gFloor(vec3 c) { return max(c, G_INK); }
vec3 gCap(vec3 c) { float L = gLuma(c); return gFloor(c * min(1.0, 0.92 / max(L, 1e-4))); }
vec3 gOut(vec3 c) { return gCap(gFloor(c)); }

float gAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float gFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float gLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.85), abs(d)); }

float gH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 gH22(vec2 p) { float a = gH21(p); return vec2(a, gH21(p + a + 17.0)); }
float gVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gH21(i), gH21(i + vec2(1.0, 0.0)), f.x), mix(gH21(i + vec2(0.0, 1.0)), gH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float gFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * gVn(p); p *= 2.03; a *= 0.5; } return s; }
vec2 gVor(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); float d = length(g + gH22(i + g) - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2 - d1);
}

vec3 gCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, gAA(v, t1)), lit, gAA(v, t2));
}
float gCut(vec2 p, float shift) {
  float s = dot(p, vec2(0.83, -0.56)) * 3.0 + shift, fs = fract(s), w = fwidth(s) + 1e-5;
  return clamp(min(fs - 0.64, 1.0 - fs) / w + 0.5, 0.0, 1.0);
}
float gSaw(float a, float n) {
  float k = a * n / 6.2831853;
  return abs(fract(k + 0.5) - 0.5);
}
float gEmit(float k) { return k * 0.55; }
float gSeg(vec2 p, vec2 a, vec2 b, float w0) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - w0;
}
vec2 gPolar(vec2 p, vec2 c) { vec2 q = p - c; return vec2(length(q), atan(q.y, q.x)); }

vec3 gGold(vec3 c) {
  return gCap(vec3(c.r * 1.16 + 0.10, c.g * 0.88 + 0.06, c.b * 0.22));
}
vec3 gGoldBase() { return gGold(vec3(0.58, 0.40, 0.10)); }

float gFlake(vec2 p, float dens) {
  vec2 id = floor(p), f = fract(p) - 0.5;
  float h = gH21(id);
  return gFill(length(f - (gH22(id + 3.0) - 0.5) * 0.22) - 0.14 * step(1.0 - dens, h)) * step(1.0 - dens, h);
}
float gStar4(vec2 p, float r) {
  p = abs(p);
  float s = (sqrt(p.x) + sqrt(p.y)) / sqrt(max(r, 1e-4));
  return pow(clamp(1.0 - s, 0.0, 1.0), 1.6);
}
`;

export const goldKit = {
  name: "goldKit",
  doc: "Giorno/GER grammar: wavelength gold, ladybug flake, cream zero, sinopia, magenta streak, luma 0.92, no #000",
  glsl: KIT_GLSL,
};

export function G(name, family, doc, glsl, call) {
  return {
    name,
    family,
    doc,
    deps: ["goldKit"],
    glsl: /* glsl */ `\n${glsl}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return gOut(${call}); }`,
  };
}
