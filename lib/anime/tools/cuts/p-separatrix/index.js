// Stash pack for p-separatrix — Gold Experience / ladybug.
// Cream coat #e8dcc0, sash #c02838, gold life, not a Diavolo face.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-separatrix";

export const worldPlate = M("worldPlate", F, "fresco plaster #e8dcc0, under-red sketch, gold dust air",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y, 0.0, 1.0);
    float tooth = cFbm(p * 4.2);
    vec3 plaster = mix(vec3(0.784, 0.725, 0.627), vec3(0.847, 0.800, 0.706), tooth);
    vec3 under = vec3(0.702, 0.071, 0.161);
    vec3 c = mix(plaster, vec3(0.353, 0.188, 0.243), cAA(y, 0.78) * 0.25);
    float sketch = cLine(cFbm(p * 6.0 + vec2(0.0, p.x * 2.0)) - 0.52, 1.2);
    return mix(c, under, sketch * 0.22);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "fresco tooth: no speed-line, umber on the shade plaster",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y + cFbm(p * 3.0) * 0.1, 0.44);
    return mix(c, c * vec3(0.82, 0.74, 0.62), cVn(p * 28.0) * shade * 0.35);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Italian warm: gold bounce, green life in the mid, never grey",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.40, 0.74, vec3(0.353, 0.176, 0.188), vec3(0.722, 0.478, 0.400), vec3(0.863, 0.722, 0.608));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "cream coat #e8dcc0, sash #c02838, ladybug brooch sit",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 coat = cCel3(h, 0.32, 0.68, vec3(0.627, 0.580, 0.478), vec3(0.847, 0.800, 0.706), vec3(0.910, 0.863, 0.753));
    float sash = (1.0 - cAA(abs(p.y - 0.44) - 0.03, 0.0)) * cCover(p);
    coat = mix(coat, vec3(0.753, 0.157, 0.220), sash);
    float bug = cFill(length((p - vec2(0.72, 0.48)) / vec2(0.028, 0.022)) - 1.0);
    return mix(coat, vec3(0.851, 0.400, 0.478), bug);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "fresco contour #2a1820, 1.6px, leaf never blooms",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.6);
    vec3 ink = vec3(0.165, 0.094, 0.125);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 3.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "gold life bloom: plant veins, gold sap, cream field",
  `vec3 fxEnergy(vec2 p, float t){
    float vein = abs(cFbm(p * 7.0 + vec2(0.0, p.x * 2.0 + t * 0.15)) - 0.5);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.290, 0.420, 0.220), cAA(0.08 - vein, 0.0) * 0.35);
    return mix(c, vec3(0.784, 0.580, 0.243), cFill(abs(vein) - 0.02) * 0.55);
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "Requiem erase: plaster peels to under-red, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.48);
    float peel = cFbm(q * 5.0 + t * 0.3);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.702, 0.071, 0.161), cAA(peel, 0.58) * (1.0 - cAA(length(q), 0.28)));
    return mix(c, vec3(0.784, 0.580, 0.243), cStar4(q, 0.10) * 0.45);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "GER plate: cream fill, sash-red stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.22)) * vec2(2.1, 3.5);
    float d = max(abs(q.x) - 0.42, abs(q.y) - 0.18);
    vec3 c = mix(vec3(0.910, 0.863, 0.753), vec3(0.753, 0.157, 0.220), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "fresco ellipse: plaster glue, coat-hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.46)) / vec2(0.18, 0.28);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.478, 0.400, 0.353) * (0.80 + 0.14 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "erase invert: under-red shows, luma-safe",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float peel = cAA(cFbm(p * 5.0), 0.58);
    return mix(c, cInvert(c), peel * 0.45);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "fresco print: plaster grey, sash red + gold stay sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.165, 0.094, 0.125), vec3(0.820, 0.765, 0.690), L);
    float sat = smoothstep(0.06, 0.20, max(col.r - col.g, col.r * 0.4 + col.g * 0.3 - col.b));
    return mix(mix(col, grey, 0.34), col * vec3(1.06, 0.96, 0.90), sat);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "colosseum night: plaster lifted, gold hinge",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.165, 0.110, 0.125), col, smoothstep(0.04, 0.22, L));
    return mix(lifted, lifted * vec3(1.08, 0.96, 0.80), smoothstep(0.50, 0.84, L) * 0.32);
  }`, "gradeNight(worldPlate(p, t))");

export const ladybugBrooch = M("ladybugBrooch", F, "ladybug: split ellipse, seven gold dots, sash sit",
  `vec3 ladybugBrooch(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.48);
    float body = length(q / vec2(0.055, 0.042)) - 1.0;
    vec3 c = mix(vec3(0.851, 0.400, 0.478), vec3(0.165, 0.094, 0.125), cLine(q.x, 1.4));
    for (int i = 0; i < 7; i++) {
      float a = float(i) * 0.9 - 0.3;
      c = mix(c, vec3(0.784, 0.580, 0.243), cFill(length(q - 0.028 * vec2(cos(a), sin(a) * 0.8)) - 0.007));
    }
    return mix(worldPlate(p, t), c, cFill(body));
  }`, "ladybugBrooch(p, t)");

