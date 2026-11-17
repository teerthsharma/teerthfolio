// LOOK pr-triton-kernels-22: the seal as Ryomen Sukuna (Jujutsu Kaisen, MAPPA). Spec for buildHero plus the named poses and
// expressions the cutscene calls. Five identifiers: pink spiky mop, four red eyes, high-collar dark jacket with
// one gold button, black brow trident and cheek stripes, toothy grin with the Enma-ten sign (hands pressed at the chest).
import { collarShell, lowerEyes } from "./pr-triton-kernels-22.parts.js";

const INK = "#0e0b0d";

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export default {
  fur: { coat: "#8f8b93", shade: "#6e6a7e", belly: "#f8eee0", bellyShade: "#cdc0b8", nose: "#3a2a30", ink: INK, blush: null },
  eyes: { style: "tsurime", iris: "#e0211f", iris2: "#6e0d14", count: 2, size: 0.8, lash: "#1c0c10" },
  brows: { col: INK, thick: 1.15 },
  mouth: { rest: "grin", sharp: 1, fangs: true },
  hair: {
    preset: "spiky", col: "#d47a96", shade: "#a0506b", hi: "#e592ab", width: 0.105, spike: 0.2, thick: 0.2, curl: 0.03, seed: 3,
    cap: { front: 0.4, back: 1.9, zig: 0.32, n: 27, t: 0.01, crown: 0.012 },
    parts: [
      { band: [0.0, 0.55], count: 40, layers: 2, length: [0.09, 0.17], lift: 0.9, sweep: [0, 0.5, -0.25] },
      { band: [0.55, 1.1], count: 44, layers: 1, length: [0.08, 0.13], lift: 0.7, sweep: [0, 0.2, -0.1], seed: 17 },
      { band: [0.62, 0.95], sector: [-0.9, 0.9], count: 6, layers: 1, length: [0.05, 0.09], lift: 0.55, sweep: [0, -0.1, 0.2], seed: 29 },
    ],
  },
  marks: [
    // forehead trident: a spine with two chevron wings
    { kind: "line", at: [0, 0.68], to: [0, 0.34], w: 0.016, w1: 0.004, col: INK },
    { kind: "arc", at: [0.02, 0.68], to: [0.17, 0.48], w: 0.013, w1: 0.004, col: INK, bend: 0.28 },
    { kind: "arc", at: [-0.02, 0.68], to: [-0.17, 0.48], w: 0.013, w1: 0.004, col: INK, bend: -0.28 },
    // cheek stripes, three a side, sweeping down from the outer eye corners
    ...[1, -1].flatMap((s) => [
      { kind: "arc", at: [s * 0.62, -0.2], to: [s * 0.68, -0.58], w: 0.017, w1: 0.004, col: INK, bend: -0.2 * s },
      { kind: "arc", at: [s * 0.74, -0.14], to: [s * 0.8, -0.46], w: 0.0143, w1: 0.004, col: INK, bend: -0.2 * s },
      { kind: "arc", at: [s * 0.84, -0.06], to: [s * 0.9, -0.3], w: 0.0117, w1: 0.004, col: INK, bend: -0.2 * s },
    ]),
  ],
  outfit: [{ kind: "uniform", col: "#26242c", shade: "#18171e", trim: "#c9a227", buttons: 0, collar: false, cuffAt: 0.05, lapel: "#3a3742" }, { kind: "bands", col: INK }],
  hands: { kind: "human", skin: "#c9b6a4" },
  extras(engine, h) {
    lowerEyes(h);
    return [h.attach(collarShell(engine), "body")];
  },
  // channel sets for ctx.seal.set(): the Enma-ten sign (shrine), the cut cock-back and release (cock, flick), the hold
  // after the cuts (right out at the hip, left at the chest) and the rest (flippers lowered)
  poses: {
    cock: { rx: -0.1, ry: -0.14, head: { rx: 0.05, ry: 0.06 }, armR: arm(1.1, 0.25, 1.0, -0.2), wristR: wr(0.5, -0.5, 0.2), handR: "point" },
    flick: { rx: 0.17, ry: 0.31, z: 0.05, head: { ry: -0.12, rx: 0.03 }, armR: arm(1.3, 0.08, 0.45, -0.1), wristR: wr(0.2, 0.2, -0.1), handR: "point" },
    hold: { rx: 0.05, ry: 0.1, head: { rx: 0.03, ry: -0.05 }, armR: arm(1.15, 0.45, 0.35, -0.1), wristR: wr(0.2, 0.2, -0.1), handR: "open", armL: arm(1.34, -0.33, 0.56, -1.65), wristL: wr(-0.83, -0.16, 1), handL: "flat" },
    rest: { head: { rx: 0.04 }, armR: arm(0.3, 0.2, 0.1), armL: arm(0.3, 0.2, 0.1), handR: "open", handL: "open" },
    shrine: { head: { rx: 0.03 }, armR: arm(1.34, -0.33, 0.56, -1.65), armL: arm(1.34, -0.33, 0.56, -1.65), wristR: wr(-0.83, -0.16, 1), wristL: wr(-0.83, -0.16, 1), handR: "flat", handL: "flat" },
  },
  // the hooded-lid stare and the wide grin
  exprs: {
    stare: { eyes: "smug", eyesAmt: 0.5, brow: { angle: 0.2, drop: 0.004, tilt: 0, raise: 0 }, mouth: "smile", mouthAmt: 0.6 },
    calmHalf: { eyes: "calm", eyesAmt: 0.6, brow: { angle: -0.05, drop: 0.004, tilt: 0, raise: 0 }, mouth: "closed", mouthAmt: 0.2, eyeAdj: { lid: 0.3 } },
    wide: { eyes: "smug", eyesAmt: 0.75, brow: { angle: 0.38, drop: 0.006, tilt: 0, raise: 0 }, mouth: "grin", mouthAmt: 1 },
  },
};


