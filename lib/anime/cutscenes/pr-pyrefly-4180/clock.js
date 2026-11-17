// The live cutscene's clock: the move's play clock T (components/world/cutscene/moves/pr-pyrefly-4180.jsx lines 62 to 85), joined to real seconds by ANCH.
export const T = {
  rise: [1.45, 2.7],
  roarA: [2.3, 2.6, 3.2, 3.7],
  orb: [3.4, 5.1, 5.15, 5.5],
  throw: [2.8, 3.1],
  grow: [7.0, 8.9],
  taut: [8.9, 9.4],
  lurch: [8.85, 9.05, 9.3, 9.8],
  roarB: [8.8, 9.1, 10.2, 10.8],
  bolt: [9.05, 9.4],
  surge: [9.4, 10.9],
  burst: 10.9,
  slam: [10.9, 11.25, 13.8, 14.3],
  rose: [11.15, 11.85],
  pin: [13.1, 13.45],
  clack: [13.45, 13.75],
  cheer: 13.6,
  hop: [5.5, 6.4, 7.3, 8.95],
  K: [13.4, 18.6],
  plaque: 15.6,
  fold: 16.9,
  reveal: 17.3,
};
export const ANCH = [[0, 0], [2.3, 2.3], [5.5, 7.9], [10.5, 14.3], [15.5, 22.8], [16.9, 26.0], [17.3, 26.8], [19.4, 28.4]];
const through = (x, a, b) => {
  for (let i = 1; i < ANCH.length; i++) if (x <= ANCH[i][a]) return ANCH[i - 1][b] + ((x - ANCH[i - 1][a]) * (ANCH[i][b] - ANCH[i - 1][b])) / (ANCH[i][a] - ANCH[i - 1][a]);
  const e = ANCH.at(-1);
  return x - e[a] + e[b];
};
export const remap = (tr) => through(tr, 1, 0);
export const unmap = (t) => through(t, 0, 1);
export const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
export const onTwos = (t) => Math.floor(t * 12) / 12;
export const G = (k) => k / 12;
export const F = (k) => k / 24;
export const N = 208;
export const DOOR = 100;
export const HOOP_AT = T.grow[0] + (T.grow[1] - T.grow[0]) * (DOOR / (N - 1));
export const REAL = Object.fromEntries(
  Object.entries(T).filter(([k]) => k !== "K").map(([k, v]) => [k, Array.isArray(v) ? v.map(unmap) : unmap(v)]),
);
export const K = [13.4, 18.6];
export const LINE = { A: 2.3, B: 7.9, C: 14.3, credit: 22.8, impact: 1.15, dock: 1.75, collapse: [27.6, 28.0] };
export const ENTER = 1.95;
export const SIGN = [0.45, 1.05];
export const MOVE = [7.2, 7.9];
export const HIT = { hoop: 264 / 24, bolt: 309 / 24, burst: 360 / 24, pin: 464 / 24 };
export const FTG = [190, 217, 245].map(F);
export const BACK = 546 / 24;
export const DOCK = [74, 0, -20.4];
export const TURN = Math.atan2(79 - 74, -33 + 20.4) - Math.atan2(1.7, -3.2);
export const SHELL = { radius: 428, inside: 140, bloom: [1.15, 1.6], collapse: [27.6, 28.0] };
export const LEN = 28.4;
export const KUNAI = [[-3.6, 0, -0.8], [3.6, 0, -1.6], [0, 0, -3.0]];
export const FOX = [3.5, 0.75, -8.5];
// Medians of the live camera (livecam.mjs, 1,733 samples, verification/faithful/pr-pyrefly-4180/livecam.json). dock is the
// arrival pose (pre window, 4 samples, still diving: spread 4.13 m); site is the docked camera after the collapse (spread 0).
export const FOV = 56;
export const FOV_SITE = 28;
export const LENS = {
  dock: [[-2.532, 15.204, 22.739], [0.1, -0.43, -0.897]],
  a: [[5.56, 0.58, 4.71], [-0.7, 0, -0.71]],
  b: [[-4.96, 0.98, 6.37], [0.59, -0.04, -0.8]],
  c: [[-4.58, 0.92, 5.76], [0.59, -0.04, -0.8]],
  d: [[-4.67, 0.93, 5.87], [0.59, -0.04, -0.8]],
  home: [[-4.38, 0.91, 5.66], [0.59, -0.04, -0.8]],
  site: [[-2.957, 20.334, 26.638], [0.098, -0.453, -0.886]],
};
