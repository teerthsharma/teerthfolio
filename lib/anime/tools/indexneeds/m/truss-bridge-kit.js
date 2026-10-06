import { defineModule } from "./define.js";

export const TRUSS_BRIDGE_KIT = defineModule({
  name: "truss-bridge-kit",
  doc: "steel truss bridge kit: beams, diagonals, rivet ticks, dusk river, fwidth members",
  glsl: /* glsl */ `
  vec3 trussBridgeKit(vec2 p, float t) {
    vec3 sky = mix(IM_DUSK * 0.70, vec3(0.22, 0.24, 0.36), imAA(p.y, 0.50));
    float water = 1.0 - imAA(p.y, 0.22);
    vec3 col = mix(sky, vec3(0.14, 0.22, 0.32), water);
    float deck = imFill(imBox(p, vec2(0.72, 0.36), vec2(0.70, 0.016)));
    col = mix(col, vec3(0.32, 0.22, 0.18), deck);
    float steel = 1e2;
    for (int i = 0; i < 7; i++) {
      float x = 0.12 + float(i) * 0.20;
      steel = min(steel, imSeg(p, vec2(x, 0.36), vec2(x, 0.62), 0.008));
      if (i < 6) {
        steel = min(steel, imSeg(p, vec2(x, 0.36), vec2(x + 0.20, 0.62), 0.006));
        steel = min(steel, imSeg(p, vec2(x, 0.62), vec2(x + 0.20, 0.36), 0.006));
        steel = min(steel, imSeg(p, vec2(x, 0.62), vec2(x + 0.20, 0.62), 0.007));
      }
    }
    vec3 iron = mix(vec3(0.28, 0.22, 0.20), vec3(0.48, 0.36, 0.28), imAA(p.y, 0.50));
    col = mix(col, iron, imFill(steel));
    col = mix(col, IM_INK, imLine(steel, 1.5) * 0.45);
    float rivet = 0.0;
    for (int j = 0; j < 6; j++) {
      float x = 0.22 + float(j) * 0.20;
      rivet = max(rivet, imFill(length(p - vec2(x, 0.62)) - 0.008));
    }
    col = mix(col, IM_GOLD_BODY, rivet * 0.70);
    float pier = imFill(imBox(p, vec2(0.32, 0.20), vec2(0.04, 0.16))) + imFill(imBox(p, vec2(1.10, 0.20), vec2(0.04, 0.16)));
    return mix(col, IM_UMBER, min(pier, 1.0) * 0.85);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(trussBridgeKit(p, t)); }`,
});
