// LOOK pr-nemo-relay-481: the seal as the Ultra Instinct character, silver spiky hair, grey fur, orange gi; black and grey are the hair before the ignition.
import { blueSash, giVest } from "./pr-nemo-relay-481.parts.js";

const HAIR = { preset: "spiky", width: 0.21, spike: 0.35, lift: 0.8, seed: 9, cap: { front: 0.8, back: 1.85, zig: 0.2, n: 11, t: 0.012 },
  parts: [
    { band: [0, 0.3], count: 5, layers: 1, length: [0.12, 0.18], sweep: [0, 0.3, -0.35] },
    { band: [0.7, 1.2], sector: [-0.6, 0.6], count: 2, layers: 1, length: [0.1, 0.15], lift: 0.25, droop: 0.5, sweep: [0, -0.3, 0.5], fringe: { n: 2, length: 0.12, at: [0, 0.3, 0.14], sweep: [0, -0.7, 0.7] } },
    { band: [0.7, 1.5], sector: [2.1, 4.2], count: 6, layers: 1, length: [0.1, 0.16], lift: 0.5, sweep: [0, 0.1, -0.5] },
  ] };
const silver = { col: "#e9eeff", shade: "#a8b8d8", hi: "#ffffff" };

const base = {
  cool: { expr: "calmCut", pose: "uiGuard", rim: "#a58cf0" },
  fur: { coat: "#a9aebf", shade: "#7d7f9e", belly: "#f2e8d8", bellyShade: "#dcb7a2", nose: "#3a3350", ink: "#0a0a1e", blush: null },
  eyes: { style: "round", iris: "#cfd6e6", iris2: "#8e9cbc", pupil: "none", size: 1.0, lash: "#5a6a98" },
  brows: { col: "#7a88aa", thick: 1 },
  mouth: { rest: "closed", sharp: 0.4 },
  hair: { ...HAIR, ...silver },
  marks: [],
  acc: [],
  outfit: [{ kind: "bands", col: "#2a50c0", shade: "#263f90" }],
  hands: { kind: "flipper", skin: "#7b9ac6" },
  extras(engine, h) { return [h.attach(giVest(engine), "body"), h.attach(blueSash(engine), "body")]; },
  poses: {
    uiGuard: { rx: 0.09, head: { rx: 0.04 }, armR: { sx: 1.25, sz: 0.1, elbow: 0.55, sy: -0.1 }, wristR: { rx: 0.25, ry: -0.3, rz: 0 }, armL: { sx: 0.95, sz: 0.5, elbow: 0.9, sy: -0.3 }, wristL: { rx: 0.2, ry: 0.4, rz: 0 } },
    uiDodgeL: { x: -0.1, rz: 0.3, head: { rz: -0.18, ry: 0.12 } },
    uiDodgeR: { x: 0.1, rz: -0.3, head: { rz: 0.18, ry: -0.12 } },
    uiStrike: { ry: -0.5, z: 0.06, rx: 0.12, head: { ry: 0.3 }, armR: { sx: 1.97, sz: 0.05, elbow: 0.3, sy: -0.74 }, wristR: { rx: 0.23, ry: -0.82, rz: 0.31 }, armL: { sx: 0.2, sz: 0.9, elbow: 1.3, sy: -0.4 } },
  },
};
export default base;
export const grey = { ...base, hair: { ...HAIR, col: "#9aa0b0", shade: "#6a7088", hi: "#c8ccd8" }, eyes: { ...base.eyes, iris: "#20232c", iris2: "#3a4050", pupil: null } };
export const black = { ...base, hair: { ...HAIR, col: "#342722", shade: "#17100c", hi: "#2e497d" }, eyes: { ...base.eyes, iris: "#20232c", iris2: "#3a4050", pupil: null }, brows: { col: "#17100c", thick: 1 } };
