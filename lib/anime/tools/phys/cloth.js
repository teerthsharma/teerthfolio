import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "cloth",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(), T = phTan(N); return phDemo(p, ${call}); }`,
});

export const CLOTH = [
  M("clothSheen", "Charlie sheen: (1−n·h)^rough retro-reflection on dye",
    `vec3 clothSheen(vec3 N, vec3 L, vec3 V, vec3 dye, float rough) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      float sheen = pow(clamp(1.0 - ndh, 0.0, 1.0), max(rough, 0.08)) * ndl;
      float F = phSchlick(0.04, phNdV(N, V));
      vec3 lin = dye * ndl * (1.0 - F) * 0.75 + vec3(0.82, 0.78, 0.72) * sheen * 0.45;
      return phCrush(lin, dye);
    }`, "clothSheen(N, L, V, vec3(0.42, 0.22, 0.30), 2.4)"),

  M("velvet", "Velvet: inverted n·l * n·v, grazing pile glow, deep dye",
    `vec3 velvet(vec3 N, vec3 L, vec3 V, vec3 dye) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float pile = pow(clamp(1.0 - ndl, 0.0, 1.0), 1.6) * ndv;
      float F = phSchlick(0.03, ndv);
      vec3 lin = dye * ndl * 0.35 * (1.0 - F) + dye * vec3(1.15, 0.85, 1.05) * pile * 0.7;
      float h = phCel(phLuma(lin), 3.0);
      return phOut(mix(dye * PH_INK * 4.2, dye * 1.15, h));
    }`, "velvet(N, L, V, vec3(0.38, 0.10, 0.18))"),

  M("silkAniso", "Silk anisotropy: stretch spec along tangent, dye body",
    `vec3 silkAniso(vec3 N, vec3 T, vec3 L, vec3 V, vec3 dye) {
      vec3 H = phH(L, V);
      float tdh = dot(T, H);
      float aniso = pow(max(1.0 - tdh * tdh, 0.0), 16.0);
      float ndl = phNdL(N, L);
      float F = phSchlick(0.06, phNdV(N, V));
      vec3 lin = dye * ndl * (1.0 - F) * 0.8 + vec3(0.88, 0.84, 0.74) * aniso * F * 0.6;
      return phCrush(lin, dye);
    }`, "silkAniso(N, T, L, V, vec3(0.52, 0.28, 0.36))"),

  M("clothCel", "Sheen energy then dye plates — anime cloth, cooler fill",
    `vec3 clothCel(vec3 N, vec3 L, vec3 V, vec3 dye) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      float sheen = pow(clamp(1.0 - ndh, 0.0, 1.0), 2.2) * ndl;
      float h = phCel(ndl * 0.85 + sheen * 0.25, 3.0);
      vec3 fold = dye * vec3(0.42, 0.40, 0.62);
      vec3 lit = dye * vec3(1.15, 1.02, 0.92);
      vec3 col = mix(mix(fold, dye, phAA(h, 0.34)), lit, phAA(h, 0.70));
      return phOut(mix(col, vec3(0.84, 0.80, 0.74), phAA(sheen, 0.35) * 0.28));
    }`, "clothCel(N, L, V, vec3(0.40, 0.22, 0.28))"),
];

export default CLOTH;
