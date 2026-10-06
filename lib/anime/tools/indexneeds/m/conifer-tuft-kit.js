import { defineModule } from "./define.js";

export const CONIFER_TUFT_KIT = defineModule({
  name: "conifer-tuft-kit",
  doc: "conifer tuft kit: carded needle fans, trunk, snow tooth, Vinland forest plate",
  glsl: /* glsl */ `
  vec3 coniferTuftKit(vec2 p, float t) {
    vec3 sky = mix(IM_WINTER * 0.70, vec3(0.42, 0.52, 0.62), imAA(p.y, 0.55));
    float ground = 1.0 - imAA(p.y, 0.22);
    vec3 snow = mix(vec3(0.78, 0.80, 0.82), vec3(0.62, 0.66, 0.72), imFbm(p * 6.0));
    vec3 col = mix(sky, snow, ground);
    float trunk = imFill(imSeg(p, vec2(0.70, 0.10), vec2(0.70, 0.38), 0.018));
    col = mix(col, IM_BEECH_DARK, trunk);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float y = 0.30 + fi * 0.10;
      float w = 0.22 - fi * 0.028;
      vec2 a = vec2(0.70 - w, y);
      vec2 b = vec2(0.70 + w, y);
      vec2 tip = vec2(0.70, y + 0.12);
      float fan = imFill(imSeg(p, a, tip, 0.010));
      fan = max(fan, imFill(imSeg(p, b, tip, 0.010)));
      fan = max(fan, imFill(imSeg(p, a, b, 0.008)));
      vec3 needle = mix(vec3(0.14, 0.26, 0.18), vec3(0.22, 0.38, 0.24), imAA(fi, 3.0));
      col = mix(col, needle, fan * 0.88);
      float frost = imFill(imSeg(p, mix(a, tip, 0.7), mix(b, tip, 0.7), 0.006));
      col = mix(col, vec3(0.80, 0.82, 0.84), frost * 0.45);
    }
    col = mix(col, IM_INK, imLine(imSeg(p, vec2(0.70, 0.10), vec2(0.70, 0.38), 0.018), 1.4) * 0.35);
    return mix(col, vec3(0.82, 0.84, 0.86), imVn(p * 50.0) * ground * 0.10);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(coniferTuftKit(p, t)); }`,
});
