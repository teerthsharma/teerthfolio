import { defineModule } from "./define.js";

export const MAGIC_CIRCLE = defineModule({
  name: "magic-circle",
  doc: "summoning circle: concentric gold rings, hashed rune ticks, inner hex, hold spin on twos",
  glsl: /* glsl */ `
  vec3 magicCircle(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec2 c = vec2(0.70, 0.48);
    vec2 q = p - c;
    float r = length(q);
    float ang = atan(q.y, q.x) + hold * 0.15;
    vec3 col = mix(IM_VOID, IM_ORCH * 0.40, imAA(p.y, 0.30));
    float disc = imFill(r - 0.36);
    col = mix(col, mix(IM_VOID, IM_TEAL * 0.55, imFbm(q * 4.0 + hold * 0.2)), disc * 0.70);
    for (int i = 0; i < 4; i++) {
      float rr = 0.14 + float(i) * 0.065;
      col = mix(col, IM_GOLD, imFill(imRing(r, rr, 0.006)) * 0.88);
    }
    float hex = 0.0;
    for (int k = 0; k < 6; k++) {
      float a = float(k) * 1.0471976 + 0.2;
      hex = max(hex, imFill(imSeg(p, c + vec2(cos(a), sin(a)) * 0.20, c + vec2(cos(a + 1.0471976), sin(a + 1.0471976)) * 0.20, 0.006)));
    }
    col = mix(col, IM_GOLD, hex * 0.80);
    float rune = step(fract(ang * 9.0), 0.18) * imFill(imRing(r, 0.33, 0.018));
    col = mix(col, IM_CITRUS * 0.70, rune * 0.75);
    float core = imFill(r - 0.045);
    col = mix(col, mix(IM_GOLD_BODY, IM_GOLD, imAA(imFbm(q * 8.0 + hold), 0.5)), core);
    return mix(col, IM_INK, imLine(r - 0.36, 1.6) * 0.45);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(magicCircle(p, t)); }`,
});
