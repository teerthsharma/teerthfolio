import { defineModule } from "./define.js";

export const MOUNTAIN = [
  defineModule({
    name: "painted-mountain-plate",
    family: "world",
    doc: "painted mountain bg plate: layered ridge washes, ink pine tufts, sky grade — ukiyo / anime still, not photo",
    glsl: /* glsl */ `
  float ixRidgeLine(vec2 p, float seed, float y0, float amp) {
    float n = ixFbm(vec2(p.x * 2.4 + seed, seed * 3.0));
    float n2 = ixVn(vec2(p.x * 6.0 + seed, 2.0)) * 0.25;
    return p.y - (y0 + amp * n + n2 * amp);
  }
  vec3 paintedMountainPlate(vec2 p, float t) {
    float hold = ixHold(t, 2.0);
    vec3 sky = mix(vec3(0.42, 0.52, 0.68), vec3(0.78, 0.62, 0.48), ixAA(p.y, 0.55));
    sky = mix(sky, vec3(0.72, 0.48, 0.42), ixAA(p.y, 0.78) * 0.45);
    vec3 col = sky;
    vec3 far = vec3(0.36, 0.40, 0.52);
    vec3 mid = vec3(0.28, 0.34, 0.32);
    vec3 near = vec3(0.18, 0.24, 0.20);
    vec3 rock = vec3(0.32, 0.26, 0.22);
    float r0 = ixRidgeLine(p, 1.2, 0.58, 0.14);
    float r1 = ixRidgeLine(p, 4.8, 0.44, 0.16);
    float r2 = ixRidgeLine(p, 8.1, 0.30, 0.12);
    col = mix(col, far, ixFill(r0) * 0.85);
    col = mix(col, mix(mid, rock, ixFbm(p * 3.0 + 2.0) * 0.45), ixFill(r1));
    col = mix(col, mix(near, rock * 0.8, ixFbm(p * 5.0) * 0.4), ixFill(r2));
    col = mix(col, IX_INK, ixLine(r0, 1.2) * 0.35);
    col = mix(col, IX_INK, ixLine(r1, 1.3) * 0.45);
    col = mix(col, IX_INK, ixLine(r2, 1.4) * 0.55);
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float x = 0.08 + fi * 0.16 + 0.03 * ixH21(vec2(fi, 5.0));
      float y = 0.22 + 0.04 * ixH21(vec2(fi, 8.0));
      vec2 q = p - vec2(x, y);
      float tree = max(abs(q.x) * 2.4 + q.y * 0.9 - 0.08, -q.y - 0.02);
      tree = max(tree, q.y - 0.12);
      float trunk = ixBox(p, vec2(x, y - 0.02), vec2(0.008, 0.03));
      col = mix(col, vec3(0.14, 0.18, 0.14), ixFill(tree) * ixFill(0.36 - p.y + 0.1));
      col = mix(col, IX_INK, ixFill(trunk));
    }
    float mist = ixFbm(vec2(p.x * 1.5 + hold * 0.05, p.y * 3.0));
    col = mix(col, IX_CREAM * 0.55, mist * ixBand(p.y, 0.28, 0.50) * 0.28);
    col += (ixH21(floor(p * 64.0 + hold)) - 0.5) * 0.012;
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return paintedMountainPlate(p, t); }`,
  }),
];
