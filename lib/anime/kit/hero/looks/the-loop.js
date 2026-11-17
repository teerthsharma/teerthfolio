// LOOK the-loop: the seal as Anos Voldigoad (Maou Gakuin, SILVER LINK.). Flat black swept hair with one forelock over the brow,
// heavy-lidded crimson eyes (the Magic Eyes variant adds the emblem), a black academy jacket with a white-trimmed stand collar.
import { HAIR_PRESETS } from "../hair.js";
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";

HAIR_PRESETS.anos = { gen: "flow", style: "swept", forelock: 1 };
const INK = "#42322c";

const base = {
  fur: { coat: "#f1e7e8", shade: "#9b8784", belly: "#f8eee0", bellyShade: "#cdbfb9", nose: "#3a3338", ink: "#5b4d4c", blush: null, poreCol: "#cdbfb9" },
  eyes: { style: "ring", iris: "#db202b", iris2: "#8c1220", size: 0.98, lash: "#2a1a22", catchlight: { col: "#ff5a5a", glow: 2.2, n: 1, size: 0.3, k: 1 } },
  brows: { col: "#171018", thick: 1.05 },
  mouth: { rest: ["smile", 0.45], sharp: 0.3 },
  hair: { preset: "anos", col: "#171018", shade: "#0c070d", hi: "#3a2a3e", seed: 39, cap: { front: 0.8, back: 0.9, zig: 0.1, n: 11 } },
  marks: [],
  outfit: [{ kind: "uniform", col: "#1b1620", shade: "#0e0a12", trim: "#e9e4ea", buttons: 4, collar: "stand", ink: INK }],
  hands: { kind: "flipper" },
  cool: { expr: "loop-calm", pose: "loop-power" },
  extras() { Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions); return []; },
};
export default base;

// a seeded flap on the 12 fps drawings from t0 to t1: open runs and shut runs of 1 to 3 drawings, the last drawing shut
export function speak(t0, t1, seed = 39) {
  let a = seed | 0;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const out = [], k0 = Math.round(t0 * 12), k1 = Math.round(t1 * 12);
  let talk = true, run = 0;
  for (let d = k0; d < k1; d++) {
    if (run === 0) { talk = !talk; run = 1 + Math.floor(rnd() * 3); }
    run--;
    out.push({ t: d / 12, expr: talk && d < k1 - 1 ? "talk" : "loop-calm", dur: 1 / 12, hold: 0, out: 1 / 12 });
  }
  return out;
}

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
  talk: { eyes: "calm", brow: [0.02, 0.002], mouth: ["open", 0.3], adj: { lid: 0.15 } },
};

// the default already wears the Magic Eyes emblem; kept as a named variant for callers
export const magic = base;
