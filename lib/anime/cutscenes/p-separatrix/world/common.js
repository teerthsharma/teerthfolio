// p-separatrix WORLD: shared constants, cue helpers and the GLSL every world material carries.
// Layout (metres, y up). The seal stands at the saddle origin; the camera stays on the +z side of it and looks toward -z,
// so the set is built to be seen from inside the arena: the Colosseum facade rings the arena (inward faces only),
// the BREAK (ruined sector) and the sun both lie toward -z (angle PHI), and Rome lies beyond the break.
//   ellipse   x = A cos(th), z = B sin(th);   PHI = -1.0 rad  ->  direction (0.54, -0.84) = the bible sun azimuth.
//   saddle    y = K (z^2 - x^2) (faded to 0 by r = 17), two bowls of radius 2.3 and depth 0.34 at x = +-4.6, ridge along z.
import { Color, Vector3 } from "three";

export const hex = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
export const mixHex = (a, b, t) => hex("#" + new Color(a).lerp(new Color(b), t).getHexString());

// bible colours (scripts/p-separatrix.md sections 2 and 3)
export const C = {
  zenith: "#1d1a6e", upper: "#5a1a8c", rose: "#d96a52", horizon: "#f2bd45", sunCore: "#fff3c4", cloudLit: "#fbd9a0", cloudMid: "#d98f78", cloudShade: "#7a2290",
  cosmos: "#0b0612", starPink: "#ff9be0", starWhite: "#ffffff", cosmosWisp: "#ff2adf",
  stoneLit: "#e8c890", stone: "#d9a441", stoneMid: "#a8602a", stoneShade: "#5a1a8c", deep: "#2a1a24", rimGold: "#f2bd45", sinopia: "#b9573a", craq: "#7a2290", umber: "#4a2a1c",
  coral: "#d96a52", coralBand: "#f4b8a0", waterLit: "#3a6ea8", waterShade: "#1f3f78", ring: "#f2bd45",
  roof: "#b9573a", roofShade: "#7a2290", hills: "#9a5a8a", hillsFar: "#b06a96", dome: "#d9a441", apricot: "#e8a060",
  pineLit: "#8aa04a", pine: "#4a5a2a", pineShade: "#2e3a1c", pineDeep: "#1a2010",
  plaster: "#fbf6e8", greyPlaster: "#8a7a8a", gold: "#f2bd45", goldLit: "#fff0a0",
  barRed: "#b9573a", beaconOff: "#4a1a1a", beaconOn: "#ff6a5a",
};

export const SUN = new Vector3(0.5, 0.2, -0.84).normalize(); // direction TO the sun (bible)
export const A = 27, B = 23, PHI = -1.0, BREAK = 0.78;        // arena ellipse and the ruined sector (half-width, rad)
export const BAY_W = 3.2, PIER = 0.85, SPRING = 1.85, TIER_H = 4.4, ATTIC_H = 3.2, DEPTH = 1.4;
export const K = 0.011, POOL_X = 4.6, POOL_R = 2.3, BOWL = 0.34, RIDGE_END = 7.0;
export const GATE_Z = -7.6;

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// the arena floor height, shared by the heightfield, the pools and the gate posts
export function floorY(x, z) {
  const r = Math.hypot(x, z), fade = 1 - sstep(11, 17, r);
  let y = K * (z * z - x * x) * fade;
  const base = -K * POOL_X * POOL_X * (1 - sstep(11, 17, POOL_X));
  for (const s of [-1, 1]) {
    const d = Math.hypot(x - s * POOL_X, z), w = 1 - sstep(POOL_R, POOL_R + 1.1, d);
    y += (base - y) * w;
    if (d < POOL_R) y -= BOWL * (1 - (d / POOL_R) ** 2);
  }
  return y;
}
export const POOL_RIM_Y = -K * POOL_X * POOL_X * (1 - sstep(11, 17, POOL_X)); // rim height (water sits 0.06 below)

// one cue-or-clock ramp: the direction layer's beat when it exists, else the bible time window. 0..1.
export function ramp(cue, name, t0, t1) {
  if (cue.beat && cue.beat(name)) return Math.min(1, Math.max(0, cue.k(name)));
  return Math.min(1, Math.max(0, (cue.t - t0) / (t1 - t0)));
}
export const stepK = (v, n) => Math.floor(v * n + 1e-6) / n;

// shared animated uniforms: every world material reads the same objects
export function makeU() {
  return {
    uErase: { value: 0 },            // 0..1  plaster erasure (patches flake off to sinopia)
    uGild: { value: -1 },            // m     gild wipe ring radius; fragments inside it are repainted (-1 = off)
    uZero: { value: -1 },            // m     zero ring radius; fragments inside it are blank plaster (-1 = off)
    uOrg: { value: new Vector3(0, 0, 0) },
    uSun: { value: SUN.clone() },
  };
}

