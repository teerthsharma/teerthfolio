import { defineModule } from "./define.js";

export default defineModule({
  name: "coin-streak",
  doc: "Gate of Babylon coins: eight gold discs on a diagonal with capsule trails — minted still, not dust",
  glsl: /* glsl */ `
  vec3 coinStreak(vec2 p, float t) {
    vec3 col = mix(S_VOID, vec3(0.180, 0.070, 0.140), clamp(p.y, 0.0, 1.0));
    vec2 dir = normalize(vec2(-0.72, 0.28));
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float u = 0.12 + fi * 0.11 + 0.02 * sin(t * 0.8 + fi);
      vec2 o = vec2(0.18, 0.22) + dir * u * 1.15 + vec2(0.0, 0.04 * sin(fi * 1.7));
      float trail = sSeg(p, o, o - dir * 0.14) - 0.010;
      float coin = length((p - o) / vec2(1.0, 0.72)) - 0.034;
      col = mix(col, sGold(vec3(0.52, 0.36, 0.10)), sFill(trail) * 0.55);
      vec3 face = mix(sGold(vec3(0.58, 0.40, 0.10)), S_CREAM, sAA((p - o).x, 0.0) * 0.4);
      col = mix(col, face, sFill(coin));
      col = mix(col, S_INK, sLine(coin, 1.3));
    }
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return coinStreak(p, t); }`,
});
