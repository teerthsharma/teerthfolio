// Optimal transport / displacement interpolation — 4 operators.
import { D } from "./define.js";

export default [
  D("transport", "deepDisplacementInterp", "McCann displacement: rays x_t = (1−t)a + t T(a)", /* glsl */ `
    vec3 deepDisplacementInterp(vec2 p, float t) {
      float s = 0.5 + 0.5 * sin(t * 0.35);
      vec3 col = dmPaper(p);
      for (int i = 0; i < 9; i++) {
        vec2 a = dmSite(i, 0.0);
        vec2 b = dmSite(i, 4.2) + vec2(0.18, -0.06);
        vec2 xt = mix(a, b, s);
        vec2 ab = b - a;
        vec2 pa = p - a;
        float h = clamp(dot(pa, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
        float ray = dmFill(length(pa - ab * h) - 0.006);
        col = mix(col, DM_TEAL, ray * 0.55);
        col = mix(col, DM_AMBER, dmFill(length(p - xt) - 0.014));
        col = mix(col, DM_INK, dmFill(length(p - a) - 0.01) * 0.7);
      }
      return dmTone(col);
    }`),
  D("transport", "deepWassersteinGeodesic", "W2 geodesic of Gaussians: lerp means, geo of covariances", /* glsl */ `
    vec3 deepWassersteinGeodesic(vec2 p, float t) {
      float s = 0.5 + 0.5 * sin(t * 0.28);
      vec2 m0 = vec2(0.42, 0.55), m1 = vec2(1.02, 0.44);
      vec2 m = mix(m0, m1, s);
      float s0 = 0.09, s1 = 0.16;
      float sig = mix(s0, s1, s);
      float g = exp(-dot(p - m, p - m) / max(2.0 * sig * sig, 1e-4));
      vec3 col = mix(DM_COOL, DM_AMBER, g);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(g, 0.35, 1.3) * 0.75);
      col = mix(col, DM_TEAL, dmFill(length(p - m0) - 0.012) + dmFill(length(p - m1) - 0.012));
      return dmTone(col);
    }`),
  D("transport", "deepCBrenierMap", "Brenier map ∇φ of a convex potential, warped grid", /* glsl */ `
    vec3 deepCBrenierMap(vec2 p, float t) {
      vec2 c = vec2(0.72 + 0.05 * sin(t * 0.2), 0.50);
      float phi = 0.5 * dot(p, p) + 0.12 * exp(-dot(p - c, p - c) * 8.0);
      vec2 T = p + (-0.24 * (p - c) * exp(-dot(p - c, p - c) * 8.0));
      vec2 g = abs(fract(T * 5.5) - 0.5);
      float grid = dmLine(min(g.x, g.y) - 0.0, 1.1);
      float q = 0.5 + 0.5 * tanh((phi - 0.55) * 3.0);
      vec3 col = mix(DM_COOL, DM_WARM, q);
      col = mix(dmPaper(p), col, 0.75);
      col = mix(col, DM_INK, grid * 0.7);
      col = mix(col, DM_AMBER, dmFill(length(p - c) - 0.018));
      return dmTone(col);
    }`),
  D("transport", "deepSinkhornKernel", "entropic OT: Gibbs kernel exp(−|x−y|²/ε) between two measures", /* glsl */ `
    vec3 deepSinkhornKernel(vec2 p, float t) {
      float eps = 0.08 + 0.03 * sin(t * 0.4);
      float K = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 a = dmSite(i, 0.0);
        vec2 b = dmSite(i + 4, 1.7);
        K += exp(-dot(p - a, p - a) / eps) * exp(-dot(p - b, p - b) / eps);
      }
      vec3 col = mix(DM_VIOLET, DM_AMBER, clamp(K * 8.0, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(K, 0.04, 1.25) * 0.7);
      return dmTone(col);
    }`),
];
