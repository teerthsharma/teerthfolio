// Requiem arrow / stand aura / purple-gold — 6 operators.
import { G } from "./kit.glsl.js";

const F = "requiem";

export default [
  G("goldRequiemArrow", F, "Requiem arrow: taper u^1.6 shaft, cream head, wavelength gold",
    `vec3 goldRequiemArrow(vec2 p, float t) {
      vec2 a = vec2(0.22, 0.74), b = vec2(1.08, 0.36), pa = p - a, ba = b - a;
      float u = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      float d = length(pa - ba * u) - mix(0.042, 0.007, pow(u, 1.6));
      vec3 c = mix(gGoldBase(), G_CREAM * 0.92, gAA(u, 0.86));
      return mix(G_INK, c, gFill(d));
    }`, "goldRequiemArrow(p, t)"),

  G("goldStandAura", F, "Stand aura: radial gold emit plus a purple corona ring",
    `vec3 goldStandAura(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q);
      vec3 c = G_INK + gGoldBase() * exp(-r * r * 7.2) * gEmit(0.82);
      float corona = exp(-pow((r - 0.26 - 0.02 * sin(t * 2.0)) / 0.03, 2.0));
      return mix(c, G_CRIM * 0.72, corona * 0.55);
    }`, "goldStandAura(p, t)"),

  G("goldPurpleGrade", F, "Purple-gold grade: wavelength gold left, King Crimson right",
    `vec3 goldPurpleGrade(vec2 p, float t) {
      float u = clamp(p.x * 0.7 + 0.1 * gFbm(p * 4.0 + t * 0.05), 0.0, 1.0);
      vec3 g = gGold(vec3(0.56, 0.38, 0.10) + vec3(0.08, 0.03, 0.0) * p.y);
      return mix(g, G_CRIM * 0.78, gAA(u, 0.52));
    }`, "goldPurpleGrade(p, t)"),

  G("goldArrowGlint", F, "Arrow glint: chevron SDF with a travelling highlight",
    `vec3 goldArrowGlint(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float chev = abs(q.x) + q.y * 0.55 - 0.12;
      float shaft = max(abs(q.x) - 0.018, q.y - 0.22);
      float d = min(abs(chev), shaft);
      float u = clamp(0.5 - q.y * 1.4, 0.0, 1.0);
      float glint = exp(-pow((u - fract(t * 0.35)) / 0.06, 2.0));
      vec3 c = mix(gGoldBase(), G_CREAM * 0.9, glint);
      return mix(G_INK, c, gFill(d - 0.01));
    }`, "goldArrowGlint(p, t)"),

  G("goldGerCorona", F, "GER corona: log-spaced purple-gold rings in a requiem void",
    `vec3 goldGerCorona(vec2 p, float t) {
      vec2 pol = gPolar(p, vec2(0.72, 0.52));
      float rr = log(pol.x * 6.2 + 1.0) * 2.6 + t * 0.08;
      float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      float odd = step(mod(floor(rr), 2.0), 0.5);
      vec3 ring = mix(G_INK, mix(gGoldBase(), G_CRIM * 0.7, 1.0 - odd), smoothstep(0.0, w, f) * odd);
      return mix(ring, gGoldBase() * 0.7, gFill(abs(pol.x - 0.22) - 0.004) * 0.8);
    }`, "goldGerCorona(p, t)"),

  G("goldRequiemShard", F, "Requiem shards: inward-pointing gold wedges, magenta lips",
    `vec3 goldRequiemShard(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float a = atan(q.y, q.x), r = length(q);
      float cell = floor((a / 6.28318 + 0.5) * 8.0);
      float local = abs(fract((a / 6.28318 + 0.5) * 8.0) - 0.5) * 2.0;
      float wedge = gFill(r - 0.08) * gFill(0.34 - r) * (1.0 - gAA(local, 0.42));
      vec3 c = mix(gGoldBase(), G_MAG, gAA(local, 0.32) * 0.45);
      return mix(G_INK, c, wedge);
    }`, "goldRequiemShard(p, t)"),
];
