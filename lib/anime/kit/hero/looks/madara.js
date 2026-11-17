// LOOK madara: the seal as Madara Uchiha (Naruto Shippuden, Fourth Shinobi War, Edo Tensei armour). One filled blue-black mane with a jagged edge and
// heavy bangs, red slit eyes, dark undersuit under separate red plates and a cream rope belt, the gunbai on the back or held forward.
import { variant } from "./_merge.js";
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { armourFigure, gunbaiFigure, maneFigure } from "./madara.parts.js";

const INK = "#17120f";

const base = {
  fur: { coat: "#9b99a2", shade: "#6d6b7d", belly: "#f1e6d4", bellyShade: "#c8bab4", nose: "#3a2a30", ink: INK, blush: "#d98a84" },
  eyes: { style: "tsurime", iris: "#f2191f", iris2: "#8c0514", pupil: "slit", size: 0.98, lash: INK, catchlight: { col: "#fff4e4", glow: 1.4, n: 2, at: [-0.3, 0.34], size: 0.24, k: 1 } },
  brows: { col: INK, thick: 1.3 },
  mouth: { rest: "closed", sharp: 0.4 },
  hair: { preset: "spiky", col: "#2b2535", shade: "#0f0b14", hi: "#5f5580", count: 0, layers: 1, cap: { front: 0.7, back: 1.9, zig: 0.12, n: 11, crown: 0.02 } },
  outfit: [
    { kind: "uniform", col: "#232030", shade: "#0c0a14", trim: "#2e2a42", buttons: 0, collar: "high", cuffAt: 0.05 },
    { kind: "bands", col: INK },
  ],
  hands: { kind: "flipper" },
  cool: { expr: "madara-calm", pose: "madara-cross", rim: "#4aa8ff" },
  extras(engine, h) {
    const host = h.subs?.madara ?? h, back = gunbaiFigure(engine), hand = gunbaiFigure(engine);
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    back.position.set(0, 0.3, -0.5); back.rotation.set(0, Math.PI, 0.5);
    hand.position.set(0, -0.05, 0); hand.rotation.set(Math.PI / 2, 0, -0.4); hand.scale.setScalar(0.7); hand.visible = false;
    const out = [host.attach(armourFigure(engine), "body"), host.attach(maneFigure(engine), "head"), host.attach(back, "body"), host.attach(hand, "handR")], update = host.update;
    host.update = (ts) => { FWD.k = 0; const r = update(ts); hand.visible = FWD.k >= 0.35; back.visible = !hand.visible; return r; };
    return out;
  },
};
export default base;

export const sharingan = variant(base, { eyes: { pupil: "tomoe" } });
export const rinnegan = variant(base, { eyes: { iris: "#b79ad8", iris2: "#6a4f9c", pupil: "ring" } });

const FWD = { k: 0 };
const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const poses = {
  // the signature: arms crossed on the chest, chin up
  "madara-cross": (k) => ({ rx: -4 * D2 * k, y: 0.008 * k, head: { rx: -0.06 * k, rz: 0.03 * k }, armR: arm(1.45, -0.59, 0.66, -2.03), wristR: wr(0.35, 0.2, 0.78), armL: arm(1.49, -0.6, 0.51, -1.97), wristL: wr(0.06, 0.03, 0.67) }),
  // calling the meteor: the right flipper straight up, the left swept back, head thrown back
  "madara-cast": (k) => ({ y: 0.04 * k, rx: -7 * D2 * k, sy: 1 + 0.03 * k, head: { rx: -0.22 * k, ry: -0.08 * k }, armR: arm(2.9, 0.35, 0.1, -0.3), wristR: wr(-0.15, -1, -0.2), armL: arm(-0.77, 0.88, 1.82, -0.18), wristL: wr(-0.44, 0.68, 0.61) }),
  // the fan out in front of the body in the right flipper, left arm folded, turned a quarter away
  "madara-gunbai": (k) => { FWD.k = Math.max(FWD.k, k); return { rx: 4 * D2 * k, ry: -0.22 * k, z: 0.04 * k, head: { rx: 0.03 * k, ry: 0.18 * k, rz: 0.04 * k }, armR: arm(1.4, 0.5, 0.5, -0.3), wristR: wr(0.2, 0.3, 0.4), armL: arm(1.49, -0.6, 0.51, -1.97), wristL: wr(0.06, 0.03, 0.67) }; },
};

export const expressions = {
  "madara-calm": { eyes: "calmCut", brow: [0.22, 0.006], mouth: ["closed", 0.05], head: { rx: -0.04 } },
  "madara-smirk": { eyes: "smirk", brow: [0.2, 0.004], tilt: -0.15, mouth: ["smirk", 0.8], head: { rz: 0.06, rx: -0.06, ry: -0.05 } },
  "madara-eyes-lit": { eyes: "eyesLit", brow: [0.3, 0.005], mouth: ["closed", 0.05], head: { rx: -0.04 } },
};
