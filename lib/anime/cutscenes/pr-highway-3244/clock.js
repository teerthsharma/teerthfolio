// Card clock, race warp and rig frame of pr-highway-3244 (Iskandar): the live move's numbers (DOCK = dockPoint, TURN = turnFor, knots as [card s, race s]), checked by clock.check.mjs.
export const DOCK = [-28, 0, -18.8];
export const TURN = -5.6796233186;
export const KNOTS = [[0, 0], [2, 2], [7.4, 3.0], [10.1, 4.7], [12.5, 5.3], [13.7, 6.0], [15.3, 6.45], [17.3, 7.55], [18.3, 8.1], [24.0, 11.0], [25.8, 12.8], [60, 47]];
const th = (x, a, b) => {
  for (let i = 1; i < KNOTS.length; i++) if (x <= KNOTS[i][a]) { const k = (x - KNOTS[i - 1][a]) / (KNOTS[i][a] - KNOTS[i - 1][a]); return KNOTS[i - 1][b] + k * (KNOTS[i][b] - KNOTS[i - 1][b]); }
  return x;
};
export const warp = (tc) => th(tc, 0, 1);
export const unwarp = (t) => th(t, 1, 0);
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const rotY = (a, [x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
export const W = (p) => { const r = rotY(TURN, p); return [r[0] + DOCK[0], r[1] + DOCK[1], r[2] + DOCK[2]]; };
export const C = { sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, hop: [1.6, 2.54], cry: 7.638, go: 8.274, kachow: 11.1, cross: 13.7, cover: [14.767, 15.193], swap: 15.229, turn: [15.193, 16.118], stop: 17.3, leave: 26.0, plate: 1.6 };
export const SWORD = [6.32, 7.56];
export const FLING = [8.988, 9.226, 9.576, 9.735, 9.957];
export const LINE = { stageSfx: [1.27, 1.95], A: [2.4, 14.95], cry: [7.56, 9.385], B: [15.3, 21.0], credit: [21.0, 25.0], collapse: [25.0, 25.4], end: 25.8 };
export const BACK = 15.5; // the camera cut to the live back lens
// the character turns back to the pup at POP, inside the paper star; the cloth still rolls until C.turn[1]
export const POP = 386 / 24;
// shot spans on the 12 grid (G): a cut that moves the seal lands on a drawing
export const SH = { a: [71 / 12, 7.5], cry: [7.5, 98 / 12], brace: [98 / 12, 8.75], race: [8.75, 131 / 12], nose: [131 / 12, 149 / 12], back: [BACK, 217 / 12], fist: [217 / 12, 245 / 12], credit: [245 / 12, 25.0] };
export const SEAL = { char: 0.93, pup: 0.58 };
export const ONES_RUN = [8.274, 14.767];
