// Family — offset rosette. CMY screens at press angles. Dots, not grain.
import { P } from "./kit.glsl.js";

const F = "rosette";

export default [
  P("printRosette", F, "CMY rosette: 15/75/0 screens, shadow-weighted, key plates stay clean",
    `vec3 printRosette(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float sh = 1.0 - prAA(L, 0.58);
      float r = prRadius(prGain(1.0 - L, 0.12));
      float c = prDot(p, PR_ANG_C, 44.0, r);
      float m = prDot(p, PR_ANG_M, 44.0, r);
      float y = prDot(p, PR_ANG_Y, 44.0, r * 0.92);
      vec3 ink = col;
      ink = mix(ink, ink * vec3(0.52, 0.86, 0.90), c * sh * 0.55);
      ink = mix(ink, ink * vec3(0.90, 0.52, 0.76), m * sh * 0.50);
      ink = mix(ink, ink * vec3(0.90, 0.88, 0.42), y * sh * 0.42);
      return prOut(prKeepL(col, ink));
    }`),

  P("printOffsetMisreg", F, "offset misregister: C/M/Y screens sheared a hair, a press miss",
    `vec3 printOffsetMisreg(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float r = prRadius(1.0 - L);
      float c = prDot(p + vec2(0.0045, 0.0), PR_ANG_C, 40.0, r);
      float m = prDot(p + vec2(-0.0032, 0.0024), PR_ANG_M, 40.0, r);
      float y = prDot(p + vec2(0.0, -0.0036), PR_ANG_Y, 40.0, r);
      vec3 plate = vec3(1.0 - m * 0.55, 1.0 - (c + y) * 0.28, 1.0 - c * 0.50);
      return prOut(prKeepL(col, col * plate));
    }`),

  P("printDotGain", F, "dot gain: midtone swell on a 45° indigo key screen, Yule-Nielsen sit",
    `vec3 printDotGain(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float cover = prGain(1.0 - L, 0.34);
      float k = prDot(p, PR_ANG_K, 36.0, prRadius(cover));
      vec3 ink = mix(col, mix(col, PR_INK * 2.1, 0.72), k * mix(0.18, 0.62, cover));
      return prOut(ink);
    }`),

  P("printKeyPlate", F, "key plate: CMY in the mids, indigo K only in the deeps",
    `vec3 printKeyPlate(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float mid = prBand(L, 0.22, 0.68);
      float deep = 1.0 - prAA(L, 0.30);
      float rM = prRadius((1.0 - L) * 0.85);
      float c = prDot(p, PR_ANG_C, 38.0, rM);
      float m = prDot(p, PR_ANG_M, 38.0, rM);
      float k = prDot(p, PR_ANG_K, 32.0, prRadius(deep));
      vec3 ink = mix(col, col * vec3(0.70, 0.88, 0.92), c * mid * 0.40);
      ink = mix(ink, ink * vec3(0.92, 0.70, 0.84), m * mid * 0.36);
      ink = mix(ink, PR_INK * 1.85, k * deep * 0.58);
      return prOut(ink);
    }`),

  P("printMoireBeat", F, "moiré beat: two screens 4° apart, the flower a press accident",
    `vec3 printMoireBeat(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float r = prRadius(mix(0.15, 0.72, 1.0 - L));
      float a = prDot(p, 0.262, 46.0, r);
      float b = prDot(p, 0.332, 46.0, r);
      float beat = a * b;
      float ring = abs(a - b);
      float w = fwidth(ring) + 1e-5;
      float flower = beat + (1.0 - smoothstep(0.08 - w, 0.08 + w, ring)) * 0.35;
      vec3 ink = mix(col, col * vec3(0.78, 0.72, 0.82), flower * (1.0 - prAA(L, 0.70)) * 0.55);
      return prOut(prKeepL(col, ink));
    }`),
];
