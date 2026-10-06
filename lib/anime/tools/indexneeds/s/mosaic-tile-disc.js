import { defineModule } from "./define.js";

export default defineModule({
  name: "mosaic-tile-disc",
  doc: "rose-window mosaic: polar hex tiles inside a disc, gold grout, 3-stop glass plates — stained still, not a hash field",
  glsl: /* glsl */ `
  vec3 mosaicTileDisc(vec2 p, float t) {
    vec2 c = S_C;
    vec2 q = p - c;
    float r = length(q);
    vec2 hex = mat2(1.0, 0.0, 0.5, 0.866) * (q * 9.2);
    vec2 id = floor(hex);
    vec2 f = abs(fract(hex) - 0.5);
    float cell = max(f.x * 1.732, f.x + f.y * 0.577);
    float grout = sLine(cell - 0.42, 1.2);
    float h = sH21(id);
    vec3 glass = h < 0.33 ? vec3(0.220, 0.420, 0.620)
      : h < 0.66 ? vec3(0.620, 0.180, 0.220)
      : S_GOLD * 0.78;
    glass = mix(glass, S_CREAM, sAA(0.28 - r, 0.0) * 0.35);
    vec3 field = S_INDIGO;
    vec3 col = mix(field, glass, sFill(r - 0.30));
    col = mix(col, S_GOLD, grout * sFill(r - 0.29));
    col = mix(col, S_GOLD, sLine(r - 0.30, 2.2));
    col = mix(col, S_INK, sFill(r - 0.045));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return mosaicTileDisc(p, t); }`,
});
