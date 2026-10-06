// p-tangle WORLD: the kataware-doki sky, as four painted stages and the shared GLSL that lake, hills and mist read.
// Source: scripts/p-tangle.md 3.1 (ramp pinned to the sampled film values), 3.2 (cloud sea + far ranges), stars, flecks.
//
// MATHS (all in the dome's own coordinates: az = atan(x, -z), so az 0 is the sun side, -z; el = asin(y)):
//   ramp(el)   six stops at el = 0, .04, .12, .26, .55, 1.1 rad, chained smoothstep mixes:  c_{i+1} = mix(c_i, C[i+1], S(e_i, e_{i+1}, el))
//   glow(az,el) d = (az cos el, el - sunEl); r2 = d.d;  g = .55 exp(-r2/.05) + .18 exp(-r2/.6)         (warm bloom, wide skirt)
//   streak     exp(-38|d.y|) exp(-1.8|d.x|) * K   the poster's long pink anamorphic streak, horizontal
//   brush      el' = el + .012 (fbm(22 az, 60 el) - .5)   dab banding so the ramp is painted, not a clean gradient
//   flecks     rows near the horizon: m = fbm(.9 q.x, 2.6 q.y), q = (10 az, 34 el) warped; mask = S(.55,.66,m) S(0,.025,el) (1 - S(.1,.28,el))
//   stars      cell grid 140/rad, one star per cell with probability .009 uStar, 1 px, hidden low and by flecks
//   ranges     rg(az) = .010 + .028 ridged(6 az): el < rg is a pale violet silhouette, hazier at its base
//   cloud sea  below the horizon, k = -el, plane distance D = 1/k, plane coords pp = (.8 az D, .9 D); puff = S(.42,.62, .7 fbm(1.6 pp) + .3 fbm(3.7 pp));
//              lit by the fbm gradient toward the sun; fades into the horizon cream as k -> 0
import { Color, Vector3 } from "three";
import { V } from "../../../paint.js";

const c3 = (h) => { const c = new Color(h); return new Vector3(c.r, c.g, c.b); };

// STAGE 0 kataware-doki (shots 1-3) | 1 comet night (shot 4) | 2 rose sunset (shots 5-6) | 3 deep blue (shots 7-10)
// ramp: horizon, peach, pink, violet, high, zenith.  Hex marked (S) in the bible are the film's sampled values.
export const STAGES = [
  {
    ramp: ["#fbe1cc", "#f5d4cf", "#c389b8", "#5f61ab", "#3c5a9b", "#274974"], sunEl: 0.014, glow: 1.0, disc: 1.0, streak: 0.55, star: 0.35,
    sunCol: "#ffd6a0", streakCol: "#f0a0d0", fleck: "#d89ac0", seaLit: "#eab2bc", seaShade: "#b87ba8", range: "#8c80c0",
    shade: "#5a4a88", key: "#ffa070", rim: "#d56a6a", sil: "#3a2537", silK: 0.85, haze: "#7f77bb", hazeD: 150,
    deep: "#08203e", shallow: "#1a4a6c", bounce: "#ff9a80", glare: "#fdfcff", glareK: 0.8, hill: "#5f7890", shaft: 0.14, lant: 0.55, town: 0.9, mist: "#f0b8c8", mistK: 0.16,
  },
  {
    ramp: ["#46528c", "#3a4478", "#2b3a6a", "#22335a", "#1d3050", "#192b3e"], sunEl: -0.06, glow: 0.25, disc: 0.0, streak: 0.0, star: 1.0,
    sunCol: "#6a78d8", streakCol: "#6a78d8", fleck: "#3a4a80", seaLit: "#5a5c9a", seaShade: "#2e3566", range: "#2a3366",
    shade: "#2a3466", key: "#6a78d8", rim: "#8a9ae0", sil: "#141a34", silK: 0.9, haze: "#2a3a6a", hazeD: 140,
    deep: "#050f26", shallow: "#10305a", bounce: "#4a6ad0", glare: "#9bb8f0", glareK: 0.3, hill: "#1a2448", shaft: 0.0, lant: 1.0, town: 1.35, mist: "#4a5a9a", mistK: 0.1,
  },
  {
    ramp: ["#ffc08a", "#ff9a8a", "#e0607a", "#9a4a9a", "#4a4a9a", "#1e2c78"], sunEl: 0.0, glow: 1.0, disc: 0.8, streak: 0.35, star: 0.5,
    sunCol: "#ffb070", streakCol: "#f08aa8", fleck: "#e08ab0", seaLit: "#ff9aa0", seaShade: "#b0508a", range: "#7a4a8a",
    shade: "#7a4a88", key: "#ff8060", rim: "#ffb070", sil: "#3a1a34", silK: 0.85, haze: "#9a5a9a", hazeD: 150,
    deep: "#1a1450", shallow: "#6a2a6a", bounce: "#ff7a8a", glare: "#ffd6a0", glareK: 0.75, hill: "#5a3a6a", shaft: 0.1, lant: 0.9, town: 1.2, mist: "#e08aa0", mistK: 0.14,
  },
  {
    ramp: ["#3a3a8a", "#2a3380", "#1e2c78", "#141e5c", "#0f1850", "#0c1448"], sunEl: -0.12, glow: 0.18, disc: 0.0, streak: 0.0, star: 1.0,
    sunCol: "#4a5ac0", streakCol: "#4a5ac0", fleck: "#2a3a88", seaLit: "#3a4a9a", seaShade: "#1a2268", range: "#1a2060",
    shade: "#1e2868", key: "#4a5ac0", rim: "#ffd6a0", sil: "#0c1030", silK: 0.92, haze: "#1e2c78", hazeD: 140,
    deep: "#040a28", shallow: "#0e2058", bounce: "#3a4ac0", glare: "#7a8ad0", glareK: 0.22, hill: "#101a48", shaft: 0.0, lant: 1.3, town: 1.6, mist: "#3a4a9a", mistK: 0.08,
  },
];

