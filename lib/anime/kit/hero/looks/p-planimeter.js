// LOOK p-planimeter: the seal as Kiyotaka Ayanokoji (Classroom of the Elite, Lerche). Tousled brown hair with a
// forward fringe over the right brow, half-lidded wine eyes, deadpan mouth, red blazer, white shirt, no tie.
// Spec for kit/hero.js; `blue` is the checkmate ink swap, `pencil` holds the pencil; poses and expressions below.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { variant } from "./_merge.js";

const HAIR = "#4a3329", HAIR_SH = "#3a2a22", HAIR_HI = "#6b4a38";
const RED = "#c0232f", RED_SH = "#8c1822", INK = "#3b242a";

const blazer = (ink) => ({ kind: "blazer", col: RED, shade: RED_SH, lapel: "#a8222f", trim: "#efe9d8", shirt: "#fbf9f2", tie: null, ink, notch: true });

const base = {
  fur: { coat: "#9aa3b0", shade: "#7b8497", belly: "#f8eee0", bellyShade: "#d9dde4", nose: "#2a2030", ink: INK, blush: null },
  eyes: { style: "round", iris: "#8c4658", iris2: "#5a2a3a", pupil: "round", lash: "#1a0e16", size: 1 },
  brows: { thick: 0 },
  mouth: { rest: "closed", sharp: 0.2 },
  hair: {
    preset: "swept", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, width: 0.08, spike: 0.22, seed: 37,
    volume: 1.15, cap: { front: 1.15, back: 2.0, zig: 0.08, n: 8, t: 0.014 },
    parts: [
      { band: [0.05, 1.0], sector: [-Math.PI, Math.PI], count: 18, layers: 2, length: [0.14, 0.22], width: 0.09, lift: 0.2, droop: 0.6, spike: 0.25, sweep: [0.1, -0.05, -0.2], curl: 0.03 },
      // the fringe: long clumps over the forehead, swept to the right brow
      { band: [0.8, 1.15], sector: [-1.1, 1.1], count: 11, layers: 2, length: [0.18, 0.27], width: 0.11, thick: 0.3, lift: 0.1, droop: 1.3, spike: 0.2, sweep: [0.4, -0.5, 0.5], curl: 0.04 },
      { band: [0.9, 1.3], sector: [0.9, 1.7], count: 6, layers: 1, length: [0.2, 0.28], width: 0.09, lift: 0.12, droop: 1.8, spike: 0.25, sweep: [0.12, -0.8, 0] },
      { band: [0.9, 1.3], sector: [-1.7, -0.9], count: 6, layers: 1, length: [0.2, 0.28], width: 0.09, lift: 0.12, droop: 1.8, spike: 0.25, sweep: [-0.12, -0.8, 0] },
    ],
  },
  marks: [],
  acc: [],
  outfit: [blazer(INK)],
  hands: { kind: "flipper", skin: "#6f7a8c" },
  cool: { expr: "halflid", pose: "sit" },
  blinkEvery: 0,
  extras() { Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions); return []; },
};
export default base;

// the checkmate beat: the line colour drops to a deeper wine
export const blue = variant(base, { fur: { ink: "#241518" }, outfit: [blazer("#241518")] });
export const pencil = variant(base, { props: [{ kind: "staff", hand: "R", col: "#e9a62c", shade: "#a8701a", trim: "#d98a8a", len: 0.28, rot: [0, 0.4, 0] }] });

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const poses = {
  // head on the fore-flippers: the 12 to 14 s rest
  "chin-pose": (k) => ({ y: -0.06 * k, rx: -10 * Math.PI / 180 * k, head: { rx: 0.35 * k }, armR: arm(0.95, 0.3, 1.5, -1.9), armL: arm(0.95, 0.3, 1.5, -1.9), wristR: wr(-0.18, 0.82, 0.48), wristL: wr(-0.18, 0.82, 0.48) }),
  // the pencil set down, head tilted three degrees
  "ayano-tilt": (k) => ({ head: { rz: 0.052 * k, rx: 0.04 * k } }),
};

export const expressions = {
  // half-lidded, flat: the lid line does the acting
  deadpan: { eyes: "calm", brow: [0, 0.004], mouth: ["closed", 0], adj: { lid: 0.35 } },
  // the exact-50 half lid
  halflid: { eyes: "calm", brow: [-0.08, 0.005], mouth: ["closed", 0], adj: { lid: 0.5, open: -0.1 } },
};
