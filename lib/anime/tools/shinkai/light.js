// Light family: sun glare, hexagon lens ghosts, glittering lake, fireflies, banded comet arc.
import { Vector2 } from "three";
import { defineModule } from "./define.js";

const SKY = ["shinKit", "shinTwilightSky"];

export const LIGHT = [
  defineModule({
    name: "shinSunGlare",
    doc: "bounded sun glare: hot core, long horizontal streak along the horizon and a faint 4-point star, gold #ffd6a0, luma capped",
    deps: SKY,
    uniforms: () => ({ uShinGlare: { value: 1 } }),
    draws: "a gold glare around the low sun with a thin streak running along the horizon and a faint four-point star, never greying the sky.",
    use: "screen",
    params: "uShinGlare: glare strength; position follows uShinSun.",
    glsl: /* glsl */ `
uniform float uShinGlare;
vec3 shnGlare(vec2 p, vec3 base) {
  vec2 q = p - uShinSun;
  float r = length(q), a = atan(q.y, q.x + 1e-5);
  float g = exp(-r / 0.05) + 0.5 * exp(-abs(q.y) / 0.004) * exp(-abs(q.x) / 0.6) + 0.25 * pow(max(cos(4.0 * a), 0.0), 16.0) * exp(-r / 0.18);
  return shnCap(base + shnC(255.0, 214.0, 160.0) * g * uShinGlare * 0.8);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnGlare(p, shnSky(p, 0.0)); }`,
  }),

  defineModule({
    name: "shinLensGhosts",
    doc: "five hexagon lens ghosts strung from the sun through the frame centre, gold #ffb273 to blue #8da6ff, one pink, held at 0.55",
    deps: SKY,
    uniforms: () => ({ uShinCenter: { value: new Vector2(0.8, 0.5) }, uShinGhost: { value: 0.55 } }),
    draws: "five pale hexagons with brighter rims strung in a line from the sun across the frame, shading from gold to blue with one pink.",
    use: "screen",
    params: "uShinCenter: the point the ghost line passes through; uShinGhost: ghost opacity.",
    glsl: /* glsl */ `
uniform vec2 uShinCenter;
uniform float uShinGhost;
vec3 shnGhosts(vec2 p, vec3 base) {
  vec2 ax = uShinCenter - uShinSun;
  float R[5] = float[5](0.06, 0.10, 0.16, 0.09, 0.22);
  float P[5] = float[5](0.45, 0.80, 1.20, 1.60, 2.10);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float d = shnHex(p - (uShinSun + ax * P[i]), R[i]);
    float fill = 1.0 - shnAA(d, 0.0);
    float ring = fill * shnAA(d, -0.006);
    vec3 col = mix(shnC(255.0, 178.0, 115.0), shnC(141.0, 166.0, 255.0), float(i) / 4.0);
    col = i == 0 ? shnC(240.0, 160.0, 208.0) : col;
    acc += col * (0.10 * fill + 0.35 * ring);
  }
  return shnCap(base + acc * uShinGhost);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnGhosts(p, shnSky(p, 0.0)); }`,
  }),

  defineModule({
    name: "shinGlitterWater",
    doc: "crater lake: sky ramp mirrored with ripple wobble, deep #08203e to mid #1a4a6c, flat gold glitter dashes re-rolled on threes",
    deps: SKY,
    uniforms: () => ({ uShinLakeTop: { value: 0.36 }, uShinGlitter: { value: 1 } }),
    draws: "a deep blue lake mirroring the twilight sky with ripple bands and small gold glitter dashes concentrated under the sun.",
    use: "surface",
    params: "uShinLakeTop: height of the far shore line; uShinGlitter: glitter strength.",
    glsl: /* glsl */ `
uniform float uShinLakeTop;
uniform float uShinGlitter;
vec3 shnWater(vec2 p, float t, vec3 base) {
  float dy = uShinLakeTop - p.y;
  float inside = 1.0 - shnAA(p.y, uShinLakeTop);
  float wob = 0.004 * sin(p.y * 160.0 + t * 0.8) + 0.003 * (shnFbm(vec2(p.x * 5.0, p.y * 80.0)) - 0.5);
  vec3 refl = shnSky(vec2(p.x + wob * (1.0 + dy * 6.0), uShinLakeTop + dy), 0.0);
  float depth = clamp(dy / 0.3, 0.0, 1.0);
  vec3 c = mix(refl * 0.85, mix(shnC(26.0, 74.0, 108.0), shnC(8.0, 32.0, 62.0), depth), 0.35 + 0.45 * depth);
  c *= 1.0 + 0.15 * shnAA(sin(dy * 220.0 + wob * 400.0), 0.6);
  vec2 g = vec2(p.x * 70.0, dy * 260.0), f = fract(g);
  float sp = step(0.965, shnH(floor(g) + floor(t * 8.0) * vec2(3.1, 7.7))) * exp(-3.0 * abs(p.x - uShinSun.x));
  float dash = (1.0 - shnAA(abs(f.y - 0.5), 0.22)) * (1.0 - shnAA(abs(f.x - 0.5), 0.45));
  c = mix(c, shnC(255.0, 214.0, 160.0), sp * dash * uShinGlitter);
  return mix(base, shnCap(c), inside);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnWater(p, t, shnSky(p, 0.0)); }`,
  }),

  defineModule({
    name: "shinFireflies",
    doc: "field of soft pale-green light discs #f0ffc0, 4 to 40 px, cubed sine pulse, slow drift, deterministic per cell",
    deps: SKY,
    uniforms: () => ({ uShinFlies: { value: 0.8 } }),
    draws: "soft pale-green discs of different sizes drifting and pulsing slowly across the frame, like fireflies and never like sparkles.",
    use: "screen",
    params: "uShinFlies: cell occupancy 0 to 1, so about 80 discs at 0.8 across a 16:10 frame; the seed uniform re-rolls the positions.",
    glsl: /* glsl */ `
uniform float uShinFlies;
vec3 shnFlies(vec2 p, float t, vec3 base) {
  vec3 acc = vec3(0.0);
  vec2 ci = floor(p * 7.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = ci + vec2(float(i), float(j));
      float h = shnH(c);
      float pres = 1.0 - shnAA(h, uShinFlies);
      float h2 = shnH(c + 7.3);
      vec2 pos = (c + 0.5 + 0.35 * vec2(sin(t * 0.6 + h * 40.0), cos(t * 0.5 + h * 30.0))) / 7.0;
      float r = 0.005 + 0.035 * h2 * h2;
      float pulse = pow(0.5 + 0.5 * sin(t * (0.8 + h2 * 1.5) + h * 6.2831), 3.0);
      acc += shnC(240.0, 255.0, 192.0) * exp(-pow(length(p - pos) / r, 2.0) * 2.2) * pulse * pres;
    }
  }
  return shnCap(base + acc * 0.8);
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnFlies(p, t, shnSky(p, 0.0) * 0.55); }`,
  }),

  defineModule({
    name: "shinCometBand",
    doc: "comet as an analytic arc y = 0.66x^2 - 1.89x + 1.49, widening tail, five cross-bands #2e71cc to #6fb1f6, white core, optional tail split",
    deps: SKY,
    uniforms: () => ({ uShinComet: { value: 1 }, uShinSplit: { value: 0 } }),
    draws: "a banded blue and cyan comet arcing up to the right with a near-white core, whose tail fans into magenta and green strands when split.",
    use: "card",
    params: "uShinComet: opacity; uShinSplit: tail fan spread, 0 one tail, 0.03 to 0.10 two and three tails.",
    glsl: /* glsl */ `
uniform float uShinComet;
uniform float uShinSplit;
vec3 shnComet(vec2 p, float t, vec3 base) {
  float yt = 1.0 - p.y;
  float u = clamp((p.x - 0.46) / 0.82, 0.0, 1.0);
  float inx = shnAA(p.x, 0.46) * (1.0 - shnAA(p.x, 1.28));
  float cy = 0.66 * p.x * p.x - 1.89 * p.x + 1.49;
  float sl = 1.32 * p.x - 1.89;
  float nrm = inversesqrt(1.0 + sl * sl);
  float w = 0.004 + 0.06 * u;
  vec3 col = base;
  for (int k = 0; k < 3; k++) {
    float e = (yt - cy - (float(k) - 1.0) * uShinSplit * (p.x - 0.46)) * nrm / w;
    float band = floor(clamp(e * 0.5 + 0.5, 0.0, 0.999) * 5.0);
    vec3 s = band < 0.5 ? shnC(46.0, 113.0, 204.0) : band < 1.5 ? shnC(103.0, 238.0, 252.0) : band < 2.5 ? shnC(192.0, 254.0, 251.0) : band < 3.5 ? shnC(187.0, 243.0, 251.0) : shnC(111.0, 177.0, 246.0);
    s = k == 0 ? mix(s, shnC(208.0, 74.0, 184.0), 0.55) : k == 2 ? mix(s, shnC(47.0, 224.0, 176.0), 0.55) : s;
    s += shnC(192.0, 254.0, 251.0) * 0.6 * exp(-pow(e * w / 0.002, 2.0));
    col = mix(col, shnCap(s), (1.0 - shnAA(abs(e), 1.0)) * inx * uShinComet);
  }
  return col;
}`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return shnComet(p, t, shnSky(p, 0.35)); }`,
  }),
];
