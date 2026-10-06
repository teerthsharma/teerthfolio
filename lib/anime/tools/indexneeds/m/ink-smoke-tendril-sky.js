import { defineModule } from "./define.js";

export const INK_SMOKE_TENDRIL_SKY = defineModule({
  name: "ink-smoke-tendril-sky",
  doc: "ink-smoke tendril sky: dusk wash, dark filaments, Death Note ceiling, hold drift",
  glsl: /* glsl */ `
  vec3 inkSmokeTendrilSky(vec2 p, float t) {
    float hold = imHold(t, 4.0);
    vec3 sky = mix(vec3(0.42, 0.28, 0.24), vec3(0.12, 0.10, 0.20), imAA(p.y, 0.38));
    sky = mix(sky, IM_DUSK * 0.45, exp(-abs(p.y - 0.22) * 8.0) * 0.55);
    vec2 q = imWarp(p * vec2(1.6, 2.4) + vec2(hold * 0.06, 0.0), 0.22);
    float lane = abs(imFbm(q) - 0.50);
    float tendril = 1.0 - smoothstep(0.04, 0.12, lane);
    vec3 smoke = mix(IM_INK, vec3(0.18, 0.12, 0.16), imVn(q * 3.0));
    vec3 col = mix(sky, smoke, tendril * 0.78);
    float ribbon = abs(p.x - 0.62 - 0.10 * sin(p.y * 6.0 + hold) - 0.04 * imFbm(p * 5.0));
    col = mix(col, IM_INK, exp(-pow(ribbon / 0.035, 2.0)) * 0.65);
    float mote = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 s = vec2(0.20 + 0.90 * imH21(vec2(fi, 2.0)), 0.30 + 0.55 * imH21(vec2(fi, 5.0)));
      mote = max(mote, imFill(length(p - s) - 0.006));
    }
    return mix(col, vec3(0.62, 0.48, 0.40), mote * 0.40);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(inkSmokeTendrilSky(p, t)); }`,
});
