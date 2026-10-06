// Shared topo kit: paper/indigo/rust/teal/magenta, fwidth AA, luma cap 0.92, no pure black.
export const KIT_GLSL = /* glsl */ `
vec3 tPaper() { return vec3(0.93, 0.88, 0.78); }
vec3 tInk() { return vec3(0.16, 0.18, 0.34); }
vec3 tSaddle() { return vec3(0.72, 0.34, 0.16); }
vec3 tBirth() { return vec3(0.10, 0.54, 0.56); }
vec3 tDeath() { return vec3(0.70, 0.16, 0.40); }
vec3 tVoid() { return vec3(0.40, 0.28, 0.58); }
vec3 tAmber() { return vec3(0.82, 0.54, 0.20); }
vec3 tMint() { return vec3(0.22, 0.62, 0.48); }
vec3 tTone(vec3 c) {
  c = max(c, vec3(0.048, 0.052, 0.078));
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (L > 0.92) c *= 0.92 / max(L, 1e-5);
  return c;
}
float tAA(float d) { float w = fwidth(d) * 0.85 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float tFill(float d) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
float tLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
float tIso(float f, float lvl, float px) { float w = fwidth(f) + 1e-6; return 1.0 - smoothstep(px * 0.4, px * 0.55 + 0.45, abs(f - lvl) / w); }
float tBand(float f, float a, float b) { float w = fwidth(f) * 0.75 + 1e-5; return smoothstep(a - w, a + w, f) * (1.0 - smoothstep(b - w, b + w, f)); }
float tH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 tH22(vec2 p) { float a = tH21(p); return vec2(a, tH21(p + a + 17.0)); }
float tVN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tH21(i), tH21(i + vec2(1, 0)), f.x), mix(tH21(i + vec2(0, 1)), tH21(i + vec2(1, 1)), f.x), f.y); }
float tFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * tVN(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
float tMorse(vec2 p) {
  vec2 A = vec2(0.55, 0.64), B = vec2(1.05, 0.46);
  return exp(-dot(p - A, p - A) * 13.5) + 0.84 * exp(-dot(p - B, p - B) * 15.5) - 0.035 * dot(p - vec2(0.8, 0.52), p - vec2(0.8, 0.52));
}
vec2 tGrad(vec2 p) {
  float e = 0.0025;
  return vec2(tMorse(p + vec2(e, 0.0)) - tMorse(p - vec2(e, 0.0)), tMorse(p + vec2(0.0, e)) - tMorse(p - vec2(0.0, e))) / (2.0 * e);
}
vec3 tHess(vec2 p) {
  float e = 0.0035, f = tMorse(p);
  float fxx = (tMorse(p + vec2(e, 0.0)) + tMorse(p - vec2(e, 0.0)) - 2.0 * f) / (e * e);
  float fyy = (tMorse(p + vec2(0.0, e)) + tMorse(p - vec2(0.0, e)) - 2.0 * f) / (e * e);
  float fxy = (tMorse(p + vec2(e, e)) + tMorse(p - vec2(e, e)) - tMorse(p + vec2(e, -e)) - tMorse(p + vec2(-e, e))) / (4.0 * e * e);
  return vec3(fxx, fxy, fyy);
}
float tHessDet(vec2 p) { vec3 H = tHess(p); return H.x * H.z - H.y * H.y; }
float tHessTr(vec2 p) { vec3 H = tHess(p); return H.x + H.z; }
float tCrit(vec2 p) { return 1.0 - smoothstep(0.35, 1.15, length(tGrad(p))); }
float tTerrain(vec2 p) { return 0.52 * tFbm(p * 3.1) + 0.3 * tFbm(p * 6.8 + 2.7) + 0.14 * sin(p.x * 7.5) * cos(p.y * 6.2); }
vec2 tSite(int i, float t) {
  float fi = float(i);
  vec2 base = vec2(0.28, 0.18) + vec2(0.95, 0.68) * (0.5 + 0.5 * vec2(sin(fi * 2.399 + 0.31), cos(fi * 1.731 + 1.07)));
  return base + 0.035 * vec2(sin(t * 0.34 + fi), cos(t * 0.27 + fi * 1.4));
}
float tMinSite(vec2 p, float t) {
  float d = 8.0;
  for (int i = 0; i < 9; i++) d = min(d, length(p - tSite(i, t)));
  return d;
}
float tSecondSite(vec2 p, float t) {
  float d1 = 8.0, d2 = 8.0;
  for (int i = 0; i < 9; i++) {
    float d = length(p - tSite(i, t));
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2;
}
float tGaussK(vec2 p) { vec3 H = tHess(p); vec2 g = tGrad(p); return (H.x * H.z - H.y * H.y) / pow(1.0 + dot(g, g), 2.0); }
float tMeanH(vec2 p) {
  vec3 H = tHess(p); vec2 g = tGrad(p); float n = sqrt(1.0 + dot(g, g));
  return ((1.0 + g.y * g.y) * H.x - 2.0 * g.x * g.y * H.y + (1.0 + g.x * g.x) * H.z) / (2.0 * pow(n, 3.0));
}
float tHeat(vec2 p, vec2 s, float tau) { return exp(-dot(p - s, p - s) / max(4.0 * tau, 1e-4)) / max(tau, 0.03); }
float tVaradhan(vec2 p, vec2 s, float tau) { return sqrt(max(-4.0 * tau * log(max(tHeat(p, s, tau), 1e-8)), 0.0)); }
float tMode(vec2 p, float n, float m) { return sin(3.14159265 * n * p.x / 1.44) * sin(3.14159265 * m * p.y); }
float tDisk(vec2 p, vec2 c, float r) { return tFill(length(p - c) - r); }
float tSeg(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return tFill(length(pa - ba * h) - w);
}
float tBox(vec2 p, vec2 a, vec2 b) { vec2 d = max(a - p, p - b); return tFill(max(d.x, d.y)); }
vec3 tMix3(float u, vec3 a, vec3 b, vec3 c) { u = clamp(u, 0.0, 1.0); return u < 0.5 ? mix(a, b, u * 2.0) : mix(b, c, u * 2.0 - 1.0); }
vec3 tFieldPaper(float f) { return tTone(mix(tInk(), tPaper(), clamp(0.15 + 0.85 * f, 0.0, 1.0))); }
`;

export const topoKit = {
  name: "topoKit",
  doc: "shared topology palette, AA, Morse field, sites, heat, eigenmodes — not a demo shader",
  glsl: KIT_GLSL,
};
