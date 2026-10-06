// Life bloom / flora burst / beetle shell — 6 operators.
import { G } from "./kit.glsl.js";

const F = "bloom";

export default [
  G("goldLifeBloom", F, "Life bloom: radial petal SDF, gold sap at the nectary",
    `vec3 goldLifeBloom(vec2 p, float t) {
      vec2 pol = gPolar(p, vec2(0.72, 0.50));
      float n = 7.0, petal = 0.16 * (0.62 + 0.38 * cos(n * pol.y + t * 0.4));
      float d = pol.x - petal;
      vec3 c = mix(G_SAP, gGoldBase(), gAA(0.06 - pol.x, 0.0));
      c = mix(c, G_PINK * 0.85, gFill(d) * (1.0 - gFill(pol.x - 0.05)));
      return mix(G_INK, c, gFill(d));
    }`, "goldLifeBloom(p, t)"),

  G("goldFloraBurst", F, "Flora burst: branching fbm iso, gold sap in the veins",
    `vec3 goldFloraBurst(vec2 p, float t) {
      float v = abs(gFbm(p * 6.2 + vec2(0.0, p.x * 2.0 + t * 0.08)) - 0.5);
      vec3 field = mix(G_SAP, G_UMBER, gFbm(p * 3.0));
      return mix(field, gGoldBase(), gFill(v - 0.028));
    }`, "goldFloraBurst(p, t)"),

  G("goldBeetleShell", F, "Beetle shell: iridescent ellipsoid, ladybug pits, gold rim",
    `vec3 goldBeetleShell(vec2 p, float t) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(0.22, 0.14);
      float d = length(q) - 1.0;
      float nd = clamp(0.55 + 0.35 * q.y - 0.2 * gCut(p, 0.1), 0.0, 1.0);
      vec3 c = gCel3(nd, 0.38, 0.66, G_UMBER, gGold(vec3(0.50, 0.34, 0.10)), gGold(vec3(0.68, 0.48, 0.14)));
      c = mix(c, G_PINK, gFlake(q * 4.2, 0.34) * 0.85);
      c = mix(c, gGoldBase(), gLine(d, 1.6) * 0.7);
      return mix(G_INK, c, gFill(d));
    }`, "goldBeetleShell(p, t)"),

  G("goldVineCoil", F, "Vine coil: log spiral SDF, 3-step gold sap",
    `vec3 goldVineCoil(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float a = atan(q.y, q.x), r = length(q);
      float d = abs(r - 0.055 * (a + 3.4 + t * 0.15)) - 0.018;
      vec3 c = gCel3(0.52 - 0.18 * a / 6.0, 0.38, 0.66, G_SAP, gGold(vec3(0.54, 0.38, 0.10)), G_WIG * 0.85);
      return mix(G_INK, c, gFill(d));
    }`, "goldVineCoil(p, t)"),

  G("goldPetalWhorl", F, "Petal whorl: golden-angle phyllotaxis discs, gold hearts",
    `vec3 goldPetalWhorl(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50);
      vec3 col = G_INK;
      for (int i = 0; i < 18; i++) {
        float fi = float(i);
        float a = fi * 2.39996 + t * 0.12;
        float rad = 0.028 * sqrt(fi + 1.0);
        vec2 s = c + rad * vec2(cos(a), sin(a));
        float disc = gFill(length(p - s) - mix(0.012, 0.022, fi / 18.0));
        col = mix(col, mix(G_PINK * 0.9, gGoldBase(), step(12.0, fi)), disc);
      }
      return col;
    }`, "goldPetalWhorl(p, t)"),

  G("goldSapPulse", F, "Sap pulse: travelling gold along fbm branches",
    `vec3 goldSapPulse(vec2 p, float t) {
      float f = gFbm(p * 5.6 + vec2(0.0, p.x * 1.6));
      float vein = abs(f - 0.5);
      float pulse = 0.5 + 0.5 * sin(f * 18.0 - t * 3.2);
      vec3 sap = gGoldBase() * (0.45 + 0.55 * pulse);
      return mix(G_SAP, sap, gFill(vein - 0.024) * (0.35 + 0.65 * pulse));
    }`, "goldSapPulse(p, t)"),
];
