import { defineModule } from "./define.js";

export const RUIN_KIT = defineModule({
  name: "ruin-kit",
  doc: "stone ruin kit: broken columns, ivy hatch, warm dusk grade, crumbled plinth",
  glsl: /* glsl */ `
  vec3 ruinKit(vec2 p, float t) {
    vec3 sky = mix(IM_DUSK, vec3(0.42, 0.28, 0.36), imAA(p.y, 0.55));
    sky = mix(sky, vec3(0.22, 0.18, 0.28), imAA(p.y, 0.78));
    float ground = 1.0 - imAA(p.y, 0.24);
    vec3 dirt = mix(vec3(0.36, 0.26, 0.18), vec3(0.50, 0.38, 0.24), imFbm(p * 4.0));
    vec3 col = mix(sky, dirt, ground);
    float colA = imBox(p, vec2(0.38, 0.42), vec2(0.055, 0.28));
    float breakA = imBox(p, vec2(0.40, 0.62), vec2(0.07, 0.06));
    float shaftA = max(colA, -breakA);
    float colB = imBox(p, vec2(0.92, 0.40), vec2(0.050, 0.26));
    float capB = imBox(p, vec2(0.92, 0.68), vec2(0.08, 0.03));
    float stone = min(shaftA, min(colB, capB));
    vec3 rock = mix(vec3(0.48, 0.40, 0.34), vec3(0.62, 0.52, 0.42), imAA(imFbm(p * 7.0), 0.48));
    col = mix(col, rock, imFill(stone));
    col = mix(col, IM_INK, imLine(stone, 1.6) * 0.50);
    float ivy = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 a = vec2(0.38 + 0.02 * sin(fi), 0.20 + fi * 0.08);
      vec2 b = a + vec2(0.06 * sin(fi * 1.7), 0.10);
      ivy = max(ivy, imFill(imSeg(p, a, b, 0.008)));
    }
    col = mix(col, vec3(0.22, 0.36, 0.18), ivy * 0.75);
    float hatch = abs(fract((p.x + p.y) * 16.0) - 0.5);
    float hw = fwidth((p.x + p.y) * 16.0) + 1e-5;
    float tone = 1.0 - smoothstep(0.14 - hw, 0.14 + hw, hatch);
    return mix(col, IM_UMBER, tone * imFill(stone) * 0.22);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(ruinKit(p, t)); }`,
});
