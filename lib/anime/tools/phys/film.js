import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "film",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const FILM = [
  M("thinFilmSoap", "Soap thin-film: 2 n d cosθ phase, RGB interference over Lambert",
    `vec3 thinFilmSoap(vec3 N, vec3 L, vec3 V, float thick) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.04, ndv);
      float phase = thick * ndv * 6.2831853;
      vec3 iris = 0.5 + 0.5 * cos(vec3(phase, phase + 2.094, phase + 4.189));
      vec3 body = vec3(0.42, 0.52, 0.62) * (ndl * (1.0 - F) + 0.16);
      vec3 lin = mix(body, iris, F * 0.85);
      float h = phCel(phLuma(lin), 3.0);
      return phOut(mix(body * 0.9, lin, 0.45 + 0.55 * h));
    }`, "thinFilmSoap(N, L, V, 3.4 + 0.4 * sin(t))"),

  M("thinFilmOil", "Oil-slick film: thinner optical path, slower rainbow, wet body",
    `vec3 thinFilmOil(vec3 N, vec3 L, vec3 V, vec2 p) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.05, ndv);
      float d = 1.6 + 1.1 * phVn(p * 7.0 + N.xy * 3.0);
      float phase = d * ndv * 6.2831853;
      vec3 iris = 0.5 + 0.5 * cos(vec3(phase + 0.4, phase + 2.3, phase + 3.9));
      vec3 wet = vec3(0.18, 0.16, 0.14) * (ndl * (1.0 - F) + 0.2);
      return phOut(mix(wet, iris * 0.82, F * 0.78));
    }`, "thinFilmOil(N, L, V, p)"),

  M("thinFilmCel", "Thin-film then quantized wavelength plates — anime iridescence",
    `vec3 thinFilmCel(vec3 N, vec3 L, vec3 V) {
      float ndl = phNdL(N, L), ndv = phNdV(N, V);
      float F = phSchlick(0.04, ndv);
      float phase = phCel(fract(ndv * 2.4 + 0.15), 5.0);
      vec3 a = vec3(0.72, 0.22, 0.38), b = vec3(0.22, 0.52, 0.70), c = vec3(0.78, 0.68, 0.22);
      vec3 plate = phase < 0.5 ? mix(a, b, phase * 2.0) : mix(b, c, phase * 2.0 - 1.0);
      vec3 body = phCrush(vec3(0.36, 0.32, 0.40) * (ndl * (1.0 - F) + 0.15), vec3(0.36, 0.32, 0.40));
      return phOut(mix(body, plate, F * 0.8));
    }`, "thinFilmCel(N, L, V)"),
];

export default FILM;
