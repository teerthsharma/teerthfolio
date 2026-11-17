// Grade family: violet-shadow cream-highlight split tone with haze, ink floor, luma cap and 2.39:1 bars; grain re-seeded on twos.
import { defineModule } from "./define.js";

const SKY = ["shinKit", "shinTwilightSky"];

export const GRADE = [
  defineModule({
    name: "shinGradeSplit",
    doc: "split-tone grade shadow #363852 to high #f1cdc2, violet horizon haze #c389b8, ink floor lift, luma cap 0.92, ink letterbox bars",
    deps: SKY,
    uniforms: () => ({ uShinTone: { value: 0.6 }, uShinHaze: { value: 0.5 }, uShinBars: { value: 0.165 } }),
    draws: "the whole frame leaning violet in the shadows and cream in the highlights, hazed at the horizon, never pure black and with warm-black letterbox bars.",
    use: "grade",
    params: "uShinTone: split-tone strength; uShinHaze: horizon haze amount; uShinBars: bar thickness as a fraction of frame height (0.165 is 2.39:1 at 16:10).",
    glsl: /* glsl */ `
uniform float uShinTone;
uniform float uShinHaze;
uniform float uShinBars;
vec3 shnGrade(vec3 c, vec2 p) {
  vec3 tint = mix(shnC(54.0, 56.0, 82.0), shnC(241.0, 205.0, 194.0), smoothstep(0.1, 0.6, shnLuma(c)));
  c = mix(c, c * tint / max(shnLuma(tint), 1e-3), uShinTone);
  c = mix(c, shnC(195.0, 137.0, 184.0), 0.35 * uShinHaze * exp(-abs(p.y - 0.30) / 0.12));
  c += SHN_INK * (1.0 - smoothstep(0.035, 0.08, shnLuma(c)));
  c = shnCap(c);
  return mix(c, SHN_INK, 1.0 - shnAA(abs(p.y - 0.5), 0.5 - uShinBars));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnGrade(shnSky(p, 0.0), p); }`,
  }),

  defineModule({
    name: "shinGrain",
    doc: "fine film grain 0.02 weighted by (1 - luma), re-seeded 12 times a second so it steps with the drawings",
    deps: SKY,
    uniforms: () => ({ uShinGrain: { value: 1 } }),
    draws: "fine grain that sits in the shadows and barely touches the highlights, changing on every second frame.",
    use: "grade",
    params: "uShinGrain: grain strength; the seed uniform offsets the pattern.",
    glsl: /* glsl */ `
uniform float uShinGrain;
vec3 shnGrain(vec3 c, vec2 p, float t) {
  float g = shnH(floor(p * 800.0) + floor(t * 12.0) * vec2(1.7, 9.2)) - 0.5;
  return shnCap(c + g * 0.04 * uShinGrain * (1.0 - shnLuma(c)));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnGrain(shnSky(p, 0.0) * 0.5, p, t); }`,
  }),
];
