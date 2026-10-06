// Family 2 — desk wood / paper 50 / pencil / exam grid (8).
// The seal is the circled fifty on beech. Still desk, not a slam.
import { T } from "./kit.glsl.js";

const F = "desk";

export const DESK = [
  T("deskBeech", F, "beech desktop #c4a46a: quiet ring grain, pore tooth, printed wood not noise",
    `vec3 deskBeech(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float desk = 1.0 - scAA(p.y, 0.44);
      vec3 wood = scWood(p);
      float sheen = scAA(p.y, 0.18) * 0.08;
      wood = mix(wood, SC_FLUORO * 0.55, sheen * desk);
      return mix(c, wood, desk * 0.96);
    }`, "deskBeech(p, t)"),

  T("deskGroove", F, "pencil-tray groove cut into the beech: fwidth lip, observational shadow",
    `vec3 deskGroove(vec2 p, float t) {
      vec3 c = deskBeech(p, t);
      float desk = 1.0 - scAA(p.y, 0.42);
      float d = abs(p.y - 0.355) - 0.012;
      float groove = scFill(d) * scBand(p.x, 0.18, 1.22);
      float lip = scLine(d, 1.4);
      c = mix(c, SC_BEECH_DARK * 0.72, groove * desk * 0.80);
      return mix(c, SC_INK * 2.4, lip * desk * 0.28);
    }`, "deskGroove(p, t)", ["deskBeech"]),

  T("paperFifty", F, "exam paper with circled red 50: the seal, still on the desk",
    `vec3 paperFifty(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.20, 0.11)));
      float edge = scLine(scBox(p, o, vec2(0.20, 0.11)), 1.3);
      vec3 paper = scPaper(p);
      float mark = scFill(scFifty(p, o + vec2(0.01, 0.01), 0.38));
      float ring = scFill(scRing50(p, o + vec2(0.01, 0.01), 0.55));
      paper = mix(paper, SC_RED50, max(mark, ring) * 0.88);
      c = mix(c, paper, sheet);
      return mix(c, SC_INK * 2.8, edge * 0.35);
    }`, "paperFifty(p, t)"),

  T("paperTooth", F, "paper-50 fiber tooth: laid grain, printed stock, never CGI paper noise",
    `vec3 paperTooth(vec2 p, float t) {
      vec3 c = paperFifty(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.20, 0.11)));
      float laid = scVn(vec2(p.x * 28.0, p.y * 6.0));
      vec3 tooth = mix(SC_PAPER_TOOTH, SC_PAPER, laid);
      return mix(c, mix(c, tooth, 0.55), sheet);
    }`, "paperTooth(p, t)", ["paperFifty"]),

  T("pencilHex", F, "hexagonal pencil + one graphite stroke on the paper, still",
    `vec3 pencilHex(vec2 p, float t) {
      vec3 c = paperFifty(p, t);
      vec2 a = vec2(0.92, 0.28), b = vec2(1.12, 0.18);
      float body = scFill(scSeg(p, a, b, 0.012));
      vec2 q = p - mix(a, b, 0.5);
      float hex = abs(fract(atan(q.y, q.x) / 1.047 + 0.5) - 0.5);
      vec3 paint = mix(SC_PENCIL, vec3(0.42, 0.28, 0.16), scAA(hex, 0.18));
      c = mix(c, paint, body);
      float stroke = scFill(scSeg(p, vec2(0.58, 0.18), vec2(0.80, 0.20), 0.0035));
      return mix(c, SC_PENCIL * 1.15, stroke * 0.70);
    }`, "pencilHex(p, t)", ["paperFifty"]),

  T("examGrid", F, "exam answer grid on the paper: fwidth rules, quiet, printed",
    `vec3 examGrid(vec2 p, float t) {
      vec3 c = paperFifty(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.19, 0.10)));
      vec2 g = (p - o) * vec2(18.0, 12.0);
      vec2 fw = fwidth(g) + 1e-5;
      vec2 a = abs(fract(g - 0.5) - 0.5) / fw;
      float line = (1.0 - smoothstep(0.6, 1.6, min(a.x, a.y))) * 0.28;
      return mix(c, mix(c, SC_FLUORO_DIM * 0.9, line), sheet);
    }`, "examGrid(p, t)", ["paperFifty"]),

  T("deskContact", F, "contact shade under the paper: warm-black multiply, never crushed #000",
    `vec3 deskContact(vec2 p, float t) {
      vec3 c = paperFifty(p, t);
      vec2 o = vec2(0.72, 0.20);
      float sh = scFill(scEllipse(p, o + vec2(0.02, -0.04), vec2(0.22, 0.06)));
      float sheet = scFill(scBox(p, vec2(0.70, 0.22), vec2(0.20, 0.11)));
      vec3 shade = c * vec3(0.62, 0.58, 0.56);
      return mix(c, mix(shade, c, sheet), sh * 0.55);
    }`, "deskContact(p, t)", ["paperFifty"]),

  T("eraserPink", F, "few pink eraser crumbs on the beech: sparse, printed, still",
    `vec3 eraserPink(vec2 p, float t) {
      vec3 c = deskBeech(p, t);
      float desk = 1.0 - scAA(p.y, 0.40);
      float crumbs = 0.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 s = vec2(0.48 + 0.40 * scH21(vec2(fi, 1.4)), 0.12 + 0.18 * scH21(vec2(fi, 3.7)));
        crumbs = max(crumbs, scFill(length(p - s) - 0.006));
      }
      return mix(c, SC_ERASER, crumbs * desk * 0.70);
    }`, "eraserPink(p, t)", ["deskBeech"]),
];
