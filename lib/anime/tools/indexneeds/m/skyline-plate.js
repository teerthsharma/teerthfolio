import { defineModule } from "./define.js";

export const SKYLINE_PLATE = defineModule({
  name: "skyline-plate",
  doc: "skyline plate: building silhouettes, window cells, dusk grade, fwidth roofs",
  glsl: /* glsl */ `
  vec3 skylinePlate(vec2 p, float t) {
    vec3 sky = mix(IM_DUSK, IM_DUSK_PINK, imAA(p.y, 0.40));
    sky = mix(sky, vec3(0.18, 0.14, 0.28), imAA(p.y, 0.62));
    float sun = imFill(length(p - vec2(1.12, 0.58)) - 0.08);
    sky = mix(sky, vec3(0.88, 0.62, 0.32), sun * 0.60);
    float h = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float x = 0.08 + fi * 0.17;
      float ht = 0.18 + 0.28 * imH21(vec2(fi, 2.0));
      float w = 0.055 + 0.03 * imH21(vec2(fi, 4.0));
      h = max(h, imFill(imBox(p, vec2(x, ht * 0.5), vec2(w, ht * 0.5))));
    }
    vec3 bldg = vec3(0.12, 0.10, 0.16);
    vec2 cell = vec2(p.x * 22.0, p.y * 16.0);
    float win = step(0.22, imH21(floor(cell))) * imFill(imBox(fract(cell), vec2(0.5), vec2(0.22, 0.18)));
    bldg = mix(bldg, vec3(0.74, 0.58, 0.28), win * h * 0.75);
    vec3 col = mix(sky, bldg, h);
    return mix(col, IM_INK, imLine(p.y - 0.02, 1.5) * 0.20);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(skylinePlate(p, t)); }`,
});
