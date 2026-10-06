// Stash pack for _template — generic modern-anime stub (navy / cream / gold).
import { defineCut as M } from "../kit.glsl.js";

const F = "_template";

export const worldPlate = M("worldPlate", F, "stub set-cel: navy fill, cream key, hard terminator",
  `vec3 worldPlate(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.36, 0.70, vec3(0.106, 0.145, 0.282), vec3(0.227, 0.290, 0.416), vec3(0.847, 0.792, 0.690));
    c = mix(c, vec3(0.227, 0.290, 0.416), (1.0 - smoothstep(0.18, 0.42, p.y)) * 0.35);
    return c;
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "stub shadow hatch: diagonal toner on the fill plate",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float core = 1.0 - cAA(cNdL(p), 0.40);
    return mix(c, c * vec3(0.72, 0.74, 0.82), cHatch(gl_FragCoord.xy, 5.0) * core * 0.7);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "stub skin cel: warm mid, cool terminator",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.42, 0.76, vec3(0.282, 0.145, 0.165), vec3(0.690, 0.478, 0.400), vec3(0.886, 0.760, 0.667));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "stub cloth: indigo dye, gold buckle sliver",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.32, 0.68, vec3(0.106, 0.125, 0.227), vec3(0.227, 0.290, 0.416), vec3(0.420, 0.478, 0.580));
    float spec = cAA(h, 0.84) * cLine(abs(p.y - 0.48) - 0.02, 1.6);
    return mix(c, vec3(0.847, 0.722, 0.353), spec * 0.65);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "stub inverted-hull: 1.6px navy edge, never #000",
  `vec3 castInk(vec2 p, float t){
    vec2 q = cN(p); float r = length(q);
    float lip = cLine(r - sqrt(0.22), 1.6);
    vec3 c = mix(vec3(0.106, 0.145, 0.282), vec3(0.420, 0.478, 0.580), cCover(p));
    return cSign(mix(c, CUT_INK, lip), p, t, 5.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "stub energy: gold disc + falloff, luma-capped",
  `vec3 fxEnergy(vec2 p, float t){
    float r = length(cN(p));
    vec3 c = vec3(0.106, 0.125, 0.227);
    c = mix(c, vec3(0.847, 0.722, 0.353), 1.0 - cAA(r, 0.10));
    return c + vec3(0.847, 0.722, 0.353) * exp(-r * r * 22.0) * 0.45;
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "stub starburst: 8-ray gold ring",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = cN(p); float a = atan(q.y, q.x), r = length(q);
    float rays = abs(fract(a / 0.785398 + t * 0.1) - 0.5);
    float burst = (1.0 - cAA(r, 0.28)) * (1.0 - cAA(rays, 0.12));
    float ring = cLine(r - 0.16, 2.0);
    vec3 c = vec3(0.106, 0.125, 0.227);
    return mix(c, vec3(0.847, 0.792, 0.690), max(burst, ring) * 0.85);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "stub lettering plate: cream block, navy stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.42)) * vec2(2.2, 3.4);
    float d = max(abs(q.x) - 0.55, abs(q.y) - 0.22);
    vec3 c = mix(vec3(0.847, 0.792, 0.690), CUT_INK, cLine(d, 2.2));
    return mix(vec3(0.106, 0.145, 0.282), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "stub screen ellipse: glued navy plate, hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.72, 0.40)) / vec2(0.22, 0.28);
    float d = length(q) - 1.0;
    vec3 plate = mix(vec3(0.106, 0.145, 0.282), vec3(0.227, 0.290, 0.416), p.y);
    return mix(plate * 0.55, plate, cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "stub vignette: no invert on the generic dock",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    return mix(CUT_INK * 2.4, c, cVig(p, 0.72));
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "stub print: navy fill, cream key split",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    return mix(col * vec3(0.90, 0.94, 1.08), col * vec3(1.06, 1.02, 0.90), smoothstep(0.28, 0.72, L));
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "stub night: lifted indigo, compressed cream",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(CUT_INK * 1.8, col, smoothstep(0.04, 0.24, L));
    return mix(lifted, lifted * vec3(0.82, 0.86, 0.98), smoothstep(0.55, 0.90, L));
  }`, "gradeNight(worldPlate(p, t))");

export const stubSky = M("stubSky", F, "stub sky bands: zenith navy to horizon cream",
  `vec3 stubSky(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.2) * 0.04, 0.0, 1.0);
    vec3 c = mix(vec3(0.106, 0.145, 0.282), vec3(0.353, 0.478, 0.627), cAA(y, 0.38));
    return mix(c, vec3(0.847, 0.792, 0.690), cAA(y, 0.78) * 0.35);
  }`, "stubSky(p, t)");

export const stubGround = M("stubGround", F, "stub ground: faceted slate, hatch in shade",
  `vec3 stubGround(vec2 p, float t){
    float facet = floor(cVn(p * 6.0) * 5.0) / 5.0;
    vec3 c = mix(vec3(0.145, 0.196, 0.282), vec3(0.290, 0.353, 0.416), facet);
    return mix(c, c * 0.72, cHatch(gl_FragCoord.xy, 6.0) * 0.4);
  }`, "stubGround(p, t)");

export const stubKey = M("stubKey", F, "stub key disc: cream sun, umber ring",
  `vec3 stubKey(vec2 p, float t){
    float r = length(p - vec2(0.78, 0.72));
    vec3 sky = stubSky(p, t);
    sky = mix(sky, vec3(0.886, 0.820, 0.690), 1.0 - cAA(r, 0.07));
    return mix(sky, CUT_UMBER, cLine(r - 0.075, 1.8) * 0.7);
  }`, "stubKey(p, t)");

export const stubAccent = M("stubAccent", F, "stub accent ring: gold orbit, fwidth lip",
  `vec3 stubAccent(vec2 p, float t){
    float r = length(cN(p));
    vec3 c = vec3(0.106, 0.145, 0.282);
    return mix(c, vec3(0.847, 0.722, 0.353), cLine(r - 0.20, 2.4));
  }`, "stubAccent(p, t)");

export const stubWide = M("stubWide", F, "stub wide plate: pull-back haze, horizon band",
  `vec3 stubWide(vec2 p, float t){
    vec3 c = stubSky(p, t);
    float haze = smoothstep(0.22, 0.55, p.y) * (1.0 - smoothstep(0.55, 0.72, p.y));
    return mix(c, vec3(0.420, 0.478, 0.580), haze * 0.45);
  }`, "stubWide(p, t)");

export const stubArc = M("stubArc", F, "stub arc smear: radial speed ticks toward the hero",
  `vec3 stubArc(vec2 p, float t){
    vec2 q = cN(p); float a = atan(q.y, q.x), r = length(q);
    float tick = cLine(fract(a * 7.0 + r * 4.0) - 0.5, 1.4) * smoothstep(0.08, 0.32, r);
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.847, 0.792, 0.690), tick * 0.55);
  }`, "stubArc(p, t)");

export const stubKill = M("stubKill", F, "stub kill flash: two-tone cream over navy, capped",
  `vec3 stubKill(vec2 p, float t){
    float flash = 1.0 - cAA(length(cN(p)), 0.34);
    vec3 a = vec3(0.106, 0.125, 0.227), b = vec3(0.847, 0.792, 0.690);
    return mix(a, b, flash);
  }`, "stubKill(p, t)");

export const stubHome = M("stubHome", F, "stub home wipe: cream wedge closing to the chase pose",
  `vec3 stubHome(vec2 p, float t){
    float k = fract(t * 0.15);
    float w = cAA(p.x, 0.15 + k * 0.7);
    return mix(vec3(0.847, 0.792, 0.690), worldPlate(p, t), w);
  }`, "stubHome(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  stubSky, stubGround, stubKey, stubAccent, stubWide, stubArc, stubKill, stubHome,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`_template cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
