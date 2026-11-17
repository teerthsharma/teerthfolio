// The clock of p-monodromy: scene s is the card's clock, real s is what the viewer sees (PACE maps one to the other, from
// lib/world/cutscene/clock.js). Cuts sit on the 12 grid (G), hits and panels on the 24 grid (F).
export const PACE = [[0, 0], [0.45, 0.45], [1.6, 2.78], [4.6, 3.75], [6.4, 4.75], [7.0, 8.85], [9.6, 13.95], [12.0, 21.45], [13.2, 25.55], [14.0, 28.15]]; // [scene s, real s]
const thru = (t, a, b) => {
  for (let i = 1; i < PACE.length; i++) if (t < PACE[i][a]) return PACE[i - 1][b] + (t - PACE[i - 1][a]) * (PACE[i][b] - PACE[i - 1][b]) / (PACE[i][a] - PACE[i - 1][a]);
  const e = PACE.at(-1);
  return e[b] + t - e[a];
};
export const warp = (real) => thru(real, 1, 0), unwarp = (scene) => thru(scene, 0, 1); // warp: real s -> scene s
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const G = (n) => n / 12, F = (n) => n / 24;

export const T = { costume: [0.9, 1.5], equip: [1.9, 3.1], panic: [2.3, 2.7], charge: [4.9, 6.3], strike: 6.4, lens: 6.5, stare: [6.8, 12], frame: 1.5 };
export const FLASHES = [3.35, 3.95, 4.9, 5.35, 5.8, 6.1]; // scene s, each 0.17 s long, capped at 0.22

export const R = {
  field: [1.0, 1.5], dusk: [1.5, 2.25], sindria: G(27), frameOn: 2.58, swapIn: 1.25, equip: F(70), strike: F(114), crack: F(130),
  freeze: G(139), fall: F(290), back: G(139) + 1.1, grabIsland: G(139) + 1.2, land: G(139) + 1.3, locked: G(139) + 2.1, ringEnd: G(139) + 2.7,
  shardsOff: G(139) + 2.45, pop: F(330), collapse: [25.55, 26.2], end: 28.15,
};
export const LINES = { ja: [3.0, 3.75], A: 3.75, B: 8.85, C: 13.95, credit: 21.45, collapse: 25.55 };

export const DOCK = [0, 0, 78.6];
export const SEAL = { yaw: 0.35, scale: 1.6 };

export const CRACK_AT = [0.1, 0.06], CRACK_ANG = 1.12;
export const IMPACT = { x: (2 * 0.1) / 1.6, y: 0.12 };
export const HIT = { equip: F(70), strike: F(114), crack: F(130), fall: F(290), pop: F(330) };
