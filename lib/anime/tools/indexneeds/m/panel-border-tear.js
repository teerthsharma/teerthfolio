import { defineModule } from "./define.js";

export const PANEL_BORDER_TEAR = defineModule({
  name: "panel-border-tear",
  doc: "manga panel border ripping: indigo frame, fibrous tear, under-plate peek, fwidth lips",
  glsl: /* glsl */ `
  vec3 panelBorderTear(vec2 p, float t) {
    vec3 under = mix(IM_MAG * 0.45, IM_CITRUS * 0.40, imAA(p.y, 0.50));
    vec3 plate = mix(vec3(0.78, 0.74, 0.68), vec3(0.88, 0.84, 0.78), imFbm(p * 6.0));
    float frame = max(imBox(p, vec2(0.72, 0.50), vec2(0.58, 0.40)), -imBox(p, vec2(0.72, 0.50), vec2(0.50, 0.32)));
    float n = (imVn(vec2(p.y * 18.0, 2.0)) - 0.5) * 0.10 + 0.03 * sin(p.y * 30.0 + t);
    float ripX = 0.78 + 0.08 * sin(t * 0.7);
    float rip = p.x - ripX - n;
    vec3 col = mix(under, plate, imAA(rip, 0.0));
    float fiber = imVn(vec2(p.y * 40.0, p.x * 8.0));
    col = mix(col, IM_PAPER_TOOTH, (1.0 - imAA(abs(rip), 0.03)) * fiber * 0.45);
    col = mix(col, IM_INK, imFill(frame) * 0.92);
    float lip = imLine(rip, 1.8);
    col = mix(col, IM_UMBER, lip * 0.55);
    float hatch = abs(fract((p.x + p.y) * 22.0) - 0.5);
    float hw = fwidth((p.x + p.y) * 22.0) + 1e-5;
    float tone = 1.0 - smoothstep(0.12 - hw, 0.12 + hw, hatch);
    return mix(col, IM_INK, tone * (1.0 - imFill(frame)) * imAA(rip, 0.0) * 0.18);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(panelBorderTear(p, t)); }`,
});
