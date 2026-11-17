// pr-polychrom-79 clock: the live title card's times in arrival-relative seconds, kept exact, with the turn, the return and the word on the 12 and 24 grids.
// Line texts and bold spans are the card's own (lib/world/cutscene/cards/pr-polychrom-79.js); the four deliberate changes are in the plan's section 1.

export const DOCK = [47.3, 6.5, 91.2];
export const SEAL = { yaw: 0.25, scale: 1.6 };
export const FOV = 42;
export const DOME = { k: 1.6, np: 42, ns: 240 };
export const W = (p) => [p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]];
export const FOUNTAIN_AT = [0, 0, -4.2];
export const PUP = { home: [0.6, 0, -2.0], back: [0, 0, 0], edge: [1.0, 0, 3.4] };
export const EDGE_Z = 4.7;

export const F = (f) => f / 24;
export const G = (g) => g / 12;
export const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const TURN = G(14);
export const BACK = G(255);
export const HIT = {
  turn: TURN,
  kneel: F(55),
  key: F(196),
  open: F(303),
  ea: F(346),
  blast: F(466),
  flash: F(476),
  shatter: F(488),
  back: BACK,
  volley: [3, 4, 5, 6],
};
HIT.waves = [HIT.blast, HIT.blast + F(2), HIT.blast + F(4)];

export const T = {
  open: TURN + 0.1,
  step: 0.05,
  gate: [1.6, 3.2],
  eyes: [2.3, 3.0],
  key: [7.0, 8.2],
  spread: [8.8, 13.0],
  opens: [12.6, 14.2],
  keyAway: [13.6, 14.4],
  draw: [14.4, 16.4],
  aim: [18.0, 19.2],
  blast: [19.4, 19.9],
  word: [19.6, BACK],
  shatter: HIT.shatter,
  windEnd: [21.4, 22.2],
  shardEnd: 22.8,
  edge: G(264),
  home: 26.0,
  grow: [0.55, 1.15],
  ring: [BACK, BACK + F(4)],
  hop: BACK + F(8),
  windOn: [G(215), BACK],
};
T.windShrink = [HIT.shatter, HIT.shatter + 0.5];
T.irisCap = 0.2;

// Return frames from BACK on the 24 grid: plate frames 0 and 1, King shrinks on frames 2 to 5, pup pops from frame 6.
export const RET = { plate: 2, shrink: 4, pop: 6 };
// World jolts [t0, t1, a0, a1] in frame heights, ramped from a0 to a1 across the row.
export const JOLT = [
  [7.0, 8.1, 0.03, 0.04],
  [8.6, 12.6, 0.02, 0.035],
  [14.5, 16.4, 0.03, 0.04],
  [G(215), 19.4167, 0.03, 0.04],
  [HIT.blast, HIT.shatter, 0.04, 0.035],
  [HIT.shatter, BACK, 0.04, 0.03],
];
export const RIM = { eye: [15.663, 9.727, 3.752], aim: [8.92, -7.68, -3.43], fov: 64, pup: [9.68, -2.6, -0.68], yaw: 0.93, scale: 3.0 };
export const LENS = { t: BACK + F(2), az: 0.1, r: 3.4, h: 0.8, aim: [0, 0.6, 0], fov: 40 };
export const REVEAL = [T.edge, T.edge + 0.7];
export const BREAK = { x: 0.62, y: 0.45, n: 24, g: 3.2, drift: 0.8, spin: 3, delay: 0.04 };
export const joltAt = (t) => {
  for (const [a, b, a0, a1] of JOLT) if (t >= a && t < b) {
    const k = a0 + ((a1 - a0) * (t - a)) / (b - a), s = Math.floor(t * 12) % 2 ? -1 : 1;
    return [s * k, 0.5 * s * k];
  }
  return [0, 0];
};

export const LINE = { A: 2.3, B: 8.3, C: 14.0, credit: 23.0, collapse: [27.4, 27.8] };
export const GATE_AT = [0, 4.8, -12];
export const KEY_AT = [0.55, 1.35, 0.6];
export const EA_AT = [1.05, 0.35, 0.3];
export const EA_CARD = { cx: 0.8, cy: 0.58, len: 0.8, rise: [14.4, 16.4], on: [14.6, 19.9] };
export const pupAt = (t) => (t >= T.home ? PUP.home : t >= T.edge ? PUP.edge : t >= BACK ? PUP.back : PUP.home);

export const TEXT = {
  A: { kind: "oval", text: "Gate of Babylon. Kneel, mongrels.", bold: ["Kneel, mongrels."] },
  B: { kind: "burst", text: "Let me show you a treasure worthy of the King.", bold: ["King"] },
  C: {
    kind: "burst",
    text: "11/11 test pairs agree with the fix, 1/11 on master. Mismatched frees: 16 to 0.",
    bold: ["11/11 test pairs", "16 to 0"],
  },
  credit: { title: "open2c/polychrom #79", sub: "11/11 pairs agree, back at the Fountain of Immortality" },
};

export const BURST = { t: HIT.blast + F(2), n: 8 };
export const PLATES = [[HIT.flash, HIT.flash + F(3)], [BACK, BACK + F(2)]];
export const plateAt = (t) => PLATES.some(([a, b]) => t >= a - 1e-6 && t < b - 1e-6);
export const HOLD = [G(215), BACK];
