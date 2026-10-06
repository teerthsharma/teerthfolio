import { defineModule } from "./define.js";

export default defineModule({
  name: "tbc-arrow-card",
  doc: "To Be Continued card: cream roundrect, gold pointed arrow, roundel, indigo field — Part 3 still",
  glsl: /* glsl */ `
  vec3 tbcArrowCard(vec2 p, float t) {
    vec3 field = vec3(0.227, 0.102, 0.227);
    vec2 cardP = p - vec2(0.58, 0.50);
    float card = sBox(cardP, vec2(0.36, 0.14)) - 0.03;
    vec3 plate = mix(S_PAPER, S_CREAM, sAA(cardP.y, 0.0));
    vec3 col = mix(field, plate, sFill(card));
    col = mix(col, S_INK, sLine(card, 2.0));
    vec2 q = p - vec2(0.62, 0.50);
    float body = max(abs(q.y) - 0.055, abs(q.x + 0.04) - 0.22);
    vec2 tip = q - vec2(0.24, 0.0);
    float arrow = min(body, max(abs(tip.x) + abs(tip.y) * 1.45 - 0.16, -tip.x));
    vec3 gold = mix(sGold(vec3(0.58, 0.40, 0.10)), S_CREAM, sFill(abs(q.y + 0.038) - 0.008) * sFill(body + 0.02));
    col = mix(col, gold, sFill(arrow));
    col = mix(col, S_INK, sLine(arrow, 2.0));
    float roundel = length(p - vec2(0.28, 0.50)) - 0.055;
    col = mix(col, S_GOLD, sFill(roundel));
    col = mix(col, S_INK, sLine(roundel, 1.6));
    col = mix(col, S_INK, sFill(length(p - vec2(0.28, 0.50)) - 0.018));
    return sOut(col);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return tbcArrowCard(p, t); }`,
});
