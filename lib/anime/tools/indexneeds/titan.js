import { defineModule } from "./define.js";

export const TITAN = [
  defineModule({
    name: "titan-march-impostor",
    family: "cast",
    doc: "Rumbling impostor cards: huge torso, pin head, marching offsets, steam at the feet, painted skin not mesh",
    glsl: /* glsl */ `
  float ixTitanCard(vec2 q) {
    float torso = ixBox(q, vec2(0.00, 0.08), vec2(0.22, 0.32));
    float rib = ixBox(q, vec2(0.00, 0.02), vec2(0.18, 0.16));
    float head = ixEllipse(q, vec2(0.00, 0.46), vec2(0.07, 0.08));
    float jaw = ixEllipse(q, vec2(0.00, 0.40), vec2(0.08, 0.05));
    float legL = ixBox(q, vec2(-0.10, -0.38), vec2(0.07, 0.28));
    float legR = ixBox(q, vec2(0.11, -0.36), vec2(0.07, 0.30));
    float armL = ixBox(q, vec2(-0.28, 0.02), vec2(0.05, 0.26));
    float armR = ixBox(q, vec2(0.28, 0.00), vec2(0.05, 0.24));
    return min(torso, min(rib, min(head, min(jaw, min(legL, min(legR, min(armL, armR)))))));
  }
  vec3 titanMarchImpostor(vec2 p, float t) {
    float hold = ixHold(t, 8.0);
    vec3 col = mix(vec3(0.42, 0.28, 0.22), vec3(0.62, 0.48, 0.34), clamp(p.y, 0.0, 1.0));
    col = mix(col, vec3(0.70, 0.58, 0.42), ixFill(p.y - 0.78) * 0.55);
    float dust = ixFbm(vec2(p.x * 3.0 + hold * 0.2, p.y * 6.0));
    col = mix(col, IX_FUR_M, dust * ixFill(0.28 - p.y) * 0.35);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float hsh = ixH21(vec2(fi, 7.0));
      float march = fract(fi * 0.17 + t * 0.045 + hsh * 0.1);
      float x = mix(-0.12, 1.42, march);
      float sc = mix(0.22, 0.48, hsh);
      float y = mix(0.34, 0.46, 1.0 - hsh);
      vec2 q = (p - vec2(x, y)) / sc;
      q.x += 0.04 * sin(t * 2.4 + fi);
      float d = ixTitanCard(q);
      float fill = ixFill(d);
      float nd = clamp(0.45 + 0.4 * q.x + 0.2 * q.y, 0.0, 1.0);
      vec3 skin = ixCel3(nd, IX_SKIN * 0.55, IX_SKIN, vec3(0.78, 0.60, 0.48));
      float ribs = ixLine(sin(q.y * 18.0) * 0.02 + abs(q.x) - 0.10, 1.2) * fill * ixBand(q.y, -0.06, 0.18);
      skin = mix(skin, IX_INK, ribs * 0.4);
      float mouth = ixFill(ixBox(q, vec2(0.00, 0.40), vec2(0.045, 0.012)));
      skin = mix(skin, IX_INK, mouth);
      col = mix(col, skin, fill);
      col = mix(col, IX_INK, ixLine(d, 1.4) * 0.75);
      float steam = exp(-pow(length(p - vec2(x, y - sc * 0.55)) / (sc * 0.55), 2.0));
      col = mix(col, IX_CREAM * 0.55, steam * 0.22);
    }
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return titanMarchImpostor(p, t); }`,
  }),
];
