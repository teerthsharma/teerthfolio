// LOOK p-nerve: the seal as Light Yagami (Death Note, Madhouse). Side-swept brown bangs falling over the brow,
// narrow amber eyes under a hard lid, white shirt with a dark tie, the red Death Note in the right flipper, and
// the half-smile that turns to a red-ringed stare. Spec for kit/hero.js plus `extras`, `poses`, `expressions`.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { notebook, tieShell } from "./p-nerve.parts.js";

const HAIR = "#8f6a40", HAIR_SH = "#523820", HAIR_HI = "#d0aa74";

const base = {
  fur: { coat: "#86aad6", shade: "#3f515e", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2e2a30", ink: "#221c0c", blush: null },
  eyes: { style: "tsurime", iris: "#a8662a", iris2: "#5a3216", pupil: "round", size: 1.08, lash: "#20150c", sclera: "#dfe0d8" },
  brows: { col: "#6a4a2a", thick: 0.85 },
  mouth: { rest: ["smile", 0.25], sharp: 0.3 },
  hair: {
    preset: "swept", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, width: 0.075, spike: 0.55, seed: 21,
    cap: { front: 0.85, back: 2.0, zig: 0.06, n: 7, t: 0.008 },
    cut: { at: [0.3, 0.62], slant: 0.18, rate: 0.9 },
    parts: [
      { band: [0.05, 1.0], sector: [-Math.PI, Math.PI], count: 12, layers: 2, length: [0.1, 0.16], width: 0.095, lift: 0.22, droop: 0.7, spike: 0.3, sweep: [0.12, -0.05, -0.2], curl: 0.02 },
      { band: [0.2, 0.8], sector: [-1.4, 1.4], count: 6, layers: 1, length: [0.16, 0.22], width: 0.11, thick: 0.3, lift: 0.3, droop: 1.1, spike: 0.3, sweep: [0.5, -0.25, 0.2], curl: 0.03 },
      { band: [0.78, 1.05], sector: [-1.1, 1.1], count: 8, layers: 1, length: [0.13, 0.2], width: 0.115, thick: 0.3, lift: 0.14, droop: 1.0, spike: 0.35, sweep: [0.35, -0.5, 0.5], curl: 0.04 },
      { band: [0.95, 1.1], sector: [-0.25, 0.25], count: 2, layers: 1, length: [0.2, 0.25], width: 0.075, thick: 0.3, lift: 0.1, droop: 1.5, spike: 0.55, sweep: [0.1, -0.8, 0.5] },
      { band: [0.8, 1.5], sector: [0.95, 1.7], count: 4, layers: 1, length: [0.14, 0.2], width: 0.085, lift: 0.18, droop: 1.8, spike: 0.5, sweep: [0.12, -0.8, 0] },
      { band: [0.8, 1.5], sector: [-1.7, -0.95], count: 4, layers: 1, length: [0.14, 0.2], width: 0.085, lift: 0.18, droop: 1.8, spike: 0.5, sweep: [-0.12, -0.8, 0] },
    ],
  },
  marks: [],
  acc: [],
  outfit: [{ kind: "uniform", col: "#ecebe7", shade: "#a9b0c4", collar: "open", shirt: "#f4f3ef", lapel: "#cfd3df", buttons: 0, hem: 0.1, cuffAt: 0.03, trim: "#cfd3df", ink: "#4a4a58" }],
  hands: { kind: "flipper", skin: "#5a7aa8" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    const book = notebook(engine);
    book.position.set(0.012, -0.085, 0.01);
    h.attach(book, "handR");
    // the cover turns from the side (held low) to the lens (raised) with the arm lift, a pure function of the channels
    const update = h.update;
    h.update = (ts) => { const r = update(ts), k = Math.min(1, Math.max(0, (h.ch.armR.sx - 0.8) / 0.6)); book.rotation.y = Math.PI / 2 * k * k * (3 - 2 * k); return r; };
    h.update(0);
    return [h.attach(tieShell(engine), "body"), book];
  },
};
export default base;

// the kill beat: the amber ring turns red and glows
export const kill = { ...base, eyes: { ...base.eyes, iris: "#b3171f", iris2: "#6a0a10", glow: 0.5 } };

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

// pose functions in the shared (k, t) -> channel-deltas form
export const poses = {
  // the notebook held low in the right flipper, chest forward
  "nerve-hold": (k) => ({ rx: 3 * k * Math.PI / 180, armR: arm(0.55, 0.3, 1.15, -0.5), wristR: wr(-0.1, 0.4, 0), head: { rx: 0.04 * k } }),
  // the folio shown to the lens, head tilted 0.21 rad
  "nerve-show": (k) => ({ rx: -6 * k * Math.PI / 180, y: 0.02 * k, armR: arm(1.6, 0.1, 0.9, -0.6), wristR: wr(-0.1, 0.5, 0.1), head: { rx: -0.05 * k, rz: 0.21 * k } }),
  // the free flipper out toward Ryuk with the apple (screen right: the hero's left arm)
  offer: (k) => ({ head: { ry: 0.25 * k }, armL: arm(1.25 * k, 0.55 * k, 0.35 * k, 0.2 * k), handL: "open" }),
  // the notebook hand held still, the pen hand writing
  write: (k) => ({ rx: 0.05 * k, head: { rx: 0.12 * k }, armR: arm(1.05 * k, 0.2 * k, 1.3 * k, -0.4 * k), wristR: wr(-0.3 * k, 0.3 * k, 0), armL: arm(0.55 * k, 0.3 * k, 1.15 * k, -0.5 * k) }),
  // the chip to the mouth: the eating hand is the left (the chip is in it, as in the live move); the sheet's armR would lift the notebook hand
  eat: (k) => ({ head: { rx: -0.05 * k }, armL: arm(1.5 * k, 0.1 * k, 1.75 * k, -0.2 * k), wristL: wr(0, 0.2 * k, 0.1 * k), handL: "fist" }),
};

export const expressions = {
  // the half-smile: lidded amber eyes, one brow up
  kira: { eyes: "smug", eyesK: 0.8, brow: [0.2, 0.004], tilt: -0.25, raise: 0.004, mouth: ["smile", 0.4], head: { rz: 0.05, rx: -0.03 } },
  // the unblinking stare: eyes wide open and fixed, brows level and low
  stare: { eyes: "neutral", brow: [0.15, 0.006], mouth: ["closed", 0.1], head: { rx: 0.04 } },
};
