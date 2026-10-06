// STAGE: the timeline, the uniforms and the vertex transform that bloom, flatten, fold and vanish the whole of Academy City.
// Every number here is a pure function of the stepped clock `t`, so a scrubbed frame equals a played one.
//
// MATHS (all in the vertex shader, see GLSL below)
//   bloom   s = smoothstep(clamp((front - |c|) / band, 0, 1)),  c = the object's own xz centre (aCen), so a tower rises RIGID.
//           y' = y * s * (1 + A sin(pi s))                      A = 0.10 overshoot: the "pop up" of a cel build
//           front(t) = R * ease3((t - t0) / 1.2), R = 240 m     (bible shot 1: the city blooms outward from the pup)
//   flatten y' = y * (1 - 0.988 f(t))                           the bible's "fold flattens p.y *= 0.012": a tall map becomes paper
//   fold    four hinges on the lines z = 0, -22, -50, -82. A leaf k is carried by the chain T_k, T_{k-1}, ..., T_1 where
//           T_j rotates (z,y) about (z = H_j, y = 0) by phi_j = -a_j:
//               dz = z - H_j;  z' = H_j + dz cos(phi) - y sin(phi);  y' = dz sin(phi) + y cos(phi)
//           a_j = (-1)^(j+1) * 0.985 pi * p_j(t): alternating signs make a ZIGZAG accordion (leaf 2 folds opposite).
//           p_j = smoothstep((u - 0.12 (4-j)/3) / 0.88), u = (t - t_fold) / dur: the far hinge leads, stagger 0.12 of the span.
//           Two frames of anticipation: a_j = max(4 deg, ...) over [t_fold - 2/24, t_fold).
//   vanish  p' = p * (1 - smoothstep(v)),  v = (t - t_v) / 0.29     the folded stack shrinks to nothing
//   blades  rotor angle  theta_i(t) = 2.2 / sqrt(scale_i) * Int_0^t m(u) du,
//           m = (1 + 2 sm(storm ramp) (1 - sm(storm end))) * (1 - 0.88 sm(wind seized)): x3 in the storm, x0.12 as the pup seizes the wind
import { Color, Vector2, Vector4 } from "three";

export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6))); return t * t * (3 - 2 * t); };
export const cl01 = (x) => Math.min(1, Math.max(0, x));
const ease3 = (t) => 1 - (1 - cl01(t)) ** 3;
export const HINGES = [0, -22, -50, -82];
// z ranges [lo, hi] of the fixed front and the four folding leaves
export const LEAVES = [[0.2, 420], [-21.8, -0.2], [-49.8, -22.2], [-81.8, -50.2], [-420, -82.2]];

// the beats the DIRECTION agent may name; any that is missing falls back to the bible's own times (24 fps frames / 24)
export function timeline(scene) {
  const bs = scene?.beats ?? [];
  const g = (n, t, d) => { const b = bs.find((x) => x.name === n); return { t: b?.t ?? t, dur: b?.dur ?? d }; };
  return {
    bloom: g("bloom", 0, 1.2), storm: g("storm", 2.0, 3.5), train: g("train", 3.58, 0), flip: g("flip", 4.17, 0.25),
    seize: g("seize", 5.8, 1.2), pop: g("pop", 10.33, 0.95), fold: g("fold", 10.42, 0.88), vanish: g("vanish", 11.29, 0.29),
  };
}

export function makeStageUniforms() {
  return {
    uBloom: { value: new Vector4(0, 14, 0.1, 0) },      // front radius m, band m, overshoot
    uFold: { value: new Vector4(0, 0, 0, 0) },          // flatten, vanish, -, crease amount
    uFoldA: { value: new Vector4() },                   // signed hinge angles, rad
    uHinge: { value: new Vector4(...HINGES) },
    uAng: { value: 0 }, uArc: { value: 0 }, uT: { value: 0 },
    uShadow: { value: new Vector4(0, 0, 1, 1) },        // contact shadow: centre xz, radii
    uShadowB: { value: new Vector4(1, 0, 0, 0) },       // cos / sin of the light azimuth
    uHaze: { value: new Color("#5a8ae0") }, uFogR: { value: new Vector2(140, 520) }, uId: { value: 0.62 },
  };
}

function turbineMult(u, T) {
  const st = T.storm.t, se = T.storm.t + T.storm.dur;
  const m = 1 + 2 * sm(st, st + 1.0, u) * (1 - sm(se - 0.3, se + 0.3, u));
  return m * (1 - 0.88 * sm(T.seize.t, T.seize.t + T.seize.dur, u));
}
export function turbineAngle(ts, T) { // numeric integral (1/48 s steps), pure in ts
  let a = 0; const h = 1 / 48;
  for (let u = 0; u < ts; u += h) a += turbineMult(u + h / 2, T) * Math.min(h, ts - u);
  return a * 2.2;
}

