import { defineModule } from "./define.js";

export default defineModule({
  name: "crow-boid",
  doc: "Itachi murder: seven chevron crows in a V, shared heading, indigo sky — flock still, not a hashed field",
  glsl: /* glsl */ `
  vec3 crowBoid(vec2 p, float t) {
    vec3 col = mix(S_INDIGO, vec3(0.470, 0.075, 0.118), clamp(p.y * 0.45, 0.0, 1.0));
    vec2 head = normalize(vec2(-0.82, 0.18));
    float ang = atan(head.y, head.x);
    float ca = cos(ang), sa = sin(ang);
    mat2 rot = mat2(ca, -sa, sa, ca);
    vec2 lead = vec2(0.78, 0.56) + head * 0.04 * sin(t * 0.6);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float wing = fi < 1.0 ? 0.0 : (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
      float row = ceil(fi * 0.5);
      vec2 o = lead - head * (0.07 * row) + vec2(-head.y, head.x) * (0.055 * wing * row);
      vec2 q = rot * (p - o) * 9.2;
      float d = sCrow(q);
      col = mix(col, vec3(0.118, 0.062, 0.095), sFill(d));
    }
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return crowBoid(p, t); }`,
});
