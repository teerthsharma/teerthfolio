// Family — fresco plaster. Lime grit, sinopia, leaf. Pigment in the wall, not a LUT.
import { P } from "./kit.glsl.js";

const F = "fresco";

export default [
  P("printFrescoGrit", F, "intonaco grit: voronoi lime in the fill, gold stays off the pits",
    `vec3 printFrescoGrit(vec3 col, vec2 p, float t) {
      vec2 v = prVor(p * 22.0);
      float grit = smoothstep(0.10, 0.28, v.x);
      float L = prLuma(col);
      float fill = 1.0 - prAA(L, 0.55);
      vec3 lime = mix(PR_LIME * 0.72, PR_OCHRE * 0.80, grit);
      vec3 ink = mix(col, prKeepL(col, col * lime / 0.74), fill * 0.40);
      ink = mix(ink, ink * vec3(0.86, 0.80, 0.70), (1.0 - grit) * fill * 0.22);
      return prOut(ink);
    }`),

  P("printIntonaco", F, "wet plaster: chroma seeps, value sinks where the lime is still open",
    `vec3 printIntonaco(vec3 col, vec2 p, float t) {
      float wet = smoothstep(0.32, 0.78, prFbm(p * 5.5));
      float L = prLuma(col);
      vec3 seep = mix(col, mix(PR_OCHRE, PR_SINO, 1.0 - L), 0.38);
      vec3 sunk = seep * mix(0.82, 1.0, L);
      return prOut(mix(col, sunk, wet * 0.55));
    }`),

  P("printSinopia", F, "sinopia underdrawing: mid-value ridges, earth red peeking through lime",
    `vec3 printSinopia(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float mid = prBand(L, 0.28, 0.62);
      float ridge = prFbm(p * 7.0 + 3.4);
      float d = abs(ridge - 0.50);
      float line = 1.0 - smoothstep(0.0, fwidth(ridge) * 1.6 + 1e-5, d - 0.018);
      vec3 ink = mix(col, mix(col, PR_SINO, 0.62), mid * 0.28);
      return prOut(mix(ink, PR_SINO * 0.85, line * mid * 0.45));
    }`),

  P("printGoldLeaf", F, "gold leaf on the key: wavelength bias 1.14/0.86/0.28, never yellow paint",
    `vec3 printGoldLeaf(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float leaf = prAA(L, 0.60);
      vec3 wave = vec3(col.r * 1.14 + 0.08, col.g * 0.86 + 0.05, col.b * 0.28);
      float flake = prFill(prVor(p * 16.0).x - 0.10) * leaf;
      vec3 gilt = mix(wave, PR_GOLD, flake * 0.35);
      return prOut(mix(col, prKeepL(col, gilt), leaf * 0.78));
    }`),

  P("printFrescoCraq", F, "craquelure: voronoi edges as lime cracks, indigo sit, fwidth only",
    `vec3 printFrescoCraq(vec3 col, vec2 p, float t) {
      vec2 v = prVor(p * 11.0 + 0.7);
      float crack = 1.0 - smoothstep(0.0, fwidth(v.y) * 2.4 + 1e-5, v.y);
      float age = smoothstep(0.35, 0.75, prFbm(p * 2.2));
      float sit = crack * age * mix(0.22, 0.48, 1.0 - prLuma(col));
      return prOut(mix(col, PR_INK * 1.75, sit));
    }`),
];
