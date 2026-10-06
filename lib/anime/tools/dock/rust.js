// Rust / salt / peeling paint cel — 6 operators on hull and rail.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockRustStreak",
    doc: "rust streaks: vertical fbm on slate hull, iron oxide from fastener heads",
    glsl: /* glsl */ `
    vec3 dockRustStreak(vec2 p, float t) {
      vec3 col = dkCel3(0.45 + 0.2 * p.y, DK_INK, DK_HULL, DK_PAINT);
      float streak = dkFbm(vec2(p.x * 22.0, p.y * 4.0 + t * 0.02));
      float run = smoothstep(0.58, 0.86, streak) * smoothstep(0.15, 0.7, p.y);
      col = mix(col, DK_RUST, run * 0.8);
      col = mix(col, DK_INK, dkLine(fract(p.x * 6.0) - 0.5, 1.2) * 0.2);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRustStreak(p, t); }`,
  }),
  defineModule({
    name: "dockSaltCrust",
    doc: "salt crust: pale crystalline noise on paint edges and rail lips",
    glsl: /* glsl */ `
    vec3 dockSaltCrust(vec2 p, float t) {
      vec3 col = mix(DK_HULL, DK_PAINT, 0.55 + 0.2 * dkGrain(p * 0.4));
      vec2 v = dkVor(p * 28.0);
      float xtal = dkFill(v.x - 0.12) * smoothstep(0.45, 0.85, dkH21(floor(p * 28.0)));
      float edge = dkLine(dkPilingField(p), 2.4) + dkLine(dkWater(p), 2.0);
      col = mix(col, DK_SALT, xtal * 0.55 + edge * 0.35);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSaltCrust(p, t); }`,
  }),
  defineModule({
    name: "dockPeelPaint",
    doc: "peeling paint cel: 3-step flakes, curled lips, rust under the chip",
    glsl: /* glsl */ `
    vec3 dockPeelPaint(vec2 p, float t) {
      vec2 gv = floor(p * 7.0);
      float keep = step(0.38, dkH21(gv + 2.0));
      vec2 f = fract(p * 7.0) - 0.5;
      float flake = dkBox(f, vec2(0.0), vec2(0.36, 0.30));
      float curl = dkLine(flake + 0.04, 1.5);
      vec3 under = mix(DK_RUST, DK_HULL, 0.4);
      vec3 paint = dkCel3(0.5 + 0.2 * p.y, DK_WET, DK_PAINT, DK_SALT * 0.7);
      vec3 col = mix(under, paint, keep * dkFill(flake));
      col = mix(col, DK_INK, curl * keep * 0.45);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockPeelPaint(p, t); }`,
  }),
  defineModule({
    name: "dockRustBloom",
    doc: "rust bloom at a bolt: radial oxide, darker heart, salt rim",
    glsl: /* glsl */ `
    vec3 dockRustBloom(vec2 p, float t) {
      vec3 col = DK_HULL;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 c = vec2(0.30 + 0.28 * fi, 0.48 + 0.06 * sin(fi * 2.1 + t * 0.05));
        float r = length(p - c);
        float bloom = exp(-r * r * 48.0);
        col = mix(col, DK_RUST, bloom * 0.85);
        col = mix(col, DK_INK, dkFill(r - 0.012));
        col = mix(col, DK_SALT, dkLine(r - 0.05, 1.6) * 0.4);
      }
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRustBloom(p, t); }`,
  }),
  defineModule({
    name: "dockSaltRime",
    doc: "salt rime on rail: hash crystals along a horizontal bar, fwidth teeth",
    glsl: /* glsl */ `
    vec3 dockSaltRime(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_HULL, dkFill(dkBox(p, vec2(0.72, 0.58), vec2(0.7, 0.018))));
      float rail = abs(p.y - 0.58);
      float tooth = dkH21(vec2(floor(p.x * 36.0), 4.0));
      float rime = dkFill(rail - (0.01 + 0.02 * tooth)) * dkBand(p.x, 0.08, 1.36);
      col = mix(col, DK_SALT, rime * 0.7);
      col = mix(col, DK_INK, dkLine(rail - 0.018, 1.3) * 0.35);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSaltRime(p, t); }`,
  }),
  defineModule({
    name: "dockPaintChip",
    doc: "paint chips: boolean flakes revealing rust, torn fwidth edges",
    glsl: /* glsl */ `
    vec3 dockPaintChip(vec2 p, float t) {
      vec3 paint = dkCel3(0.42 + 0.25 * p.y, DK_WET, DK_PAINT, mix(DK_PAINT, DK_SOD, 0.12));
      vec2 v = dkVor(p * 9.0 + vec2(t * 0.01, 0.0));
      float chip = step(0.72, dkH21(floor(p * 9.0))) * dkFill(v.x - 0.18);
      vec3 col = mix(paint, mix(DK_RUST, DK_HULL, 0.35), chip);
      col = mix(col, DK_INK, dkLine(v.x - 0.18, 1.4) * chip * 0.55);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockPaintChip(p, t); }`,
  }),
];
