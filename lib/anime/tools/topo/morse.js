// Morse / Reeb: index color, contour/Reeb trees, Morse–Smale, cancellation, handles.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoMorseIndexColor",
    doc: "Morse index: Hessian signature colours min / saddle / max at critical points",
    glsl: /* glsl */ `
    vec3 topoMorseIndexColor(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f);
      float crit = tCrit(p);
      float det = tHessDet(p), tr = tHessTr(p);
      vec3 idx = det < 0.0 ? tSaddle() : (tr > 0.0 ? tBirth() : tDeath());
      return tTone(mix(col, idx, crit * 0.92));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMorseIndexColor(p, t); }`,
  }),
  defineModule({
    name: "topoReebGraphContours",
    doc: "Reeb graph: isolines collapsed to points, saddles as branch nodes",
    glsl: /* glsl */ `
    vec3 topoReebGraphContours(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f * 0.7);
      for (int i = 1; i <= 6; i++) col = mix(col, tInk(), tIso(f, float(i) / 7.0, 1.05) * 0.7);
      vec2 A = vec2(0.55, 0.64), B = vec2(1.05, 0.46), S = vec2(0.78, 0.50);
      col = mix(col, tBirth(), tDisk(p, A, 0.028) + tDisk(p, B, 0.024));
      col = mix(col, tSaddle(), tDisk(p, S, 0.022));
      col = mix(col, tInk(), tSeg(p, A, S, 0.006) + tSeg(p, B, S, 0.006));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoReebGraphContours(p, t); }`,
  }),
  defineModule({
    name: "topoHeightReebTerrain",
    doc: "height-function Reeb of a terrain plate: contours plus the Reeb quotient graph",
    glsl: /* glsl */ `
    vec3 topoHeightReebTerrain(vec2 p, float t) {
      float h = tTerrain(p + vec2(t * 0.02, 0.0));
      vec3 col = tMix3(h, tInk(), tMint(), tPaper());
      for (int i = 1; i <= 5; i++) col = mix(col, tSaddle(), tIso(h, float(i) / 6.0, 1.1) * 0.55);
      float spine = tSeg(p, vec2(0.22, 0.18 + h * 0.1), vec2(1.22, 0.22 + tTerrain(vec2(1.22, 0.5)) * 0.4), 0.007);
      return tTone(mix(col, tAmber(), spine * 0.8));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHeightReebTerrain(p, t); }`,
  }),
  defineModule({
    name: "topoMorseSmaleComplex",
    doc: "Morse–Smale cells: intersections of stable and unstable manifolds",
    glsl: /* glsl */ `
    vec3 topoMorseSmaleComplex(vec2 p, float t) {
      vec2 g = tGrad(p);
      float u = abs(sin(dot(normalize(g + 1e-5), vec2(-g.y, g.x)) * 20.0 + t * 0.2));
      float cell = floor((atan(g.y, g.x) + 3.1416) / 1.047) / 6.0;
      vec3 col = mix(tPaper(), tMix3(cell, tBirth(), tSaddle(), tDeath()), 0.45);
      col = mix(col, tInk(), (1.0 - smoothstep(0.1, 0.35, u)) * 0.5);
      return tTone(mix(col, tAmber(), tCrit(p)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMorseSmaleComplex(p, t); }`,
  }),
  defineModule({
    name: "topoAscendingManifold",
    doc: "ascending (unstable) manifold of a saddle: points flowing away under +grad",
    glsl: /* glsl */ `
    vec3 topoAscendingManifold(vec2 p, float t) {
      vec2 g = tGrad(p);
      vec2 s = p - vec2(0.78, 0.50);
      float along = abs(dot(normalize(s + 1e-5), normalize(g + 1e-5)));
      float arm = exp(-length(s) * 3.2) * (1.0 - smoothstep(0.15, 0.55, along));
      vec3 col = tFieldPaper(tMorse(p));
      return tTone(mix(col, tBirth(), clamp(arm * 1.6, 0.0, 1.0)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoAscendingManifold(p, t); }`,
  }),
  defineModule({
    name: "topoDescendingManifold",
    doc: "descending (stable) manifold of a saddle: points flowing in under −grad",
    glsl: /* glsl */ `
    vec3 topoDescendingManifold(vec2 p, float t) {
      vec2 g = tGrad(p);
      vec2 s = p - vec2(0.78, 0.50);
      float along = abs(dot(normalize(s + 1e-5), normalize(vec2(-g.y, g.x) + 1e-5)));
      float arm = exp(-length(s) * 3.0) * (1.0 - smoothstep(0.12, 0.5, along));
      vec3 col = tFieldPaper(tMorse(p));
      return tTone(mix(col, tDeath(), clamp(arm * 1.6, 0.0, 1.0)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDescendingManifold(p, t); }`,
  }),
  defineModule({
    name: "topoIndex1Separatrix",
    doc: "index-1 separatrices: the four rays leaving a 2D saddle",
    glsl: /* glsl */ `
    vec3 topoIndex1Separatrix(vec2 p, float t) {
      vec3 H = tHess(vec2(0.78, 0.50));
      vec2 s = p - vec2(0.78, 0.50);
      float q = H.x * s.x * s.x + 2.0 * H.y * s.x * s.y + H.z * s.y * s.y;
      float sep = exp(-abs(q) * 8.0) * exp(-length(s) * 1.4);
      vec3 col = tFieldPaper(tMorse(p));
      return tTone(mix(col, tSaddle(), clamp(sep * 1.8, 0.0, 1.0)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoIndex1Separatrix(p, t); }`,
  }),
  defineModule({
    name: "topoCancelPair",
    doc: "Morse cancellation: a min–saddle (or saddle–max) pair that can be cancelled",
    glsl: /* glsl */ `
    vec3 topoCancelPair(vec2 p, float t) {
      vec2 mn = vec2(0.50, 0.34), sd = vec2(0.88, 0.62);
      float u = 0.5 + 0.5 * sin(t * 0.6);
      vec3 col = tFieldPaper(tMorse(p) * 0.5);
      col = mix(col, tBirth(), tDisk(p, mn, 0.03));
      col = mix(col, tSaddle(), tDisk(p, sd, 0.028));
      col = mix(col, mix(tInk(), tDeath(), u), tSeg(p, mn, sd, 0.01));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCancelPair(p, t); }`,
  }),
  defineModule({
    name: "topoHandleAttach",
    doc: "handle attachment: index-k handle glued at a critical value, shown as a k-cell",
    glsl: /* glsl */ `
    vec3 topoHandleAttach(vec2 p, float t) {
      float f = tMorse(p), a = 0.4 + 0.2 * sin(t * 0.35);
      vec3 col = mix(tPaper(), tMint(), 1.0 - smoothstep(a, a + 0.05, f));
      float h0 = tDisk(p, vec2(0.36, 0.28), 0.05);
      float h1 = tFill(abs(length(p - vec2(0.78, 0.52)) - 0.14) - 0.02);
      float h2 = tFill(length(p - vec2(1.14, 0.30)) - 0.07) * tFill(0.05 - length(p - vec2(1.14, 0.30)));
      col = mix(col, tBirth(), h0);
      col = mix(col, tSaddle(), h1);
      col = mix(col, tDeath(), h2);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHandleAttach(p, t); }`,
  }),
  defineModule({
    name: "topoContourTree",
    doc: "contour tree = join tree + split tree glued at regular levels",
    glsl: /* glsl */ `
    vec3 topoContourTree(vec2 p, float t) {
      vec3 col = tPaper();
      vec2 top = vec2(0.72, 0.86), mid = vec2(0.72, 0.50), lo = vec2(0.72, 0.16);
      vec2 L = vec2(0.34, 0.50 + 0.04 * sin(t * 0.3)), R = vec2(1.10, 0.50);
      col = mix(col, tInk(), tSeg(p, top, mid, 0.008) + tSeg(p, mid, lo, 0.008));
      col = mix(col, tBirth(), tSeg(p, L, mid, 0.008));
      col = mix(col, tDeath(), tSeg(p, R, mid, 0.008));
      col = mix(col, tAmber(), tDisk(p, top, 0.024));
      col = mix(col, tSaddle(), tDisk(p, mid, 0.022) + tDisk(p, L, 0.018) + tDisk(p, R, 0.018));
      col = mix(col, tInk(), tDisk(p, lo, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoContourTree(p, t); }`,
  }),
  defineModule({
    name: "topoReebRadius",
    doc: "Reeb graph metric thickening: a tubular neighborhood of the Reeb quotient",
    glsl: /* glsl */ `
    vec3 topoReebRadius(vec2 p, float t) {
      float d = min(length(p - mix(vec2(0.55, 0.64), vec2(0.78, 0.50), 0.5)), length(p - mix(vec2(1.05, 0.46), vec2(0.78, 0.50), 0.5)));
      float r = 0.05 + 0.03 * sin(t * 0.5);
      vec3 col = mix(tPaper(), tMint(), tFill(d - r) * 0.7);
      col = mix(col, tInk(), tIso(d, r, 1.4));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoReebRadius(p, t); }`,
  }),
  defineModule({
    name: "topoMorseInequality",
    doc: "Morse inequalities: c_k ≥ β_k drawn as count bars vs Betti bars",
    glsl: /* glsl */ `
    vec3 topoMorseInequality(vec2 p, float t) {
      float k = floor(p.x / 0.48);
      float ck = k < 1.0 ? 0.22 : (k < 2.0 ? 0.55 : 0.28);
      float bk = k < 1.0 ? 0.16 : (k < 2.0 ? 0.22 + 0.04 * sin(t) : 0.12);
      vec3 col = tPaper();
      col = mix(col, tSaddle(), tBox(p, vec2(k * 0.48 + 0.08, 0.14), vec2(k * 0.48 + 0.22, 0.14 + ck)));
      col = mix(col, tBirth(), tBox(p, vec2(k * 0.48 + 0.26, 0.14), vec2(k * 0.48 + 0.38, 0.14 + bk)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMorseInequality(p, t); }`,
  }),
  defineModule({
    name: "topoGradientLikeField",
    doc: "gradient-like Morse vector field: arrows decrease f, vanish only at crits",
    glsl: /* glsl */ `
    vec3 topoGradientLikeField(vec2 p, float t) {
      vec2 g = -tGrad(p);
      vec2 cell = fract(p * vec2(9.0, 6.0)) - 0.5;
      vec2 dir = normalize(g + 1e-5);
      float shaft = tFill(abs(cell.x * dir.y - cell.y * dir.x) * 18.0 - 0.15) * step(abs(dot(cell, dir)), 0.35);
      vec3 col = tFieldPaper(tMorse(p));
      col = mix(col, tInk(), shaft * (1.0 - tCrit(p)));
      return tTone(mix(col, tSaddle(), tCrit(p)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGradientLikeField(p, t); }`,
  }),
  defineModule({
    name: "topoCriticalOrbit",
    doc: "critical orbit of a time-varying Morse function: crits trace paths in the plane",
    glsl: /* glsl */ `
    vec3 topoCriticalOrbit(vec2 p, float t) {
      vec2 A = vec2(0.50 + 0.08 * sin(t * 0.4), 0.62 + 0.05 * cos(t * 0.3));
      vec2 B = vec2(1.06 - 0.06 * cos(t * 0.35), 0.46);
      vec2 S = 0.5 * (A + B);
      vec3 col = tFieldPaper(tMorse(p) * 0.4);
      float trail = 0.0;
      for (int i = 0; i < 8; i++) {
        float u = float(i) / 8.0;
        vec2 At = vec2(0.50 + 0.08 * sin((t - u) * 0.4), 0.62 + 0.05 * cos((t - u) * 0.3));
        trail = max(trail, tDisk(p, At, 0.012) * (1.0 - u));
      }
      col = mix(col, tBirth(), trail);
      col = mix(col, tAmber(), tDisk(p, A, 0.026));
      col = mix(col, tDeath(), tDisk(p, B, 0.022));
      col = mix(col, tSaddle(), tDisk(p, S, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCriticalOrbit(p, t); }`,
  }),
  defineModule({
    name: "topoMorseBasin",
    doc: "Morse basin of attraction: partition of the domain by the descending min",
    glsl: /* glsl */ `
    vec3 topoMorseBasin(vec2 p, float t) {
      float dA = length(p - vec2(0.55, 0.64)), dB = length(p - vec2(1.05, 0.46));
      vec2 g = tGrad(p);
      float flowBias = dot(g, vec2(1.05, 0.46) - vec2(0.55, 0.64));
      float side = step(dA + 0.15 * flowBias, dB);
      vec3 col = mix(tDeath(), tBirth(), side);
      col = mix(tPaper(), col, 0.55 + 0.25 * tMorse(p));
      col = mix(col, tSaddle(), tIso(dA - dB, 0.0, 2.0) * 0.7);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMorseBasin(p, t); }`,
  }),
];
