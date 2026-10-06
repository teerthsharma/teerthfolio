// Curvature / geodesic / heat method / holonomy / cut locus.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoGaussianCurvatureStripes",
    doc: "Gaussian curvature K of the graph z=f: isolines of det(II)/det(I)",
    glsl: /* glsl */ `
    vec3 topoGaussianCurvatureStripes(vec2 p, float t) {
      float K = tGaussK(p);
      float q = 0.5 + 0.5 * tanh(K * 0.15);
      vec3 col = mix(tDeath(), tBirth(), q);
      col = mix(tPaper(), col, 0.75);
      return tTone(mix(col, tInk(), tIso(K, 0.0, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGaussianCurvatureStripes(p, t); }`,
  }),
  defineModule({
    name: "topoMeanCurvature",
    doc: "mean curvature H stripes of the graph z=f",
    glsl: /* glsl */ `
    vec3 topoMeanCurvature(vec2 p, float t) {
      float H = tMeanH(p);
      vec3 col = mix(tInk(), tAmber(), 0.5 + 0.5 * tanh(H * 0.2));
      return tTone(mix(col, tSaddle(), tIso(H, 0.0, 1.4)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMeanCurvature(p, t); }`,
  }),
  defineModule({
    name: "topoGeodesicDistance",
    doc: "geodesic distance field from a source, heat-method look (distance isolines)",
    glsl: /* glsl */ `
    vec3 topoGeodesicDistance(vec2 p, float t) {
      vec2 s = vec2(0.55 + 0.08 * sin(t * 0.3), 0.48);
      float d = tVaradhan(p, s, 0.06);
      float q = floor(d * 7.0) / 7.0;
      vec3 col = mix(tBirth(), tPaper(), clamp(q, 0.0, 1.0));
      col = mix(col, tInk(), tIso(d, floor(d * 7.0) / 7.0, 1.3));
      col = mix(col, tSaddle(), tDisk(p, s, 0.025));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGeodesicDistance(p, t); }`,
  }),
  defineModule({
    name: "topoPrincipalCurvature",
    doc: "principal curvatures κ± = H ± sqrt(H²−K) as a two-direction hatch",
    glsl: /* glsl */ `
    vec3 topoPrincipalCurvature(vec2 p, float t) {
      float H = tMeanH(p), K = tGaussK(p);
      float disc = sqrt(max(H * H - K, 0.0));
      float kp = H + disc, km = H - disc;
      vec3 col = mix(tPaper(), tBirth(), 0.5 + 0.4 * tanh(kp * 0.12));
      col = mix(col, tDeath(), 0.35 * (0.5 + 0.5 * tanh(km * 0.12)));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPrincipalCurvature(p, t); }`,
  }),
  defineModule({
    name: "topoGaussBonnetPatch",
    doc: "Gauss–Bonnet patch: ∫K plus geodesic curvature on the boundary circle",
    glsl: /* glsl */ `
    vec3 topoGaussBonnetPatch(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.5);
      float r = 0.26, d = length(p - c);
      float K = tGaussK(p);
      vec3 col = mix(tPaper(), mix(tDeath(), tBirth(), 0.5 + 0.5 * tanh(K * 0.12)), tFill(d - r));
      col = mix(col, tSaddle(), tIso(d, r, 2.0));
      float kg = abs(sin(atan(p.y - c.y, p.x - c.x) * 6.0 + t * 0.4));
      col = mix(col, tAmber(), tIso(d, r, 2.4) * kg);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGaussBonnetPatch(p, t); }`,
  }),
  defineModule({
    name: "topoGeodesicFan",
    doc: "geodesic polar coordinates: radial geodesics and distance circles from a pole",
    glsl: /* glsl */ `
    vec3 topoGeodesicFan(vec2 p, float t) {
      vec2 s = vec2(0.62, 0.48), v = p - s;
      float r = tVaradhan(p, s, 0.05);
      float th = atan(v.y, v.x);
      vec3 col = tFieldPaper(0.3 + 0.4 * tMorse(p));
      col = mix(col, tInk(), tIso(fract((th + 3.14) / 6.28318 * 10.0), 0.5, 1.6) * 0.55);
      col = mix(col, tBirth(), tIso(r, floor(r * 5.0) / 5.0, 1.3) * 0.7);
      return tTone(mix(col, tSaddle(), tDisk(p, s, 0.02)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGeodesicFan(p, t); }`,
  }),
  defineModule({
    name: "topoHeatMethodVaradhan",
    doc: "Varadhan formula: dist ~ sqrt(−4τ log k_τ) as τ→0, heat wash to distance",
    glsl: /* glsl */ `
    vec3 topoHeatMethodVaradhan(vec2 p, float t) {
      vec2 s = vec2(0.5, 0.45);
      float tau = 0.03 + 0.08 * (0.5 + 0.5 * sin(t * 0.45));
      float k = tHeat(p, s, tau);
      float d = tVaradhan(p, s, tau);
      vec3 col = mix(tAmber(), tPaper(), clamp(d * 1.3, 0.0, 1.0));
      col = mix(col, tBirth(), clamp(k * 0.15, 0.0, 0.5));
      return tTone(mix(col, tInk(), tIso(d, 0.25, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoHeatMethodVaradhan(p, t); }`,
  }),
  defineModule({
    name: "topoParallelTransport",
    doc: "parallel transport / holonomy: a frame rotating around a closed loop",
    glsl: /* glsl */ `
    vec3 topoParallelTransport(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.5), v = p - c;
      float ang = atan(v.y, v.x);
      float hol = ang * (0.3 + 0.1 * tGaussK(c));
      float ring = abs(length(v) - 0.22);
      vec2 frame = vec2(cos(hol + t * 0.2), sin(hol + t * 0.2));
      float tick = tIso(fract((ang / 6.28318) * 12.0), 0.5, 1.5);
      vec3 col = tPaper();
      col = mix(col, tInk(), tFill(ring - 0.012));
      col = mix(col, tAmber(), tick * tFill(ring - 0.04));
      col = mix(col, tBirth(), tDisk(p, c + frame * 0.22, 0.025));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoParallelTransport(p, t); }`,
  }),
  defineModule({
    name: "topoSectionalHint",
    doc: "sectional curvature tint: K(X∧Y) from the graph Hessian on coordinate planes",
    glsl: /* glsl */ `
    vec3 topoSectionalHint(vec2 p, float t) {
      float K = tGaussK(p);
      float sec = K * (0.7 + 0.3 * cos(t * 0.3));
      vec3 col = mix(tVoid(), tAmber(), 0.5 + 0.5 * tanh(sec * 0.14));
      return tTone(mix(tPaper(), col, 0.8));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoSectionalHint(p, t); }`,
  }),
  defineModule({
    name: "topoRicciFlowLook",
    doc: "Ricci-flow look: conformal factor e^{2u} evolving by ∂u/∂t = −R/2",
    glsl: /* glsl */ `
    vec3 topoRicciFlowLook(vec2 p, float t) {
      float K = tGaussK(p);
      float u = -0.15 * K * (0.5 + 0.5 * t);
      float conf = exp(2.0 * tanh(u));
      vec3 col = tFieldPaper(tMorse(p) * conf);
      col = mix(col, tDeath(), clamp(-K * 0.05 * fract(t * 0.1), 0.0, 0.5));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoRicciFlowLook(p, t); }`,
  }),
  defineModule({
    name: "topoCutLocus",
    doc: "cut locus of a source: points with two minimizing geodesics",
    glsl: /* glsl */ `
    vec3 topoCutLocus(vec2 p, float t) {
      vec2 s = vec2(0.48, 0.42);
      vec2 a = vec2(0.95, 0.70), b = vec2(1.10, 0.28);
      float d0 = length(p - s);
      float d1 = length(p - a) + length(a - s);
      float d2 = length(p - b) + length(b - s);
      float cut = 1.0 - smoothstep(0.0, 0.04, abs(d1 - d2));
      vec3 col = mix(tPaper(), tBirth(), 0.35 * exp(-d0 * 1.5));
      col = mix(col, tDeath(), cut * 0.85);
      col = mix(col, tSaddle(), tDisk(p, s, 0.02));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCutLocus(p, t); }`,
  }),
  defineModule({
    name: "topoMedialAxis",
    doc: "medial axis of a domain: points with two closest boundary sites",
    glsl: /* glsl */ `
    vec3 topoMedialAxis(vec2 p, float t) {
      float d1 = tMinSite(p, t), d2 = tSecondSite(p, t);
      float medial = 1.0 - smoothstep(0.0, 0.025, d2 - d1);
      vec3 col = mix(tPaper(), tMint(), (1.0 - smoothstep(0.0, 0.22, d1)) * 0.45);
      return tTone(mix(col, tDeath(), medial));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMedialAxis(p, t); }`,
  }),
  defineModule({
    name: "topoInjectivityRadius",
    doc: "injectivity radius field: distance to the cut locus from each point",
    glsl: /* glsl */ `
    vec3 topoInjectivityRadius(vec2 p, float t) {
      float d1 = tMinSite(p, t), d2 = tSecondSite(p, t);
      float inj = d2 - d1;
      vec3 col = mix(tDeath(), tBirth(), clamp(inj * 6.0, 0.0, 1.0));
      return tTone(mix(tPaper(), col, 0.75));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoInjectivityRadius(p, t); }`,
  }),
  defineModule({
    name: "topoGeodesicCurvature",
    doc: "geodesic curvature κ_g of a plane curve on the graph surface",
    glsl: /* glsl */ `
    vec3 topoGeodesicCurvature(vec2 p, float t) {
      vec2 c = p - vec2(0.72, 0.5);
      float ang = atan(c.y, c.x);
      float rad = 0.22 + 0.05 * sin(3.0 * ang + t * 0.3);
      float d = abs(length(c) - rad);
      float kg = abs(3.0 * 0.05 * cos(3.0 * ang + t * 0.3)) / max(rad, 0.1);
      vec3 col = tFieldPaper(tMorse(p) * 0.5);
      col = mix(col, mix(tBirth(), tSaddle(), clamp(kg, 0.0, 1.0)), tFill(d - 0.018));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGeodesicCurvature(p, t); }`,
  }),
  defineModule({
    name: "topoShapeOperator",
    doc: "shape operator II(X,Y): hatch aligned to principal directions of the graph",
    glsl: /* glsl */ `
    vec3 topoShapeOperator(vec2 p, float t) {
      vec3 H = tHess(p);
      vec2 e1 = normalize(vec2(H.x - H.z, 2.0 * H.y) + vec2(1e-4, 0.0));
      float hatch = abs(sin(dot(p, e1) * 32.0));
      vec3 col = tFieldPaper(tMorse(p));
      col = mix(col, tSaddle(), (1.0 - smoothstep(0.2, 0.5, hatch)) * 0.65);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoShapeOperator(p, t); }`,
  }),
];
