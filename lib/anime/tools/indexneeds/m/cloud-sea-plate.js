import { defineModule } from "./define.js";

export const CLOUD_SEA_PLATE = defineModule({
  name: "cloud-sea-plate",
  doc: "painted cloud sea: stacked cumulus plates, Your Name / DBS deck, value bands not hue stripes",
  glsl: /* glsl */ `
  vec3 cloudSeaPlate(vec2 p, float t) {
    float hold = imHold(t, 3.0);
    vec3 sky = mix(vec3(0.42, 0.58, 0.78), vec3(0.72, 0.56, 0.48), imAA(p.y, 0.28));
    sky = mix(sky, vec3(0.22, 0.28, 0.48), imAA(p.y, 0.70));
    vec3 col = sky;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float y0 = 0.18 + fi * 0.12;
      vec2 q = imWarp(vec2(p.x * (1.4 + fi * 0.15) + hold * 0.03 * (fi + 1.0), (p.y - y0) * 3.2), 0.12);
      float n = imFbm(q * 2.0);
      float band = imFill((p.y - y0) - 0.10 * (n - 0.35));
      float top = 1.0 - imAA(p.y, y0 + 0.16);
      vec3 plate = mix(vec3(0.78, 0.76, 0.74), vec3(0.62, 0.64, 0.70), imAA(n, 0.55));
      plate = mix(plate, vec3(0.86, 0.72, 0.58), (1.0 - imAA(p.y, 0.36)) * 0.35);
      col = mix(col, plate, band * top * 0.78);
      float edge = 1.0 - smoothstep(0.0, fwidth(n) * 2.0 + 0.004, abs(n - 0.50));
      col = mix(col, IM_INK, edge * band * top * 0.18);
    }
    return col;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(cloudSeaPlate(p, t)); }`,
});
