// LOOK pr-mujoco-3396: the seal as Eren Yeager, final season (Attack on Titan, MAPPA). Long dark-brown hair in a half
// bun with two fringe locks and a hanging tail, a heavy-lidded grey-green stare, stubble, a cream tunic band with a
// brown belt, brown cloth wraps on both fore flippers. Named poses: brace, lookup, command; expression `set`.
import { belt, bun, harness, wrap } from "./pr-mujoco-3396.parts.js";

const HAIR = "#3a2616", HAIR_SH = "#1f1209", HAIR_HI = "#8a5e36";
const STUB = "#76614f";
const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const FOOT = (t) => { const n = Math.round((t - 0.5) / 0.8), d = t - (0.5 + 0.8 * n); return n >= 0 && n < 10 && d >= 0 ? Math.exp(-d / 0.11) : 0; };

export default {
  fur: { coat: "#8199bb", shade: "#556270", belly: "#f8eee0", bellyShade: "#9d8a75", nose: "#2e2a30", ink: "#1a120c", blush: null },
  eyes: { style: "tsurime", iris: "#7d9a88", iris2: "#3f5247", pupil: "round", size: 0.98, lash: "#1a120c" },
  brows: { col: "#2a1a10", thick: 1.45 },
  mouth: { rest: "closed", sharp: 0.3 },
  hair: {
    preset: "long", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, width: 0.06, spike: 0.45, seed: 17, curl: 0.02,
    cap: { front: 0.78, back: 1.95, zig: 0.1, n: 9, t: 0.012, crown: 0.02 },
    tail: { n: 7, length: 0.2, width: 0.05, at: [0, 0.27, -0.17], sweep: [-1.1, 0, 0] },
    parts: [
      { band: [0.1, 0.85], sector: [-Math.PI, Math.PI], count: 20, layers: 2, length: [0.07, 0.13], lift: 0.3, droop: 0.1, sweep: [0, 0.05, -0.8] },
      { band: [0.85, 1.75], sector: [0.95, 1.7], count: 5, layers: 2, length: [0.08, 0.13], lift: 0.1, droop: 0.6, sweep: [0, -0.1, -0.15], spike: 0.35 },
      { band: [0.85, 1.75], sector: [-1.7, -0.95], count: 5, layers: 2, length: [0.08, 0.13], lift: 0.1, droop: 0.6, sweep: [0, -0.1, -0.15], spike: 0.35 },
      { band: [0.85, 1.75], sector: [2.4, 3.9], count: 12, layers: 2, length: [0.14, 0.24], lift: 0.1, droop: 0.9, sweep: [0, -0.1, -0.15], spike: 0.35 },
    ],
  },
  marks: [
    { kind: "dot", at: [0.24, -0.62], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.24, -0.62], w: 0.0026, col: STUB },
    { kind: "dot", at: [0.4, -0.72], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.4, -0.72], w: 0.0026, col: STUB },
    { kind: "dot", at: [0.18, -0.82], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.18, -0.82], w: 0.0026, col: STUB },
    { kind: "dot", at: [0.32, -0.8], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.32, -0.8], w: 0.0026, col: STUB },
    { kind: "dot", at: [0.5, -0.62], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.5, -0.62], w: 0.0026, col: STUB },
    { kind: "dot", at: [0.1, -0.9], w: 0.0026, col: STUB }, { kind: "dot", at: [-0.1, -0.9], w: 0.0026, col: STUB },
  ],
  acc: [],
  outfit: [{ kind: "uniform", col: "#4a3a2c", shade: "#251b12", trim: "#2a1c12", buttons: 0, collar: "open", shirt: "#d6c39b" }, { kind: "bands", col: "#6a4a30", shade: "#3a2616", ink: "#2a1a0e" }],
  hands: { kind: "flipper", skin: "#b3a595" },
  extras(engine, h) {
    return [h.attach(harness(engine), "body"), h.attach(belt(engine), "body"), h.attach(wrap(engine), "foreR"), h.attach(wrap(engine), "foreL"), h.attach(bun(engine), "head")];
  },
  // pose functions as in kit/hero/motion.js: (k, t) -> channel deltas
  poses: {
    brace: (k, t) => ({ y: -0.03 * k - 0.006 * FOOT(t) * k, sy: 1 - 0.1 * k, sxz: 1 + 0.05 * k, head: { rx: 0.06 * k }, armR: arm(0.6, 0.55, 0.9, -0.5), armL: arm(0.6, 0.55, 0.9, -0.5), wristR: wr(0.4, 0.9, -0.2), wristL: wr(0.4, 0.9, -0.2) }),
    lookup: (k) => ({ head: { rx: -25 * D2 * k }, eyesWide: 0.5 * k }),
    command: (k) => ({ rx: -4 * D2 * k, y: 0.01 * k, head: { rx: -0.06 * k }, armR: arm(2.55, 0.25, 0.12, -0.3), wristR: wr(-0.15, -1.2, -0.21) }),
    catch: (k) => ({ rx: -0.06 * k, armR: arm(3.05, 0.2, 0.1, -0.3), wristR: wr(-0.1, -1.0, -0.2), head: { rx: -0.2 * k }, handR: "open" }),
    eat: (k) => ({ rx: 0.08 * k, y: -0.02 * k, head: { rx: -0.3 * k }, armR: arm(0.5, 0.35, 0.2), armL: arm(0.5, 0.35, 0.2) }),
  },
  expressions: {
    set: { eyes: "calm", brow: [0.35, 0.007], mouth: ["closed", -0.25] },
    shout: { eyes: "rage", brow: [0.5, 0.009], mouth: ["snarl", 1] },
    widen: { eyes: "calm", eyesK: 0.4, brow: [0.12, 0.003], mouth: ["closed", 0] },
    roar: { eyes: "rage", brow: [0.45, 0.008], mouth: ["open", 1] },
  },
  cool: { expr: "set", pose: "command", rim: "#ffcc4d" },
};
