// Colosseum gold hour / dust motes — 5 operators.
import { G } from "./kit.glsl.js";

const F = "hour";

export default [
  G("goldHourGrade", F, "Gold hour: low-angle wavelength grade, long diagonal cut-shadow",
    `vec3 goldHourGrade(vec2 p, float t) {
      float ndl = 0.42 + 0.40 * p.y - 0.36 * gCut(p, 0.15 + 0.05 * sin(t * 0.2));
      vec3 c = gCel3(ndl, 0.34, 0.62, G_UMBER, gGold(vec3(0.48, 0.32, 0.09)), gGold(vec3(0.66, 0.46, 0.13)));
      c = mix(c, G_SINO * 0.55, (1.0 - gAA(ndl, 0.28)) * 0.22);
      return c;
    }`, "goldHourGrade(p, t)"),

  G("goldArenaMotes", F, "Arena motes: gold dust only inside the hour shaft",
    `vec3 goldArenaMotes(vec2 p, float t) {
      float shaft = exp(-pow((p.x - 0.58 - 0.12 * p.y) / 0.14, 2.0));
      vec2 id = floor((p + vec2(0.0, t * 0.03)) * 20.0), f = fract((p + vec2(0.0, t * 0.03)) * 20.0) - 0.5;
      float h = gH21(id);
      float mote = exp(-dot(f, f) * 16.0) * step(0.70, h);
      vec3 field = mix(G_UMBER, gGold(vec3(0.46, 0.30, 0.09)), shaft * 0.35);
      return field + gGoldBase() * mote * shaft * gEmit(0.8);
    }`, "goldArenaMotes(p, t)"),

  G("goldFrescoLeaf", F, "Fresco leaf: plaster + voronoi craquelure + hashed gold-leaf patches",
    `vec3 goldFrescoLeaf(vec2 p, float t) {
      vec2 v = gVor(p * 4.6);
      vec3 plaster = G_CREAM * (0.93 + 0.05 * gFbm(p * 28.0));
      plaster = mix(plaster, G_UMBER, (1.0 - smoothstep(0.0, fwidth(v.y) * 0.9 + 1e-4, v.y)) * 0.28);
      float leaf = step(0.78, gH21(floor(p * 5.0)));
      return mix(plaster, gGoldBase(), gFill(v.x - 0.22) * leaf * 0.85);
    }`, "goldFrescoLeaf(p, t)"),

  G("goldAtticShaft", F, "Attic shaft: trapezoid gold hour beam, falling motes",
    `vec3 goldAtticShaft(vec2 p, float t) {
      float u = (p.x - 0.72) / max(0.18 + 0.55 * (1.0 - p.y), 0.04);
      float shaft = gFill(abs(u) - 0.42) * gAA(p.y, 0.18);
      vec2 id = floor((p + vec2(0.0, t * 0.05)) * 24.0), f = fract((p + vec2(0.0, t * 0.05)) * 24.0) - 0.5;
      float mote = exp(-dot(f, f) * 20.0) * step(0.74, gH21(id));
      vec3 c = mix(G_INK, gGold(vec3(0.50, 0.34, 0.10)), shaft * 0.55);
      return c + gGoldBase() * mote * shaft * gEmit(0.7);
    }`, "goldAtticShaft(p, t)"),

  G("goldSaddleGilt", F, "Saddle gilt: hyperbolic y²−x² ridge, gold on the colosseum saddle",
    `vec3 goldSaddleGilt(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.48);
      float s = q.y * q.y - q.x * q.x;
      vec3 c = gCel3(0.48 + 0.42 * s - 0.18 * gCut(p, 0.2), 0.34, 0.62, G_UMBER, G_LEAF * 0.7, gGold(vec3(0.64, 0.44, 0.12)));
      return mix(c, gGoldBase(), gFill(abs(s) - 0.02) * 0.65);
    }`, "goldSaddleGilt(p, t)"),
];
