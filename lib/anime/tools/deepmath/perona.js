// Anisotropic diffusion / Perona–Malik ink — 5 operators.
import { D } from "./define.js";

export default [
  D("perona", "deepPeronaMalik", "Perona–Malik: g(|∇u|)=1/(1+|∇u|²/K²) edge-stopping ink", /* glsl */ `
    vec3 deepPeronaMalik(vec2 p, float t) {
      vec2 g = dmGrad(p, t);
      float gn = length(g);
      float K = 1.8;
      float stop = 1.0 / (1.0 + (gn * gn) / (K * K));
      float u = dmPhi(p, t);
      vec3 col = mix(DM_COOL, DM_WARM, 0.45 + 0.55 * clamp(u, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.75);
      col = mix(col, DM_INK, (1.0 - stop) * 0.72);
      col = mix(col, DM_AMBER, dmIso(u, 0.22, 1.3) * 0.45);
      col = mix(col, DM_TEAL, dmHatch(p, g, 18.0) * stop * 0.35);
      return dmTone(col);
    }`),
  D("perona", "deepWeickertTensor", "Weickert structure tensor: hatch along the coherence eigenvector", /* glsl */ `
    vec3 deepWeickertTensor(vec2 p, float t) {
      vec2 g = dmGrad(p, t);
      float e1 = g.x, e2 = g.y;
      vec2 v = length(g) > 1e-4 ? normalize(vec2(-e2, e1)) : vec2(1.0, 0.0);
      float coh = dot(g, g);
      vec3 col = mix(dmPaper(p), DM_TEAL, clamp(coh * 0.12, 0.0, 0.7));
      col = mix(col, DM_INK, dmHatch(p, v, 16.0 + 28.0 * clamp(coh * 0.08, 0.0, 1.0)) * 0.7);
      col = mix(col, DM_AMBER, dmIso(dmPhi(p, t), 0.22, 1.25) * 0.4);
      return dmTone(col);
    }`),
  D("perona", "deepCharbonnier", "Charbonnier regularizer 1/sqrt(1+|∇u|²/ε) as a soft edge plate", /* glsl */ `
    vec3 deepCharbonnier(vec2 p, float t) {
      vec2 g = dmGrad(p, t);
      float eps = 0.35;
      float ch = 1.0 / sqrt(1.0 + dot(g, g) / (eps * eps));
      float u = dmPhi(p, t);
      vec3 col = mix(DM_VIOLET, DM_MINT, ch);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, (1.0 - ch) * 0.65);
      col = mix(col, DM_AMBER, dmIso(u, 0.20, 1.3) * 0.5);
      return dmTone(col);
    }`),
  D("perona", "deepTotalVariation", "TV / ROF: |∇u| staircasing, soft-threshold isolines", /* glsl */ `
    vec3 deepTotalVariation(vec2 p, float t) {
      float u = dmPhi(p, t);
      float q = floor(u * 5.0 + 0.15 * sin(t * 0.4)) / 5.0;
      vec2 g = dmGrad(p, t);
      float tv = length(g);
      vec3 col = mix(DM_COOL, DM_WARM, clamp(q * 1.3, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(u, q, 1.5) * 0.85);
      col = mix(col, DM_RUST, clamp(tv * 0.08, 0.0, 0.45));
      return dmTone(col);
    }`),
  D("perona", "deepCoherenceEnhance", "coherence-enhancing shock: sharpen along the minor eigenvector", /* glsl */ `
    vec3 deepCoherenceEnhance(vec2 p, float t) {
      vec3 H = dmHess(p, t);
      vec2 g = dmGrad(p, t);
      vec2 minor = normalize(vec2(-g.y, g.x) + vec2(1e-4, 0.0));
      float shock = tanh((H.x + H.z) * 0.015);
      float u = dmPhi(p, t) - 0.08 * shock;
      vec3 col = mix(DM_COOL, DM_AMBER, 0.5 + 0.5 * clamp(u, -0.2, 1.0));
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmHatch(p, minor, 26.0) * 0.5);
      col = mix(col, DM_RUST, dmIso(u, 0.18, 1.4) * 0.7);
      return dmTone(col);
    }`),
];
