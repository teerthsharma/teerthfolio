// Family — Lerche classroom fluoro. Tube temperature and hold, not furniture.
// Distinct from school/: no troffers, venetian, board, blazer.
import { T } from "./define.js";

const F = "lerche";

export const LERCHE = [
  T("lercheTubeKey", F, "Lerche tube key: whole still graded 5000K green-white, observational, no room kit",
    `vec3 lercheTubeKey(vec2 p, float t) {
      float hold = skHold(t, 8.0);
      float h = skNdL(p);
      vec3 shade = mix(SK_FILL, SK_LERCHE_TUBE * 0.45, 0.40);
      vec3 lit = mix(SK_MID, SK_LERCHE_TUBE, 0.55);
      vec3 body = mix(shade, lit, skAA(h, 0.46));
      vec3 paper = mix(vec3(0.56, 0.58, 0.56), SK_LERCHE_TUBE * 0.72, skAA(p.y, 0.55));
      vec3 col = mix(paper, body, skCover(p));
      col *= vec3(0.96, 1.02, 0.98);
      return col * (1.0 + skGrain(p, hold) * 0.018);
    }`, "lercheTubeKey(p, t)"),

  T("lercheHoldStill", F, "Lerche still: 4fps observational hold, ballast hum as two values, time refuses to pass",
    `vec3 lercheHoldStill(vec2 p, float t) {
      float hold = skHold(t, 4.0);
      float hum = 0.94 + 0.06 * step(0.5, fract(hold * 0.5 + 0.13));
      vec3 col = skFigure(p, hold);
      col = mix(col, col * SK_LERCHE_TUBE, 0.28);
      float ceil = skAA(p.y, 0.78);
      col = mix(col, col * vec3(0.97, 1.03, 1.00) * hum, ceil * 0.40);
      return col;
    }`, "lercheHoldStill(p, t)"),

  T("lercheWinterPane", F, "winter-west vs desk bounce as a grade split: no window drawn, only the two lights",
    `vec3 lercheWinterPane(vec2 p, float t) {
      float hold = skHold(t, 8.0);
      float split = skAA(p.x, 0.58);
      float h = skNdL(p);
      vec3 winter = mix(SK_LERCHE_WINTER * 0.45, SK_LERCHE_WINTER, skAA(h, 0.44));
      vec3 bounce = mix(SK_LERCHE_BOUNCE * 0.50, SK_LERCHE_BOUNCE, skAA(h, 0.50));
      vec3 body = mix(winter, bounce, split);
      vec3 paper = mix(SK_LERCHE_WINTER * 0.55, SK_LERCHE_BOUNCE * 0.62, split);
      vec3 col = mix(paper, body, skCover(p));
      float seam = skLine(p.x - 0.58, 1.3);
      return mix(col, mix(col, SK_LERCHE_TUBE, 0.25), seam * 0.20);
    }`, "lercheWinterPane(p, t)"),
];
