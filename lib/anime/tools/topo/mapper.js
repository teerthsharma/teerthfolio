// Mapper / nerve / covers: overlaps, pullbacks, partitions of unity, multiplicity.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoMapperNerve",
    doc: "Mapper nerve: overlap graph of a pullback cover of a filter",
    glsl: /* glsl */ `
    vec3 topoMapperNerve(vec2 p, float t) {
      float f = tMorse(p);
      float slot = floor(f * 4.0);
      vec3 col = mix(tPaper(), tMix3(slot / 3.0, tBirth(), tMint(), tDeath()), 0.4 + 0.3 * f);
      vec2 n0 = vec2(0.36, 0.28), n1 = vec2(0.72, 0.58), n2 = vec2(1.08, 0.30);
      col = mix(col, tInk(), tSeg(p, n0, n1, 0.007) + tSeg(p, n1, n2, 0.007));
      col = mix(col, tSaddle(), tDisk(p, n0, 0.03) + tDisk(p, n1, 0.03) + tDisk(p, n2, 0.03));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMapperNerve(p, t); }`,
  }),
  defineModule({
    name: "topoMetricNerve2Simplices",
    doc: "nerve 2-simplices of a metric ball cover: filled triples with nonempty intersection",
    glsl: /* glsl */ `
    vec3 topoMetricNerve2Simplices(vec2 p, float t) {
      float r = 0.20 + 0.05 * sin(t * 0.4);
      vec2 a = tSite(0, t), b = tSite(2, t), c = tSite(5, t);
      float ia = tFill(length(p - a) - r), ib = tFill(length(p - b) - r), ic = tFill(length(p - c) - r);
      float triple = ia * ib * ic;
      vec3 col = mix(tPaper(), tMint(), max(ia * ib, max(ib * ic, ic * ia)) * 0.35);
      col = mix(col, tSaddle(), triple);
      col = mix(col, tInk(), tSeg(p, a, b, 0.006) + tSeg(p, b, c, 0.006) + tSeg(p, c, a, 0.006));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMetricNerve2Simplices(p, t); }`,
  }),
  defineModule({
    name: "topoOpenCoverOverlap",
    doc: "pairwise overlap regions U∩V of an open cover, the 1-simplices of the nerve",
    glsl: /* glsl */ `
    vec3 topoOpenCoverOverlap(vec2 p, float t) {
      vec3 col = tPaper();
      for (int i = 0; i < 6; i++) {
        float r = 0.16 + 0.03 * sin(t * 0.2 + float(i));
        col = mix(col, tBirth(), tDisk(p, tSite(i, t), r) * 0.22);
      }
      float pair = 0.0;
      for (int i = 0; i < 5; i++) {
        float d0 = length(p - tSite(i, t)), d1 = length(p - tSite(i + 1, t));
        pair = max(pair, tFill(d0 - 0.16) * tFill(d1 - 0.16));
      }
      return tTone(mix(col, tSaddle(), pair * 0.7));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoOpenCoverOverlap(p, t); }`,
  }),
  defineModule({
    name: "topoTripleOverlap",
    doc: "triple intersections U∩V∩W, the 2-simplices of the nerve",
    glsl: /* glsl */ `
    vec3 topoTripleOverlap(vec2 p, float t) {
      float r = 0.22;
      vec3 col = tPaper();
      float trip = 0.0;
      for (int i = 0; i < 7; i++) {
        float a = tFill(length(p - tSite(i, t)) - r);
        float b = tFill(length(p - tSite(i + 1, t)) - r);
        float c = tFill(length(p - tSite(i + 2, t)) - r);
        trip = max(trip, a * b * c);
        col = mix(col, tMint(), a * 0.12);
      }
      return tTone(mix(col, tDeath(), trip));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoTripleOverlap(p, t); }`,
  }),
  defineModule({
    name: "topoNerve1Skeleton",
    doc: "1-skeleton of the nerve: vertices for sets, edges for nonempty pairwise overlap",
    glsl: /* glsl */ `
    vec3 topoNerve1Skeleton(vec2 p, float t) {
      vec3 col = tPaper();
      float r = 0.18 + 0.03 * sin(t * 0.3);
      for (int i = 0; i < 8; i++) {
        for (int j = i + 1; j < 9; j++) {
          float d = length(tSite(i, t) - tSite(j, t));
          col = mix(col, tInk(), tSeg(p, tSite(i, t), tSite(j, t), 0.005) * step(d, 2.0 * r));
        }
        col = mix(col, tBirth(), tDisk(p, tSite(i, t), 0.02));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoNerve1Skeleton(p, t); }`,
  }),
  defineModule({
    name: "topoNerve2Skeleton",
    doc: "filled 2-skeleton: every triple with common intersection is a triangle",
    glsl: /* glsl */ `
    float topoTri(vec2 p, vec2 a, vec2 b, vec2 c) {
      vec2 v0 = b - a, v1 = c - a, v2 = p - a;
      float d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1);
      float inv = 1.0 / max(d00 * d11 - d01 * d01, 1e-6);
      float u = (d11 * d20 - d01 * d21) * inv, v = (d00 * d21 - d01 * d20) * inv;
      return tFill(max(max(-u, -v), u + v - 1.0));
    }
    vec3 topoNerve2Skeleton(vec2 p, float t) {
      float r = 0.20;
      vec3 col = tPaper();
      vec2 a = tSite(0, t), b = tSite(3, t), c = tSite(6, t);
      float ok = step(length(a - b), 2.0 * r) * step(length(b - c), 2.0 * r) * step(length(c - a), 2.0 * r);
      col = mix(col, tSaddle(), topoTri(p, a, b, c) * ok * 0.55);
      col = mix(col, tInk(), tSeg(p, a, b, 0.005) + tSeg(p, b, c, 0.005) + tSeg(p, c, a, 0.005));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoNerve2Skeleton(p, t); }`,
  }),
  defineModule({
    name: "topoPullbackCover",
    doc: "Mapper pullback cover: preimages of overlapping intervals of the filter",
    glsl: /* glsl */ `
    vec3 topoPullbackCover(vec2 p, float t) {
      float f = tMorse(p);
      float shift = 0.08 * sin(t * 0.3);
      float U = tBand(f, 0.15 + shift, 0.48 + shift);
      float V = tBand(f, 0.36 + shift, 0.70 + shift);
      vec3 col = mix(tPaper(), tBirth(), U * 0.55);
      col = mix(col, tDeath(), V * 0.5);
      col = mix(col, tSaddle(), U * V);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPullbackCover(p, t); }`,
  }),
  defineModule({
    name: "topoFilterCover",
    doc: "cover of the filter range: overlapping intervals on the value axis, lifted",
    glsl: /* glsl */ `
    vec3 topoFilterCover(vec2 p, float t) {
      float f = tMorse(p);
      vec3 col = tFieldPaper(f);
      float axis = tBox(p, vec2(1.22, 0.12), vec2(1.36, 0.88));
      col = mix(col, tInk(), axis * 0.25);
      for (int i = 0; i < 4; i++) {
        float a = float(i) * 0.18 + 0.1, b = a + 0.28;
        col = mix(col, tBirth(), tBox(p, vec2(1.24, a), vec2(1.34, b)) * 0.55);
        col = mix(col, tMint(), tBand(f, a, b) * 0.2);
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoFilterCover(p, t); }`,
  }),
  defineModule({
    name: "topoClusterNerve",
    doc: "clustering-on-cover nerve: each interval is clustered, clusters become vertices",
    glsl: /* glsl */ `
    vec3 topoClusterNerve(vec2 p, float t) {
      float f = tMorse(p);
      float band = floor((f + 0.05 * sin(t)) * 3.0);
      float side = step(p.x, 0.78);
      vec3 col = mix(tPaper(), mix(tBirth(), tDeath(), side), 0.4 * tBand(f, band / 3.0, (band + 1.0) / 3.0));
      vec2 v0 = vec2(0.40, 0.25 + band * 0.18), v1 = vec2(1.04, 0.25 + band * 0.18);
      col = mix(col, tInk(), tSeg(p, v0, v1, 0.006) * step(2.0, band + side + 1.0));
      col = mix(col, tSaddle(), tDisk(p, v0, 0.022) + tDisk(p, v1, 0.022));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoClusterNerve(p, t); }`,
  }),
  defineModule({
    name: "topoCoverRefinement",
    doc: "cover refinement: a finer cover maps onto a coarser nerve (refinement arrows)",
    glsl: /* glsl */ `
    vec3 topoCoverRefinement(vec2 p, float t) {
      vec3 col = tPaper();
      for (int i = 0; i < 4; i++) col = mix(col, tBirth(), tDisk(p, vec2(0.28 + float(i) * 0.28, 0.28), 0.07) * 0.4);
      for (int i = 0; i < 7; i++) col = mix(col, tMint(), tDisk(p, vec2(0.20 + float(i) * 0.17, 0.70), 0.045) * 0.45);
      col = mix(col, tSaddle(), tSeg(p, vec2(0.72, 0.62), vec2(0.72, 0.36), 0.008));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCoverRefinement(p, t); }`,
  }),
  defineModule({
    name: "topoGoodCoverTest",
    doc: "good-cover test: nerve vs space — contractible overlaps tint teal, failures rust",
    glsl: /* glsl */ `
    vec3 topoGoodCoverTest(vec2 p, float t) {
      float r = 0.19;
      float a = tFill(length(p - tSite(1, t)) - r), b = tFill(length(p - tSite(4, t)) - r);
      float ov = a * b;
      float holes = tFill(0.04 - abs(length(p - 0.5 * (tSite(1, t) + tSite(4, t))) - 0.03));
      vec3 col = mix(tPaper(), tMint(), max(a, b) * 0.3);
      col = mix(col, tBirth(), ov * (1.0 - holes));
      col = mix(col, tSaddle(), ov * holes);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGoodCoverTest(p, t); }`,
  }),
  defineModule({
    name: "topoPartitionOfUnity",
    doc: "partition of unity subordinate to a cover: weights sum to 1, support in each set",
    glsl: /* glsl */ `
    vec3 topoPartitionOfUnity(vec2 p, float t) {
      float w0 = exp(-dot(p - tSite(0, t), p - tSite(0, t)) * 18.0);
      float w1 = exp(-dot(p - tSite(3, t), p - tSite(3, t)) * 18.0);
      float w2 = exp(-dot(p - tSite(6, t), p - tSite(6, t)) * 18.0);
      float s = max(w0 + w1 + w2, 1e-4);
      vec3 col = (w0 * tBirth() + w1 * tDeath() + w2 * tAmber()) / s;
      return tTone(mix(tPaper(), col, 0.85));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPartitionOfUnity(p, t); }`,
  }),
  defineModule({
    name: "topoLensCover",
    doc: "lens cover: pairwise ball lenses as the geometric 1-simplices",
    glsl: /* glsl */ `
    vec3 topoLensCover(vec2 p, float t) {
      float r = 0.2 + 0.04 * sin(t * 0.35);
      vec3 col = tPaper();
      for (int i = 0; i < 8; i++) {
        vec2 a = tSite(i, t), b = tSite(i + 1, t);
        float lens = tFill(length(p - a) - r) * tFill(length(p - b) - r);
        col = mix(col, tBirth(), tDisk(p, a, r) * 0.12);
        col = mix(col, tSaddle(), lens);
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLensCover(p, t); }`,
  }),
  defineModule({
    name: "topoMapperEdges",
    doc: "Mapper edges only: adjacency of clusters in consecutive filter intervals",
    glsl: /* glsl */ `
    vec3 topoMapperEdges(vec2 p, float t) {
      vec3 col = tFieldPaper(tMorse(p) * 0.35);
      for (int i = 0; i < 5; i++) {
        vec2 a = vec2(0.30 + float(i) * 0.18, 0.28 + 0.08 * sin(t * 0.2 + float(i)));
        vec2 b = vec2(0.38 + float(i) * 0.16, 0.70);
        col = mix(col, tInk(), tSeg(p, a, b, 0.007));
        col = mix(col, tBirth(), tDisk(p, a, 0.02));
        col = mix(col, tDeath(), tDisk(p, b, 0.02));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMapperEdges(p, t); }`,
  }),
  defineModule({
    name: "topoCoverMultiplicity",
    doc: "cover multiplicity: how many sets contain the point, the Čech degree",
    glsl: /* glsl */ `
    vec3 topoCoverMultiplicity(vec2 p, float t) {
      float r = 0.18 + 0.03 * sin(t * 0.3);
      float m = 0.0;
      for (int i = 0; i < 9; i++) m += tFill(length(p - tSite(i, t)) - r);
      vec3 col = tMix3(clamp(m / 4.0, 0.0, 1.0), tPaper(), tBirth(), tDeath());
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCoverMultiplicity(p, t); }`,
  }),
];
