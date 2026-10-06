import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "spec",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const SPEC = [
  M("ggxSpec", "Stylized GGX D: Trowbridge–Reitz lobe, (1−F) diffuse + spec",
    `vec3 ggxSpec(vec3 N, vec3 L, vec3 V, vec3 albedo, float rough) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndv = phNdV(N, V), ndh = max(dot(N, H), 0.0);
      float F = phSchlick(0.04, max(dot(V, H), 0.0));
      float D = phGgxD(ndh, max(rough, 0.04));
      float G = phSmithG(ndl, ndv, max(rough, 0.04));
      float spec = D * G * F / max(4.0 * ndl * ndv, 1e-4);
      vec3 lin = albedo * ndl * (1.0 - F) * 0.85 + PH_KEY * spec * 0.55;
      return phCrush(lin, albedo);
    }`, "ggxSpec(N, L, V, vec3(0.62, 0.44, 0.36), 0.28)"),

  M("blinnPhong", "Blinn–Phong: (n·h)^s, energy split then cel",
    `vec3 blinnPhong(vec3 N, vec3 L, vec3 V, vec3 albedo, float shin) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      float F = phSchlick(0.04, phNdV(N, V));
      float spec = pow(ndh, shin) * (shin + 2.0) * 0.15915;
      vec3 lin = albedo * ndl * (1.0 - F) + PH_KEY * spec * F * 0.7;
      return phCrush(lin, albedo);
    }`, "blinnPhong(N, L, V, vec3(0.58, 0.48, 0.40), 48.0)"),

  M("animeChip", "Anime specular chip: hard fwidth cut on n·h, one drawn flake",
    `vec3 animeChip(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      float F = phSchlick(0.04, phNdV(N, V));
      vec3 body = albedo * (ndl * (1.0 - F) * 0.82 + 0.16);
      float chip = phAA(ndh, 0.92);
      vec3 col = mix(phCrush(body, albedo), vec3(0.90, 0.86, 0.78), chip * 0.72);
      return phOut(col);
    }`, "animeChip(N, L, V, vec3(0.54, 0.36, 0.42))"),

  M("cookTorrance", "Cook–Torrance: D G F / (4 n·l n·v), then cel crush",
    `vec3 cookTorrance(vec3 N, vec3 L, vec3 V, vec3 albedo, float a) {
      vec3 H = phH(L, V);
      float ndl = max(phNdL(N, L), 1e-4), ndv = max(phNdV(N, V), 1e-4);
      float ndh = max(dot(N, H), 0.0), vdh = max(dot(V, H), 0.0);
      float F = phSchlick(0.05, vdh);
      float D = phGgxD(ndh, a), G = phSmithG(ndl, ndv, a);
      float spec = D * G * F / (4.0 * ndl * ndv);
      vec3 lin = albedo * ndl * (1.0 - F) + vec3(0.88, 0.82, 0.72) * spec * 0.5;
      return phCrush(lin, albedo);
    }`, "cookTorrance(N, L, V, vec3(0.60, 0.42, 0.34), 0.22)"),

  M("ggxCel", "GGX energy then 3-band specular plates, anime metal-adjacent",
    `vec3 ggxCel(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndv = phNdV(N, V), ndh = max(dot(N, H), 0.0);
      float F = phSchlick(0.06, max(dot(V, H), 0.0));
      float D = phGgxD(ndh, 0.18);
      float spec = D * F * 0.12;
      float body = phCel(ndl * (1.0 - F), 3.0);
      float lobe = phCel(clamp(spec * 2.4, 0.0, 1.0), 3.0);
      vec3 col = mix(albedo * PH_FILL, albedo * PH_KEY, body);
      col = mix(col, vec3(0.88, 0.84, 0.74), lobe * 0.55);
      return phOut(col);
    }`, "ggxCel(N, L, V, vec3(0.48, 0.40, 0.46))"),
];

export default SPEC;
