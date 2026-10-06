// Family 1 — classroom fluorescents / venetian / chalk dust (8).
// Printed still: cold tubes, soft slats, board green. No rolling CGI dust.
import { T } from "./kit.glsl.js";

const F = "fluoro";

export const FLUORO = [
  T("fluoroTroffer", F, "recessed ceiling troffers: three cold housings, fwidth lips, fluoro plates",
    `vec3 fluoroTroffer(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float row = scBand(p.y, 0.88, 0.98);
      for (int i = 0; i < 3; i++) {
        float x = 0.26 + float(i) * 0.34;
        float box = scBox(p, vec2(x, 0.935), vec2(0.14, 0.028));
        float lip = scLine(box, 1.6);
        float plate = scFill(box);
        c = mix(c, SC_FLUORO_DIM * 0.85, plate * row * 0.55);
        c = mix(c, SC_FLUORO * 0.80, scFill(scBox(p, vec2(x, 0.935), vec2(0.11, 0.012))) * 0.70);
        c = mix(c, SC_INK * 3.2, lip * row * 0.35);
      }
      return c;
    }`, "fluoroTroffer(p, t)"),

  T("fluoroBallast", F, "ballast hold: 2 fps step on the fluoro wash, observational flicker, never strobe punch",
    `vec3 fluoroBallast(vec2 p, float t) {
      float hold = scHold(t, 2.0);
      float hum = 0.92 + 0.08 * step(0.5, fract(hold * 0.5 + 0.17));
      vec3 c = scRoom(p, hold);
      float ceil = scAA(p.y, 0.78);
      c = mix(c, c * vec3(0.96, 1.02, 1.00) * hum, ceil * 0.45);
      return c;
    }`, "fluoroBallast(p, t)"),

  T("venetianSoft", F, "soft venetian slats on the west pane: fwidth bars, winter light between",
    `vec3 venetianSoft(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float win = (1.0 - scAA(p.x, 0.32)) * scBand(p.y, 0.26, 0.90);
      float slat = scVenetian(p + vec2(0.0, 0.01), 15.0);
      vec3 gap = mix(SC_WINTER, SC_FLUORO * 0.72, scAA(p.y, 0.62));
      vec3 bar = mix(SC_WALL * 0.55, SC_FLUORO_DIM * 0.7, 0.35);
      vec3 pane = mix(gap, bar, slat);
      return mix(c, pane, win * 0.90);
    }`, "venetianSoft(p, t)"),

  T("venetianFloor", F, "venetian bars fallen on the beech desk: value bands, not hue stripes",
    `vec3 venetianFloor(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float desk = 1.0 - scAA(p.y, 0.40);
      float slat = scVenetian(vec2(p.x * 0.35 + p.y * 0.2, p.x * 0.15 + p.y), 11.0);
      vec3 lit = scWood(p) * vec3(1.04, 1.02, 0.96);
      vec3 shade = scWood(p) * vec3(0.72, 0.74, 0.80);
      return mix(c, mix(lit, shade, slat), desk * 0.82);
    }`, "venetianFloor(p, t)"),

  T("chalkMote", F, "sparse chalk motes in one fluoro shaft: a few printed specks, not a particle field",
    `vec3 chalkMote(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float shaft = scBand(p.x, 0.52, 0.86) * scBand(p.y, 0.38, 0.92);
      vec3 shaftCol = mix(c, mix(c, SC_FLUORO, 0.22), shaft * 0.55);
      float keep = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        vec2 s = vec2(0.56 + 0.26 * scH21(vec2(fi, 2.1)), 0.42 + 0.44 * scH21(vec2(fi, 5.3)));
        keep = max(keep, scFill(length(p - s) - 0.0045) * step(0.45, scH21(vec2(fi, 8.0))));
      }
      return mix(shaftCol, SC_PAPER * 0.92, keep * shaft * 0.55);
    }`, "chalkMote(p, t)"),

  T("boardGreen", F, "ANHS board green #2a4a32 with chalk tooth, not a flat paint swatch",
    `vec3 boardGreen(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float board = scBand(p.y, 0.54, 0.86) * scAA(p.x, 0.32);
      float tooth = scFbm(p * 18.0) * 0.10 + scVn(p * 40.0) * 0.04;
      vec3 chalked = SC_BOARD * (0.92 + tooth);
      float rail = scLine(p.y - 0.55, 1.8) * scAA(p.x, 0.32);
      chalked = mix(chalked, SC_BEECH_DARK, rail * 0.65);
      return mix(c, chalked, board * 0.94);
    }`, "boardGreen(p, t)"),

  T("chalkGhost", F, "ghost chalk strokes on the board: leftover marks, quiet, already erased",
    `vec3 chalkGhost(vec2 p, float t) {
      vec3 c = boardGreen(p, t);
      float board = scBand(p.y, 0.56, 0.84) * scAA(p.x, 0.36);
      float stroke = 0.0;
      stroke = max(stroke, scFill(scSeg(p, vec2(0.42, 0.74), vec2(0.78, 0.70), 0.006)));
      stroke = max(stroke, scFill(scSeg(p, vec2(0.50, 0.66), vec2(0.86, 0.64), 0.004)));
      stroke = max(stroke, scFill(scFifty(p, vec2(0.62, 0.72), 0.42)));
      float fade = 0.22 + 0.10 * scVn(p * 12.0);
      return mix(c, mix(c, SC_PAPER * 0.78, fade), stroke * board);
    }`, "chalkGhost(p, t)", ["boardGreen"]),

  T("fluoroWash", F, "whole-room cold fluorescent wash: 3-step cel, green-white key, no warm bounce",
    `vec3 fluoroWash(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float h = clamp(p.y * 0.55 + 0.28 + scNdL(p) * 0.18, 0.0, 1.0);
      vec3 wash = scCel3(h, SC_FLUORO_DIM * 0.7, SC_CREAM, SC_FLUORO * 0.72);
      return mix(c, wash, 0.42);
    }`, "fluoroWash(p, t)"),
];
