// Deep-P grammar: PDEs, flows, spectra as anime plates.
// Laws: luma <= 0.92 via dmTone; fwidth AA on every mask; ink is indigo, never crushed black.
import { defineModule } from "./define.js";

export const KIT_GLSL = /* glsl */ `
  const vec3 DM_LUMA = vec3(0.2126, 0.7152, 0.0722);
  const vec3 DM_PAPER = vec3(0.90, 0.86, 0.78);
  const vec3 DM_INK = vec3(0.08, 0.07, 0.16);
  const vec3 DM_AMBER = vec3(0.82, 0.54, 0.22);
  const vec3 DM_TEAL = vec3(0.12, 0.48, 0.52);
  const vec3 DM_RUST = vec3(0.68, 0.28, 0.18);
  const vec3 DM_VIOLET = vec3(0.42, 0.26, 0.58);
  const vec3 DM_MINT = vec3(0.22, 0.58, 0.46);
  const vec3 DM_COOL = vec3(0.16, 0.22, 0.40);
  const vec3 DM_WARM = vec3(0.86, 0.66, 0.46);
  const float DM_CAP = 0.92;
  const float DM_PI = 3.14159265;

  float dmLuma(vec3 c) { return dot(c, DM_LUMA); }
  vec3 dmFloor(vec3 c) { return max(c, vec3(0.045, 0.038, 0.072)); }
  vec3 dmTone(vec3 c) {
    c = dmFloor(c);
    float L = dmLuma(c);
    return c * min(1.0, DM_CAP / max(L, 1e-4));
  }
  float dmAA(float v, float t) { float w = fwidth(v) + 1e-5; return smoothstep(t - w, t + w, v); }
  float dmFill(float d) { float w = fwidth(d) * 0.85 + 1e-5; return 1.0 - smoothstep(-w, w, d); }
  float dmLine(float d, float px) { float w = fwidth(d) * px + 1e-5; return 1.0 - smoothstep(0.0, w, abs(d)); }
  float dmIso(float f, float lvl, float px) {
    float w = fwidth(f) + 1e-6;
    return 1.0 - smoothstep(px * 0.35, px * 0.55 + 0.45, abs(f - lvl) / w);
  }
  float dmBand(float f, float a, float b) {
    float w = fwidth(f) * 0.75 + 1e-5;
    return smoothstep(a - w, a + w, f) * (1.0 - smoothstep(b - w, b + w, f));
  }
  float dmH21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
  vec2 dmH22(vec2 p) { float a = dmH21(p); return vec2(a, dmH21(p + a + 17.0)); }
  float dmVN(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(dmH21(i), dmH21(i + vec2(1.0, 0.0)), f.x), mix(dmH21(i + vec2(0.0, 1.0)), dmH21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float dmFbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * dmVN(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
    return s;
  }
  vec2 dmSite(int i, float t) {
    float fi = float(i);
    vec2 b = vec2(0.22, 0.18) + vec2(1.00, 0.66) * (0.5 + 0.5 * vec2(sin(fi * 2.399 + 0.31), cos(fi * 1.731 + 1.07)));
    return b + 0.03 * vec2(sin(t * 0.31 + fi), cos(t * 0.27 + fi * 1.3));
  }
  float dmPhi(vec2 p, float t) {
    vec2 A = vec2(0.52 + 0.06 * sin(t * 0.21), 0.62);
    vec2 B = vec2(1.00, 0.42 + 0.05 * cos(t * 0.17));
    return exp(-dot(p - A, p - A) * 12.0) + 0.82 * exp(-dot(p - B, p - B) * 14.0)
      - 0.04 * dot(p - vec2(0.78, 0.50), p - vec2(0.78, 0.50));
  }
  vec2 dmGrad(vec2 p, float t) {
    float e = 0.0028;
    return vec2(
      dmPhi(p + vec2(e, 0.0), t) - dmPhi(p - vec2(e, 0.0), t),
      dmPhi(p + vec2(0.0, e), t) - dmPhi(p - vec2(0.0, e), t)
    ) / (2.0 * e);
  }
  float dmLap(vec2 p, float t) {
    float e = 0.0032, f = dmPhi(p, t);
    return (dmPhi(p + vec2(e, 0.0), t) + dmPhi(p - vec2(e, 0.0), t)
      + dmPhi(p + vec2(0.0, e), t) + dmPhi(p - vec2(0.0, e), t) - 4.0 * f) / (e * e);
  }
  vec3 dmHess(vec2 p, float t) {
    float e = 0.0036, f = dmPhi(p, t);
    float fxx = (dmPhi(p + vec2(e, 0.0), t) + dmPhi(p - vec2(e, 0.0), t) - 2.0 * f) / (e * e);
    float fyy = (dmPhi(p + vec2(0.0, e), t) + dmPhi(p - vec2(0.0, e), t) - 2.0 * f) / (e * e);
    float fxy = (dmPhi(p + vec2(e, e), t) + dmPhi(p - vec2(e, e), t)
      - dmPhi(p + vec2(e, -e), t) - dmPhi(p + vec2(-e, e), t)) / (4.0 * e * e);
    return vec3(fxx, fxy, fyy);
  }
  float dmHeat(vec2 p, vec2 s, float tau) {
    return exp(-dot(p - s, p - s) / max(4.0 * tau, 1e-4)) / max(tau, 0.028);
  }
  float dmVaradhan(vec2 p, vec2 s, float tau) {
    return sqrt(max(-4.0 * tau * log(max(dmHeat(p, s, tau), 1e-8)), 0.0));
  }
  float dmMode(vec2 p, float n, float m) {
    return sin(DM_PI * n * p.x / 1.44) * sin(DM_PI * m * p.y);
  }
  float dmJ0(float x) {
    float ax = abs(x);
    float s = 1.0 - ax * ax * (0.25 - ax * ax * (0.015625 - ax * ax * 4.3403e-4));
    float asy = sqrt(0.63662 / max(ax, 0.45)) * cos(ax - 0.785398);
    return mix(s, asy, smoothstep(2.2, 5.4, ax));
  }
  float dmSech(float x) { float e = exp(-abs(x)); return 2.0 * e / (1.0 + e * e); }
  float dmMeanH(vec2 p, float t) {
    vec3 H = dmHess(p, t); vec2 g = dmGrad(p, t); float n = sqrt(1.0 + dot(g, g));
    return ((1.0 + g.y * g.y) * H.x - 2.0 * g.x * g.y * H.y + (1.0 + g.x * g.x) * H.z) / (2.0 * pow(n, 3.0));
  }
  float dmGaussK(vec2 p, float t) {
    vec3 H = dmHess(p, t); vec2 g = dmGrad(p, t);
    return (H.x * H.z - H.y * H.y) / pow(1.0 + dot(g, g), 2.0);
  }
  vec3 dmMix3(float u, vec3 a, vec3 b, vec3 c) {
    u = clamp(u, 0.0, 1.0);
    return u < 0.5 ? mix(a, b, u * 2.0) : mix(b, c, u * 2.0 - 1.0);
  }
  vec3 dmPaper(vec2 p) {
    float fiber = dmVN(vec2(p.x * 16.0 + p.y * 2.2, p.y * 3.0)) * 0.5 + dmVN(p * 40.0) * 0.18;
    return mix(vec3(0.78, 0.74, 0.68), DM_PAPER, fiber);
  }
  float dmHatch(vec2 p, vec2 dir, float pitch) {
    vec2 n = normalize(dir + vec2(1e-4, 0.0));
    float s = dot(p, vec2(-n.y, n.x)) * pitch;
    float g = min(fract(s), 1.0 - fract(s));
    float w = fwidth(s) + 1e-5;
    return 1.0 - smoothstep(0.12 * w, 0.28 + 0.4 * w, g);
  }
  vec2 dmC(vec2 p) { return p - vec2(0.72, 0.50); }
`;

export const deepmathKit = defineModule({
  name: "deepmathKit",
  doc: "shared deep-P grammar: luma cap 0.92, fwidth AA, indigo ink, heat / modes / curvature helpers",
  glsl: KIT_GLSL,
});
