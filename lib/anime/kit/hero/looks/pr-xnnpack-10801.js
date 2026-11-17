// LOOK pr-xnnpack-10801: the seal as Sosuke Aizen (Bleach, Pierrot TV, the E61 reveal). Hair swept back off the brow with
// one forelock, calm half-lidded brown eyes, the white captain's haori (coral shade) over black shihakusho, the kanji 5 on
// the back, and the unhurried smile. No glasses (he has just dropped them). Nothing is held.
import { HAIR_PRESETS } from "../hair.js";
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { bladeFigures, forelockFigure, kanjiFigure } from "./pr-xnnpack-10801.parts.js";

HAIR_PRESETS.aizen = { gen: "flow", style: "slick", forelock: 1 };
const HAIR = "#946248", HAIR_SH = "#6a4230", HAIR_HI = "#b98460";

const base = {
  fur: { coat: "#86aad6", shade: "#7690b9", belly: "#f8eee0", bellyShade: "#c9bcb9", nose: "#3a3338", ink: "#3a2a1c", blush: null, poreCol: "#76614f" },
  eyes: { style: "tareme", iris: "#4a2e1e", iris2: "#2e1a10", pupil: "none", size: 0.92, lash: "#1a1010" },
  brows: { col: "#7a5238", thick: 1 },
  mouth: { rest: "smile", sharp: 0 },
  hair: { preset: "aizen", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, seed: 61, cap: { front: 0.78, back: 1.9, zig: 0.14, n: 9 } },
  marks: [],
  acc: [],
  outfit: [
    { kind: "gi", col: "#1a1a28", shade: "#0c0c16", trim: "#2a2a3a", ink: "#2a2a3a" },
    { kind: "haori", col: "#f5f6ff", shade: "#f2d0c6", motif: null, sleeves: "fitted", trim: "#e9e9f6", cuffTrim: "#e9e9f6", hemCol: "#e9e9f6", ink: "#4a4256" },
  ],
  hands: { kind: "flipper" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    h.kyoka = bladeFigures(engine);
    return [h.attach(kanjiFigure(engine), "body"), h.attach(forelockFigure(engine), "head")];
  },
};
export default base;

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const poses = {
  // B2/B3 throne: back against the seat, the left flipper on the armrest, the right in the lap
  "aizen-sit": (k) => ({ y: -0.06 * k, rx: -14 * Math.PI / 180 * k, sy: 1 - 0.04 * k, sxz: 1 + 0.02 * k, head: { rx: 0.04 * k }, armL: arm(0.7, 0.55, 0.9, -0.4), wristL: wr(-0.1, 0.4, 0.2), armR: arm(0.95, 0.15, 0.7, -1.7), wristR: wr(-0.2, 0.8, 0.4) }),
  // B3 look: the head tips down toward the stair, the right flipper hovers level with the muzzle
  "aizen-look": (k) => ({ y: -0.05 * k, rx: -10 * Math.PI / 180 * k, head: { rx: 0.32 * k, rz: 0.05 * k }, armL: arm(0.7, 0.55, 0.9, -0.4), wristL: wr(-0.1, 0.4, 0.2), armR: arm(1.75, 0.45, 1.2, -0.4), wristR: wr(-0.4, -0.3, 0.1) }),
  // the sweep of the hair back: the flipper to the brow
  "aizen-sweep": (k) => ({ head: { rx: -0.06 * k, rz: 0.06 * k }, armR: arm(2.2, 0.35, 1.9, -0.3), wristR: wr(-0.3, -0.5, 0.1) }),
};

export const expressions = {
  // the lids at 40 percent shut: calm, unreadable, the smile one notch up
  "aizen-calm": { eyes: "calm", brow: [-0.02, 0.004], mouth: ["smile", 0.35], adj: { lid: 0.4, open: -0.04 }, head: { rz: 0.02 } },
  "aizen-smile": { eyes: "smug", brow: [0.06, 0.003], mouth: ["smile", 0.85], adj: { lid: 0.3 }, head: { rz: 0.05 } },
};
