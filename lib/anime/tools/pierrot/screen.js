// Pierrot screen passes: split-tone grade, TV grain on twos, grey-negative wipe.
import { Color } from "three";
import { defineModule } from "./define.js";

export const SCREEN = [
  defineModule({
    name: "pierrotGrade",
    doc: "split-tone grade: shadows pulled to a warm dark, highs to amber, ink floor lifted, luma capped at 0.92",
    draws: "The whole frame tinted warm, shadows pulled toward a dark brown-red and highlights toward amber, with no pure black and nothing brighter than a pale cream.",
    use: "grade",
    params: "uPrrGradeSh and uPrrGradeHi are the shadow and highlight tint colours; uPrrGradeAmt is how strongly they pull (0 none, 1 full)",
    uniforms: () => ({ uPrrGradeSh: { value: new Color(0.047, 0.012, 0.016) }, uPrrGradeHi: { value: new Color(0.745, 0.400, 0.161) }, uPrrGradeAmt: { value: 0.35 } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrGradeSh;
    uniform vec3 uPrrGradeHi;
    uniform float uPrrGradeAmt;
    vec3 pierrotGrade(vec3 c) {
      vec3 tone = mix(uPrrGradeSh, uPrrGradeHi, smoothstep(0.08, 0.85, prrLuma(c)));
      return prrOut(c * mix(vec3(1.0), tone / max(prrLuma(tone), 0.05), uPrrGradeAmt));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
      vec3 src = vec3(smoothstep(0.0, 1.6, p.x));
      src = mix(src, vec3(0.55, 0.62, 0.78), step(0.6, p.y) * step(abs(p.x - 0.8), 0.25));
      return mix(src, pierrotGrade(src), step(0.8, p.x));
    }`,
  }),

  defineModule({
    name: "pierrotGrain",
    doc: "TV cel film grain re-rolled on twos, with sparse dark dust specks",
    draws: "A fine mono grain over the frame that changes twelve times a second, with a few tiny dark dust specks that jump to new places each step.",
    use: "noise",
    params: "uPrrGrainAmt is the grain strength as a fraction of the pixel value; uPrrDust is the share of cells carrying a speck",
    uniforms: () => ({ uPrrGrainAmt: { value: 0.06 }, uPrrDust: { value: 0.0008 } }),
    glsl: /* glsl */ `
    uniform float uPrrGrainAmt;
    uniform float uPrrDust;
    vec3 pierrotGrain(vec3 c, vec2 p, float t) {
      float k = prrHold(t, 12.0) * 12.0;
      float n = prrH(floor(p * vec2(640.0, 400.0)) + k * 17.0);
      float dust = step(1.0 - uPrrDust, prrH(floor(p * vec2(320.0, 200.0)) + k * 31.0 + 9.0));
      return c * (1.0 + (n - 0.5) * uPrrGrainAmt) * (1.0 - 0.35 * dust);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return prrOut(pierrotGrain(vec3(0.55, 0.50, 0.46), p, t)); }`,
  }),

  defineModule({
    name: "pierrotNegative",
    doc: "grey negative wipe: value inverted into a pale grey range with ink edges, swept in along a diagonal",
    draws: "Part of the frame flips to a pale grey photographic negative with thin black outlines on every edge of value; a hard diagonal line sweeps the flip across the picture.",
    use: "screen",
    params: "uPrrNegWipe is where the diagonal edge sits along the frame (below 0 none, past about 2 everything); uPrrNegEdge is how sensitive the ink outline is to value jumps",
    uniforms: () => ({ uPrrNegWipe: { value: 9 }, uPrrNegEdge: { value: 40 } }),
    glsl: /* glsl */ `
    uniform float uPrrNegWipe;
    uniform float uPrrNegEdge;
    vec3 pierrotNegative(vec3 c, vec2 p) {
      float L = prrLuma(c);
      vec3 neg = mix(vec3(0.922, 0.922, 0.929), vec3(0.376, 0.349, 0.353), L);
      neg = mix(neg, vec3(0.039, 0.039, 0.043), prrAA(fwidth(L) * uPrrNegEdge, 0.5));
      return mix(c, neg, prrAA(uPrrNegWipe - (p.x + p.y * 0.6), 0.0));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
      vec3 src = mix(vec3(0.80, 0.30, 0.20), vec3(0.14, 0.12, 0.14), prrAA(length(p - vec2(0.8, 0.5)), 0.28));
      src = mix(src, vec3(0.86, 0.80, 0.70), prrFill(abs(p.x - 0.8) - 0.04) * prrFill(abs(p.y - 0.5) - 0.2));
      vec3 c = src;
      float w = 2.4 * fract(t * 0.25);
      float L = prrLuma(c);
      vec3 neg = mix(vec3(0.922, 0.922, 0.929), vec3(0.376, 0.349, 0.353), L);
      neg = mix(neg, vec3(0.039, 0.039, 0.043), prrAA(fwidth(L) * 40.0, 0.5));
      return prrOut(mix(c, neg, prrAA(w - (p.x + p.y * 0.6), 0.0)));
    }`,
  }),
];
