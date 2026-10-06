import { defineModule } from "./define.js";

export const MIRROR_WATER_PLANE = defineModule({
  name: "mirror-water-plane",
  doc: "still mirror water: sky reflection, one ripple ring, Schlick chip, never crushed well",
  glsl: /* glsl */ `
  vec3 mirrorWaterPlane(vec2 p, float t) {
    float hold = imHold(t, 6.0);
    float line = 0.42;
    vec3 sky = mix(IM_WINTER, vec3(0.86, 0.70, 0.48), imAA(p.y, 0.62));
    float sun = imFill(length(p - vec2(1.08, 0.78)) - 0.06);
    sky = mix(sky, vec3(0.88, 0.74, 0.42), sun * 0.65);
    if (p.y < line) {
      vec2 m = vec2(p.x, 2.0 * line - p.y);
      float rip = 0.012 * sin(length(m - vec2(0.70, 0.55)) * 28.0 - hold * 4.0);
      m.x += rip;
      vec3 ref = mix(IM_WINTER, vec3(0.86, 0.70, 0.48), imAA(m.y, 0.62));
      ref = mix(ref, vec3(0.88, 0.74, 0.42), imFill(length(m - vec2(1.08, 0.78)) - 0.06) * 0.65);
      float ndv = clamp((line - p.y) * 3.4, 0.0, 1.0);
      float F = 0.04 + 0.92 * pow(1.0 - ndv, 5.0);
      vec3 body = vec3(0.12, 0.28, 0.40);
      vec3 col = mix(body, ref, F);
      float band = imVenetian(vec2(p.x, p.y * 0.4 + hold * 0.02), 22.0);
      col = mix(col, col * vec3(0.90, 0.96, 1.02), band * 0.18);
      return mix(col, IM_INK, imLine(p.y - line, 1.4) * 0.25);
    }
    return sky;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(mirrorWaterPlane(p, t)); }`,
});
