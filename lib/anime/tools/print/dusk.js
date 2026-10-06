// Family — dusk-split grade. Warm key, cyan fill. Value first, never a teal LUT.
import { P } from "./kit.glsl.js";

const F = "dusk";

export default [
  P("printDuskSplit", F, "dusk split: cool below mid-luma, amber above, value held",
    `vec3 printDuskSplit(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      vec3 cool = col * vec3(0.78, 0.88, 1.12);
      vec3 warm = col * vec3(1.14, 0.92, 0.72);
      vec3 split = mix(cool, warm, prAA(L, 0.50));
      return prOut(prKeepL(col, split));
    }`),

  P("printHorizonCut", F, "horizon cut: hard dusk band on y, fwidth seam, figure luma kept",
    `vec3 printHorizonCut(vec3 col, vec2 p, float t) {
      float cut = prAA(p.y, 0.42);
      vec3 below = mix(col, PR_DUSK_C, 0.42);
      vec3 above = mix(col, PR_DUSK_W, 0.38);
      vec3 ink = mix(below, above, cut);
      ink = mix(ink, PR_SINO * 0.7, prLine(p.y - 0.42, 1.8) * 0.22);
      return prOut(prKeepL(col, ink));
    }`),

  P("printAmberWrap", F, "amber wrap: terminator band goes honey, fill stays violet",
    `vec3 printAmberWrap(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float wrap = prBand(L, 0.40, 0.66);
      vec3 fill = mix(col, col * vec3(0.70, 0.62, 1.08), (1.0 - prAA(L, 0.42)) * 0.45);
      vec3 amber = mix(fill, vec3(0.88, 0.58, 0.30), wrap * 0.55);
      return prOut(prKeepL(col, amber));
    }`),

  P("printAfterglow", F, "afterglow curve: indigo / rose / amber stops, sun already gone",
    `vec3 printAfterglow(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      vec3 a = vec3(0.12, 0.10, 0.22);
      vec3 b = vec3(0.64, 0.28, 0.34);
      vec3 c = vec3(0.88, 0.58, 0.34);
      vec3 lut = L < 0.5 ? mix(a, b, L * 2.0) : mix(b, c, min(L * 2.0 - 1.0, 1.0));
      return prOut(mix(prKeepL(col, lut), col, 0.22));
    }`),

  P("printCyanShade", F, "cyan shade: process cyan only under the terminator, key unstained",
    `vec3 printCyanShade(vec3 col, vec2 p, float t) {
      float L = prLuma(col);
      float shade = 1.0 - prAA(L, 0.40);
      vec3 cyan = mix(col, col * vec3(0.62, 0.90, 1.10) + PR_CYAN * 0.08, 0.62);
      return prOut(prKeepL(col, mix(col, cyan, shade)));
    }`),
];
