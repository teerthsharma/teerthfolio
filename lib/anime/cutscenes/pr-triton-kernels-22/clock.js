// The live cutscene's clock, kept exact (the picture runs on `tt = warp(t)`), the hits on the 24-frame grid, and the site's lens.
export const T = {
  draw: [1.2, 2.7], sky: [1.2, 2.4], pool: [2.0, 4.6], rise: [1.9, 3.3], tri: [3.4, 4.6], point: [4.9, 5.1], barrage: 5.4, barrageEnd: 8.0,
  cutTri: 6.3, land: 7.55, lit: 7.35, close: [8.1, 8.3], dis: [8.45, 9.2], drain: [8.3, 9.0], letters: [8.3, 9.5], final: 8.85, erase: [8.95, 9.65],
};
export const WARP = [[0, 0], [2.7, 2.7], [8.1, 5.4], [14.6, 8.0], [17.9, 9.65]];
const through = (t, a, b) => {
  for (let i = 1; i < WARP.length; i++) if (t < WARP[i][a]) return WARP[i - 1][b] + ((t - WARP[i - 1][a]) * (WARP[i][b] - WARP[i - 1][b])) / (WARP[i][a] - WARP[i - 1][a]);
  const e = WARP[WARP.length - 1];
  return e[b] + t - e[a];
};
export const warp = (t) => through(t, 0, 1);
export const unwarp = (u) => through(u, 1, 0);
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const HIT = { rel: 194 / 24, clv: 248 / 24, hvy: 330 / 24, last: 392 / 24 };
export const LINE = { A: 2.7, B: HIT.rel + 3 / 24, C: 18.0, credit: 24.0, impact: 1.15, collapse: [28.5, 28.9] };
export const BACK = 416 / 24;
export const YAW = -0.2386;
export const SHRINE_Z = -78;
export const TRI_AT = [4.4, 0, -3.6];
export const SEAL = { yaw: 0.6, scale: 1.6 };
// The site's dock point: the whole cutscene stands where the site's does, so every world-space tone, streak, crack and scar is the site's.
export const DOCK = [14, 0, -61.4];

export const NB = 10;
export const BLOCK = { C: 0.34, GAP: 0.035 };
export const ROWS = Array.from({ length: NB }, (_, q) => [...new Set([0, q, ...(q > 0 ? [q - 1] : []), ...[3, 6].filter((s) => s <= q)])].sort((a, b) => a - b));

// LENS: [eye, forward] of the site's camera, measured while the cutscene played (rig frame, the seal at the origin, 52 degrees).
export const FOV = 52;
export const LENS = {
  a: [[-5.13, 0.98, 6.34], [0.288, 0.037, -0.957]], a2: [[-5.54, 1.05, 6.47], [0.288, 0.04, -0.957]],
  b: [[5.18, 1.6, 7.49], [-0.138, 0.029, -0.99]], b2: [[6.24, 1.83, 8.41], [-0.139, 0.032, -0.99]], b3: [[6.45, 1.87, 8.53], [-0.139, 0.033, -0.99]],
  back: [[5.4, 1.66, 7.9], [-0.138, 0.029, -0.99]], c: [[4.3, 0.46, 7.54], [-0.136, 0.02, -0.991]],
};
// STAND: where the seal stands inside each of the site's wides (rig frame) and how it is turned: on the lens's own ray to the dock,
// nearer, so the set is the site's frame untouched and the seal is 30 percent of it, not 18.
export const STAND = { a: [[-1.6, 0, 1.96], -0.8], b: [[1.55, 0, 2.25], 0.8], b2: [[2.2, 0, 2.95], 0.8], back: [[1.9, 0, 2.77], 0.7] };
