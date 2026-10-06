import { defineModule } from "./define.js";

export const RUBBER_HOSE_LIMBS = defineModule({
  name: "rubber-hose-limbs",
  doc: "rubber-hose limbs: tapered capsules, squash hold, cream fill, indigo outline",
  glsl: /* glsl */ `
  vec3 rubberHoseLimbs(vec2 p, float t) {
    float hold = imHold(t, 8.0);
    vec3 bg = mix(vec3(0.72, 0.68, 0.58), vec3(0.52, 0.62, 0.70), imAA(p.y, 0.55));
    float bounce = 0.04 * sin(hold * 6.28318);
    vec2 hip = vec2(0.70, 0.42 + bounce);
    vec2 kneeL = vec2(0.58, 0.26 + bounce * 0.4);
    vec2 footL = vec2(0.52 + 0.03 * sin(hold * 3.0), 0.12);
    vec2 kneeR = vec2(0.84, 0.28 - bounce * 0.3);
    vec2 footR = vec2(0.90 - 0.03 * sin(hold * 3.0), 0.12);
    vec2 shL = vec2(0.56, 0.58 + bounce);
    vec2 handL = vec2(0.42, 0.46 + 0.05 * sin(hold * 4.0));
    vec2 shR = vec2(0.84, 0.58 + bounce);
    vec2 handR = vec2(0.98, 0.50 + 0.04 * cos(hold * 4.0));
    float d = imSeg(p, hip, kneeL, 0.028);
    d = min(d, imSeg(p, kneeL, footL, 0.022));
    d = min(d, imSeg(p, hip, kneeR, 0.028));
    d = min(d, imSeg(p, kneeR, footR, 0.022));
    d = min(d, imSeg(p, shL, handL, 0.020));
    d = min(d, imSeg(p, shR, handR, 0.020));
    d = min(d, imEll(p, hip + vec2(0.0, 0.16), vec2(0.12, 0.16)));
    d = min(d, imEll(p, hip + vec2(0.0, 0.34), vec2(0.08, 0.08)));
    vec3 fill = mix(vec3(0.82, 0.62, 0.42), vec3(0.88, 0.74, 0.56), imAA(p.y, 0.40));
    vec3 col = mix(bg, fill, imFill(d));
    col = mix(col, IM_INK, imLine(d, 2.0) * 0.85);
    float glove = imFill(length(p - handL) - 0.034) + imFill(length(p - handR) - 0.034);
    return mix(col, IM_RED50 * 0.70, min(glove, 1.0) * 0.80);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(rubberHoseLimbs(p, t)); }`,
});
