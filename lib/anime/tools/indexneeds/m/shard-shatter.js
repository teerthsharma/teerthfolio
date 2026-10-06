import { defineModule } from "./define.js";

export const SHARD_SHATTER = defineModule({
  name: "shard-shatter",
  doc: "lens-crack shatter: radial crack tree from impact, glass wedges, refraction chips",
  glsl: /* glsl */ `
  vec3 shardShatter(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec2 o = vec2(0.68, 0.50);
    vec2 q = p - o;
    float r = length(q);
    float ang = atan(q.y, q.x);
    vec3 bg = mix(vec3(0.28, 0.34, 0.48), vec3(0.62, 0.68, 0.74), imAA(p.y, 0.40));
    float spread = 0.18 + 0.22 * fract(hold * 0.17);
    float crack = 1e2;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float a = fi * 0.70 + imH21(vec2(fi, 3.0)) * 0.4;
      vec2 dir = vec2(cos(a), sin(a));
      float len = spread * (0.7 + 0.5 * imH21(vec2(fi, 5.0)));
      crack = min(crack, imSeg(p, o, o + dir * len, 0.0035));
      vec2 mid = o + dir * len * 0.55;
      vec2 br = vec2(cos(a + 0.55), sin(a + 0.55));
      crack = min(crack, imSeg(p, mid, mid + br * len * 0.35, 0.0028));
    }
    vec2 w = imVor(q * 9.0 + hold * 0.1);
    float chip = imFill(w.x - 0.10) * imFill(r - spread * 0.35);
    vec2 bend = q * 0.08 * chip;
    vec3 glass = mix(vec3(0.28, 0.34, 0.48), vec3(0.62, 0.68, 0.74), imAA((p + bend).y, 0.40));
    glass = mix(glass, vec3(0.78, 0.82, 0.86), chip * 0.35);
    vec3 col = mix(bg, glass, imFill(r - (spread + 0.06)) * 0.55 + 0.45);
    col = mix(col, IM_INK, imFill(crack) * 0.80);
    float star = exp(-r * 18.0) * 0.45;
    return mix(col, vec3(0.86, 0.84, 0.76), star);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(shardShatter(p, t)); }`,
});
