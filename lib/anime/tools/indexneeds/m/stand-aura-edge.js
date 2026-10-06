import { defineModule } from "./define.js";

export const STAND_AURA_EDGE = defineModule({
  name: "stand-aura-edge",
  doc: "Stand aura edge: jagged energy silhouette, gold/magenta hatch, hold on twos",
  glsl: /* glsl */ `
  vec3 standAuraEdge(vec2 p, float t) {
    float hold = imHold(t, 12.0);
    vec3 bg = mix(vec3(0.16, 0.08, 0.18), IM_VOID, imAA(p.y, 0.50));
    vec2 c = vec2(0.70, 0.48);
    vec2 q = p - c;
    float r = length(q / vec2(0.18, 0.32));
    float ang = atan(q.y, q.x);
    float jag = 0.10 * imVn(vec2(ang * 4.0, hold * 2.0)) + 0.05 * sin(ang * 11.0 + hold * 3.0);
    float d = r - (1.0 + jag);
    float body = imFill(imEll(p, c, vec2(0.11, 0.22)));
    vec3 col = mix(bg, vec3(0.36, 0.16, 0.46), body);
    float aura = imFill(d) - body;
    vec3 flame = mix(IM_MAG, IM_GOLD, imAA(imFbm(q * 5.0 + hold), 0.50));
    col = mix(col, flame, clamp(aura, 0.0, 1.0) * 0.80);
    float hatch = abs(fract((p.x - p.y) * 28.0 + hold) - 0.5);
    float hw = fwidth((p.x - p.y) * 28.0) + 1e-5;
    float tone = 1.0 - smoothstep(0.10 - hw, 0.10 + hw, hatch);
    col = mix(col, IM_INK, tone * clamp(aura, 0.0, 1.0) * 0.35);
    return mix(col, IM_INK, imLine(d, 1.6) * 0.55);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(standAuraEdge(p, t)); }`,
});
