// LOOK p-tangle: the seal as Taki Tachibana (Your Name, Shinkai), with Mitsuha as the named variant `mitsuha`.
// Taki: short black swept hair, narrow determined eyes, navy blazer with a loosened tie, the red cord on the flipper.
import { variant } from "./_merge.js";
import { cordWrap, hairTie, ribbonBow, wristWatch } from "./p-tangle.parts.js";

// channel sets for ctx.seal.set(): the flipper wraps the cord, the linked flipper pressed to the chest, the head tipped up to the comet, the empty reach
const POSES = {
  cordTie: { armR: { sx: 1.45, sz: -0.2, elbow: 1.0, sy: -0.6 }, wristR: { rx: -0.6, ry: 0.1, rz: 0.8 }, head: { rx: 0.1, ry: 0.15 } },
  pressChest: { armR: { sx: 0.97, sz: -0.32, elbow: 0.4, sy: -1.33 }, wristR: { rx: -1.07, ry: -0.38, rz: 1.04 }, head: { rx: 0.07 } },
  cometLook: { rx: -0.1, head: { rx: -0.4, rz: 0.06 } },
  emptyReach: { armR: { sx: 1.4, sz: -0.09, elbow: 0.92, sy: 0.06 }, wristR: { rx: 0.09, ry: 0.01, rz: 0.12 }, head: { rx: -0.08, ry: -0.2 } },
};

const base = {
  fur: { coat: "#8a97b3", shade: "#6c78a4", belly: "#e8d8c8", bellyShade: "#c4b4c8", nose: "#2a2030", ink: "#31233b", blush: null },
  eyes: { style: "tsurime", iris: "#3a2a2c", iris2: "#6a4a44", lash: "#31233b", size: 1 },
  brows: { col: "#1a192e", thick: 0.9 },
  mouth: { rest: "w" },
  hair: { preset: "forelock", col: "#1a192e", shade: "#0b0a18", hi: "#5a6a88", length: 1.05, volume: 1.3, bangs: 4, seed: 7, cap: { front: 0.7, back: 1.7, zig: 0.1, n: 9 } },
  outfit: [
    { kind: "blazer", col: "#3a4a78", shade: "#26325a", trim: "#f2eee8", shirt: "#f2eee8", tie: "#5a4a6a", lapel: "#2a3660", ink: "#31233b" },
    { kind: "prop", prop: "cord", hand: "R", col: "#e0243c", shade: "#752829", len: 0.2 },
  ],
  hands: { kind: "flipper" },
  blinkEvery: 4.3,
  extras: (engine, h) => [h.attach(cordWrap(engine), "handR"), h.attach(wristWatch(engine), "handL")],
  poses: POSES,
};
export default base;

export const mitsuha = variant(base, {
  fur: { coat: "#a4bce0" },
  eyes: { style: "tareme", iris: "#4a3028", iris2: "#9a6a50" },
  hair: { preset: "long", col: "#2b1f2a", shade: "#150e16", hi: "#7a5a6a", length: 1, volume: 1.1, part: -1, bangs: 0, forelock: 0, cap: { front: 0.9, back: 1.9, zig: 0.1, n: 9 }, seed: 5 },
  brows: { col: "#2b1f2a", thick: 0.6 },
  extras: (engine, h) => [h.attach(ribbonBow(engine), "body"), h.attach(hairTie(engine), "head")],
  outfit: [{ kind: "blazer", col: "#958075", shade: "#6c5a52", trim: "#f4efe6", shirt: "#f4efe6", tie: false, ink: "#31233b" }],
});
