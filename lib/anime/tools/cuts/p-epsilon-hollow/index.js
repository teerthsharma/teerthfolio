// Stash pack for p-epsilon-hollow — Itachi Tsukuyomi / Graveyard of Efforts.
import { defineCut as M } from "../kit.glsl.js";

const F = "p-epsilon-hollow";

export const worldPlate = M("worldPlate", F, "graveyard set-cel: void #1a0b3d, basalt #231e2a, gold rim",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.6) * 0.05, 0.0, 1.0);
    vec3 voidc = vec3(0.102, 0.043, 0.239), bas = vec3(0.137, 0.118, 0.165), gold = vec3(0.847, 0.710, 0.141);
    vec3 c = mix(bas, voidc, cAA(y, 0.38));
    return mix(c, gold, cAA(y, 0.82) * 0.18);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "basalt hatch: violet toner on stone fill",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(cFbm(p * 3.0), 0.46);
    return mix(c, c * vec3(0.70, 0.62, 0.82), cHatch(gl_FragCoord.xy, 5.0) * shade * 0.7);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Itachi-seal skin: warm lid #f5c58a bounce, cool void fill",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.42, 0.76, vec3(0.239, 0.125, 0.149), vec3(0.690, 0.478, 0.400), vec3(0.886, 0.773, 0.541));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "Uchiha cloak: hull #120a1a, gold trim, never #000",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.28, 0.64, vec3(0.071, 0.039, 0.102), vec3(0.145, 0.094, 0.180), vec3(0.290, 0.196, 0.353));
    float trim = cLine(abs(p.y - 0.48) - 0.02, 1.5);
    return mix(c, vec3(0.847, 0.710, 0.141), trim * 0.7);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Pierrot warm-black #2a1f1d, 1.5px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.5);
    vec3 c = mix(vec3(0.165, 0.122, 0.114), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.165, 0.122, 0.114), lip), p, t, 3.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Totsuka shard: pale #ffe7a8, orange #ff8a1f, Susanoo purple edge",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.62);
    float blade = max(abs(q.x) - 0.03 - (0.08 - q.y) * 0.04, abs(q.y) - 0.22);
    vec3 c = mix(vec3(0.831, 0.322, 0.102), vec3(0.886, 0.800, 0.557), cAA(-q.y, 0.0));
    c = mix(c, vec3(0.478, 0.247, 0.753), cLine(blade, 1.8));
    return mix(worldPlate(p, t), c, cFill(blade));
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "slash burst: first frame Susanoo #7a3fc0, then #e11d2e → #ffb524",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.50);
    float line = abs(dot(q, normalize(vec2(0.62, 0.78)))) - 0.02;
    float open = cAA(abs(dot(q, normalize(vec2(-0.78, 0.62)))), 0.28);
    vec3 edge = mix(vec3(0.478, 0.247, 0.753), vec3(0.882, 0.114, 0.180), cAA(fract(t), 0.2));
    edge = mix(edge, vec3(0.847, 0.710, 0.141), cAA(fract(t), 0.55));
    vec3 c = mix(worldPlate(p, t), vec3(0.949, 0.937, 0.902), open * 0.35);
    return mix(c, edge, cLine(line, 2.4));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "ゴゴゴ / ザシュ plate: cream #f2efe6, hull #120a1a",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.50, 0.24)) * vec2(1.8, 3.2);
    float d = max(abs(q.x) - 0.55, abs(q.y) - 0.20);
    vec3 c = mix(vec3(0.949, 0.937, 0.902), vec3(0.071, 0.039, 0.102), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "north-pole ellipse: void glue, sat-up hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.40)) / vec2(0.20, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.102, 0.043, 0.239) * (0.75 + 0.2 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert — one frame at the slash (f648)",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float hit = 1.0 - cAA(abs(dot(p - 0.5, vec2(0.62, 0.78))), 0.06);
    return mix(c, cInvert(c), hit * 0.85);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Pierrot print: teal accent, gold key, violet fill",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 g = mix(col * vec3(0.92, 1.04, 1.08), col * vec3(1.08, 1.00, 0.86), smoothstep(0.30, 0.74, L));
    return g;
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "Tsukuyomi grade: crimson loft, no lifted blacks",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 a = vec3(0.137, 0.047, 0.082), b = vec3(0.549, 0.129, 0.094);
    return mix(CUT_INK * 1.5, mix(col, mix(a, b, smoothstep(0.2, 0.7, L)), 0.4), smoothstep(0.03, 0.22, L));
  }`, "gradeNight(worldPlate(p, t))");

export const tsukuyomiEye = M("tsukuyomiEye", F, "EPSILON-HOLLOW EYE: iris gold→orange→violet, sclera #0f0517, no #000 pupil",
  `vec3 tsukuyomiEye(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.72); float r = length(q);
    float ang = atan(q.y, q.x);
    vec3 iris = mix(vec3(0.847, 0.627, 0.141), vec3(0.416, 0.141, 0.678), cAA(r, 0.08));
    iris = mix(vec3(0.949, 0.863, 0.478), iris, cAA(r, 0.04));
    float fibre = sin(ang * 24.0 + r * 20.0) * 0.5 + 0.5;
    iris = mix(iris, iris * 0.7, fibre * 0.25);
    vec3 sclera = mix(vec3(0.059, 0.020, 0.090), vec3(0.549, 0.322, 0.161), cAA(r, 0.14));
    vec3 c = mix(sclera, iris, 1.0 - cAA(r, 0.12));
    c = mix(c, vec3(0.078, 0.020, 0.122), 1.0 - cAA(r, 0.025));
    return mix(worldPlate(p, t), c, 1.0 - cAA(r, 0.16));
  }`, "tsukuyomiEye(p, t)");

export const tomoePinwheel = M("tomoePinwheel", F, "three-tomoe pinwheel in iris fibre, 3-frame resolve",
  `vec3 tomoePinwheel(vec2 p, float t){
    vec2 q = p - vec2(0.50, 0.72); float r = length(q), a = atan(q.y, q.x) + t * 2.0;
    float tomoe = 1.0;
    for (int i = 0; i < 3; i++) {
      float ai = a + float(i) * 2.094;
      vec2 u = vec2(cos(ai), sin(ai)) * 0.055;
      tomoe = min(tomoe, length(q - u) - 0.018);
    }
    vec3 c = tsukuyomiEye(p, t);
    return mix(c, vec3(0.078, 0.020, 0.122), cFill(tomoe) * (1.0 - cAA(r, 0.10)));
  }`, "tomoePinwheel(p, t)");

export const gravePlanet = M("gravePlanet", F, "planet of efforts: r 170 plate, gold crescent, teal carve",
  `vec3 gravePlanet(vec2 p, float t){
    vec2 q = p - vec2(0.50, -0.15); float r = length(q);
    float ndl = 0.5 + 0.5 * dot(normalize(vec3(q, 0.2)), vec3(-0.3, 0.6, 0.7));
    vec3 c = cCel3(ndl, 0.36, 0.68, vec3(0.137, 0.118, 0.165), vec3(0.353, 0.290, 0.388), vec3(0.549, 0.420, 0.388));
    float cres = cAA(q.x + q.y * 0.2, 0.05) * (1.0 - cAA(r, 0.62));
    c = mix(c, vec3(0.847, 0.698, 0.353), cres * 0.45);
    float carve = cLine(cFbm(q * 5.0) - 0.55, 1.4);
    c = mix(c, vec3(0.098, 0.902, 0.784), carve * 0.35);
    return mix(worldPlate(p, t), c, 1.0 - cAA(r, 0.64));
  }`, "gravePlanet(p, t)");

export const shardBlade = M("shardBlade", F, "shardDraw: rises from sleeper, pale contour + gold edge",
  `vec3 shardBlade(vec2 p, float t){
    return fxEnergy(p, t);
  }`, "shardBlade(p, t)");

export const petrifyClimb = M("petrifyClimb", F, "stone climbs from feet: basalt grain to 0.4 body",
  `vec3 petrifyClimb(vec2 p, float t){
    float h = cNdL(p);
    vec3 flesh = castSkin(p, t);
    vec3 stone = cCel3(cFbm(p * 10.0), 0.35, 0.65, vec3(0.137, 0.118, 0.165), vec3(0.353, 0.290, 0.388), vec3(0.627, 0.541, 0.439));
    float climb = cAA(1.0 - p.y, 0.42);
    return mix(flesh, stone, climb * cCover(p));
  }`, "petrifyClimb(p, t)");

export const goldCrescent = M("goldCrescent", F, "gold crescent on the planet at the wide, #f2b25a / #7a3fc0",
  `vec3 goldCrescent(vec2 p, float t){
    vec3 c = gravePlanet(p, t);
    vec2 q = p - vec2(0.38, 0.22);
    float d = abs(length(q) - 0.16) - 0.02;
    float side = cAA(q.x, 0.0);
    return mix(c, mix(vec3(0.478, 0.247, 0.753), vec3(0.949, 0.698, 0.353), side), cFill(d) * 0.8);
  }`, "goldCrescent(p, t)");

export const tealPour = M("tealPour", F, "teal pours from the sleeper then settles, #19e6c8 / #7affea",
  `vec3 tealPour(vec2 p, float t){
    vec2 q = p - vec2(0.78, 0.40);
    float pour = cAA(q.x + 0.08, 0.0) * (1.0 - cAA(abs(q.y) - 0.18, 0.0));
    float n = cFbm(vec2(q.x * 6.0, q.y * 10.0 - t * 0.5));
    vec3 c = worldPlate(p, t);
    return mix(c, mix(vec3(0.098, 0.902, 0.784), vec3(0.478, 1.000, 0.918), n), pour * 0.55);
  }`, "tealPour(p, t)");

export const slashReveal = M("slashReveal", F, "island through the cut: cream wedge, gold/red burn lip",
  `vec3 slashReveal(vec2 p, float t){
    vec2 q = p - 0.5;
    float along = dot(q, normalize(vec2(0.62, 0.78)));
    float across = dot(q, normalize(vec2(-0.78, 0.62)));
    float open = cAA(abs(across), 0.10);
    vec3 island = vec3(0.949, 0.937, 0.902) * (0.85 + 0.1 * cFbm(p * 4.0));
    vec3 c = mix(worldPlate(p, t), island, open);
    return mix(c, vec3(0.847, 0.710, 0.141), cLine(abs(across) - 0.10, 2.2));
  }`, "slashReveal(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  tsukuyomiEye, tomoePinwheel, gravePlanet, shardBlade, petrifyClimb, goldCrescent, tealPour, slashReveal,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-epsilon-hollow cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
