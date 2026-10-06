// Night dock grade / tide mark / pilings — 6 operators. Same pier at dusk.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "dockNightGrade",
    doc: "night dock grade: dusk value ladder, sodium key, teal slip, no crushed black",
    glsl: /* glsl */ `
    vec3 dockNightGrade(vec2 p, float t) {
      vec3 col = dkSky(p);
      col = mix(col, mix(DK_SEA, DK_SHAL, 0.2), dkFill(dkWater(p)));
      vec3 deck = mix(DK_WET, DK_WOOD, dkGrain(p) * 0.4);
      col = mix(col, deck, dkBand(p.y, DK_DECK_Y - 0.08, DK_DECK_Y + 0.08));
      col = mix(col, DK_HULL, dkFill(dkPilingField(p)));
      col = mix(col, DK_SOD, dkFill(length(p - dkLampP()) - 0.026));
      col += DK_SOD * exp(-dot(p - dkLampP(), p - dkLampP()) * 12.0) * 0.35;
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNightGrade(p, t); }`,
  }),
  defineModule({
    name: "dockTideMark",
    doc: "tide stain on pilings: mineral band from the dam's waterline grammar",
    glsl: /* glsl */ `
    vec3 dockTideMark(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      float pil = dkPilingField(p);
      col = mix(col, DK_HULL, dkFill(pil));
      float stain = dkBand(p.y, DK_WATER_Y - 0.04, DK_WATER_Y + 0.07);
      col = mix(col, mix(DK_SALT, DK_RUST, 0.35), stain * dkFill(pil + 0.01));
      col = mix(col, DK_INK, dkLine(pil, 1.3) * 0.4);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockTideMark(p, t); }`,
  }),
  defineModule({
    name: "dockPilingRing",
    doc: "piling cylinders: three posts, rounded-box SDF, wet rings at the slip",
    glsl: /* glsl */ `
    vec3 dockPilingRing(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      float pil = dkPilingField(p);
      vec3 wood = mix(DK_WET, DK_WOOD, dkGrain(vec2(p.y * 2.0, p.x * 8.0)));
      col = mix(col, wood, dkFill(pil));
      float ring = dkLine(abs(p.y - DK_WATER_Y) - 0.012, 1.8);
      col = mix(col, DK_TAR, ring * dkFill(pil + 0.008));
      col = mix(col, DK_INK, dkLine(pil, 1.2) * 0.45);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockPilingRing(p, t); }`,
  }),
  defineModule({
    name: "dockTideBand",
    doc: "stacked tide bands: three historic waterlines, salt then rust then tar",
    glsl: /* glsl */ `
    vec3 dockTideBand(vec2 p, float t) {
      vec3 col = mix(DK_DUSK, DK_SEA, dkFill(dkWater(p)));
      float pil = dkPilingField(p);
      col = mix(col, DK_WOOD, dkFill(pil));
      float y = p.y;
      col = mix(col, DK_SALT, dkBand(y, 0.40, 0.44) * dkFill(pil));
      col = mix(col, DK_RUST, dkBand(y, 0.34, 0.38) * dkFill(pil));
      col = mix(col, DK_TAR, dkBand(y, 0.28, 0.32) * dkFill(pil));
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockTideBand(p, t); }`,
  }),
  defineModule({
    name: "dockPilingRow",
    doc: "receding piling row: perspective posts into the fog, same dusk grade",
    glsl: /* glsl */ `
    vec3 dockPilingRow(vec2 p, float t) {
      vec3 col = mix(DK_SEA, DK_DUSK, clamp(p.y * 0.9, 0.0, 1.0));
      float fog = dkFogAmt(p, t);
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float z = 0.18 + fi * 0.12;
        float x = 0.22 + 0.16 * sin(fi * 0.9) + (p.y * 0.05);
        float s = 0.045 * (1.0 - fi * 0.08);
        float d = dkBox(p, vec2(x + z * 0.35, 0.16 + z * 0.15), vec2(s, 0.20 - fi * 0.012));
        vec3 wood = mix(DK_WET, DK_WOOD, dkGrain(p + fi));
        col = mix(col, wood, dkFill(d) * (1.0 - fog * 0.35));
      }
      col = mix(col, DK_FOG, fog * 0.4);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockPilingRow(p, t); }`,
  }),
  defineModule({
    name: "dockNightSlip",
    doc: "full night slip: deck, three pilings, sodium, oil water, fog — the pier",
    glsl: /* glsl */ `
    vec3 dockNightSlip(vec2 p, float t) {
      vec3 col = dkSky(p);
      float swell = 0.5 + 0.5 * sin(p.x * 3.0 + t * 0.4);
      vec3 water = mix(DK_SEA, dkOilFilm(p, t, 0.35), 0.22);
      water = mix(water, DK_SHAL, swell * 0.15);
      col = mix(col, water, dkFill(dkWater(p)));
      vec3 deck = mix(DK_WET, DK_WOOD, dkGrain(p) * 0.4);
      deck = mix(deck, DK_TAR, dkFill(dkPlankGap(p)) * 0.8);
      col = mix(col, deck, dkBand(p.y, DK_DECK_Y - 0.07, DK_DECK_Y + 0.09));
      col = mix(col, mix(DK_WET, DK_WOOD, 0.4), dkFill(dkPilingField(p)));
      vec2 lp = dkLampP();
      col = mix(col, DK_SOD, dkFill(length(p - lp) - 0.024));
      col += DK_SOD * exp(-dot(p - lp, p - lp) * 11.0) * 0.4;
      col = mix(col, DK_FOG, dkFogAmt(p, t) * 0.35);
      return dkOut(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dockNightSlip(p, t); }`,
  }),
];
