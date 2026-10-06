import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "oren",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t); return phDemo(p, ${call}); }`,
});

export const OREN = [
  M("orenNayar", "Oren–Nayar: A+B max(0,cosφ) sinα tanβ on rough diffuse",
    `vec3 orenNayar(vec3 N, vec3 L, vec3 V, vec3 albedo, float sigma) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float s2 = sigma * sigma;
      float A = 1.0 - 0.5 * s2 / (s2 + 0.33);
      float B = 0.45 * s2 / (s2 + 0.09);
      vec3 Lp = L - N * ndl, Vp = V - N * ndv;
      float cosPhi = max(dot(normalize(Lp + 1e-5), normalize(Vp + 1e-5)), 0.0);
      float a = max(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float b = min(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float on = ndl * (A + B * cosPhi * sin(a) * tan(b));
      float F = phSchlick(0.04, ndv);
      vec3 lin = albedo * (on * (1.0 - F) + 0.14);
      return phCrush(lin, albedo);
    }`, "orenNayar(N, L, phV(), vec3(0.64, 0.46, 0.34), 0.55)"),

  M("orenNayarCloth", "Oren–Nayar cloth: high σ, dye albedo, cooler fill",
    `vec3 orenNayarCloth(vec3 N, vec3 L, vec3 V, vec3 dye) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float s2 = 0.72 * 0.72;
      float A = 1.0 - 0.5 * s2 / (s2 + 0.33);
      float B = 0.45 * s2 / (s2 + 0.09);
      vec3 Lp = L - N * ndl, Vp = V - N * ndv;
      float cosPhi = max(dot(normalize(Lp + 1e-5), normalize(Vp + 1e-5)), 0.0);
      float a = max(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float b = min(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float on = ndl * (A + B * cosPhi * sin(a) * tan(b));
      vec3 fill = dye * vec3(0.55, 0.62, 0.92);
      vec3 lin = mix(fill, dye, on) * 0.92;
      float h = phCel(phLuma(lin), 4.0);
      return phOut(mix(fill * 0.85, dye * PH_KEY, h));
    }`, "orenNayarCloth(N, L, phV(), vec3(0.42, 0.22, 0.28))"),

  M("orenNayarCel", "Oren–Nayar then hard 4-plate cel, no raw cosine facets",
    `vec3 orenNayarCel(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float s2 = 0.4;
      float A = 1.0 - 0.5 * s2 / (s2 + 0.33);
      float B = 0.45 * s2 / (s2 + 0.09);
      vec3 Lp = L - N * ndl, Vp = V - N * ndv;
      float cosPhi = max(dot(normalize(Lp + 1e-5), normalize(Vp + 1e-5)), 0.0);
      float a = max(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float b = min(acos(clamp(ndl, 0.0, 1.0)), acos(clamp(ndv, 0.0, 1.0)));
      float on = ndl * (A + B * cosPhi * sin(a) * tan(b));
      float h = phCel(on, 4.0);
      vec3 a0 = albedo * PH_FILL, a1 = albedo * PH_MID, a2 = albedo * mix(PH_MID, PH_KEY, 0.5), a3 = albedo * PH_KEY;
      vec3 col = h < 0.34 ? mix(a0, a1, h * 3.0) : h < 0.67 ? mix(a1, a2, h * 3.0 - 1.0) : mix(a2, a3, h * 3.0 - 2.0);
      return phOut(col);
    }`, "orenNayarCel(N, L, phV(), vec3(0.58, 0.46, 0.32))"),
];

export default OREN;
