import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "metal",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const METAL = [
  M("metalFlake", "Metal flake: hashed sparkle * GGX, conductor F0, no diffuse leak",
    `vec3 metalFlake(vec3 N, vec3 L, vec3 V, vec2 p, vec3 f0) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      vec3 F = phSchlick3(f0, max(dot(V, H), 0.0));
      float D = phGgxD(ndh, 0.22);
      vec2 id = floor(p * 42.0 + N.xy * 8.0);
      float flake = step(0.82, phH21(id)) * pow(ndh, 40.0);
      vec3 spec = F * D * ndl * 0.18 + F * flake * 0.55;
      float h = phCel(ndl, 3.0);
      vec3 body = mix(f0 * PH_FILL, f0 * 0.82, h);
      return phOut(body + spec);
    }`, "metalFlake(N, L, V, p, vec3(0.62, 0.64, 0.68))"),

  M("carPaint", "Car paint: flake base + clearcoat dielectric F",
    `vec3 carPaint(vec3 N, vec3 L, vec3 V, vec2 p, vec3 base) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0), ndv = phNdV(N, V);
      vec3 Fm = phSchlick3(base, max(dot(V, H), 0.0));
      float Fc = phSchlick(0.04, ndv);
      float flake = step(0.78, phH21(floor(p * 36.0 + N.xy * 6.0))) * pow(ndh, 36.0);
      float coat = phGgxD(ndh, 0.08) * Fc * 0.16;
      vec3 body = mix(base * PH_FILL, base, phCel(ndl * (1.0 - Fc), 3.0));
      return phOut(body + Fm * flake * 0.5 + vec3(0.88, 0.86, 0.82) * coat);
    }`, "carPaint(N, L, V, p, vec3(0.55, 0.08, 0.10))"),

  M("goldConductor", "Gold conductor: wavelength-biased F0, GGX, cel body",
    `vec3 goldConductor(vec3 N, vec3 L, vec3 V) {
      vec3 f0 = vec3(1.00, 0.71, 0.29);
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      vec3 F = phSchlick3(f0, max(dot(V, H), 0.0));
      float D = phGgxD(ndh, 0.14);
      vec3 spec = F * D * ndl * 0.2;
      float h = phCel(ndl, 3.0);
      vec3 body = mix(PH_GOLD * vec3(0.28, 0.22, 0.16), PH_GOLD, h);
      return phOut(body + spec * 0.55);
    }`, "goldConductor(N, L, V)"),

  M("metalCel", "Conductor body + hard spec sheet — anime metal plate",
    `vec3 metalCel(vec3 N, vec3 L, vec3 V, vec3 f0) {
      vec3 H = phH(L, V);
      float ndl = phNdL(N, L), ndh = max(dot(N, H), 0.0);
      vec3 F = phSchlick3(f0, max(dot(V, H), 0.0));
      vec3 body = mix(f0 * vec3(0.28, 0.30, 0.42), f0 * 0.78, phAA(ndl, 0.46));
      float sheet = phAA(ndh, 0.88);
      return phOut(mix(body, vec3(0.88, 0.84, 0.76), sheet * 0.7) + F * ndl * 0.08);
    }`, "metalCel(N, L, V, vec3(0.56, 0.58, 0.62))"),
];

export default METAL;
