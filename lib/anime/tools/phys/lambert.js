import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "lambert",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t); return phDemo(p, ${call}); }`,
});

export const LAMBERT = [
  M("lambert", "Lambert: albedo/π · n·l, (1−F) energy, crushed to 3-step cel",
    `vec3 lambert(vec3 N, vec3 L, vec3 albedo) {
      float ndl = phNdL(N, L);
      float F = phSchlick(0.04, phNdV(N, phV()));
      vec3 lin = albedo * (ndl * (1.0 - F) * 0.3183 + 0.16);
      return phCrush(lin, albedo);
    }`, "lambert(N, L, vec3(0.72, 0.48, 0.36))"),

  M("halfLambert", "Valve half-Lambert: ((n·l)*0.5+0.5)², energy then cel",
    `vec3 halfLambert(vec3 N, vec3 L, vec3 albedo) {
      float wrap = 0.5 * dot(N, L) + 0.5;
      float h = wrap * wrap;
      float F = phSchlick(0.04, phNdV(N, phV()));
      vec3 lin = albedo * (h * (1.0 - F) * 0.85 + 0.14);
      return phCrush(lin, albedo);
    }`, "halfLambert(N, L, vec3(0.68, 0.52, 0.40))"),

  M("wrappedDiffuse", "Wrapped n·l: (n·l+w)/(1+w), energy scaled, then cel",
    `vec3 wrappedDiffuse(vec3 N, vec3 L, vec3 albedo, float w) {
      float ndl = (dot(N, L) + w) / max(1.0 + w, 1e-4);
      ndl = max(ndl, 0.0);
      float F = phSchlick(0.04, phNdV(N, phV()));
      vec3 lin = albedo * (ndl * (1.0 - F) * 0.78 + 0.15);
      float bands = phCel(phLuma(lin), 3.0);
      return phOut(mix(albedo * PH_FILL, albedo * PH_KEY, bands));
    }`, "wrappedDiffuse(N, L, vec3(0.62, 0.44, 0.52), 0.45)"),

  M("minnaert", "Minnaert darkening: (n·l)^k · (n·v)^{k−1}, cloth-ish Lambert",
    `vec3 minnaert(vec3 N, vec3 L, vec3 V, vec3 albedo, float k) {
      float ndl = max(phNdL(N, L), 1e-4);
      float ndv = max(phNdV(N, V), 1e-4);
      float m = pow(ndl, k) * pow(ndv, max(k - 1.0, 0.0));
      float F = phSchlick(0.04, ndv);
      vec3 lin = albedo * (m * (1.0 - F) + 0.12);
      return phCrush(lin, albedo);
    }`, "minnaert(N, L, phV(), vec3(0.58, 0.40, 0.32), 1.35)"),
];

export default LAMBERT;
