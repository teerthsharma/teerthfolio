// Betti: H0 merge/join/split, H1 cycles/cocycles, H2 voids, reduced homology.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoBetti0MergeTree",
    doc: "Betti-0 merge tree: leaves are maxima, internal nodes are elder-rule merges",
    glsl: /* glsl */ `
    vec3 topoBetti0MergeTree(vec2 p, float t) {
      vec3 col = tFieldPaper(tMorse(p) * 0.35);
      vec2 A = vec2(0.42, 0.82), B = vec2(1.00, 0.80), M = vec2(0.72, 0.42 + 0.04 * sin(t * 0.4)), R = vec2(0.72, 0.16);
      col = mix(col, tBirth(), tSeg(p, A, M, 0.01) + tSeg(p, B, M, 0.01) + tSeg(p, M, R, 0.01));
      col = mix(col, tAmber(), tDisk(p, A, 0.03) + tDisk(p, B, 0.026));
      col = mix(col, tSaddle(), tDisk(p, M, 0.024));
      col = mix(col, tInk(), tDisk(p, R, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBetti0MergeTree(p, t); }`,
  }),
  defineModule({
    name: "topoBetti1CycleInk",
    doc: "Betti-1 cycle representative: a non-bounding loop inked where a 1-class lives",
    glsl: /* glsl */ `
    vec3 topoBetti1CycleInk(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f);
      vec2 c = vec2(0.78, 0.54);
      float loop = abs(length(p - c) - (0.20 + 0.025 * sin(t * 0.5)));
      float jag = 0.7 + 0.3 * tVN(p * 18.0);
      col = mix(col, tDeath(), tFill(loop - 0.01 * jag));
      return tTone(mix(col, tSaddle(), tCrit(p) * 0.7));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBetti1CycleInk(p, t); }`,
  }),
  defineModule({
    name: "topoBetti2VoidShell",
    doc: "Betti-2 void: a cavity shell (2-cycle) born when a hollow closes",
    glsl: /* glsl */ `
    vec3 topoBetti2VoidShell(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.5);
      float r = length(c);
      float inner = 0.16 + 0.03 * sin(t * 0.4), outer = 0.30;
      float shell = tBand(r, inner, outer);
      vec3 col = mix(tPaper(), tVoid(), shell);
      col = mix(col, tDeath(), tIso(r, inner, 1.6));
      col = mix(col, tInk(), tIso(r, outer, 1.4));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBetti2VoidShell(p, t); }`,
  }),
  defineModule({
    name: "topoMergeElderRule",
    doc: "elder rule: at a merge the younger component dies; death ink on the younger basin",
    glsl: /* glsl */ `
    vec3 topoMergeElderRule(vec2 p, float t) {
      float dA = length(p - vec2(0.52, 0.62)), dB = length(p - vec2(1.02, 0.48));
      float f = tMorse(p), a = 0.3 + 0.25 * sin(t * 0.35);
      float below = 1.0 - smoothstep(a, a + fwidth(f) * 2.0, f);
      vec3 col = mix(tPaper(), dA < dB ? tBirth() : tDeath(), below);
      float younger = step(dB, dA);
      col = mix(col, tSaddle(), younger * below * 0.45);
      return tTone(mix(col, tInk(), tIso(f, a, 1.4)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMergeElderRule(p, t); }`,
  }),
  defineModule({
    name: "topoJoinTree",
    doc: "join tree of a sublevel filtration: components join as α increases",
    glsl: /* glsl */ `
    vec3 topoJoinTree(vec2 p, float t) {
      vec3 col = tPaper();
      vec2 L = vec2(0.34, 0.22), R = vec2(1.08, 0.22), J = vec2(0.72, 0.62 + 0.05 * sin(t * 0.3));
      col = mix(col, tBirth(), tSeg(p, L, J, 0.012) + tSeg(p, R, J, 0.012));
      col = mix(col, tInk(), tDisk(p, L, 0.025) + tDisk(p, R, 0.025));
      col = mix(col, tSaddle(), tDisk(p, J, 0.03));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoJoinTree(p, t); }`,
  }),
  defineModule({
    name: "topoSplitTree",
    doc: "split tree of a superlevel filtration: components split as α decreases",
    glsl: /* glsl */ `
    vec3 topoSplitTree(vec2 p, float t) {
      vec3 col = tPaper();
      vec2 S = vec2(0.72, 0.78), L = vec2(0.36, 0.28 + 0.04 * cos(t * 0.4)), R = vec2(1.10, 0.26);
      col = mix(col, tDeath(), tSeg(p, S, L, 0.012) + tSeg(p, S, R, 0.012));
      col = mix(col, tAmber(), tDisk(p, S, 0.03));
      col = mix(col, tInk(), tDisk(p, L, 0.024) + tDisk(p, R, 0.024));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSplitTree(p, t); }`,
  }),
  defineModule({
    name: "topoCycleBasis",
    doc: "homology cycle basis: independent loops spanning H1, inked as a generating set",
    glsl: /* glsl */ `
    vec3 topoCycleBasis(vec2 p, float t) {
      vec3 col = tPaper();
      float a = abs(length(p - vec2(0.48, 0.52)) - 0.16);
      float b = abs(length(p - vec2(0.98, 0.48)) - 0.14);
      float c = abs(length(p - vec2(0.74, 0.58)) - (0.28 + 0.03 * sin(t * 0.35)));
      col = mix(col, tBirth(), tFill(a - 0.01));
      col = mix(col, tDeath(), tFill(b - 0.01));
      col = mix(col, tVoid(), tFill(c - 0.008) * 0.55);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCycleBasis(p, t); }`,
  }),
  defineModule({
    name: "topoCocycleHighlight",
    doc: "cohomology cocycle: a dual 1-cochain that pairs to 1 on a generating cycle",
    glsl: /* glsl */ `
    vec3 topoCocycleHighlight(vec2 p, float t) {
      vec2 c = vec2(0.74, 0.5);
      float ang = atan(p.y - c.y, p.x - c.x);
      float cut = abs(fract((ang + 3.14159) / 6.28318 + t * 0.02) - 0.5);
      float ring = abs(length(p - c) - 0.22);
      vec3 col = tFieldPaper(tMorse(p) * 0.4);
      col = mix(col, tInk(), tFill(ring - 0.008) * 0.35);
      col = mix(col, tAmber(), tFill(min(ring, abs(p.y - c.y)) - 0.012) * step(c.x, p.x) * (1.0 - smoothstep(0.08, 0.2, cut)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCocycleHighlight(p, t); }`,
  }),
  defineModule({
    name: "topoVoidBirthDeath",
    doc: "H2 bars as nested void shells: inner birth, outer death of a cavity",
    glsl: /* glsl */ `
    vec3 topoVoidBirthDeath(vec2 p, float t) {
      float r = length(p - vec2(0.72, 0.5));
      float b = 0.12 + 0.03 * sin(t * 0.5), d = 0.34;
      vec3 col = mix(tPaper(), tVoid(), tBand(r, b, d));
      col = mix(col, tBirth(), tIso(r, b, 1.7));
      col = mix(col, tDeath(), tIso(r, d, 1.7));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoVoidBirthDeath(p, t); }`,
  }),
  defineModule({
    name: "topoConnectedComponents",
    doc: "labeled H0 components of a superlevel: one colour per class",
    glsl: /* glsl */ `
    vec3 topoConnectedComponents(vec2 p, float t) {
      float f = tMorse(p), a = 0.55 - 0.28 * (0.5 + 0.5 * sin(t * 0.4));
      float on = smoothstep(a - fwidth(f), a + fwidth(f), f);
      float id = step(length(p - vec2(1.05, 0.46)), length(p - vec2(0.55, 0.64)));
      vec3 lab = mix(tBirth(), tDeath(), id);
      return tTone(mix(tPaper(), lab, on));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoConnectedComponents(p, t); }`,
  }),
  defineModule({
    name: "topoLoopWinding",
    doc: "winding number of a 1-cycle around a point: the pairing ⟨cocycle, cycle⟩",
    glsl: /* glsl */ `
    vec3 topoLoopWinding(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.5), v = p - c;
      float ang = atan(v.y, v.x) + t * 0.15;
      float wind = fract(ang / 6.28318);
      float ring = abs(length(v) - 0.24);
      vec3 col = mix(tPaper(), tMix3(wind, tBirth(), tAmber(), tDeath()), 0.55);
      col = mix(col, tInk(), tFill(ring - 0.012));
      col = mix(col, tSaddle(), tDisk(p, c, 0.03));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLoopWinding(p, t); }`,
  }),
  defineModule({
    name: "topoMod2Pairing",
    doc: "F2 pairing of cycles: overlapping generators cancel (xor), leftover is the class",
    glsl: /* glsl */ `
    vec3 topoMod2Pairing(vec2 p, float t) {
      float a = tFill(abs(length(p - vec2(0.58, 0.5)) - 0.18) - 0.03);
      float b = tFill(abs(length(p - vec2(0.90, 0.5)) - 0.18) - 0.03);
      float x = abs(a - b);
      vec3 col = mix(tPaper(), tVoid(), max(a, b) * 0.25);
      col = mix(col, tDeath(), x);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMod2Pairing(p, t); }`,
  }),
  defineModule({
    name: "topoBettiStair",
    doc: "Betti stair (β0, β1, β2) as three step traces against the filtration axis",
    glsl: /* glsl */ `
    vec3 topoBettiStair(vec2 p, float t) {
      float a = p.x / 1.44;
      float b0 = (1.0 + step(a, 0.7) + step(a, 0.45)) / 4.0;
      float b1 = step(0.3, a) * step(a, 0.62) * 0.22;
      float b2 = step(0.48, a) * step(a, 0.58 + 0.04 * sin(t)) * 0.16;
      vec3 col = tPaper();
      col = mix(col, tBirth(), tIso(p.y, 0.2 + b0, 2.0));
      col = mix(col, tDeath(), tIso(p.y, 0.2 + b1, 2.0));
      col = mix(col, tVoid(), tIso(p.y, 0.2 + b2, 2.0));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBettiStair(p, t); }`,
  }),
  defineModule({
    name: "topoBoundaryCycle",
    doc: "boundary of a 2-chain: ∂σ² is a 1-cycle that bounds, hence is zero in H1",
    glsl: /* glsl */ `
    vec3 topoBoundaryCycle(vec2 p, float t) {
      vec2 a = vec2(0.40, 0.28), b = vec2(1.10, 0.30), c = vec2(0.72, 0.78 + 0.04 * sin(t * 0.4));
      float ab = tSeg(p, a, b, 0.01), bc = tSeg(p, b, c, 0.01), ca = tSeg(p, c, a, 0.01);
      vec3 col = mix(tPaper(), tMint(), (ab + bc + ca) * 0.2);
      col = mix(col, tBirth(), max(ab, max(bc, ca)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBoundaryCycle(p, t); }`,
  }),
  defineModule({
    name: "topoReducedBetti",
    doc: "reduced homology: tilde β0 = β0−1, the extra point at −∞ removed",
    glsl: /* glsl */ `
    vec3 topoReducedBetti(vec2 p, float t) {
      vec3 col = tPaper();
      col = mix(col, mix(tInk(), tPaper(), 0.45), tBox(p, vec2(0.14, 0.70), vec2(1.22, 0.78)));
      col = mix(col, tBirth(), tBox(p, vec2(0.14, 0.48), vec2(0.62 + 0.1 * sin(t * 0.3), 0.56)));
      col = mix(col, tDeath(), tBox(p, vec2(0.14, 0.26), vec2(0.40, 0.34)));
      float ghost = tBox(p, vec2(0.14, 0.70), vec2(0.22, 0.78));
      col = mix(col, tSaddle(), ghost);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoReducedBetti(p, t); }`,
  }),
];
