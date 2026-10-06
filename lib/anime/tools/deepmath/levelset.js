// Level set / signed distance / reinit — 5 operators.
import { D } from "./define.js";

export default [
  D("levelset", "deepSignedDistance", "signed distance of a two-lobe metaball, isolines of φ", /* glsl */ `
    vec3 deepSignedDistance(vec2 p, float t) {
      vec2 a = vec2(0.58 + 0.05 * sin(t * 0.3), 0.50);
      vec2 b = vec2(0.90 - 0.04 * sin(t * 0.3), 0.48);
      float da = length(p - a) - 0.16, db = length(p - b) - 0.13;
      float k = 0.10;
      float h = clamp(0.5 + 0.5 * (db - da) / k, 0.0, 1.0);
      float phi = mix(db, da, h) - k * h * (1.0 - h);
      vec3 col = mix(DM_WARM, DM_COOL, dmAA(phi, 0.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(phi, 0.0, 1.6) * 0.92);
      col = mix(col, DM_TEAL, dmIso(phi, floor(phi * 6.0) / 6.0, 1.15) * 0.55);
      return dmTone(col);
    }`),
  D("levelset", "deepReinitPDE", "Sussman reinit: residual |∇φ|−1 as the picture, sign(φ0) bands", /* glsl */ `
    vec3 deepReinitPDE(vec2 p, float t) {
      float phi0 = dmPhi(p, t) - 0.22;
      vec2 g = dmGrad(p, t);
      float res = abs(length(g) - 1.0);
      float s = sign(phi0);
      vec3 col = mix(DM_TEAL, DM_RUST, clamp(res * 0.35, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(phi0, 0.0, 1.4) * 0.85);
      col = mix(col, DM_AMBER, dmBand(abs(phi0), 0.0, 0.04) * 0.4);
      col = mix(col, mix(DM_VIOLET, DM_WARM, dmAA(s, 0.0)), 0.15);
      return dmTone(col);
    }`),
  D("levelset", "deepOsherSethian", "Osher–Sethian advection: φ0 transported by a swirl velocity", /* glsl */ `
    vec3 deepOsherSethian(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50);
      vec2 q = p - c;
      float ang = 0.55 * t;
      float ca = cos(ang), sa = sin(ang);
      vec2 back = c + mat2(ca, sa, -sa, ca) * q;
      float phi = length(back - vec2(0.86, 0.50)) - 0.14;
      vec2 vel = vec2(-q.y, q.x);
      vec3 col = mix(DM_COOL, DM_WARM, dmAA(-phi, 0.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(phi, 0.0, 1.5) * 0.9);
      col = mix(col, DM_TEAL, dmHatch(p, vel, 22.0) * 0.28);
      return dmTone(col);
    }`),
  D("levelset", "deepRedistancing", "closest-point redistance: Voronoi of the 0-level samples", /* glsl */ `
    vec3 deepRedistancing(vec2 p, float t) {
      float best = 8.0;
      vec2 cp = p;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236 + t * 0.15;
        vec2 s = vec2(0.72, 0.50) + 0.20 * vec2(cos(a), sin(a) * 0.72);
        float d = length(p - s);
        if (d < best) { best = d; cp = s; }
      }
      float side = sign(length(p - vec2(0.72, 0.50)) - 0.20);
      float phi = best * side;
      vec3 col = mix(DM_MINT, DM_VIOLET, dmAA(phi, 0.0));
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmIso(phi, 0.0, 1.4) * 0.8);
      col = mix(col, DM_AMBER, dmLine(length(p - vec2(0.72, 0.50)) - 0.20, 1.5) * 0.7);
      col = mix(col, DM_INK, dmHatch(p, p - cp, 30.0) * 0.22);
      return dmTone(col);
    }`),
  D("levelset", "deepMeanCurvatureLevel", "level-set MCF: speed −H n, 0-level of φ with H stripes", /* glsl */ `
    vec3 deepMeanCurvatureLevel(vec2 p, float t) {
      float H = dmMeanH(p, t);
      float phi = dmPhi(p, t) - 0.20 - 0.015 * t * H;
      vec3 col = mix(DM_COOL, DM_WARM, dmAA(-phi, 0.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(phi, 0.0, 1.55) * 0.9);
      col = mix(col, DM_RUST, dmIso(H, 0.0, 1.25) * 0.5);
      col = mix(col, DM_TEAL, clamp(abs(H) * 0.08, 0.0, 0.4) * dmFill(phi));
      return dmTone(col);
    }`),
];
