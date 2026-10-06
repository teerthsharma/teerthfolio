// Reaction–diffusion: Gray-Scott, FitzHugh, Turing, Oregonator, Brusselator, Schnakenberg — 6.
import { D } from "./define.js";

export default [
  D("reaction", "deepGrayScott", "Gray–Scott spots: activator peaks, inhibitor rings, feed F", /* glsl */ `
    vec3 deepGrayScott(vec2 p, float t) {
      float v = 0.0, u = 1.0;
      for (int i = 0; i < 8; i++) {
        vec2 s = dmSite(i, t * 0.4);
        float g = exp(-dot(p - s, p - s) * 55.0);
        v += g;
        u -= 0.72 * g;
      }
      float ring = 0.0;
      for (int i = 0; i < 8; i++) {
        float d = length(p - dmSite(i, t * 0.4));
        ring = max(ring, dmIso(d, 0.085, 1.4));
      }
      vec3 col = mix(DM_COOL, DM_MINT, clamp(v * 1.3, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_RUST, ring * 0.65);
      col = mix(col, DM_INK, dmIso(u, 0.45, 1.2) * 0.55);
      return dmTone(col);
    }`),
  D("reaction", "deepFitzHughNagumo", "FitzHugh–Nagumo pulse: sech²(ξ) activator, lagged recovery w", /* glsl */ `
    vec3 deepFitzHughNagumo(vec2 p, float t) {
      float xi = (p.x - 0.30 - 0.14 * t) * 7.5 + (p.y - 0.5) * 1.2;
      float v = dmSech(xi) * dmSech(xi);
      float w = dmSech(xi - 1.1) * 0.55;
      vec3 col = mix(DM_COOL, DM_AMBER, v);
      col = mix(col, DM_VIOLET, w * 0.7);
      col = mix(dmPaper(p), col, 0.84);
      col = mix(col, DM_INK, dmIso(v - w, 0.0, 1.3) * 0.7);
      float nullc = p.y - (0.50 + 0.22 * (p.x - 0.72) - 0.18 * pow(p.x - 0.72, 3.0));
      col = mix(col, DM_RUST, dmLine(nullc, 1.3) * 0.45);
      return dmTone(col);
    }`),
  D("reaction", "deepTuringStripes", "Turing wavelength: selected k from linear stability, stripe plate", /* glsl */ `
    vec3 deepTuringStripes(vec2 p, float t) {
      float k = 14.5;
      vec2 dir = normalize(vec2(1.0, 0.35 + 0.15 * sin(t * 0.2)));
      float u = sin(dot(p, dir) * k + t * 0.4) + 0.28 * sin(dot(p, vec2(-dir.y, dir.x)) * k * 0.35);
      vec3 col = mix(DM_TEAL, DM_WARM, 0.5 + 0.5 * tanh(u));
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.0, 1.15) * 0.8);
      return dmTone(col);
    }`),
  D("reaction", "deepOregonator", "Oregonator / BZ spiral: arg − r/λ + ωt involute", /* glsl */ `
    vec3 deepOregonator(vec2 p, float t) {
      vec2 q = p - vec2(0.70, 0.50);
      float r = length(q);
      float phi = atan(q.y, q.x) - r * 7.2 + t * 1.15;
      float u = 0.5 + 0.5 * sin(phi);
      vec3 col = dmMix3(u, DM_COOL, DM_RUST, DM_AMBER);
      col = mix(dmPaper(p), col, 0.85);
      col = mix(col, DM_INK, dmIso(sin(phi), 0.0, 1.2) * 0.75);
      col = mix(col, DM_AMBER, dmFill(r - 0.012));
      return dmTone(col);
    }`),
  D("reaction", "deepBrusselator", "Brusselator hex spots: activator lattice from cubic kinetics", /* glsl */ `
    vec3 deepBrusselator(vec2 p, float t) {
      vec2 q = p * vec2(8.2, 9.1) + vec2(t * 0.08, 0.0);
      vec2 h = vec2(q.x + q.y * 0.5, q.y * 0.866);
      vec2 f = fract(h) - 0.5;
      float d = length(f);
      float v = exp(-d * d * 14.0) * (0.75 + 0.25 * sin(t * 1.3 + dmH21(floor(h)) * 6.2));
      vec3 col = mix(DM_COOL, DM_MINT, clamp(v * 1.4, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.8);
      col = mix(col, DM_INK, dmIso(d, 0.22, 1.2) * 0.55);
      return dmTone(col);
    }`),
  D("reaction", "deepSchnakenberg", "Schnakenberg: spots elongate into stripes as the feed rises in x", /* glsl */ `
    vec3 deepSchnakenberg(vec2 p, float t) {
      float feed = clamp(p.x / 1.44, 0.0, 1.0);
      float spots = 0.0;
      for (int i = 0; i < 7; i++) {
        vec2 s = dmSite(i, t * 0.2);
        vec2 e = vec2(1.0 + feed * 2.4, 1.0);
        spots += exp(-dot((p - s) * e, (p - s) * e) * 40.0);
      }
      float stripe = 0.5 + 0.5 * sin(p.y * 16.0 + t * 0.3);
      float u = mix(spots, stripe * 0.85, smoothstep(0.35, 0.75, feed));
      vec3 col = mix(DM_VIOLET, DM_TEAL, clamp(u, 0.0, 1.0));
      col = mix(dmPaper(p), col, 0.82);
      col = mix(col, DM_INK, dmIso(u, 0.4, 1.2) * 0.6);
      return dmTone(col);
    }`),
];
