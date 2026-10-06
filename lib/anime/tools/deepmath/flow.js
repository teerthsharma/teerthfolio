// Mean curvature / Willmore / Ricci-flow look — 5 operators.
import { D } from "./define.js";

export default [
  D("flow", "deepMeanCurvatureFlow", "MCF of a circle: r(t)=sqrt(R²−2t) shrinking fronts", /* glsl */ `
    vec3 deepMeanCurvatureFlow(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50);
      float R2 = 0.12;
      float tau = mod(t * 0.08, 0.055);
      float rt = sqrt(max(R2 - 2.0 * tau, 0.004));
      float d = length(p - c) - rt;
      vec3 col = mix(DM_WARM, DM_COOL, dmAA(d, 0.0));
      col = mix(dmPaper(p), col, 0.78);
      for (int i = 0; i < 5; i++) {
        float ri = sqrt(max(R2 - 2.0 * tau * float(i) / 4.0, 0.002));
        col = mix(col, DM_INK, dmLine(length(p - c) - ri, 1.2) * 0.55);
      }
      col = mix(col, DM_AMBER, dmLine(d, 1.8) * 0.85);
      return dmTone(col);
    }`),
  D("flow", "deepWillmoreEnergy", "Willmore density H² of the graph z=φ, energy hatch", /* glsl */ `
    vec3 deepWillmoreEnergy(vec2 p, float t) {
      float H = dmMeanH(p, t);
      float W = H * H;
      vec3 col = mix(dmPaper(p), DM_VIOLET, clamp(W * 0.08, 0.0, 0.85));
      col = mix(col, DM_AMBER, dmIso(H, 0.0, 1.35) * 0.7);
      col = mix(col, DM_INK, dmHatch(p, dmGrad(p, t), 20.0 + 30.0 * clamp(W * 0.05, 0.0, 1.0)) * 0.4);
      return dmTone(col);
    }`),
  D("flow", "deepRicciConformal", "Ricci-flow look: conformal factor e^{−2u} from Gaussian K", /* glsl */ `
    vec3 deepRicciConformal(vec2 p, float t) {
      float K = dmGaussK(p, t);
      float u = -0.08 * K * (0.6 + 0.4 * sin(t * 0.25));
      float conf = exp(-2.0 * clamp(u, -1.2, 1.2));
      vec3 col = mix(DM_COOL, DM_WARM, clamp(conf * 0.55, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(conf, floor(conf * 6.0) / 6.0, 1.2) * 0.75);
      col = mix(col, DM_RUST, dmIso(K, 0.0, 1.4) * 0.55);
      return dmTone(col);
    }`),
  D("flow", "deepYamabeScalar", "Yamabe: R_g = e^{−2u}(R − 2Δu) scalar-curvature plate", /* glsl */ `
    vec3 deepYamabeScalar(vec2 p, float t) {
      float u = 0.35 * dmPhi(p, t);
      float R = dmGaussK(p, t);
      float Rg = exp(-2.0 * clamp(u, -0.8, 0.8)) * (R - 2.0 * dmLap(p, t) * 0.0008);
      float q = 0.5 + 0.5 * tanh(Rg * 0.12);
      vec3 col = mix(DM_TEAL, DM_RUST, q);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(Rg, 0.0, 1.3) * 0.8);
      return dmTone(col);
    }`),
  D("flow", "deepCMCSoap", "CMC unduloid: Delaunay soap profile a + b cos(kz)", /* glsl */ `
    vec3 deepCMCSoap(vec2 p, float t) {
      float a = 0.16, b = 0.055 + 0.02 * sin(t * 0.4);
      float k = 9.0;
      float r = abs(p.y - 0.50);
      float prof = a + b * cos(k * (p.x - 0.2) + t * 0.3);
      float d = r - prof;
      vec3 col = mix(DM_COOL, DM_WARM, dmAA(-d, 0.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmLine(d, 1.7) * 0.9);
      col = mix(col, DM_TEAL, dmIso(r, a, 1.1) * 0.35);
      col = mix(col, DM_AMBER, dmFill(abs(p.x - 0.20) - 0.01) * 0.35);
      return dmTone(col);
    }`),
];
