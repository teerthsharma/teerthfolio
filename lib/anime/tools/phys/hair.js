import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "hair",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(), T = phTan(N); return phDemo(p, ${call}); }`,
});

export const HAIR = [
  M("kajiyaKay", "Kajiya–Kay: sinθi sinθo + (T·L)(T·V) specular along hair tangent",
    `vec3 kajiyaKay(vec3 T, vec3 L, vec3 V, vec3 albedo) {
      float spec = pow(phKk(T, L, V), 28.0);
      float diff = sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0));
      float F = phSchlick(0.046, max(dot(V, normalize(L + V)), 0.0));
      vec3 lin = albedo * diff * (1.0 - F) * 0.8 + PH_KEY * spec * 0.55;
      return phCrush(lin, albedo);
    }`, "kajiyaKay(T, L, V, vec3(0.22, 0.12, 0.10))"),

  M("dualHighlight", "Dual hair highlight: primary R + shifted secondary TRT",
    `vec3 dualHighlight(vec3 N, vec3 T, vec3 L, vec3 V, vec3 albedo) {
      vec3 T1 = normalize(T + N * 0.08);
      vec3 T2 = normalize(T - N * 0.12);
      float r = pow(phKk(T1, L, V), 40.0);
      float trt = pow(phKk(T2, L, V), 18.0);
      float diff = sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0));
      vec3 lin = albedo * diff * 0.75 + vec3(0.88, 0.82, 0.70) * r * 0.55 + albedo * vec3(1.15, 0.7, 0.4) * trt * 0.4;
      return phCrush(lin, albedo);
    }`, "dualHighlight(N, T, L, V, vec3(0.28, 0.14, 0.10))"),

  M("animeHairCel", "Anime hair cel: dark mass + one broken highlight chip",
    `vec3 animeHairCel(vec3 N, vec3 T, vec3 L, vec3 V, vec2 p, vec3 albedo) {
      float diff = sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0));
      float h = phCel(diff, 3.0);
      vec3 mass = mix(albedo * 0.45, albedo, h);
      float ang = atan(p.y - 0.5, p.x - 0.72);
      float strand = phH21(vec2(floor(ang * 18.0), 3.0));
      float chip = phAA(phKk(T, L, V) + strand * 0.04, 0.86);
      return phOut(mix(mass, vec3(0.78, 0.62, 0.44), chip * 0.58));
    }`, "animeHairCel(N, T, L, V, p, vec3(0.24, 0.12, 0.10))"),

  M("hairShift", "Marschner-ish shift: tangent tilted toward N, single R lobe",
    `vec3 hairShift(vec3 N, vec3 T, vec3 L, vec3 V, vec3 albedo, float shift) {
      vec3 Ts = normalize(T + N * shift);
      float spec = pow(phKk(Ts, L, V), 32.0);
      float diff = sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0));
      float F = phSchlick(0.046, phNdV(N, V));
      vec3 lin = albedo * diff * (1.0 - F) * 0.78 + vec3(0.86, 0.78, 0.62) * spec * 0.5;
      return phCrush(lin, albedo);
    }`, "hairShift(N, T, L, V, vec3(0.32, 0.16, 0.10), 0.1)"),

  M("hairTransmission", "Hair TT lobe: backlight through strands, KK front",
    `vec3 hairTransmission(vec3 N, vec3 T, vec3 L, vec3 V, vec3 albedo) {
      float front = sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0));
      float spec = pow(phKk(T, L, V), 24.0);
      float tt = pow(max(-dot(T, L) * dot(T, V) + sqrt(max(1.0 - dot(T, L) * dot(T, L), 0.0)) * sqrt(max(1.0 - dot(T, V) * dot(T, V), 0.0)), 0.0), 8.0);
      float back = max(-dot(N, L), 0.0);
      vec3 lin = albedo * front * 0.7 + PH_KEY * spec * 0.35 + albedo * vec3(1.2, 0.7, 0.35) * tt * back * 0.65;
      return phCrush(lin, albedo);
    }`, "hairTransmission(N, T, L, V, vec3(0.36, 0.16, 0.10))"),
];

export default HAIR;
