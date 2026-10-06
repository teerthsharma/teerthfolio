// Stash pack for pr-highway-3244 — Ufotable Fate/Zero conquest.
// Red cape, gold, smear on kill, never white-out. Wheel owns the right third.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-highway-3244";

export const worldPlate = M("worldPlate", F, "Ufotable road: #2a241f dirt, bruise sky, gold dust hinge",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.0) * 0.03, 0.0, 1.0);
    vec3 road = vec3(0.165, 0.141, 0.122), dust = vec3(0.420, 0.314, 0.243), bruise = vec3(0.478, 0.196, 0.220);
    vec3 gold = vec3(0.784, 0.557, 0.243);
    vec3 c = mix(road, dust, cAA(y, 0.28));
    c = mix(c, bruise, cAA(y, 0.40) * 0.70);
    c = mix(c, gold, cAA(y, 0.58) * (1.0 - cAA(y, 0.68)) * 0.40);
    return mix(c, vec3(0.196, 0.125, 0.176), cAA(y, 0.72) * 0.55);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "road-dust hatch: perspective lanes, umber toner",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float y = max(p.y, 0.04);
    float u = (p.x - 0.50) / y;
    float shade = 1.0 - cAA(p.y, 0.32);
    return mix(c, c * vec3(0.78, 0.68, 0.58), cHatch(vec2(u * 40.0, gl_FragCoord.y), 6.0) * shade * 0.55);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "campaign tan: sunburnt mid, cool road bounce",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.38, 0.72, vec3(0.333, 0.149, 0.125), vec3(0.690, 0.400, 0.282), vec3(0.847, 0.643, 0.478));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "conquest cape #c3122e, gold clasp, wool not satin",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 cape = cCel3(h, 0.30, 0.64, vec3(0.420, 0.047, 0.090), vec3(0.765, 0.071, 0.180), vec3(0.847, 0.282, 0.275));
    float fold = cLine(p.x - 0.68 - 0.04 * sin(p.y * 8.0), 1.8) * cCover(p);
    cape = mix(cape, cape * vec3(0.70, 0.55, 0.55), fold * 0.45);
    float clasp = cFill(length(p - vec2(0.72, 0.58)) - 0.022);
    return mix(cape, vec3(0.784, 0.580, 0.243), clasp);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Ufotable hull #221818, 2.0px, cape never blooms",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 2.0);
    vec3 ink = vec3(0.133, 0.094, 0.094);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 8.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Via Expugnatio gold: army as slice ghosts, not a cavalry mesh",
  `vec3 fxEnergy(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 o = vec2(0.18 + fi * 0.12, 0.34 + 0.03 * sin(fi + t));
      float ghost = length((p - o) / vec2(0.04, 0.09)) - 1.0;
      vec3 col = mix(vec3(0.784, 0.557, 0.243), vec3(0.765, 0.071, 0.180), fract(fi * 0.37));
      c = mix(c, col, cFill(ghost) * 0.40);
    }
    return c;
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "smear on kill: red streak, gold spark, NEVER white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.42);
    float smear = abs(q.y - q.x * 0.15) - 0.018;
    smear += -0.03 * cFbm(q * 6.0 + t);
    float star = cStar4(q, 0.14);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.784, 0.557, 0.243), star * 0.50);
    return mix(c, vec3(0.765, 0.071, 0.180), cFill(smear) * 0.80);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "AAALALALALAI plate: gold fill, cape-red stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.20)) * vec2(1.8, 3.6);
    float d = max(abs(q.x) - 0.58, abs(q.y) - 0.16);
    vec3 c = mix(vec3(0.784, 0.557, 0.243), vec3(0.765, 0.071, 0.180), cLine(d, 2.4));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "road ellipse: umber glue, wheel-right hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.74, 0.38)) / vec2(0.20, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.165, 0.125, 0.110) * (0.80 + 0.14 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the smear only, never a white card",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float smear = 1.0 - cAA(abs((p.y - 0.42) - (p.x - 0.62) * 0.15), 0.05);
    return mix(c, cInvert(c), smear * 0.60);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Ufotable print: warm dust, cape red is the only sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.133, 0.094, 0.094), vec3(0.627, 0.525, 0.439), L);
    float red = smoothstep(0.08, 0.22, col.r - max(col.g, col.b));
    return mix(mix(col, grey, 0.28), col * vec3(1.08, 0.92, 0.90), red);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "campaign night: lifted umber, gold hinge dies last",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.133, 0.102, 0.090), col, smoothstep(0.04, 0.22, L));
    return mix(lifted, lifted * vec3(1.10, 0.90, 0.78), smoothstep(0.48, 0.82, L) * 0.36);
  }`, "gradeNight(worldPlate(p, t))");

export const gordiusWheel = M("gordiusWheel", F, "wheel mass in the RIGHT third: 8 spokes, iron rim, gold hub",
  `vec3 gordiusWheel(vec2 p, float t){
    vec2 q = p - vec2(0.78, 0.32);
    float r = length(q);
    float rim = cLine(r - 0.14, 2.4);
    float hub = cFill(r - 0.028);
    float spokes = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 d = vec2(cos(a), sin(a));
      spokes = max(spokes, cLine(abs(dot(q, vec2(-d.y, d.x))), 1.3) * (1.0 - cAA(r, 0.14)));
    }
    vec3 iron = vec3(0.243, 0.196, 0.176);
    vec3 c = mix(worldPlate(p, t), iron, max(rim, spokes) * 0.85);
    return mix(c, vec3(0.784, 0.557, 0.243), hub);
  }`, "gordiusWheel(p, t)");

