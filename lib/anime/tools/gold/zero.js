// Return-to-zero cream disc / reset wash — 6 operators.
import { G } from "./kit.glsl.js";

const F = "zero";

export default [
  G("goldZeroDisc", F, "Return-to-zero cream disc: noisy lip, gold rim, never milk-white",
    `vec3 goldZeroDisc(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float ang = atan(q.y, q.x);
      float dd = length(q) - 0.30 - (gFbm(vec2(ang * 3.0, 3.0 + t * 0.1)) - 0.5) * 0.14;
      vec3 cream = G_CREAM * (0.94 + 0.05 * gVn(p * 36.0));
      vec3 c = mix(G_INK, cream, gFill(dd));
      return mix(c, gGoldBase(), exp(-dd * dd / 0.0015) * 0.62);
    }`, "goldZeroDisc(p, t)"),

  G("goldResetWash", F, "Reset wash: cream flood from centre, sinopia leftover at the fringe",
    `vec3 goldResetWash(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      float front = 0.18 + 0.28 * (0.5 + 0.5 * sin(t * 0.55));
      float wash = 1.0 - gAA(r, front);
      vec3 sketch = mix(G_CREAM * 0.88, G_SINO, gLine(gFbm(p * 2.4) * 8.0 - 4.0, 1.4) * 0.7);
      return mix(sketch, G_CREAM * (0.93 + 0.04 * gVn(p * 28.0)), wash);
    }`, "goldResetWash(p, t)"),

  G("goldReturnToZero", F, "Return-to-zero ring: expanding cream that un-paints the fresco",
    `vec3 goldReturnToZero(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      float R = 0.08 + 0.36 * fract(t * 0.22);
      float inside = gFill(r - R);
      vec3 fresco = mix(G_SINO * 0.55, gGold(vec3(0.50, 0.34, 0.10)), gFbm(p * 3.2));
      vec3 c = mix(fresco, G_CREAM * 0.94, inside);
      return mix(c, gGoldBase(), gLine(r - R, 2.0) * 0.75);
    }`, "goldReturnToZero(p, t)"),

  G("goldZeroRipple", F, "Zero ripple: five decaying cream rings, gold on the newest",
    `vec3 goldZeroRipple(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.50));
      vec3 c = G_INK;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float R = fract(t * 0.18 + fi * 0.18) * 0.42;
        float fade = 1.0 - fract(t * 0.18 + fi * 0.18);
        vec3 col = i == 0 ? gGoldBase() : G_CREAM * 0.88;
        c = mix(c, col, gLine(r - R, 1.6) * fade);
      }
      return c;
    }`, "goldZeroRipple(p, t)"),

  G("goldEraseFresco", F, "Erase fresco: fbm peel lifts plaster off to the sinopia sketch",
    `vec3 goldEraseFresco(vec2 p, float t) {
      float peel = gFbm(p * 2.8 + vec2(t * 0.06, 0.0));
      float cut = 0.42 + 0.18 * sin(t * 0.4);
      float gone = gAA(peel, cut);
      vec3 plaster = G_CREAM * (0.94 + 0.05 * gVn(p * 30.0));
      float sketch = gLine(gFbm(p * 2.1) * 9.0 - 4.5, 1.3);
      vec3 under = mix(G_UMBER, G_SINO, sketch * 0.85);
      vec3 leaf = mix(plaster, gGoldBase(), gFlake(p * 10.0, 0.22) * 0.55);
      return mix(under, leaf, 1.0 - gone);
    }`, "goldEraseFresco(p, t)"),

  G("goldNullHold", F, "Null hold: cream plate with a gold tick locked at angle zero",
    `vec3 goldNullHold(vec2 p, float t) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q), a = atan(q.y, q.x);
      vec3 plate = mix(G_UMBER, G_CREAM * 0.93, gFill(r - 0.32));
      plate = mix(plate, gGoldBase(), gFill(abs(r - 0.32) - 0.01));
      float tick = gFill(abs(a) - 0.06) * gFill(abs(r - 0.24) - 0.04);
      return mix(plate, gGoldBase(), tick);
    }`, "goldNullHold(p, t)"),
];
