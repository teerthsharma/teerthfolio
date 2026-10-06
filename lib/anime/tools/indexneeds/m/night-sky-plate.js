import { defineModule } from "./define.js";

export const NIGHT_SKY_PLATE = defineModule({
  name: "night-sky-plate",
  doc: "night sky plate: sodium horizon, one moon disc, sparse hashed stars, indigo void",
  glsl: /* glsl */ `
  vec3 nightSkyPlate(vec2 p, float t) {
    vec3 sky = mix(vec3(0.12, 0.07, 0.05), IM_VOID, imAA(p.y, 0.22));
    sky += vec3(0.42, 0.22, 0.06) * exp(-abs(p.y - 0.16) * 14.0) * 0.45;
    vec2 m = p - vec2(1.05, 0.72);
    float r = length(m);
    float mu = sqrt(max(0.0, 1.0 - (r / 0.07) * (r / 0.07)));
    sky = mix(sky, IM_MOON * (0.28 + 0.50 * pow(mu, 0.55)), imFill(r - 0.07));
    sky = mix(sky, IM_INK, imLine(r - 0.07, 1.3) * 0.25);
    vec2 gv = floor(p * 20.0);
    float star = pow(imH21(gv), 8.0) * imFill(length(fract(p * 20.0) - 0.5) - 0.03);
    sky += IM_COLD * star * 0.50;
    float hold = imHold(t, 2.0);
    float tw = step(0.55, imH21(gv + hold));
    return mix(sky, sky + IM_MOON * 0.08, star * tw * 0.6);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(nightSkyPlate(p, t)); }`,
});
