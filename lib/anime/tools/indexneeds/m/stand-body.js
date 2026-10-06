import { defineModule } from "./define.js";

export const STAND_BODY = defineModule({
  name: "stand-body",
  doc: "JoJo Stand body: purple/gold muscular silhouette, 3-step cel, gold trim, indigo ink",
  glsl: /* glsl */ `
  vec3 standBody(vec2 p, float t) {
    float hold = imHold(t, 6.0);
    vec3 bg = mix(vec3(0.18, 0.10, 0.22), vec3(0.10, 0.12, 0.24), imAA(p.y, 0.55));
    vec2 c = vec2(0.70, 0.46);
    float torso = imEll(p, c, vec2(0.14, 0.20));
    float head = imEll(p, c + vec2(0.0, 0.28), vec2(0.075, 0.085));
    float armL = imSeg(p, c + vec2(-0.10, 0.12), c + vec2(-0.28, -0.02), 0.032);
    float armR = imSeg(p, c + vec2(0.10, 0.12), c + vec2(0.30, 0.08 + 0.02 * sin(hold)), 0.032);
    float legL = imSeg(p, c + vec2(-0.05, -0.16), c + vec2(-0.10, -0.40), 0.036);
    float legR = imSeg(p, c + vec2(0.06, -0.16), c + vec2(0.12, -0.40), 0.036);
    float d = min(min(torso, head), min(min(armL, armR), min(legL, legR)));
    vec3 N = normalize(vec3(p - c, 0.22));
    float h = 0.5 + 0.5 * dot(N, normalize(vec3(-0.4, 0.6, 0.6)));
    vec3 wool = imCel3(h, vec3(0.22, 0.10, 0.34), vec3(0.42, 0.18, 0.52), vec3(0.62, 0.36, 0.68));
    vec3 col = mix(bg, wool, imFill(d));
    float trim = imLine(torso, 2.2) + imLine(head, 2.0);
    col = mix(col, IM_GOLD, min(trim, 1.0) * imFill(d + 0.01) * 0.55);
    float absPlate = imFill(imEll(p, c + vec2(0.0, 0.04), vec2(0.07, 0.05)));
    col = mix(col, IM_GOLD, absPlate * imFill(d) * 0.70);
    col = mix(col, IM_INK, imLine(d, 2.0) * 0.80);
    float eye = imFill(length(p - (c + vec2(-0.022, 0.30))) - 0.012) + imFill(length(p - (c + vec2(0.024, 0.30))) - 0.012);
    return mix(col, IM_GOLD, min(eye, 1.0) * 0.75);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(standBody(p, t)); }`,
});
