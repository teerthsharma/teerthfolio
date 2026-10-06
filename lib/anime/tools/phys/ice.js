import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "ice",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const ICE = [
  M("iceSss", "Ice SSS: wrap + blue scatter, dielectric F, then cel",
    `vec3 iceSss(vec3 N, vec3 L, vec3 V) {
      float wrap = max((dot(N, L) + 0.5) / 1.5, 0.0);
      float ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.31), ndv);
      vec3 scatter = vec3(0.28, 0.48, 0.68) * wrap * (1.0 - F);
      vec3 trans = vec3(0.42, 0.62, 0.78) * max(-dot(N, L), 0.0) * 0.45;
      vec3 lin = scatter + trans + vec3(0.72, 0.80, 0.86) * F * 0.4;
      return phCrush(lin, vec3(0.62, 0.74, 0.82));
    }`, "iceSss(N, L, V)"),

  M("snowScatter", "Snow SSS: high albedo, deep wrap, blue shadow, energy cel",
    `vec3 snowScatter(vec3 N, vec3 L, vec3 V) {
      float wrap = max((dot(N, L) + 0.72) / 1.72, 0.0);
      float ndv = phNdV(N, V);
      float F = phSchlick(0.08, ndv);
      vec3 alb = vec3(0.82, 0.84, 0.88);
      vec3 shade = vec3(0.28, 0.38, 0.58);
      vec3 lin = mix(shade, alb, wrap) * (1.0 - F) + vec3(0.86, 0.88, 0.90) * F * 0.25;
      float h = phCel(phLuma(lin), 3.0);
      return phOut(mix(shade, alb, h));
    }`, "snowScatter(N, L, V)"),

  M("frostRim", "Frost rim: microfacet frost on grazing, ice body",
    `vec3 frostRim(vec3 N, vec3 L, vec3 V, vec2 p) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.31), ndv);
      float frost = pow(clamp(1.0 - ndv, 0.0, 1.0), 2.2) * (0.55 + 0.45 * phVn(p * 22.0 + N.xy * 4.0));
      vec3 body = vec3(0.52, 0.64, 0.74) * (ndl * (1.0 - F) + 0.16);
      vec3 rim = vec3(0.80, 0.86, 0.90) * frost;
      return phOut(phCrush(body, vec3(0.52, 0.64, 0.74)) + rim * 0.45);
    }`, "frostRim(N, L, V, p)"),

  M("iceCel", "Ice energy then plates: cool fill, hard F chip",
    `vec3 iceCel(vec3 N, vec3 L, vec3 V) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.31), ndv);
      float spec = pow(max(dot(N, phH(L, V)), 0.0), 64.0);
      float h = phCel(ndl * (1.0 - F) + 0.12, 3.0);
      vec3 deep = vec3(0.18, 0.28, 0.44), mid = vec3(0.46, 0.62, 0.74), lit = vec3(0.78, 0.84, 0.88);
      vec3 col = mix(mix(deep, mid, phAA(h, 0.36)), lit, phAA(h, 0.70));
      return phOut(mix(col, vec3(0.88, 0.90, 0.90), phAA(spec, 0.35) * 0.55));
    }`, "iceCel(N, L, V)"),
];

export default ICE;
