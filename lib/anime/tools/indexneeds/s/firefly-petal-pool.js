import { defineModule } from "./define.js";

export default defineModule({
  name: "firefly-petal-pool",
  doc: "night pool: dark water bands, six amber firefly discs, five teardrop petals — lantern still, not a sparkle hash",
  glsl: /* glsl */ `
  vec3 fireflyPetalPool(vec2 p, float t) {
    float band = sCelN(clamp(p.y, 0.0, 1.0), 4.0);
    vec3 water = mix(vec3(0.055, 0.070, 0.140), vec3(0.080, 0.140, 0.200), band);
    float rip = sLine(sin(p.x * 14.0 + t * 0.8) * 0.04 + p.y - 0.42, 1.4);
    water = mix(water, vec3(0.140, 0.220, 0.280), rip * 0.35);
    vec3 col = water;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 seat = fi < 1.0 ? vec2(0.28, 0.62) : fi < 2.0 ? vec2(0.48, 0.78)
        : fi < 3.0 ? vec2(0.72, 0.58) : fi < 4.0 ? vec2(0.88, 0.70)
        : fi < 5.0 ? vec2(0.38, 0.40) : vec2(0.64, 0.34);
      vec2 o = seat + vec2(0.012 * sin(t + fi), 0.010 * cos(t * 0.8 + fi));
      float d = length(p - o);
      float core = sFill(d - 0.012);
      float halo = exp(-d * d * 90.0);
      col = mix(col, vec3(0.860, 0.700, 0.220), halo * 0.55);
      col = mix(col, S_CREAM, core);
    }
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 o = vec2(0.22 + fi * 0.16, 0.22 + 0.04 * sin(t * 0.4 + fi));
      vec2 q = (p - o) * vec2(1.0, 1.55);
      float petal = length(q) - 0.028;
      col = mix(col, mix(vec3(0.820, 0.420, 0.480), S_PAPER, sAA(q.y, 0.0)), sFill(petal));
    }
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return fireflyPetalPool(p, t); }`,
});
