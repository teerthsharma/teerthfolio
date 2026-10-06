import { defineModule } from "./define.js";

const M = (name, doc, glsl, extra, call) => defineModule({
  name, doc, family: "eye",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); ${extra} return phDemo(p, ${call}); }`,
});

export const EYE = [
  M("corneaFresnel", "Cornea F: IOR 1.376 Schlick over iris body",
    `vec3 corneaFresnel(vec3 N, vec3 L, vec3 V, vec3 iris) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(phF0Ior(1.376), ndv);
      vec3 H = phH(L, V);
      float chip = phAA(max(dot(N, H), 0.0), 0.94);
      vec3 body = iris * (ndl * (1.0 - F) + 0.18);
      vec3 col = mix(phCrush(body, iris), vec3(0.88, 0.86, 0.82), F * 0.55 + chip * 0.5);
      return phOut(col);
    }`, "", "corneaFresnel(N, L, V, vec3(0.22, 0.38, 0.48))"),

  M("irisCaustic", "Iris caustic: refracted L through cornea, brightens pupil ring",
    `vec3 irisCaustic(vec3 N, vec3 L, vec3 V, vec2 p) {
      vec3 R = phBend(-L, N, 1.0 / 1.376);
      vec2 c = p - vec2(0.72, 0.5);
      float r = length(c);
      float pupil = phFill(r - 0.06);
      float iris = phBand(r, 0.06, 0.18);
      float caust = pow(max(-dot(R, V), 0.0), 8.0) * iris;
      vec3 dye = mix(vec3(0.16, 0.28, 0.40), vec3(0.32, 0.52, 0.58), phCel(fract(r * 14.0), 4.0));
      vec3 col = mix(vec3(0.10, 0.09, 0.14), dye, iris);
      col = mix(col, vec3(0.08, 0.07, 0.12), pupil);
      col += vec3(0.78, 0.72, 0.48) * caust * 0.55;
      float F = phSchlick(phF0Ior(1.376), phNdV(N, V));
      return phOut(mix(col, vec3(0.86, 0.84, 0.80), F * 0.4));
    }`, "", "irisCaustic(N, L, V, p)"),

  M("wetLine", "Wet line: tear meniscus highlight along the lid arc",
    `vec3 wetLine(vec3 N, vec3 L, vec3 V, vec2 p) {
      vec2 c = p - vec2(0.72, 0.5);
      float r = length(c);
      float lid = phLine(c.y + 0.07 + 0.35 * c.x * c.x, 1.6) * phFill(r - 0.21);
      float men = pow(max(dot(N, phH(L, V)), 0.0), 40.0);
      vec3 sclera = vec3(0.78, 0.72, 0.68) * (phNdL(N, L) * 0.7 + 0.2);
      vec3 col = mix(phCrush(sclera, vec3(0.78, 0.72, 0.68)), vec3(0.88, 0.86, 0.80), lid * (0.45 + 0.55 * men));
      return phOut(col);
    }`, "", "wetLine(N, L, V, p)"),

  M("limbusDark", "Limbus ring + wet sclera scatter, cornea F kept thin",
    `vec3 limbusDark(vec3 N, vec3 L, vec3 V, vec2 p) {
      vec2 c = p - vec2(0.72, 0.5);
      float r = length(c);
      float limbus = phBand(r, 0.165, 0.195);
      float iris = phFill(0.17 - r);
      float ndl = phNdL(N, L);
      vec3 sclera = vec3(0.76, 0.70, 0.66) * (ndl * 0.65 + 0.22);
      vec3 dye = vec3(0.20, 0.36, 0.46) * (ndl * 0.7 + 0.18);
      vec3 col = mix(sclera, dye, iris);
      col = mix(col, vec3(0.12, 0.10, 0.16), limbus * 0.75);
      float F = phSchlick(phF0Ior(1.376), phNdV(N, V));
      return phOut(mix(phCrush(col, vec3(0.76, 0.70, 0.66)), vec3(0.86, 0.84, 0.80), F * 0.35));
    }`, "", "limbusDark(N, L, V, p)"),
];

export default EYE;
