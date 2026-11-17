// p-separatrix clock: the live story's scene seconds (T) and the real seconds the paced clock plays them at.
// Event times come from TR and R, never typed in scene seconds; g24 snaps every mark to the 1/24 s grid.
import { beatT, realAt } from "../../../world/cutscene/clock.js";

export const ID = "p-separatrix";
export const DURATION = 28.8;
export const R = (s) => realAt(ID, s);
export const warp = (t) => beatT(ID, t);
export const g24 = (t) => Math.round(t * 24) / 24;

export const T = {
  costume: [0.5, 1.0],
  flowIn: 1.7,
  kc: [3.0, 3.7],
  erase: [3.7, 5.3],
  jump: 4.05,
  flick: 4.2,
  arrow: [5.15, 5.8],
  pierce: 5.8,
  rise: [6.05, 6.7],
  don: 6.2,
  wipe: [6.45, 7.7],
  turn: [6.7, 7.2],
  step: [7.4, 8.0],
  rewind: 8.0,
  barrage: [10.35, 11.85],
  lastBlow: 11.85,
  loop: 12.1,
  lineC: 12.3,
  gogogo: 12.0,
  pups: 12.3,
  tbc: [14.7, 15.4],
  zero: [15.2, 16.4],
  island: 16.45,
};

const mapT = (f, v) => (Array.isArray(v) ? v.map(f) : f(v));
export const TR = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, mapT((x) => g24(R(x)), v)]));

export const TURN = 45 / 24;
export const BACK = 526 / 24;
export const HOLD1 = [g24(7.2), g24(9.5)];
export const HOLD2 = [g24(14.81), g24(16.33)];
export const LINE = {
  A: g24(R(3.0)),
  B: g24(R(6.4)),
  C: g24(R(12.3)),
  credit: g24(R(15.4)),
  collapse: [g24(R(16.6)), g24(R(17.0))],
};
export const F12 = (t) => Math.floor(warp(t) * 12 + 1e-6);
export const DOCK = [-75, 0, 45.6];
export const SEAL = { yaw: 0, scale: 1.6, face: 2.71 };
export const ROLL = 0.06;
export const RADIUS = 428;
export const PT = {
  dv: [5.2, 0, -11.4],
  kc: [6.5, 0, -14.5],
  ger: [2.2, 0, -1.9],
  gerStand: [3.1, 0, -3.4],
  saddle: [2.4, 0, -6],
  slit: [-1.4, 1.75, 0.9],
};
