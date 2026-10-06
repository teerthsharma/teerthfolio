// Family — Unlimited Void interior (8). MAPPA digital space, not a purple hall.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "void", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const VOID = [
  D("jjkVoidSpace", "space + star ticks only — digital void field, no hall wash",
    /* glsl */ `
    vec3 jjkVoidSpace(vec2 p, float t) {
      return jjkOut(jjkSpace(p, t));
    }`),

  D("jjkVoidGalaxies", "space plus two distant spiral discs — black-blue, not a wash",
    /* glsl */ `
    vec3 jjkVoidGalaxies(vec2 p, float t) {
      vec3 c = jjkSpace(p, t);
      c = mix(c, JJK_VOID * 1.6, jjkGalaxy(p, vec2(0.16, 0.80), 0.18) * 0.45);
      c = mix(c, JJK_BLUE * 0.35, jjkGalaxy(p, vec2(1.22, 0.22), 0.12) * 0.6);
      return jjkOut(c);
    }`),

  D("jjkVoidPatches", "white information cards on void — axis-aligned flood stills, no type",
    /* glsl */ `
    vec3 jjkVoidPatches(vec2 p, float t) {
      vec3 c = jjkSpace(p, t);
      c = mix(c, JJK_PATCH, jjkPatches(p, t) * 0.72);
      return jjkOut(c);
    }`),

  D("jjkVoidEye", "giant black-hole eye ≥40% frame — THE Unlimited Void still",
    /* glsl */ `
    vec3 jjkVoidEye(vec2 p, float t) {
      vec3 c = jjkSpace(p, t);
      float d = jjkEyeD(p);
      c = mix(c, jjkEye(p, t), jjkFill(d) * 0.92);
      c = mix(c, JJK_GLASS, jjkLine(d, 1.8) * 0.45);
      return jjkOut(c);
    }`),

  D("jjkVoidDomain", "full interior: space + galaxies + giant eye + patches",
    /* glsl */ `
    vec3 jjkVoidDomain(vec2 p, float t) {
      return jjkDomain(p, t);
    }`),

  D("jjkVoidFloor", "caster stand plate; the rest of the void floats",
    /* glsl */ `
    vec3 jjkVoidFloor(vec2 p, float t) {
      vec3 c = jjkSpace(p, t);
      float stand = jjkFill(length(p - vec2(0.72, 0.18)) - 0.10);
      float band = jjkAA(0.18 - p.y, 0.0);
      c = mix(c, jjkFloor(p), max(stand, band * 0.45));
      return jjkOut(c);
    }`),

  D("jjkVoidWorm", "pull-in tunnel — concentric rings eat space toward the well",
    /* glsl */ `
    vec3 jjkVoidWorm(vec2 p, float t) {
      float r = length(p - vec2(0.50, 0.50));
      vec3 c = mix(jjkSpace(p, t), jjkWorm(p, t), jjkAA(0.62 - r, 0.0) * 0.92);
      return jjkOut(c);
    }`),

  D("jjkVoidBarrier", "exterior dark sphere: hole into the domain, glass rim",
    /* glsl */ `
    vec3 jjkVoidBarrier(vec2 p, float t) {
      vec3 c = jjkSpace(p, t);
      float d = jjkBarrierD(p);
      float shell = jjkFill(d);
      float hole = jjkFill(length((p - vec2(0.50, 0.48)) / vec2(0.22, 0.24)) - 1.0);
      vec3 dark = mix(JJK_DEEP, JJK_VOID, jjkFbm(p * 3.2 + t * 0.01));
      c = mix(c, dark, shell * (1.0 - hole));
      c = mix(c, jjkDomain(p, t), shell * hole * 0.85);
      c = mix(c, JJK_GLASS, jjkLine(d, 2.2) * 0.7);
      c = mix(c, JJK_GLASS, jjkLine(length((p - vec2(0.50, 0.48)) / vec2(0.22, 0.24)) - 1.0, 1.6) * 0.55);
      return jjkOut(c);
    }`),
];

if (VOID.length !== 8) throw new Error(`jjk void count ${VOID.length} != 8`);
