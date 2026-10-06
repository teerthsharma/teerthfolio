import { defineModule } from "./define.js";

export const COMET_RAINBOW_TAIL = defineModule({
  name: "comet-rainbow-tail",
  doc: "comet with prism rainbow tail: nucleus, ion blue, dust gold, spectral sheets",
  glsl: /* glsl */ `
  vec3 cometRainbowTail(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec3 sky = mix(IM_VOID, vec3(0.08, 0.10, 0.24), imAA(p.y, 0.40));
    vec2 n = vec2(1.05, 0.70);
    vec2 dir = normalize(vec2(-0.86, -0.28));
    vec3 col = sky;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float u = fi / 6.0;
      vec2 q = n + dir * (0.08 + 0.70 * u) + vec2(0.0, 0.04 * sin(u * 5.0 + hold));
      float w = 0.010 + 0.055 * u;
      float sheet = exp(-pow(length(p - q) / w, 2.0)) * (1.0 - u);
      vec3 prism = i < 2 ? vec3(0.70, 0.22, 0.28) : i < 4 ? vec3(0.78, 0.62, 0.20) : i < 5 ? vec3(0.22, 0.62, 0.36) : IM_COLD;
      col += prism * sheet * 0.22;
    }
    vec2 ab = dir * 0.72;
    float uu = clamp(dot(p - n, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
    float ion = exp(-pow(length(p - n - ab * uu) / (0.012 + 0.04 * uu), 2.0)) * (1.0 - uu);
    col += IM_COLD * ion * 0.40;
    float coma = exp(-length(p - n) * 16.0);
    col += IM_MOON * coma * 0.55;
    col += IM_GOLD * imFill(length(p - n) - 0.014) * 0.70;
    vec2 gv = floor(p * 18.0);
    col += IM_MOON * pow(imH21(gv), 10.0) * 0.35;
    return col;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(cometRainbowTail(p, t)); }`,
});
