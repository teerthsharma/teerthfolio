// p-aether-lang consumes jjkKit. Every slot is a beat of one stitch.
import { defineModule } from "../../jjk/define.js";

const F = "p-aether-lang";
const D = (name, doc, glsl, expr) => defineModule({
  name, doc, family: F, deps: ["jjkKit"], glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return jjkOut(${expr}); }`,
});

export const worldPlate = D("worldPlate", "3s flood beat: eye + patches, no hero",
  /* glsl */ `vec3 worldPlate(vec2 p, float t) { return jjkStitch(p, t, 0.0); }`,
  "worldPlate(p, t)");

export const worldHatch = D("worldHatch", "flood beat, information cards already in the stitch",
  /* glsl */ `vec3 worldHatch(vec2 p, float t) { return jjkStitch(p, t, 0.0); }`,
  "worldHatch(p, t)");

export const castSkin = D("castSkin", "domain beat: hero on the void",
  /* glsl */ `vec3 castSkin(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "castSkin(p, t)");

export const castCloth = D("castCloth", "domain beat: gakuran + halt",
  /* glsl */ `vec3 castCloth(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "castCloth(p, t)");

export const castInk = D("castInk", "domain beat: indigo hull on the pear",
  /* glsl */ `vec3 castInk(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "castInk(p, t)");

export const fxEnergy = D("fxEnergy", "kill beat: Blue+Red collide left of the hero",
  /* glsl */ `vec3 fxEnergy(vec2 p, float t) { return jjkStitch(p, t, 2.0); }`,
  "fxEnergy(p, t)");

export const fxImpact = D("fxImpact", "kill beat, same stitch",
  /* glsl */ `vec3 fxImpact(vec2 p, float t) { return jjkStitch(p, t, 2.0); }`,
  "fxImpact(p, t)");

export const fxLetter = D("fxLetter", "domain beat — Infinity is the halt, no type",
  /* glsl */ `vec3 fxLetter(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "fxLetter(p, t)");

export const occludeSeal = D("occludeSeal", "domain beat plus barrier rim, hole on pup",
  /* glsl */ `vec3 occludeSeal(vec2 p, float t) {
    vec3 c = jjkStitch(p, t, 1.0);
    float hole = 1.0 - jjkCover(p);
    return mix(c, JJK_GLASS, jjkLine(jjkBarrierD(p), 2.0) * hole * 0.35);
  }`, "occludeSeal(p, t)");

export const occludeInvert = D("occludeInvert", "luma-safe invert of the stitch, pup stays",
  /* glsl */ `vec3 occludeInvert(vec2 p, float t) {
    vec3 c = jjkStitchTimed(p, t);
    vec3 inv = jjkCap(vec3(1.0) - c);
    return mix(inv, c, jjkCover(p));
  }`, "occludeInvert(p, t)");

export const gradePrint = D("gradePrint", "split-tone the timed stitch",
  /* glsl */ `vec3 gradePrint(vec3 col) {
    float L = jjkLuma(col);
    vec3 sh = mix(JJK_VOID, JJK_CYAN * 0.35, 0.40);
    return mix(col, mix(sh, JJK_GLASS, smoothstep(0.18, 0.80, L)), 0.28);
  }`, "gradePrint(jjkStitchTimed(p, t))");

export const gradeNight = D("gradeNight", "lift locked, slight cyan sat on the stitch",
  /* glsl */ `vec3 gradeNight(vec3 col) {
    float L = jjkLuma(col);
    vec3 g = mix(col, JJK_CYAN, 0.12);
    g *= L / max(jjkLuma(g), 1e-4);
    return jjkLift(g);
  }`, "gradeNight(jjkStitchTimed(p, t))");

export const hollowPurple = D("hollowPurple", "8s kill beat — collision, no caption",
  /* glsl */ `vec3 hollowPurple(vec2 p, float t) { return jjkStitch(p, t, 2.0); }`,
  "hollowPurple(p, t)");

export const lapseBlue = D("lapseBlue", "domain beat plus one Blue orb, still the stitch",
  /* glsl */ `vec3 lapseBlue(vec2 p, float t) {
    vec3 c = jjkStitch(p, t, 1.0);
    vec2 bl = vec2(0.42, 0.48);
    return mix(c, jjkBlue(p, bl), jjkFill(length(p - bl) - 0.055) * (1.0 - jjkCover(p)));
  }`, "lapseBlue(p, t)");

export const reversalRed = D("reversalRed", "domain beat plus one Red orb, still the stitch",
  /* glsl */ `vec3 reversalRed(vec2 p, float t) {
    vec3 c = jjkStitch(p, t, 1.0);
    vec2 rd = vec2(0.50, 0.44);
    return mix(c, jjkRed(p, rd), jjkFill(length(p - rd) - 0.055) * (1.0 - jjkCover(p)));
  }`, "reversalRed(p, t)");

export const voidFlood = D("voidFlood", "3s still: giant eye over space, eye ≥ 40%",
  /* glsl */ `vec3 voidFlood(vec2 p, float t) { return jjkStitch(p, t, 0.0); }`,
  "voidFlood(p, t)");

export const domainFloor = D("domainFloor", "domain beat — hero stands, rest floats",
  /* glsl */ `vec3 domainFloor(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "domainFloor(p, t)");

export const sixEyes = D("sixEyes", "domain beat — Six Eyes on the pear",
  /* glsl */ `vec3 sixEyes(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`,
  "sixEyes(p, t)");

export const stillPlate = D("stillPlate", "timed stitch — drawable Void, no type card",
  /* glsl */ `vec3 stillPlate(vec2 p, float t) { return jjkStitchTimed(p, t); }`,
  "stillPlate(p, t)");

export const purpleTunnel = D("purpleTunnel", "pull-in then flood stitch",
  /* glsl */ `vec3 purpleTunnel(vec2 p, float t) {
    return mix(jjkWorm(p, t), jjkStitch(p, t, 0.0), jjkAA(length(p - JJK_EYE), 0.28));
  }`, "purpleTunnel(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  hollowPurple, lapseBlue, reversalRed, voidFlood, domainFloor, sixEyes, stillPlate, purpleTunnel,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-aether-lang cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
