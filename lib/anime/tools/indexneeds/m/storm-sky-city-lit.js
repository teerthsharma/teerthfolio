import { defineModule } from "./define.js";

export const STORM_SKY_CITY_LIT = defineModule({
  name: "storm-sky-city-lit",
  doc: "storm sky over a lit city: sheared cloud deck, window cells, one lightning sheet hold",
  glsl: /* glsl */ `
  vec3 stormSkyCityLit(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec2 s = vec2(p.x * 2.4 + p.y * 3.2, p.y * 7.0 - p.x * 1.1 + hold * 0.04);
    float n = imFbm(s);
    vec3 sky = mix(vec3(0.14, 0.12, 0.22), vec3(0.28, 0.22, 0.30), imAA(p.y, 0.55));
    float cl = imAA(n, 0.56);
    vec3 col = mix(sky, sky * 0.42 + IM_INK * 0.40, cl * 0.85);
    float edge = 1.0 - smoothstep(0.0, fwidth(n) * 2.2 + 0.004, abs(n - 0.56));
    col = mix(col, IM_INK, edge * 0.70);
    float flash = step(0.92, imH21(vec2(floor(hold), 4.0)));
    col = mix(col, vec3(0.62, 0.68, 0.78), flash * (1.0 - cl) * 0.35);
    float horizon = 1.0 - imAA(p.y, 0.32);
    vec3 city = vec3(0.12, 0.10, 0.16);
    vec2 cell = vec2(p.x * 18.0, p.y * 14.0);
    vec2 fw = fwidth(cell) + 1e-5;
    vec2 a = abs(fract(cell) - 0.5) / fw;
    float win = (1.0 - smoothstep(0.4, 1.4, min(a.x, a.y))) * step(imH21(floor(cell)), 0.35);
    city = mix(city, vec3(0.72, 0.58, 0.28), win * 0.70);
    float tower = step(abs(fract(p.x * 8.0) - 0.5), 0.08) * imBand(p.y, 0.18, 0.40);
    city = mix(city, IM_INK * 2.0, tower * 0.55);
    return mix(col, city, horizon * 0.92);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(stormSkyCityLit(p, t)); }`,
});
