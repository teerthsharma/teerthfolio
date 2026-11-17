// LOOK sukuna: pink spiked hair, four red eyes, face and body markings, dark robe-uniform with a high collar.
const INK = "#1a120c";
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
export default {
  cool: { expr: "menace", pose: "shrine" },
  fur: { coat: "#aaa3a6", shade: "#685e70", belly: "#f1e6d4", bellyShade: "#c8bab4", nose: "#3a2a30", ink: "#30242a", blush: null },
  eyes: { style: "tsurime", iris: "#f0444a", iris2: "#7a1218", count: 4, size: 0.92, lash: "#24141a" },
  brows: { col: "#2e1a20", thick: 1.1 },
  mouth: { rest: "smile", sharp: 1, fangs: true },
  hair: { preset: "spiky", col: "#f2a4b6", shade: "#b0607c", hi: "#ffd6e0", length: 0.7, volume: 1.3, seed: 3 },
  marks: [
    { kind: "line", at: [0, 0.68], to: [0, 0.42], w: 0.011, w1: 0.003, col: INK },
    { kind: "arc", at: [0.07, 0.68], to: [0.17, 0.53], w: 0.008, w1: 0.003, col: INK, bend: 0.25 },
    { kind: "arc", at: [-0.07, 0.68], to: [-0.17, 0.53], w: 0.008, w1: 0.003, col: INK, bend: -0.25 },
    { kind: "arc", at: [0.6, -0.3], to: [0.66, -0.58], w: 0.006, w1: 0.002, col: INK, bend: -0.2 },
    { kind: "arc", at: [-0.6, -0.3], to: [-0.66, -0.58], w: 0.006, w1: 0.002, col: INK, bend: 0.2 },
    { kind: "arc", at: [0.72, -0.25], to: [0.78, -0.5], w: 0.005, w1: 0.002, col: INK, bend: -0.2 },
    { kind: "arc", at: [-0.72, -0.25], to: [-0.78, -0.5], w: 0.005, w1: 0.002, col: INK, bend: 0.2 },
  ],
  outfit: [{ kind: "uniform", col: "#2c1e3a", shade: "#130a1c", trim: "#d9b34a", buttons: 1, collar: "high", cuffAt: 0.05 }, { kind: "bands", col: INK }],
  hands: { kind: "human", skin: "#c4b2a2" },
  // channel sets for the track's `set` (arms solved on the rig: .oneshot/pr-triton-kernels-22/tools/arm-ik.mjs). sign: the shrine's roof, both
  // hands before the chest, fingertips meeting, their backs to the lens. cock: two fingers drawn back across the chest. flick: the backhand out to +x
  poses: {
    sign: { head: { rx: 0.02 }, armR: arm(0.85, -0.09, 0.5, -1.11), armL: arm(0.85, -0.09, 0.5, -1.11), wristR: wr(-1.08, 0.4, 0.09), wristL: wr(-1.08, 0.4, 0.09), handR: "flat", handL: "flat" },
    cock: { rx: -0.06, ry: -0.18, head: { ry: 0.12, rx: 0.03 }, armR: arm(1.03, -0.24, 0.71, -0.84), wristR: wr(-0.35, 0.84, 0.02), handR: "two" },
    flick: { rx: 0.1, ry: 0.14, z: 0.04, head: { ry: -0.22, rx: -0.02 }, armR: arm(0.28, 1.38, 0.68, -0.19), wristR: wr(0.42, -0.61, 0.11), handR: "two" },
  },
};
