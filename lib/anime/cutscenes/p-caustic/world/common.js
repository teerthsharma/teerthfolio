// p-caustic WORLD: shared constants, cue helpers and GLSL snippets (this folder only).
// Protected Madara palette (bible 3, commit 4d2cf1a^): sky top #2a241f, mid #6a5c4d, haze #bfa98b, low #4a3f34, red #b3122a;
// ground ash #9c8a72, soot #433a30, ember #e8c9a0, ink #2a231c.
import { Color } from "three";

export const PAL = {
  skyTop: "#2a241f", skyMid: "#6a5c4d", haze: "#bfa98b", low: "#4a3f34", red: "#b3122a", gold: "#e8c25a",
  cloudDark: "#2c1d1a", cloudMid: "#5a3a30", cloudBruise: "#7a4a3c", cloudTop: "#b88a64", strip: "#1a0b0b", redSky: "#a4281f",
  ash: "#9c8a72", soot: "#433a30", ember: "#e8c9a0", ink: "#2a231c", emberHot: "#ffd27a",
  olive: "#5a5a28", oliveShade: "#2c2c14", moonRed: "#b80a17", moonDark: "#6a0710", moonInk: "#140003", moonMottle: "#7a6a52",
  halo: "#ffe8e0", rock: "#6b5c4c", rockHi: "#8f7b5c", rockEdge: "#1a0f0a", flash: "#fff4e4", seam: "#fff2d8", gap: "#0a0408",
  susBlue: "#2a5be0", giant: "#1f3a22", giantInk: "#0f1a10",
};
export const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// geometry of the war (bible 3.2, 3.3, 3.5, 3.8), metres, seal at the origin facing -z
export const GEO = {
  MOON_R: 19, MOON_WIDE: [-30, 14, -118], MOON_TALL: [-10, 23, -118],
  SUS_AT: [0.9, 0, -17], HIT1: [-13, -44], HIT2: [5, -38], RIDGE_Z: -33,
  CRATERS: [[-22, -12, 4.5, 1.1], [16, -24, 5.5, 1.4], [-8, -27, 3.8, 0.9], [27, -10, 4.0, 1.0], [-36, -20, 6.0, 1.5]],
  HIT_R: [9, 11], HIT_D: [2.4, 3.2],
};

// event times (s) used when the direction layer has no beat of that name; the beat wins when it exists
export const EV = { limbo: 0.3, rise: 1.7, cast: 3.3, tear: 3.45, meteor1: 3.8, hit1: 4.7, meteor2: 4.85, crack: 5.45, impact: 6.42, break: 6.6 };
// seconds since event `name` started (negative before it, by the bible time)
export function since(cue, name) {
  const s = cue.since ? cue.since(name) : Infinity;
  return Number.isFinite(s) ? s : cue.ts - EV[name];
}
export const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// GLSL: hash, value noise, Voronoi with cell id. Names are distinct from tools/noise.js so both can be included.
//   hh(p) = fract(sin(p . (127.1, 311.7)) 43758.5453); nn = bilinear smooth value noise
//   vcell(p) = (F1, F2 - F1, hash of the nearest cell): F2-F1 ~ 0 on cell borders = the cracks; the hash times the break
//   threshold picks when that cell falls away in the shatter.
export const GLSL_HASH = /* glsl */ `
  float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float nn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }
  vec3 vcell(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(hh(i + g), hh(i + g + 17.3));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = hh(i + g + 5.1); } else if (d < d2) d2 = d; }
    return vec3(d1, d2 - d1, id); }`;

// the break (bible 3.13): a cell falls when uBreak passes id*0.8 + 0.02; its neighbours carry a 2 px #fff4e4 edge,
// 0.9 for the first 0.2 of the break, then 0.5
export const GLSL_BREAK = /* glsl */ `
  bool shardGone(float id) { return uBreak > id * 0.8 + 0.02; }
  float shardEdge(float f12) { float e = 1.0 - smoothstep(0.0, 0.05, f12); return e * (uBreak > 0.0 ? (uBreak < 0.2 ? 0.9 : 0.5) : 0.0); }`;
