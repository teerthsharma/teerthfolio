import { defineModule } from "./define.js";

export default defineModule({
  name: "rain-streak",
  doc: "anime rain: slanted capsule streaks of fixed length, cyan-cream on indigo night — drawn rods, not particles",
  glsl: /* glsl */ `
  vec3 rainStreak(vec2 p, float t) {
    vec3 col = mix(S_INDIGO, vec3(0.080, 0.100, 0.220), clamp(p.y, 0.0, 1.0));
    vec2 dir = normalize(vec2(-0.18, -1.0));
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      vec2 seed = sH22(vec2(fi, 3.1));
      float march = fract(t * 0.35 + seed.x);
      vec2 o = vec2(seed.y * 1.25 - 0.12, 1.15 - march * 1.45);
      float d = sSeg(p, o, o + dir * 0.16) - 0.0045;
      float hit = sFill(d);
      vec3 rod = mix(vec3(0.420, 0.620, 0.780), S_CREAM, sAA(p.y, 0.55));
      col = mix(col, rod, hit * 0.82);
    }
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return rainStreak(p, t); }`,
});
