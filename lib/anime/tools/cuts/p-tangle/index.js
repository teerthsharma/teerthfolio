// Stash pack for p-tangle — same Lerche school language at dusk.
// Pink west window is the actor. Navy uniform. Sit / half-lid survive.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-tangle";

export const worldPlate = M("worldPlate", F, "west-window dusk: #f3b36b → pink #e0559b → navy #1d2a52",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.1) * 0.03, 0.0, 1.0);
    vec3 navy = vec3(0.114, 0.165, 0.322), pink = vec3(0.878, 0.333, 0.608), gold = vec3(0.953, 0.702, 0.420);
    vec3 sky = mix(mix(navy, pink, cAA(y, 0.28)), gold, cAA(y, 0.72) * 0.65);
    float pane = cAA(p.x, 0.52) * cAA(y, 0.30);
    vec3 room = vec3(0.196, 0.173, 0.220);
    vec3 c = mix(room, sky, pane);
    float sill = (1.0 - cAA(abs(p.y - 0.30), 0.018)) * cAA(p.x, 0.50);
    return mix(c, vec3(0.353, 0.275, 0.243), sill * 0.7);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "dusk-navy hatch: magenta toner in the unlit aisle only",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = (1.0 - cAA(p.x, 0.52)) * (1.0 - cAA(p.y, 0.40));
    return mix(c, c * vec3(0.72, 0.55, 0.78), cHatch(gl_FragCoord.xy, 6.4) * shade * 0.60);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "dusk-bounce skin: pink fill, cool navy terminator",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    vec3 deep = vec3(0.282, 0.161, 0.259), sss = vec3(0.690, 0.361, 0.439), lit = vec3(0.847, 0.643, 0.580);
    return cCel3(h * 0.70 + 0.12, 0.40, 0.74, deep, sss, lit);
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "navy gakuran #1d2a52, brass buttons, no red blazer",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 navy = cCel3(h, 0.30, 0.66, vec3(0.078, 0.110, 0.220), vec3(0.114, 0.165, 0.322), vec3(0.220, 0.290, 0.478));
    float row = cFill(length(p - vec2(0.76, 0.38)) - 0.012) + cFill(length(p - vec2(0.76, 0.44)) - 0.012);
    return mix(navy, vec3(0.722, 0.580, 0.290), row * 0.75);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "dusk hull #1a1424, 1.4px, pink never blooms the lip",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.4);
    vec3 ink = vec3(0.102, 0.078, 0.141);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 6.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "west-pane flare: pink sheet, gold hinge, no comet",
  `vec3 fxEnergy(vec2 p, float t){
    float sheet = exp(-pow((p.x - 0.78) / 0.10, 2.0)) * cAA(p.y, 0.32) * (1.0 - cAA(p.y, 0.86));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.878, 0.333, 0.608), sheet * 0.45);
    float hinge = cLine(p.x - 0.52, 2.2) * cAA(p.y, 0.30);
    return mix(c, vec3(0.953, 0.702, 0.420), hinge * 0.55);
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "twilight dies: pink collapses to navy, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.78, 0.58);
    float r = length(q);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.114, 0.165, 0.322), (1.0 - cAA(r, 0.22)) * 0.55);
    return mix(c, vec3(0.878, 0.333, 0.608), cLine(r - 0.18, 2.0) * 0.7);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "AFTER CLASS plate: navy fill, pink stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.24, 0.22)) * vec2(2.0, 3.5);
    float d = max(abs(q.x) - 0.56, abs(q.y) - 0.18);
    vec3 c = mix(vec3(0.114, 0.165, 0.322), vec3(0.878, 0.333, 0.608), cLine(d, 2.0));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "sill ellipse: navy glue, west-pane hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.48)) / vec2(0.22, 0.30);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.114, 0.125, 0.196) * (0.80 + 0.16 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the pink pane only",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float pane = cAA(p.x, 0.54) * cAA(p.y, 0.34);
    return mix(c, cInvert(c), pane * 0.50);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "dusk print: cool navy shadows, pink is the only sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.102, 0.078, 0.141), vec3(0.541, 0.478, 0.557), L);
    float pink = smoothstep(0.06, 0.20, col.r - col.g + col.b * 0.15);
    return mix(mix(col, grey, 0.32), col * vec3(1.04, 0.90, 1.02), pink);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "after twilight: navy lift, gold hinge dies",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.114, 0.125, 0.196), col, smoothstep(0.03, 0.20, L));
    return mix(lifted, lifted * vec3(0.92, 0.88, 1.08), smoothstep(0.45, 0.80, L) * 0.35);
  }`, "gradeNight(worldPlate(p, t))");

export const westPinkPane = M("westPinkPane", F, "four west panes: pink sky, mullion navy, gold dust",
  `vec3 westPinkPane(vec2 p, float t){
    vec2 q = (p - vec2(0.74, 0.58)) * vec2(2.4, 2.2);
    float frame = max(abs(q.x) - 0.46, abs(q.y) - 0.38);
    float mx = cLine(abs(q.x) - 0.0, 1.8), my = cLine(abs(q.y) - 0.0, 1.8);
    vec3 sky = mix(vec3(0.114, 0.165, 0.322), vec3(0.878, 0.333, 0.608), cAA(q.y, -0.10));
    sky = mix(sky, vec3(0.953, 0.702, 0.420), cAA(q.y, 0.18) * 0.45);
    sky = mix(sky, vec3(0.114, 0.165, 0.322), max(mx, my) * 0.85);
    return mix(worldPlate(p, t), sky, cFill(frame));
  }`, "westPinkPane(p, t)");

