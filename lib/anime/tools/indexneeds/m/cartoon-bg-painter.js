import { defineModule } from "./define.js";

export const CARTOON_BG_PAINTER = defineModule({
  name: "cartoon-bg-painter",
  doc: "Overlord cartoon bg: three painted flats, brushy horizon, warm cream field, ink iso-edge",
  glsl: /* glsl */ `
  vec3 cartoonBgPainter(vec2 p, float t) {
    float hold = imHold(t, 3.0);
    vec2 q = imWarp(p * 1.6, 0.08);
    float n = imFbm(q * 2.2 + hold * 0.05);
    vec3 sky = vec3(0.62, 0.78, 0.82);
    vec3 hill = vec3(0.42, 0.62, 0.38);
    vec3 dirt = vec3(0.70, 0.56, 0.36);
    float y = p.y + n * 0.06;
    vec3 col = mix(dirt, hill, imAA(y, 0.28));
    col = mix(col, sky, imAA(y, 0.52));
    float cloud = imFill(imEll(p, vec2(0.38, 0.72), vec2(0.22, 0.08))) + imFill(imEll(p, vec2(0.52, 0.76), vec2(0.16, 0.07)));
    col = mix(col, vec3(0.86, 0.84, 0.78), min(cloud, 1.0) * 0.80);
    float tree = imFill(imSeg(p, vec2(1.10, 0.18), vec2(1.10, 0.48), 0.018));
    tree = max(tree, imFill(imEll(p, vec2(1.10, 0.56), vec2(0.12, 0.14))));
    col = mix(col, vec3(0.28, 0.38, 0.22), tree * 0.88);
    float edge = 1.0 - smoothstep(0.0, fwidth(n) * 2.4 + 0.004, abs(n - 0.52));
    col = mix(col, IM_INK, edge * 0.22);
    float sun = imFill(length(p - vec2(1.18, 0.82)) - 0.07);
    return mix(col, vec3(0.88, 0.72, 0.38), sun * 0.70);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(cartoonBgPainter(p, t)); }`,
});
