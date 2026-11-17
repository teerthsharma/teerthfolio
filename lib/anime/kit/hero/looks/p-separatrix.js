// LOOK p-separatrix: the seal as Giorno Giovanna (JoJo's Bizarre Adventure: Golden Wind, David Production). Golden
// pompadour with three coils a side and a beaded braid, green eyes, pink suit with heart windows and ladybug
// brooches, the clenched-flipper stance. Spec for kit/hero.js plus `extras(engine, hero)` and the named `poses`.
import { braid, brooches, coils, jacketShell, pompadour } from "./p-separatrix.parts.js";

const GOLD = "#f5c518", GOLD_SH = "#d9a02c", GOLD_HI = "#f8e08a";

export default {
  fur: { coat: "#86aad6", shade: "#3f5066", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2e2630", ink: "#2a1a24", blush: null },
  eyes: { style: "tsurime", iris: "#3fbf8a", iris2: "#1f7a5a", pupil: "round", size: 1.05, lash: "#120c0d" },
  brows: { col: "#b9803a", thick: 1.1 },
  mouth: { rest: "closed", sharp: 0.1 },
  hair: {
    preset: "swept", col: GOLD, shade: GOLD_SH, hi: GOLD_HI, width: 0.1, spike: 0.12, seed: 9,
    cap: { front: 0.72, back: 1.95, zig: 0, n: 7, t: 0.03, crown: 0.02 },
    parts: [{ band: [0.6, 1.5], sector: [-Math.PI, Math.PI], count: 0, layers: 1, length: [0.05, 0.09], lift: 0.1, droop: 0.2, sweep: [0, -0.1, -0.5], curl: 0.0 }],
  },
  marks: [
    { kind: "dot", at: [0.3, -0.34], w: 0.0035, col: "#76614f" }, { kind: "dot", at: [0.4, -0.42], w: 0.0035, col: "#76614f" }, { kind: "dot", at: [0.2, -0.43], w: 0.0035, col: "#76614f" },
    { kind: "dot", at: [-0.3, -0.34], w: 0.0035, col: "#76614f" }, { kind: "dot", at: [-0.4, -0.42], w: 0.0035, col: "#76614f" }, { kind: "dot", at: [-0.2, -0.43], w: 0.0035, col: "#76614f" },
  ],
  acc: [],
  outfit: [],
  cool: { expr: "determined", pose: "fist" },
  hands: { kind: "flipper", skin: "#5a7aa8" },
  extras(engine, h) {
    return [h.attach(jacketShell(engine), "body"), h.attach(brooches(engine), "body"), h.attach(pompadour(engine), "head"), h.attach(coils(engine), "head"), h.attach(braid(engine), "head")];
  },
  // Giorno's stance: low and heavy, head down, the right fore-flipper clenched across the chest, the left at rest
  poses: {
    giornoFist: (k) => ({ y: -0.015 * k, sy: 1 - 0.05 * k, sxz: 1 + 0.03 * k, head: { rx: 0.1 * k }, armR: { sx: 1.62, sz: -0.56, elbow: 0.47, sy: -1.9 }, wristR: { rx: -1.16, ry: 1.12, rz: 0.83 } }),
    sign: { armR: { sx: 1.5, sz: -0.3, elbow: 0.9, sy: -1.0 } },
    fist: { y: -0.015, sy: 0.95, sxz: 1.03, head: { rx: 0.1 }, armR: { sx: 1.62, sz: -0.56, elbow: 0.47, sy: -1.9 }, wristR: { rx: -1.16, ry: 1.12, rz: 0.83 } },
    point: { head: { rx: -0.05 }, armR: { sx: 1.45, sz: 0.1, elbow: 0.15 }, handR: "point" },
    crouch: { rx: 0.12, y: -0.05, sy: 0.92, sxz: 1.06 },
    raise: { armR: { sx: 2.9, sz: 0.25, elbow: 0.2 }, armL: { sx: 2.9, sz: 0.25, elbow: 0.2 }, handR: "open", handL: "open" },
  },
  expressions: {
    resolve: { eyes: "calm", brow: [0.2, 0.004], mouth: ["closed", 0.2], head: { rx: 0.06 } },
  },
};
