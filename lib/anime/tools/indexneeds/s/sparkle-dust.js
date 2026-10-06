import { defineModule } from "./define.js";

export default defineModule({
  name: "sparkle-dust",
  doc: "shoujo sparkles: nine 4-point stars at authored seats, cream cores gold fringe — drawn stars, not mote noise",
  glsl: /* glsl */ `
  vec3 sparkleDust(vec2 p, float t) {
    vec3 col = mix(S_VOID, vec3(0.160, 0.070, 0.180), clamp(p.y, 0.0, 1.0));
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      vec2 seat = fi < 1.0 ? vec2(0.22, 0.72) : fi < 2.0 ? vec2(0.40, 0.58)
        : fi < 3.0 ? vec2(0.62, 0.78) : fi < 4.0 ? vec2(0.80, 0.62)
        : fi < 5.0 ? vec2(0.30, 0.38) : fi < 6.0 ? vec2(0.54, 0.44)
        : fi < 7.0 ? vec2(0.76, 0.36) : fi < 8.0 ? vec2(0.88, 0.80)
        : vec2(0.16, 0.48);
      float flick = 0.65 + 0.35 * step(0.25, fract(fi * 0.17 + t * 0.55));
      vec2 q = p - seat;
      float star = sStar4(q * 14.0, 0.55);
      float core = sFill(length(q) - 0.010);
      col = mix(col, S_GOLD, star * flick * 0.85);
      col = mix(col, S_CREAM, core * flick);
    }
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return sparkleDust(p, t); }`,
});
