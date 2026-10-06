// Stash pack for p-faraday — A Certain Scientific Railgun (J.C.Staff night city).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-faraday";

export const worldPlate = M("worldPlate", F, "Academy City night: zenith #0a1a66, mid #4a2bc8, horizon #ff5a9d",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.2) * 0.03, 0.0, 1.0);
    vec3 zen = vec3(0.039, 0.102, 0.400), mid = vec3(0.290, 0.169, 0.784), hor = vec3(0.847, 0.353, 0.616);
    return mix(mix(zen, mid, cAA(y, 0.34)), hor, cAA(y, 0.74) * 0.5);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "steel-deck hatch: cool toner on #1d2658 ground",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y, 0.36);
    return mix(c, c * vec3(0.70, 0.74, 0.90), cHatch(gl_FragCoord.xy, 4.8) * shade * 0.7);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Misaka-seal skin: cool night bounce, warm lamp key",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.42, 0.76, vec3(0.282, 0.161, 0.227), vec3(0.690, 0.502, 0.478), vec3(0.886, 0.773, 0.690));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "Tokiwadai vest #f1e2c0, crest #c8342a, steel shadow",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 vest = cCel3(h, 0.32, 0.68, vec3(0.478, 0.373, 0.494), vec3(0.725, 0.627, 0.659), vec3(0.886, 0.820, 0.690));
    float crest = cAA(length(p - vec2(0.72, 0.46)), 0.04);
    return mix(mix(vest, vec3(0.784, 0.204, 0.165), (1.0 - crest) * 0.35), vest, cAA(p.y, 0.40));
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "J.C.Staff hull #1a1f3a, 2.5px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 2.5);
    vec3 c = mix(vec3(0.102, 0.122, 0.227), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.102, 0.122, 0.227), lip), p, t, 6.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "rail beam: core #fff4cf, body #ffb347, edge #e8470a, 55 m/s head",
  `vec3 fxEnergy(vec2 p, float t){
    float y = abs(p.y - 0.48);
    float x = p.x - 0.40;
    float core = 1.0 - cAA(y, 0.018);
    float body = 1.0 - cAA(y, 0.038);
    float glow = exp(-y * y * 80.0) * cAA(x, 0.0);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.847, 0.278, 0.039), body * cAA(x, 0.0));
    c = mix(c, vec3(0.847, 0.702, 0.278), core * cAA(x, 0.0));
    return c + vec3(0.886, 0.820, 0.627) * glow * 0.35;
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "sonic ring 0.6→4 m + KA-DOOM starburst, gold not white",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.42, 0.48); float r = length(q);
    float ring = cLine(r - 0.22, 2.2);
    float star = cStar4(q, 0.20);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.847, 0.663, 0.141), star * 0.75);
    return mix(c, vec3(0.886, 0.820, 0.627), ring * 0.7);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "ZAP / ZZZAAAAP plate: gold fill, navy stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.50, 0.28)) * vec2(2.0, 3.4);
    float d = max(abs(q.x) - 0.58, abs(q.y) - 0.20);
    vec3 c = mix(vec3(0.847, 0.824, 0.227), vec3(0.102, 0.122, 0.227), cLine(d, 2.4));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "glass-deck ellipse: navy glue, coin-side hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.40)) / vec2(0.20, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.059, 0.102, 0.361) * (0.75 + 0.2 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the SHOT flash frames",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float beam = 1.0 - cAA(abs(p.y - 0.48), 0.06);
    return mix(c, cInvert(c), beam * 0.7);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Railgun print: cool shadows, warm amber key",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    return mix(col * vec3(0.88, 0.94, 1.10), col * vec3(1.10, 1.02, 0.86), smoothstep(0.28, 0.74, L));
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "JC Staff night: bloom reserved for beam/moon/lamps",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.039, 0.063, 0.196), col, smoothstep(0.04, 0.24, L));
    return mix(lifted, lifted * vec3(0.90, 0.88, 1.04), smoothstep(0.55, 0.90, L));
  }`, "gradeNight(worldPlate(p, t))");

export const railBeam = M("railBeam", F, "full rail construction: taper SDF + travelling head",
  `vec3 railBeam(vec2 p, float t){
    return fxEnergy(p, t);
  }`, "railBeam(p, t)");

