import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "fresnel",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const FRESNEL = [
  M("fresnelSchlick", "Schlick rim: F0+(1−F0)(1−n·v)^5 over Lambert body",
    `vec3 fresnelSchlick(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.04, ndv);
      vec3 body = albedo * (ndl * (1.0 - F) + 0.16);
      vec3 rim = mix(PH_COOL, PH_KEY, phAA(F, 0.22));
      return phOut(mix(phCrush(body, albedo), rim, F * 0.72));
    }`, "fresnelSchlick(N, L, V, vec3(0.56, 0.40, 0.38))"),

  M("fresnelDielectric", "Dielectric F from IOR (glass-ish 1.5), energy-conserving cel",
    `vec3 fresnelDielectric(vec3 N, vec3 L, vec3 V, vec3 albedo, float eta) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(eta), ndv);
      vec3 body = albedo * ndl * (1.0 - F) + PH_FILL * albedo * 0.18;
      vec3 spec = vec3(0.86, 0.84, 0.80) * F;
      float h = phCel(phLuma(body) + F, 3.0);
      vec3 col = mix(albedo * PH_FILL, albedo * PH_KEY, h);
      return phOut(mix(col, spec, F * 0.6));
    }`, "fresnelDielectric(N, L, V, vec3(0.52, 0.46, 0.50), 1.5)"),

  M("fresnelConductor", "Conductor F: tinted F0, no diffuse leak, cel body",
    `vec3 fresnelConductor(vec3 N, vec3 L, vec3 V, vec3 f0) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      vec3 F = phSchlick3(f0, max(dot(V, H), 0.0));
      float D = phGgxD(ndh, 0.16);
      vec3 spec = F * D * ndl * 0.22;
      float h = phCel(ndl, 3.0);
      vec3 body = mix(f0 * PH_FILL, f0 * 0.85, h);
      return phOut(body + spec * 0.45);
    }`, "fresnelConductor(N, L, V, vec3(0.72, 0.45, 0.18))"),

  M("fresnelRimCel", "Schlick then hard rim band — drawn edge, not a wash",
    `vec3 fresnelRimCel(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.04, ndv);
      vec3 body = phCrush(albedo * (ndl * (1.0 - F) + 0.15), albedo);
      float rim = phBand(1.0 - ndv, 0.62, 0.92) * phAA(ndl, 0.08);
      return phOut(mix(body, vec3(0.86, 0.80, 0.72), rim * 0.7));
    }`, "fresnelRimCel(N, L, V, vec3(0.48, 0.34, 0.40))"),

  M("facingRatio", "Facing-ratio rim: (1−n·v)^k, artist lobe then cel",
    `vec3 facingRatio(vec3 N, vec3 L, vec3 V, vec3 albedo, float k) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float rim = pow(clamp(1.0 - ndv, 0.0, 1.0), k);
      float F = phSchlick(0.04, ndv);
      vec3 body = phCrush(albedo * (ndl * (1.0 - F) + 0.14), albedo);
      return phOut(mix(body, mix(PH_COOL, PH_WARM, phAA(rim, 0.4)), rim * 0.65));
    }`, "facingRatio(N, L, V, vec3(0.50, 0.38, 0.44), 3.2)"),
];

export default FRESNEL;
