// Stash pack for spawn-seal — Tensura slime-told.
// Blue #3a6a88 / #6ec8e0. Not a human. Chubby pear.
import { defineCut as M } from "../kit.glsl.js";

const F = "spawn-seal";

export const worldPlate = M("worldPlate", F, "cave-pool: deep #3a6a88, film #6ec8e0, never a classroom",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.6 + t * 0.05) * 0.05, 0.0, 1.0);
    vec3 deep = vec3(0.141, 0.196, 0.282), mid = vec3(0.227, 0.416, 0.533), film = vec3(0.400, 0.690, 0.780);
    vec3 c = mix(mix(deep, mid, cAA(y, 0.30)), film, cAA(y, 0.72) * 0.40);
    float caust = cLine(cFbm(vec2(p.x * 4.0, p.y * 8.0 - t * 0.2)) - 0.5, 1.4);
    return mix(c, film, caust * 0.18 * (1.0 - cAA(y, 0.50)));
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "slime film grain: no wool hatch, caustic bands only",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float band = cVn(p * 10.0 + vec2(0.0, t * 0.3));
    return mix(c, c * vec3(0.70, 0.88, 0.94), cAA(band, 0.62) * 0.28);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "NOT human: membrane gel #3a6a88 / #6ec8e0, water-lens",
  `vec3 castSkin(vec2 p, float t){
    vec2 q = cN(p);
    q += 0.03 * vec2(cFbm(p * 3.0 + t * 0.2), cFbm(p * 3.0 + 4.1));
    float ndv = 1.0 - clamp(length(q) / 0.48, 0.0, 1.0);
    return cCel3(ndv, 0.34, 0.70, vec3(0.141, 0.275, 0.353), vec3(0.227, 0.416, 0.533), vec3(0.431, 0.784, 0.878));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "thicker gel body: chubby pear, highlight film, no costume",
  `vec3 castCloth(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.46)) * vec2(1.05, 0.88);
    q += 0.025 * vec2(cFbm(p * 2.4), cFbm(p * 2.4 + 3.0));
    float d = length(q) - 0.22;
    float ndv = 1.0 - clamp(length(q) / 0.24, 0.0, 1.0);
    vec3 gel = cCel3(ndv, 0.32, 0.68, vec3(0.141, 0.275, 0.353), vec3(0.227, 0.416, 0.533), vec3(0.431, 0.784, 0.878));
    float rim = cLine(d, 2.0);
    return mix(gel, vec3(0.620, 0.820, 0.847), rim * 0.45);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "toon hull #1a2836, 1.6px, gel never goes human-ink",
  `vec3 castInk(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.46)) * vec2(1.05, 0.88);
    float d = length(q) - 0.22;
    vec3 ink = vec3(0.102, 0.157, 0.212);
    vec3 c = mix(ink, castCloth(p, t), cFill(d));
    return cSign(mix(c, ink, cLine(d, 1.6)), p, t, 1.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Megiddo shafts: six falling pillars, film not smash",
  `vec3 fxEnergy(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float x = 0.16 + fi * 0.14 + 0.03 * sin(t * 0.7 + fi);
      float shaft = exp(-pow((p.x - x) / 0.018, 2.0)) * cAA(p.y, 0.20);
      c = mix(c, vec3(0.620, 0.820, 0.847), shaft * 0.40);
    }
    return c;
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "Predator bite: maw ring, ivory tooth, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.48);
    float jaw = abs(q.y) - (0.08 + 0.05 * sin(q.x * 10.0 + t));
    float mouth = max(abs(q.x) - 0.20, jaw);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.353, 0.141, 0.196), cFill(mouth) * 0.70);
    float tooth = cFill(length((p - vec2(0.68, 0.54)) * vec2(4.0, 1.8)) - 0.06);
    return mix(c, vec3(0.800, 0.757, 0.690), tooth * cFill(mouth));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "SEAL plate: film fill, deep-blue stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.50, 0.18)) * vec2(2.0, 3.6);
    float d = max(abs(q.x) - 0.46, abs(q.y) - 0.16);
    vec3 c = mix(vec3(0.431, 0.784, 0.878), vec3(0.141, 0.275, 0.353), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "plinth ellipse: cave glue, chubby-pear hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.44)) / vec2(0.20, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.125, 0.161, 0.212) * (0.78 + 0.16 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the maw only",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float maw = 1.0 - cAA(length((p - vec2(0.72, 0.48)) / vec2(0.22, 0.10)), 1.0);
    return mix(c, cInvert(c), maw * 0.55);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Tensura 2024 print: cool gel, film is the only sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.102, 0.157, 0.212), vec3(0.541, 0.627, 0.690), L);
    float cyan = smoothstep(0.06, 0.20, col.b - col.r);
    return mix(mix(col, grey, 0.26), col * vec3(0.92, 1.04, 1.08), cyan);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "cave night: deep #3a6a88 lift, film hinge dies",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.102, 0.157, 0.212), col, smoothstep(0.03, 0.22, L));
    return mix(lifted, lifted * vec3(0.88, 1.02, 1.10), smoothstep(0.48, 0.82, L) * 0.30);
  }`, "gradeNight(worldPlate(p, t))");

export const chubbyBlob = M("chubbyBlob", F, "chubby pear: squat ellipse, offset highlight, not a biped",
  `vec3 chubbyBlob(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.44)) * vec2(1.00, 0.82);
    q.y += 0.02 * sin(t * 1.4);
    float d = length(q) - 0.24;
    float ndv = 1.0 - clamp(length(q) / 0.26, 0.0, 1.0);
    vec3 gel = cCel3(ndv, 0.30, 0.66, vec3(0.141, 0.275, 0.353), vec3(0.227, 0.416, 0.533), vec3(0.431, 0.784, 0.878));
    float hi = cFill(length(q - vec2(-0.07, 0.08)) - 0.05);
    gel = mix(gel, vec3(0.620, 0.820, 0.847), hi * 0.45);
    return mix(worldPlate(p, t), gel, cFill(d));
  }`, "chubbyBlob(p, t)");

export const slimeLens = M("slimeLens", F, "water-lens warp: fbm offset, fresnel rim, cave shows through",
  `vec3 slimeLens(vec2 p, float t){
    vec2 c0 = vec2(0.72, 0.46);
    vec2 q = p - c0;
    q += 0.045 * vec2(cFbm(p * 3.2 + t * 0.2), cFbm(p * 3.2 + 4.1));
    float d = length(q * vec2(1.05, 0.88)) - 0.20;
    float ndv = 1.0 - clamp(length(q) / 0.22, 0.0, 1.0);
    vec3 gel = cCel3(ndv, 0.34, 0.70, vec3(0.141, 0.275, 0.353), vec3(0.227, 0.416, 0.533), vec3(0.431, 0.784, 0.878));
    vec3 col = mix(worldPlate(p, t), gel, cFill(d));
    return mix(col, vec3(0.620, 0.820, 0.847), cLine(d, 2.0) * 0.50);
  }`, "slimeLens(p, t)");

export const predatorMaw = M("predatorMaw", F, "stacked tooth SDF: seven up, seven down, cave-pool gum",
  `vec3 predatorMaw(vec2 p, float t){
    float jaw = abs(p.y - 0.50) - (0.10 + 0.08 * sin(p.x * 8.0 + t));
    float mouth = cFill(max(abs(p.x - 0.72) - 0.32, jaw));
    float teeth = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float x = 0.46 + fi * 0.08;
      float up = length((p - vec2(x, 0.58)) * vec2(3.2, 1.4)) - 0.05;
      float dn = length((p - vec2(x + 0.03, 0.42)) * vec2(3.2, 1.4)) - 0.045;
      teeth = max(teeth, max(cFill(up), cFill(dn)));
    }
    vec3 col = mix(worldPlate(p, t), vec3(0.353, 0.141, 0.196), mouth);
    return mix(col, vec3(0.800, 0.757, 0.690), teeth * mouth);
  }`, "predatorMaw(p, t)");

export const veldoraScroll = M("veldoraScroll", F, "storm-dragon scroll: indigo paper, cyan bolt kana, not a face",
  `vec3 veldoraScroll(vec2 p, float t){
    vec2 q = (p - vec2(0.28, 0.52)) * vec2(2.4, 3.0);
    float d = max(abs(q.x) - 0.22, abs(q.y) - 0.40);
    vec3 paper = vec3(0.165, 0.188, 0.314);
    float bolt = cLine(q.y - 0.2 * sin(q.x * 8.0 + t) - 0.1, 1.5);
    paper = mix(paper, vec3(0.431, 0.784, 0.878), bolt * 0.65);
    return mix(worldPlate(p, t), paper, cFill(d));
  }`, "veldoraScroll(p, t)");

export const plinthBronze = M("plinthBronze", F, "0.85m bronze plinth: written metal, rim #c4a574",
  `vec3 plinthBronze(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.18);
    float d = max(abs(q.x) - 0.16, abs(q.y) - 0.07);
    vec3 bronze = cCel3(cVn(q * 8.0), 0.36, 0.66, vec3(0.333, 0.243, 0.149), vec3(0.557, 0.439, 0.282), vec3(0.769, 0.647, 0.455));
    float rim = cLine(d, 1.8);
    bronze = mix(bronze, vec3(0.769, 0.647, 0.455), rim * 0.55);
    return mix(worldPlate(p, t), bronze, cFill(d));
  }`, "plinthBronze(p, t)");

export const filmHighlight = M("filmHighlight", F, "moving film catch: one oval, #6ec8e0, never a human eye",
  `vec3 filmHighlight(vec2 p, float t){
    vec3 c = chubbyBlob(p, t);
    vec2 h = vec2(0.66 + 0.02 * sin(t), 0.52);
    float hi = cFill(length((p - h) / vec2(0.04, 0.025)) - 1.0);
    return mix(c, vec3(0.431, 0.784, 0.878), hi * 0.70);
  }`, "filmHighlight(p, t)");

export const megiddoShaft = M("megiddoShaft", F, "one named pillar: wide film core, deep edge, cave floor contact",
  `vec3 megiddoShaft(vec2 p, float t){
    float x = 0.48 + 0.02 * sin(t * 0.5);
    float shaft = exp(-pow((p.x - x) / 0.04, 2.0));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.227, 0.416, 0.533), shaft * 0.35);
    c = mix(c, vec3(0.620, 0.820, 0.847), shaft * shaft * 0.45);
    float contact = shaft * (1.0 - cAA(abs(p.y - 0.20), 0.04));
    return mix(c, vec3(0.431, 0.784, 0.878), contact * 0.50);
  }`, "megiddoShaft(p, t)");

export const sealPlaque = M("sealPlaque", F, "SEAL SEAL plaque: bronze card, film letters, 1.2×0.7",
  `vec3 sealPlaque(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.14)) * vec2(2.2, 4.0);
    float d = max(abs(q.x) - 0.48, abs(q.y) - 0.18);
    vec3 bronze = vec3(0.557, 0.439, 0.282);
    float stroke = cLine(d, 2.0);
    bronze = mix(bronze, vec3(0.227, 0.416, 0.533), stroke);
    float bar = cLine(abs(q.y) - 0.04, 1.4) * (1.0 - cAA(abs(q.x), 0.36));
    bronze = mix(bronze, vec3(0.431, 0.784, 0.878), bar * 0.65);
    return mix(worldPlate(p, t), bronze, cFill(d));
  }`, "sealPlaque(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  chubbyBlob, slimeLens, predatorMaw, veldoraScroll, plinthBronze, filmHighlight, megiddoShaft, sealPlaque,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`spawn-seal cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
