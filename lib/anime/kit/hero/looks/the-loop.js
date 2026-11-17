// LOOK the-loop: the seal as Anos Voldigoad (Maou Gakuin, SILVER LINK.). Flat black swept hair with one forelock over the brow,
// heavy-lidded crimson eyes (the Magic Eyes variant adds the emblem), a black academy jacket with a white-trimmed stand collar.
import { HAIR_PRESETS } from "../hair.js";
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";

HAIR_PRESETS.anos = { gen: "flow", style: "swept", forelock: 1 };
const INK = "#42322c";

const base = {
  fur: { coat: "#9a9fb0", shade: "#6f7488", belly: "#f8eee0", bellyShade: "#cdbfb9", nose: "#3a3338", ink: "#5b4d4c", blush: null, poreCol: "#6f6a86" },
  eyes: { style: "ring", iris: "#db202b", iris2: "#8c1220", size: 0.98, lash: "#2a1a22", catchlight: { col: "#ff5a5a", glow: 2.2, n: 1, size: 0.3, k: 1 } },
  brows: { col: "#171018", thick: 1.05 },
  mouth: { rest: ["smile", 0.45], sharp: 0.3 },
  hair: { preset: "anos", col: "#171018", shade: "#0c070d", hi: "#3a2a3e", seed: 39, cap: { front: 0.95, back: 1.9, zig: 0.14, n: 9 } },
  marks: [],
  outfit: [{ kind: "uniform", col: "#1b1620", shade: "#0e0a12", trim: "#e9e4ea", buttons: 4, collar: "stand", ink: INK }],
  hands: { kind: "flipper" },
  extras() { Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions); return []; },
};
export default base;

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const both = (a, w, h) => ({ armR: a, armL: { ...a }, wristR: w, wristL: { ...w }, handR: h, handL: h });

export const poses = {
  // power: both flippers flung wide and up, the body stretched (f26 to f29)
  "loop-power": (k) => ({ y: 0.08 * k, rx: -8 * Math.PI / 180 * k, sy: 1 + 0.05 * k, sxz: 1 - 0.025 * k, head: { rx: -0.1 * k }, ...both(arm(2.4, 0.95, 0.15, -0.3), wr(-0.15, -1.1, -0.2), "open") }),
  // fly: flippers swept back along the flanks, chest forward
  "loop-fly": (k) => ({ y: 0.1 * k, rx: 14 * Math.PI / 180 * k, head: { rx: -0.12 * k }, ...both(arm(-0.9, 0.55, 0.2, 0.1), wr(0.1, 0.4, 0.1), "open") }),
};
export const expressions = {
  // lids at 45 percent, mouth shut: calm and unbothered
  "loop-calm": { eyes: "calm", brow: [0.02, 0.002], mouth: ["closed", 0], adj: { lid: 0.15 }, head: { rz: 0.02 } },
  // set jaw, lids 70 percent
  "loop-set": { eyes: "rage", brow: [0.1, -0.002], mouth: ["closed", 0], adj: { lid: 0.2 } },
  "loop-smile": { eyes: "smug", brow: [0.05, 0.002], mouth: ["smile", 0.45], head: { rz: 0.03 } },
};

// the default already wears the Magic Eyes emblem; kept as a named variant for callers
export const magic = base;
