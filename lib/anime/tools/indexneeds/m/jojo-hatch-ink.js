import { defineModule } from "./define.js";

export const JOJO_HATCH_INK = defineModule({
  name: "jojo-hatch-ink",
  doc: "Araki hatch + indigo ink: diagonal screentone, hard cut, cream paper, never crushed black",
  glsl: /* glsl */ `
  vec3 jojoHatchInk(vec2 p, float t) {
    vec3 paper = mix(vec3(0.86, 0.82, 0.74), vec3(0.78, 0.72, 0.64), imFbm(p * 5.0));
    float cut = dot(p, vec2(0.83, -0.56)) * 3.0;
    float fs = fract(cut);
    float w = fwidth(cut) + 1e-5;
    float band = clamp(min(fs - 0.64, 1.0 - fs) / w + 0.5, 0.0, 1.0);
    vec3 col = mix(paper, vec3(0.22, 0.10, 0.28), band * 0.55);
    float fig = imEll(p, vec2(0.72, 0.48), vec2(0.16, 0.28));
    col = mix(col, vec3(0.62, 0.28, 0.22), imFill(fig) * 0.85);
    float h = (p.x - p.y) * 36.0;
    float g = min(fract(h), 1.0 - fract(h));
    float hw = fwidth(h) + 1e-5;
    float hatch = 1.0 - smoothstep(0.08 - hw, 0.14 + hw, g);
    float shade = imFill(fig + 0.02) * (1.0 - imAA(p.x, 0.70));
    col = mix(col, IM_INK, hatch * shade * 0.70);
    float sil = imLine(fig, 2.2);
    col = mix(col, IM_INK, sil * 0.88);
    float speed = abs(fract((p.y * 1.2 - p.x) * 18.0) - 0.5);
    float sw = fwidth((p.y * 1.2 - p.x) * 18.0) + 1e-5;
    float line = 1.0 - smoothstep(0.06 - sw, 0.06 + sw, speed);
    return mix(col, IM_INK, line * (1.0 - imFill(fig)) * imAA(p.x, 0.95) * 0.35);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(jojoHatchInk(p, t)); }`,
});
