import { defineModule } from "./define.js";

export const CHESS_OVERLAY = defineModule({
  name: "chess-overlay",
  doc: "COTE chess overlay: cream board, red/ink squares, piece silhouettes, CHECKMATE bar",
  glsl: /* glsl */ `
  vec3 chessOverlay(vec2 p, float t) {
    vec3 wash = mix(IM_CREAM, IM_WALL, imAA(p.y, 0.50));
    vec2 o = vec2(0.70, 0.48);
    vec2 q = (p - o) * vec2(1.05, 1.15);
    float board = imFill(imBox(q, vec2(0.0), vec2(0.36, 0.36)));
    vec2 g = (q + 0.36) * 8.0 / 0.72;
    vec2 id = floor(g);
    float sq = mod(id.x + id.y, 2.0);
    vec3 light = vec3(0.80, 0.76, 0.68);
    vec3 dark = vec3(0.42, 0.16, 0.16);
    vec3 col = mix(wash, mix(light, dark, sq), board);
    col = mix(col, IM_INK, imLine(imBox(q, vec2(0.0), vec2(0.36, 0.36)), 1.8) * 0.55);
    float king = imFill(imSeg(p, o + vec2(-0.08, -0.10), o + vec2(-0.08, 0.06), 0.012));
    king = max(king, imFill(imBox(p, o + vec2(-0.08, 0.10), vec2(0.03, 0.018))));
    float pawn = imFill(length(p - (o + vec2(0.10, -0.08))) - 0.028);
    pawn = max(pawn, imFill(imBox(p, o + vec2(0.10, -0.14), vec2(0.022, 0.016))));
    col = mix(col, IM_INK * 2.4, (king + pawn) * board);
    float hold = imHold(t, 4.0);
    float mate = step(0.45, fract(hold * 0.25));
    vec2 bar = p - vec2(0.70, 0.82);
    float card = imFill(imBox(bar, vec2(0.0), vec2(0.28, 0.045)));
    vec3 letter = mix(IM_RED50, IM_INK, 0.15);
    col = mix(col, letter, card * mate);
    col = mix(col, IM_PAPER, card * mate * imFill(imBox(bar, vec2(0.0), vec2(0.26, 0.028))) * 0.35);
    return col;
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(chessOverlay(p, t)); }`,
});
