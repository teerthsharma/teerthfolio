// Wave / Helmholtz / standing — 5 operators.
import { D } from "./define.js";

export default [
  D("wave", "deepWaveDAlembert", "d'Alembert f(x−ct)+g(x+ct) as a traveling plate", /* glsl */ `
    vec3 deepWaveDAlembert(vec2 p, float t) {
      float xi = p.x * 6.2 - t * 1.15;
      float eta = p.x * 6.2 + t * 1.15;
      float u = 0.55 * sin(xi) * exp(-abs(p.y - 0.42) * 2.4) + 0.35 * sin(eta * 0.7 + 0.4) * exp(-abs(p.y - 0.62) * 2.8);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.35) * 0.78);
      col = mix(col, DM_TEAL, dmIso(u, 0.35, 1.2) * 0.45);
      return dmTone(col);
    }`),
  D("wave", "deepHelmholtzHankel", "radiating Helmholtz: J0(k r) circular wave + outgoing phase", /* glsl */ `
    vec3 deepHelmholtzHankel(vec2 p, float t) {
      vec2 s = vec2(0.68, 0.50);
      float r = length(p - s);
      float k = 18.0;
      float u = dmJ0(k * r) * cos(t * 2.2);
      float q = 0.5 + 0.5 * u;
      vec3 col = mix(DM_COOL, DM_MINT, q);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.15) * 0.88);
      col = mix(col, DM_AMBER, dmFill(r - 0.016));
      return dmTone(col);
    }`),
  D("wave", "deepStandingMode", "Dirichlet rectangle eigenmode sin(nπx/L) sin(mπy)", /* glsl */ `
    vec3 deepStandingMode(vec2 p, float t) {
      float n = 3.0, m = 2.0;
      float u = dmMode(p, n, m) * cos(t * 1.6);
      float q = 0.5 + 0.5 * u;
      vec3 col = mix(DM_VIOLET, DM_AMBER, q);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.25) * 0.9);
      float box = max(abs(p.x / 0.72 - 1.0) - 1.0, abs(p.y - 0.5) - 0.48);
      col = mix(col, DM_INK, dmLine(box, 1.5) * 0.7);
      return dmTone(col);
    }`),
  D("wave", "deepWavefrontCusp", "fold caustic: Airy-like cusp of a curved wavefront", /* glsl */ `
    vec3 deepWavefrontCusp(vec2 p, float t) {
      vec2 q = (p - vec2(0.72, 0.50)) * vec2(1.15, 1.35);
      float S = q.y * q.y * q.y / 3.0 + (q.x - 0.08 * sin(t * 0.5)) * q.y;
      float airy = dmJ0(8.0 * S) * exp(-abs(S) * 0.35);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * tanh(airy * 1.8));
      col = mix(dmPaper(p), col, 0.83);
      col = mix(col, DM_RUST, dmIso(S, 0.0, 1.4) * 0.75);
      col = mix(col, DM_INK, dmIso(airy, 0.0, 1.2) * 0.55);
      return dmTone(col);
    }`),
  D("wave", "deepDispersionPacket", "dispersive packet ω=k²: chirped envelope, Airy tails", /* glsl */ `
    vec3 deepDispersionPacket(vec2 p, float t) {
      float x = (p.x - 0.35 - 0.08 * t) * 5.5;
      float env = exp(-p.y * p.y * 8.0 - (p.y - 0.5) * (p.y - 0.5) * 10.0);
      float phase = x * x / max(4.0 * (0.35 + 0.12 * t), 0.2) - t * 1.4;
      float u = env * cos(phase) * exp(-x * x * 0.08);
      vec3 col = mix(DM_COOL, DM_TEAL, 0.5 + 0.45 * u);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * 0.7);
      col = mix(col, DM_AMBER, dmBand(abs(u), 0.35, 0.9) * 0.35);
      return dmTone(col);
    }`),
];
