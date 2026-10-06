// Stash pack for p-nerve — Death Note rooftop / Madhouse tenebrism.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-nerve";

export const worldPlate = M("worldPlate", F, "rooftop night: sky #07070d, underglow #5a2f2a, rim teal #2f7f86",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.4) * 0.04, 0.0, 1.0);
    vec3 sky = vec3(0.027, 0.027, 0.051), cloud = vec3(0.102, 0.071, 0.125), under = vec3(0.353, 0.184, 0.165);
    vec3 c = mix(sky, cloud, cAA(cFbm(p * 3.0), 0.55) * smoothstep(0.45, 0.85, y));
    return mix(c, under, cAA(y, 0.22) * (1.0 - cAA(y, 0.38)) * 0.45);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "wet-stone hatch: teal-grey toner, desaturated",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y, 0.36);
    return mix(c, c * vec3(0.72, 0.78, 0.80), cHatch(gl_FragCoord.xy, 5.8) * shade * 0.7);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Light-seal skin: spotlight #f4efe3, cool terminator",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.46, 0.78, vec3(0.220, 0.125, 0.133), vec3(0.627, 0.478, 0.420), vec3(0.886, 0.820, 0.753));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "notebook-black coat #0f0f12, chain #5b6bff sliver",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.28, 0.62, vec3(0.059, 0.059, 0.071), vec3(0.125, 0.125, 0.145), vec3(0.290, 0.302, 0.333));
    float chain = cLine(abs(p.x - 0.68) - 0.01, 1.4) * (1.0 - cAA(abs(p.y - 0.48), 0.12));
    return mix(c, vec3(0.357, 0.420, 1.000), chain * 0.65);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Madhouse warm-black #1c1816, 1.8px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.8);
    vec3 c = mix(vec3(0.110, 0.094, 0.086), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.110, 0.094, 0.086), lip), p, t, 4.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "shinigami realm gap: 24 radial lines, 3 red apples, ash plate",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.58); float a = atan(q.y, q.x), r = length(q);
    float rays = cLine(fract(a / 0.261799) - 0.5, 1.1) * (1.0 - cAA(r, 0.34));
    vec3 c = mix(vec3(0.102, 0.102, 0.094), vec3(0.561, 0.553, 0.525), cAA(cFbm(q * 3.0), 0.5));
    c = mix(c, vec3(0.812, 0.812, 0.812), rays * 0.45);
    float apple = length(q - vec2(0.08, 0.04)) - 0.03;
    c = mix(c, vec3(0.702, 0.122, 0.102), cFill(apple));
    return mix(worldPlate(p, t), c, cAA(0.36 - r, 0.0));
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "SHING slash + DONG rim pulse, red/ivory, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.40);
    float slash = abs(dot(q, normalize(vec2(0.85, 0.53)))) - 0.012;
    float star = cStar4(q, 0.18);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.886, 0.820, 0.753), star * 0.55);
    return mix(c, vec3(0.702, 0.090, 0.122), cLine(slash, 2.2));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "KUKUKU / DONG / RIP plate: ivory fill, #8a1219 stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.28)) * vec2(2.0, 3.4);
    float d = max(abs(q.x) - 0.50, abs(q.y) - 0.20);
    vec3 c = mix(vec3(0.886, 0.820, 0.753), vec3(0.541, 0.071, 0.098), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "floodlight ellipse: haze #1b1018 glue, spotlight hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.40)) / vec2(0.18, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.106, 0.063, 0.094) * (0.8 + 0.15 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on SHING / CRUNCH impact frames",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float slash = 1.0 - cAA(abs(dot(p - vec2(0.50, 0.40), vec2(0.85, 0.53))), 0.05);
    return mix(c, cInvert(c), slash * 0.8);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Madhouse print: desat teal-grey, single saturated reds",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.110, 0.094, 0.086), vec3(0.722, 0.745, 0.745), L);
    float red = smoothstep(0.08, 0.22, col.r - max(col.g, col.b));
    return mix(mix(col, grey, 0.55), col * vec3(1.08, 0.92, 0.92), red);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "tenebrism grade: deep blacks lifted off ink, shaft #f4efe3",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(CUT_INK * 1.35, col, smoothstep(0.03, 0.20, L));
    return mix(lifted, lifted * vec3(1.04, 1.00, 0.92), smoothstep(0.55, 0.88, L) * 0.35);
  }`, "gradeNight(worldPlate(p, t))");

export const roofTenebra = M("roofTenebra", F, "wet roof cards: stone #8d9498 / #21282c, rain-gated shaft",
  `vec3 roofTenebra(vec2 p, float t){
    float tile = cVn(p * 10.0);
    vec3 stone = mix(vec3(0.129, 0.157, 0.173), vec3(0.553, 0.580, 0.596), cAA(tile, 0.5));
    float wet = cLine(fract(p.y * 16.0 + cFbm(p * 4.0)) - 0.5, 1.1);
    stone = mix(stone, vec3(0.812, 0.902, 0.902), wet * 0.25);
    float shaft = exp(-pow((p.x - 0.72) / 0.12, 2.0)) * cAA(p.y, 0.30);
    vec3 c = mix(worldPlate(p, t), stone, 1.0 - cAA(p.y, 0.36));
    return mix(c, vec3(0.886, 0.820, 0.753), shaft * 0.35);
  }`, "roofTenebra(p, t)");

export const ryukApple = M("ryukApple", F, "apple handoff: #d21f1a body, #ff6a5a hi, stem umber",
  `vec3 ryukApple(vec2 p, float t){
    vec2 q = p - vec2(0.80, 0.50);
    float d = length(q / vec2(0.045, 0.05)) - 1.0;
    vec3 c = mix(vec3(0.478, 0.051, 0.059), vec3(0.824, 0.122, 0.102), cAA(-q.x + q.y, 0.0));
    c = mix(c, vec3(0.847, 0.416, 0.353), cAA(-length(q - vec2(-0.015, 0.02)), -0.01) * 0.5);
    float stem = max(abs(q.x) - 0.006, abs(q.y - 0.06) - 0.02);
    c = mix(c, vec3(0.227, 0.145, 0.078), cFill(stem));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "ryukApple(p, t)");