// GLSL prelude. MATHS:
//  frD(P) = |P.xz - org| + 0.25 P.y     the wipe distance (rings expand from the saddle; height lags a little)
//  erasure: f(P) = 0.62 fbm(P.xz 0.30 + 0.45 P.y + 3) + 0.38 fbm(P.xy 0.9 + P.zy 0.7);  thr = mix(0.05, 0.98, uErase)
//    erased where f < thr AND frD >= uGild (the gild wipe repaints inside its ring). Erased pigment becomes grey plaster
//    #8a7a8a (the world desaturates, only Diavolo and King Crimson keep colour) with 1px sinopia #b9573a sketch lines:
//    iso-contours of fbm, line where |fract(6 n) - 0.5| is within fwidth(6 n) of 0.5 (screen-constant width). A flake edge
//    band |f - thr| < 0.014 is inked deep sinopia.
//  gild ring: hard band |frD - uGild| < 0.45 m, gold #f2bd45 x 1.12 (the only part that may bloom).
//  zero: inside frD < uZero the surface is plaster #fbf6e8 with chalk mottle; edge band 0.5 m of sinopia.
//  apricot haze: c = mix(c, #e8a060, smoothstep(140, 520, dist) 0.8)   never white.
export const PRELUDE = /* glsl */ `
  uniform float uErase; uniform float uGild; uniform float uZero; uniform vec3 uOrg; uniform vec3 uSun;
  float frD(vec3 P) { return length(P.xz - uOrg.xz) + 0.25 * P.y; }
  float frField(vec3 P) { return 0.62 * fbm(P.xz * 0.30 + P.y * 0.45 + 3.0) + 0.38 * fbm(P.xy * 0.9 + P.zy * 0.7); }
  vec3 fresco(vec3 c, vec3 P) {
    float d = frD(P);
    if (uErase > 0.001) {
      float f = frField(P), thr = mix(0.05, 0.98, uErase);
      float er = (1.0 - step(thr, f)) * step(uGild, d);            // inside the gild ring the paint is back
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 grey = mix(${hex(C.greyPlaster)}, vec3(lum) * 0.9, 0.35);
      float n6 = fbm(P.xz * 1.4 + P.y * 1.1 + 7.0) * 6.0;
      float g = abs(fract(n6) - 0.5), w = fwidth(n6) * 1.0 + 1e-4;
      float line = smoothstep(0.5 - w * 1.5, 0.5 - w * 0.5, g);    // g is 0.5 at the contour
      vec3 sketch = mix(grey, ${hex(C.sinopia)}, clamp(line, 0.0, 1.0));
      float rim = (1.0 - smoothstep(0.0, 0.014, abs(f - thr))) * step(uErase, 0.999);
      sketch = mix(sketch, ${mixHex(C.sinopia, "#2a1a24", 0.45)}, rim * 0.85);
      c = mix(c, sketch, er);
    }
    if (uGild > 0.0) c = mix(c, ${hex(C.gold)} * 1.12, step(abs(d - uGild), 0.45) * 0.92);
    if (uZero > 0.0) {
      float inside = 1.0 - step(uZero, d);
      vec3 pl = ${hex(C.plaster)} * (0.97 + 0.05 * fbm(P.xz * 3.0 + P.y));
      c = mix(c, pl, inside);
      c = mix(c, ${hex(C.sinopia)}, step(abs(d - uZero), 0.5) * 0.75);
    }
    return c;
  }
  vec3 apricot(vec3 c, vec3 P) { float dist = length(cameraPosition - P); return mix(c, ${hex(C.apricot)}, smoothstep(140.0, 520.0, dist) * 0.8); }
  // 1 px AA line around d = 0 (d in metres or any smooth field); px = line width in screen pixels
  float aaLine(float d, float px) { float f = fwidth(d) + 1e-6; return 1.0 - smoothstep(f * px * 0.5, f * (px * 0.5 + 0.8), abs(d)); }
  // THE STONE (JoJo Part 5 cel in fresco): three hard tones from the key light, a 6-step value micro-posterise, travertine
  // pitting (cell noise, 0.15 contrast), craquelure (cell borders, 20 percent #7a2290), a sun-side 1px rim, and 45 degree
  // hatch (6 px pitch, 1 px wide at 720 p) only on the shadow face.
  //   lam = N.L/2 + 1/2 + 0.22 (fbm - 0.5) - 0.18 pit - 0.3 (1 - ao);  tone = mid at 0.34, lit at 0.62 (AA by fwidth)
  //   hatch coordinate  h = (x + y) / (6 px sqrt2), line where min(fract h, 1 - fract h) < 0.5/6
  vec3 stoneCel(vec3 P, vec3 N, vec3 V, float ao, vec3 sh, vec3 mi, vec3 li, float hatchAmt) {
    vec3 L = normalize(uLightDir);
    float pit = vor(P.xz * 3.1 + P.y * 2.3).x, m = fbm(P.xz * 1.7 + P.yy * 1.3);
    float lam = dot(N, L) * 0.5 + 0.5 + (m - 0.5) * 0.22 - 0.18 * pit - 0.3 * (1.0 - ao);
    float w = fwidth(lam) * 0.8 + 1e-4;
    vec3 c = mix(sh, mi, smoothstep(0.34 - w, 0.34 + w, lam));
    c = mix(c, li, smoothstep(0.62 - w, 0.62 + w, lam));
    c *= 0.93 + 0.14 * floor(lam * 6.0) / 6.0;
    float shMask = 1.0 - smoothstep(0.34 - w, 0.34 + w, lam);
    float px = max(uRes.y / 720.0, 1.0), h = (gl_FragCoord.x + gl_FragCoord.y) / (6.0 * px * 1.4142);
    float g = min(fract(h), 1.0 - fract(h));
    float hatch = 1.0 - smoothstep(0.5 / 6.0 * 0.5, 0.5 / 6.0 * 0.5 + 0.05, g);
    c = mix(c, ${hex(C.deep)}, hatch * shMask * hatchAmt * 0.6);
    vec2 v = vor(P.xz * 2.2 + P.y * 1.7);
    c = mix(c, ${hex(C.craq)}, (1.0 - smoothstep(0.0, fwidth(v.y) * 0.8 + 1e-4, v.y)) * 0.2);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5) * smoothstep(0.1, 0.4, dot(N, uSun));
    c = mix(c, ${hex(C.rimGold)}, (step(0.42, rim) - step(0.55, rim)) * 0.9);
    return c;
  }
`;
