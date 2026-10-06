// Stash pack for pr-tensorflow-124410 — Araki / JoJo.
// Black coat, top hat, hatch in CORE shadow only, gold trim #c0302c.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-tensorflow-124410";

export const worldPlate = M("worldPlate", F, "Cairo set-cel: bruise violet, apricot haze, diagonal cut",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y, 0.0, 1.0);
    float cut = step(0.0, (p.x + p.y) - 1.05);
    vec3 zen = vec3(0.141, 0.063, 0.259), haze = vec3(0.722, 0.439, 0.282), street = vec3(0.165, 0.110, 0.176);
    vec3 c = mix(street, mix(zen, haze, cAA(y, 0.42)), cAA(y, 0.30));
    return mix(c, c * vec3(0.62, 0.48, 0.78), cut * 0.45);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "CORE-shadow hatch only: cNdL < 0.38, never lit panels",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float core = 1.0 - cAA(cNdL(p), 0.38);
    return mix(c, c * vec3(0.70, 0.62, 0.78), cHatch(gl_FragCoord.xy, 5.2) * core * 0.75);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Araki tan: hard terminator, citrus bounce, no grey",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.36, 0.70, vec3(0.282, 0.125, 0.161), vec3(0.690, 0.420, 0.333), vec3(0.847, 0.690, 0.541));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "black coat #121018, gold-red trim #c0302c, no satin",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 coat = cCel3(h, 0.28, 0.62, vec3(0.071, 0.063, 0.094), vec3(0.125, 0.110, 0.149), vec3(0.243, 0.220, 0.275));
    float trim = cLine(abs(p.y - 0.42) - 0.010, 1.6) * cCover(p);
    float lapel = cLine(abs((p.x - 0.72) - (p.y - 0.50) * 0.35) - 0.008, 1.5) * cCover(p);
    return mix(coat, vec3(0.753, 0.188, 0.173), max(trim, lapel) * 0.80);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Araki hull #1a1428, 2.2px, panel-thick",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 2.2);
    vec3 ink = vec3(0.102, 0.078, 0.157);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 3.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "MUDA ticks: 7 gold-red punches, core-shadow hatch survives",
  `vec3 fxEnergy(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 o = vec2(0.58 + 0.04 * sin(fi * 1.7 + t), 0.48 + 0.05 * cos(fi * 1.3));
      float fist = length(p - o) - 0.028;
      c = mix(c, vec3(0.847, 0.690, 0.290), cFill(fist) * 0.55);
      c = mix(c, vec3(0.753, 0.188, 0.173), cLine(fist, 1.6));
    }
    return c;
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "posed smash: 4-point star + slash, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.46);
    float star = cStar4(q, 0.20);
    float slash = abs(dot(q, normalize(vec2(0.78, 0.62)))) - 0.010;
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.847, 0.690, 0.290), star * 0.55);
    return mix(c, vec3(0.753, 0.188, 0.173), cLine(slash, 2.4));
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "MUDA / OH? plate: citrus fill, #c0302c stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.80, 0.22)) * vec2(2.0, 3.4);
    float d = max(abs(q.x) - 0.50, abs(q.y) - 0.20);
    vec3 c = mix(vec3(0.847, 0.690, 0.290), vec3(0.753, 0.188, 0.173), cLine(d, 2.4));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "Cairo ellipse: violet glue, posed-coat hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.46)) / vec2(0.18, 0.28);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.125, 0.078, 0.176) * (0.78 + 0.16 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "time-stop invert: one held beat, luma-safe",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float hold = step(0.45, fract(t * 0.35));
    return mix(c, cInvert(c), hold * 0.85);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Araki print: desat violet, #c0302c and gold stay sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.102, 0.078, 0.157), vec3(0.627, 0.557, 0.608), L);
    float gold = smoothstep(0.08, 0.22, col.r - col.b);
    return mix(mix(col, grey, 0.40), col * vec3(1.08, 0.96, 0.90), gold);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "Cairo night: lifted indigo, apricot hinge",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(CUT_INK * 1.4, col, smoothstep(0.04, 0.22, L));
    return mix(lifted, lifted * vec3(1.10, 0.92, 0.78), smoothstep(0.50, 0.84, L) * 0.38);
  }`, "gradeNight(worldPlate(p, t))");

export const topHatCrown = M("topHatCrown", F, "top hat: tall crown, brim ellipse, #c0302c band",
  `vec3 topHatCrown(vec2 p, float t){
    vec2 q = p - vec2(0.72, 0.72);
    float crown = max(abs(q.x) - 0.07 + q.y * 0.08, abs(q.y + 0.02) - 0.10);
    float brim = length((p - vec2(0.72, 0.60)) / vec2(0.13, 0.025)) - 1.0;
    vec3 felt = cCel3(cNdL(p), 0.30, 0.62, vec3(0.071, 0.063, 0.094), vec3(0.125, 0.110, 0.149), vec3(0.243, 0.220, 0.275));
    vec3 c = mix(worldPlate(p, t), felt, max(cFill(crown), cFill(brim)));
    float band = max(abs(q.x) - 0.068, abs(q.y + 0.06) - 0.012);
    return mix(c, vec3(0.753, 0.188, 0.173), cFill(band));
  }`, "topHatCrown(p, t)");

