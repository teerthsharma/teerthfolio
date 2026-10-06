// Heat / Poisson / Laplace relax — 6 operators.
import { D } from "./define.js";

export default [
  D("heat", "deepHeatKernel", "heat kernel k_τ(x,s) = (4πτ)^{-1} exp(-|x-s|²/4τ) isolines", /* glsl */ `
    vec3 deepHeatKernel(vec2 p, float t) {
      vec2 s = vec2(0.62 + 0.08 * sin(t * 0.35), 0.50);
      float tau = 0.045 + 0.018 * sin(t * 0.42);
      float k = dmHeat(p, s, tau);
      float q = clamp(k * 0.11, 0.0, 1.0);
      vec3 col = dmMix3(q, DM_COOL, DM_TEAL, DM_AMBER);
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_INK, dmIso(k, floor(k * 8.0) / 8.0, 1.25) * 0.88);
      col = mix(col, DM_AMBER, dmFill(length(p - s) - 0.016));
      return dmTone(col);
    }`),
  D("heat", "deepPoissonSolve", "Poisson Δu = −ρ: free-space log potential of charge lumps", /* glsl */ `
    vec3 deepPoissonSolve(vec2 p, float t) {
      float u = 0.0;
      for (int i = 0; i < 5; i++) {
        vec2 s = dmSite(i, t);
        float q = mix(-1.0, 1.0, dmH21(vec2(float(i), 2.2)));
        u += q * log(length(p - s) + 0.012);
      }
      float q = 0.5 + 0.5 * tanh(u * 0.55);
      vec3 col = mix(DM_VIOLET, DM_AMBER, q);
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmIso(u, floor(u * 5.0) / 5.0, 1.3) * 0.82);
      return dmTone(col);
    }`),
  D("heat", "deepLaplaceRelax", "Jacobi relax toward a harmonic: residual |Δu| bands fade", /* glsl */ `
    vec3 deepLaplaceRelax(vec2 p, float t) {
      float harm = dmMode(p, 1.0, 1.0) * 0.65 + dmMode(p, 2.0, 1.0) * 0.28;
      float noisy = harm + 0.22 * (dmFbm(p * 7.0 + t * 0.05) - 0.5);
      float a = 1.0 - exp(-t * 0.35);
      float u = mix(noisy, harm, a);
      float res = abs(dmLap(p, t * 0.15) * (1.0 - a) * 0.004 + (u - harm) * 4.0);
      vec3 col = mix(dmPaper(p), DM_TEAL, dmAA(abs(u), 0.12) * 0.55);
      col = mix(col, DM_RUST, clamp(res * 1.6, 0.0, 0.7));
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.4) * 0.8);
      return dmTone(col);
    }`),
  D("heat", "deepHeatMethod", "Varadhan geodesic: d ≈ sqrt(−4τ log k_τ) from a moving source", /* glsl */ `
    vec3 deepHeatMethod(vec2 p, float t) {
      vec2 s = vec2(0.58 + 0.10 * sin(t * 0.28), 0.48);
      float d = dmVaradhan(p, s, 0.055);
      float q = floor(d * 7.0) / 7.0;
      vec3 col = mix(DM_TEAL, dmPaper(p), clamp(q, 0.0, 1.0));
      col = mix(col, DM_INK, dmIso(d, floor(d * 7.0) / 7.0, 1.28) * 0.9);
      col = mix(col, DM_AMBER, dmFill(length(p - s) - 0.02));
      return dmTone(col);
    }`),
  D("heat", "deepBiLaplace", "biharmonic point load: fundamental solution r² log r rings", /* glsl */ `
    vec3 deepBiLaplace(vec2 p, float t) {
      vec2 s = vec2(0.70 + 0.06 * cos(t * 0.22), 0.50);
      float r = length(p - s);
      float u = r * r * log(r + 0.018) * cos(t * 0.15);
      float q = 0.5 + 0.5 * tanh(u * 2.4);
      vec3 col = dmMix3(q, DM_COOL, DM_WARM, DM_AMBER);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(u, floor(u * 6.0 + 3.0) / 6.0 - 0.5, 1.35) * 0.85);
      return dmTone(col);
    }`),
  D("heat", "deepGreenDisk", "Green function of the disk: log |x−y| minus image charge", /* glsl */ `
    vec3 deepGreenDisk(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50);
      float R = 0.32;
      vec2 y = c + 0.12 * vec2(cos(t * 0.32), sin(t * 0.32) * 0.7);
      vec2 yp = c + (R * R / max(dot(y - c, y - c), 1e-4)) * (y - c);
      float G = log(length(p - y) + 0.01) - log(length(p - yp) * length(y - c) / R + 0.01);
      float inside = dmFill(length(p - c) - R);
      vec3 col = mix(dmPaper(p) * vec3(0.92, 0.90, 0.88), mix(DM_VIOLET, DM_TEAL, 0.5 + 0.5 * tanh(G)), inside);
      col = mix(col, DM_INK, dmLine(length(p - c) - R, 1.6) * 0.9);
      col = mix(col, DM_INK, dmIso(G, floor(G * 5.0) / 5.0, 1.2) * inside * 0.75);
      col = mix(col, DM_AMBER, dmFill(length(p - y) - 0.014) * inside);
      return dmTone(col);
    }`),
];
