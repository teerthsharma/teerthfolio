import { defineModule } from "./define.js";

export const NEBULA_SKY = defineModule({
  name: "nebula-sky",
  doc: "Tournament nebula sky: orchid/teal pigment fbm, dust lanes, never milky, luma-capped",
  glsl: /* glsl */ `
  vec3 nebulaSky(vec2 p, float t) {
    float hold = imHold(t, 3.0);
    vec2 q = imWarp(p * 2.3 + vec2(hold * 0.02, 0.0), 0.50);
    float d = imFbm(q);
    float r = 1.0 - abs(2.0 * imFbm(q * 1.4 + 3.0) - 1.0);
    vec3 pig = IM_ORCH * d + IM_TEAL * (1.0 - d) * 0.65 + IM_EMBER * r * 0.28;
    vec3 col = IM_VOID + pig * smoothstep(0.28, 0.72, d) * 0.55;
    float lane = abs(p.y - 0.48 - 0.10 * sin(p.x * 3.0) - 0.04 * imFbm(p * 5.0));
    col *= 1.0 - 0.72 * exp(-pow(lane / 0.05, 2.0));
    vec2 gv = floor(p * 22.0);
    float star = pow(imH21(gv), 9.0) * imFill(length(fract(p * 22.0) - 0.5) - 0.04);
    col += IM_MOON * star * 0.45;
    float well = exp(-length(p - vec2(0.72, 0.55)) * 2.6);
    return mix(col, IM_INK, well * 0.35);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(nebulaSky(p, t)); }`,
});
