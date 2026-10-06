import { defineModule } from "./define.js";

const M = (name, doc, glsl, call) => defineModule({
  name, doc, family: "skin",
  glsl: /* glsl */ `\n${glsl}`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec3 N = phSphereN(p), L = phL(t), V = phV(); return phDemo(p, ${call}); }`,
});

export const SKIN = [
  M("skinWrap", "Skin SSS wrap: wide lobe + red scatter in the terminator",
    `vec3 skinWrap(vec3 N, vec3 L, vec3 albedo) {
      float ndl = dot(N, L);
      float wrap = max((ndl + 0.48) / 1.48, 0.0);
      float F = phSchlick(0.028, phNdV(N, phV()));
      float term = phBand(ndl, -0.12, 0.22);
      vec3 scatter = vec3(0.62, 0.22, 0.20) * term * 0.55;
      vec3 lin = albedo * wrap * (1.0 - F) + scatter + albedo * 0.12;
      float h = phCel(phLuma(lin), 3.0);
      vec3 deep = albedo * vec3(0.55, 0.32, 0.34);
      return phOut(mix(mix(deep, albedo, h), PH_KEY * albedo, phAA(h, 0.72)));
    }`, "skinWrap(N, L, PH_SKIN)"),

  M("skinEarlobe", "Earlobe transmit: exp(−thickness) warm backlight, wrap front",
    `vec3 skinEarlobe(vec3 N, vec3 L, vec3 V, vec3 albedo) {
      float ndl = phNdL(N, L);
      float wrap = max((dot(N, L) + 0.4) / 1.4, 0.0);
      float thick = clamp(0.18 + 0.82 * phNdV(N, V), 0.08, 1.0);
      float trans = exp(-thick * 3.4) * max(-dot(N, L), 0.0);
      float F = phSchlick(0.028, phNdV(N, V));
      vec3 front = albedo * wrap * (1.0 - F);
      vec3 lobe = vec3(0.82, 0.28, 0.22) * trans;
      return phOut(phCrush(front + lobe + albedo * 0.12, albedo) + lobe * 0.25);
    }`, "skinEarlobe(N, L, V, PH_SKIN)"),

  M("skinScatter", "Two-lobe skin: narrow Lambert + wide red wrap, then cel",
    `vec3 skinScatter(vec3 N, vec3 L, vec3 albedo) {
      float n = phNdL(N, L);
      float narrow = n;
      float wide = max((dot(N, L) + 0.65) / 1.65, 0.0);
      vec3 lin = albedo * (narrow * 0.55 + 0.14) + vec3(0.58, 0.18, 0.16) * wide * 0.4;
      float h = phCel(phLuma(lin), 3.0);
      vec3 deep = vec3(0.28, 0.12, 0.16), mid = vec3(0.72, 0.38, 0.34), lit = vec3(0.88, 0.70, 0.60);
      return phOut(mix(mix(deep, mid, phAA(h, 0.38)), lit, phAA(h, 0.74)));
    }`, "skinScatter(N, L, PH_SKIN)"),

  M("skinCel", "Face-ramp cel from wrap: cheeks stay lit, cool terminator",
    `vec3 skinCel(vec3 N, vec3 L) {
      float wrap = 0.5 * dot(N, L) + 0.5;
      float h = wrap * 0.72 + 0.14;
      vec3 deep = vec3(0.28, 0.12, 0.16), sss = vec3(0.62, 0.32, 0.30), lit = vec3(0.88, 0.70, 0.60);
      return phOut(mix(mix(deep, sss, phAA(h, 0.40)), lit, phAA(phNdL(N, L), 0.74)));
    }`, "skinCel(N, L)"),

  M("skinBacklit", "Backlit flesh: −n·l transmit for ears/nose, wrap key",
    `vec3 skinBacklit(vec3 N, vec3 L, vec3 albedo) {
      float front = max((dot(N, L) + 0.35) / 1.35, 0.0);
      float back = pow(max(-dot(N, L), 0.0), 1.4);
      float F = phSchlick(0.028, phNdV(N, phV()));
      vec3 lin = albedo * front * (1.0 - F) + vec3(0.84, 0.30, 0.22) * back * 0.7;
      float h = phCel(phLuma(lin), 3.0);
      vec3 col = mix(albedo * vec3(0.5, 0.28, 0.28), albedo, h);
      return phOut(col + vec3(0.72, 0.24, 0.18) * back * 0.35);
    }`, "skinBacklit(N, L, PH_SKIN)"),
];

export default SKIN;
