// DEC / coboundary / metric thickenings / interleaving / GH.
import { defineModule } from "./define.js";

export default [
  defineModule({
    name: "topoExteriorDerivativeHatch",
    doc: "discrete exterior derivative d on 0-forms: edge values f_j − f_i as hatch",
    glsl: /* glsl */ `
    vec3 topoExteriorDerivativeHatch(vec2 p, float t) {
      vec2 g = p * vec2(8.0, 6.0);
      vec2 i = floor(g), f = fract(g);
      float v0 = tMorse(i / vec2(8.0, 6.0)), v1 = tMorse((i + vec2(1.0, 0.0)) / vec2(8.0, 6.0));
      float v2 = tMorse((i + vec2(0.0, 1.0)) / vec2(8.0, 6.0));
      float dx = v1 - v0, dy = v2 - v0;
      vec3 col = tPaper();
      col = mix(col, mix(tBirth(), tDeath(), 0.5 + 0.5 * tanh(dx * 4.0)), tFill(abs(f.y - 0.5) - 0.08) * 0.7);
      col = mix(col, mix(tMint(), tSaddle(), 0.5 + 0.5 * tanh(dy * 4.0)), tFill(abs(f.x - 0.5) - 0.08) * 0.7);
      col = mix(col, tInk(), max(tLine(f.x, 1.2), tLine(f.y, 1.2)) * 0.35);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoExteriorDerivativeHatch(p, t); }`,
  }),
  defineModule({
    name: "topoCoboundaryHatch",
    doc: "discrete coboundary δ = *d*: dual-edge fluxes from primal 1-cochains",
    glsl: /* glsl */ `
    vec3 topoCoboundaryHatch(vec2 p, float t) {
      vec2 g = p * vec2(7.0, 5.0);
      vec2 i = floor(g + 0.5), f = fract(g + 0.5);
      float flux = tMorse(i / vec2(7.0, 5.0)) - tMorse((i + vec2(1.0, 1.0)) / vec2(7.0, 5.0));
      vec3 col = mix(tPaper(), mix(tDeath(), tBirth(), 0.5 + 0.5 * tanh(flux * 5.0)), 0.65);
      float dual = tFill(length(f - 0.5) - 0.12);
      return tTone(mix(col, tAmber(), dual * 0.45));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoCoboundaryHatch(p, t); }`,
  }),
  defineModule({
    name: "topoMetricThickening",
    doc: "metric thickening / offset: X^r = {y : d(y,X) ≤ r} of a landmark set",
    glsl: /* glsl */ `
    vec3 topoMetricThickening(vec2 p, float t) {
      float d = tMinSite(p, t);
      float r = 0.05 + 0.14 * (0.5 + 0.5 * sin(t * 0.42));
      float q = floor(d * 10.0) / 10.0;
      vec3 col = mix(tBirth(), tPaper(), clamp(q * 1.5, 0.0, 1.0));
      col = mix(col, tPaper(), smoothstep(r, r + fwidth(d) * 2.0, d));
      return tTone(mix(col, tInk(), tIso(d, r, 1.5)));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoMetricThickening(p, t); }`,
  }),
  defineModule({
    name: "topoDiscreteHodge",
    doc: "DEC Hodge star: primal cells vs dual cells, area ratios as brightness",
    glsl: /* glsl */ `
    vec3 topoDiscreteHodge(vec2 p, float t) {
      vec2 g = p * vec2(6.0, 4.5);
      vec2 fp = fract(g), fd = fract(g + 0.5);
      float prim = tFill(max(abs(fp.x - 0.5), abs(fp.y - 0.5)) - 0.42);
      float dual = tFill(length(fd - 0.5) - 0.16);
      vec3 col = mix(tPaper(), tMint(), prim * 0.35);
      col = mix(col, tAmber(), dual * 0.7);
      col = mix(col, tInk(), max(tLine(fp.x, 1.1), tLine(fp.y, 1.1)) * 0.4);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoDiscreteHodge(p, t); }`,
  }),
  defineModule({
    name: "topoPrimalDualMesh",
    doc: "primal / dual mesh overlay: circumcentric dual of a triangular grid",
    glsl: /* glsl */ `
    vec3 topoPrimalDualMesh(vec2 p, float t) {
      vec2 q = p * vec2(5.5, 4.0);
      vec2 f = fract(q);
      float tri = step(f.x + f.y, 1.0);
      vec3 col = mix(tPaper(), mix(tBirth(), tMint(), tri), 0.35);
      col = mix(col, tInk(), tIso(f.x, 0.0, 1.2) + tIso(f.y, 0.0, 1.2) + tIso(f.x + f.y, 1.0, 1.2));
      vec2 mid = (f.x + f.y < 1.0) ? vec2(1.0, 1.0) / 3.0 : vec2(2.0, 2.0) / 3.0;
      col = mix(col, tSaddle(), tDisk(f, mid, 0.06));
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoPrimalDualMesh(p, t); }`,
  }),
  defineModule({
    name: "topoWedgeProduct",
    doc: "wedge product α∧β: two 1-forms' parallelogram area as a 2-form density",
    glsl: /* glsl */ `
    vec3 topoWedgeProduct(vec2 p, float t) {
      vec2 a = tGrad(p);
      vec2 b = vec2(-tGrad(p + vec2(0.1, 0.0)).y, tGrad(p + vec2(0.0, 0.1)).x);
      float w = a.x * b.y - a.y * b.x;
      vec3 col = mix(tDeath(), tBirth(), 0.5 + 0.5 * tanh(w * 0.2));
      return tTone(mix(tPaper(), col, 0.75));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoWedgeProduct(p, t); }`,
  }),
  defineModule({
    name: "topoInteriorProduct",
    doc: "interior product ι_X α: contracting a 1-form by a vector field",
    glsl: /* glsl */ `
    vec3 topoInteriorProduct(vec2 p, float t) {
      vec2 X = vec2(sin(p.y * 4.0 + t * 0.3), cos(p.x * 3.5));
      vec2 a = tGrad(p);
      float iota = dot(X, a);
      vec3 col = mix(tInk(), tAmber(), 0.5 + 0.5 * tanh(iota * 0.4));
      vec2 cell = fract(p * vec2(9.0, 6.0)) - 0.5;
      vec2 dir = normalize(X + 1e-5);
      float shaft = tFill(abs(cell.x * dir.y - cell.y * dir.x) * 18.0 - 0.12) * step(abs(dot(cell, dir)), 0.3);
      return tTone(mix(col, tBirth(), shaft * 0.45));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoInteriorProduct(p, t); }`,
  }),
  defineModule({
    name: "topoOffsetNerve",
    doc: "nerve of metric thickenings: as r grows, the nerve of {B(x,r)} fills",
    glsl: /* glsl */ `
    vec3 topoOffsetNerve(vec2 p, float t) {
      float r = 0.08 + 0.14 * (0.5 + 0.5 * sin(t * 0.38));
      vec3 col = tPaper();
      for (int i = 0; i < 7; i++) col = mix(col, tMint(), tDisk(p, tSite(i, t), r) * 0.18);
      for (int i = 0; i < 6; i++) {
        float d = length(tSite(i, t) - tSite(i + 1, t));
        col = mix(col, tInk(), tSeg(p, tSite(i, t), tSite(i + 1, t), 0.005) * step(d, 2.0 * r));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoOffsetNerve(p, t); }`,
  }),
  defineModule({
    name: "topoInterleavingDistance",
    doc: "persistence interleaving: two filtrations smeared by ε-shifts, distance is min ε",
    glsl: /* glsl */ `
    vec3 topoInterleavingDistance(vec2 p, float t) {
      float f = tMorse(p), g = tTerrain(p);
      float eps = 0.08 + 0.06 * sin(t * 0.4);
      float A = 1.0 - smoothstep(0.45, 0.45 + fwidth(f), f);
      float B = 1.0 - smoothstep(0.45 + eps, 0.45 + eps + fwidth(g), g);
      vec3 col = mix(tPaper(), tBirth(), A * 0.55);
      col = mix(col, tDeath(), B * 0.45);
      col = mix(col, tSaddle(), A * B);
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoInterleavingDistance(p, t); }`,
  }),
  defineModule({
    name: "topoGromovHausdorffHint",
    doc: "Gromov–Hausdorff hint: correspondence smear between two finite metric samples",
    glsl: /* glsl */ `
    vec3 topoGromovHausdorffHint(vec2 p, float t) {
      vec3 col = tPaper();
      for (int i = 0; i < 5; i++) {
        vec2 a = vec2(0.22 + float(i) * 0.08, 0.30 + 0.12 * tH21(vec2(float(i), 1.0)));
        vec2 b = vec2(0.90 + float(i) * 0.07, 0.62 + 0.10 * tH21(vec2(float(i), 3.0)));
        b += 0.03 * vec2(sin(t * 0.3 + float(i)), 0.0);
        col = mix(col, tSaddle(), tSeg(p, a, b, 0.006));
        col = mix(col, tBirth(), tDisk(p, a, 0.016));
        col = mix(col, tDeath(), tDisk(p, b, 0.016));
      }
      return tTone(col);
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return topoGromovHausdorffHint(p, t); }`,
  }),
];