export const creamCoatFold = M("creamCoatFold", F, "cream wool fold: two creases, sash peek, no satin",
  `vec3 creamCoatFold(vec2 p, float t){
    float h = cNdL(p);
    vec3 coat = cCel3(h, 0.32, 0.68, vec3(0.627, 0.580, 0.478), vec3(0.847, 0.800, 0.706), vec3(0.910, 0.863, 0.753));
    float crease = cLine(p.x - 0.70 - 0.03 * sin(p.y * 9.0), 1.5);
    coat = mix(coat, coat * vec3(0.82, 0.78, 0.70), crease * 0.40);
    return mix(worldPlate(p, t), coat, cCover(p) * cAA(0.62 - p.y, 0.0));
  }`, "creamCoatFold(p, t)");

export const goldLifeBloom = M("goldLifeBloom", F, "life burst: gold petals from a point, green vein cores",
  `vec3 goldLifeBloom(vec2 p, float t){
    vec2 q = p - vec2(0.60, 0.46);
    float a = atan(q.y, q.x), r = length(q);
    float petal = cLine(fract(a / 0.785398) - 0.5, 1.4) * (1.0 - cAA(r, 0.22));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.784, 0.580, 0.243), petal * 0.65);
    return mix(c, vec3(0.290, 0.478, 0.282), cFill(r - 0.04) * 0.55);
  }`, "goldLifeBloom(p, t)");

export const requiemErase = M("requiemErase", F, "plaster → under-red → gold back: three registers",
  `vec3 requiemErase(vec2 p, float t){
    float n = cFbm(p * 4.5);
    vec3 plaster = vec3(0.847, 0.800, 0.706);
    vec3 red = vec3(0.702, 0.071, 0.161);
    vec3 gold = vec3(0.784, 0.580, 0.243);
    vec3 c = mix(plaster, red, cAA(n, 0.48));
    c = mix(c, gold, cAA(n, 0.72) * 0.55);
    return mix(worldPlate(p, t), c, 1.0 - cVig(p, 0.55));
  }`, "requiemErase(p, t)");

export const beetleWing = M("beetleWing", F, "elytra: cream-gold shell, sash-red spots, split",
  `vec3 beetleWing(vec2 p, float t){
    vec2 q = p - vec2(0.68, 0.50);
    float wing = length(q / vec2(0.12, 0.07)) - 1.0;
    vec3 shell = mix(vec3(0.784, 0.580, 0.243), vec3(0.910, 0.863, 0.753), cAA(q.x, 0.0));
    shell = mix(shell, vec3(0.753, 0.157, 0.220), cFill(length(q - vec2(0.04, 0.01)) - 0.018));
    shell = mix(shell, vec3(0.165, 0.094, 0.125), cLine(q.x, 1.3));
    return mix(worldPlate(p, t), shell, cFill(wing));
  }`, "beetleWing(p, t)");

export const lifeSprout = M("lifeSprout", F, "sprout from stone: green stem, gold bud, plaster crack",
  `vec3 lifeSprout(vec2 p, float t){
    vec2 q = p - vec2(0.54, 0.32);
    float stem = max(abs(q.x - 0.02 * sin(q.y * 14.0)) - 0.008, abs(q.y + 0.06) - 0.10);
    float bud = length(q - vec2(0.0, 0.06)) - 0.028;
    vec3 c = mix(worldPlate(p, t), vec3(0.290, 0.420, 0.220), cFill(stem));
    c = mix(c, vec3(0.784, 0.580, 0.243), cFill(bud));
    float crack = cLine(q.x + q.y * 0.3, 1.2);
    return mix(c, vec3(0.165, 0.094, 0.125), crack * 0.35 * (1.0 - cAA(p.y, 0.36)));
  }`, "lifeSprout(p, t)");

export const sashKnot = M("sashKnot", F, "sash #c02838: knot bow, cream gap, gold pin",
  `vec3 sashKnot(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.44);
    float knot = length(q / vec2(0.04, 0.03)) - 1.0;
    float left = length((q - vec2(-0.06, 0.0)) / vec2(0.05, 0.025)) - 1.0;
    float right = length((q - vec2(0.06, 0.0)) / vec2(0.05, 0.025)) - 1.0;
    vec3 sash = vec3(0.753, 0.157, 0.220);
    vec3 c = mix(worldPlate(p, t), sash, max(cFill(knot), max(cFill(left), cFill(right))));
    return mix(c, vec3(0.784, 0.580, 0.243), cFill(length(q) - 0.012));
  }`, "sashKnot(p, t)");

export const gerArrow = M("gerArrow", F, "Requiem arrow: gold shaft, cream fletch, sash-red tip",
  `vec3 gerArrow(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.52);
    q = mat2(0.92, -0.39, 0.39, 0.92) * q;
    float shaft = max(abs(q.y) - 0.008, abs(q.x) - 0.16);
    float tip = max(q.x - 0.16, abs(q.y) * 2.2 + q.x - 0.22);
    float fletch = max(abs(q.x + 0.14) - 0.03, abs(q.y) - 0.03);
    vec3 c = mix(worldPlate(p, t), vec3(0.784, 0.580, 0.243), cFill(shaft));
    c = mix(c, vec3(0.753, 0.157, 0.220), cFill(tip));
    return mix(c, vec3(0.910, 0.863, 0.753), cFill(fletch));
  }`, "gerArrow(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  ladybugBrooch, creamCoatFold, goldLifeBloom, requiemErase, beetleWing, lifeSprout, sashKnot, gerArrow,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-separatrix cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
