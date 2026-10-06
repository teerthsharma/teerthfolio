import { defineModule } from "./define.js";

export const RAILGUN = [
  defineModule({
    name: "railgun-beam",
    family: "fx",
    doc: "Misaka railgun: coin discs, EM rings, yellow-white core along a line, arc branches — luma capped",
    glsl: /* glsl */ `
  vec3 railgunBeam(vec2 p, float t) {
    vec2 a = vec2(0.18, 0.38);
    vec2 b = vec2(1.22, 0.62);
    vec2 ba = b - a;
    vec2 pa = p - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    vec2 proj = a + ba * h;
    float dist = length(p - proj);
    vec3 col = mix(vec3(0.10, 0.12, 0.20), vec3(0.22, 0.28, 0.40), clamp(p.y, 0.0, 1.0));
    col = mix(col, ixPaper(p) * 0.4, ixFill(0.26 - p.y) * 0.45);

    float core = exp(-pow(dist / 0.018, 2.0));
    float sheath = exp(-pow(dist / 0.055, 2.0));
    float hold = ixHold(t, 16.0);
    float flicker = 0.85 + 0.15 * ixH21(vec2(hold, 3.0));
    col = mix(col, IX_BEAM * 0.55, sheath * flicker);
    col = mix(col, IX_CREAM * 0.88, core * flicker);

    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float u = fract(fi * 0.18 + t * 0.55);
      vec2 ringC = mix(a, b, u);
      vec2 n = normalize(vec2(-ba.y, ba.x));
      float rr = 0.04 + 0.03 * sin(u * 9.0 + t);
      float ring = abs(length(p - ringC) - rr) - 0.006;
      col = mix(col, IX_BEAM, ixFill(ring) * 0.75);
    }
    for (int j = 0; j < 6; j++) {
      float fj = float(j);
      float u = fract(fj * 0.14 + t * 0.9);
      vec2 coin = mix(a, b, u) + 0.02 * vec2(sin(fj * 2.1), cos(fj * 1.7));
      float cd = ixEllipse(p, coin, vec2(0.022, 0.016));
      vec3 metal = ixCel3(0.6, IX_GOLD * 0.5, IX_GOLD, IX_BEAM);
      col = mix(col, metal, ixFill(cd));
      col = mix(col, IX_INK, ixLine(cd, 1.2));
    }
    float arc = ixFbm(p * 8.0 + t * 3.0);
    float branch = ixFill(dist - 0.08) * step(0.72, arc) * exp(-dist * 8.0);
    col = mix(col, IX_BEAM, branch * 0.55);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return railgunBeam(p, t); }`,
  }),
];
