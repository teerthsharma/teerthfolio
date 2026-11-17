// The picture clock of this cutscene: scene seconds (the live's own timing) and the real seconds of every beat, read from the site's PACE.
import { beatT, realAt } from "../../../world/cutscene/clock.js";

export const ID = "p-topological-ml-toolkit";
export const warp = (t) => beatT(ID, t);
export const unwarp = (u) => realAt(ID, u);
export const F = (f) => f / 24;
export const G = (g) => g / 12;
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const on24 = (u) => Math.round(unwarp(u) * 24) / 24;
export const T = { costume: [0.55, 1.15], raise: [2.0, 2.3], rivalIn: [4.3, 4.65], rivalArm: [4.75, 4.95], charge: [4.8, 5.0], fire: 5.0, wind: [5.7, 9.7], orb: [5.8, 7.8], resolve: [7.95, 8.7], grid: 8.0, release: 9.45, pop: 10.35, fold: [10.4, 11.3], vanish: [11.3, 11.6], reveal: 10.4, bloom: [1.15, 1.6], collapse: [15.0, 15.4], radius: 40 };
export const ORB_AT = [0.2, 3.7, -1.0], ORB_R = 1.55, POP_AT = [0.3, 6.0, -1.0];
export const HIT = { bullets: [85, 88, 90, 93, 95].map(F), missiles: [89, 92, 94, 96, 98, 101].map(F), beams: [93, 96, 98, 101].map(F), train: F(100), ray: F(105), fall: F(108), release: F(257), pop: F(307), fold: F(310), vanish: F(385) };
export const LINE = { impact: G(28), sfx: [G(28) + 0.12, 3.25], A: [4.55, 8.9], B: [9.65, 15.45], C: [15.45, 23.25], credit: [23.25, 27.35], collapse: [27.35, 28.61], end: 29.85 };
export const BACK = F(372);
export const FLASH = { at: 23.1, width: 0.15, peak: 0.7 };
export const DOCK = [-40.5, 0, 69.6];
export const FOV = 46;
export const SEAL = { scale: 1.6, yaw: 1.2, yawLens: 0.25 };
export const LENS = {
  w1: [[-0.15, 4.2, 12.8], [0, -0.15, -0.99], 55.5],
  a: [[-2.65, 1.3, 5.85], [0.35, -0.05, -0.93], 46],
  b: [[3.17, 1.43, 5.68], [-0.42, -0.12, -0.90], 46],
  rise: [[3.15, 1.89, 5.63], [-0.42, -0.12, -0.90], 46],
  aerial: [[0, 16.8, 20.45], [0, -0.5, -0.87], 28],
};
