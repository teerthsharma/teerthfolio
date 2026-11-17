// LOOK pr-highway-3244: the seal as Iskandar, Rider (Fate/Zero, Ufotable). A long swept red mane and a heavy red chin beard,
// big blue laughing eyes under thick brows, a red cape clasped in bronze over a cream fur collar, a studded leather cuirass.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { beardFigure, maneFigure } from "./pr-highway-3244.parts.js";

const MANE = "#c04a38", MANE_SH = "#7a2a20", MANE_HI = "#e08a6a";

export default {
  cool: { expr: "rider-laugh", pose: "rider-bark" },
  fur: { coat: "#a8a6b0", shade: "#6d6b7d", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2a2030", ink: "#1a0e16", blush: null },
  eyes: { style: "round", iris: "#3a6ec0", iris2: "#33456b", pupil: "round", size: 1.12, lash: "#1a0e16" },
  brows: { col: MANE_SH, thick: 1.6 },
  mouth: { rest: "smile", sharp: 0.3 },
  hair: { preset: "mane", col: MANE, shade: MANE_SH, hi: MANE_HI, length: 1.3, volume: 1.1, seed: 9, cap: { front: 0.9, back: 1.9, zig: 0.14, n: 7 } },
  marks: [],
  acc: [],
  outfit: [
    { kind: "cuirass", col: "#7a4a2e", shade: "#4a2a1c", trim: "#e6b04a", studs: 3, lo: 0.2 },
    { kind: "cape", col: "#c3122e", shade: "#601018", trim: "#e6b04a", fur: "#f1e6cf", clasp: "#e6b04a" },
  ],
  hands: { kind: "flipper" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    return [h.attach(beardFigure(engine), "head"), h.attach(maneFigure(engine), "head")];
  },
};

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

// pose functions in the shared (k) -> channel-deltas form
export const poses = {
  // B4 bark: chest out, head thrown back, flipper flung wide and up
  "rider-bark": (k) => ({ rx: -0.1 * k, y: 0.02 * k, head: { rx: -0.3 * k, rz: 0.05 * k }, armR: arm(2.6 * k, 0.9 * k, 0.2 * k), armL: arm(1.3 * k, 0.5 * k, 0.4 * k), wristR: wr(0, 0, 0.2 * k) }),
  // B5 braced into the wind, head low
  "rider-brace": (k) => ({ rx: 0.22 * k, y: -0.04 * k, head: { rx: 0.1 * k }, armR: arm(1.2 * k, 0.5 * k, 0.5 * k), armL: arm(1.2 * k, 0.5 * k, 0.5 * k) }),
  "rider-cry": (k) => ({ rx: -0.12 * k, head: { rx: -0.3 * k }, armR: arm(2.6 * k, 0.9 * k, 0.2 * k), armL: arm(1.0 * k, 0.5 * k, 0.4 * k) }),
};

export const expressions = {
  // the open-mouthed laugh: eyes squeezed happy, brows high
  "rider-laugh": { eyes: "calm", eyesK: 0.5, brow: [-0.12, 0.008], mouth: ["open", 0.9], adj: { lid: 0.12 }, head: { rx: -0.1 } },
};
