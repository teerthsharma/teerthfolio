// Stash pack for p-monodromy — Magi / Sinbad / Baararaq Saiqa.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-monodromy";

export const worldPlate = M("worldPlate", F, "Sindria day plate: zenith #1b57c8, sand #f6ead2, jade sea",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.0) * 0.03, 0.0, 1.0);
    vec3 zen = vec3(0.106, 0.341, 0.784), hor = vec3(0.749, 0.902, 1.000), sand = vec3(0.965, 0.918, 0.824);
    vec3 c = mix(sand, mix(zen, hor, cAA(y, 0.55)), cAA(y, 0.32));
    return c;
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "terrace hatch: warm toner turning cyan as stormRamp",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float storm = smoothstep(0.2, 0.8, fract(t * 0.08));
    vec3 tone = mix(vec3(0.82, 0.78, 0.70), vec3(0.62, 0.70, 0.88), storm);
    return mix(c, c * tone, cHatch(gl_FragCoord.xy, 5.2) * (1.0 - cAA(p.y, 0.40)) * 0.65);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Sinbad-seal skin: warm palace bounce, gold circlet key",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.42, 0.76, vec3(0.282, 0.161, 0.165), vec3(0.690, 0.502, 0.400), vec3(0.886, 0.773, 0.659));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "Sinbad vessels: purple hair #5a2a90, gold #e9b23a, scale teal",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 robe = cCel3(h, 0.32, 0.66, vec3(0.227, 0.102, 0.353), vec3(0.478, 0.247, 0.565), vec3(0.725, 0.541, 0.941));
    vec3 gold = vec3(0.847, 0.698, 0.227);
    return mix(robe, gold, cAA(h, 0.82) * 0.4 + cLine(abs(p.y - 0.50) - 0.02, 1.5) * 0.5);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Magi hull #140f3a, 2.5px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 2.5);
    vec3 c = mix(vec3(0.078, 0.059, 0.227), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.078, 0.059, 0.227), lip), p, t, 7.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Baal bolt: core cream, edge #8fd8ff, tear flips to #fff2c0",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.70);
    float jag = (cVn(vec2(q.y * 14.0, t * 8.0)) - 0.5) * 0.08;
    float d = abs(q.x - jag) - 0.025 * (1.0 - clamp(-q.y, 0.0, 1.0));
    vec3 bolt = mix(vec3(0.043, 0.165, 0.333), vec3(0.561, 0.847, 1.000), cFill(d));
    float tear = cAA(-q.y, 0.15);
    bolt = mix(bolt, vec3(0.886, 0.847, 0.627), tear * cFill(d));
    return mix(worldPlate(p, t), bolt, cFill(d + 0.03));
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "BARARAQ SAIQA starburst + radial crack origin",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.42); float r = length(q);
    float star = cStar4(q, 0.24);
    float crack = 1.0;
    for (int i = 0; i < 5; i++) {
      float a = float(i) * 1.2566; vec2 d = vec2(cos(a), sin(a));
      crack = min(crack, abs(dot(q, vec2(-d.y, d.x))) - 0.008);
    }
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.810, 0.902, 1.000), star * 0.7);
    return mix(c, vec3(0.078, 0.059, 0.227), cFill(crack) * 0.65);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "BARARAQ SAIQA plate: cream #cfe6ff, 6px navy stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.76, 0.78)) * vec2(1.6, 3.0);
    float d = max(abs(q.x) - 0.70, abs(q.y) - 0.18);
    vec3 c = mix(vec3(0.812, 0.902, 1.000), vec3(0.078, 0.059, 0.227), cLine(d, 2.6));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "palace ellipse: sand glue, terrace hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.38)) / vec2(0.20, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.106, 0.188, 0.439) * (0.7 + 0.25 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert — white-on-navy impact frame",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float k = 1.0 - cAA(length(p - vec2(0.50, 0.42)), 0.18);
    return mix(c, cInvert(c), k);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "A-1 print: warm day / cyan storm split",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    return mix(col * vec3(0.90, 0.96, 1.10), col * vec3(1.08, 1.02, 0.88), smoothstep(0.30, 0.72, L));
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "stormRamp grade: warm day crushed to cyan-blue mono",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 storm = mix(vec3(0.039, 0.059, 0.227), vec3(0.122, 0.165, 0.471), smoothstep(0.15, 0.75, L));
    return mix(col, storm, 0.62);
  }`, "gradeNight(worldPlate(p, t))");

export const baalBolt = M("baalBolt", F, "naming bolt: 3 seeds on threes, grow/hold/fade",
  `vec3 baalBolt(vec2 p, float t){
    return fxEnergy(p, t);
  }`, "baalBolt(p, t)");

export const sindriaSea = M("sindriaSea", F, "jade sea #0a7fb4 / #0b5f9a, foam #e8f6ff strokes",
  `vec3 sindriaSea(vec2 p, float t){
    float L = 0.3 + 0.5 * cFbm(p * 3.2 + t * 0.1);
    vec3 wc = mix(vec3(0.043, 0.373, 0.604), vec3(0.039, 0.498, 0.706), cAA(L, 0.45));
    float foam = cLine(fract(p.y * 10.0 + cVn(p * 6.0) * 0.3) - 0.5, 1.2) * (1.0 - cAA(p.y, 0.36));
    return mix(wc, vec3(0.910, 0.965, 1.000), foam * 0.5);
  }`, "sindriaSea(p, t)");

export const stormVortex = M("stormVortex", F, "storm column: 1 rev / 1.5 s, bruise-violet band at strike",
  `vec3 stormVortex(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.55);
    float a = atan(q.y, q.x) + t * 4.188; // 1 rev / 1.5s
    float r = length(q);
    float arm = abs(fract(a / 6.2831853 * 3.0 + r * 2.0) - 0.5);
    vec3 c = mix(vec3(0.039, 0.059, 0.227), vec3(0.122, 0.165, 0.471), cAA(1.0 - r, 0.2));
    c = mix(c, vec3(0.498, 0.784, 1.000), (1.0 - cAA(arm, 0.12)) * 0.45);
    c = mix(c, vec3(0.169, 0.165, 0.420), cAA(p.y, 0.22) * (1.0 - cAA(p.y, 0.36)) * 0.4);
    return c;
  }`, "stormVortex(p, t)");

export const goldVessel = M("goldVessel", F, "gold ring vessels: gather #fff6c2 in the hoop, wreath arcs",
  `vec3 goldVessel(vec2 p, float t){
    vec2 q = cN(p);
    float hoop = abs(length(q) - 0.16) - 0.018;
    vec3 gold = cCel3(cNdL(p), 0.40, 0.72, vec3(0.369, 0.235, 0.047), vec3(0.847, 0.698, 0.227), vec3(0.886, 0.847, 0.627));
    float wreath = cLine(abs(q.y) - 0.06, 1.4) * (1.0 - cAA(abs(q.x), 0.18));
    vec3 c = mix(worldPlate(p, t), gold, cFill(hoop));
    return mix(c, vec3(0.886, 0.847, 0.627), wreath * 0.45);
  }`, "goldVessel(p, t)");

export const lensCrack = M("lensCrack", F, "page-tear crack: 1 main + 5 radial + 2 ring, glints on edges",
  `vec3 lensCrack(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.42);
    float main = abs(q.x * 0.3 + q.y) - 0.01;
    float rings = min(abs(length(q) - 0.12), abs(length(q) - 0.22));
    float d = min(main, rings);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.078, 0.059, 0.227), cFill(d) * 0.55);
    float glint = cStar4(q - vec2(0.08, 0.04), 0.03);
    return mix(c, vec3(0.847, 0.824, 0.627), glint * 0.7);
  }`, "lensCrack(p, t)");

export const sigilSpin = M("sigilSpin", F, "floor + sky sigils: r 1.6 / 2.2, #7fd8ff, spin on threes",
  `vec3 sigilSpin(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.28);
    float a = atan(q.y, q.x) + floor(t * 8.0) / 8.0 * 0.4;
    float r = length(q);
    float ring = cLine(r - 0.16, 2.0);
    float spoke = cLine(abs(fract(a / 0.785398) - 0.5) - 0.08, 1.3) * (1.0 - cAA(r, 0.16));
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.498, 0.847, 1.000), max(ring, spoke) * 0.65);
  }`, "sigilSpin(p, t)");

export const loopShard = M("loopShard", F, "one shard traces a closed loop — the monodromy claim",
  `vec3 loopShard(vec2 p, float t){
    float a = t * 2.2;
    vec2 c0 = vec2(0.50, 0.48) + vec2(cos(a), sin(a * 2.0)) * 0.16;
    float d = length(p - c0) - 0.035;
    vec3 shard = mix(vec3(0.043, 0.165, 0.333), vec3(0.498, 0.784, 1.000), cAA(cNdL(p), 0.5));
    vec3 trail = worldPlate(p, t);
    float path = cLine(length(p - vec2(0.50, 0.48)) - 0.16, 1.6);
    trail = mix(trail, vec3(0.847, 0.698, 0.227), path * 0.35);
    return mix(trail, shard, cFill(d));
  }`, "loopShard(p, t)");

export const manuscriptGold = M("manuscriptGold", F, "gold manuscript frame: 8-point stars, teal/gold dashes",
  `vec3 manuscriptGold(vec2 p, float t){
    vec2 q = abs(p - 0.5);
    float frame = min(cLine(q.x - 0.46, 2.0), cLine(q.y - 0.42, 2.0));
    float dash = step(0.5, fract((p.x + p.y) * 18.0));
    vec3 c = worldPlate(p, t);
    c = mix(c, mix(vec3(0.059, 0.561, 0.541), vec3(0.847, 0.698, 0.227), dash), frame * 0.7);
    float star = cStar4(p - vec2(0.08, 0.90), 0.03) + cStar4(p - vec2(0.92, 0.90), 0.03);
    return mix(c, vec3(0.847, 0.698, 0.227), star * 0.8);
  }`, "manuscriptGold(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  baalBolt, sindriaSea, stormVortex, goldVessel, lensCrack, sigilSpin, loopShard, manuscriptGold,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-monodromy cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
