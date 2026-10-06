// Shared occult kit. One show: red-black-seal, pinwheel, soot, moon, loop.
// Laws: luma ≤ 0.92; fwidth AA; ink is deep cinnabar / indigo, never #000.

export const KIT_GLSL = /* glsl */ `
const vec3 MY_LUMA = vec3(0.2126, 0.7152, 0.0722);
const float MY_CAP = 0.92;
const vec3 MY_INK = vec3(0.145, 0.032, 0.058);
const vec3 MY_INDIGO = vec3(0.055, 0.042, 0.125);
const vec3 MY_SOOT = vec3(0.088, 0.046, 0.064);
const vec3 MY_SEAL = vec3(0.702, 0.078, 0.165);
const vec3 MY_CINNABAR = vec3(0.620, 0.145, 0.118);
const vec3 MY_MOON = vec3(0.780, 0.615, 0.575);
const vec3 MY_SKYRED = vec3(0.470, 0.075, 0.118);
const vec3 MY_PAPER = vec3(0.775, 0.698, 0.618);
const vec3 MY_EMBER = vec3(0.720, 0.275, 0.098);
const vec3 MY_TORCH = vec3(0.805, 0.475, 0.175);
const vec3 MY_CAVE = vec3(0.098, 0.078, 0.175);
const vec3 MY_CROW = vec3(0.118, 0.062, 0.095);
const vec2 MY_C = vec2(0.72, 0.52);

float myLuma(vec3 c) { return dot(max(c, 0.0), MY_LUMA); }
vec3 myFloor(vec3 c) { return max(c, vec3(0.042, 0.028, 0.048)); }
vec3 myCap(vec3 c) { float L = myLuma(c); return c * min(1.0, MY_CAP / max(L, 1e-4)); }
vec3 myOut(vec3 c) { return myCap(myFloor(c)); }
float myAA(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float myFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float myLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
float myBand(float v, float a, float b) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v)); }
float myH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
vec2 myH22(vec2 p) { float a = myH21(p); return vec2(a, myH21(p + a + 17.0)); }
float myVn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(myH21(i), myH21(i + vec2(1.0, 0.0)), f.x), mix(myH21(i + vec2(0.0, 1.0)), myH21(i + vec2(1.0, 1.0)), f.x), f.y);
}
const mat2 MY_ROT = mat2(1.6, 1.2, -1.2, 1.6);
float myFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * myVn(p); p = MY_ROT * p; a *= 0.5; } return s; }
float myRidge(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(2.0 * myVn(p) - 1.0)); p = MY_ROT * p; a *= 0.5; } return s; }
vec2 myWarp(vec2 p, float k) { return p + k * vec2(myFbm(p + vec2(1.7, 9.2)), myFbm(p + vec2(8.3, 2.8))); }
vec2 myPolar(vec2 p, vec2 c) { vec2 q = p - c; return vec2(length(q), atan(q.y, q.x)); }
float myHold(float t, float fps) { return floor(t * fps + 1e-5) / fps; }
float mySaw(float a, float n) { float k = a * n / 6.2831853; return abs(fract(k + 0.5) - 0.5); }
float myPin(float a, float n) { return abs(fract(a * n / 6.2831853) - 0.5); }
vec2 myFold(vec2 q, float n) {
  float a = atan(q.y, q.x), r = length(q), fold = 6.2831853 / max(n, 2.0);
  float af = abs(mod(a, fold) - fold * 0.5);
  return vec2(cos(af), sin(af)) * r;
}
float mySeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float myBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float myDisc(vec2 p, float r) { return length(p) - r; }
float myRing(float r, float r0, float hw) { return abs(r - r0) - hw; }
float myTomoe(vec2 p) {
  float d0 = length(p) - 0.22;
  float d1 = length(p - vec2(0.15, 0.07)) - 0.155;
  return max(d0, -d1);
}
float myCloudBlob(vec2 p) {
  float d = length(p - vec2(-0.13, 0.00)) - 0.155;
  d = min(d, length(p - vec2(0.07, 0.05)) - 0.135);
  d = min(d, length(p - vec2(0.20, -0.02)) - 0.108);
  d = min(d, length(p - vec2(-0.01, 0.11)) - 0.098);
  return d;
}
float myCrow(vec2 p) {
  float w1 = mySeg(p, vec2(-0.085, 0.028), vec2(0.0, 0.0));
  float w2 = mySeg(p, vec2(0.085, 0.022), vec2(0.0, 0.0));
  float body = length(p - vec2(0.0, -0.008)) - 0.016;
  return min(min(w1 - 0.011, w2 - 0.011), body);
}
float myArch(vec2 p, float w, float h) {
  vec2 q = vec2(p.x, p.y);
  float body = myBox(q, vec2(w, h));
  float cap = length(vec2(q.x, q.y - h)) - w;
  return min(body, cap);
}
vec3 myMix3(float u, vec3 a, vec3 b, vec3 c) {
  u = clamp(u, 0.0, 1.0);
  return u < 0.5 ? mix(a, b, u * 2.0) : mix(b, c, u * 2.0 - 1.0);
}
float myCelN(float v, float n) {
  float x = clamp(v, 0.0, 1.0) * n;
  float f = fract(x), w = fwidth(x) * 0.75 + 1e-5;
  return (floor(x) + smoothstep(0.5 - w, 0.5 + w, f)) / n;
}
vec3 myPaper(vec2 p) {
  float fiber = myVn(vec2(p.x * 22.0 + p.y * 2.1, p.y * 4.0)) * 0.52 + myVn(p * 46.0) * 0.18;
  return mix(vec3(0.68, 0.60, 0.52), vec3(0.82, 0.74, 0.64), fiber);
}
vec3 myNight(vec2 p, float t) {
  float g = clamp(p.y * 0.58 + 0.18, 0.0, 1.0);
  vec3 c = mix(MY_INDIGO, MY_SKYRED, g * 0.88);
  c = mix(c, MY_SOOT, myFbm(p * 2.3 + t * 0.04) * 0.28);
  return c;
}
vec3 mySealWash(vec2 p) {
  float v = myFbm(p * 1.8);
  return myMix3(v, MY_INDIGO, MY_SOOT, MY_SEAL * 0.55);
}
`;

export const mythKit = {
  name: "mythKit",
  doc: "shared occult show: cinnabar/indigo ink, red-black-seal, fwidth AA, luma cap 0.92, tomoe/cloud/crow operators",
  glsl: KIT_GLSL,
};