export const coinFlick = M("coinFlick", F, "coin: #ffc34a disc, #7a3a00 stamp, 7 half-turns",
  `vec3 coinFlick(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.46);
    float squish = 0.6 + 0.4 * abs(sin(t * 14.0));
    float d = length(q / vec2(0.045 * squish, 0.045)) - 1.0;
    vec3 c = mix(vec3(0.478, 0.227, 0.000), vec3(0.847, 0.765, 0.290), cAA(-q.x, 0.0));
    float stamp = cLine(length(q) - 0.018, 1.2);
    c = mix(c, vec3(0.478, 0.227, 0.000), stamp);
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "coinFlick(p, t)");

export const fieldCross = M("fieldCross", F, "E×B right-angle ticks: cyan vertical, lilac horizontal, lock",
  `vec3 fieldCross(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.50);
    float v = cLine(abs(q.x) - 0.002, 1.3) * (1.0 - cAA(abs(q.y), 0.22));
    float h = cLine(abs(q.y) - 0.002, 1.3) * (1.0 - cAA(abs(q.x), 0.22));
    float tick = step(0.72, cH21(floor(q * 14.0 + t * 2.0)));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.373, 0.847, 1.000), v * 0.7);
    return mix(c, vec3(0.710, 0.549, 1.000), h * tick * 0.7);
  }`, "fieldCross(p, t)");

export const amberRise = M("amberRise", F, "amber rise: #ffa927 pool climbing the deck before the shot",
  `vec3 amberRise(vec2 p, float t){
    float k = 0.22 + 0.18 * sin(t * 0.7);
    float band = cAA(p.y, k) * (1.0 - cAA(p.y, k + 0.16));
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.847, 0.663, 0.153), band * 0.5);
  }`, "amberRise(p, t)");

export const bushingArc = M("bushingArc", F, "bushing B1: steel 3-step, cyan corona, 18 ticks",
  `vec3 bushingArc(vec2 p, float t){
    vec2 q = p - vec2(0.80, 0.42);
    float d = max(abs(q.x) - 0.03, abs(q.y) - 0.22);
    vec3 steel = cCel3(cNdL(p), 0.34, 0.66, vec3(0.059, 0.176, 0.369), vec3(0.239, 0.408, 0.659), vec3(0.561, 0.698, 0.878));
    float corona = exp(-length(q) * 8.0);
    vec3 c = mix(worldPlate(p, t), steel, cFill(d));
    return c + vec3(0.373, 0.847, 1.000) * corona * 0.35;
  }`, "bushingArc(p, t)");

export const sonicBoom = M("sonicBoom", F, "sonic + 170-bit trail: ring grow, gold bits",
  `vec3 sonicBoom(vec2 p, float t){
    vec2 q = p - vec2(0.42, 0.48); float r = length(q);
    float ring = cLine(r - fract(t * 0.4) * 0.4, 2.0);
    float bits = step(0.82, cH21(floor(q * 30.0))) * (1.0 - cAA(r, 0.4));
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.847, 0.702, 0.278), ring * 0.65);
    return mix(c, vec3(0.886, 0.820, 0.627), bits * 0.4);
  }`, "sonicBoom(p, t)");

export const goldAfterglow = M("goldAfterglow", F, "afterglow + rimGold: face against #ffd23a, heat shimmer",
  `vec3 goldAfterglow(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shim = (cVn(p * 20.0 + t * 3.0) - 0.5) * 0.04;
    float glow = exp(-length(cN(p + vec2(shim, 0.0))) * 6.0);
    c = mix(c, vec3(0.847, 0.824, 0.227), glow * 0.4);
    float rim = cLine(length(cN(p)) - sqrt(0.22), 2.0);
    return mix(c, vec3(0.847, 0.702, 0.278), rim * 0.55 * cCover(p));
  }`, "goldAfterglow(p, t)");

export const imagineBreak = M("imagineBreak", F, "Imagine Breaker: first metre of the beam cancels at the hand",
  `vec3 imagineBreak(vec2 p, float t){
    vec3 beam = fxEnergy(p, t);
    float cancel = 1.0 - cAA(p.x, 0.48);
    return mix(beam, worldPlate(p, t), cancel * 0.85);
  }`, "imagineBreak(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  railBeam, coinFlick, fieldCross, amberRise, bushingArc, sonicBoom, goldAfterglow, imagineBreak,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-faraday cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