export const notePage = M("notePage", F, "Death Note page: ivory, foil rule, four stroke ticks",
  `vec3 notePage(vec2 p, float t){
    vec2 q = (p - vec2(0.62, 0.42)) * vec2(2.6, 3.2);
    float d = max(abs(q.x) - 0.38, abs(q.y) - 0.48);
    vec3 paper = vec3(0.886, 0.820, 0.753);
    float rule = cLine(fract(q.y * 8.0) - 0.5, 1.0);
    paper = mix(paper, vec3(0.788, 0.804, 0.820), rule * 0.4);
    float stroke = cLine(q.y + 0.2 * sin(q.x * 6.0) + 0.1, 1.4) * (1.0 - cAA(abs(q.x), 0.28));
    paper = mix(paper, vec3(0.110, 0.094, 0.086), stroke * 0.7);
    return mix(worldPlate(p, t), paper, cFill(d));
  }`, "notePage(p, t)");

export const bellBronze = M("bellBronze", F, "belfry bell: #c58a3a / #7a4f1e, rim pulse, glint #ffe3a0",
  `vec3 bellBronze(vec2 p, float t){
    vec2 q = p - vec2(0.78, 0.72);
    float d = max(abs(q.x) - 0.07 + q.y * 0.15, abs(q.y) - 0.10);
    vec3 c = cCel3(cNdL(p), 0.36, 0.68, vec3(0.478, 0.310, 0.118), vec3(0.773, 0.541, 0.227), vec3(0.847, 0.690, 0.400));
    float pulse = cLine(length(q) - 0.12 - 0.02 * sin(t * 3.4), 1.8);
    c = mix(c, vec3(0.886, 0.820, 0.557), pulse * 0.45);
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "bellBronze(p, t)");

export const grainFall = M("grainFall", F, "umber grains heap: 32 / 48 / 64 then 16, bury three hypotheses",
  `vec3 grainFall(vec2 p, float t){
    vec2 id = floor(p * vec2(22.0, 14.0));
    float h = cH21(id + floor(t * 6.0));
    float pile = cAA(1.0 - p.y, 0.55 + h * 0.15);
    vec3 grain = mix(vec3(0.290, 0.161, 0.102), vec3(0.478, 0.290, 0.165), h);
    vec3 c = mix(worldPlate(p, t), grain, pile * step(0.35, h));
    return c;
  }`, "grainFall(p, t)");

export const beadGauge = M("beadGauge", F, "four gauges: three die, fourth flares #4aa8ff 4-point star",
  `vec3 beadGauge(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 4; i++) {
      float x = 0.42 + float(i) * 0.08;
      vec2 q = p - vec2(x, 0.34);
      float d = length(q) - 0.018;
      vec3 bead = i < 3 ? vec3(0.702, 0.090, 0.122) : vec3(0.290, 0.659, 1.000);
      c = mix(c, bead, cFill(d));
      if (i == 3) c = mix(c, vec3(0.851, 0.937, 1.000), cStar4(q, 0.04) * 0.7);
    }
    return c;
  }`, "beadGauge(p, t)");

export const pageToLens = M("pageToLens", F, "page raised to lens: ivory card, 0.21 tilt, half-lidded smile frame",
  `vec3 pageToLens(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.46);
    q = mat2(0.978, -0.208, 0.208, 0.978) * q;
    float d = max(abs(q.x) - 0.12, abs(q.y) - 0.16);
    vec3 paper = vec3(0.886, 0.820, 0.753);
    paper = mix(paper, vec3(0.110, 0.094, 0.086), cLine(d, 1.6));
    float text = cLine(fract(q.y * 10.0) - 0.5, 0.9) * (1.0 - cAA(abs(q.x), 0.09));
    paper = mix(paper, vec3(0.110, 0.094, 0.086), text * 0.55);
    return mix(worldPlate(p, t), paper, cFill(d));
  }`, "pageToLens(p, t)");

export const crackWeb = M("crackWeb", F, "hard-white crack web from screens, 24 radials, then cel shards",
  `vec3 crackWeb(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.48);
    float a = atan(q.y, q.x);
    float rad = cLine(fract(a / 0.261799) - 0.5, 1.0) * (1.0 - cAA(length(q), 0.42));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.886, 0.820, 0.753), rad * 0.7);
    vec2 id = floor(p * 7.0);
    float sh = cH21(id);
    float shard = length(fract(p * 7.0) - 0.5) - 0.22;
    return mix(c, mix(vec3(0.553, 0.580, 0.596), vec3(0.886, 0.820, 0.753), sh), cFill(shard) * 0.35);
  }`, "crackWeb(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  roofTenebra, ryukApple, notePage, bellBronze, grainFall, beadGauge, pageToLens, crackWeb,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-nerve cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
