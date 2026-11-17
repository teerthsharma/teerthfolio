// The dimension's clock, beats and lens. Times are the live site's (scene s = real s, length 17.4); the camera and TURN are measured (livecam.json).
export const DUR = 17.4;
export const FPS = 12;
export const K = 0.74;
export const PUP = 1.7;
export const FOV = 56;
export const FREEZE = [5, 7.2];
export const DOCK = [4, 0, -19.4];
export const TURN = -5.34027;
export const PSI = 0.35863;
export const FRAME = TURN + PSI;
const TAU = Math.PI * 2;
const HEADING = Math.PI;
const WY = -0.4; // the water level

export const g = (x) => Math.ceil(x * FPS - 1e-6) / FPS;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export const T = {
  glyph: g(1.5), rise: [g(1.9), g(2.9)], bloom: [1.15, 1.6], sign: [0.45, 1.05], rival: g(2.4), lineA: 3,
  barrage: [g(3.5), g(5)], crack: [g(3.9), g(4.9)], stop: 5, resume: g(7.2), fall: g(7.2), drown: g(7.85),
  tick: 8, tear: [g(8.15), g(8.95)], flex: g(8.5), lineB: g(8.2), credit: 13, collapse: [16.6, 17],
};
export const HIT = {
  bloom: 14 / 12, rival: 29 / 12, barrage: [45 / 12, 50 / 12, 54 / 12, 58 / 12], crack: 51 / 12, stop: 5,
  tock: 68 / 12, resume: 87 / 12, drown: 95 / 12, tick: 8, swap: 98 / 12,
};
export const LINE = { A: T.lineA, B: g(8.2), credit: 13, impact: g(1.15), collapse: [16.6, 17] };
export const SWAP = g(8.15);

export const BEATS = [[0, 0], [g(1.9), 1], [g(2.6), 2], [g(3.4), 3], [g(3.9), 2], [g(4.4), 1], [g(4.8), 3], [5, 0], [g(7.2), 2], [g(7.55), 3], [g(7.8), 1]];
export const ROLL = [[0, 0], [g(1.9), -0.12], [g(2.4), 0.2], [g(3.5), -0.2], [g(3.9), 0.2], [g(4.4), -0.2], [g(4.8), 0.2], [5, -0.22], [g(7.2), 0.2], [g(7.62), -0.2], [g(8.2), 0.1], [8.5, 0]];
export const PANELS = [[g(2.4), 0.64, 0.58], [g(3.5), 0.4, 0.66], [g(7.2), 0.7, 0.55], [g(7.62), 0.5, 0.6]];

const GZ = -8.6;
const STAND_AT = [-0.3, 0, -5.2];
const TOWER = { x: 3.9, z: -13.5, top: 5.2 };
const CLOCK = { x: -3.2, y: 17.5, z: -46 };
export const P = {
  coral: [0, 7.75 * K, (GZ + 1.1) * K],
  standBase: [STAND_AT[0] * K, 0, STAND_AT[2] * K],
  tower: [TOWER.x * K, TOWER.top * K, TOWER.z * K],
  clock: [CLOCK.x * K, CLOCK.y * K, CLOCK.z * K],
  drown: [0, WY * K, (GZ + 1.1) * K],
};

const [cF, sF] = [Math.cos(FRAME), Math.sin(FRAME)];
export const W = ([x, y, z]) => [DOCK[0] + cF * x + sF * z, y, DOCK[2] - sF * x + cF * z];

