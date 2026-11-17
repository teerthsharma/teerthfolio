// p-tangle's live clock, dock and lens, copied from the site at 460bafd (moves/p-tangle.jsx, cards/p-tangle.js); real seconds unless marked scene.
// LENS, FOV, WASH and SFX are measured by lib/anime/tools/cuts/p-tangle/livecam.mjs.
const unit = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / l);
};
const lerp = (a, b, t) => a + (b - a) * t;
export const KNOTS = [[0, 0], [3, 3], [8.6, 6.9], [11, 8.4], [15.2, 10.3], [16.4, 11.3], [22.4, 15.3], [27.8, 18.6], [28.6, 19.4]];
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function warp(r) {
  if (r <= 0) return r;
  for (let i = 1; i < KNOTS.length; i++) if (r <= KNOTS[i][0]) return lerp(KNOTS[i - 1][1], KNOTS[i][1], (r - KNOTS[i - 1][0]) / (KNOTS[i][0] - KNOTS[i - 1][0]));
  const k = KNOTS[KNOTS.length - 1];
  return k[1] + (r - k[0]);
}
export function unwarp(t) {
  if (t <= 0) return t;
  for (let i = 1; i < KNOTS.length; i++) if (t <= KNOTS[i][1]) return lerp(KNOTS[i - 1][0], KNOTS[i][0], (t - KNOTS[i - 1][1]) / (KNOTS[i][1] - KNOTS[i - 1][1]));
  const k = KNOTS[KNOTS.length - 1];
  return k[0] + (t - k[1]);
}
export const T = {
  wrap: [1.25, 1.8], draw: [1.7, 3.7], girl: [2.0, 3.3], loopIn: [4.6, 5.8], travel: [6.2, 7.9], link: 7.9, split: 8.4,
  fall: [8.75, 9.7], impact: 9.7, pull: [9.72, 10.2], knot: 10.3, dusk: [11.3, 17.0], girlOut: [13.4, 14.8], burst3: 14.0,
  comet: [12.0, 15.0], retract: [15.2, 16.4], loopsOut: [15.2, 16.0], dis: [16.0, 18.4], title: [15.5, 18.5],
};
export const LINE = {
  sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, A: 3.0, move: [7.7, 8.6], B: 8.6, C: 16.4,
  credit: 22.4, collapse: [27.8, 28.4], length: 28.6, radius: 36,
};
export const DOCK = [-72, 0, 9.6];
export const TURN = 0.4883339510;
export const SEAL = { yaw: Math.PI - TURN, scale: 1.8 }; // site heading pi (livecam diag) in the rig frame
export const REST = { CL: [1.7, 1.6, -2.7], PA: unit([0.93, 0.12, -0.35]) };
export const GIRL_AT = [4.6, -27];
export const TAIL_A = [4.6, 4.2, -27];
export const HIT = { link: 245 / 24, impact: 333 / 24, knot: 365 / 24 };
export const BACK = 537 / 24;
export const LENS = {
  isl: [[-8.7303, 13.9824, 16.4158], [0.4141, -0.47, -0.7795], 43.262],
  wide: [[-5.9559, 3.41, 10.9735], [0.4642, -0.1447, -0.8738], 56],
  a: [[2.3085, 2, -11.4273], [-0.1791, -0.1032, 0.9784], 46],
  b1: [[-6.8733, 2.5, -8.7116], [0.6784, -0.1492, 0.7193], 46],
  b2: [[-6.8733, 2.5, -8.7116], [0.6784, -0.1492, 0.7193], 46],
  b3: [[-6.8733, 2.5, -8.7116], [0.6784, -0.1492, 0.7193], 46],
  b4: [[-6.8733, 2.5, -8.7116], [0.6784, -0.1492, 0.7193], 46],
  home: [[-9.5935, 16.7976, 18.0584], [0.4069, -0.4979, -0.7659], 28],
};
export const FOV = 46;
export const WASH = [21.8, 22.4, 22.8];
export const SFX = [1.362, 2.565];
export const DOLLY = { a: 0.62, b1: 0.62, b2: 0.62, b3: 0.62, b4: 0.62 };
export const HOLD = { t: [163 / 12, 183 / 12], az: 0.6, r: 2.6, up: 0.95, aim: [-0.1, 1.15, 0], fov: 44, yaw: 0.6 };
