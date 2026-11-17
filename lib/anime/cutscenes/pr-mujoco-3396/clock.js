// The live clock of the deployed build (460bafd): pictures run on warp(t), balloons and the card on beatAt(s).
import { beatT, realAt } from "../../../world/cutscene/clock.js"; // the deployed build has no pocket: the picture runs on the beat clock

export const ID = "pr-mujoco-3396", DOCK = [-46, 0, -45.9], END = 29.35;
export const warp = (t) => beatT(ID, t);
export const beatAt = (s) => realAt(ID, s);
export const unwarp = beatAt;
export const CUT = 35 / 12; // 2.9167 s: the painting's cut and the transform, on the 12 grid, inside the impact flash
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export const T = {
  inside: 1.25, dock: 1.6, crack: [3.3, 4.3], tremble: [3.4, 4.0], split: [4.0, 4.5, 4.7], skin: 4.1, rise: [4.0, 6.0],
  beat0: 4.6, beat: 0.9, beatEnd: 15.6, crouch: [6.4, 6.75], bolt: [6.75, 7.05], swell: [6.85, 7.25], eat: [7.4, 10.3],
  shrink: [10.35, 10.85], gulls: 10.9, flip: [11.7, 12.35], raiseDn: [13.6, 14.0], fist: [14.0, 14.3], restore: [15.9, 16.6],
  burn: [16.3, 19.3], home: [18.4, 19.8], turnBack: 17.05, sea: [10.35, 11.5],
};
// beat is a step length, not a time
export const R = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, k === "beat" ? v : Array.isArray(v) ? v.map(unwarp) : unwarp(v)]));

export const LINE = { A: beatAt(3.2), B: beatAt(7.2), C: beatAt(10.8), credit: beatAt(16.2), collapse: [beatAt(19.2), beatAt(19.6)], creditEnd: beatAt(19.2) };
export const FLASH = [beatAt(1.15), beatAt(19.2)], FLASH_LEN = 0.167;
export const FOOT = Array.from({ length: 13 }, (_, n) => unwarp(T.beat0 + n * T.beat));

export const SEAL = { scale: 1.6, titan: 6, over: 0.12 };
export const pupScale = (s) => {
  const up = smooth(T.swell[0], T.swell[1], s);
  const over = s > T.swell[1] && s < T.shrink[0] ? 1 + SEAL.over * Math.sin(Math.PI * Math.min(1, (s - T.swell[1]) / 0.3)) : 1;
  return 1 + (SEAL.titan * over - 1) * up * (1 - smooth(T.shrink[0], T.shrink[1], s));
};

export const FOV = 44;
export const N = { near: 26, far: 1560, penguins: 240, gulls: 14, colony: 24, steam: 260, ash: 320, prints: 9 };
export const FACE_MOUTH = [0, 12.0, -31];
export const STAND = {
  island: [[0, 0, 0], 0.6], wide: [[-0.9, 0, 2.0], 2.4], crest: [[-2.2, 20, -31.0], Math.PI],
  ground: [[0.6, 0, 9.6], 0.35], eat: [[0.6, 0, 9.6], Math.PI], flex: [[1.2, 0, 3.2], 0.22], flex2: [[-0.3, 0, 3.2], 0.22],
  burn: [[0, 0, 0], 0.22], end: [[0, 0, 0], 0.22],
};
export const T_FLEX2 = Math.ceil(17.3 * 12 - 1e-6) / 12, T_BURN = Math.ceil(R.turnBack * 12 - 1e-6) / 12;
export const LENS = {
  swell: { eye: [9, 3.2, 18], aim: [0.6, 3, 9.6], fov: 50 },
  eat: { eye: [18, 8.5, 32], aim: [-1, 6.5, -14], fov: 44 },
  shrink: { eye: [9, 3.5, 22], aim: [0.6, 3, 9.6], fov: 50 },
  hold2: { eye: [2.6, 0.7, 6.4], aim: [1.0, 1.0, 3.2], fov: 40 },
  credit: { eye: [1.1, 1.1, 6.6], aim: [0, 4.5, -30], fov: 44 },
  burn: { eye: [0.8, 0.5, 5.4], aim: [-0.15, 0.5, -9], fov: 50 },
  home: { eye: [0.44, 0.81, 5.14], aim: [-0.29, 2.31, -13.37], fov: 37 },
};
