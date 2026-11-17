// LOOK pr-openxla-46539: the seal as All Might (My Hero Academia, Bones). Gold swept hair with two antenna bangs,
// thick gold brows over dark-blue eyes, the wide heroic grin, blue suit with red side and chest panels, white
// collar and V, gold belt, red gloves with pale cuffs. Spec for kit/hero.js plus `extras(engine, hero)` and the
// named `poses` (cock, smash, usfist) and `expressions` (stare) the cutscene calls.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { antennae, costumeTrim, gloveCuff } from "./pr-openxla-46539.parts.js";

const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

const look = {
  fur: { coat: "#9a9ca8", shade: "#565c80", belly: "#f8eee0", bellyShade: "#d6c9c0", nose: "#2e2830", ink: "#241e36", blush: null, poreCol: "#76614f" },
  eyes: { style: "round", iris: "#2f7fd0", iris2: "#10244e", pupil: "round", size: 1.05, lash: "#14121e" },
  brows: { col: "#a8902c", thick: 2.8 },
  mouth: { rest: "smile", sharp: 0.1 },
  hair: {
    preset: "spiky", col: "#e6c84a", shade: "#817029", hi: "#fff1a0", width: 0.1, spike: 0.85, seed: 9,
    cap: { front: 0.82, back: 1.4, zig: 0.14, n: 9, t: 0.012, crown: 0.03 },
    parts: [
      { band: [0.05, 0.6], sector: [-0.8, 0.8], count: 5, layers: 1, length: [0.15, 0.22], lift: 0.8, droop: 0.05, sweep: [0, 0.9, 0.25], curl: 0.02 },
      { band: [0.8, 1.2], sector: [0.9, 5.4], count: 12, layers: 2, length: [0.07, 0.12], lift: 0.4, droop: 0.4, sweep: [0, -0.1, -0.3], width: 0.09, spike: 0.5 },
    ],
  },
  marks: [
    ...[[0.16, -0.3], [0.27, -0.36], [0.2, -0.46]].flatMap(([u, v]) => [{ kind: "dot", at: [u, v], w: 0.0065, col: "#76614f" }, { kind: "dot", at: [-u, v], w: 0.0065, col: "#76614f" }]),
    ...[1, -1].map((s) => ({ kind: "arc", at: [s * 0.4, 0.02], to: [s * 0.3, -0.26], w: 0.007, w1: 0.002, col: "#241e36", bend: s * -0.18 })),
    // the heavy brow line over each eye, All Might's signature brow shadow
    ...[1, -1].map((s) => ({ kind: "arc", at: [s * 0.2, 0.44], to: [s * 0.58, 0.5], w: 0.017, w1: 0.007, col: "#a8902c", bend: s * -0.12 })),
  ],
  acc: [],
  outfit: [{ kind: "uniform", col: "#162a6a", shade: "#0a1236", trim: "#e8e4da", ink: "#0d0b22", buttons: 0, collar: "open", shirt: "#e8e4da", lapel: "#c02a30", hem: 0.07, cuffs: false, cuffAt: 0.055 }],
  hands: { kind: "human", skin: "#c02a30" },
  extras(engine, h) {
    return [h.attach(costumeTrim(engine), "body"), h.attach(antennae(engine), "head"), h.attach(gloveCuff(engine), "foreR"), h.attach(gloveCuff(engine), "foreL")];
  },
  poses: {
    // the cocked right flipper, drawn back behind the head with the shoulder turned away
    cock: (k) => ({ ry: 22 * D2 * k, rx: 4 * D2 * k, head: { rx: 0.05 * k, ry: -0.1 * k }, armR: arm(2.4, 0.9, 1.2, -0.8), wristR: wr(0, 0.4, 0), handR: "fist", armL: arm(0.6, 0.35, 0.5, -0.5), wristL: wr(0, 0.4, 0), handL: "fist" }),
    // the punch: straight right arm at the victim, body leaning forward 12 degrees
    smash: (k) => ({ rx: 12 * D2 * k, z: 0.1 * k, ry: -8 * D2 * k, head: { rx: 0.05 * k }, armR: arm(1.57, 0.02, 0, -0.5), wristR: wr(0, 0.5, 0), handR: "fist", armL: arm(0.4, 0.6, 0.9, -0.5), wristL: wr(0.2, 0.5, 0), handL: "fist" }),
    // United States of Smash: the fist raised straight up, body upright, tall on the tail
    usfist: (k) => ({ y: 0.03 * k, sy: 1 + 0.04 * k, sxz: 1 - 0.02 * k, head: { rx: -0.05 * k }, armR: arm(3.1, 0.15, 0.05, -0.3), wristR: wr(-0.1, 0.2, 0), handR: "fist", armL: arm(0.2, 0.62, 0.8, -0.6), wristL: wr(0.3, 0.7, -0.1), handL: "fist" }),
  },
  expressions: {
    // brows pulled down toward the eyes (drop) and angled in: All Might's brow is thick and low
    hero_calm: { eyes: "smug", eyesK: 0.3, brow: [0.22, 0.02], mouth: ["smile", 1] },
    hero_grin: { eyes: "smug", eyesK: 0.45, brow: [0.3, 0.022], mouth: ["grin", 0.9], head: { rx: 0.03 } },
    hero_grit: { eyes: "rage", eyesK: 0.7, brow: [0.5, 0.022], mouth: ["snarl", 0.7], head: { rx: 0.06 } },
    hero_yell: { eyes: "calm", brow: [0.55, 0.022], mouth: ["open", 1], head: { rx: -0.04 } },
    hero_stare: { eyes: "rage", eyesK: 0.5, brow: [0.3, 0.02], mouth: ["closed", 0.1], head: { rx: 0.06 } },
  },
};

// the shared motion tables look poses up by name, so the three poses and the expression register there once
Object.assign(HERO_POSES, look.poses);
Object.assign(HERO_EXPRESSIONS, look.expressions);
export default look;
