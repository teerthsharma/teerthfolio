// Family 7 — seal script / ofuda / talisman hatch (5). Glyphs, strips, hatch, fuin, rain.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "ofuda", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const OFUDA = [
  D("mythSealScript", "hashed short glyph strokes — script field, not a paper strip",
    /* glsl */ `
    vec3 mythSealScript(vec2 p, float t) {
      vec3 c = mix(myPaper(p) * 0.7, MY_INDIGO, 0.35);
      vec2 gv = floor(p * 14.0);
      vec2 f = fract(p * 14.0) - 0.5;
      vec2 h = myH22(gv);
      vec2 a = (h - 0.5) * 0.42;
      vec2 b = (myH22(gv + 11.0) - 0.5) * 0.42;
      float stroke = myFill(mySeg(f, a, b) - 0.035);
      float keep = step(0.4, myH21(gv + t * 0.0));
      c = mix(c, MY_INK, stroke * keep);
      c = mix(c, MY_SEAL, stroke * keep * step(0.78, myH21(gv + 3.0)));
      return myOut(c);
    }`),

  D("mythOfudaStrip", "vertical talisman strips with red seal squares — cards, not glyphs",
    /* glsl */ `
    vec3 mythOfudaStrip(vec2 p, float t) {
      vec3 c = MY_INDIGO;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float x = 0.22 + fi * 0.24 + 0.02 * sin(t * 0.4 + fi);
        vec2 q = p - vec2(x, 0.50);
        float card = myFill(myBox(q, vec2(0.07, 0.38)));
        vec3 paper = myPaper(p) * 0.95;
        float seal = myFill(myBox(q - vec2(0.0, 0.22), vec2(0.035, 0.035)));
        float bar = myFill(myBox(q - vec2(0.0, -0.08), vec2(0.012, 0.18)));
        vec3 col = mix(paper, MY_SEAL, seal);
        col = mix(col, MY_INK, bar);
        c = mix(c, col, card);
      }
      return myOut(c);
    }`),

  D("mythTalismanHatch", "diagonal hatch confined to ofuda cards — tone, not a seal square",
    /* glsl */ `
    vec3 mythTalismanHatch(vec2 p, float t) {
      vec3 c = mix(MY_CAVE, MY_INDIGO, 0.5);
      vec2 q = p - vec2(0.72, 0.50);
      float card = myFill(myBox(q, vec2(0.22, 0.36)));
      float h = (p.x - p.y) * 28.0;
      float g = min(fract(h), 1.0 - fract(h));
      float hatch = 1.0 - smoothstep(0.06, 0.12, g);
      vec3 paper = myPaper(p);
      paper = mix(paper, MY_INK, hatch * 0.55);
      paper = mix(paper, MY_SEAL, myFill(myBox(q - vec2(0.0, 0.24), vec2(0.08, 0.05))));
      c = mix(c, paper, card);
      return myOut(c);
    }`),

  D("mythFuinCircle", "seal circle plus radial bars plus center disc — fuin, not a strip",
    /* glsl */ `
    vec3 mythFuinCircle(vec2 p, float t) {
      vec2 pol = myPolar(p, MY_C);
      float rim = myLine(pol.x - 0.28, 2.0);
      float bars = (1.0 - smoothstep(0.03, 0.07, mySaw(pol.y, 8.0))) * myBand(pol.x, 0.10, 0.28);
      float core = myFill(pol.x - 0.06);
      vec3 c = mix(myPaper(p) * 0.55, MY_INDIGO, 0.4);
      c = mix(c, MY_SEAL, rim + bars);
      c = mix(c, MY_INK, core);
      return myOut(c);
    }`),

  D("mythOfudaRain", "falling ofuda card quads — gravity parade, not a static strip",
    /* glsl */ `
    vec3 mythOfudaRain(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_SKYRED * 0.4, clamp(p.y, 0.0, 1.0) * 0.4);
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float age = fract(t * 0.15 + fi * 0.13);
        float x = 0.12 + myH21(vec2(fi, 1.0)) * 1.20;
        vec2 q = p - vec2(x, 1.15 - age * 1.4);
        q = mat2(0.98, -0.18, 0.18, 0.98) * q;
        float card = myFill(myBox(q, vec2(0.045, 0.11)));
        vec3 col = mix(myPaper(p), MY_SEAL, myFill(myBox(q - vec2(0.0, 0.05), vec2(0.02, 0.02))));
        c = mix(c, col, card);
      }
      return myOut(c);
    }`),
];

export default OFUDA;
