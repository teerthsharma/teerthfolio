// LOOK pr-pyrefly-4180: the seal as Minato Namikaze, the Fourth Hokage (Naruto, Pierrot). Spiky yellow hair with two long
// bangs, calm blue eyes under a heavy lid, the Leaf forehead protector, a white haori with a red flame hem, one tri-prong kunai.
import { propFigure } from "../dress.js";
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { bandFigure, flameFigure, plateFigure } from "./pr-pyrefly-4180.parts.js";

const HAIR = "#f4d548", HAIR_SH = "#e2b32c", HAIR_HI = "#fff4a0";

const base = {
  fur: { coat: "#86aad6", shade: "#6882ad", belly: "#f8eee0", bellyShade: "#c0b6b5", nose: "#3a3338", ink: "#2a1a1c", blush: null, poreCol: "#76614f" },
  eyes: { style: "tareme", iris: "#4a7fb8", iris2: "#2f5f98", pupil: "round", size: 1.02, lash: "#20150c" },
  brows: { col: "#c8a020", thick: 0.9 },
  mouth: { rest: "smile", sharp: 0.2 },
  hair: { preset: "spiky", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, n: 11, up: 0.7, spike: 0.6, width: 0.14, length: 1.15, seed: 4, cap: { front: 0.95, back: 1.9, zig: 0.12, n: 9 } },
  marks: [],
  acc: [],
  outfit: [{ kind: "haori", col: "#f4f0e6", shade: "#b8b8c8", sleeves: "fitted", collar: "stand", trim: "#ece8dc", cuffTrim: "#ece8dc", hemCol: "#d83820", ink: "#4a4256" }],
  hands: { kind: "flipper" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    const k = propFigure(engine, "kunai3", { col: "#c8c8d0", wrap: "#2a3a5a", tilt: 0 });
    k.scale.setScalar(1.7);
    h.attach(k, "handR");
    return [k, h.attach(bandFigure(engine), "head"), h.attach(plateFigure(engine), "head"), h.attach(flameFigure(engine), "body")];
  },
};
export default base;

// the flash beat: eyes rim-lit by the fire
export const flash = { ...base, eyes: { ...base.eyes, iris: "#6a9fd8", glow: 0.25 } };

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

// pose functions in the shared (k, t) -> channel-deltas form
export const poses = {
  // B3: weight low, the right flipper brings the kunai up in a reverse grip
  "minato-brace": (k) => ({ rx: 8 * k * Math.PI / 180, y: -0.02 * k, armR: arm(2.2 * k, 0.35 * k, 1.5 * k, 0.8 * k), wristR: wr(0, 0, 0.4 * k), head: { rx: 0.03 * k } }),
  // the snap toward the orb: flipper straight out, kunai held through it
  "minato-throw": (k) => ({ rx: 12 * k * Math.PI / 180, armR: arm(1.45 * k, 0.1 * k, 0.15 * k), wristR: wr(0, 0, 0), head: { rx: 0.02 * k } }),
};

export const expressions = {
  // the half-smile: heavy-lidded blue eyes, a soft brow
  "minato-calm": { eyes: "calm", brow: [-0.02, 0.004], mouth: ["smile", 0.45], adj: { lid: 0.22, open: -0.06 }, head: { rz: 0.03 } },
  // the narrowed look of the brace
  "minato-narrow": { eyes: "rage", eyesK: 0.4, brow: [0.3, 0.006], mouth: ["closed", 0.1], adj: { lid: 0.2 }, head: { rx: 0.03 } },
};
