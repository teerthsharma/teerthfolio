import { defineModule } from "./define.js";

export const SIGIL_RING = defineModule({
  name: "sigil-ring",
  doc: "occult sigil ring: pentagram in an ink circle, gold catch on one vertex, quiet hold",
  glsl: /* glsl */ `
  vec3 sigilRing(vec2 p, float t) {
    float hold = imHold(t, 4.0);
    vec2 c = vec2(0.70, 0.50);
    vec2 q = p - c;
    float r = length(q);
    vec3 col = mix(vec3(0.14, 0.10, 0.16), IM_UMBER, imFbm(p * 3.0));
    col = mix(col, IM_INK, imFill(imRing(r, 0.30, 0.016)));
    col = mix(col, IM_GOLD_BODY, imFill(imRing(r, 0.24, 0.005)));
    float star = 1e2;
    for (int i = 0; i < 5; i++) {
      float a0 = float(i) * 2.513274 + hold * 0.02 - 1.5708;
      float a1 = float(i + 2) * 2.513274 + hold * 0.02 - 1.5708;
      vec2 a = c + vec2(cos(a0), sin(a0)) * 0.22;
      vec2 b = c + vec2(cos(a1), sin(a1)) * 0.22;
      star = min(star, imSeg(p, a, b, 0.007));
    }
    col = mix(col, IM_INK, imFill(star));
    float catchP = imFill(length(p - (c + vec2(0.0, 0.22))) - 0.018);
    col = mix(col, IM_GOLD, catchP);
    float ticks = step(fract(atan(q.y, q.x) * 4.0), 0.16) * imFill(imRing(r, 0.33, 0.012));
    return mix(col, IM_GOLD_BODY, ticks * 0.70);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(sigilRing(p, t)); }`,
});