// live uniforms shared by every world material (one object, so a stage change updates them all)
export function makeUniforms() {
  return {
    uC: { value: Array.from({ length: 6 }, () => new Vector3()) },
    uSunEl: { value: 0.0 }, uGlow: { value: 1 }, uStar: { value: 0.3 }, uDisc: { value: 1 }, uStreakK: { value: 0.5 },
    uSunCol: { value: new Vector3() }, uStreak: { value: new Vector3() }, uFleck: { value: new Vector3() },
    uSeaLit: { value: new Vector3() }, uSeaShade: { value: new Vector3() }, uRange: { value: new Vector3() },
    uSunDir: { value: new Vector3(0, 0.35, -1).normalize() }, uShade: { value: new Vector3() }, uKey: { value: new Vector3() },
    uRim: { value: new Vector3() }, uSil: { value: new Vector3() }, uSilK: { value: 0.8 }, uHaze: { value: new Vector3() }, uHazeD: { value: 150 },
    uDeep: { value: new Vector3() }, uShallow: { value: new Vector3() }, uBounce: { value: new Vector3() }, uGlareCol: { value: new Vector3() },
    uGlareK: { value: 0.8 }, uHill: { value: new Vector3() }, uShaft: { value: 0.1 }, uShaftCol: { value: c3("#c46a3a") },
    uLant: { value: 0.5 }, uTown: { value: 1 }, uMistCol: { value: new Vector3() }, uMistK: { value: 0.1 }, uTime: { value: 0 },
  };
}

export function applyStage(U, n) {
  const S = STAGES[n];
  S.ramp.forEach((h, i) => U.uC.value[i].copy(c3(h)));
  U.uSunEl.value = S.sunEl; U.uGlow.value = S.glow; U.uStar.value = S.star; U.uDisc.value = S.disc; U.uStreakK.value = S.streak;
  U.uSunCol.value.copy(c3(S.sunCol)); U.uStreak.value.copy(c3(S.streakCol)); U.uFleck.value.copy(c3(S.fleck));
  U.uSeaLit.value.copy(c3(S.seaLit)); U.uSeaShade.value.copy(c3(S.seaShade)); U.uRange.value.copy(c3(S.range));
  U.uShade.value.copy(c3(S.shade)); U.uKey.value.copy(c3(S.key)); U.uRim.value.copy(c3(S.rim)); U.uSil.value.copy(c3(S.sil)); U.uSilK.value = S.silK;
  U.uHaze.value.copy(c3(S.haze)); U.uHazeD.value = S.hazeD; U.uDeep.value.copy(c3(S.deep)); U.uShallow.value.copy(c3(S.shallow));
  U.uBounce.value.copy(c3(S.bounce)); U.uGlareCol.value.copy(c3(S.glare)); U.uGlareK.value = S.glareK; U.uHill.value.copy(c3(S.hill));
  U.uShaft.value = S.shaft; U.uLant.value = S.lant; U.uTown.value = S.town; U.uMistCol.value.copy(c3(S.mist)); U.uMistK.value = S.mistK;
}

// uniforms for one baked dome of stage n (fresh objects: the bake reads them once). Same shader source for all four, so one program.
export function domeUniforms(n) {
  const U = makeUniforms(); applyStage(U, n);
  return U;
}

