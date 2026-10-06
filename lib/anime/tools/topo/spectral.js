// Spectral / Laplacian / eigenbands / Hodge.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoLaplacianEigenband",
    doc: "graph Laplacian eigenmode: nodal bands of sin(nπx)sin(mπy) on the rectangle",
    glsl: /* glsl */ `
    vec3 topoLaplacianEigenband(vec2 p, float t) {
      float n = 2.0 + floor(2.0 + 2.0 * sin(t * 0.15));
      float m = 1.0 + floor(2.0 + 2.0 * cos(t * 0.12));
      float u = tMode(p, n, m);
      vec3 col = mix(tDeath(), tBirth(), 0.5 + 0.5 * u);
      col = mix(col, tInk(), tIso(u, 0.0, 1.6));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoLaplacianEigenband(p, t); }`,
  }),
  defineModule({
    name: "topoHodgeHarmonicStream",
    doc: "Hodge harmonic 1-form: a divergence-free curl-free stream (ker Δ₁)",
    glsl: /* glsl */ `
    vec3 topoHodgeHarmonicStream(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.5);
      vec2 H = vec2(-c.y, c.x) / max(dot(c, c), 0.04);
      vec2 cell = fract(p * vec2(10.0, 7.0)) - 0.5;
      vec2 dir = normalize(H + 1e-5);
      float shaft = tFill(abs(cell.x * dir.y - cell.y * dir.x) * 16.0 - 0.12) * step(abs(dot(cell, dir)), 0.32);
      vec3 col = mix(tPaper(), tVoid(), 0.2);
      col = mix(col, tInk(), shaft);
      col = mix(col, tAmber(), tDisk(p, vec2(0.72, 0.5), 0.03));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHodgeHarmonicStream(p, t); }`,
  }),
  defineModule({
    name: "topoFiedlerPartition",
    doc: "Fiedler vector cut: sign of the first nontrivial Laplacian eigenfunction",
    glsl: /* glsl */ `
    vec3 topoFiedlerPartition(vec2 p, float t) {
      float u = tMode(p, 1.0, 1.0) + 0.15 * tMode(p, 2.0, 1.0) * sin(t * 0.2);
      vec3 col = mix(tBirth(), tDeath(), step(0.0, u));
      col = mix(tPaper(), col, 0.7);
      return tTone(mix(col, tInk(), tIso(u, 0.0, 1.8)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoFiedlerPartition(p, t); }`,
  }),
  defineModule({
    name: "topoHeatKernelTrace",
    doc: "heat-kernel diagonal K_t(x,x): local spectral density, brighter at bottlenecks",
    glsl: /* glsl */ `
    vec3 topoHeatKernelTrace(vec2 p, float t) {
      float tau = 0.04 + 0.06 * (0.5 + 0.5 * sin(t * 0.4));
      float tr = 0.0;
      for (int n = 1; n <= 4; n++) for (int m = 1; m <= 3; m++) {
        float lam = 9.87 * (float(n * n) / 2.07 + float(m * m));
        float phi = tMode(p, float(n), float(m));
        tr += exp(-lam * tau) * phi * phi;
      }
      return tTone(tMix3(clamp(tr * 1.6, 0.0, 1.0), tPaper(), tAmber(), tDeath()));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHeatKernelTrace(p, t); }`,
  }),
  defineModule({
    name: "topoSpectralEmbedding",
    doc: "spectral embedding: plane coloured by (φ₂, φ₃) eigen-coordinates",
    glsl: /* glsl */ `
    vec3 topoSpectralEmbedding(vec2 p, float t) {
      float a = 0.5 + 0.5 * tMode(p, 1.0, 2.0);
      float b = 0.5 + 0.5 * tMode(p, 2.0, 1.0);
      vec3 col = vec3(0.12 + 0.55 * a, 0.28 + 0.4 * b, 0.40 + 0.3 * (1.0 - a));
      return tTone(mix(tPaper(), col, 0.85));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSpectralEmbedding(p, t); }`,
  }),
  defineModule({
    name: "topoCheegerSweep",
    doc: "Cheeger sweep cut: threshold the Fiedler function, boundary is the Cheeger set",
    glsl: /* glsl */ `
    vec3 topoCheegerSweep(vec2 p, float t) {
      float u = tMode(p, 1.0, 1.0);
      float thr = 0.15 * sin(t * 0.5);
      float S = step(thr, u);
      vec3 col = mix(tPaper(), mix(tInk(), tBirth(), S), 0.7);
      return tTone(mix(col, tSaddle(), tIso(u, thr, 1.7)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCheegerSweep(p, t); }`,
  }),
  defineModule({
    name: "topoHodgeGradient",
    doc: "exact 1-forms df: gradient hatch of a 0-form, the image of d₀",
    glsl: /* glsl */ `
    vec3 topoHodgeGradient(vec2 p, float t) {
      vec2 g = tGrad(p);
      vec2 cell = fract(p * vec2(11.0, 8.0)) - 0.5;
      vec2 dir = normalize(g + 1e-5);
      float hatch = tFill(abs(dot(cell, vec2(-dir.y, dir.x))) * 20.0 - 0.1);
      vec3 col = tFieldPaper(tMorse(p));
      return tTone(mix(col, tInk(), hatch * 0.55));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHodgeGradient(p, t); }`,
  }),
  defineModule({
    name: "topoHodgeCodifferential",
    doc: "codifferential δ = *d*: divergence hatch of a 1-form, image of d*",
    glsl: /* glsl */ `
    vec3 topoHodgeCodifferential(vec2 p, float t) {
      vec2 g = tGrad(p);
      float e = 0.01;
      float div = (tGrad(p + vec2(e, 0.0)).x - g.x + tGrad(p + vec2(0.0, e)).y - g.y) / e;
      vec3 col = mix(tDeath(), tBirth(), 0.5 + 0.5 * tanh(div * 0.15));
      col = mix(tPaper(), col, 0.7);
      return tTone(mix(col, tInk(), tIso(div, 0.0, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHodgeCodifferential(p, t); }`,
  }),
  defineModule({
    name: "topoHarmonic1Form",
    doc: "harmonic 1-form on an annulus: dα=0 and δα=0, circulating field",
    glsl: /* glsl */ `
    vec3 topoHarmonic1Form(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.5);
      float r = length(c);
      vec3 col = mix(tPaper(), tVoid(), tBand(r, 0.14, 0.34) * 0.55);
      float stream = abs(sin(atan(c.y, c.x) * 8.0 + t * 0.4));
      col = mix(col, tInk(), tBand(r, 0.14, 0.34) * (1.0 - smoothstep(0.15, 0.45, stream)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHarmonic1Form(p, t); }`,
  }),
  defineModule({
    name: "topoEigenGap",
    doc: "spectral gap λ₂−λ₁ as stripe density: tighter gap, wider wash",
    glsl: /* glsl */ `
    vec3 topoEigenGap(vec2 p, float t) {
      float gap = 0.35 + 0.25 * sin(t * 0.3);
      float u = tMode(p, 1.0, 1.0);
      float v = tMode(p, 2.0, 1.0);
      float mixv = mix(u, v, gap);
      vec3 col = mix(tPaper(), tMint(), 0.5 + 0.4 * mixv);
      col = mix(col, tSaddle(), tIso(mixv, 0.0, 1.4));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoEigenGap(p, t); }`,
  }),
  defineModule({
    name: "topoNormalizedLaplacian",
    doc: "normalized Laplacian L_sym eigenbands: degree-weighted nodal sets",
    glsl: /* glsl */ `
    vec3 topoNormalizedLaplacian(vec2 p, float t) {
      float deg = 0.6 + 0.4 * tFbm(p * 3.0);
      float u = tMode(p, 2.0, 2.0) / sqrt(max(deg, 0.2));
      vec3 col = mix(tInk(), tBirth(), 0.5 + 0.5 * u);
      return tTone(mix(col, tAmber(), tIso(u, 0.0, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoNormalizedLaplacian(p, t); }`,
  }),
  defineModule({
    name: "topoCotanLaplacian",
    doc: "cotan-Laplace on a terrain graph: Δf ≈ sum cot(α)(f_j−f_i) as a field",
    glsl: /* glsl */ `
    vec3 topoCotanLaplacian(vec2 p, float t) {
      vec3 H = tHess(p);
      float lap = H.x + H.z;
      vec3 col = mix(tDeath(), tBirth(), 0.5 + 0.5 * tanh(lap * 0.08));
      col = mix(tPaper(), col, 0.75);
      return tTone(mix(col, tInk(), tIso(lap, 0.0, 1.4)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCotanLaplacian(p, t); }`,
  }),
  defineModule({
    name: "topoHodgeStarStripe",
    doc: "Hodge star * : k-forms → (n−k)-forms, drawn as rotated hatch",
    glsl: /* glsl */ `
    vec3 topoHodgeStarStripe(vec2 p, float t) {
      float a = tMorse(p);
      vec2 g = tGrad(p);
      vec2 gs = vec2(-g.y, g.x);
      float h0 = abs(sin(dot(p, normalize(g + 1e-5)) * 28.0));
      float h1 = abs(sin(dot(p, normalize(gs + 1e-5)) * 28.0));
      float u = 0.5 + 0.5 * sin(t * 0.5);
      vec3 col = tFieldPaper(a);
      col = mix(col, tBirth(), (1.0 - smoothstep(0.2, 0.5, h0)) * (1.0 - u));
      col = mix(col, tDeath(), (1.0 - smoothstep(0.2, 0.5, h1)) * u);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHodgeStarStripe(p, t); }`,
  }),
  defineModule({
    name: "topoFormLaplacian",
    doc: "Hodge Laplacian Δ = dδ + δd banding on a 0-form",
    glsl: /* glsl */ `
    vec3 topoFormLaplacian(vec2 p, float t) {
      vec3 H = tHess(p);
      float dd = -(H.x + H.z);
      float q = floor((0.5 + 0.5 * tanh(dd * 0.1)) * 6.0) / 6.0;
      vec3 col = mix(tInk(), tMint(), q);
      return tTone(mix(col, tSaddle(), tIso(dd, 0.0, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoFormLaplacian(p, t); }`,
  }),
  defineModule({
    name: "topoSpectralClustering",
    doc: "spectral clustering: k-means in eigen-coordinates, Voronoi of embedded centres",
    glsl: /* glsl */ `
    vec3 topoSpectralClustering(vec2 p, float t) {
      vec2 e = vec2(tMode(p, 1.0, 2.0), tMode(p, 2.0, 1.0));
      vec2 c0 = vec2(-0.4, 0.2), c1 = vec2(0.35, -0.15), c2 = vec2(0.1, 0.45 + 0.1 * sin(t * 0.3));
      float d0 = length(e - c0), d1 = length(e - c1), d2 = length(e - c2);
      vec3 col = d0 < d1 && d0 < d2 ? tBirth() : (d1 < d2 ? tDeath() : tAmber());
      col = mix(tPaper(), col, 0.7);
      float edge = abs(d0 - d1) * abs(d1 - d2) * abs(d2 - d0);
      return tTone(mix(col, tInk(), 1.0 - smoothstep(0.0, 0.02, edge)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSpectralClustering(p, t); }`,
  }),
];
