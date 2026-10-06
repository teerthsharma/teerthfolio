// Maxwell-ish field lines / Poynting hatch — 4 operators.
import { D } from "./define.js";

export default [
  D("maxwell", "deepDipoleField", "electric dipole: field lines of (3(p·r)r − p)/r³", /* glsl */ `
    vec3 deepDipoleField(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50);
      vec2 r = p - c;
      float rr = max(dot(r, r), 0.006);
      vec2 pv = vec2(sin(t * 0.2), cos(t * 0.2));
      vec2 E = (3.0 * dot(pv, r) * r - pv * rr) / pow(rr, 1.5);
      float psi = r.x * pv.y - r.y * pv.x;
      float pot = dot(pv, r) / pow(rr, 1.5);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.4 * tanh(pot * 0.08));
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmHatch(p, E, 26.0) * 0.55);
      col = mix(col, DM_TEAL, dmIso(psi, floor(psi * 8.0) / 8.0, 1.15) * 0.5);
      col = mix(col, DM_AMBER, dmFill(length(r) - 0.02));
      return dmTone(col);
    }`),
  D("maxwell", "deepPoyntingHatch", "Poynting S = E×B energy-flux hatch of a crossing pair", /* glsl */ `
    vec3 deepPoyntingHatch(vec2 p, float t) {
      float Ex = 0.0, Ey = sin(p.x * 8.0 - t * 2.0);
      float Bz = sin(p.x * 8.0 - t * 2.0 + 0.4);
      vec2 S = vec2(Ey * Bz, -Ex * Bz);
      float mag = abs(Ey * Bz);
      vec3 col = mix(DM_COOL, DM_AMBER, clamp(mag, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmHatch(p, S + vec2(1.0, 0.0), 24.0) * 0.65);
      col = mix(col, DM_TEAL, dmIso(Ey, 0.0, 1.2) * 0.4);
      return dmTone(col);
    }`),
  D("maxwell", "deepFaradayLoop", "Faraday: inductive E_θ = −(r/2) ∂B/∂t concentric loops", /* glsl */ `
    vec3 deepFaradayLoop(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q);
      float dBdt = cos(t * 1.6);
      float Eth = -0.5 * r * dBdt;
      float u = sin(r * 16.0 - t * 1.6);
      vec2 tang = vec2(-q.y, q.x);
      vec3 col = mix(DM_VIOLET, DM_TEAL, 0.5 + 0.45 * u * sign(dBdt + 1e-4));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmHatch(p, tang, 20.0) * 0.45);
      col = mix(col, DM_INK, dmIso(r, floor(r * 8.0) / 8.0, 1.2) * 0.7);
      col = mix(col, DM_AMBER, dmFill(r - 0.05) * abs(Eth) * 2.0);
      return dmTone(col);
    }`),
  D("maxwell", "deepTEMwave", "TEM plane wave: E vertical, B into plate, S along k", /* glsl */ `
    vec3 deepTEMwave(vec2 p, float t) {
      float phase = p.x * 10.0 - t * 2.4;
      float E = sin(phase);
      float B = sin(phase);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.45 * E);
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmHatch(p, vec2(0.0, 1.0), 18.0) * abs(E) * 0.55);
      col = mix(col, DM_TEAL, dmHatch(p, vec2(1.0, 0.0), 32.0) * abs(B) * 0.28);
      col = mix(col, DM_AMBER, dmIso(E, 0.0, 1.15) * 0.45);
      return dmTone(col);
    }`),
];
