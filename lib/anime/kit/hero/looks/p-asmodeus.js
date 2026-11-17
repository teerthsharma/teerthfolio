// LOOK p-asmodeus: the seal as Sadao Maou (The Devil Is a Part-Timer, White Fox): messy black hair with a fringe lock, brown
// sharp eyes, the red crew visor and white-and-red crew shirt with a yellow name tag. Export `satan` is the Demon Lord:
// long swept-back hair, two curved horns, red slit eyes, a black high-collar cloak open on the cream belly, gold pauldrons.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { variant } from "./_merge.js";
import { nameTag, pauldrons, visor } from "./p-asmodeus.parts.js";

const HAIR = "#1b1820", HAIR_SH = "#3a3442", HAIR_HI = "#7a6f86";

const base = {
  fur: { coat: "#8e8c91", shade: "#5f5d70", belly: "#f4e7cc", bellyShade: "#cdbfb4", nose: "#2e2a30", ink: "#241a22", blush: null },
  eyes: { style: "tsurime", iris: "#7a4a2a", iris2: "#3c2012", pupil: "round", size: 0.95, lash: "#1a1218" },
  brows: { col: HAIR, thick: 1.2 },
  mouth: { rest: "closed", sharp: 0.2 },
  hair: { preset: "swept", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, cap: { front: 0.7, back: 1.8, zig: 0.14, n: 9 }, width: 0.14, spike: 0.35, curl: 0.05, seed: 11,
    parts: [
      { band: [0, 0.8], count: 18, layers: 1, length: [0.08, 0.14], lift: 0.5, droop: 0.3, sweep: [0, 0.1, 0], fringe: { n: 3, length: 0.12, at: [-0.03, 0.3, 0.15], sweep: [0, -0.5, 0.8] } },
      { band: [0.7, 1.45], count: 20, layers: 1, length: [0.09, 0.15], lift: 0.25, droop: 0.9, sweep: [0, -0.1, 0] },
    ] },
  outfit: [{ kind: "tunic", col: "#ebe7df", shade: "#a9a4b4", trim: "#c8262c", belt: false, laces: false, hem: 0.08, cuffAt: 0.12, cuffTrim: "#c8262c", ink: "#2a1c24" }],
  hands: { kind: "flipper", skin: "#6a686f" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    if (h.spec.satan) return [h.attach(pauldrons(engine), "body")];
    return [h.attach(visor(engine), "head"), h.attach(nameTag(engine), "body")];
  },
};
export default base;

export const satan = variant(base, {
  satan: true,
  eyes: { style: "slit", iris: "#e0262e", iris2: "#6a0c14", pupil: "slit", size: 1.0, catchlight: { col: "#ff6a6a", glow: 2.2, n: 1, size: 0.2 } },
  brows: { col: "#16121c", thick: 1.4 },
  mouth: { rest: "closed", sharp: 0.9, fangs: true },
  hair: { preset: "long", col: "#16121c", shade: "#3c1a26", hi: "#a03040", cap: { front: 0.5, back: 1.9, zig: 0.1, n: 9 }, width: 0.12, spike: 0.3, curl: 0.04, seed: 5,
    parts: [
      { band: [0.3, 1.7], sector: [1.5, 5.33], count: 28, layers: 2, length: [0.28, 0.46], lift: 0.14, droop: 1.8, sweep: [0, -0.1, -0.7] },
      { band: [0, 0.6], count: 12, layers: 1, length: [0.14, 0.22], lift: 0.5, droop: 0.4, sweep: [0, 0.3, -0.9], spike: 0.5 },
    ] },
  acc: [{ kind: "horns", col: "#2a2230", shade: "#12101a", r: 0.05, h: 0.2, bend: -0.8 }],
  outfit: [{ kind: "cloak", col: "#14101a", shade: "#08060c", trim: "#7a1420", hemCol: "#b8913c", motif: "none", ink: "#0a060c" }],
});

// the flat shrug at line a (2.30 s) and the right flipper palm-out for the kill (7.5-8.5 s)
export const poses = {
  "maou-shrug": (k) => ({ y: 0.01 * k, head: { rz: 0.07 * k, rx: 0.03 * k }, armR: { sx: 0.75, sz: 0.8, elbow: 1.35, sy: -0.4 }, armL: { sx: 0.75, sz: 0.8, elbow: 1.35, sy: -0.4 }, wristR: { rx: 0.3, ry: 0.5, rz: 0 }, wristL: { rx: 0.3, ry: 0.5, rz: 0 }, handR: "open", handL: "open" }),
  "maou-palm": (k) => ({ rx: -3 * Math.PI / 180 * k, head: { rx: 0.05 * k }, armR: { sx: 1.6, sz: -0.03, elbow: 0.5, sy: -1.38 }, wristR: { rx: 0.52, ry: -0.19, rz: 1 }, handR: "open" }),
};
export const expressions = {
  "maou-deadpan": { eyes: "calm", brow: [0.08, 0.004], mouth: ["closed", -0.1], adj: { lid: 0.2 } },
  "maou-glare": { eyes: "rage", eyesK: 0.6, brow: [0.38, 0.007], mouth: ["closed", -0.2], adj: { pupil: -0.1 } },
};
