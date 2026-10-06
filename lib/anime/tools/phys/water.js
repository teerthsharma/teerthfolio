import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "water",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const WATER = [
  M("waterFresnel", "Water F: IOR 1.33 Schlick, dark body, sky tint at grazing",
    `vec3 waterFresnel(vec3 N, vec3 L, vec3 V) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.33), ndv);
      vec3 body = vec3(0.12, 0.28, 0.42) * (ndl * (1.0 - F) + 0.18);
      vec3 sky = vec3(0.42, 0.58, 0.72);
      vec3 col = mix(body, sky, F);
      return phCrush(col, vec3(0.18, 0.36, 0.50));
    }`, "waterFresnel(N, L, V)"),

  M("slimeScatter", "Slime: high wrap, green transmit, glossy F chip",
    `vec3 slimeScatter(vec3 N, vec3 L, vec3 V) {
      float wrap = max((dot(N, L) + 0.62) / 1.62, 0.0);
      float ndv = phNdV(N, V);
      float F = phSchlick(0.06, ndv);
      float trans = exp(-ndv * 1.8) * max(-dot(N, L), 0.0);
      vec3 dye = vec3(0.28, 0.62, 0.32);
      vec3 lin = dye * wrap * (1.0 - F) + vec3(0.55, 0.82, 0.28) * trans * 0.6;
      float spec = pow(max(dot(N, phH(L, V)), 0.0), 72.0);
      return phOut(phCrush(lin, dye) + vec3(0.84, 0.88, 0.72) * spec * 0.4);
    }`, "slimeScatter(N, L, V)"),

  M("glassRefract", "Cheap glass: uv bend by n.xy, dielectric F over refracted bg",
    `vec3 glassRefract(vec3 N, vec3 L, vec3 V, vec2 p) {
      float ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.5), ndv);
      vec2 uv = p + N.xy * 0.12 * (1.0 - ndv);
      vec3 bg = phBg(uv);
      vec3 body = bg * (0.55 + 0.45 * phNdL(N, L));
      vec3 col = mix(body, vec3(0.86, 0.86, 0.84), F);
      return phCrush(col, vec3(0.62, 0.66, 0.70));
    }`, "glassRefract(N, L, V, p)"),

  M("cheapSnell", "Cheap Snell: refract(V,N,η) samples bent bg, residual F",
    `vec3 cheapSnell(vec3 N, vec3 L, vec3 V, vec2 p) {
      vec3 R = phBend(-V, N, 1.0 / 1.5);
      vec2 uv = p + R.xy * 0.18;
      float ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.5), ndv);
      vec3 bg = phBg(uv);
      vec3 col = mix(bg * (0.5 + 0.5 * phNdL(N, L)), vec3(0.84, 0.86, 0.88), F);
      return phCrush(col, vec3(0.58, 0.64, 0.70));
    }`, "cheapSnell(N, L, V, p)"),

  M("waterCel", "Water F + body cel: deep plates, one horizon chip",
    `vec3 waterCel(vec3 N, vec3 L, vec3 V) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.33), ndv);
      float h = phCel(ndl * (1.0 - F), 3.0);
      vec3 deep = vec3(0.10, 0.20, 0.36), mid = vec3(0.18, 0.40, 0.52), lit = vec3(0.42, 0.62, 0.70);
      vec3 col = mix(mix(deep, mid, phAA(h, 0.34)), lit, phAA(h, 0.68));
      return phOut(mix(col, vec3(0.82, 0.86, 0.88), phAA(F, 0.28) * 0.55));
    }`, "waterCel(N, L, V)"),
];

export default WATER;
