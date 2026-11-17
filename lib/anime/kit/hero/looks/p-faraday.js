// LOOK p-faraday: the seal as Misaka Mikoto (A Certain Scientific Railgun, J.C.Staff). Chestnut bob with swept
// bangs, big brown eyes, white flower clips, beige Tokiwadai vest over a white blouse, coin-flick and rail pose.
// Spec for kit/hero.js plus `extras(engine, hero)` (short sleeves, collar, crest, poses) and `channels` for set().
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { bodyWear, coinSpark, sleeveCaps } from "./p-faraday.parts.js";

export const HAIR = "#ac6c54", HAIR_SH = "#80503c", HAIR_HI = "#dc9e80";
const LINE = "#6d592c";

const base = {
  fur: { coat: "#86aad6", shade: "#58657e", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#4a3a3a", ink: LINE, blush: "#f2a592" },
  eyes: { style: "round", iris: "#5a3626", iris2: "#8c5a3c", pupil: "round", size: 1.15, lash: "#3a2418" },
  brows: { col: "#8a5238", thick: 0.9 },
  mouth: { rest: "smile", sharp: 0.3 },
  hair: { preset: "bob", col: HAIR, shade: HAIR_SH, hi: HAIR_HI },
  marks: [],
  cool: { expr: "smirk", pose: "coin-hold" },
  acc: [
    { kind: "clip", th: -0.72, y: 0.27, col: "#f7f1f8", centre: "#ffa927" },
    { kind: "clip", th: -0.66, y: 0.205, col: "#f7f1f8", centre: "#ffa927" },
  ],
  outfit: [],
  hands: { kind: "flipper", skin: "#5a7aa8" },
  extras(engine, h) {
    Object.assign(HERO_POSES, POSES);
    HERO_EXPRESSIONS.smirk = { eyes: "smug", eyesK: 0.5, brow: [0.2, 0.003], tilt: -0.2, mouth: ["smile", 0.4], head: { rz: 0.05 } };
    const fig = (geo, ink = LINE) => { const f = engine.figure(geo, { ink, lineMul: 1.2 }); f.userData.hull.uniforms.uConst.value = 1; return f; };
    h.attach(fig(bodyWear()), "body");
    const sl = sleeveCaps();
    h.attach(fig(sl), "armR");
    h.attach(fig(sl), "armL");
    h.attach(fig(coinSpark()), "handR");
  },
  // channel sets for ctx.seal.set()
  channels: {
    narrow: { eyeAdj: { lid: 0.3 } },
  },
};

export default base;
export const hairB = { ...base, hair: { ...base.hair, bangs: 3, dir: -0.5 } };
export const hairC = { ...base, hair: { ...base.hair, seed: 3, volume: 1.1, length: 0.9 } };
export const hairD = { ...base, hair: { ...base.hair, preset: "swept", bangs: 3 } };

// named poses (k, t) => channel deltas, registered into HERO_POSES by extras
const POSES = {
  "coin-hold": (k) => ({ head: { rz: 0.05 * k, rx: 0.04 * k }, armR: { sx: 1.7, sz: -0.3, elbow: 0.45, sy: -1.0 }, wristR: { rx: -0.7, ry: 0.1, rz: 0.9 } }),
  "coin-flick": (k) => ({ head: { rx: -0.12 * k, rz: 0.06 * k }, armR: { sx: 1.85, sz: -0.3, elbow: 0.2, sy: -1.0 }, wristR: { rx: -0.9, ry: 0.1, rz: 0.9 } }),
  "rail-aim": (k) => ({ rx: 0.17 * k, ry: 0.26 * k, z: 0.05 * k, head: { ry: -0.12 * k, rx: 0.02 * k }, armR: { sx: 1.26, sz: 0.11, elbow: 0.2, sy: -0.03 }, wristR: { rx: 0.2, ry: 0.07, rz: 0.03 } }),
  flex: () => ({ armR: { sx: 2.4, sz: -0.25, elbow: 1.7, sy: 0 }, handR: "fist" }),
};
