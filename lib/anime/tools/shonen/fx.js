// Shonen effects: stepped glow, crackling ki arcs, cauliflower dust plume, ki beam, dry-brush smear lens.
import { defineModule as M, SUITS } from "./define.js";

export const FX = [
  M({
    name: "shoGlowSteps", suits: SUITS, use: "card",
    doc: "Shonen stepped glow: four hard radial steps of halo, a pale core and a four-point sparkle, pulsing on twos.",
    draws: "A glowing point on a dark plate wrapped in four visible rings of light that step down hard, a pale round core and a thin four-point star.",
    params: "uShoGlowX/uShoGlowY: centre; uShoGlowR: halo radius; uShoGlowK: strength 0 to 1; uShoGlowHue: 0 ki blue to 1 fire orange.",
    uniforms: () => ({ uShoGlowX: { value: 0.8 }, uShoGlowY: { value: 0.5 }, uShoGlowR: { value: 0.3 }, uShoGlowK: { value: 1.0 }, uShoGlowHue: { value: 0.0 } }),
    glsl: /* glsl */ `
uniform float uShoGlowX;
uniform float uShoGlowY;
uniform float uShoGlowR;
uniform float uShoGlowK;
uniform float uShoGlowHue;
vec3 shoGlowSteps(vec2 p, float t, vec3 base) {
  vec2 q = p - vec2(uShoGlowX, uShoGlowY);
  float R = max(uShoGlowR, 1e-3) * (1.0 + 0.06 * sin(shoTwos(t) * 9.0));
  float r = length(q) / R;
  float k = floor(clamp(1.0 - r, 0.0, 0.999) * 4.0) / 4.0;
  vec3 hue = mix(SHO_BLUE, SHO_FIRE, uShoGlowHue);
  vec3 col = base + hue * k * 0.95 * uShoGlowK;
  vec3 pale = mix(hue, vec3(1.0), 0.75);
  col = mix(col, pale, shoFill(r - 0.22) * uShoGlowK);
  vec2 a = abs(q) / R;
  col = mix(col, pale, shoFill(sqrt(a.x) + sqrt(a.y) - 0.85) * uShoGlowK);
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoGlowSteps(p, t, shoDemoBg(p)); }`,
  }),

  M({
    name: "shoKiSparks", suits: SUITS, use: "mask",
    doc: "Shonen ki sparks: jagged arcs hugging a body, each a two-colour crackle that re-rolls its shape and visibility every drawing on twos.",
    draws: "Six short jagged electric arcs orbiting a point, a coloured band with a pale hairline core, some arcs winking out between drawings.",
    params: "uShoSparkX/uShoSparkY: centre of the body; uShoSparkR: ring radius the arcs hug; uShoSparkHue: 0 ki blue to 1 gold.",
    uniforms: () => ({ uShoSparkX: { value: 0.8 }, uShoSparkY: { value: 0.5 }, uShoSparkR: { value: 0.26 }, uShoSparkHue: { value: 0.0 } }),
    glsl: /* glsl */ `
uniform float uShoSparkX;
uniform float uShoSparkY;
uniform float uShoSparkR;
uniform float uShoSparkHue;
vec3 shoKiSparks(vec2 p, float t, vec3 base) {
  vec2 q = p - vec2(uShoSparkX, uShoSparkY);
  float ang = atan(q.y, q.x + 1e-5);
  float rad = length(q);
  float T = floor(t * 12.0 + 1e-5);
  vec3 hue = mix(SHO_BLUE, SHO_GOLD, uShoSparkHue);
  float band = 0.0;
  float core = 0.0;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float a0 = shoH21(vec2(fk, T)) * 6.2832;
    float span = 0.7 + 0.8 * shoH21(vec2(fk + 7.0, T));
    float on = step(0.35, shoH21(vec2(fk + 3.0, T + 5.0)));
    float u = mod(ang - a0, 6.2832) / span;
    float uc = clamp(u, 0.0, 0.999) * 8.0;
    float j = floor(uc);
    float r0 = shoH21(vec2(j + fk * 11.0, T));
    float r1 = shoH21(vec2(j + 1.0 + fk * 11.0, T));
    float rc = uShoSparkR * (1.0 + 0.45 * (mix(r0, r1, fract(uc)) - 0.5));
    float dr = abs(rad - rc);
    float here = on * (1.0 - step(1.0, u));
    band = max(band, here * shoFill(dr - 0.008));
    core = max(core, here * shoFill(dr - 0.0028));
  }
  vec3 col = mix(base, hue * 0.85, band);
  col = mix(col, mix(hue, vec3(1.0), 0.8), core);
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoKiSparks(p, t, mix(shoDemoBg(p), SHO_COAT * 0.5, shoFill(length(p - vec2(0.8, 0.5)) - 0.16))); }`,
  }),

  M({
    name: "shoDustPlume", suits: SUITS, use: "plate",
    doc: "Shonen dust plume: seven cauliflower lobes billowing up from a hit, flat in three bands: lit rim, body and shade rim.",
    draws: "A tan or blue-grey billow of dust rising from a ground point, made of round lobes with a pale upper-left rim and a dark lower-right rim, growing as it ages.",
    params: "uShoDustX/uShoDustY: ground point of the hit; uShoDustR: final plume scale; uShoDustAge: seconds since the hit; uShoDustWarm: 0 blue-grey smoke to 1 tan dust.",
    uniforms: () => ({ uShoDustX: { value: 0.8 }, uShoDustY: { value: 0.22 }, uShoDustR: { value: 0.3 }, uShoDustAge: { value: 0.8 }, uShoDustWarm: { value: 1.0 } }),
    glsl: /* glsl */ `
uniform float uShoDustX;
uniform float uShoDustY;
uniform float uShoDustR;
uniform float uShoDustAge;
uniform float uShoDustWarm;
float shoPlumeD(vec2 p, float g, float T) {
  float d = 1e3;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    vec2 h = vec2(shoH21(vec2(fk, 1.0)), shoH21(vec2(fk, 2.0)));
    vec2 c = vec2(uShoDustX + (h.x - 0.5) * 1.6 * uShoDustR * g, uShoDustY + (0.2 + 0.9 * h.y) * uShoDustR * g);
    c += (vec2(shoH21(vec2(fk, T * 12.0)), shoH21(vec2(fk + 9.0, T * 12.0))) - 0.5) * 0.008;
    float r = uShoDustR * (0.35 + 0.45 * shoH21(vec2(fk, 3.0))) * (0.3 + 0.7 * g);
    d = min(d, length(p - c) - r);
  }
  return d;
}
vec3 shoDustPlume(vec2 p, float t, vec3 base) {
  float T = shoTwos(t);
  float g = 1.0 - exp(-3.0 * max(uShoDustAge, 0.0));
  vec2 L = vec2(-0.7, 0.7) * 0.045;
  float in0 = shoFill(shoPlumeD(p, g, T)) * step(0.02, g);
  float lit = in0 * (1.0 - shoFill(shoPlumeD(p + L, g, T)));
  float shd = in0 * (1.0 - shoFill(shoPlumeD(p - L, g, T)));
  vec3 body = mix(vec3(0.50, 0.56, 0.64), vec3(0.63, 0.55, 0.50), uShoDustWarm);
  vec3 hi = mix(vec3(0.70, 0.76, 0.82), vec3(0.80, 0.73, 0.63), uShoDustWarm);
  vec3 lo = mix(vec3(0.30, 0.34, 0.46), vec3(0.42, 0.36, 0.42), uShoDustWarm);
  vec3 col = mix(base, body, in0);
  col = mix(col, hi, lit);
  col = mix(col, lo, shd);
  return shoOut(col);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoDustPlume(p, t, shoDemoBg(p)); }`,
  }),

  M({
    name: "shoKiBeam", suits: SUITS, use: "plate",
    doc: "Shonen ki beam: a widening horizontal beam with scalloped edges, a pale core, a flat body, a deep edge band and stepped spiral ribs, ending in a round head.",
    draws: "A horizontal energy beam that widens away from its source and ends in a rounded head, pale in the middle, coloured toward the edge, with dark spiral ribs and a wavy rim.",
    params: "uShoBeamX/uShoBeamY: source point; uShoBeamW: half-width at full size; uShoBeamLen: how far the head has travelled; uShoBeamHue: 0 ki blue to 1 fire orange.",
    uniforms: () => ({ uShoBeamX: { value: 0.2 }, uShoBeamY: { value: 0.5 }, uShoBeamW: { value: 0.1 }, uShoBeamLen: { value: 1.0 }, uShoBeamHue: { value: 0.0 } }),
    glsl: /* glsl */ `
uniform float uShoBeamX;
uniform float uShoBeamY;
uniform float uShoBeamW;
uniform float uShoBeamLen;
uniform float uShoBeamHue;
vec3 shoKiBeam(vec2 p, float t, vec3 base) {
  float T = shoTwos(t);
  float len = max(uShoBeamLen, 1e-3);
  float x = p.x - uShoBeamX;
  float y = p.y - uShoBeamY;
  float w = uShoBeamW * (0.3 + 0.7 * smoothstep(0.0, 0.35, x / len)) + 0.012 * sin(x * 38.0 - T * 40.0);
  float dBody = max(abs(y) - w, max(-x, x - len));
  float d = min(dBody, length(vec2(x - len, y)) - w * 1.15);
  float inside = shoFill(d);
  vec3 hue = mix(SHO_BLUE, SHO_FIRE, uShoBeamHue);
  float rib = shoAA(sin(x * 70.0 - T * 60.0 + abs(y) * 14.0), 0.8);
  vec3 col = hue * (1.0 - 0.14 * rib);
  col = mix(col, mix(hue, vec3(1.0), 0.8), 1.0 - shoAA(abs(y), w * 0.45));
  col = mix(col, hue * vec3(0.42, 0.55, 0.8), 1.0 - shoAA(-d, 0.012));
  return shoOut(mix(base, col, inside));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoKiBeam(p, t, shoDemoBg(p)); }`,
  }),

  M({
    name: "shoSmearLens", suits: SUITS, use: "mask",
    doc: "Shonen smear lens: a body stretched along its path into a lens with dry-brush streak strips that re-roll their length every drawing on twos.",
    draws: "A solid rounded head at the end of a long tapering lens made of parallel streak strips of different lengths, lit above, shaded below, inked along the top edge.",
    params: "uShoSmAx/uShoSmAy: where the move starts; uShoSmBx/uShoSmBy: where it ends (the solid head); uShoSmW: half-width of the lens; uShoSmHue: 0 blue-grey coat to 1 orange gi.",
    uniforms: () => ({ uShoSmAx: { value: 0.25 }, uShoSmAy: { value: 0.4 }, uShoSmBx: { value: 1.15 }, uShoSmBy: { value: 0.55 }, uShoSmW: { value: 0.11 }, uShoSmHue: { value: 0.0 } }),
    glsl: /* glsl */ `
uniform float uShoSmAx;
uniform float uShoSmAy;
uniform float uShoSmBx;
uniform float uShoSmBy;
uniform float uShoSmW;
uniform float uShoSmHue;
vec3 shoSmearLens(vec2 p, float t, vec3 base) {
  vec2 A = vec2(uShoSmAx, uShoSmAy);
  vec2 ab = vec2(uShoSmBx, uShoSmBy) - A;
  float L = max(length(ab), 1e-3);
  vec2 dir = ab / L;
  vec2 q = p - A;
  float s = dot(q, dir) / L;
  float v = dot(q, vec2(-dir.y, dir.x));
  float W = max(uShoSmW, 1e-3);
  float hw = W * sqrt(max(0.0, 1.0 - (2.0 * s - 1.0) * (2.0 * s - 1.0)));
  float d = max(abs(v) - hw, max(-s, s - 1.0) * L);
  float strip = floor(v / (W * 0.16));
  float lenI = 0.35 + 0.65 * shoH21(vec2(strip, floor(t * 12.0 + 1e-5)));
  float keep = max(shoAA(s, 1.0 - lenI), shoAA(s, 0.72));
  float inside = shoFill(d) * keep;
  vec3 lit = mix(SHO_COAT, vec3(0.94, 0.54, 0.12), uShoSmHue);
  vec3 sh = lit * vec3(0.62, 0.66, 0.85) + 0.03;
  vec3 col = mix(lit, sh, shoAA(v, 0.0));
  col = mix(col, SHO_INK, (1.0 - shoAA(-d, 0.006)) * (1.0 - shoAA(v, 0.0)));
  return shoOut(mix(base, col, inside));
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shoSmearLens(p, t, shoDemoBg(p)); }`,
  }),
];