// GLSL shared by the dome bake and the lake: declarations + ramp + glow. Needs the noise tool above it.
export const SKY_DECL = /* glsl */ `
uniform vec3 uC[6]; uniform float uSunEl, uGlow, uStar, uDisc, uStreakK;
uniform vec3 uSunCol, uStreak, uFleck, uSeaLit, uSeaShade, uRange;
vec3 rampSky(float el) {
  float e = max(el, 0.0);
  vec3 c = uC[0];
  c = mix(c, uC[1], smoothstep(0.0, 0.04, e));
  c = mix(c, uC[2], smoothstep(0.04, 0.12, e));
  c = mix(c, uC[3], smoothstep(0.12, 0.26, e));
  c = mix(c, uC[4], smoothstep(0.26, 0.55, e));
  c = mix(c, uC[5], smoothstep(0.55, 1.1, e));
  return c;
}
vec3 sunGlow(float az, float el) {
  vec2 d = vec2(az * cos(clamp(el, -1.2, 1.2)), el - uSunEl);
  float r2 = dot(d, d);
  float g = 0.55 * exp(-r2 / 0.05) + 0.18 * exp(-r2 / 0.6);
  float streak = exp(-abs(d.y) * 38.0) * exp(-abs(d.x) * 1.8) * uStreakK;
  return uSunCol * g * uGlow + uStreak * streak;
}`;

export const SKY_BODY = /* glsl */ `
vec3 seaPlane(float az, float el) {
  float k = -el;
  float D = 1.0 / max(k, 0.004);
  vec2 pp = vec2(az * D * 0.8, D * 0.9);
  float cl = fbm(pp * 1.6 + vec2(0.0, 3.0));
  float cl2 = fbm(pp * 3.7 + 11.0);
  float puff = smoothstep(0.42, 0.62, cl * 0.7 + cl2 * 0.3);
  float gr = fbm(pp * 1.6 + vec2(0.0, 3.2)) - cl;                 // gradient toward the sun side (far = -z)
  float lit = clamp(0.5 + gr * 6.0 + exp(-az * az * 0.6) * 0.3, 0.0, 1.0);
  vec3 sc = mix(uSeaShade, uSeaLit, lit);
  vec3 gap = mix(rampSky(0.0) * 0.8 + uSeaShade * 0.2, uSeaShade, 0.6);
  vec3 sea = mix(gap, sc, puff);
  float fade = smoothstep(0.0, 0.035, k);
  vec3 hor = rampSky(0.0) + sunGlow(az, 0.0);
  return mix(hor, sea, fade) + sunGlow(az, -el) * 0.45;
}
vec3 sky(float az, float el) {
  float brush = fbm(vec2(az * 22.0, el * 60.0)) - 0.5;
  float e = el + brush * 0.012;
  vec3 c = rampSky(e) + sunGlow(az, e);
  // flecks: ragged rows of pink cloud near the horizon
  vec2 q = vec2(az * 10.0, el * 34.0); q.x += 0.6 * fbm(q * 0.7);
  float m = fbm(vec2(q.x * 0.9, q.y * 2.6));
  float mask = smoothstep(0.55, 0.66, m) * smoothstep(0.0, 0.025, el) * (1.0 - smoothstep(0.1, 0.28, el));
  mask *= 0.6 + 0.4 * strokes(vec2(az, el) * vec2(1.0, 3.0), 0.0, 0.06, 0.012);
  vec3 fc = mix(uFleck, uSunCol, exp(-az * az * 0.8) * 0.5);
  c = mix(c, fc, mask * 0.85);
  // sparse thin stars
  vec2 sp = vec2(az * 140.0, el * 140.0); vec2 id = floor(sp); vec2 f = fract(sp) - 0.5;
  float st = step(1.0 - 0.009 * uStar, h21(id + 3.3));
  float sd = length(f - (h22(id) - 0.5) * 0.5);
  float sm = (1.0 - smoothstep(0.06, 0.2 + 0.2 * h21(id + 9.0), sd)) * st;
  sm *= smoothstep(0.12, 0.45, el) * (1.0 - mask);
  c += vec3(0.78, 0.85, 1.0) * sm * 1.1;
  // the sun disc, small, pale, never blown (flare cross is the FX layer's)
  vec2 dd = vec2(az * cos(el), el - uSunEl);
  c += vec3(1.0, 0.95, 0.85) * (1.0 - smoothstep(0.009, 0.015, length(dd))) * uDisc * 1.6;
  // far ranges, pale violet, hazier at the base
  float rg = (0.010 + 0.028 * ridged(vec2(az * 6.0, 1.3))) * (0.25 + 0.75 * smoothstep(0.1, 0.9, abs(az)));
  float mR = (1.0 - smoothstep(rg - 0.003, rg, el)) * smoothstep(-0.001, 0.002, el);
  vec3 rc = mix(uRange, rampSky(0.0), 0.45 * (1.0 - clamp(el / max(rg, 1e-4), 0.0, 1.0)));
  c = mix(c, rc, mR);
  if (el <= 0.0) c = seaPlane(az, el);
  return max(c, vec3(0.0));
}`;

// helpers for the other files
export { V, c3 };
