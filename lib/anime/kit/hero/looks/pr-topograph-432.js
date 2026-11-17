// LOOK pr-topograph-432: the seal as Ainz Ooal Gown (Overlord): grey-bone skull, red eye points, violet hood and robe, gold trim.
import { ainzStaff, collar, pauldrons, rings } from "./pr-topograph-432.parts.js";

const INK = "#05020a", GOLD = "#f0b429", BONE_SH = "#4c4a52";
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export default {
  cool: { expr: "menace", pose: "fist" },
  fur: { coat: "#b9b4a2", shade: "#5a5648", belly: "#e7e0c8", bellyShade: "#8a8470", nose: INK, ink: INK, blush: null, pores: false },
  eyes: { style: "round", iris: "#d0142f", iris2: "#7a0c1c", pupil: "none", size: 0.34, sclera: INK, lash: INK, glow: 0 },
  brows: { col: INK, thick: 1.8 },
  mouth: { rest: "closed", fangs: true, sharp: 1, tooth: "#ece4cc", toothShade: "#a89f84", gum: INK, tongue: INK },
  hair: null,
  // face.js holds 24 mark slots (an arc takes 4): the two lower cheek arcs are dropped so the five teeth fit
  marks: [
    { kind: "arc", at: [-0.82, 0.3], to: [-0.12, 0.2], w: 0.03, w1: 0.02, col: BONE_SH, bend: -0.25 },
    { kind: "arc", at: [0.82, 0.3], to: [0.12, 0.2], w: 0.03, w1: 0.02, col: BONE_SH, bend: 0.25 },
    { kind: "line", at: [0, 1.0], to: [0, 0.4], w: 0.0035, col: INK },
    { kind: "line", at: [-0.48, 0.92], to: [-0.34, 0.62], w: 0.0035, w1: 0.0015, col: INK },
    { kind: "line", at: [0.55, 0.9], to: [0.4, 0.74], w: 0.0035, w1: 0.0015, col: INK },
    { kind: "line", at: [0, 0.2], to: [0, -0.2], w: 0.0025, col: BONE_SH },
    { kind: "dot", at: [-0.56, 0.08], w: 0.13, col: INK },
    { kind: "dot", at: [0.56, 0.08], w: 0.13, col: INK },
    { kind: "dot", at: [0, 0.0], w: 0.05, col: INK },
    ...[-0.2, -0.1, 0, 0.1, 0.2].map((x) => ({ kind: "line", at: [x, -0.18], to: [x, -0.3], w: 0.004, col: INK })),
  ],
  acc: [{ kind: "hood", col: "#241044", shade: "#0c0614", trim: GOLD, point: 0.04 }],
  outfit: [
    { kind: "robe", col: "#0c0614", shade: INK, trim: GOLD, ink: INK },
    { kind: "cape", col: "#1a1030", shade: INK, trim: "#e6b43a", clasp: GOLD },
  ],
  hands: { kind: "flipper", skin: "#8a8678" },
  blinkEvery: 0,
  poses: {
    stand: { head: { rx: 0.03 }, armR: arm(1.51, -0.16, 0.23, -1.05), wristR: wr(-0.05, 1, 0.4) },
    hold: { armR: arm(2.55, -0.1, 0.3, -1.0), head: { rx: -0.1 } },
    "look-up": { head: { rx: -0.35, ry: 0.15 } },
  },
  extras(engine, h) {
    return [h.attach(pauldrons(engine), "body"), h.attach(ainzStaff(engine), "handR"), h.attach(rings(engine), "handR"), h.attach(collar(engine), "body")];
  },
};
