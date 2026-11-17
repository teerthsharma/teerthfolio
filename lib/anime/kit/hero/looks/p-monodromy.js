// LOOK p-monodromy: the seal as Sinbad in Focalor Djinn Equip (Magi: The Labyrinth of Magic, A-1 Pictures). Long
// black mane, amber eyes, gold circlet and necklace, red sash with hanging panels, two red scarves whipping up
// and out, a black feather wing cloak and flat black cut markings on a blue-grey coat. Spec for kit/hero.js plus
// `extras(engine, h)` and the named `poses` / `expressions` the cutscene calls (channel sets for ctx.seal.set()).
import { HERO_EXPRESSIONS } from "../../hero.js";
import { variant } from "./_merge.js";
import { dressSinbad } from "./p-monodromy.parts.js";

const GOLD = "#d9a83a", GOLD_SH = "#a8741a", MANE = "#1a1424", MANE_SH = "#0b0916", MANE_HI = "#6967b1";

const look = {
  fur: { coat: "#86a2cc", shade: "#455d78", belly: "#f8eee0", bellyShade: "#cdbfb4", nose: "#2c2a3a", ink: "#1a384b", blush: null },
  eyes: { style: "tsurime", iris: "#8a5e1a", iris2: "#e0b040", pupil: "round", size: 1.0, lash: "#110c10" },
  brows: { col: MANE, thick: 1.25 },
  mouth: { rest: "smile", sharp: 0.2 },
  hair: {
    preset: "long", col: MANE, shade: MANE_SH, hi: MANE_HI, width: 0.14, spike: 0.3, curl: 0.06, seed: 9,
    cap: { front: 0.72, back: 1.9, zig: 0.05, n: 7, crown: 0.03 },
    parts: [
      { band: [0.3, 1.7], sector: [0.95, 5.33], count: 20, layers: 2, length: [0.34, 0.6], lift: 0.15, droop: 1.8, sweep: [0, -0.1, -0.7] },
      { band: [0, 0.75], count: 12, layers: 1, length: [0.16, 0.28], lift: 0.3, droop: 1.2, sweep: [0, 0.05, -1.1], spike: 0.25 },
    ],
  },
  marks: [{ kind: "dot", at: [0, 0.68], w: 0.022, col: GOLD }],
  acc: [{ kind: "circlet", col: GOLD, shade: GOLD_SH }],
  outfit: [
    { kind: "sash", col: "#b32a3a", shade: "#6a1424", ink: "#2a0c14" },
    { kind: "necklace", col: GOLD, shade: GOLD_SH, },
    { kind: "bands", col: GOLD, shade: GOLD_SH },
  ],
  hands: { kind: "flipper", skin: "#5a7aa8" },
  extras(engine, h) {
    Object.assign(HERO_EXPRESSIONS, look.expressions);
    const out = dressSinbad(engine, h), q = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("pose");
    if (q && look.poses[q]) h.set(look.poses[q]);
    return out;
  },
  // channel sets for ctx.seal.set(): out = flippers spread, palms open (5.0 s); join = flippers meet at the crown, the highest the arms reach (6.5 s)
  poses: {
    low: { rx: -0.05, head: { rx: -0.1 } },
    out: { y: 0.03, head: { rx: -0.05 }, armR: { sx: 1.0, sz: 1.35, elbow: 0.3, sy: 0 }, armL: { sx: 1.0, sz: 1.35, elbow: 0.3, sy: 0 }, wristR: { rx: 0, ry: 0, rz: 0 }, wristL: { rx: 0, ry: 0, rz: 0 } },
    join: { y: 0.1, head: { rx: 0.22 }, armR: { sx: 2.8, sz: -0.5, elbow: 0, sy: 0 }, armL: { sx: 2.8, sz: -0.5, elbow: 0, sy: 0 }, wristR: { rx: 0, ry: 0, rz: 0 }, wristL: { rx: 0, ry: 0, rz: 0 } },
    settle: { y: -0.02, head: { rx: 0.08 } },
    stare: { head: { rx: 0.0, ry: 0 }, rx: 0 },
    grip: { armR: { sx: 1.2, sz: 0.2, elbow: 0.9, sy: 0 }, handR: "fist" },
    raiseOne: { armR: { sx: 3.0, sz: 0.52, elbow: 0.1, sy: 0 }, armL: { sx: 0.2, sz: 0.1, elbow: 0.2, sy: 0 } },
  },
  expressions: {
    "sinbad-focus": { eyes: "rage", eyesK: 0.5, brow: [0.3, 0.004], mouth: ["closed", 0.2] },
    "sinbad-smirk": { eyes: "calm", brow: [-0.06, 0.006], mouth: ["smile", 0.5] },
    "sinbad-set": { eyes: "calm", brow: [0.2, 0.003], mouth: ["smile", 0.4] },
    "sinbad-exhale": { eyes: "calm", brow: [-0.05, 0.004], mouth: ["open", 0.2] },
    "sinbad-cry": { eyes: "rage", eyesK: 0.9, brow: [0.5, 0.007], mouth: ["open", 1] },
  },
};

// the equip (T20): Baal's electric armour over the same face; the fur stays grey-blue (no tint on the coat)
const goldBands = look.outfit.map((o) => (o.kind === "bands" ? { ...o, col: "#e9b23a", shade: "#a8741a" } : o));
export const baal = variant(look, {
  outfit: [...goldBands, { kind: "cuirass", col: "#2e5fff", shade: "#14308a", trim: "#7fd8ff" }, { kind: "bracers", col: "#2e5fff", shade: "#14308a", trim: "#7fd8ff" }],
  acc: [...look.acc, { kind: "earrings", col: "#e9b23a", shade: "#a8741a" }],
  eyes: { ...look.eyes, catchlight: { col: "#7fd8ff", glow: 2.2, n: 2 } },
  marks: [...look.marks,
    { kind: "arc", at: [0.34, 0.1], to: [0.44, -0.2], w: 0.006, w1: 0.002, col: "#7fd8ff" },
    { kind: "arc", at: [-0.34, 0.1], to: [-0.44, -0.2], w: 0.006, w1: 0.002, col: "#7fd8ff" },
    { kind: "line", at: [0, 0.68], to: [0, 0.5], w: 0.008, w1: 0.003, col: "#7fd8ff" }],
});

export default look;
