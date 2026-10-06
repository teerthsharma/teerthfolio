// Water: slip, wake, oil sheen, caustic strips — 8 operators on the same slip.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockSlipWater",
    doc: "still slip: two-frequency swell, dusk teal from C.sea / C.shallows",
    glsl: /* glsl */ `
    vec3 dockSlipWater(vec2 p, float t) {
      float swell = 0.5 + 0.5 * sin(p.x * 3.1 + t * 0.55) * sin(p.y * 5.4 - t * 0.32);
      vec3 col = mix(DK_SEA, DK_SHAL, swell * 0.45 + 0.15 * (p.y / max(DK_WATER_Y, 1e-3)));
      float foam = dkLine(dkWater(p), 2.4);
      col = mix(col, DK_SALT * 0.7, foam * 0.45 * dkFill(dkWater(p) + 0.02));
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSlipWater(p, t); }`,
  }),
  defineModule({
    name: "dockWakeRibbon",
    doc: "wake ribbons: traveling sine bands behind a hull, fwidth lips",
    glsl: /* glsl */ `
    vec3 dockWakeRibbon(vec2 p, float t) {
      vec3 col = mix(DK_SEA, DK_SHAL, 0.25);
      float y = p.y + t * 0.12;
      float rib = abs(sin(y * 14.0 + sin(p.x * 6.0) * 0.8));
      float band = dkLine(rib - 0.22, 1.8) * dkFill(dkWater(p));
      col = mix(col, mix(DK_SHAL, DK_SALT * 0.55, 0.4), band);
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockWakeRibbon(p, t); }`,
  }),
  defineModule({
    name: "dockOilSheen",
    doc: "oil sheen: thin-film hue on dusk slip, teal/amber/magenta at low sat",
    glsl: /* glsl */ `
    vec3 dockOilSheen(vec2 p, float t) {
      float thick = 0.35 + 0.65 * dkFbm(p * 3.4 + t * 0.06);
      vec3 film = dkOilFilm(p, t, thick);
      vec3 water = mix(DK_SEA, DK_SHAL, 0.2);
      vec3 col = mix(water, film, 0.55 * thick);
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockOilSheen(p, t); }`,
  }),
  defineModule({
    name: "dockCausticStrip",
    doc: "caustic strips: sin x sin y bright bands on the slip, luma-clamped",
    glsl: /* glsl */ `
    vec3 dockCausticStrip(vec2 p, float t) {
      float c = dkCaustic(p, t);
      vec3 col = mix(DK_SEA, DK_SHAL, 0.22);
      col = mix(col, mix(DK_SHAL, DK_SOD * 0.45, 0.35), c * dkFill(dkWater(p)));
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockCausticStrip(p, t); }`,
  }),
  defineModule({
    name: "dockWakeV",
    doc: "V-wake: |x-k| minus travel along slip, foam lips on both arms",
    glsl: /* glsl */ `
    vec3 dockWakeV(vec2 p, float t) {
      vec2 o = p - vec2(0.72, 0.18);
      float travel = fract(t * 0.08);
      float arm = abs(o.x) - 0.55 * max(o.y + travel * 0.2, 0.0);
      float d = abs(arm) - 0.012;
      vec3 col = mix(DK_SEA, DK_SHAL, 0.2);
      col = mix(col, DK_SALT * 0.62, dkFill(d) * dkFill(dkWater(p)) * dkFill(-o.y + 0.22));
      col = mix(col, DK_INK, dkLine(d, 1.4) * 0.25);
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockWakeV(p, t); }`,
  }),
  defineModule({
    name: "dockOilSlickBand",
    doc: "oil-slick band against a piling: thicker film, darker body, sheen rim",
    glsl: /* glsl */ `
    vec3 dockOilSlickBand(vec2 p, float t) {
      float pil = dkPilingField(p);
      float near = 1.0 - smoothstep(0.0, 0.14, abs(pil));
      float thick = 0.55 + 0.45 * near * dkFbm(p * 5.0 + t * 0.05);
      vec3 col = mix(DK_SEA, dkOilFilm(p, t, thick), 0.4 + 0.45 * near);
      col = mix(col, DK_OIL, near * 0.35);
      col = mix(col, DK_HULL, dkFill(pil));
      col = mix(dkSky(p), col, dkFill(dkWater(p) + 0.22));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockOilSlickBand(p, t); }`,
  }),
  defineModule({
    name: "dockCausticGrid",
    doc: "crossed caustic lattice: two rotated sin-sin layers on the slip",
    glsl: /* glsl */ `
    vec3 dockCausticGrid(vec2 p, float t) {
      float a = dkCaustic(p, t);
      vec2 r = DK_ROT * p;
      float b = dkCaustic(r * 0.85, t * 0.7 + 1.3);
      float g = max(a, b * 0.75);
      vec3 col = mix(DK_SEA, DK_SHAL, 0.18);
      col = mix(col, DK_SOD * 0.38, g * 0.7 * dkFill(dkWater(p)));
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockCausticGrid(p, t); }`,
  }),
  defineModule({
    name: "dockSlipSwell",
    doc: "long swell: larger wavelength height field, shade from slope not hue",
    glsl: /* glsl */ `
    vec3 dockSlipSwell(vec2 p, float t) {
      float e = 0.012;
      float h0 = dkFbm(p * 2.1 + t * 0.07);
      float hx = dkFbm((p + vec2(e, 0.0)) * 2.1 + t * 0.07) - dkFbm((p - vec2(e, 0.0)) * 2.1 + t * 0.07);
      float hy = dkFbm((p + vec2(0.0, e)) * 2.1 + t * 0.07) - dkFbm((p - vec2(0.0, e)) * 2.1 + t * 0.07);
      float ndl = 0.5 + 0.5 * normalize(vec3(-hx, -hy, 0.08)).z;
      vec3 col = dkCel3(ndl, DK_SEA * 0.85, DK_SEA, DK_SHAL);
      col = mix(col, DK_SOD * 0.22, pow(max(ndl, 0.0), 10.0) * 0.35);
      col = mix(dkSky(p), col, dkFill(dkWater(p)));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockSlipSwell(p, t); }`,
  }),
];
