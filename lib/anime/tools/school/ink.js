// Family 7 — quiet ink hatch / notebook rule / stamp (6).
// Fountain quiet. Not a JoJo punch hatch.
import { T } from "./kit.glsl.js";

const F = "ink";

export const INK = [
  T("inkQuiet", F, "quiet ink hatch on paper: thin diagonal, fwidth, printed, never a speed line",
    `vec3 inkQuiet(vec2 p, float t) {
      vec3 c = scPaperFifty(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.19, 0.10)));
      float h = (p.x - p.y) * 28.0;
      float g = abs(fract(h) - 0.5);
      float w = fwidth(h) + 1e-5;
      float hatch = (1.0 - smoothstep(0.10 - w, 0.10 + w, g)) * 0.22;
      return mix(c, mix(c, SC_INK * 2.4, hatch), sheet);
    }`, "inkQuiet(p, t)"),

  T("noteRule", F, "notebook ruled lines: even pitch, fwidth, cream stock",
    `vec3 noteRule(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.22, 0.13)));
      vec3 paper = scPaper(p);
      float rule = scLine(fract((p.y - 0.12) * 22.0) - 0.5, 1.1) * 0.35;
      paper = mix(paper, SC_FLUORO_DIM * 0.9, rule);
      return mix(c, paper, sheet);
    }`, "noteRule(p, t)"),

  T("marginRed", F, "red margin rule on the notebook: one vertical, ANHS red, quiet",
    `vec3 marginRed(vec2 p, float t) {
      vec3 c = noteRule(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.22, 0.13)));
      float margin = scLine(p.x - 0.56, 1.4);
      return mix(c, mix(c, SC_RED50, margin * 0.70), sheet);
    }`, "marginRed(p, t)", ["noteRule"]),

  T("stampClass", F, "Class 1-D date stamp: rounded rect, red-50 ink, faint offset",
    `vec3 stampClass(vec2 p, float t) {
      vec3 c = scPaperFifty(p, t);
      vec2 s = vec2(0.86, 0.28);
      float pad = scFill(scBox(p, s, vec2(0.055, 0.022)));
      float lip = scLine(scBox(p, s, vec2(0.055, 0.022)), 1.3);
      float mark = scFill(scFifty(p, s, 0.16));
      vec3 ink = mix(SC_RED50 * 0.7, SC_RED50, 0.65);
      c = mix(c, mix(c, ink, 0.45), pad);
      c = mix(c, ink, lip * 0.55);
      return mix(c, ink, mark * 0.75);
    }`, "stampClass(p, t)"),

  T("inkFeather", F, "fountain ink feather: one wet edge on the rule, bleed tooth, still",
    `vec3 inkFeather(vec2 p, float t) {
      vec3 c = noteRule(p, t);
      float stroke = scFill(scSeg(p, vec2(0.58, 0.20), vec2(0.82, 0.24), 0.004));
      float bleed = scFbm(p * 30.0);
      float wet = stroke * (0.7 + 0.3 * scAA(bleed, 0.48));
      float halo = scFill(scSeg(p, vec2(0.58, 0.20), vec2(0.82, 0.24), 0.010)) * 0.18;
      c = mix(c, SC_INK * 2.2, halo);
      return mix(c, SC_INK * 2.8, wet);
    }`, "inkFeather(p, t)", ["noteRule"]),

  T("folioHead", F, "folio header: thin top rule + quiet page number plate",
    `vec3 folioHead(vec2 p, float t) {
      vec3 c = scPaperFifty(p, t);
      vec2 o = vec2(0.70, 0.22);
      float sheet = scFill(scBox(p, o, vec2(0.20, 0.11)));
      float head = scLine(p.y - 0.305, 1.2) * scBand(p.x, 0.52, 0.88);
      float num = scFill(scFifty(p, vec2(0.84, 0.30), 0.12));
      c = mix(c, mix(c, SC_INK * 2.4, head * 0.45), sheet);
      return mix(c, SC_FLUORO_DIM, num * sheet * 0.55);
    }`, "folioHead(p, t)"),
];
