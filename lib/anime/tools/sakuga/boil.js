// Family — cel shadow boil. The terminator crawls on twos; the field does not noise.
import { T } from "./define.js";

const F = "boil";

export const BOIL = [
  T("boilTerminator", F, "shadow edge crawls on each drawing: hashed threshold, not Perlin on the plate",
    `vec3 boilTerminator(vec2 p, float t) {
      float hold = skTwos(t);
      float h = skNdL(p);
      float jitter = (skH21(floor(p * 26.0) + hold * 9.0) - 0.5) * 0.07;
      float cut = 0.40 + jitter;
      vec3 body = mix(SK_FILL, SK_KEY, skAA(h, cut));
      vec3 mid = mix(SK_FILL, SK_MID, skAA(h, cut - 0.16));
      body = mix(mid, body, skAA(h, cut + 0.18));
      return mix(skPaper(p) * 0.92, body, skCover(p));
    }`, "boilTerminator(p, t)"),

  T("boilCoreShadow", F, "core-shadow blob morphs per drawing: shape boil, hue stays authored",
    `vec3 boilCoreShadow(vec2 p, float t) {
      float hold = skTwos(t);
      vec2 o = vec2(0.66, 0.46) + (skH22(vec2(hold, 4.4)) - 0.5) * 0.03;
      float blob = skFbm((p - o) * 5.5 + hold * 0.15);
      float core = skFill(skEllipse(p, o, vec2(0.20, 0.16) * (0.9 + blob * 0.18)));
      vec3 body = skCel3(skNdL(p));
      body = mix(body, SK_FILL * 0.88, core * 0.70);
      return mix(skPaper(p) * 0.92, body, skCover(p));
    }`, "boilCoreShadow(p, t)"),

  T("boilCastBlob", F, "cast shadow on the floor acetate: ellipse wobbles on twos, painted not projected",
    `vec3 boilCastBlob(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 col = skFigure(p, hold);
      vec2 o = vec2(0.70, 0.18) + (skH22(vec2(hold * 2.0, 1.7)) - 0.5) * 0.025;
      vec2 rad = vec2(0.28, 0.07) * (0.92 + skH21(vec2(hold, 6.0)) * 0.12);
      float blob = skFill(skEllipse(p, o, rad));
      float lip = skLine(skEllipse(p, o, rad), 1.4);
      col = mix(col, mix(col, SK_FILL * 0.9, 0.55), blob * (1.0 - skCover(p)));
      return mix(col, SK_INK * 1.6, lip * 0.22 * (1.0 - skCover(p)));
    }`, "boilCastBlob(p, t)"),
];
