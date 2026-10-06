// Hull metal / rivet / reflection band — 6 operators on the moored boat.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockHullPlate",
    doc: "hull plates: large metal facets, 3-step cel, rust in the seams",
    glsl: /* glsl */ `
    vec3 dockHullPlate(vec2 p, float t) {
      vec2 gv = floor(p * vec2(4.0, 3.0));
      float facet = dkH21(gv);
      float ndl = 0.35 + 0.4 * facet + 0.15 * p.y;
      vec3 col = dkCel3(ndl, DK_INK, DK_HULL, mix(DK_HULL, DK_SALT, 0.18));
      float seamX = dkLine(fract(p.x * 4.0) - 0.5, 1.5);
      float seamY = dkLine(fract(p.y * 3.0) - 0.5, 1.5);
      col = mix(col, DK_RUST, max(seamX, seamY) * 0.45);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockHullPlate(p, t); }`,
  }),
  defineModule({
    name: "dockRivetRow",
    doc: "rivet rows: periodic discs along plate seams, fwidth rims",
    glsl: /* glsl */ `
    vec3 dockRivetRow(vec2 p, float t) {
      vec3 col = dkCel3(0.4 + 0.25 * p.y, DK_INK, DK_HULL, DK_PAINT * 0.7);
      float row = abs(fract(p.y * 5.0) - 0.5);
      float along = fract(p.x * 14.0) - 0.5;
      float riv = length(vec2(along, row)) - 0.07;
      col = mix(col, mix(DK_HULL, DK_SALT, 0.25), dkFill(riv) * dkBand(row, 0.0, 0.18));
      col = mix(col, DK_INK, dkLine(riv, 1.2) * 0.5);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRivetRow(p, t); }`,
  }),
  defineModule({
    name: "dockReflectBand",
    doc: "water reflection band on hull: horizontal sheen, sodium tint, clamped",
    glsl: /* glsl */ `
    vec3 dockReflectBand(vec2 p, float t) {
      vec3 col = dkCel3(0.38 + 0.3 * p.y, DK_INK, DK_HULL, DK_HULL * 1.1);
      float band = dkBand(p.y, DK_WATER_Y - 0.02, DK_WATER_Y + 0.10);
      float wob = 0.5 + 0.5 * sin(p.x * 18.0 + t * 1.1);
      col = mix(col, mix(DK_SEA, DK_SOD * 0.4, 0.35), band * (0.45 + 0.35 * wob));
      col = mix(col, DK_SEA, dkFill(dkWater(p)) * 0.7);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockReflectBand(p, t); }`,
  }),
  defineModule({
    name: "dockHullSeam",
    doc: "plate seams: butt-joint lines, rust bleed, fwidth lips",
    glsl: /* glsl */ `
    vec3 dockHullSeam(vec2 p, float t) {
      vec3 col = mix(DK_HULL, DK_PAINT, 0.2);
      float sx = min(abs(fract(p.x * 3.2) - 0.5), abs(fract(p.y * 2.4) - 0.5));
      float seam = dkLine(sx - 0.02, 2.0);
      float bleed = dkFbm(vec2(p.x * 8.0, p.y * 20.0)) * seam;
      col = mix(col, DK_INK, seam * 0.55);
      col = mix(col, DK_RUST, bleed * 0.65);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockHullSeam(p, t); }`,
  }),
  defineModule({
    name: "dockRivetShadow",
    doc: "rivet shadows: soft umbra under each head, slate body stays lifted",
    glsl: /* glsl */ `
    vec3 dockRivetShadow(vec2 p, float t) {
      vec3 col = DK_HULL;
      vec2 gv = floor(p * vec2(12.0, 5.0));
      vec2 f = fract(p * vec2(12.0, 5.0)) - 0.5;
      vec2 off = (dkH22(gv) - 0.5) * 0.12;
      float r = length(f - off);
      float head = dkFill(r - 0.12);
      float umbra = exp(-length(f - off - vec2(0.04, -0.05)) * 14.0) * (1.0 - head);
      col = mix(col, DK_INK, umbra * 0.55);
      col = mix(col, mix(DK_HULL, DK_SALT, 0.2), head);
      col = mix(col, DK_INK, dkLine(r - 0.12, 1.2) * 0.4);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockRivetShadow(p, t); }`,
  }),
  defineModule({
    name: "dockHullWetline",
    doc: "wet reflection line at the waterline: hard lip, oil tint, dusk sea below",
    glsl: /* glsl */ `
    vec3 dockHullWetline(vec2 p, float t) {
      float wl = dkWater(p);
      vec3 hull = dkCel3(0.5 + 0.2 * p.x, DK_INK, DK_HULL, DK_PAINT * 0.65);
      vec3 sea = mix(DK_SEA, dkOilFilm(p, t, 0.4), 0.25);
      vec3 col = mix(hull, sea, dkFill(wl));
      col = mix(col, mix(DK_SHAL, DK_SOD * 0.35, 0.4), dkLine(wl, 2.6) * 0.7);
      col = mix(col, DK_RUST, dkBand(p.y, DK_WATER_Y, DK_WATER_Y + 0.06) * 0.25);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockHullWetline(p, t); }`,
  }),
];
