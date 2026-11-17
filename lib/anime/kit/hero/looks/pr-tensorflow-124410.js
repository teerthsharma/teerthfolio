// LOOK pr-tensorflow-124410: the seal as DIO (JoJo Part 3, David Production). Swept-up blond mane, red tsurime eyes under a heavy
// brow, green heart headband, open yellow jacket over a black shirt, gold bracers and a bead belt. Named poses `dio-*`.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { headband, mane } from "./pr-tensorflow-124410.parts.js";

const base = {
  fur: { coat: "#9db4d2", shade: "#5a6680", belly: "#f8eee0", bellyShade: "#cfc4b8", nose: "#2a2024", ink: "#120d04", blush: null, poreCol: "#8497b4" },
  eyes: { style: "tsurime", iris: "#d02a3a", iris2: "#5a0a1a", size: 0.9, lash: "#120d04" },
  brows: { col: "#3a2a10", thick: 2.4 },
  mouth: { rest: "smile", sharp: 0.9 },
  hair: null,
  marks: [],
  acc: [],
  outfit: [
    { kind: "jacket", col: "#e6ac2c", shade: "#8a5a10", trim: "#ffd24a", collar: "open", shirt: "#262640", lapel: "#ffd24a", buttons: 0, ink: "#120d04" },
    { kind: "belt", col: "#3a2008", buckle: "#d0a020", beads: "#e8b82c", at: 0.19 },
    { kind: "bracers", col: "#e8b82c", studs: true },
  ],
  hands: { kind: "flipper" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    return [h.attach(mane(engine), "head"), h.attach(headband(engine), "head")];
  },
};
export default base;

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const D2 = Math.PI / 180;
const step = (t) => Math.floor(t * 12) / 12;
export const poses = {
  // the stride: weight forward, a slow lean from side to side on twos
  "dio-walk": (k, t) => ({ rx: 5 * D2 * k, rz: 2.5 * D2 * Math.sin(step(t) * 6.5) * k, y: 0.01 * Math.abs(Math.sin(step(t) * 6.5)) * k, head: { rx: 0.05 * k, rz: -0.03 * k } }),
  // head down, shoulders rolled forward, flippers hanging: the brow takes the light
  "dio-brood": (k) => ({ rx: 11 * D2 * k, y: -0.02 * k, sy: 1 - 0.05 * k, sxz: 1 + 0.04 * k, head: { rx: 0.3 * k }, armR: arm(0.5, 0.55, 0.9, -0.5), wristR: wr(0.3, 0.8, 0), armL: arm(0.5, 0.55, 0.9, -0.5), wristL: wr(0.3, 0.8, 0) }),
  // MUDA: the lunge, both flippers driving forward in turn on twos (a pure function of the stepped time)
  "dio-muda": (k, t) => {
    const a = Math.floor(t * 12) % 2, out = arm(1.51, -0.16, 0.23, -1.05), back = arm(1.15, 0.2, 1.5, -1.0);
    return { z: 0.12 * k, rx: (12 + 3 * a) * D2 * k, ry: (a ? 6 : -6) * D2 * k, sy: 1 - 0.04 * k, sxz: 1 + 0.04 * k, head: { rx: 0.16 * k, ry: (a ? -0.08 : 0.08) * k }, armR: a ? out : back, armL: a ? back : out, wristR: wr(-0.05, 1, 0.4), wristL: wr(-0.05, 1, 0.4), handR: "fist", handL: "fist" };
  },
  // the stop: right flipper out, palm forward, the other hand on the hip
  "dio-stop": (k) => ({ rz: -4 * D2 * k, rx: -2 * D2 * k, head: { rx: 0.04 * k, rz: 0.05 * k }, armR: arm(1.6, 0.05, 0.3, -0.9), wristR: wr(-0.6, 0.1, 0.8), handR: "flat", armL: arm(0.6, 0.55, 1.5, -0.7), wristL: wr(0.4, 0.9, -0.2) }),
  // the JoJo pose: hips cocked, the body twisted, one flipper bent across the brow
  "dio-jojo": (k) => ({ y: -0.02 * k, rz: -14 * D2 * k, ry: 20 * D2 * k, rx: 4 * D2 * k, sy: 1 - 0.05 * k, sxz: 1 + 0.04 * k, head: { rz: 0.16 * k, rx: -0.05 * k, ry: -0.18 * k }, armR: arm(1.87, 0.99, 1.82, -0.44), wristR: wr(-0.08, -0.64, -0.11), handR: "flat", armL: arm(-0.77, 0.88, 1.82, -0.18), wristL: wr(-0.44, 0.68, 0.61) }),
};
export const expressions = {
  // the DIO smirk: half-lidded red eyes, one brow cocked, the mouth turned up
  "dio-smirk": { eyes: "smug", eyesK: 0.8, brow: [0.3, 0.006], tilt: -0.3, mouth: ["smile", 0.8], adj: { lid: 0.18 }, head: { rz: 0.05, rx: -0.03 } },
  // under the brow: eyes shadowed, the jaw set
  "dio-menace": { eyes: "rage", eyesK: 0.6, brow: [0.5, 0.008], mouth: ["closed", -0.2], adj: { lid: 0.2, pupil: -0.1 }, look: [0, 0.05], head: { rx: 0.12 } },
  // the barrage: mouth wide, brow driven down
  "dio-muda": { eyes: "rage", eyesK: 0.9, brow: [0.55, 0.01], mouth: ["open", 0.9], head: { rx: 0.06 } },
};