export const coreShadowHatch = M("coreShadowHatch", F, "naming law: hatch lives only where cNdL < 0.38",
  `vec3 coreShadowHatch(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castCloth(p, t), cCover(p));
    float core = 1.0 - cAA(cNdL(p), 0.38);
    return mix(c, c * vec3(0.62, 0.55, 0.70), cHatch(gl_FragCoord.xy, 4.8) * core * cCover(p));
  }`, "coreShadowHatch(p, t)");

export const goldPiping = M("goldPiping", F, "coat piping #c0302c: lapel + cuff, wavelength catch",
  `vec3 goldPiping(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castCloth(p, t), cCover(p));
    float cuff = cLine(abs(p.y - 0.28) - 0.008, 1.5) * cCover(p) * cAA(abs(p.x - 0.58), 0.0);
    float spec = pow(max(cNdL(p) - 0.72, 0.0), 2.0);
    return mix(c, mix(vec3(0.753, 0.188, 0.173), vec3(0.847, 0.541, 0.290), spec), cuff);
  }`, "goldPiping(p, t)");

export const cairoBullseye = M("cairoBullseye", F, "8 rings × 6°: mag / citrus / cyan, fwidth, no white",
  `vec3 cairoBullseye(vec2 p, float t){
    vec2 q = p - vec2(0.70, 0.64);
    float rr = length(q) * 12.0;
    float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
    float i = floor(rr);
    vec3 a = i < 2.0 ? vec3(0.353, 0.165, 0.541) : (i < 4.0 ? vec3(0.753, 0.188, 0.173) : (i < 6.0 ? vec3(0.847, 0.541, 0.165) : vec3(0.098, 0.690, 0.820)));
    vec3 b = i < 3.0 ? vec3(0.753, 0.188, 0.173) : (i < 5.0 ? vec3(0.847, 0.541, 0.165) : vec3(0.227, 0.102, 0.227));
    vec3 ring = mix(a, b, smoothstep(0.0, w * 1.2, f));
    return mix(worldPlate(p, t), ring, 1.0 - cAA(length(q), 0.34));
  }`, "cairoBullseye(p, t)");

export const mudaTicks = M("mudaTicks", F, "speed-line ticks in a cone, gold-red, not a crowd mesh",
  `vec3 mudaTicks(vec2 p, float t){
    vec2 q = p - vec2(0.60, 0.48);
    float a = atan(q.y, q.x), r = length(q);
    float rays = cLine(fract(a / 0.224399) - 0.5, 1.0) * (1.0 - cAA(r, 0.36)) * cAA(r, 0.06);
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.847, 0.541, 0.220), rays * 0.55);
  }`, "mudaTicks(p, t)");

export const approachingTwo = M("approachingTwo", F, "two-shot: coat mass left, silhouette guest right",
  `vec3 approachingTwo(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float hero = length((p - vec2(0.38, 0.46)) / vec2(0.10, 0.22)) - 1.0;
    float guest = length((p - vec2(0.78, 0.48)) / vec2(0.08, 0.20)) - 1.0;
    c = mix(c, castCloth(p, t), cFill(hero));
    c = mix(c, vec3(0.165, 0.078, 0.196), cFill(guest));
    return c;
  }`, "approachingTwo(p, t)");

export const drownFourth = M("drownFourth", F, "four edges, fourth drowns: three gold, one sinks to ink",
  `vec3 drownFourth(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 e = vec2(0.40 + fi * 0.10, 0.36);
      float d = abs(p.x - e.x) - 0.008;
      vec3 col = i < 3 ? vec3(0.847, 0.690, 0.290) : vec3(0.102, 0.078, 0.157);
      float fade = i < 3 ? 0.80 : (0.35 + 0.35 * sin(t * 2.2));
      c = mix(c, col, cFill(max(d, abs(p.y - 0.36) - 0.16)) * fade);
    }
    return c;
  }`, "drownFourth(p, t)");

export const poseDiagonal = M("poseDiagonal", F, "Araki diagonal: one hard cut-shadow across the coat",
  `vec3 poseDiagonal(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castCloth(p, t), cCover(p));
    float cut = cAA(p.x * 0.85 + p.y * 0.53, 0.92);
    return mix(c, c * vec3(0.55, 0.48, 0.70), cut * cCover(p) * 0.65);
  }`, "poseDiagonal(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  topHatCrown, coreShadowHatch, goldPiping, cairoBullseye, mudaTicks, approachingTwo, drownFourth, poseDiagonal,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-tensorflow-124410 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
