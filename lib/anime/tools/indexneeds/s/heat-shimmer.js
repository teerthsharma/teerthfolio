import { defineModule } from "./define.js";

export default defineModule({
  name: "heat-shimmer",
  doc: "heat haze: vertical sine isolines on a 3-stop desert plate, warp amount falls with height — drawn waves, not noise",
  glsl: /* glsl */ `
  vec3 heatShimmer(vec2 p, float t) {
    float fall = smoothstep(0.85, 0.12, p.y);
    float wave = sin(p.x * 22.0 + t * 3.2 + p.y * 6.0) * 0.018 * fall;
    float y = p.y + wave;
    vec3 plate = sCel3(clamp(y, 0.0, 1.0), 0.28, 0.62,
      vec3(0.420, 0.180, 0.090),
      vec3(0.760, 0.460, 0.180),
      vec3(0.880, 0.700, 0.320));
    float iso = sLine(sin((p.x + wave * 8.0) * 18.0 + t * 2.4), 1.1) * fall;
    plate = mix(plate, S_CREAM, iso * 0.28);
    float ground = sFill(0.18 - p.y);
    plate = mix(plate, vec3(0.280, 0.140, 0.080), ground * 0.55);
    return sOut(plate);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return heatShimmer(p, t); }`,
});
