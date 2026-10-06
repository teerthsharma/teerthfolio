// Family — manhwa grey. Vertical webtoon grammar. Not JJK shrine / dismantle.
import { T } from "./define.js";

const F = "manhwa";

export const MANHWA = [
  T("manhwaScrollGrey", F, "vertical webtoon grey ladder: five cool ash plates, full bleed, one red lip",
    `vec3 manhwaScrollGrey(vec2 p, float t) {
      float h = clamp(p.y * 0.82 + skFbm(p * 2.4) * 0.18, 0.0, 1.0);
      float steps = 5.0;
      float fw = fwidth(h * steps) + 1e-4;
      float u = (floor(h * steps) + smoothstep(0.5 - fw, 0.5 + fw, fract(h * steps))) / steps;
      vec3 a = SK_MANHWA_ASH;
      vec3 b = vec3(0.28, 0.26, 0.26);
      vec3 c = SK_MANHWA_GREY;
      vec3 d = vec3(0.62, 0.60, 0.58);
      vec3 e = SK_MANHWA_PAPER;
      vec3 col = u < 0.2 ? mix(a, b, u * 5.0)
        : u < 0.4 ? mix(b, c, u * 5.0 - 1.0)
        : u < 0.6 ? mix(c, d, u * 5.0 - 2.0)
        : u < 0.8 ? mix(d, e, u * 5.0 - 3.0)
        : e;
      float lip = skFill(skBox(p, vec2(0.08, 0.72), vec2(0.018, 0.16)));
      return mix(col, SK_MANHWA_RED, lip * 0.88);
    }`, "manhwaScrollGrey(p, t)"),

  T("manhwaInkReserve", F, "reserved paper against cool ash: the white is kept, one red bar, no screentone",
    `vec3 manhwaInkReserve(vec2 p, float t) {
      vec3 ash = mix(SK_MANHWA_ASH, SK_MANHWA_GREY * 0.7, skFbm(p * 3.0) * 0.35);
      float reserve = skFill(skEllipse(p, vec2(0.62, 0.52), vec2(0.28, 0.22)));
      float cut = skFill(skBox(p, vec2(0.78, 0.48), vec2(0.18, 0.08)));
      vec3 col = mix(ash, SK_MANHWA_PAPER, reserve);
      col = mix(col, ash, cut * 0.90);
      float bar = skFill(skBox(p, vec2(0.62, 0.18), vec2(0.34, 0.012)));
      return mix(col, SK_MANHWA_RED, bar * 0.90);
    }`, "manhwaInkReserve(p, t)"),

  T("manhwaPanelGutter", F, "two grey panels, paper gutter as space not a stroke, Korean scroll pause",
    `vec3 manhwaPanelGutter(vec2 p, float t) {
      float mid = 0.50;
      float gutter = skBand(p.y, mid - 0.045, mid + 0.045);
      vec3 top = mix(SK_MANHWA_ASH, SK_MANHWA_GREY, skAA(p.x, 0.4));
      vec3 bot = mix(SK_MANHWA_GREY * 0.7, vec3(0.58, 0.56, 0.54), skAA(p.y, 0.22));
      vec3 col = mix(bot, top, skAA(p.y, mid));
      col = mix(col, SK_MANHWA_PAPER, gutter);
      float fig = skCover(vec2(p.x, p.y * 0.92 + 0.18));
      vec3 body = mix(SK_MANHWA_ASH * 1.2, SK_MANHWA_GREY, skNdL(p));
      col = mix(col, body, fig * (1.0 - gutter));
      return col;
    }`, "manhwaPanelGutter(p, t)"),
];
