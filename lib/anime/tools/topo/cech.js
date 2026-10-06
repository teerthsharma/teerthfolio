// Čech / Vietoris–Rips / witness / alpha complexes.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoCechBallCover",
    doc: "Čech ball cover: closed balls of radius ε around landmarks",
    uniforms: () => ({ uScale: { value: 1 } }),
    glsl: /* glsl */ `
    uniform float uScale;
    vec3 topoCechBallCover(vec2 p, float t) {
      float r = (0.10 + 0.10 * (0.5 + 0.5 * sin(t * 0.45))) * max(uScale, 0.2);
      vec3 col = tPaper();
      for (int i = 0; i < 9; i++) col = mix(col, tBirth(), tDisk(p, tSite(i, t), r) * 0.22);
      for (int i = 0; i < 9; i++) col = mix(col, tInk(), tIso(length(p - tSite(i, t)), r, 1.2));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechBallCover(p, t); }`,
  }),
  defineModule({
    name: "topoVietorisRipsScale",
    doc: "Vietoris–Rips scale: edges when d(i,j)≤2ε, triangles when all three edges exist",
    uniforms: () => ({ uScale: { value: 1 } }),
    glsl: /* glsl */ `
    uniform float uScale;
    vec3 topoVietorisRipsScale(vec2 p, float t) {
      float eps = (0.08 + 0.12 * (0.5 + 0.5 * sin(t * 0.4))) * max(uScale, 0.2);
      vec3 col = tPaper();
      for (int i = 0; i < 8; i++) {
        for (int j = i + 1; j < 9; j++) {
          float d = length(tSite(i, t) - tSite(j, t));
          col = mix(col, tInk(), tSeg(p, tSite(i, t), tSite(j, t), 0.005) * (1.0 - smoothstep(2.0 * eps - 0.01, 2.0 * eps + 0.01, d)));
        }
        col = mix(col, tBirth(), tDisk(p, tSite(i, t), 0.016));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoVietorisRipsScale(p, t); }`,
  }),
  defineModule({
    name: "topoWitnessComplex",
    doc: "witness complex: landmarks plus witness points that certify simplices",
    glsl: /* glsl */ `
    vec3 topoWitnessComplex(vec2 p, float t) {
      vec3 col = tPaper();
      for (int i = 0; i < 6; i++) col = mix(col, tAmber(), tDisk(p, tSite(i, t), 0.022));
      for (int i = 6; i < 9; i++) {
        vec2 w = tSite(i, t + 1.7);
        col = mix(col, tMint(), tDisk(p, w, 0.014));
        col = mix(col, tInk(), tSeg(p, w, tSite(i - 6, t), 0.004));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoWitnessComplex(p, t); }`,
  }),
  defineModule({
    name: "topoRips1Skeleton",
    doc: "VR 1-skeleton only: the flag graph G_ε, no filled faces",
    glsl: /* glsl */ `
    vec3 topoRips1Skeleton(vec2 p, float t) {
      float thr = 0.28 + 0.08 * sin(t * 0.35);
      vec3 col = tPaper();
      for (int i = 0; i < 8; i++) {
        for (int j = i + 1; j < 9; j++) {
          float d = length(tSite(i, t) - tSite(j, t));
          col = mix(col, tInk(), tSeg(p, tSite(i, t), tSite(j, t), 0.0045) * step(d, thr));
        }
        col = mix(col, tBirth(), tDisk(p, tSite(i, t), 0.015));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRips1Skeleton(p, t); }`,
  }),
  defineModule({
    name: "topoRips2Fill",
    doc: "VR triangles: fill every clique of three landmarks at the current scale",
    glsl: /* glsl */ `
    float topoRipsTri(vec2 p, vec2 a, vec2 b, vec2 c) {
      vec2 v0 = b - a, v1 = c - a, v2 = p - a;
      float inv = 1.0 / max(dot(v0, v0) * dot(v1, v1) - dot(v0, v1) * dot(v0, v1), 1e-6);
      float u = (dot(v1, v1) * dot(v2, v0) - dot(v0, v1) * dot(v2, v1)) * inv;
      float v = (dot(v0, v0) * dot(v2, v1) - dot(v0, v1) * dot(v2, v0)) * inv;
      return tFill(max(max(-u, -v), u + v - 1.0));
    }
    vec3 topoRips2Fill(vec2 p, float t) {
      float thr = 0.34 + 0.08 * sin(t * 0.3);
      vec2 a = tSite(0, t), b = tSite(2, t), c = tSite(4, t);
      vec3 col = tPaper();
      float ok = step(length(a - b), thr) * step(length(b - c), thr) * step(length(c - a), thr);
      col = mix(col, tSaddle(), topoRipsTri(p, a, b, c) * ok * 0.6);
      col = mix(col, tInk(), (tSeg(p, a, b, 0.005) + tSeg(p, b, c, 0.005) + tSeg(p, c, a, 0.005)) * ok);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRips2Fill(p, t); }`,
  }),
  defineModule({
    name: "topoCechNerve",
    doc: "Čech nerve of balls: a simplex iff the balls have common intersection",
    glsl: /* glsl */ `
    vec3 topoCechNerve(vec2 p, float t) {
      float r = 0.17 + 0.04 * sin(t * 0.4);
      vec2 a = tSite(1, t), b = tSite(3, t), c = tSite(5, t);
      float ia = tFill(length(p - a) - r), ib = tFill(length(p - b) - r), ic = tFill(length(p - c) - r);
      vec3 col = mix(tPaper(), tMint(), max(max(ia, ib), ic) * 0.25);
      col = mix(col, tBirth(), max(ia * ib, max(ib * ic, ic * ia)) * 0.45);
      col = mix(col, tDeath(), ia * ib * ic);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechNerve(p, t); }`,
  }),
  defineModule({
    name: "topoAlphaComplex",
    doc: "alpha complex: Delaunay faces whose circumradius ≤ α and Voronoi hits the ball",
    glsl: /* glsl */ `
    vec3 topoAlphaComplex(vec2 p, float t) {
      float d1 = tMinSite(p, t), d2 = tSecondSite(p, t);
      float alpha = 0.10 + 0.10 * (0.5 + 0.5 * sin(t * 0.42));
      float vor = 1.0 - smoothstep(0.0, 0.03, d2 - d1);
      float inA = 1.0 - smoothstep(alpha, alpha + fwidth(d1) * 2.0, d1);
      vec3 col = mix(tPaper(), tAmber(), inA * 0.5);
      col = mix(col, tSaddle(), vor * inA);
      return tTone(mix(col, tInk(), tIso(d1, alpha, 1.3)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoAlphaComplex(p, t); }`,
  }),
  defineModule({
    name: "topoLazyWitness",
    doc: "lazy witness: a simplex is kept if some witness is within ν of all its vertices",
    glsl: /* glsl */ `
    vec3 topoLazyWitness(vec2 p, float t) {
      vec2 L0 = tSite(0, t), L1 = tSite(2, t), W = tSite(7, t);
      float nu = 0.10 + 0.05 * sin(t * 0.4);
      float lazy = step(length(W - L0), nu + 0.12) * step(length(W - L1), nu + 0.12);
      vec3 col = tPaper();
      col = mix(col, tMint(), tDisk(p, W, 0.018));
      col = mix(col, tBirth(), tDisk(p, L0, 0.02) + tDisk(p, L1, 0.02));
      col = mix(col, tInk(), tSeg(p, L0, L1, 0.006) * lazy);
      col = mix(col, tSaddle(), tSeg(p, W, 0.5 * (L0 + L1), 0.004));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLazyWitness(p, t); }`,
  }),
  defineModule({
    name: "topoMaxminLandmarks",
    doc: "maxmin landmark selection: greedy farthest-point sampling of the metric space",
    glsl: /* glsl */ `
    vec3 topoMaxminLandmarks(vec2 p, float t) {
      float n = 3.0 + floor(3.5 + 3.5 * sin(t * 0.25));
      float dmin = 8.0;
      vec3 col = tPaper();
      for (int i = 0; i < 9; i++) {
        float on = step(float(i), n - 0.5);
        dmin = mix(dmin, min(dmin, length(p - tSite(i, 0.0))), on);
        col = mix(col, tAmber(), tDisk(p, tSite(i, 0.0), 0.02) * on);
      }
      col = mix(col, tBirth(), (1.0 - smoothstep(0.0, 0.25, dmin)) * 0.35);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMaxminLandmarks(p, t); }`,
  }),
  defineModule({
    name: "topoScaleBirthEdge",
    doc: "edges born at scale: an edge appears exactly when 2ε reaches d(i,j)",
    glsl: /* glsl */ `
    vec3 topoScaleBirthEdge(vec2 p, float t) {
      float eps = 0.06 + 0.16 * fract(t * 0.08);
      vec3 col = tPaper();
      for (int i = 0; i < 8; i++) {
        vec2 a = tSite(i, 0.0), b = tSite(i + 1, 0.0);
        float d = length(a - b);
        float born = 1.0 - smoothstep(0.0, 0.03, abs(d - 2.0 * eps));
        float live = step(d, 2.0 * eps);
        col = mix(col, tInk(), tSeg(p, a, b, 0.004) * live * 0.45);
        col = mix(col, tSaddle(), tSeg(p, a, b, 0.009) * born);
        col = mix(col, tBirth(), tDisk(p, a, 0.014));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoScaleBirthEdge(p, t); }`,
  }),
  defineModule({
    name: "topoIntersectLens",
    doc: "pairwise ball lenses: the Čech 1-simplices as football-shaped intersections",
    glsl: /* glsl */ `
    vec3 topoIntersectLens(vec2 p, float t) {
      float r = 0.19 + 0.03 * sin(t * 0.3);
      vec2 a = tSite(2, t), b = tSite(5, t);
      float lens = tFill(length(p - a) - r) * tFill(length(p - b) - r);
      vec3 col = mix(tPaper(), tMint(), tDisk(p, a, r) * 0.2 + tDisk(p, b, r) * 0.2);
      return tTone(mix(col, tDeath(), lens));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoIntersectLens(p, t); }`,
  }),
  defineModule({
    name: "topoTripleLens",
    doc: "triple ball intersection: the Čech 2-simplex as the common cap",
    glsl: /* glsl */ `
    vec3 topoTripleLens(vec2 p, float t) {
      float r = 0.24 + 0.03 * sin(t * 0.35);
      vec2 a = tSite(0, t), b = tSite(3, t), c = tSite(6, t);
      float trip = tFill(length(p - a) - r) * tFill(length(p - b) - r) * tFill(length(p - c) - r);
      vec3 col = mix(tPaper(), tBirth(), 0.18 * (tDisk(p, a, r) + tDisk(p, b, r) + tDisk(p, c, r)));
      return tTone(mix(col, tSaddle(), trip));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoTripleLens(p, t); }`,
  }),
  defineModule({
    name: "topoRipsFlag",
    doc: "flag complex of VR: every clique of the 1-skeleton is promoted to a simplex",
    glsl: /* glsl */ `
    vec3 topoRipsFlag(vec2 p, float t) {
      float thr = 0.30 + 0.06 * sin(t * 0.28);
      vec3 col = tPaper();
      float cl = 0.0;
      for (int i = 0; i < 9; i++) {
        float e = 0.0;
        for (int j = 0; j < 9; j++) e += step(length(tSite(i, t) - tSite(j, t)), thr);
        cl = max(cl, tDisk(p, tSite(i, t), 0.018) * (e / 9.0));
        col = mix(col, tInk(), tDisk(p, tSite(i, t), 0.012));
      }
      return tTone(mix(col, tAmber(), cl));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRipsFlag(p, t); }`,
  }),
  defineModule({
    name: "topoCechVsRips",
    doc: "Čech ⊂ VR: Čech faces in teal, extra Rips-only faces in magenta",
    glsl: /* glsl */ `
    vec3 topoCechVsRips(vec2 p, float t) {
      float r = 0.16 + 0.03 * sin(t * 0.4);
      vec2 a = tSite(1, t), b = tSite(4, t), c = tSite(7, t);
      float cech = tFill(length(p - a) - r) * tFill(length(p - b) - r) * tFill(length(p - c) - r);
      float rips = step(length(a - b), 2.0 * r) * step(length(b - c), 2.0 * r) * step(length(c - a), 2.0 * r);
      vec3 col = tPaper();
      col = mix(col, tInk(), (tSeg(p, a, b, 0.005) + tSeg(p, b, c, 0.005) + tSeg(p, c, a, 0.005)) * rips);
      col = mix(col, tBirth(), cech);
      col = mix(col, tDeath(), rips * (1.0 - cech) * tDisk(p, (a + b + c) / 3.0, 0.04));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCechVsRips(p, t); }`,
  }),
  defineModule({
    name: "topoWitnessLandmarks",
    doc: "witness landmarks vs witnesses: two roles in the same point cloud",
    glsl: /* glsl */ `
    vec3 topoWitnessLandmarks(vec2 p, float t) {
      vec3 col = tPaper();
      for (int i = 0; i < 9; i++) {
        vec2 s = tSite(i, t);
        float isL = step(mod(float(i), 2.0), 0.5);
        col = mix(col, mix(tMint(), tAmber(), isL), tDisk(p, s, mix(0.012, 0.022, isL)));
      }
      float dL = 8.0;
      for (int i = 0; i < 9; i++) {
        float on = step(mod(float(i), 2.0), 0.5);
        dL = mix(dL, min(dL, length(p - tSite(i, t))), on);
      }
      col = mix(col, tBirth(), (1.0 - smoothstep(0.0, 0.2, dL)) * 0.25);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoWitnessLandmarks(p, t); }`,
  }),
];