export const conquestCape = M("conquestCape", F, "cape as cloth: hanging mass, wind fold, gold hem",
  `vec3 conquestCape(vec2 p, float t){
    vec2 q = p - vec2(0.60, 0.42);
    float body = length(q / vec2(0.16, 0.24)) - 1.0 + 0.04 * sin(q.y * 10.0 + t);
    vec3 wool = cCel3(cNdL(p), 0.30, 0.64, vec3(0.420, 0.047, 0.090), vec3(0.765, 0.071, 0.180), vec3(0.847, 0.282, 0.275));
    float hem = cLine(q.y + 0.20, 1.8);
    wool = mix(wool, vec3(0.784, 0.557, 0.243), hem * 0.50);
    return mix(worldPlate(p, t), wool, cFill(body));
  }`, "conquestCape(p, t)");

export const ionioiGhost = M("ionioiGhost", F, "Ionioi as slice-overlap: 12 faded riders, gold then cape",
  `vec3 ionioiGhost(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 o = vec2(0.08 + fract(fi * 0.17 + t * 0.02) * 0.84, 0.30 + 0.04 * sin(fi * 1.3));
      float d = length((p - o) / vec2(0.025, 0.055)) - 1.0;
      vec3 col = mix(vec3(0.784, 0.557, 0.243), vec3(0.765, 0.071, 0.180), step(6.0, fi));
      c = mix(c, col, cFill(d) * 0.28);
    }
    return c;
  }`, "ionioiGhost(p, t)");

export const killSmear = M("killSmear", F, "naming smear: elongated red, gold sparkles, no white card",
  `vec3 killSmear(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.46);
    q.x *= 0.35;
    float d = length(q) - 0.08;
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.765, 0.071, 0.180), cFill(d) * 0.75);
    float spark = cStar4(p - vec2(0.72, 0.48), 0.06) + cStar4(p - vec2(0.50, 0.40), 0.04);
    return mix(c, vec3(0.784, 0.557, 0.243), spark * 0.55);
  }`, "killSmear(p, t)");

export const roadDust = M("roadDust", F, "perspective road: vanishing u=x/y, two ruts, dust fbm",
  `vec3 roadDust(vec2 p, float t){
    float y = max(p.y, 0.03);
    float u = (p.x - 0.48) / y;
    float rut = min(cLine(abs(u) - 0.16, 1.6), cLine(abs(u + 0.08) - 0.16, 1.6));
    vec3 dirt = mix(vec3(0.165, 0.141, 0.122), vec3(0.420, 0.314, 0.243), cFbm(vec2(u * 3.0, 1.0 / y)));
    vec3 c = mix(worldPlate(p, t), dirt, 1.0 - cAA(p.y, 0.34));
    return mix(c, vec3(0.784, 0.557, 0.243) * 0.55, rut * (1.0 - cAA(p.y, 0.34)) * 0.4);
  }`, "roadDust(p, t)");

export const chariotGold = M("chariotGold", F, "chariot rail: gold body, umber shade, one hard catch",
  `vec3 chariotGold(vec2 p, float t){
    vec2 q = p - vec2(0.64, 0.30);
    float rail = max(abs(q.y) - 0.03, abs(q.x) - 0.18);
    vec3 gold = cCel3(cNdL(p), 0.34, 0.68, vec3(0.420, 0.275, 0.110), vec3(0.784, 0.557, 0.243), vec3(0.847, 0.706, 0.400));
    float spec = pow(max(cNdL(p) - 0.70, 0.0), 2.4);
    gold = mix(gold, vec3(0.847, 0.722, 0.439), spec * 0.5);
    return mix(worldPlate(p, t), gold, cFill(rail));
  }`, "chariotGold(p, t)");

export const viaExpugnatio = M("viaExpugnatio", F, "conquest burst: gold ring + red wedge, smear already named",
  `vec3 viaExpugnatio(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.40);
    float ring = cLine(length(q) - 0.22, 2.2);
    float wedge = max(abs(atan(q.y, q.x)) - 0.4, length(q) - 0.28);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.784, 0.557, 0.243), ring * 0.65);
    return mix(c, vec3(0.765, 0.071, 0.180), cFill(wedge) * 0.45);
  }`, "viaExpugnatio(p, t)");

export const armySlice = M("armySlice", F, "slice-overlap army: instanced ticks, gold then fade",
  `vec3 armySlice(vec2 p, float t){
    vec2 id = floor(p * vec2(16.0, 6.0));
    float h = cH21(id + floor(t * 2.0));
    float tick = cFill(length(fract(p * vec2(16.0, 6.0)) - 0.5) - 0.18);
    vec3 col = mix(vec3(0.478, 0.196, 0.220), vec3(0.784, 0.557, 0.243), h);
    float band = (1.0 - cAA(p.y, 0.38)) * cAA(p.y, 0.22);
    return mix(worldPlate(p, t), col, tick * band * step(0.40, h) * 0.55);
  }`, "armySlice(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  gordiusWheel, conquestCape, ionioiGhost, killSmear, roadDust, chariotGold, viaExpugnatio, armySlice,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-highway-3244 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
