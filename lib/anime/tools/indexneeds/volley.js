import { defineModule } from "./define.js";

export const VOLLEY = [
  defineModule({
    name: "weapon-volley",
    family: "fx",
    doc: "Gate of Babylon volley: gold portal discs in the sky, diamond blades fanning toward a seat",
    glsl: /* glsl */ `
  float ixBlade(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float w = mix(0.010, 0.028, sin(h * 3.14159));
    float d = length(pa - ba * h) - w;
    vec2 n = normalize(ba);
    vec2 tip = p - b;
    float point = length(tip) - 0.012;
    return min(d, point);
  }
  vec3 weaponVolley(vec2 p, float t) {
    vec2 seat = vec2(0.70, 0.36);
    vec3 col = mix(vec3(0.14, 0.10, 0.16), vec3(0.42, 0.28, 0.18), clamp(p.y * 0.7, 0.0, 1.0));
    col = mix(col, ixPaper(p) * 0.4, ixFill(0.28 - p.y) * 0.5);
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      vec2 h = ixH22(vec2(fi, 9.0));
      float ang = mix(-0.85, 0.85, h.x) + 0.08 * sin(t * 1.7 + fi);
      float dist = mix(0.38, 0.72, h.y);
      vec2 portal = seat + vec2(sin(ang), 0.55 + 0.35 * cos(ang)) * dist;
      float go = fract(t * 0.35 + h.x);
      vec2 bladeB = mix(portal, seat, clamp(go * 1.15, 0.0, 1.0));
      float hole = ixDisc(p, portal, 0.034);
      vec3 gold = ixCel3(0.55 + 0.3 * h.x, IX_GOLD * 0.45, IX_GOLD, IX_BEAM * 0.8);
      col = mix(col, mix(vec3(0.28, 0.10, 0.12), gold, 0.7), ixFill(hole));
      col = mix(col, IX_INK, ixLine(hole, 1.3));
      float bd = ixBlade(p, portal, bladeB);
      col = mix(col, gold, ixFill(bd));
      col = mix(col, IX_INK, ixLine(bd, 1.2) * 0.7);
    }
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return weaponVolley(p, t); }`,
  }),
];
