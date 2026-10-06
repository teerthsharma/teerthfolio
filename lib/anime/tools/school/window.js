// Family 5 — winter window / campus dusk (5).
// West glass only. Value bands, not a sunset sticker.
import { T } from "./kit.glsl.js";

const F = "window";

export const WINDOW = [
  T("winterPane", F, "winter west pane: cold glass, fluoro interior bounce, printed frost edge",
    `vec3 winterPane(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float win = (1.0 - scAA(p.x, 0.32)) * scBand(p.y, 0.26, 0.90);
      float slat = scVenetian(p, 16.0);
      vec3 glass = mix(SC_WINTER * 0.72, SC_FLUORO * 0.55, scAA(p.y, 0.58));
      glass = mix(glass, glass * 0.40 + SC_FLUORO_DIM * 0.2, slat * 0.70);
      float mullion = max(scLine(p.x - 0.155, 1.8), scLine(p.y - 0.58, 1.6));
      glass = mix(glass, SC_WALL * 0.62, mullion * 0.55);
      return mix(c, glass, win * 0.92);
    }`, "winterPane(p, t)"),

  T("campusDusk", F, "campus dusk through west glass: #f3b36b over winter, venetian still on top",
    `vec3 campusDusk(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float win = (1.0 - scAA(p.x, 0.32)) * scBand(p.y, 0.26, 0.90);
      float el = clamp((p.y - 0.30) / 0.58, 0.0, 1.0);
      vec3 sky = mix(SC_DUSK, SC_DUSK_PINK, scAA(el, 0.55));
      sky = mix(sky, SC_WINTER * 0.55, 1.0 - scAA(el, 0.28));
      float slat = scVenetian(p, 15.0);
      sky = mix(sky, sky * 0.38 + SC_FLUORO_DIM * 0.15, slat * 0.68);
      return mix(c, sky, win * 0.90);
    }`, "campusDusk(p, t)"),

  T("duskBand", F, "dusk value bands: three plates, luma split, hue stays authored",
    `vec3 duskBand(vec2 p, float t) {
      vec3 c = campusDusk(p, t);
      float win = (1.0 - scAA(p.x, 0.32)) * scBand(p.y, 0.26, 0.90);
      float v = p.y;
      vec3 lo = SC_DUSK * 0.55;
      vec3 mid = SC_DUSK;
      vec3 hi = mix(SC_DUSK, SC_DUSK_PINK, 0.45);
      vec3 band = v < 0.48 ? mix(lo, mid, scAA(v, 0.36)) : mix(mid, hi, scAA(v, 0.70));
      return mix(c, mix(c, band, 0.55), win);
    }`, "duskBand(p, t)", ["campusDusk"]),

  T("frostSill", F, "frost on the sill: paper-white crystals, fwidth edge, winter only",
    `vec3 frostSill(vec2 p, float t) {
      vec3 c = winterPane(p, t);
      float sill = scBand(p.y, 0.24, 0.32) * (1.0 - scAA(p.x, 0.34));
      float cryst = scFbm(p * 22.0 + vec2(2.1, 0.4));
      float lace = scAA(cryst, 0.52) * 0.55 + scFill(scBox(p, vec2(0.14, 0.27), vec2(0.16, 0.012))) * 0.7;
      vec3 frost = mix(SC_WINTER * 0.65, SC_PAPER * 0.88, scAA(cryst, 0.60));
      return mix(c, frost, sill * lace);
    }`, "frostSill(p, t)", ["winterPane"]),

  T("westGlass", F, "west glass: interior fluoro reflection over winter transmission, still",
    `vec3 westGlass(vec2 p, float t) {
      vec3 c = winterPane(p, t);
      float win = (1.0 - scAA(p.x, 0.32)) * scBand(p.y, 0.28, 0.88);
      vec2 rp = vec2(0.30 - p.x, p.y);
      float tubes = 0.0;
      for (int i = 0; i < 3; i++) {
        float x = 0.06 + float(i) * 0.07;
        tubes = max(tubes, scLine(rp.x - x, 2.0) * scBand(rp.y, 0.86, 0.96));
      }
      vec3 bounce = mix(c, SC_FLUORO * 0.62, tubes * 0.40);
      float fres = scAA(1.0 - p.x, 0.78);
      return mix(c, bounce, win * fres * 0.45);
    }`, "westGlass(p, t)", ["winterPane"]),
];
