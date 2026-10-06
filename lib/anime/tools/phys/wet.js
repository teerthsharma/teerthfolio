import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "wet",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const WET = [
  M("wetDarken", "Wet darken: porosity kills diffuse, F sheen returns energy",
    `vec3 wetDarken(vec3 N, vec3 L, vec3 V, vec3 albedo, float wet) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(mix(0.04, 0.15, wet), ndv);
      vec3 dry = albedo * ndl * 0.85;
      vec3 soaked = albedo * (1.0 - 0.55 * wet) * ndl * (1.0 - F);
      vec3 sheen = vec3(0.82, 0.84, 0.86) * F * pow(max(dot(N, phH(L, V)), 0.0), 48.0);
      return phCrush(mix(dry, soaked, wet) + sheen * wet + albedo * 0.1, albedo);
    }`, "wetDarken(N, L, V, vec3(0.48, 0.36, 0.30), 0.75)"),

  M("puddleFresnel", "Puddle: flattened N, strong F, cool sky tint, dark bed",
    `vec3 puddleFresnel(vec3 N, vec3 L, vec3 V, vec3 bed) {
      vec3 Np = normalize(mix(N, vec3(0.0, 0.0, 1.0), 0.72));
      float ndv = phNdV(Np, V), ndl = phNdL(Np, L);
      float F = phSchlick(0.02, ndv);
      vec3 sky = vec3(0.32, 0.46, 0.62);
      vec3 body = bed * ndl * (1.0 - F) * 0.55;
      vec3 col = mix(body, sky, F);
      float h = phCel(phLuma(col), 3.0);
      return phOut(mix(bed * PH_FILL, col, 0.4 + 0.6 * h));
    }`, "puddleFresnel(N, L, V, vec3(0.22, 0.20, 0.18))"),

  M("rainSheen", "Rain sheen: vertical streak anisotropy + wet F",
    `vec3 rainSheen(vec3 N, vec3 L, vec3 V, vec2 p, vec3 albedo, float time) {
      vec3 T = normalize(vec3(0.08, 1.0, 0.0));
      vec3 H = phH(L, V);
      float streak = pow(max(1.0 - dot(T, H) * dot(T, H), 0.0), 22.0);
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.12, ndv);
      float rain = phVn(vec2(p.x * 28.0, p.y * 6.0 + time * 0.8));
      float drop = step(0.78, rain);
      vec3 soaked = albedo * 0.55 * ndl * (1.0 - F);
      vec3 lin = soaked + vec3(0.84, 0.86, 0.88) * (streak * 0.4 + drop * F * 0.45);
      return phCrush(lin, albedo);
    }`, "rainSheen(N, L, V, p, vec3(0.40, 0.36, 0.38), t)"),

  M("wetCel", "Wet energy then 3-step cel: darker plates, one sheen chip",
    `vec3 wetCel(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.14, ndv);
      float spec = pow(max(dot(N, phH(L, V)), 0.0), 56.0);
      float h = phCel(ndl * (1.0 - F), 3.0);
      vec3 col = mix(albedo * PH_FILL * 0.7, albedo * 0.72, h);
      return phOut(mix(col, vec3(0.86, 0.86, 0.84), phAA(spec + F * 0.25, 0.55) * 0.5));
    }`, "wetCel(N, L, V, vec3(0.46, 0.34, 0.30))"),
];

export default WET;
