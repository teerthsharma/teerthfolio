// LOOK p-caustic: the seal as Ryomen Sukuna (Jujutsu Kaisen, MAPPA). Spec for buildHero plus the named poses and
// expressions the cutscene calls. Five identifiers: pink spiky mop, four red eyes, high-collar dark jacket with
// one gold button, black brow trident and cheek stripes, toothy grin with the two-finger flick.
import { DOME } from "../body.js";
import { collarShell, lowerEyes } from "./p-caustic.parts.js";

const INK = "#140a0c";

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export default {
  fur: { coat: "#a9a3a8", shade: "#675d73", belly: "#f1e6d4", bellyShade: "#c4b5b4", nose: "#3a2a30", ink: INK, blush: null },
  eyes: { style: "tsurime", iris: "#e0211f", iris2: "#6e0d14", count: 2, size: 0.94, lash: "#1c0c10" },
  brows: { col: INK, thick: 1.15 },
  mouth: { rest: "grin", sharp: 1, fangs: true },
  hair: {
    preset: "spiky", col: "#e8849e", shade: "#a44d6c", hi: "#f6a8bd", cut: { at: [0.5, 0.78], slant: 0.12, rate: 0.4 }, width: 0.16, spike: 0.28, thick: 0.24, curl: 0.03, seed: 3,
    cap: { front: 0.5, back: 1.7, zig: 0.15, n: 13, t: 0.012, crown: 0.025 },
    parts: [
      { band: [0.0, 0.55], count: 22, layers: 2, length: [0.11, 0.2], lift: 0.9, sweep: [0, 0.6, -0.6] },
      { band: [0.55, 1.1], count: 26, layers: 1, length: [0.09, 0.15], lift: 0.7, sweep: [0, 0.3, -0.35], seed: 17 },
      { band: [0.62, 0.95], sector: [-0.9, 0.9], count: 6, layers: 1, length: [0.05, 0.09], lift: 0.55, sweep: [0, -0.1, 0.2], seed: 29 },
    ],
  },
  marks: [
    // forehead trident: a spine with two chevron wings
    { kind: "line", at: [0, 0.68], to: [0, 0.34], w: 0.018, w1: 0.004, col: INK },
    { kind: "arc", at: [0.02, 0.68], to: [0.17, 0.48], w: 0.013, w1: 0.004, col: INK, bend: 0.28 },
    { kind: "arc", at: [-0.02, 0.68], to: [-0.17, 0.48], w: 0.013, w1: 0.004, col: INK, bend: -0.28 },
    // cheek stripes, three a side, sweeping down from the outer eye corners
    ...[1, -1].flatMap((s) => [
      { kind: "arc", at: [s * 0.62, -0.2], to: [s * 0.68, -0.58], w: 0.012, w1: 0.003, col: INK, bend: 0.2 * s },
      { kind: "arc", at: [s * 0.74, -0.14], to: [s * 0.8, -0.46], w: 0.012, w1: 0.003, col: INK, bend: 0.2 * s },
      { kind: "arc", at: [s * 0.84, -0.06], to: [s * 0.9, -0.3], w: 0.012, w1: 0.003, col: INK, bend: 0.2 * s },
    ]),
    // lid arc over each lower eye
    ...[1, -1].map((s) => ({ kind: "arc", at: [s * (0.114 - 0.024) / DOME.r[0], (0.138 + 0.022 - DOME.c[1]) / DOME.r[1]], to: [s * (0.114 + 0.024) / DOME.r[0], (0.138 + 0.02 - DOME.c[1]) / DOME.r[1]], w: 0.006, w1: 0.002, col: INK, bend: 0.5 * s })),
  ],
  outfit: [{ kind: "uniform", col: "#2a1a3a", shade: "#120a1e", trim: "#d1a84a", buttons: 0, collar: false, cuffAt: 0.05, lapel: "#3a2650" }, { kind: "bands", col: INK }],
  hands: { kind: "human", skin: "#a9a3a8" },
  extras(engine, h) {
    lowerEyes(h);
    return [h.attach(collarShell(engine), "body")];
  },
  // channel sets for ctx.seal.set(): the cock-back (7.75 s), the two-finger flick (8.0 s) and the shrine sign
  poses: {
    cock: { rx: -0.1, ry: -0.14, head: { rx: 0.05, ry: 0.06 }, armR: arm(1.1, 0.25, 1.0, -0.2), wristR: wr(0.5, -0.5, 0.2), handR: "point" },
    flick: { rx: 0.17, ry: 0.31, z: 0.05, head: { ry: -0.12, rx: 0.03 }, armR: arm(1.3, 0.08, 0.45, -0.1), wristR: wr(0.2, 0.2, -0.1), handR: "point" },
    shrine: { head: { rx: 0.03 }, armR: arm(1.34, -0.33, 0.56, -1.65), armL: arm(1.34, -0.33, 0.56, -1.65), wristR: wr(-0.83, -0.16, 1), wristL: wr(-0.83, -0.16, 1), handR: "flat", handL: "flat" },
  },
  // the hooded-lid stare and the wide grin
  exprs: {
    stare: { eyes: "smug", eyesAmt: 0.5, brow: { angle: 0.2, drop: 0.004, tilt: 0, raise: 0 }, mouth: "smile", mouthAmt: 0.6 },
    wide: { eyes: "smug", eyesAmt: 0.75, brow: { angle: 0.38, drop: 0.006, tilt: 0, raise: 0 }, mouth: "grin", mouthAmt: 1 },
  },
};


