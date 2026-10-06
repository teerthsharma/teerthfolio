// Family — book-in / book-out. Theatrical leaf. Paper verso, never fade-to-black.
import { P } from "./kit.glsl.js";

const F = "book";

export default [
  P("printBookIn", F, "book-in hinge: leaf opens from the left, fold shade, fwidth lip",
    `vec3 printBookIn(vec3 col, vec2 p, float t) {
      float hinge = prHingeX(t, 0.06, 1.30);
      float leaf = prAA(p.x, hinge);
      float fold = exp(-abs(p.x - hinge) * 16.0);
      vec3 verso = prPaper(p) * vec3(0.92, 0.88, 0.80);
      vec3 ink = mix(verso, col, leaf);
      ink = mix(ink, ink * vec3(0.70, 0.60, 0.48), fold * (1.0 - leaf) * 0.55);
      ink = mix(ink, ink * vec3(0.78, 0.70, 0.58), fold * leaf * 0.28);
      return prOut(mix(ink, PR_UMBER * 1.55, prLine(p.x - hinge, 1.6) * 0.30));
    }`),

  P("printBookOut", F, "book-out hinge: verso takes the still from the right, same stock",
    `vec3 printBookOut(vec3 col, vec2 p, float t) {
      float hinge = 1.38 - fract(t * 0.14) * 1.30;
      float leaf = 1.0 - prAA(p.x, hinge);
      float fold = exp(-abs(p.x - hinge) * 16.0);
      vec3 verso = mix(PR_VERSO, PR_PAPER, prVn(p * 10.0));
      vec3 ink = mix(col, verso, leaf);
      ink = mix(ink, ink * vec3(0.68, 0.58, 0.46), fold * leaf * 0.50);
      return prOut(mix(ink, PR_UMBER * 1.5, prLine(p.x - hinge, 1.6) * 0.28));
    }`),

  P("printBookIris", F, "gutter iris: paper margin opens from the binding, not a centre wipe",
    `vec3 printBookIris(vec3 col, vec2 p, float t) {
      vec2 gutter = vec2(0.07, 0.50);
      float r = length((p - gutter) * vec2(0.72, 1.0));
      float open = mix(0.04, 1.15, smoothstep(0.0, 0.78, fract(t * 0.12)));
      float iris = prAA(open, r);
      vec3 margin = mix(PR_VERSO, prPaper(p), 0.45);
      vec3 ink = mix(margin, col, iris);
      return prOut(mix(ink, PR_UMBER * 1.45, prLine(r - open, 1.7) * 0.32));
    }`),

  P("printBookGutter", F, "gutter shade: bound-edge cosine, umber valley, pages stay paper",
    `vec3 printBookGutter(vec3 col, vec2 p, float t) {
      float g = abs(p.x - 0.72);
      float valley = exp(-g * g * 38.0);
      float stitch = prLine(p.x - 0.72, 1.4);
      vec3 ink = mix(col, col * vec3(0.62, 0.52, 0.42), valley * 0.48);
      float sy = abs(fract(p.y * 7.0) - 0.5);
      float thread = (1.0 - smoothstep(0.0, fwidth(p.y * 7.0) * 1.3 + 1e-5, sy - 0.06)) * prBand(p.x, 0.68, 0.76);
      ink = mix(ink, PR_UMBER * 1.6, stitch * 0.22 + thread * 0.18);
      return prOut(ink);
    }`),

  P("printBookFox", F, "foxed leaf: warm age spots on the verso mix, sparse, printed not dirty",
    `vec3 printBookFox(vec3 col, vec2 p, float t) {
      float spot = smoothstep(0.74, 0.90, prFbm(p * 2.8 + 5.2)) * smoothstep(0.58, 0.82, prVn(p * 6.4));
      float tide = prBand(p.y, 0.0, 0.16) * smoothstep(0.40, 0.70, prFbm(p * 4.0));
      vec3 fox = col * vec3(0.72, 0.50, 0.32);
      vec3 ink = mix(col, fox, max(spot * 0.48, tide * 0.22));
      return prOut(ink);
    }`),
];
