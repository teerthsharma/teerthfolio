// Schrödinger phase / interference — 4 operators.
import { D } from "./define.js";

export default [
  D("schrodinger", "deepSchrodingerPhase", "free-particle phase Re(e^{i(k·x−ωt)}) de Broglie plate", /* glsl */ `
    vec3 deepSchrodingerPhase(vec2 p, float t) {
      vec2 k = vec2(16.0, 4.5);
      float omega = 3.2;
      float u = cos(dot(k, p) - omega * t);
      vec3 col = mix(DM_COOL, DM_MINT, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.15) * 0.85);
      col = mix(col, DM_AMBER, dmIso(u, 0.7, 1.1) * 0.35);
      return dmTone(col);
    }`),
  D("schrodinger", "deepTwoSlit", "two-slit |e^{ikr1}+e^{ikr2}|² fringes from a pair of slits", /* glsl */ `
    vec3 deepTwoSlit(vec2 p, float t) {
      vec2 a = vec2(0.28, 0.38), b = vec2(0.28, 0.62);
      float k = 22.0 + 2.0 * sin(t * 0.2);
      float r1 = length(p - a), r2 = length(p - b);
      float re = cos(k * r1) + cos(k * r2);
      float im = sin(k * r1) + sin(k * r2);
      float I = (re * re + im * im) * 0.22;
      vec3 col = mix(DM_COOL, DM_AMBER, clamp(I, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_INK, dmIso(I, 0.45, 1.2) * 0.55);
      col = mix(col, DM_RUST, dmFill(length(p - a) - 0.012) + dmFill(length(p - b) - 0.012));
      return dmTone(col);
    }`),
  D("schrodinger", "deepAharonovBohm", "Aharonov–Bohm: phase winds by flux around a solenoid", /* glsl */ `
    vec3 deepAharonovBohm(vec2 p, float t) {
      vec2 c = vec2(0.70, 0.50);
      vec2 q = p - c;
      float flux = 1.35 + 0.25 * sin(t * 0.3);
      float phase = flux * atan(q.y, q.x) + 10.0 * length(q);
      float u = cos(phase);
      vec3 col = mix(DM_VIOLET, DM_TEAL, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.2) * 0.75);
      col = mix(col, DM_AMBER, dmFill(length(q) - 0.04));
      col = mix(col, DM_RUST, dmLine(length(q) - 0.04, 1.6) * 0.8);
      return dmTone(col);
    }`),
  D("schrodinger", "deepWKBPhase", "WKB e^{iS/ħ}: phase ∫p dx in a well, turning-point caustics", /* glsl */ `
    vec3 deepWKBPhase(vec2 p, float t) {
      float E = 0.42 + 0.06 * sin(t * 0.25);
      float V = 1.6 * (p.x - 0.72) * (p.x - 0.72) + 0.35 * (p.y - 0.5) * (p.y - 0.5);
      float mom = sqrt(max(E - V, 0.0));
      float S = mom * 18.0;
      float evan = exp(-8.0 * max(V - E, 0.0));
      float u = evan * (V < E ? cos(S) : 0.15);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_RUST, dmIso(V, E, 1.5) * 0.85);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.15) * 0.55);
      return dmTone(col);
    }`),
];
