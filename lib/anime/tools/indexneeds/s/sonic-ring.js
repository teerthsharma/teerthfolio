import { defineModule } from "./define.js";

export default defineModule({
  name: "sonic-ring",
  doc: "sonic boom: three expanding ellipses from a point, cream/cyan rims on indigo — shock still, not a ripple texture",
  glsl: /* glsl */ `
  vec3 sonicRing(vec2 p, float t) {
    vec2 c = vec2(0.68, 0.48);
    vec2 q = (p - c) / vec2(1.15, 0.72);
    float r = length(q);
    vec3 col = mix(S_INDIGO, S_VOID, clamp(p.y * 0.6, 0.0, 1.0));
    float pulse = fract(t * 0.35);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float r0 = 0.10 + 0.12 * fi + pulse * 0.08;
      float ring = sLine(r - r0, 2.2 - 0.4 * fi);
      float fade = 1.0 - fi * 0.22;
      vec3 rim = mix(vec3(0.420, 0.780, 0.860), S_CREAM, 1.0 - fi * 0.35);
      col = mix(col, rim, ring * fade);
    }
    col = mix(col, S_CREAM, sFill(r - 0.028) * 0.7);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return sonicRing(p, t); }`,
});
