import { defineModule } from "./define.js";

export default defineModule({
  name: "comic-lettering-sfx",
  doc: "JoJo SFX burst: rounded burst disc, gold fill, ink outline, four block bars — DON still, not boiled cells",
  glsl: /* glsl */ `
  vec3 comicLetteringSfx(vec2 p, float t) {
    vec2 q = p - vec2(0.72, 0.50);
    float burst = length(q / vec2(0.26, 0.18)) - 1.0;
    vec3 field = vec3(0.227, 0.102, 0.227);
    vec3 fill = mix(S_MAG, sGold(vec3(0.60, 0.42, 0.12)), sFill(burst + 0.05));
    vec3 col = mix(field, fill, sFill(burst + 0.08));
    col = mix(col, S_INK, sLine(burst, 2.4));
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 b = q - vec2(-0.14 + fi * 0.10, 0.0);
      b.x += b.y * 0.08;
      float d = sBox(b, vec2(0.032, 0.055));
      col = mix(col, S_CREAM, sFill(d));
      col = mix(col, S_INK, sLine(d, 1.6));
    }
    col = mix(col, S_INK, sFill(length(q - vec2(0.22, 0.12)) - 0.028));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return comicLetteringSfx(p, t); }`,
});