// all stage numbers at stepped time t
export function stageAt(t, T) {
  const b = T.bloom, f = T.fold, v = T.vanish, p = T.pop, st = T.storm;
  const front = t >= b.t ? 240 * ease3((t - b.t) / b.dur) : 0;
  const u = (t - f.t) / f.dur, A = Math.PI * 0.985;
  const antic = t >= f.t - 2 / 24 && t < f.t ? (4 * Math.PI) / 180 : 0;
  const ang = [1, 2, 3, 4].map((j) => {
    const start = (0.12 * (4 - j)) / 3, pj = sm(0, 1, (u - start) / 0.88);
    return (j % 2 ? 1 : -1) * Math.max(antic, A * pj);
  });
  const vanish = sm(v.t, v.t + v.dur, t);
  const ts8 = Math.floor(t * 8) / 8, m = turbineMult(ts8, T);
  const se = st.t + st.dur;
  return {
    front, flat: sm(f.t, f.t + 0.5 * f.dur, t), vanish, ang, crease: sm(f.t - 0.1, f.t + 0.05, t) * (1 - vanish),
    turbine: turbineAngle(ts8, T), arc: m > 2.9 && Math.floor(ts8 * 8) % 2 === 0 ? 1 : 0,
    storm: sm(st.t, st.t + 0.6, t) * (1 - sm(se, se + 0.7, t)),
    stormLive: t > st.t - 0.4 && t < se + 1.0, wave: t < p.t ? 0 : 3.6 * cl01((t - p.t) / p.dur),
    flip: Math.PI * (1 - sm(T.flip.t, T.flip.t + T.flip.dur, t)),
    ringOn: t >= b.t && t - b.t < b.dur + 0.25, folding: t >= f.t - 0.1,
    skylineK: sm(b.t + 0.5, b.t + 1.1, t) * (1 - vanish),
  };
}

export function applyStage(U, S, t) {
  U.uBloom.value.x = S.front;
  U.uFold.value.set(S.flat, S.vanish, 0, S.crease);
  U.uFoldA.value.set(...S.ang);
  U.uAng.value = S.turbine; U.uArc.value = S.arc; U.uT.value = t;
}

// ---- GLSL: attributes, uniforms and the stage transform shared by the surface and the ink hull ----
export const STAGE_V = /* glsl */ `
  attribute vec3 aCol; attribute vec3 aShade; attribute vec4 aKind; attribute vec4 aHub; attribute vec3 aCen; attribute vec3 aHN;
  uniform vec4 uBloom; uniform vec4 uFold; uniform vec4 uFoldA; uniform vec4 uHinge; uniform float uAng; uniform float uArc;
  vec3 foldOne(vec3 p, float H, float a) { float dz = p.z - H; float c = cos(a), s = -sin(a); return vec3(p.x, dz * s + p.y * c, H + dz * c - p.y * s); }
  // object position -> stage world position; vis = 0 when the object is not yet bloomed or has vanished
  vec3 placeW(vec3 p, out float vis) {
    vis = 1.0;
    if (aHub.w > 0.0) { float a = uAng * aHub.w; vec3 r = p - aHub.xyz; float c = cos(a), s = sin(a); p = aHub.xyz + vec3(r.x * c - r.y * s, r.x * s + r.y * c, r.z); }
    if (aKind.x > 10.5 && aKind.x < 11.5 && uArc < 0.5) p = aHub.xyz;       // the one-frame motion arc, hidden except at the storm peak
    vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
    if (aKind.x > 6.5 && aKind.x < 7.5) return wp;                          // the grass island is the pocket, not the stage
    float s0 = clamp((uBloom.x - length(aCen.xy)) / uBloom.y, 0.0, 1.0);
    if (s0 <= 0.0) vis = 0.0;
    float sb = s0 * s0 * (3.0 - 2.0 * s0);
    wp.y *= sb * (1.0 + uBloom.z * sin(3.14159 * sb)) * (1.0 - 0.988 * uFold.x);
    float z = wp.z;
    if (z <= uHinge.x) { if (z <= uHinge.y) { if (z <= uHinge.z) { if (z <= uHinge.w) wp = foldOne(wp, uHinge.w, uFoldA.w); wp = foldOne(wp, uHinge.z, uFoldA.z); } wp = foldOne(wp, uHinge.y, uFoldA.y); } wp = foldOne(wp, uHinge.x, uFoldA.x); }
    float v = uFold.y; wp *= 1.0 - v * v * (3.0 - 2.0 * v);
    if (v >= 0.999) vis = 0.0;
    return wp;
  }`;
