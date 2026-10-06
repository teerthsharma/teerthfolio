import { defineModule } from "./define.js";

export const FIRE_SHEET = defineModule({
  name: "fire-sheet",
  doc: "cel fire wall: pointed tongues, 3 hard bands, punched holes, sway redrawn on twos",
  glsl: /* glsl */ `
  vec3 fireSheet(vec2 p, float t) {
    float dr = imHold(t, 12.0);
    vec3 bg = mix(vec3(0.16, 0.06, 0.06), IM_VOID, imAA(p.y, 0.62));
    float y0 = 0.06;
    float y = p.y - y0;
    float x = p.x + sin(dr * 2.0 + p.x * 4.0) * 0.03 * max(y, 0.0);
    float H = 0.48 * (0.45 + 0.40 * imVn(vec2(x * 3.0, 1.0)) + 0.72 * pow(imVn(vec2(x * 14.0 + dr * 0.37, 7.0)), 3.0));
    float v = 1.0 - y / max(H, 1e-4);
    float px = fwidth(v) + 1e-5;
    vec3 col = mix(IM_FIRE_EDGE, IM_FIRE_MID, smoothstep(0.25 - px, 0.25 + px, v));
    col = mix(col, IM_FIRE_CORE, smoothstep(0.62 - px, 0.62 + px, v));
    vec2 w = imVor(vec2(x * 9.0, y * 6.0 - dr * 4.0));
    float hole = (1.0 - smoothstep(0.22, 0.22 + fwidth(w.x) * 1.5, w.x)) * step(0.30, v) * step(v, 0.80);
    col = mix(col, IM_FIRE_HOLE, hole);
    float a = smoothstep(-px, px, v) * imAA(y + 0.02, 0.0);
    return mix(bg, col, a);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(fireSheet(p, t)); }`,
});