export const navyGakuran = M("navyGakuran", F, "navy wool sit: high collar, brass row, pink rim on the west edge",
  `vec3 navyGakuran(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = mix(worldPlate(p, t), castCloth(p, t), cCover(p) * cAA(0.58 - p.y, 0.0));
    float rim = cAA(h, 0.80) * cAA(p.x, 0.74);
    return mix(c, vec3(0.878, 0.333, 0.608), rim * 0.28 * cCover(p));
  }`, "navyGakuran(p, t)");

export const duskChalk = M("duskChalk", F, "board gone dark: leftover chalk 50, pink bounce only",
  `vec3 duskChalk(vec2 p, float t){
    vec2 q = (p - vec2(0.22, 0.56)) * vec2(2.0, 2.6);
    float d = max(abs(q.x) - 0.40, abs(q.y) - 0.28);
    vec3 board = vec3(0.102, 0.141, 0.149);
    float ghost = cLine(length(q - vec2(0.06, 0.02)) - 0.09, 1.4);
    board = mix(board, vec3(0.690, 0.361, 0.439), ghost * 0.55);
    return mix(worldPlate(p, t), board, cFill(d));
  }`, "duskChalk(p, t)");

export const pinkDeskSpill = M("pinkDeskSpill", F, "beech desk takes the west spill: pink sheet, navy shadow",
  `vec3 pinkDeskSpill(vec2 p, float t){
    float top = max(abs(p.y - 0.28) - 0.04, abs(p.x - 0.48) - 0.30);
    vec3 wood = mix(vec3(0.282, 0.188, 0.161), vec3(0.557, 0.400, 0.282), cVn(p * 16.0));
    float spill = exp(-pow((p.x - 0.68) / 0.16, 2.0));
    wood = mix(wood, vec3(0.690, 0.361, 0.439), spill * 0.40);
    return mix(worldPlate(p, t), wood, cFill(top));
  }`, "pinkDeskSpill(p, t)");

export const afterClassAisle = M("afterClassAisle", F, "empty aisle recede: navy tiles, one pink sliver at the door",
  `vec3 afterClassAisle(vec2 p, float t){
    float y = max(p.y, 0.04);
    float u = (p.x - 0.42) / y;
    float tile = cLine(fract(1.0 / y * 4.0) - 0.5, 1.1) + cLine(abs(u) - 0.22, 1.2);
    vec3 c = mix(vec3(0.141, 0.125, 0.176), vec3(0.220, 0.188, 0.243), cAA(p.y, 0.22));
    c = mix(c, vec3(0.114, 0.165, 0.322), tile * 0.35);
    float door = exp(-pow((p.x - 0.42) / 0.04, 2.0)) * (1.0 - cAA(p.y, 0.34));
    return mix(c, vec3(0.878, 0.333, 0.608), door * 0.40);
  }`, "afterClassAisle(p, t)");

export const navyTieKnot = M("navyTieKnot", F, "navy tie: wedge knot, pink thread catch from the west",
  `vec3 navyTieKnot(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.46);
    float knot = length(q / vec2(0.03, 0.022)) - 1.0;
    float blade = max(abs(q.x) - 0.016 + q.y * 0.12, abs(q.y + 0.08) - 0.10);
    vec3 c = mix(worldPlate(p, t), vec3(0.078, 0.110, 0.220), cFill(min(knot, blade)));
    return mix(c, vec3(0.878, 0.333, 0.608), cAA(cNdL(p), 0.82) * cFill(knot) * 0.35);
  }`, "navyTieKnot(p, t)");

export const blindSlats = M("blindSlats", F, "nine slats cut the pink: navy bars, gold dust between",
  `vec3 blindSlats(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float slat = cLine(fract((p.y - 0.34) * 12.0) - 0.5, 1.6) * cAA(p.x, 0.54) * (1.0 - cAA(p.y, 0.86));
    c = mix(c, vec3(0.114, 0.165, 0.322), slat * 0.80);
    float dust = (1.0 - slat) * cAA(p.x, 0.56) * cAA(p.y, 0.40);
    return mix(c, vec3(0.953, 0.702, 0.420), dust * 0.12);
  }`, "blindSlats(p, t)");

export const twilightLid = M("twilightLid", F, "half-lid in pink bounce: heavier than day, one gold catch",
  `vec3 twilightLid(vec2 p, float t){
    vec3 skin = castSkin(p, t);
    vec2 eye = vec2(0.76, 0.54);
    float ball = cFill(length((p - eye) / vec2(0.050, 0.022)) - 1.0);
    float lid = cFill(length((p - eye - vec2(0.0, 0.010)) / vec2(0.052, 0.014)) - 1.0);
    skin = mix(skin, vec3(0.784, 0.690, 0.706), ball);
    skin = mix(skin, vec3(0.161, 0.125, 0.196), cFill(length(p - eye) - 0.014));
    skin = mix(skin, castSkin(p, t) * 0.78, lid * 0.94);
    skin = mix(skin, vec3(0.953, 0.702, 0.420), cFill(length(p - vec2(0.772, 0.546)) - 0.004));
    return mix(worldPlate(p, t), skin, cCover(p));
  }`, "twilightLid(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  westPinkPane, navyGakuran, duskChalk, pinkDeskSpill, afterClassAisle, navyTieKnot, blindSlats, twilightLid,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-tangle cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
