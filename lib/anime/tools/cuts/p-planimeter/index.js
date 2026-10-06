// Stash pack for p-planimeter — Classroom of the Elite / Lerche.
// Sit, fringe, half-lid, red blazer #b83a4b, paper 50. Money frame is the still eye ~6.9s.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-planimeter";

export const worldPlate = M("worldPlate", F, "Class 1-D: fluoro #c6d6cc, board #2a4a32, dusk #f3b36b west slit",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y, 0.0, 1.0);
    vec3 fluoro = vec3(0.776, 0.839, 0.800), wall = vec3(0.580, 0.557, 0.541), board = vec3(0.165, 0.290, 0.196);
    vec3 dusk = vec3(0.953, 0.702, 0.420), floorc = vec3(0.627, 0.502, 0.333);
    vec3 c = mix(floorc, wall, cAA(y, 0.34));
    c = mix(c, fluoro, cAA(y, 0.78) * 0.55);
    float boardBand = (1.0 - cAA(p.x, 0.46)) * cAA(y, 0.42) * (1.0 - cAA(y, 0.74));
    c = mix(c, board, boardBand * 0.92);
    float slit = cAA(p.x, 0.86) * cAA(y, 0.38) * (1.0 - cAA(y, 0.78));
    return mix(c, dusk, slit * 0.70);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "fluoro shade hatch: cool toner on desk/floor only",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y, 0.36);
    return mix(c, c * vec3(0.78, 0.84, 0.86), cHatch(gl_FragCoord.xy, 7.2) * shade * 0.55);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Lerche fluoro skin: cool terminator, winter bounce, never grey",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h * 0.78 + 0.10, 0.42, 0.76, vec3(0.400, 0.243, 0.298), vec3(0.627, 0.353, 0.365), vec3(0.800, 0.608, 0.545));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "ANHS red blazer #b83a4b, white collar, gold button sliver",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 wool = cCel3(h, 0.32, 0.68, vec3(0.420, 0.090, 0.141), vec3(0.722, 0.227, 0.294), vec3(0.820, 0.353, 0.373));
    float collar = cAA(p.y, 0.58) * (1.0 - cAA(p.y, 0.66)) * (1.0 - cAA(abs(p.x - 0.72), 0.10));
    wool = mix(wool, vec3(0.820, 0.800, 0.757), collar);
    float btn = cFill(length(p - vec2(0.78, 0.40)) - 0.016);
    return mix(wool, vec3(0.765, 0.608, 0.275), btn * 0.85);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Lerche TV hull #1c1416, 1.3px, observational",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.3);
    vec3 ink = vec3(0.110, 0.078, 0.086);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 6.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "circled 50 stamp: #e5142e ring on paper, fluoro hold",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.46);
    float ring = cLine(length(q / vec2(0.07, 0.08)) - 1.0, 2.0);
    float hold = floor(t * 8.0) * 0.02;
    vec3 paper = vec3(0.820, 0.784, 0.725);
    vec3 c = mix(worldPlate(p, t), paper, cFill(length(q / vec2(0.11, 0.13)) - 1.0));
    return mix(c, vec3(0.898, 0.078, 0.180), ring * (0.75 + 0.15 * sin(hold)));
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "stamp, not smash: red 50 hit, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.46);
    float star = cStar4(q, 0.14);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.953, 0.702, 0.420), star * 0.45);
    return mix(c, vec3(0.898, 0.078, 0.180), cLine(length(q) - 0.08, 2.2));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "CHECKMATE / 50 plate: paper fill, #e5142e stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.24)) * vec2(2.1, 3.6);
    float d = max(abs(q.x) - 0.52, abs(q.y) - 0.18);
    vec3 c = mix(vec3(0.820, 0.784, 0.725), vec3(0.898, 0.078, 0.180), cLine(d, 2.0));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "aisle ellipse: cream glue, sit-desk hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.42)) / vec2(0.20, 0.28);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.420, 0.400, 0.392) * (0.82 + 0.12 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the 50 stamp frame only",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float stamp = 1.0 - cAA(length(p - vec2(0.58, 0.46)), 0.10);
    return mix(c, cInvert(c), stamp * 0.55);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Lerche print: cool fluoro, single saturated reds",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.110, 0.078, 0.086), vec3(0.776, 0.839, 0.800), L);
    float red = smoothstep(0.08, 0.24, col.r - max(col.g, col.b));
    return mix(mix(col, grey, 0.28), col * vec3(1.06, 0.94, 0.94), red);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "after-class dusk: board stays green, fluoro dies",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.165, 0.141, 0.122), col, smoothstep(0.04, 0.22, L));
    return mix(lifted, lifted * vec3(1.08, 0.92, 0.78), smoothstep(0.50, 0.82, L) * 0.40);
  }`, "gradeNight(worldPlate(p, t))");

export const paperFifty = M("paperFifty", F, "exam card: ivory, foil rule, circled 50 #e5142e",
  `vec3 paperFifty(vec2 p, float t){
    vec2 q = (p - vec2(0.56, 0.44)) * vec2(2.8, 3.4);
    float d = max(abs(q.x) - 0.34, abs(q.y) - 0.44);
    vec3 paper = vec3(0.820, 0.784, 0.725);
    paper = mix(paper, vec3(0.725, 0.690, 0.643), cLine(fract(q.y * 9.0) - 0.5, 0.9) * 0.35);
    float circ = cLine(length(q - vec2(0.08, 0.12)) - 0.14, 1.8);
    paper = mix(paper, vec3(0.898, 0.078, 0.180), circ);
    return mix(worldPlate(p, t), paper, cFill(d));
  }`, "paperFifty(p, t)");

export const halfLidEye = M("halfLidEye", F, "money frame ~6.9s: heavy lid, quiet iris, one fluoro catch",
  `vec3 halfLidEye(vec2 p, float t){
    float hold = floor(t * 8.0);
    vec3 skin = castSkin(p, hold);
    vec2 eye = vec2(0.78, 0.54);
    float ball = cFill(length((p - eye) / vec2(0.055, 0.028)) - 1.0);
    float lid = cFill(length((p - eye - vec2(0.0, 0.012)) / vec2(0.058, 0.016)) - 1.0);
    float iris = cFill(length((p - eye - vec2(0.004, -0.003)) / vec2(0.018, 0.015)) - 1.0);
    skin = mix(skin, vec3(0.800, 0.765, 0.725), ball);
    skin = mix(skin, vec3(0.220, 0.161, 0.141), iris);
    skin = mix(skin, castSkin(p, hold) * 0.82, lid * 0.92);
    float glint = cFill(length((p - vec2(0.790, 0.548)) / vec2(0.007, 0.004)) - 1.0);
    skin = mix(skin, vec3(0.706, 0.765, 0.725), glint);
    return mix(worldPlate(p, t), skin, cCover(p));
  }`, "halfLidEye(p, t)");

export const anhsBoard = M("anhsBoard", F, "board #2a4a32, chalk tooth, circled 50 in chalk-red",
  `vec3 anhsBoard(vec2 p, float t){
    vec2 q = (p - vec2(0.28, 0.58)) * vec2(1.8, 2.4);
    float d = max(abs(q.x) - 0.48, abs(q.y) - 0.32);
    vec3 board = mix(vec3(0.141, 0.251, 0.173), vec3(0.196, 0.333, 0.227), cVn(q * 14.0));
    float chalk = cLine(q.y + 0.12 * sin(q.x * 5.0), 1.2) * (1.0 - cAA(abs(q.x), 0.36));
    board = mix(board, vec3(0.776, 0.800, 0.757), chalk * 0.45);
    float fifty = cLine(length(q - vec2(0.10, 0.04)) - 0.10, 1.6);
    board = mix(board, vec3(0.820, 0.220, 0.259), fifty);
    return mix(worldPlate(p, t), board, cFill(d));
  }`, "anhsBoard(p, t)");

export const beechDesk = M("beechDesk", F, "sit desk: beech top, pencil rail, eraser pink, aisle recede",
  `vec3 beechDesk(vec2 p, float t){
    float top = max(abs(p.y - 0.30) - 0.045, abs(p.x - 0.52) - 0.28);
    vec3 wood = mix(vec3(0.400, 0.275, 0.176), vec3(0.686, 0.549, 0.353), cAA(cVn(p * 18.0), 0.5));
    float rail = cLine(p.y - 0.268, 1.4) * (1.0 - cAA(abs(p.x - 0.52), 0.26));
    wood = mix(wood, vec3(0.220, 0.196, 0.176), rail * 0.7);
    float eras = length(p - vec2(0.68, 0.31)) - 0.018;
    wood = mix(wood, vec3(0.745, 0.455, 0.490), cFill(eras));
    return mix(worldPlate(p, t), wood, cFill(top));
  }`, "beechDesk(p, t)");

export const messyFringe = M("messyFringe", F, "dark-brown fringe: seven broken strands over the brow",
  `vec3 messyFringe(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castSkin(p, t), cCover(p));
    float fringe = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 a = vec2(0.56 + fi * 0.044, 0.72);
      vec2 b = vec2(0.58 + fi * 0.046 + (cH21(vec2(fi, 3.0)) - 0.5) * 0.05, 0.50);
      vec2 ab = b - a;
      float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
      fringe = max(fringe, cFill(length(p - a - ab * h) - 0.014));
    }
    float mass = cFill(length((p - vec2(0.70, 0.70)) / vec2(0.22, 0.11)) - 1.0) * cAA(p.y, 0.58);
    vec3 hair = mix(vec3(0.149, 0.102, 0.090), vec3(0.333, 0.220, 0.161), cAA(cNdL(p), 0.78) * 0.4);
    return mix(c, hair, max(fringe, mass) * cCover(p));
  }`, "messyFringe(p, t)");

export const checkmateGrid = M("checkmateGrid", F, "chess overlay 7.3–8.9s: 8x8, CHECKMATE on the board",
  `vec3 checkmateGrid(vec2 p, float t){
    vec2 q = (p - vec2(0.36, 0.36)) * 8.2;
    vec2 id = floor(q);
    float sq = mod(id.x + id.y, 2.0);
    float inside = step(0.0, id.x) * step(id.x, 7.0) * step(0.0, id.y) * step(id.y, 7.0);
    vec3 dark = vec3(0.165, 0.141, 0.176), lite = vec3(0.706, 0.659, 0.608);
    vec3 grid = mix(dark, lite, sq);
    return mix(worldPlate(p, t), grid, inside * 0.72);
  }`, "checkmateGrid(p, t)");

export const chabaHair = M("chabaHair", F, "Chabashira silhouette: long purple hair, no copied face",
  `vec3 chabaHair(vec2 p, float t){
    vec2 q = p - vec2(0.22, 0.48);
    float body = length(q / vec2(0.07, 0.22)) - 1.0;
    float hair = length((p - vec2(0.20, 0.62)) / vec2(0.10, 0.16)) - 1.0;
    float fall = max(abs(p.x - 0.16) - 0.03, abs(p.y - 0.40) - 0.18);
    vec3 sil = vec3(0.220, 0.161, 0.373);
    float m = max(cFill(body), max(cFill(hair), cFill(fall)));
    return mix(worldPlate(p, t), sil, m * 0.88);
  }`, "chabaHair(p, t)");

export const fluoroTube = M("fluoroTube", F, "ceiling tubes: two bars #c6d6cc, dim housing, no bloom bloom",
  `vec3 fluoroTube(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float a = cLine(abs(p.y - 0.90) - 0.012, 2.4) * (1.0 - cAA(abs(p.x - 0.34), 0.22));
    float b = cLine(abs(p.y - 0.90) - 0.012, 2.4) * (1.0 - cAA(abs(p.x - 0.72), 0.22));
    return mix(c, vec3(0.776, 0.839, 0.800), max(a, b) * 0.80);
  }`, "fluoroTube(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  paperFifty, halfLidEye, anhsBoard, beechDesk, messyFringe, checkmateGrid, chabaHair, fluoroTube,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-planimeter cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
