// Ported from moves/pr-openxla-46539/print.js (the site's live move, read only). Imports point at this folder.
// The page's surfaces write alpha 0.99 (its line id); translucent materials pass through idSafe (support.js).
// The notes live with the original.

import { Vector3, Vector4 } from "three";

export const u = (v) => ({ value: v });
export const sr = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));

export const PAL = {
  wallA: 0, wallB: 1, wallC: 2, wallD: 3, road: 4, walk: 5, roof: 6, rubble: 7, sinter: 8, heat: 9, lamp: 10, pole: 11,
  nomu: 12, brain: 13, red: 14, blue: 15, paper: 16, gold: 17, ember: 18, civ: 19, flag: 20, steel: 21,
};
const TABLE = [
  [0.9, 0.5, 0.0, 0.12],
  [0.55, 0.9, 0.0, 0.15],
  [0.85, 0.2, 0.35, 0.18],
  [0.0, 0.85, 0.8, 0.2],
  [0.62, 0.52, 0.0, 0.42],
  [0.5, 0.36, 0.12, 0.2],
  [0.5, 0.4, 0.0, 0.55],
  [0.3, 0.45, 0.45, 0.45],
  [0.0, 0.18, 0.82, 0.0],
  [0.0, 0.62, 1.0, 0.0],
  [0.0, 0.06, 1.0, 0.0],
  [0.35, 0.35, 0.0, 0.85],
  [0.4, 0.38, 0.0, 0.8],
  [0.0, 0.69, 0.48, 0.0],
  [0.0, 1.0, 0.95, 0.0],
  [1.0, 0.7, 0.0, 0.08],
  [0.0, 0.0, 0.05, 0.0],
  [0.0, 0.25, 1.0, 0.0],
  [0.0, 0.8, 1.0, 0.08],
  [0.45, 0.4, 0.0, 0.8],
  [0.0, 1.0, 0.95, 0.0],
  [0.45, 0.25, 0.0, 0.5],
];
export const PAL_V4 = Array.from({ length: 24 }, (_, i) => new Vector4(...(TABLE[i] ?? [0, 0, 0, 1])));

export const SH = {
  uCell: u(12),
  uTime: u(0),
  uBreak: u(-1),
  uSun: u(0),
  uPal: u(PAL_V4),
  uPillar: u(new Vector3(-0.4, -26, 8)),
  uHaze: u(new Vector4(0.12, 0.6, 0.5, 0.0)),
  uCrater: u(new Vector3(-2.5, -7.2, 2.7)),
  uShock: u(new Vector4(0, 0, 0, -1)),
  uH: u(900),
  uAspect: u(1.6),
  uPx: u(3),
  uStreet: u(5.2),
};

export const PRINT = /* glsl */ `
  uniform float uCell, uTime;
  uniform vec4 uPal[24];
  const vec3 INK_C = vec3(0.0, 0.62, 0.88);
  const vec3 INK_M = vec3(0.93, 0.16, 0.54);
  const vec3 INK_Y = vec3(1.0, 0.89, 0.10);
  const vec3 INK_K = vec3(0.07, 0.055, 0.10);
  const vec3 PAPER = vec3(0.97, 0.94, 0.86);
  float ht(float tone, float ang, vec2 off) {
    float cs = cos(ang), sn = sin(ang);
    vec2 p = mat2(cs, -sn, sn, cs) * (gl_FragCoord.xy + off * uCell) / uCell;
    float d = length(fract(p) - 0.5);
    float r = 0.74 * sqrt(clamp(tone, 0.0, 1.0));
    float aa = 0.7 / uCell;
    return (1.0 - smoothstep(r - aa, r + aa, d)) * smoothstep(0.0, 0.05, tone);
  }
  vec3 inkPrint(vec4 t, out float cov) {
    float C = ht(t.x, 0.2618, vec2(1.3, -0.9));
    float M = ht(t.y, 1.3090, vec2(-1.1, 1.0));
    float Y = ht(t.z, 0.0, vec2(0.0));
    float K = ht(t.w, 0.7854, vec2(0.8, 0.8));
    vec3 c = PAPER;
    c *= mix(vec3(1.0), INK_C, C);
    c *= mix(vec3(1.0), INK_M, M);
    c *= mix(vec3(1.0), INK_Y, Y);
    cov = max(max(C, M), max(Y, K));
    return mix(c, INK_K, K);
  }
  vec3 inkPrint(vec4 t) { float cv; return inkPrint(t, cv); }
  vec4 cmykOf(vec3 c) {
    float k = 1.0 - max(c.r, max(c.g, c.b));
    return vec4((1.0 - c - k) / max(1.0 - k, 0.001), k);
  }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  float vorEdge(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y);
      float d = length(g + vec2(h21(i + g), h21(i + g + 17.3)) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return d2 - d1;
  }`;

export function tickShared(state, t, brk) {
  const dpr = state.gl.getPixelRatio();
  SH.uCell.value = 6 * dpr;
  SH.uTime.value = t;
  SH.uBreak.value = brk;
  SH.uH.value = state.size.height * dpr;
  SH.uAspect.value = state.size.width / state.size.height;
  SH.uPx.value = 3.2 * dpr;
}

