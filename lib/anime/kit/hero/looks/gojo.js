// LOOK gojo: white spiked hair, blue six-eyes, dark uniform with an open collar (the rig's regression look).
import { variant } from "./_merge.js";

const gojo = {
  fur: { coat: "#a3a1a9", shade: "#5e6478", belly: "#f1e6d0", bellyShade: "#c4b9b6", nose: "#2e2a30", ink: "#2e2a36", blush: null },
  eyes: { style: "tsurime", iris: "#a6e6fa", iris2: "#2f78b8", size: 0.96, lash: "#22222e" },
  brows: { col: "#f2f0f6", thick: 1.15 },
  mouth: { rest: "closed", sharp: 0.95 },
  hair: { preset: "spiky", col: "#f6f3ec", shade: "#bcc3d8", hi: "#ffffff", cap: { front: 0.9, back: 1.8, zig: 0.16, n: 11 }, width: 0.15, spike: 0.5, curl: 0.05, seed: 7,
    parts: [
      { band: [0, 0.85], count: 20, layers: 1, length: [0.07, 0.12], lift: 0.6, droop: 0.2, sweep: [0, 0.12, 0], fringe: { n: 3, length: 0.1, at: [-0.025, 0.3, 0.14], sweep: [0, -0.7, 0.7] } },
      { band: [0.7, 1.45], sector: [0.55, 5.73], count: 22, layers: 1, length: [0.1, 0.17], lift: 0.3, droop: 0.9, sweep: [0, -0.1, 0] },
    ] },
  marks: [
    { kind: "line", at: [0.16, 0.86], to: [0.2, 0.3], w: 0.011, w1: 0.009, col: "#6a2a26" },
    { kind: "line", at: [0.2, 0.3], to: [0.56, -0.3], w: 0.009, w1: 0.004, col: "#6a2a26" },
  ],
  outfit: [{ kind: "uniform", col: "#1c1c2a", shade: "#0b0b14", trim: "#c9a44a", buttons: 2, collar: "open", shirt: "#ebe7de", lapel: "#2c2c40" }],
  hands: { kind: "human", skin: "#b3a595" },
};
export default gojo;
export const blindfold = variant(gojo, { acc: [{ kind: "blindfold", col: "#1d1a22" }] });
