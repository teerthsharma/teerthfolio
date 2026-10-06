import { defineModule } from "./define.js";

export const PORTAL_RING = defineModule({
  name: "portal-ring",
  doc: "Gate of Babylon portal: gold concentric rings, rippled rim, warped violet well, hold on twos",
  glsl: /* glsl */ `
  vec3 portalRing(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec2 c = vec2(0.62, 0.52);
    vec2 q = p - c;
    float r = length(q);
    float ang = atan(q.y, q.x);
    float ripple = 0.012 * sin(ang * 14.0 + hold * 3.2) * imFbm(q * 6.0 + hold);
    float R = 0.28 + ripple;
    vec3 sky = mix(IM_VOID, IM_ORCH * 0.55, imAA(p.y, 0.35));
    float well = imFill(r - (R * 0.86));
    vec2 wq = q * (1.0 + 0.18 * (1.0 - r / max(R, 1e-4)));
    float swirl = imFbm(vec2(atan(wq.y, wq.x) * 1.2, length(wq) * 5.0 - hold * 0.4));
    vec3 hole = mix(IM_VOID, mix(IM_ORCH, IM_GOLD_BODY, swirl), swirl * 0.55);
    vec3 col = mix(sky, hole, well * 0.96);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float rr = R * (0.52 + fi * 0.10);
      float band = imFill(imRing(r, rr, 0.007 + 0.003 * step(mod(fi, 2.0), 0.5)));
      vec3 plate = mix(IM_GOLD_BODY, IM_GOLD, imAA(abs(sin(ang * (6.0 + fi) + hold)), 0.42));
      col = mix(col, plate, band * 0.88);
    }
    float ticks = imFill(imRing(r, R * 0.94, 0.018)) * step(fract(ang / 0.28 + hold * 0.02), 0.22);
    col = mix(col, IM_CITRUS * 0.72, ticks * 0.70);
    float lip = imLine(r - R, 1.8);
    col = mix(col, IM_INK, lip * 0.55);
    float spark = imFill(length(p - c - vec2(cos(hold * 1.4), sin(hold * 1.7)) * R * 0.62) - 0.012);
    return mix(col, IM_GOLD, spark * 0.65);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(portalRing(p, t)); }`,
});
