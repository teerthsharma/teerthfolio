import { defineModule } from "./define.js";

export const PUNCH = [
  defineModule({
    name: "impact-frame",
    family: "fx",
    doc: "scene-trigger impact frame: posterize invert, 8-point burst, flash disc, ink ticks — luma still capped",
    glsl: /* glsl */ `
  vec3 impactFrame(vec2 p, float t) {
    float trig = pow(max(sin(t * 5.2), 0.0), 10.0);
    vec3 plate = mix(ixPaper(p) * 0.55, ixCel3(ixFbm(p * 4.0 + t * 0.1), IX_FILL, IX_MID, IX_KEY), 0.65);
    float seat = length(p - vec2(0.72, 0.48));
    vec3 inv = vec3(0.90) - plate * 0.85;
    inv = ixCel3(ixLuma(inv), IX_INK * 2.2, vec3(0.42, 0.18, 0.22), IX_CREAM * 0.88);
    vec3 col = mix(plate, inv, trig);
    float star = ixFill(ixStar(p - vec2(0.72, 0.48), 8.0, 0.22 + 0.10 * trig, 0.22));
    col = mix(col, IX_BEAM * 0.85, star * trig);
    float flash = exp(-seat * seat * 18.0) * trig;
    col = mix(col, IX_CREAM * 0.90, flash * 0.55);
    float ring = ixLine(seat - 0.16 - 0.12 * trig, 1.6);
    col = mix(col, IX_GOLD, ring * trig);
    vec2 pol = ixPolar(p, vec2(0.72, 0.48));
    float bin = floor((pol.y / 6.2831853 + 0.5) * 36.0);
    float tick = ixFill(fract((pol.y / 6.2831853 + 0.5) * 36.0) - 0.78)
               * step(0.45, ixH21(vec2(bin, 3.0)))
               * ixBand(pol.x, 0.20, 0.55);
    col = mix(col, IX_INK, tick * trig);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return impactFrame(p, t); }`,
  }),

  defineModule({
    name: "speed-lines",
    family: "fx",
    doc: "radial sakuga speedlines: hashed polar bins, taper from a focus hole, indigo ink on the plate",
    glsl: /* glsl */ `
  vec3 speedLines(vec2 p, float t, vec3 plate) {
    vec2 c = vec2(0.72, 0.48);
    vec2 q = p - c;
    float a = atan(q.y, q.x) / 6.2831853 + 0.5;
    float r = length(q);
    float seed = 4.0 + ixHold(t, 12.0) * 0.01;
    float bin = floor(a * 150.0);
    float rnd = ixH21(vec2(bin, seed));
    float w = 0.28 + 0.22 * rnd;
    float line = ixAA(fract(a * 150.0), 1.0 - w);
    float hole = 0.10;
    float vis = smoothstep(hole, hole + 0.16, r) * (1.0 - smoothstep(0.78, 1.05, r));
    float dash = step(0.38, rnd);
    return mix(plate, IX_INK, line * vis * dash);
  }
  vec3 speedLinesDemo(vec2 p, float t) {
    vec3 plate = mix(ixSky(p), ixPaper(p) * 0.5, 0.35 + 0.2 * ixFbm(p * 3.0));
    return ixOut(speedLines(p, t, plate));
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return speedLinesDemo(p, t); }`,
  }),
];
