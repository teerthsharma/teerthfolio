// Family — laid-paper tooth. Handmade stock. Fiber and chain, not speckle.
import { P } from "./kit.glsl.js";

const F = "laid";

export default [
  P("printLaidChain", F, "laid + chain: handmade parallels, warp-softened, pigment sits in the trough",
    `vec3 printLaidChain(vec3 col, vec2 p, float t) {
      float lines = prLaidAmt(p);
      float L = prLuma(col);
      vec3 trough = mix(col * vec3(0.90, 0.86, 0.80), mix(col, PR_INK * 2.0, 0.12), 1.0 - L);
      return prOut(mix(col, trough, lines * 0.42));
    }`),

  P("printPulpTooth", F, "cold-press pits: ink catches in the tooth, lights stay paper",
    `vec3 printPulpTooth(vec3 col, vec2 p, float t) {
      float pit = smoothstep(0.58, 0.86, prFbm(p * 13.5 + 2.1));
      float L = prLuma(col);
      float catchAmt = pit * (1.0 - L) * 0.55;
      vec3 sunk = col * mix(PR_TOOTH / 0.82, vec3(0.88, 0.80, 0.72), L);
      return prOut(mix(col, sunk, catchAmt));
    }`),

  P("printFiberStreak", F, "long pulp streaks: one-direction fiber, irregular, never a noise field",
    `vec3 printFiberStreak(vec3 col, vec2 p, float t) {
      float along = p.x * 1.6 + p.y * 46.0 + prFbm(p * 3.0) * 1.4;
      float fiber = prVn(vec2(along, p.y * 1.3));
      float ridge = prLine(fract(along) - 0.5, 1.4) * step(0.62, fiber);
      vec3 tint = mix(vec3(0.94, 0.90, 0.84), vec3(1.04, 1.01, 0.96), fiber);
      return prOut(mix(col * tint, col * vec3(0.86, 0.80, 0.74), ridge * 0.28));
    }`),

  P("printDeckleRim", F, "fore-edge deckle: ragged open edge only, fwidth lip, paper not void",
    `vec3 printDeckleRim(vec3 col, vec2 p, float t) {
      float u = p.x / 1.44;
      float bite = (prFbm(vec2(u * 4.0, p.y * 22.0)) - 0.5) * 0.045;
      float edge = (u - 0.90) - bite;
      float lip = 1.0 - smoothstep(-fwidth(edge) * 2.4, fwidth(edge) * 1.6, -edge);
      vec3 stock = mix(PR_VERSO, PR_PAPER, prVn(p * 14.0));
      float tear = prFill(abs(p.y - 0.18) - 0.04) * prAA(u, 0.86) * step(0.72, prFbm(p * 7.0));
      vec3 page = mix(col, stock, max(lip, tear * 0.85));
      return prOut(mix(page, PR_UMBER * 1.6, prLine(edge, 1.5) * 0.22));
    }`),

  P("printShowThrough", F, "show-through: verso ghost from the flipped sheet, faint indigo",
    `vec3 printShowThrough(vec3 col, vec2 p, float t) {
      vec2 back = vec2(1.44 - p.x, p.y);
      float ghost = prFbm(back * 5.4 + 1.8);
      float type = smoothstep(0.62, 0.84, ghost) * smoothstep(0.48, 0.70, prVn(back * 9.0));
      float show = type * mix(0.06, 0.14, 1.0 - prLuma(col));
      return prOut(mix(col, PR_INK * 2.15, show));
    }`),
];
