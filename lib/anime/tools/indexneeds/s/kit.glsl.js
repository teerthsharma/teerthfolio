// INDEX S grammar. Every indexneeds/s module prepends this and ends colour with sOut.
// Laws: luma ≤ 0.92; fwidth AA; ink is deep indigo / umber, never literal black;
// gold is wavelength-biased (lift R, hold G, kill B), not yellow paint.

export const KIT_GLSL = /* glsl */ `
const vec3 S_LUMA = vec3(0.2126, 0.7152, 0.0722);
const float S_CAP = 0.92;
const vec3 S_INK = vec3(0.055, 0.035, 0.090);
const vec3 S_VOID = vec3(0.102, 0.043, 0.239);
const vec3 S_UMBER = vec3(0.165, 0.094, 0.078);
const vec3 S_PAPER = vec3(0.910, 0.855, 0.745);
const vec3 S_CREAM = vec3(0.920, 0.880, 0.720);
const vec3 S_CITRUS = vec3(0.920, 0.780, 0.255);
const vec3 S_MAG = vec3(0.816, 0.165, 0.604);
const vec3 S_SEAL = vec3(0.702, 0.078, 0.165);
const vec3 S_CINN = vec3(0.620, 0.145, 0.118);
const vec3 S_MOON = vec3(0.780, 0.280, 0.175);
const vec3 S_INDIGO = vec3(0.055, 0.042, 0.125);
const vec3 S_GOLD = vec3(0.847, 0.643, 0.220);
const vec2 S_C = vec2(0.72, 0.52);

float sLuma(vec3 c) { return dot(max(c, 0.0), S_LUMA); }
vec3 sFloor(vec3 c) { return max(c, S_INK); }
vec3 sCap(vec3 c) { float L = sLuma(c); return sFloor(c * min(1.0, S_CAP / max(L, 1e-4))); }
vec3 sOut(vec3 c) { return sCap(sFloor(c)); }

float sAA(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
float sFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float sLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
float sBand(float v, float a, float b) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v)); }

float sH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
vec2 sH22(vec2 p) { float a = sH21(p); return vec2(a, sH21(p + a + 17.0)); }
float sVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sH21(i), sH21(i + vec2(1.0, 0.0)), f.x), mix(sH21(i + vec2(0.0, 1.0)), sH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float sFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * sVn(p); p *= 2.03; a *= 0.5; } return s; }

float sSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float sBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sDisc(vec2 p, float r) { return length(p) - r; }
float sRing(float r, float r0, float hw) { return abs(r - r0) - hw; }
vec2 sPolar(vec2 p, vec2 c) { vec2 q = p - c; return vec2(length(q), atan(q.y, q.x)); }

float sCelN(float v, float n) {
  float x = clamp(v, 0.0, 1.0) * n;
  float f = fract(x), w = fwidth(x) * 0.75 + 1e-5;
  return (floor(x) + smoothstep(0.5 - w, 0.5 + w, f)) / n;
}
vec3 sCel3(float v, float t1, float t2, vec3 dark, vec3 mid, vec3 lit) {
  return mix(mix(dark, mid, sAA(v, t1)), lit, sAA(v, t2));
}
vec3 sGold(vec3 c) { return sCap(vec3(c.r * 1.16 + 0.10, c.g * 0.88 + 0.06, c.b * 0.22)); }
vec3 sInvert(vec3 c) { return sCap(vec3(1.0) - c); }

float sTomoe(vec2 p) {
  float d0 = length(p) - 0.22;
  float d1 = length(p - vec2(0.15, 0.07)) - 0.155;
  return max(d0, -d1);
}
float sCrow(vec2 p) {
  float w1 = sSeg(p, vec2(-0.085, 0.028), vec2(0.0, 0.0));
  float w2 = sSeg(p, vec2(0.085, 0.022), vec2(0.0, 0.0));
  float body = length(p - vec2(0.0, -0.008)) - 0.016;
  return min(min(w1 - 0.011, w2 - 0.011), body);
}
float sStar4(vec2 p, float r) {
  p = abs(p);
  float s = (sqrt(p.x) + sqrt(p.y)) / sqrt(max(r, 1e-4));
  return pow(clamp(1.0 - s, 0.0, 1.0), 1.6);
}
vec3 sSphereN(vec2 p, vec2 c, float R) {
  vec2 q = (p - c) / max(R, 1e-4);
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  return normalize(vec3(q, z + 1e-4));
}
float sCover(vec2 p, vec2 c, float R) { return sFill(length(p - c) - R); }
`;

export const indexSKit = {
  name: "indexSKit",
  doc: "INDEX S grammar: fwidth AA, luma cap 0.92, indigo ink, wavelength gold, tomoe/crow/matcap helpers",
  glsl: KIT_GLSL,
};
