// Family — book-in / book-out. Theatrical page, never fade-to-black.
import { T } from "./define.js";

const F = "book";

export const BOOK = [
  T("bookInWipe", F, "book-in iris: paper margin opens onto the still, fwidth lip, no dissolve",
    `vec3 bookInWipe(vec2 p, float t) {
      float prog = fract(t * 0.12);
      vec3 still = skFigure(p, skTwos(t));
      vec3 margin = skPaper(p) * vec3(0.92, 0.90, 0.86);
      float r = length(p - vec2(0.72, 0.50));
      float open = mix(0.02, 0.95, smoothstep(0.0, 0.72, prog));
      float iris = skAA(open, r);
      float lip = skLine(r - open, 1.8);
      vec3 col = mix(margin, still, iris);
      return mix(col, SK_UMBER * 1.4, lip * 0.35);
    }`, "bookInWipe(p, t)"),

  T("bookOutFade", F, "book-out to paper: value collapses to stock, never #000, vignette is the page",
    `vec3 bookOutFade(vec2 p, float t) {
      float prog = fract(t * 0.12);
      float outp = smoothstep(0.55, 1.0, prog);
      vec3 still = skFigure(p, skTwos(t));
      vec3 page = mix(SK_PAPER, vec3(0.78, 0.74, 0.68), skFbm(p * 6.0));
      float vig = length((p - vec2(0.5, 0.5)) * vec2(1.15, 1.0));
      float collapse = skAA(outp * 1.15, vig * 0.85);
      return mix(still, page, collapse);
    }`, "bookOutFade(p, t)"),

  T("bookMatchCut", F, "match-cut book: two plates swap on a hard diagonal seam, fwidth only",
    `vec3 bookMatchCut(vec2 p, float t) {
      float hold = skTwos(t);
      float side = skAA(dot(p - vec2(0.62, 0.5), normalize(vec2(0.78, -0.62))), 0.0);
      vec3 warm = skFigure(p, hold);
      vec3 cool = mix(SK_FILL * 1.2, SK_LERCHE_WINTER, skNdL(p));
      cool = mix(skPaper(p) * vec3(0.78, 0.82, 0.88), cool, skCover(p));
      float seam = skLine(dot(p - vec2(0.62, 0.5), normalize(vec2(0.78, -0.62))), 1.6);
      vec3 col = mix(warm, cool, side);
      return mix(col, SK_INK * 2.0, seam * 0.28);
    }`, "bookMatchCut(p, t)"),
];
