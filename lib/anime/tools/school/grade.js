// Family 8 — cold grade / social-hierarchy tint bands (6).
// Class 1-D wash. Chess at 0.35. Exact or refused.
import { T } from "./kit.glsl.js";

const F = "grade";

export const GRADE = [
  T("gradeLadder", F, "A/B/C/D grade bands: four value plates across the room, cold fluoro",
    `vec3 gradeLadder(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      float x = clamp(p.x / 1.36, 0.0, 1.0);
      vec3 a = vec3(0.70, 0.74, 0.72);
      vec3 b = vec3(0.54, 0.58, 0.62);
      vec3 d = vec3(0.36, 0.32, 0.40);
      vec3 e = vec3(0.28, 0.16, 0.18);
      vec3 band = x < 0.25 ? a : (x < 0.50 ? b : (x < 0.75 ? d : e));
      float cut = scLine(fract(x * 4.0) - 0.02, 1.2);
      c = mix(c, c * band, 0.38);
      return mix(c, SC_INK * 2.2, cut * 0.18);
    }`, "gradeLadder(p, t)"),

  T("hierBand", F, "social-hierarchy tint: cool high seats, warm-black low seats, value first",
    `vec3 hierBand(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      float y = clamp(p.y, 0.0, 1.0);
      vec3 high = vec3(0.88, 0.94, 0.96);
      vec3 low = vec3(0.72, 0.62, 0.64);
      vec3 tint = mix(low, high, scAA(y, 0.48));
      float stripe = scVenetian(vec2(p.x, p.y * 0.35), 7.0) * 0.12;
      return mix(c, c * tint, 0.40 + stripe);
    }`, "hierBand(p, t)"),

  T("classDTint", F, "Class 1-D cold wash: fluoro multiply, a thin red-50 lip, not a cream room",
    `vec3 classDTint(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      vec3 wash = vec3(0.82, 0.90, 0.92);
      c = c * mix(vec3(1.0), wash, 0.42);
      float lip = scLine(p.y - 0.40, 1.5) * 0.22;
      return mix(c, mix(c, SC_RED50, 0.35), lip);
    }`, "classDTint(p, t)"),

  T("rankStripe", F, "rank stripe overlay: one thin horizontal, gold catch on the hero seat",
    `vec3 rankStripe(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      float stripe = scFill(abs(p.y - 0.36) - 0.016) * scBand(p.x, 0.20, 1.22);
      float lip = scLine(p.y - 0.36, 1.3);
      c = mix(c, c * vec3(0.70, 0.68, 0.74), stripe * 0.55);
      float hero = scFill(scEllipse(p, vec2(0.70, 0.36), vec2(0.08, 0.018)));
      c = mix(c, scGoldCatch(0.45), hero * 0.35);
      return mix(c, SC_INK * 2.4, lip * 0.25);
    }`, "rankStripe(p, t)"),

  T("chessQuiet", F, "chess overlay at 0.35: quiet CHECKMATE plate, not a smash cut",
    `vec3 chessQuiet(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      vec2 o = vec2(0.72, 0.50);
      vec2 q = (p - o) * 8.0;
      float chk = step(1.0, mod(floor(q.x) + floor(q.y), 2.0));
      float board = scFill(scBox(p, o, vec2(0.28, 0.28)));
      vec3 dark = SC_CHESS * 1.6;
      vec3 lite = SC_PAPER * 0.72;
      vec3 grid = mix(lite, dark, chk);
      c = mix(c, mix(c, grid, 0.35), board);
      float mate = scFill(scBox(p, vec2(0.72, 0.78), vec2(0.16, 0.03)));
      return mix(c, mix(c, SC_RED50, 0.40), mate * 0.55);
    }`, "chessQuiet(p, t)"),

  T("exactPlate", F, "exact-or-refused grade plate: circled 50, warm-black field, still",
    `vec3 exactPlate(vec2 p, float t) {
      vec3 c = scClassroom(p, t);
      float plate = scFill(scEllipse(p, vec2(0.72, 0.50), vec2(0.26, 0.18)));
      vec3 field = mix(SC_INK * 2.0, SC_BOARD * 0.7, 0.35);
      float mark = scFill(scFifty(p, vec2(0.72, 0.50), 0.72));
      float ring = scFill(scRing50(p, vec2(0.72, 0.50), 1.05));
      c = mix(c, field, plate * 0.72);
      c = mix(c, SC_RED50, max(mark, ring) * 0.90);
      return c;
    }`, "exactPlate(p, t)"),
];
