import { defineModule } from "./define.js";

export const FIELD_LINES = defineModule({
  name: "field-lines",
  doc: "electromagnetic field lines: dipole stream, teal/amber, Accelerator/Railgun, fwidth threads",
  glsl: /* glsl */ `
  vec3 fieldLines(vec2 p, float t) {
    float hold = imHold(t, 10.0);
    vec3 bg = mix(vec3(0.10, 0.12, 0.22), vec3(0.18, 0.16, 0.28), imAA(p.y, 0.50));
    vec2 a = vec2(0.42, 0.48);
    vec2 b = vec2(0.98, 0.52);
    vec3 col = bg;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float k = (fi - 4.0) * 0.07;
      vec2 n = normalize(b - a);
      vec2 prp = vec2(-n.y, n.x);
      vec2 c1 = mix(a, b, 0.35) + prp * k * 1.6;
      vec2 c2 = mix(a, b, 0.70) + prp * k * 1.2;
      float d = imSeg(p, a, c1, 0.004);
      d = min(d, imSeg(p, c1, c2, 0.004));
      d = min(d, imSeg(p, c2, b, 0.004));
      float pulse = 0.55 + 0.45 * step(fract(hold * 0.4 + fi * 0.11), 0.55);
      vec3 thread = mix(IM_TEAL, IM_GOLD, imAA(abs(k), 0.04));
      col = mix(col, thread, imFill(d) * pulse * 0.80);
    }
    col = mix(col, IM_GOLD, imFill(length(p - a) - 0.028));
    col = mix(col, IM_COLD, imFill(length(p - b) - 0.022));
    return mix(col, IM_INK, (imLine(length(p - a) - 0.028, 1.4) + imLine(length(p - b) - 0.022, 1.4)) * 0.40);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(fieldLines(p, t)); }`,
});
