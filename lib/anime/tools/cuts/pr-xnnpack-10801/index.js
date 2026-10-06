// Stash pack for pr-xnnpack-10801 — Pierrot Bleach 2000s.
// White haori, glasses, desert #f4e8c8, sky #0a0614, kyoka snap.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-xnnpack-10801";

export const worldPlate = M("worldPlate", F, "Las Noches: desert #f4e8c8 floor, sky #0a0614, dome ribs",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y, 0.0, 1.0);
    vec3 sky = vec3(0.039, 0.024, 0.078), desert = vec3(0.957, 0.910, 0.784), haze = vec3(0.557, 0.478, 0.420);
    vec3 c = mix(desert, haze, cAA(y, 0.34));
    c = mix(c, sky, cAA(y, 0.42));
    float rib = cLine(fract((p.x - 0.5) * 5.0 + (y - 0.5) * 1.4) - 0.5, 1.4) * cAA(y, 0.46);
    return mix(c, vec3(0.165, 0.125, 0.196), rib * 0.35);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "desert grain: umber toner on the floor only, no manga cross",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float floorc = 1.0 - cAA(p.y, 0.36);
    float grain = cVn(p * 22.0);
    return mix(c, c * vec3(0.82, 0.74, 0.62), cAA(grain, 0.58) * floorc * 0.45);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Pierrot pale: cool desert bounce, glasses shadow across the eye",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    vec3 skin = cCel3(h, 0.40, 0.74, vec3(0.353, 0.227, 0.243), vec3(0.706, 0.557, 0.502), vec3(0.847, 0.757, 0.690));
    float shade = cAA(abs(p.y - 0.55), 0.0) * (1.0 - cAA(abs(p.y - 0.55), 0.03)) * cCover(p);
    return mix(skin, skin * vec3(0.72, 0.70, 0.78), shade * 0.55);
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "white haori: cream not white-out, black sash, teal lining sliver",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 haori = cCel3(h, 0.32, 0.68, vec3(0.557, 0.525, 0.478), vec3(0.784, 0.757, 0.706), vec3(0.886, 0.863, 0.820));
    float sash = (1.0 - cAA(abs(p.y - 0.40), 0.025)) * cCover(p);
    haori = mix(haori, vec3(0.110, 0.094, 0.125), sash);
    float lining = cLine(p.x - 0.64, 1.6) * cCover(p) * (1.0 - cAA(p.y, 0.52));
    return mix(haori, vec3(0.220, 0.420, 0.502), lining * 0.45);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Pierrot hull #1c1824, 1.8px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.8);
    vec3 ink = vec3(0.110, 0.094, 0.141);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 5.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "kyoka rings: shatter glass, teal/ivory, desert stays",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.50);
    float r = length(q);
    float rings = cLine(fract(r * 8.0 - t * 0.6) - 0.5, 1.3) * (1.0 - cAA(r, 0.38));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.498, 0.690, 0.757), rings * 0.55);
    return mix(c, vec3(0.847, 0.800, 0.690), cStar4(q, 0.08) * 0.40);
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "kyoka snap: sword slash + glass star, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.44);
    float slash = abs(dot(q, normalize(vec2(0.92, 0.38)))) - 0.008;
    float star = cStar4(q, 0.16);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.627, 0.745, 0.784), star * 0.50);
    return mix(c, vec3(0.353, 0.478, 0.627), cLine(slash, 2.4));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "KYOKA plate: desert fill, ink #1c1824 stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.22)) * vec2(2.0, 3.5);
    float d = max(abs(q.x) - 0.54, abs(q.y) - 0.18);
    vec3 c = mix(vec3(0.957, 0.910, 0.784), vec3(0.110, 0.094, 0.141), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "throne ellipse: desert glue, rising-seat hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.68, 0.40)) / vec2(0.20, 0.30);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.420, 0.361, 0.314) * (0.75 + 0.18 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "illusion invert on the snap frame, luma-safe",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float snap = 1.0 - cAA(abs(dot(p - vec2(0.58, 0.44), vec2(0.92, 0.38))), 0.06);
    return mix(c, cInvert(c), snap * 0.75);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Pierrot 2000s: pale desert, teal is the only sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.110, 0.094, 0.141), vec3(0.784, 0.745, 0.690), L);
    float teal = smoothstep(0.06, 0.18, col.b - col.r);
    return mix(mix(col, grey, 0.30), col * vec3(0.94, 1.02, 1.08), teal);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "Las Noches night: sky stays #0a0614, desert lifted",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.039, 0.024, 0.078) * 1.8, col, smoothstep(0.03, 0.24, L));
    return mix(lifted, lifted * vec3(1.04, 0.98, 0.90), smoothstep(0.55, 0.86, L) * 0.28);
  }`, "gradeNight(worldPlate(p, t))");

export const lasNochesVault = M("lasNochesVault", F, "dome ribs: five arcs, pale stone, night between",
  `vec3 lasNochesVault(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 q = p - vec2(0.20 + fi * 0.16, 0.22);
      float arc = abs(length(q) - 0.42) - 0.012;
      c = mix(c, vec3(0.690, 0.627, 0.557), cFill(arc) * cAA(p.y, 0.40));
    }
    return c;
  }`, "lasNochesVault(p, t)");

export const missingStep = M("missingStep", F, "throne stair: four treads, the leading gap is the story",
  `vec3 missingStep(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 5; i++) {
      if (i == 1) continue;
      float fi = float(i);
      float y0 = 0.18 + fi * 0.045;
      float d = max(abs(p.y - y0) - 0.012, abs(p.x - 0.50 - fi * 0.03) - 0.16);
      c = mix(c, vec3(0.784, 0.725, 0.627), cFill(d));
    }
    float gap = max(abs(p.y - 0.225) - 0.012, abs(p.x - 0.53) - 0.16);
    return mix(c, vec3(0.039, 0.024, 0.078), cFill(gap) * 0.85);
  }`, "missingStep(p, t)");

export const kyokaSnap = M("kyokaSnap", F, "sword snap: one hard slash, glass shards peel off",
  `vec3 kyokaSnap(vec2 p, float t){
    vec2 q = p - vec2(0.60, 0.46);
    float slash = abs(dot(q, normalize(vec2(0.88, 0.48)))) - 0.006;
    vec3 c = worldPlate(p, t);
    vec2 id = floor(p * 9.0);
    vec2 f = fract(p * 9.0) - 0.5;
    float sh = cH21(id);
    float shard = length(f - (cH22(id) - 0.5) * 0.2) - 0.16;
    c = mix(c, mix(vec3(0.498, 0.627, 0.690), vec3(0.847, 0.800, 0.690), sh), cFill(shard) * 0.40);
    return mix(c, vec3(0.353, 0.478, 0.627), cLine(slash, 2.6));
  }`, "kyokaSnap(p, t)");

export const haoriFold = M("haoriFold", F, "haori sleeve fold: two creases, cream cel, teal lining peek",
  `vec3 haoriFold(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.38);
    float sleeve = length(q / vec2(0.16, 0.08)) - 1.0;
    vec3 cloth = cCel3(cNdL(p), 0.34, 0.66, vec3(0.557, 0.525, 0.478), vec3(0.784, 0.757, 0.706), vec3(0.886, 0.863, 0.820));
    float crease = cLine(q.y - 0.02 * sin(q.x * 10.0), 1.3);
    cloth = mix(cloth, vec3(0.220, 0.420, 0.502), crease * 0.35);
    return mix(worldPlate(p, t), cloth, cFill(sleeve));
  }`, "haoriFold(p, t)");

export const glassRims = M("glassRims", F, "glasses: two ovals, thin ink, one desert catch",
  `vec3 glassRims(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castSkin(p, t), cCover(p));
    float a = length((p - vec2(0.68, 0.54)) / vec2(0.046, 0.028)) - 1.0;
    float b = length((p - vec2(0.78, 0.54)) / vec2(0.046, 0.028)) - 1.0;
    float bridge = max(abs(p.y - 0.54) - 0.004, abs(p.x - 0.73) - 0.022);
    c = mix(c, vec3(0.110, 0.094, 0.141), max(cLine(a, 1.6), max(cLine(b, 1.6), cFill(bridge))));
    return mix(c, vec3(0.847, 0.800, 0.690), cFill(length(p - vec2(0.792, 0.548)) - 0.005));
  }`, "glassRims(p, t)");

export const desertDune = M("desertDune", F, "print dune: #f4e8c8 body, umber wind hatch, no CGI grit",
  `vec3 desertDune(vec2 p, float t){
    float dune = p.y - 0.22 - 0.06 * sin(p.x * 4.0 + cFbm(p * 3.0));
    vec3 sand = mix(vec3(0.627, 0.541, 0.420), vec3(0.957, 0.910, 0.784), cAA(cVn(p * 10.0), 0.5));
    vec3 c = mix(sand, worldPlate(p, t), cAA(dune, 0.0));
    return mix(c, c * vec3(0.78, 0.70, 0.58), cHatch(gl_FragCoord.xy, 8.0) * (1.0 - cAA(dune, 0.0)) * 0.35);
  }`, "desertDune(p, t)");

export const throneRise = M("throneRise", F, "rising seat: pale stone back, missing step below, teal inlay",
  `vec3 throneRise(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.36);
    float back = max(abs(q.x) - 0.14 + q.y * 0.15, abs(q.y) - 0.18);
    vec3 stone = cCel3(cVn(q * 6.0), 0.36, 0.66, vec3(0.478, 0.420, 0.365), vec3(0.706, 0.659, 0.580), vec3(0.820, 0.784, 0.706));
    float inlay = cLine(abs(q.x) - 0.04, 1.4);
    stone = mix(stone, vec3(0.220, 0.420, 0.502), inlay * 0.45);
    return mix(worldPlate(p, t), stone, cFill(back));
  }`, "throneRise(p, t)");

export const shatterKyoka = M("shatterKyoka", F, "illusion peel: cel facets fly, desert shows through",
  `vec3 shatterKyoka(vec2 p, float t){
    vec2 id = floor(p * 7.0);
    vec2 f = fract(p * 7.0) - 0.5;
    float h = cH21(id);
    vec2 off = (cH22(id) - 0.5) * 0.35 * fract(t * 0.25 + h);
    float d = length(f - off) - 0.20;
    vec3 shard = mix(vec3(0.498, 0.627, 0.690), vec3(0.847, 0.800, 0.690), h);
    return mix(worldPlate(p, t), shard, cFill(d) * 0.80);
  }`, "shatterKyoka(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  lasNochesVault, missingStep, kyokaSnap, haoriFold, glassRims, desertDune, throneRise, shatterKyoka,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-xnnpack-10801 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
