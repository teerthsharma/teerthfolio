import { defineModule } from "./define.js";

export default defineModule({
  name: "smear-frame",
  doc: "sakuga smear: disc minus shifted disc plus two ghost offsets along a heading — drawn still, not a blur kernel",
  glsl: /* glsl */ `
  vec3 smearFrame(vec2 p, float t) {
    vec2 c = S_C;
    vec2 dir = vec2(-0.42, 0.08);
    vec2 q = (p - c) * 2.15;
    float lens = sFill(sDisc(q, 1.0)) * (1.0 - sFill(sDisc(q - dir * 1.05, 1.02)));
    vec3 field = mix(S_VOID, S_INDIGO, clamp(p.y, 0.0, 1.0));
    vec3 body = mix(S_MAG, S_CITRUS, sAA(q.x, 0.0));
    vec3 col = mix(field, body, lens);
    for (int k = 1; k <= 2; k++) {
      float fk = float(k);
      vec2 g = q + dir * (0.55 * fk);
      float ghost = sFill(sDisc(g, 0.82 - 0.12 * fk)) * (1.0 - sFill(sDisc(g - dir * 0.9, 0.86)));
      col = mix(col, mix(S_MAG, S_CREAM, 0.35 * fk), ghost * (0.55 - 0.16 * fk));
    }
    col = mix(col, S_INK, sLine(sDisc(q, 1.0), 1.5) * lens);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return smearFrame(p, t); }`,
});
