// Family 5 — cloud stencil / red-cloud paper (5). Boolean stamp, pigment, tile, stroke, scroll.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "akatsuki", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const AKATSUKI = [
  D("mythCloudStencil", "boolean cloud SDF stamps on paper — cut-out, not pigment",
    /* glsl */ `
    vec3 mythCloudStencil(vec2 p, float t) {
      vec3 c = myPaper(p) * 0.92;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 o = vec2(0.18 + 0.28 * fi + 0.04 * sin(t * 0.3 + fi), 0.28 + 0.18 * myH21(vec2(fi, 2.0)));
        float d = myCloudBlob((p - o) * 1.35);
        c = mix(c, MY_SEAL, myFill(d));
      }
      return myOut(c);
    }`),

  D("mythRedCloudPaper", "paper fiber plus red cloud pigment wash — dye, not a boolean stamp",
    /* glsl */ `
    vec3 mythRedCloudPaper(vec2 p, float t) {
      vec3 c = myPaper(p);
      float n = myFbm(myWarp(p * 2.0 + t * 0.05, 0.45));
      float dye = smoothstep(0.42, 0.78, n);
      c = mix(c, MY_SEAL, dye * 0.82);
      c = mix(c, MY_CINNABAR, dye * dye * 0.28);
      return myOut(c);
    }`),

  D("mythCloudRepeat", "tiled cloud motif on a stamp grid — lattice, not a free stamp",
    /* glsl */ `
    vec3 mythCloudRepeat(vec2 p, float t) {
      vec2 cell = vec2(0.42, 0.28);
      vec2 uv = p + vec2(t * 0.03, 0.0);
      vec2 id = floor(uv / cell);
      vec2 f = (fract(uv / cell) - 0.5) * cell;
      float keep = step(0.28, myH21(id));
      float d = myCloudBlob(f * 3.4);
      vec3 c = myPaper(p) * 0.88;
      c = mix(c, MY_SEAL, myFill(d) * keep);
      return myOut(c);
    }`),

  D("mythCloudRim", "stroke-only cloud outlines — rim, not a filled stencil",
    /* glsl */ `
    vec3 mythCloudRim(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, myPaper(p) * 0.55, 0.35);
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 o = vec2(0.22 + 0.32 * fi, 0.34 + 0.16 * sin(t * 0.25 + fi));
        float d = myCloudBlob((p - o) * 1.25);
        c = mix(c, MY_SEAL, myLine(d, 1.8));
      }
      return myOut(c);
    }`),

  D("mythCloudScroll", "scrolling cloud parade — translate-x march, not a static tile",
    /* glsl */ `
    vec3 mythCloudScroll(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_SKYRED, clamp(p.y * 0.65, 0.0, 1.0));
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float y = 0.22 + 0.12 * myH21(vec2(fi, 4.0));
        vec2 q = vec2(mod(p.x + t * 0.08 + fi * 0.38, 1.55) - 0.35, p.y - y);
        float d = myCloudBlob(q * 1.55);
        c = mix(c, MY_SEAL, myFill(d));
      }
      return myOut(c);
    }`),
];

export default AKATSUKI;
