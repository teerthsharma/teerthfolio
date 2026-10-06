// Wavelength gold grade / metal flake cel — 5 operators.
import { G } from "./kit.glsl.js";

const F = "grade";

export default [
  G("goldWaveGrade", F, "Wavelength gold grade: luma ramp biased 1.16 / 0.88 / 0.22, not yellow paint",
    `vec3 goldWaveGrade(vec2 p, float t) {
      float L = clamp(0.22 + 0.62 * p.y + 0.08 * gFbm(p * 5.0 + t * 0.04), 0.0, 1.0);
      vec3 raw = vec3(L, L * 0.72, L * 0.22);
      return gGold(raw);
    }`, "goldWaveGrade(p, t)"),

  G("goldMetalFlakeCel", F, "Metal flake cel: 3-step wavelength gold + voronoi flake pits",
    `vec3 goldMetalFlakeCel(vec2 p, float t) {
      float ndl = 0.48 + 0.32 * p.y - 0.24 * gCut(p, 0.18);
      vec3 c = gCel3(ndl, 0.40, 0.68, vec3(0.416, 0.227, 0.063), gGold(vec3(0.55, 0.38, 0.10)), gGold(vec3(0.70, 0.50, 0.16)));
      return mix(c, G_PINK * 0.75, gFill(gVor(p * 8.4).x - 0.11) * 0.5);
    }`, "goldMetalFlakeCel(p, t)"),

  G("goldAnisoGilt", F, "Anisotropic gilt: brushed-gold streaks, stretched spec, wavelength cap",
    `vec3 goldAnisoGilt(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      vec3 c = gCel3(0.5 + 0.3 * q.y, 0.42, 0.70, vec3(0.455, 0.282, 0.102), gGold(vec3(0.58, 0.40, 0.10)), gGold(vec3(0.72, 0.52, 0.16)));
      float spec = pow(abs(sin(q.x * 28.0 + q.y * 2.2 + t * 0.3)), 8.0);
      return c + gGoldBase() * spec * gEmit(0.45);
    }`, "goldAnisoGilt(p, t)"),

  G("goldCelIngot", F, "Cel ingot: rounded gold bar, 3-step metal, flake noise on the face",
    `vec3 goldCelIngot(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      vec2 b = abs(q) - vec2(0.28, 0.10);
      float d = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.02;
      float ndl = 0.52 + 0.28 * q.y - 0.2 * gCut(q, 0.0);
      vec3 c = gCel3(ndl, 0.40, 0.66, vec3(0.400, 0.220, 0.070), gGoldBase(), gGold(vec3(0.70, 0.50, 0.15)));
      c = mix(c, G_PINK * 0.7, gFlake(q * 12.0, 0.28) * 0.4);
      return mix(G_INK, c, gFill(d));
    }`, "goldCelIngot(p, t)"),

  G("goldSpectrumBias", F, "Spectrum bias: spatial map of the gold wavelength weights themselves",
    `vec3 goldSpectrumBias(vec2 p, float t) {
      float u = clamp(p.x / 1.44, 0.0, 1.0);
      vec3 w = vec3(1.16, 0.88, 0.22);
      vec3 raw = vec3(0.48, 0.34, 0.12) + w * 0.22 * (0.5 + 0.5 * sin(u * 6.28318 + t * 0.2));
      vec3 g = gGold(raw);
      float tick = gLine(p.y - 0.33, 1.2) + gLine(p.y - 0.66, 1.2);
      return mix(g, G_MAG, tick * 0.35);
    }`, "goldSpectrumBias(p, t)"),
];
