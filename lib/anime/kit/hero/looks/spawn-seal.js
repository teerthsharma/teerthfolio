// LOOK spawn-seal: the seal as Rimuru Tempest (Tensura, 8bit). Long straight pale-blue hair with a fringe and two side locks,
// round gold eyes, slime-blue fur, a dark collar band, and the calm half-smile. Nothing is held.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";

const HAIR = "#8fd3f0", HAIR_SH = "#58b8e8", HAIR_HI = "#d8eef8";

const base = {
  fur: { coat: "#86aad6", shade: "#7d9dc7", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2a2030", ink: "#1f2a48", blush: null, poreCol: "#6b5a5a" },
  eyes: { style: "round", iris: "#d8a830", iris2: "#e3d34f", pupil: "ring", size: 1.02, lash: "#1a0e16" },
  brows: { col: HAIR_SH, thick: 0.8 },
  mouth: { rest: "smile", sharp: 0.1 },
  hair: {
    preset: "long", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, seed: 35, cap: { front: 0.6, back: 1.9, zig: 0, n: 1, t: 0.012 }, width: 0.15, spike: 0, curl: 0,
    parts: [
      { band: [0.25, 1.5], sector: [1.0, 5.3], count: 18, layers: 2, length: [0.34, 0.5], width: 0.16, lift: 0.1, droop: 1.8, spike: 0, sweep: [0, -0.02, -0.25] },
      { band: [0, 0.8], sector: [-0.9, 0.9], count: 8, layers: 1, length: [0.12, 0.17], width: 0.13, lift: 0.2, droop: 0.6, spike: 0.1, sweep: [0, 0.1, -0.6] },
      { band: [0.9, 1.4], sector: [0.8, 1.35], count: 2, layers: 1, length: [0.3, 0.4], width: 0.12, droop: 1.4, spike: 0, sweep: [0, -0.2, 0.2] },
      { band: [0.9, 1.4], sector: [-1.35, -0.8], count: 2, layers: 1, length: [0.3, 0.4], width: 0.12, droop: 1.4, spike: 0, sweep: [0, -0.2, -0.2] },
    ],
  },
  marks: [],
  acc: [],
  outfit: [{ kind: "blazer", col: "#0b0a14", shade: "#040309", lapel: "#142070", trim: "#d8b04a", shirt: "#0b0a14", tie: false, ink: "#1a0e16" }, { kind: "choker", col: "#142070", shade: "#0a1038", ink: "#1a0e16" }],
  hands: { kind: "flipper", skin: "#7d9dc7" },
  extras() {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    return [];
  },
};
export default base;

// the violet-lit eyes of the Predator window
export const predator = { ...base, eyes: { ...base.eyes, iris: "#8a3fff", iris2: "#c9a8ff", glow: 1 } };

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const poses = {
  // B11: a glance back over the left shoulder, the hair falling to the left
  "rimuru-glance": (k) => ({ ry: 0.9 * k, head: { ry: -0.9 * k, rz: 0.06 * k } }),
  // 26.79: flipper open, palm up, head lifted
  "rimuru-offer": (k) => ({ rx: -4 * k * Math.PI / 180, head: { rx: -0.14 * k }, armR: arm(1.35, 0.35, 0.5, -0.6), wristR: wr(-0.2, 0.6, 0.2) }),
  "rimuru-draw": (k) => ({ rx: 0.06 * k, head: { rx: -0.04 * k }, armR: arm(0.55, 0.3, 2.0, -0.2), wristR: wr(0, 0, 0), handR: "fist" }),
  "rimuru-punch": (k) => ({ rx: 0.1 * k, y: 0.02 * k, head: { rx: 0.04 * k }, armR: arm(1.52, -0.05, 0.12, 0), wristR: wr(0, 0, 0), handR: "fist" }),
};

export const expressions = {
  // eyes at half lid, a quiet smile
  "rimuru-calm": { eyes: "calm", brow: [0.02, 0.003], mouth: ["smile", 0.5], head: { rz: 0.02 } },
  // eyes wide for Veldora's eye
  "rimuru-awe": { eyes: "awe", brow: [-0.1, 0.006], mouth: ["open", 0.25] },
  "rimuru-gaze": { eyes: "calmCut", brow: [0.12, 0.004], mouth: ["smile", 0.35], head: { rx: -0.03 } },
};
