// Navier–Stokes-ish ink / vorticity / swirl — 5 operators.
import { D } from "./define.js";

export default [
  D("navier", "deepVorticityInk", "point-vortex stream ψ = Γ log r, ink along streamlines", /* glsl */ `
    vec3 deepVorticityInk(vec2 p, float t) {
      vec2 s = vec2(0.70, 0.50);
      vec2 q = p - s;
      float psi = 0.18 * log(dot(q, q) + 0.004) + 0.04 * t;
      float r = length(q);
      vec2 tang = vec2(-q.y, q.x);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.35 * sin(psi * 14.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmHatch(p, tang, 28.0) * 0.55);
      col = mix(col, DM_INK, dmIso(psi, floor(psi * 8.0) / 8.0, 1.15) * 0.7);
      col = mix(col, DM_AMBER, dmFill(r - 0.02));
      return dmTone(col);
    }`),
  D("navier", "deepLambOseen", "Lamb–Oseen core: ω = (Γ/4πνt) exp(−r²/4νt) decaying swirl", /* glsl */ `
    vec3 deepLambOseen(vec2 p, float t) {
      float nu = 0.012;
      float tau = 0.18 + 0.14 * fract(t * 0.15);
      vec2 s = vec2(0.72, 0.50);
      float r2 = dot(p - s, p - s);
      float w = exp(-r2 / max(4.0 * nu * tau, 1e-4)) / max(tau, 0.08);
      vec2 tang = vec2(-(p.y - s.y), p.x - s.x);
      vec3 col = mix(DM_COOL, DM_RUST, clamp(w * 0.22, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_INK, dmHatch(p, tang, mix(12.0, 36.0, clamp(w * 0.15, 0.0, 1.0))) * 0.5);
      col = mix(col, DM_AMBER, dmIso(w, 2.2, 1.3) * 0.55);
      return dmTone(col);
    }`),
  D("navier", "deepStreamFunction", "incompressible stream ψ isolines (div-free ink)", /* glsl */ `
    vec3 deepStreamFunction(vec2 p, float t) {
      float psi = (p.y - 0.5) * 0.9 + 0.16 * sin(p.x * 5.2 + t * 0.4) * cos(p.y * 4.4)
        + 0.10 * log(length(p - vec2(0.86, 0.38)) + 0.03);
      vec3 col = mix(DM_TEAL, DM_WARM, 0.5 + 0.4 * sin(psi * 10.0));
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmIso(psi, floor(psi * 9.0) / 9.0, 1.2) * 0.88);
      return dmTone(col);
    }`),
  D("navier", "deepEnstrophyHatch", "enstrophy |ω|² of a vortex pair, hatch along ω contours", /* glsl */ `
    vec3 deepEnstrophyHatch(vec2 p, float t) {
      vec2 a = vec2(0.55 + 0.04 * sin(t * 0.5), 0.52);
      vec2 b = vec2(0.92 - 0.04 * sin(t * 0.5), 0.48);
      float wa = exp(-dot(p - a, p - a) * 28.0);
      float wb = -exp(-dot(p - b, p - b) * 28.0);
      float ens = (wa + wb) * (wa + wb);
      vec3 col = mix(DM_COOL, DM_RUST, clamp(ens * 3.2, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmHatch(p, vec2(1.0, 0.4), 22.0 + 40.0 * ens) * 0.55);
      col = mix(col, DM_AMBER, dmFill(length(p - a) - 0.014) + dmFill(length(p - b) - 0.014));
      return dmTone(col);
    }`),
  D("navier", "deepVortexSheet", "Kelvin–Helmholtz roll-up: tanh shear + cat's-eye stream", /* glsl */ `
    vec3 deepVortexSheet(vec2 p, float t) {
      float k = 6.8;
      float A = 0.06 + 0.03 * sin(t * 0.8);
      float y = p.y - 0.50 - A * sin(k * p.x + t * 1.1);
      float psi = log(cosh(clamp(y * 8.0, -8.0, 8.0)) + 0.02) / 8.0;
      float shear = tanh(y * 10.0);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * shear);
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(psi, floor(psi * 10.0) / 10.0, 1.15) * 0.75);
      col = mix(col, DM_RUST, dmLine(y, 1.5) * 0.7);
      return dmTone(col);
    }`),
];
