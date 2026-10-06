// Persistence: barcodes, diagrams, landscapes, bottleneck, Wasserstein, images.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoPersistenceBarcode",
    doc: "persistence barcode: horizontal birth–death bars (H0 teal, H1 magenta) on filtration axis",
    glsl: /* glsl */ `
    vec3 topoPersistenceBarcode(vec2 p, float t) {
      vec3 col = tPaper();
      float axis = tSeg(p, vec2(0.16, 0.18), vec2(1.28, 0.18), 0.006);
      col = mix(col, tInk(), axis);
      float b0e = tBox(p, vec2(0.18, 0.72), vec2(0.18 + 0.92, 0.78));
      float b0f = tBox(p, vec2(0.18, 0.56), vec2(0.18 + 0.38 + 0.08 * sin(t * 0.4), 0.62));
      float b1 = tBox(p, vec2(0.42, 0.38), vec2(0.42 + 0.36 + 0.06 * cos(t * 0.5), 0.44));
      col = mix(col, tBirth(), max(b0e, b0f));
      col = mix(col, tDeath(), b1);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceBarcode(p, t); }`,
  }),
  defineModule({
    name: "topoPersistenceDiagram",
    doc: "persistence diagram: points (birth, death) above the diagonal, lifetime = death−birth",
    glsl: /* glsl */ `
    vec3 topoPersistenceDiagram(vec2 p, float t) {
      vec2 o = vec2(0.28, 0.16), s = vec2(0.82, 0.72);
      vec3 col = tPaper();
      col = mix(col, tInk(), tSeg(p, o, o + vec2(s.x, 0.0), 0.005) + tSeg(p, o, o + vec2(0.0, s.y), 0.005));
      col = mix(col, tInk(), tSeg(p, o, o + s * vec2(1.0, 1.0), 0.004) * 0.7);
      vec2 p0 = o + s * vec2(0.12, 0.88);
      vec2 p1 = o + s * vec2(0.38 + 0.04 * sin(t * 0.4), 0.62);
      vec2 p2 = o + s * vec2(0.52, 0.78);
      col = mix(col, tBirth(), tDisk(p, p0, 0.028) + tDisk(p, p1, 0.022));
      col = mix(col, tDeath(), tDisk(p, p2, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceDiagram(p, t); }`,
  }),
  defineModule({
    name: "topoPersistenceLandscape",
    doc: "persistence landscapes λ_k(t): k-th largest tent min(t−b, d−t)_+ stacked",
    glsl: /* glsl */ `
    float topoTent(float x, float b, float d) { return max(0.0, min(x - b, d - x)); }
    vec3 topoPersistenceLandscape(vec2 p, float t) {
      float x = mix(0.05, 0.95, clamp(p.x / 1.44, 0.0, 1.0));
      float l1 = topoTent(x, 0.08, 0.92);
      float l2 = topoTent(x, 0.22, 0.58 + 0.06 * sin(t * 0.35));
      float l3 = topoTent(x, 0.36, 0.52);
      float y = p.y;
      vec3 col = tPaper();
      col = mix(col, tBirth(), tFill(y - 0.18 - l1 * 0.55) * (1.0 - tFill(y - 0.18)));
      col = mix(col, tMint(), tFill(y - 0.18 - l2 * 0.55) * (1.0 - tFill(y - 0.18)));
      col = mix(col, tDeath(), tFill(y - 0.18 - l3 * 0.55) * (1.0 - tFill(y - 0.18)));
      col = mix(col, tInk(), tIso(y, 0.18, 1.2));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceLandscape(p, t); }`,
  }),
  defineModule({
    name: "topoBottleneckSmear",
    doc: "bottleneck matching: L∞ balls and matching segments between two diagrams",
    glsl: /* glsl */ `
    vec3 topoBottleneckSmear(vec2 p, float t) {
      vec2 a = vec2(0.42, 0.38), b = vec2(0.86, 0.62);
      vec2 c = vec2(0.50 + 0.04 * sin(t), 0.44), d = vec2(0.92, 0.70);
      float w = 0.07 + 0.02 * sin(t * 0.6);
      vec3 col = tPaper();
      col = mix(col, tBirth(), tFill(max(abs(p.x - a.x), abs(p.y - a.y)) - w) * 0.35);
      col = mix(col, tDeath(), tFill(max(abs(p.x - b.x), abs(p.y - b.y)) - w) * 0.35);
      col = mix(col, tInk(), tSeg(p, a, c, 0.008) + tSeg(p, b, d, 0.008));
      col = mix(col, tBirth(), tDisk(p, a, 0.018) + tDisk(p, c, 0.016));
      col = mix(col, tDeath(), tDisk(p, b, 0.018) + tDisk(p, d, 0.016));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBottleneckSmear(p, t); }`,
  }),
  defineModule({
    name: "topoWassersteinSmear",
    doc: "p-Wasserstein transport: mass smeared along matching edges with p-cost thickness",
    glsl: /* glsl */ `
    vec3 topoWassersteinSmear(vec2 p, float t) {
      vec2 a0 = vec2(0.34, 0.32), a1 = vec2(0.78, 0.58);
      vec2 b0 = vec2(0.48, 0.70), b1 = vec2(0.98, 0.40);
      float u = 0.5 + 0.5 * sin(t * 0.5);
      vec2 m0 = mix(a0, a1, u), m1 = mix(b0, b1, u);
      float cost0 = pow(length(a1 - a0), 2.0), cost1 = pow(length(b1 - b0), 2.0);
      vec3 col = tPaper();
      col = mix(col, tBirth(), tSeg(p, a0, a1, 0.01 + 0.02 * cost0) * 0.7);
      col = mix(col, tDeath(), tSeg(p, b0, b1, 0.01 + 0.02 * cost1) * 0.7);
      col = mix(col, tAmber(), tDisk(p, m0, 0.02) + tDisk(p, m1, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoWassersteinSmear(p, t); }`,
  }),
  defineModule({
    name: "topoBarcodeH0",
    doc: "H0 barcode only: connected-component bars from a merge tree (elder deaths)",
    glsl: /* glsl */ `
    vec3 topoBarcodeH0(vec2 p, float t) {
      vec3 col = tFieldPaper(tMorse(p) * 0.45);
      float e = 0.06 * sin(t * 0.3);
      col = mix(col, tBirth(), tBox(p, vec2(0.14, 0.72), vec2(1.22, 0.78)));
      col = mix(col, tMint(), tBox(p, vec2(0.14, 0.56), vec2(0.58 + e, 0.62)));
      col = mix(col, tAmber(), tBox(p, vec2(0.14, 0.40), vec2(0.36 + e * 0.5, 0.46)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBarcodeH0(p, t); }`,
  }),
  defineModule({
    name: "topoBarcodeH1",
    doc: "H1 barcode: loop bars born at saddles and dying at the filling height",
    glsl: /* glsl */ `
    vec3 topoBarcodeH1(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f * 0.4);
      float loop = abs(length(p - vec2(0.78, 0.54)) - (0.18 + 0.03 * sin(t * 0.4)));
      col = mix(col, tDeath(), tFill(loop - 0.012) * 0.75);
      col = mix(col, tVoid(), tBox(p, vec2(0.16, 0.16), vec2(0.16 + 0.42 + 0.08 * sin(t * 0.35), 0.21)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBarcodeH1(p, t); }`,
  }),
  defineModule({
    name: "topoDiagramH0H1",
    doc: "two-dimension diagram: H0 squares and H1 diamonds on one birth–death plane",
    glsl: /* glsl */ `
    vec3 topoDiagramH0H1(vec2 p, float t) {
      vec2 o = vec2(0.26, 0.14), s = vec2(0.9, 0.74);
      vec3 col = tPaper();
      col = mix(col, tInk(), tSeg(p, o, o + vec2(s.x, s.x * 0.82), 0.004));
      vec2 h0 = o + s * vec2(0.18, 0.72 + 0.03 * sin(t * 0.3));
      vec2 h1 = o + s * vec2(0.48, 0.66);
      float sq = tFill(max(abs(p.x - h0.x), abs(p.y - h0.y)) - 0.022);
      float dia = tFill(abs(p.x - h1.x) + abs(p.y - h1.y) - 0.026);
      col = mix(col, tBirth(), sq);
      col = mix(col, tDeath(), dia);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDiagramH0H1(p, t); }`,
  }),
  defineModule({
    name: "topoPersistenceImage",
    doc: "persistence image: Gaussian kernels at (birth, persist) with a linear weighting",
    glsl: /* glsl */ `
    vec3 topoPersistenceImage(vec2 p, float t) {
      vec2 q = vec2(p.x / 1.44, p.y);
      vec2 c0 = vec2(0.22, 0.72), c1 = vec2(0.48, 0.40 + 0.04 * sin(t * 0.4)), c2 = vec2(0.66, 0.28);
      float img = 1.1 * exp(-dot(q - c0, q - c0) * 38.0) + 0.8 * exp(-dot(q - c1, q - c1) * 48.0) + 0.55 * exp(-dot(q - c2, q - c2) * 60.0);
      img *= q.y;
      vec3 col = tMix3(clamp(img * 1.4, 0.0, 1.0), tPaper(), tBirth(), tDeath());
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceImage(p, t); }`,
  }),
  defineModule({
    name: "topoPersistenceSilhouette",
    doc: "persistence silhouette: weighted sum of landscape tents, one curve not a stack",
    glsl: /* glsl */ `
    float topoSilTent(float x, float b, float d, float w) { return w * max(0.0, min(x - b, d - x)); }
    vec3 topoPersistenceSilhouette(vec2 p, float t) {
      float x = p.x / 1.44;
      float sil = topoSilTent(x, 0.06, 0.94, 1.0) + topoSilTent(x, 0.2, 0.6, 0.7) + topoSilTent(x, 0.4 + 0.04 * sin(t), 0.55, 0.45);
      float y = (p.y - 0.16) / 0.7;
      vec3 col = mix(tPaper(), tMint(), tFill(y - sil * 0.9) * (1.0 - tFill(y)));
      col = mix(col, tInk(), tIso(y, sil * 0.9, 1.5) * step(0.0, sil));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceSilhouette(p, t); }`,
  }),
  defineModule({
    name: "topoBettiCurve",
    doc: "Betti curve β_k(α): rank of homology vs filtration value, as a step function",
    glsl: /* glsl */ `
    float topoBettiStep(float a) {
      float b0 = 1.0 + step(a, 0.72) + step(a, 0.48);
      float b1 = step(0.28, a) * step(a, 0.62);
      return b0 + 0.35 * b1;
    }
    vec3 topoBettiCurve(vec2 p, float t) {
      float a = clamp(p.x / 1.44, 0.0, 1.0);
      float sweep = fract(t * 0.08);
      float h = topoBettiStep(a) / 4.0;
      float y = (p.y - 0.14) / 0.72;
      vec3 col = mix(tPaper(), tBirth(), tFill(y - h) * (1.0 - tFill(y)));
      col = mix(col, tSaddle(), tIso(a, sweep, 2.2) * 0.8);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBettiCurve(p, t); }`,
  }),
  defineModule({
    name: "topoLifetimeHistogram",
    doc: "lifetime histogram: counts of bars by death−birth, persistence as a statistic",
    glsl: /* glsl */ `
    vec3 topoLifetimeHistogram(vec2 p, float t) {
      float x = p.x / 1.44;
      float bin = floor(x * 8.0);
      float h = 0.12 + 0.55 * abs(sin(bin * 1.7 + t * 0.15)) * exp(-bin * 0.18);
      float bar = tFill((p.y - 0.14) - h) * tFill(0.86 - p.y) * tBand(fract(x * 8.0), 0.12, 0.88);
      vec3 col = mix(tPaper(), mix(tBirth(), tDeath(), bin / 8.0), bar);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLifetimeHistogram(p, t); }`,
  }),
  defineModule({
    name: "topoDeathBirth",
    doc: "death-versus-birth scatter (axes swapped): off-diagonal still means persist > 0",
    glsl: /* glsl */ `
    vec3 topoDeathBirth(vec2 p, float t) {
      vec2 o = vec2(0.28, 0.16), s = vec2(0.84, 0.7);
      vec3 col = tPaper();
      col = mix(col, tInk(), tSeg(p, o, o + s, 0.004));
      vec2 q = o + s * vec2(0.7 + 0.04 * sin(t * 0.3), 0.22);
      vec2 r = o + s * vec2(0.55, 0.4);
      col = mix(col, tDeath(), tDisk(p, q, 0.024));
      col = mix(col, tBirth(), tDisk(p, r, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDeathBirth(p, t); }`,
  }),
  defineModule({
    name: "topoPersistenceHeatmap",
    doc: "2D density of persistence pairs in the birth–death plane",
    glsl: /* glsl */ `
    vec3 topoPersistenceHeatmap(vec2 p, float t) {
      vec2 q = vec2(p.x / 1.44, p.y);
      float d = 0.0;
      for (int i = 0; i < 6; i++) {
        vec2 c = tH22(vec2(float(i), 2.2 + sin(t * 0.1)));
        c = vec2(c.x * 0.7 + 0.1, c.y * 0.45 + c.x * 0.4 + 0.2);
        d += exp(-dot(q - c, q - c) * 55.0);
      }
      d *= step(q.x, q.y);
      return tTone(tMix3(clamp(d, 0.0, 1.0), tPaper(), tAmber(), tDeath()));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPersistenceHeatmap(p, t); }`,
  }),
  defineModule({
    name: "topoMatchingDiagram",
    doc: "explicit bijection lines between two persistence diagrams (partial matching)",
    glsl: /* glsl */ `
    vec3 topoMatchingDiagram(vec2 p, float t) {
      vec3 col = tPaper();
      vec2 L0 = vec2(0.32, 0.30), L1 = vec2(0.40, 0.55), L2 = vec2(0.28, 0.72);
      vec2 R0 = vec2(1.02, 0.36), R1 = vec2(1.10, 0.58), R2 = vec2(0.96, 0.78);
      vec2 r0 = mix(R0, R1, 0.08 * sin(t));
      vec2 r1 = mix(R1, R2, 0.08 * sin(t + 1.0));
      vec2 r2 = mix(R2, R0, 0.08 * sin(t + 2.0));
      col = mix(col, tSaddle(), tSeg(p, L0, r0, 0.007) + tSeg(p, L1, r1, 0.007) + tSeg(p, L2, r2, 0.007));
      col = mix(col, tBirth(), tDisk(p, L0, 0.018) + tDisk(p, L1, 0.018) + tDisk(p, L2, 0.018));
      col = mix(col, tDeath(), tDisk(p, r0, 0.018) + tDisk(p, r1, 0.018) + tDisk(p, r2, 0.018));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMatchingDiagram(p, t); }`,
  }),
  defineModule({
    name: "topoLandscapeIntegral",
    doc: "landscape integral ∫ λ_k: area under each tent as a persistence statistic",
    glsl: /* glsl */ `
    vec3 topoLandscapeIntegral(vec2 p, float t) {
      float x = p.x / 1.44;
      float tent = max(0.0, min(x - 0.12, 0.78 - x));
      float area = step(p.y, 0.2 + tent * 0.7) * step(0.2, p.y);
      float mark = tBox(p, vec2(1.08, 0.16), vec2(1.22, 0.16 + 0.5 * (0.22 + 0.05 * sin(t))));
      vec3 col = mix(tPaper(), tBirth(), area);
      col = mix(col, tAmber(), mark);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLandscapeIntegral(p, t); }`,
  }),
  defineModule({
    name: "topoRankFunction",
    doc: "rank function of a persistence module: rank of the map H(s)→H(t) on the square s≤t",
    glsl: /* glsl */ `
    vec3 topoRankFunction(vec2 p, float t) {
      float s = p.x / 1.44, u = p.y;
      float rank = 0.0;
      rank += float(s <= 0.2 && u >= 0.85);
      rank += float(s <= 0.35 && u >= 0.55 + 0.04 * sin(t * 0.4));
      rank += float(s <= 0.55 && u >= 0.72);
      rank *= step(s, u + 0.02);
      vec3 col = mix(tPaper(), mix(tInk(), tBirth(), clamp(rank * 0.45, 0.0, 1.0)), step(s, u));
      col = mix(col, tDeath(), step(1.5, rank) * 0.55);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRankFunction(p, t); }`,
  }),
  defineModule({
    name: "topoIntervalDecomp",
    doc: "interval-module decomposition: indecomposable bars [b,d) stacked by dimension",
    glsl: /* glsl */ `
    vec3 topoIntervalDecomp(vec2 p, float t) {
      vec3 col = tPaper();
      col = mix(col, tBirth(), tBox(p, vec2(0.14, 0.70), vec2(1.20, 0.78)));
      col = mix(col, tMint(), tBox(p, vec2(0.14, 0.52), vec2(0.64 + 0.08 * sin(t * 0.3), 0.60)));
      col = mix(col, tDeath(), tBox(p, vec2(0.36, 0.32), vec2(0.88, 0.40)));
      col = mix(col, tVoid(), tBox(p, vec2(0.50, 0.16), vec2(0.74, 0.23)));
      float ticks = tLine(fract(p.x * 6.0) - 0.5, 8.0) * step(0.12, p.y) * step(p.y, 0.14);
      return tTone(mix(col, tInk(), ticks));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoIntervalDecomp(p, t); }`,
  }),
  defineModule({
    name: "topoBottleneckBalls",
    doc: "bottleneck balls: L∞ neighborhoods of diagram points; radius is the bottleneck distance",
    glsl: /* glsl */ `
    vec3 topoBottleneckBalls(vec2 p, float t) {
      float r = 0.09 + 0.03 * sin(t * 0.7);
      vec2 a = vec2(0.46, 0.40), b = vec2(0.88, 0.66), c = vec2(0.62, 0.72);
      float ba = max(abs(p.x - a.x), abs(p.y - a.y));
      float bb = max(abs(p.x - b.x), abs(p.y - b.y));
      float bc = max(abs(p.x - c.x), abs(p.y - c.y));
      vec3 col = tPaper();
      col = mix(col, tBirth(), tFill(ba - r) * 0.4);
      col = mix(col, tDeath(), tFill(bb - r) * 0.4);
      col = mix(col, tVoid(), tFill(bc - r) * 0.35);
      col = mix(col, tInk(), tIso(ba, r, 1.3) + tIso(bb, r, 1.3) + tIso(bc, r, 1.3));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoBottleneckBalls(p, t); }`,
  }),
  defineModule({
    name: "topoWassersteinGeodesic",
    doc: "Wasserstein geodesic: interpolated diagrams γ(u)=(1−u)X+uY as points traveling matches",
    glsl: /* glsl */ `
    vec3 topoWassersteinGeodesic(vec2 p, float t) {
      float u = 0.5 + 0.5 * sin(t * 0.45);
      vec2 a = mix(vec2(0.30, 0.28), vec2(1.08, 0.64), u);
      vec2 b = mix(vec2(0.38, 0.70), vec2(1.14, 0.42), u);
      vec3 col = tPaper();
      col = mix(col, mix(tBirth(), tDeath(), u), tSeg(p, vec2(0.30, 0.28), vec2(1.08, 0.64), 0.006));
      col = mix(col, mix(tMint(), tSaddle(), u), tSeg(p, vec2(0.38, 0.70), vec2(1.14, 0.42), 0.006));
      col = mix(col, tAmber(), tDisk(p, a, 0.022) + tDisk(p, b, 0.022));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoWassersteinGeodesic(p, t); }`,
  }),
];
