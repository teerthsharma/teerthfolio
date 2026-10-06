// Wet plank / grain / barnacle / tar — 8 operators on the same dusk deck.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockWetPlank",
    doc: "wet plank boards: 7.2 boards/m, anisotropic sheen, dusk umber from C.wood",
    glsl: /* glsl */ `
    vec3 dockWetPlank(vec2 p, float t) {
      float gap = dkPlankGap(p);
      float g = dkGrain(p);
      vec3 board = mix(DK_WET, DK_WOOD, 0.35 + 0.45 * g);
      board = mix(board, DK_SOD * 0.28, dkWetSheen(p, t) * 0.55);
      vec3 col = mix(DK_TAR, board, dkFill(-gap));
      col = mix(col, dkSky(p), dkFill(-dkWater(p)) * 0.15);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockWetPlank(p, t); }`,
  }),
  defineModule({
    name: "dockGrainRun",
    doc: "long grain run: fbm stretched along plank axis, darker latewood rings",
    glsl: /* glsl */ `
    vec3 dockGrainRun(vec2 p, float t) {
      float along = p.x * 18.0 + dkFbm(vec2(p.x * 1.4, p.y * 52.0)) * 2.4;
      float ring = abs(sin(along + t * 0.04));
      float late = dkLine(ring - 0.18, 1.6);
      vec3 col = mix(DK_WOOD, DK_WET, 0.4 + 0.4 * dkGrain(p));
      col = mix(col, DK_TAR, late * 0.65);
      col = mix(col, DK_TAR, dkFill(dkPlankGap(p)) * 0.85);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockGrainRun(p, t); }`,
  }),
  defineModule({
    name: "dockBarnaclePatch",
    doc: "barnacle clusters: voronoi discs packed on the waterline face of wet wood",
    glsl: /* glsl */ `
    vec3 dockBarnaclePatch(vec2 p, float t) {
      vec3 col = mix(DK_WET, DK_WOOD, dkGrain(p));
      vec2 v = dkVor(p * 18.0 + vec2(0.0, t * 0.01));
      float shell = dkFill(v.x - 0.16);
      float lip = dkLine(v.x - 0.16, 1.4);
      float zone = dkBand(p.y, DK_WATER_Y - 0.02, DK_DECK_Y + 0.04);
      col = mix(col, mix(DK_SALT, DK_WOOD, 0.35), shell * zone * 0.9);
      col = mix(col, DK_INK, lip * zone * 0.55);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockBarnaclePatch(p, t); }`,
  }),
  defineModule({
    name: "dockTarSeam",
    doc: "tar seams: fwidth lines in plank gaps, slightly bled into the grain",
    glsl: /* glsl */ `
    vec3 dockTarSeam(vec2 p, float t) {
      float u = dkPlankU(p);
      float seam = dkLine(fract(u) - 0.5, 2.2);
      float bleed = dkFbm(vec2(floor(u), p.y * 9.0 + t * 0.02)) * 0.35;
      vec3 col = mix(DK_WOOD, DK_WET, dkGrain(p) * 0.6);
      col = mix(col, DK_TAR, seam * (0.75 + bleed));
      col = mix(col, DK_TAR, dkFill(dkPlankGap(p)) * 0.95);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockTarSeam(p, t); }`,
  }),
  defineModule({
    name: "dockWetKnot",
    doc: "wet knots: elliptical rings in the timber, darker heart, wet highlight",
    glsl: /* glsl */ `
    vec3 dockWetKnot(vec2 p, float t) {
      vec3 col = mix(DK_WET, DK_WOOD, dkGrain(p));
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 c = vec2(0.18 + 0.24 * fi, 0.42 + 0.08 * sin(fi * 1.7));
        vec2 q = (p - c) * vec2(1.0, 1.55);
        float r = length(q);
        float ring = dkLine(r - 0.035, 1.8) + dkLine(r - 0.055, 1.3);
        col = mix(col, DK_TAR, dkFill(r - 0.028) * 0.85);
        col = mix(col, DK_WET, ring * 0.7);
        col = mix(col, DK_SOD * 0.3, dkWetSheen(q + 0.5, t) * dkFill(r - 0.06) * 0.4);
      }
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockWetKnot(p, t); }`,
  }),
  defineModule({
    name: "dockPlankGap",
    doc: "plank-gap SDF: dark trough between boards, fwidth lips, no crushed black",
    glsl: /* glsl */ `
    vec3 dockPlankGap(vec2 p, float t) {
      float g = dkPlankGap(p);
      float lip = dkLine(g, 1.6);
      vec3 board = mix(DK_WET, DK_WOOD, 0.4 + 0.4 * dkGrain(p));
      vec3 trough = mix(DK_INK, DK_TAR, 0.55 + 0.2 * dkVn(p * 40.0));
      vec3 col = mix(trough, board, dkFill(-g));
      col = mix(col, DK_WET, lip * 0.45);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockPlankGap(p, t); }`,
  }),
  defineModule({
    name: "dockSaltGrain",
    doc: "salt-bleached grain: pale streaks across latewood, orthogonal to the run",
    glsl: /* glsl */ `
    vec3 dockSaltGrain(vec2 p, float t) {
      float run = dkGrain(p);
      float cross = dkFbm(vec2(p.y * 22.0, p.x * 3.1 + t * 0.03));
      float bleach = smoothstep(0.58, 0.82, cross) * (0.4 + 0.6 * run);
      vec3 col = mix(DK_WET, DK_WOOD, run);
      col = mix(col, DK_SALT, bleach * 0.55);
      col = mix(col, DK_TAR, dkFill(dkPlankGap(p)) * 0.8);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSaltGrain(p, t); }`,
  }),
  defineModule({
    name: "dockTarDrip",
    doc: "tar drips: gravity streaks from plank ends, bulb heads, fwidth edges",
    glsl: /* glsl */ `
    vec3 dockTarDrip(vec2 p, float t) {
      vec3 col = mix(DK_WET, DK_WOOD, dkGrain(p));
      float u = floor(dkPlankU(p));
      float hx = (u + 0.5) / 7.2;
      float dripX = hx + (dkH21(vec2(u, 3.0)) - 0.5) * 0.04;
      float len = 0.12 + 0.18 * dkH21(vec2(u, 7.0));
      float y0 = DK_DECK_Y - 0.02;
      vec2 a = vec2(dripX, y0), b = vec2(dripX + 0.01 * sin(t * 0.2 + u), y0 - len);
      float d = dkSeg(p, a, b, 0.006 + 0.004 * (1.0 - clamp((y0 - p.y) / max(len, 1e-3), 0.0, 1.0)));
      float head = length(p - b) - 0.012;
      col = mix(col, DK_TAR, dkFill(d) * 0.95);
      col = mix(col, DK_TAR, dkFill(head) * 0.95);
      col = mix(col, DK_INK, dkLine(min(d, head), 1.3) * 0.4);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockTarDrip(p, t); }`,
  }),
];
