import { defineModule } from "./define.js";

export const REVIEW_CARD_UI = defineModule({
  name: "review-card-ui",
  doc: "ANHS review card: laid paper, exam grid, circled red 50, name plate, fluoro wash",
  glsl: /* glsl */ `
  vec3 reviewCardUi(vec2 p, float t) {
    vec3 room = mix(IM_WALL * 0.85, IM_FLUORO_DIM * 0.55, imAA(p.y, 0.80));
    vec2 o = vec2(0.70, 0.48);
    float card = imFill(imBox(p, o, vec2(0.32, 0.38)));
    vec3 paper = imPaper(p);
    vec3 col = mix(room, paper, card);
    col = mix(col, IM_INK, imLine(imBox(p, o, vec2(0.32, 0.38)), 1.6) * 0.40);
    float head = imFill(imBox(p, o + vec2(0.0, 0.30), vec2(0.28, 0.05)));
    col = mix(col, IM_BLAZER * 0.85, head * card);
    vec2 g = (p - o - vec2(0.0, -0.04)) * vec2(14.0, 10.0);
    vec2 fw = fwidth(g) + 1e-5;
    vec2 a = abs(fract(g - 0.5) - 0.5) / fw;
    float line = (1.0 - smoothstep(0.6, 1.6, min(a.x, a.y))) * 0.28;
    col = mix(col, mix(col, IM_FLUORO_DIM * 0.9, line), card * imBand(p.y, 0.22, 0.62));
    float mark = imFill(imFifty(p, o + vec2(0.08, -0.06), 0.55));
    float ring = imFill(abs(length((p - o - vec2(0.08, -0.06)) / 0.72) - 0.22) - 0.014);
    col = mix(col, IM_RED50, max(mark, ring) * card * 0.90);
    float stamp = imFill(imEll(p, o + vec2(-0.18, -0.22), vec2(0.07, 0.04)));
    col = mix(col, IM_RED50 * 0.70, stamp * card * 0.65);
    float hold = imHold(t, 2.0);
    col += (imH21(floor(p * 70.0 + hold)) - 0.5) * 0.012 * card;
    return col;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(reviewCardUi(p, t)); }`,
});
