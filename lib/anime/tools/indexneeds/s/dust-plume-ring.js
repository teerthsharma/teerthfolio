import { defineModule } from "./define.js";

export default defineModule({
  name: "dust-plume-ring",
  doc: "titan footfall plume: annular cloud of six blobs, umber/cream 3-stop, hollow core — mushroom ring still",
  glsl: /* glsl */ `
  vec3 dustPlumeRing(vec2 p, float t) {
    vec2 c = vec2(0.72, 0.38);
    vec3 field = mix(vec3(0.220, 0.140, 0.100), S_VOID, clamp(p.y, 0.0, 1.0));
    float plume = 8.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float a = fi * 1.0471976 + 0.15;
      vec2 o = c + vec2(cos(a), sin(a) * 0.55) * 0.18;
      float rad = 0.085 + 0.018 * sin(fi * 2.1 + t * 0.4);
      plume = min(plume, length((p - o) / vec2(1.15, 0.72)) - rad);
    }
    float hole = length((p - c) / vec2(1.2, 0.7)) - 0.08;
    float body = max(plume, -hole);
    vec3 dust = sCel3(clamp(p.y + 0.2, 0.0, 1.0), 0.32, 0.64,
      vec3(0.280, 0.160, 0.090),
      vec3(0.560, 0.400, 0.220),
      S_CREAM);
    vec3 col = mix(field, dust, sFill(body));
    col = mix(col, S_UMBER, sLine(body, 1.6) * 0.55);
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return dustPlumeRing(p, t); }`,
});