export const SEAL = { yaw: (((HEADING - FRAME) % TAU) + TAU) % TAU, scale: PUP };
// the island is in world axes: its lens is the live rig pre-image under W = Ry(FRAME), so W(island(e)) = DOCK + Ry(TURN) e (the live world camera)
const ryp = (a, [x, y, z]) => [Math.cos(a) * x + Math.sin(a) * z, y, -Math.sin(a) * x + Math.cos(a) * z];
const island = ([e, f, fov]) => [ryp(-PSI, e), ryp(-PSI, f), fov];
export const Y = (r) => r + FRAME;
// start values for the shot azimuths; the pup's own yaws are PUP_YAW in cast/pup.js
export const PUP0 = { yaw: HEADING, open: 0.3, end: -0.1 };
// lenses [eye, forward, fov]; island { a: 0.05 s, b: 1.1 s } from livecam.json series
export const LENS = {
  isl: { a: island([[-16.6408, 18.0686, 12.0644], [0.7088, -0.4825, -0.5145], 29.471]), b: island([[-14.1703, 1.4176, 10.4032], [0.7977, -0.1698, -0.5787], 40.961]) },
  isl2: island([[4.4208, 2.3866, 13.9523], [-0.2662, -0.032, -0.9634], 56]),
  credit: island([[4.4091, 1.9125, 14.1523], [-0.2662, -0.032, -0.9634], 56]),
  dim: [[-4.1643, 1.7082, 10.9621], [0.351, 0, -0.9364], 56],
  dimStop: [[-4.3253, 1.7576, 11.477], [0.351, 0, -0.9364], 56],
  dimResume: [[-4.5014, 1.7849, 11.8582], [0.351, 0, -0.9364], 56],
};
export const lensAt = (name, k = 0) => {
  const L = LENS[name];
  if (!L.a) return L;
  const mix = (u, v) => u.map((x, i) => x + (v[i] - x) * k);
  return [mix(L.a[0], L.b[0]), mix(L.a[1], L.b[1]), L.a[2] + (L.b[2] - L.a[2]) * k];
};
export const WALK = { from: [0, 0], t: [0, 0] };
export const HOLD = [64 / 12, 83 / 12];
export const MINUTE = (tt) => (tt < 8 ? -0.105 : 0);
export const NEG = [HIT.rival, ...HIT.barrage, HIT.crack, HIT.resume, HIT.drown, HIT.tick];
export const negAt = (t) => NEG.some((h) => t >= h - 1e-6 && t < h + 1 / 24 - 1e-6);

export const TEXT = {
  A: "Oh? You're approaching me?",
  Ab: ["approaching me"],
  B: "Four edges. Three remain. +362/-26 across 4 files.",
  Bb: ["Four edges", "Three remain"],
  title: "tensorflow/tensorflow #124410 · 4 edges to 3",
  sub: "Four control edges emitted where the unique transitive reduction is three.",
  ret: "The world resumes: the seal steps out of the stopped second.",
  sticker: "MUDA",
};

const last = (list, tt) => {
  let k = 0;
  for (let i = 0; i < list.length; i++) if (tt >= list[i][0]) k = i;
  return k;
};
export const shiftAt = (tt) => last(BEATS, tt);
export const palAt = (tt) => BEATS[shiftAt(tt)][1];
export const rollDeg = (tt) => ROLL[last(ROLL, tt)][1] * 57.2958;
export const worldT = (tt) => (tt < FREEZE[0] ? tt : tt < FREEZE[1] ? FREEZE[0] : tt - 2.2);
export const tearK = (tt) => clamp01((tt - T.tear[0]) / (T.tear[1] - T.tear[0]));
export const tearU = (tt) => -0.12 + 1.75 * tearK(tt);     // what world/index.js writes to U.uTear
export const TEAR_DIR = [0.8, 0.6];                          // = live/ink.js uTearDir
export const STICKER = [0.75, 1.9];                          // MUDA sticker window, s
export const VEIL = [0.6, 0.25];                             // the cream flash on 24 fps drawings: 0.6, 0.25, gone (never above 0.6)
// ゴゴゴゴ: birth window, side reach in rig metres, scale of K. A pixel with q = 0.62 crosses the tear at 8.519 s (ticket 14 aims there).
export const GLYPH = { born: [1.2, 1.5], reach: [1.1, 2.7], scale: 0.55 };
export const barrAt = (tt) => smooth(3.5, 3.6, tt) * (1 - smooth(4.95, 5.0, tt));

export function panelAt(tt) {
  for (const [t, x, y] of PANELS) {
    const d = tt - t;
    if (d >= 0 && d < 0.34) return [x, y, 0.2 + 0.08 * Math.floor(d * FPS), d < 0.17 ? 1 : 0.7];
  }
  return null;
}
