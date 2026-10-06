// Eikonal / geodesic distance / shock — 5 operators.
import { D } from "./define.js";

export default [
  D("eikonal", "deepEikonalCone", "eikonal |∇u|=1 from a source: Euclidean distance cone", /* glsl */ `
    vec3 deepEikonalCone(vec2 p, float t) {
      vec2 s = vec2(0.64 + 0.08 * sin(t * 0.25), 0.48);
      float u = length(p - s);
      float q = fract(u * 6.0);
      vec3 col = mix(DM_TEAL, dmPaper(p), clamp(u * 1.1, 0.0, 1.0));
      col = mix(col, DM_INK, dmIso(u, floor(u * 6.0) / 6.0, 1.3) * 0.88);
      col = mix(col, DM_AMBER, dmFill(u - 0.018));
      col = mix(col, DM_RUST, dmBand(q, 0.92, 1.0) * 0.25);
      return dmTone(col);
    }`),
  D("eikonal", "deepViscosityShock", "viscous Burgers shock: u = tanh((x−st)/(2ν)) front", /* glsl */ `
    vec3 deepViscosityShock(vec2 p, float t) {
      float nu = 0.035;
      float xi = (p.x - 0.40 - 0.12 * t) / (2.0 * nu) + (p.y - 0.5) * 1.6;
      float u = tanh(xi);
      vec3 col = mix(DM_COOL, DM_WARM, 0.5 + 0.5 * u);
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_RUST, dmIso(u, 0.0, 1.6) * 0.9);
      col = mix(col, DM_INK, dmBand(abs(u), 0.0, 0.18) * 0.45);
      return dmTone(col);
    }`),
  D("eikonal", "deepGeodesicFan", "geodesic polar chart on a conformal warp: rays + distance circles", /* glsl */ `
    vec3 deepGeodesicFan(vec2 p, float t) {
      vec2 s = vec2(0.60, 0.48);
      vec2 w = p + 0.12 * vec2(dmFbm(p * 2.2 + 1.4), dmFbm(p * 2.2 + 8.1));
      float r = dmVaradhan(w, s, 0.05);
      float ang = atan(w.y - s.y, w.x - s.x);
      vec3 col = mix(DM_COOL, DM_MINT, clamp(r * 1.15, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.78);
      col = mix(col, DM_INK, dmIso(r, floor(r * 6.0) / 6.0, 1.25) * 0.8);
      col = mix(col, DM_AMBER, dmIso(ang, floor((ang + DM_PI) * 5.0 / DM_PI) * DM_PI / 5.0 - DM_PI, 1.1) * 0.55);
      col = mix(col, DM_AMBER, dmFill(length(p - s) - 0.016));
      return dmTone(col);
    }`),
  D("eikonal", "deepCutLocus", "cut locus: shock of min-distance to two moving sources", /* glsl */ `
    vec3 deepCutLocus(vec2 p, float t) {
      vec2 a = vec2(0.48 + 0.06 * sin(t * 0.3), 0.58);
      vec2 b = vec2(0.96 + 0.05 * cos(t * 0.24), 0.40);
      float da = length(p - a), db = length(p - b);
      float u = min(da, db);
      float cut = abs(da - db);
      vec3 col = mix(DM_TEAL, DM_VIOLET, dmAA(db - da, 0.0));
      col = mix(dmPaper(p), col, 0.72);
      col = mix(col, DM_INK, dmIso(u, floor(u * 6.5) / 6.5, 1.2) * 0.7);
      col = mix(col, DM_RUST, dmLine(cut, 1.8) * 0.92);
      col = mix(col, DM_AMBER, dmFill(da - 0.015) + dmFill(db - 0.015));
      return dmTone(col);
    }`),
  D("eikonal", "deepHopfLax", "Hopf–Lax: u(x,t)=inf_y { t L((x−y)/t) + g(y) } over sites", /* glsl */ `
    vec3 deepHopfLax(vec2 p, float t) {
      float tau = 0.35 + 0.15 * fract(t * 0.12);
      float u = 8.0;
      for (int i = 0; i < 6; i++) {
        vec2 y = dmSite(i, 0.0);
        float g = 0.12 * dmH21(vec2(float(i), 4.1));
        float L = 0.5 * dot(p - y, p - y) / max(tau, 0.08);
        u = min(u, L + g);
      }
      vec3 col = mix(DM_AMBER, DM_COOL, clamp(u * 1.4, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(u, floor(u * 7.0) / 7.0, 1.25) * 0.85);
      return dmTone(col);
    }`),
];
