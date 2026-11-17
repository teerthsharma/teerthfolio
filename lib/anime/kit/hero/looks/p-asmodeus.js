// LOOK p-asmodeus: the seal as Sadao Maou (The Devil Is a Part-Timer, White Fox). base = crew form, redEyes/grow1/grow2 = the
// growth forms, satan = the Demon Lord (long hair, two horns, black cloak, gold pauldrons). Poses and expressions register at import.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { variant } from "./_merge.js";
import { horns, nameTag, pauldrons, visor } from "./p-asmodeus.parts.js";

const HAIR = "#1b1820", HAIR_SH = "#3a3442", HAIR_HI = "#7a6f86";
const cloak = (trim) => ({ kind: "cloak", col: "#14101a", shade: "#08060c", trim, hemCol: "#b8913c", motif: "none", ink: "#0a060c" });

const base = {
  fur: { coat: "#8e8c91", shade: "#5f5d70", belly: "#f4e7cc", bellyShade: "#cdbfb4", nose: "#2e2a30", ink: "#241a22", blush: null },
  eyes: { style: "tsurime", iris: "#7a4a2a", iris2: "#3c2012", pupil: "round", size: 0.95, lash: "#1a1218" },
  brows: { col: HAIR, thick: 1.2 },
  mouth: { rest: "closed", sharp: 0.2 },
  hair: { preset: "swept", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, cap: { front: 0.7, back: 1.8, zig: 0.14, n: 9 }, width: 0.14, spike: 0.35, curl: 0.05, seed: 11,
    parts: [
      { band: [0, 0.8], count: 18, layers: 1, length: [0.08, 0.14], lift: 0.5, droop: 0.3, sweep: [0, 0.1, 0], fringe: { n: 3, length: 0.12, at: [-0.03, 0.3, 0.15], sweep: [0, -0.5, 0.8] } },
      { band: [0.7, 1.45], count: 20, layers: 1, length: [0.09, 0.15], lift: 0.25, droop: 0.9, sweep: [0, -0.1, 0] },
    ], b: { scale: 0.75 } },
  outfit: [{ kind: "tunic", col: "#ebe7df", shade: "#a9a4b4", trim: "#c8262c", belt: false, laces: false, hem: 0.08, cuffAt: 0.12, cuffTrim: "#c8262c", ink: "#2a1c24" }],
  hands: { kind: "flipper", skin: "#6a686f" },
  // crew form: visor and name tag; the Demon Lord: pauldrons; a cloak form: name tag only
  extras(engine, h) {
    for (const s of Object.values(h.subs ?? { base: h })) {
      if (s.spec.horns) s.attach(horns(engine, s.spec.horns), "head");
      if (s.spec.satan) { s.attach(pauldrons(engine), "body"); continue; }
      if (s.spec.outfit[0]?.kind === "tunic") s.attach(visor(engine), "head");
      s.attach(nameTag(engine), "body");
    }
  },
};
export default base;

export const redEyes = variant(base, { eyes: { style: "slit", iris: "#e0262e", iris2: "#6a0c14", pupil: "slit", size: 0.95 } });
export const grow1 = variant(redEyes, { horns: 0.3, hair: { b: { scale: 1.0 } } });
export const grow2 = variant(grow1, { horns: 0.6, hair: { b: { scale: 1.1 } }, outfit: [cloak("#c8262c")] });

export const satan = variant(base, {
  satan: true,
  eyes: { style: "slit", iris: "#e0262e", iris2: "#6a0c14", pupil: "slit", size: 1.0, catchlight: { col: "#ff6a6a", glow: 2.2, n: 1, size: 0.2 } },
  brows: { col: "#16121c", thick: 1.4 },
  mouth: { rest: "closed", sharp: 0.9, fangs: true },
  hair: { preset: "long", col: "#16121c", shade: "#2a1a26", hi: "#4a3250", seed: 5, b: { rows: [[0.10, 6, -3.1, 3.1, 0.35, 0.9, -0.10, 0.07, 0.034], [0.40, 12, -3.14, 3.14, 0.20, 1.0, -0.15, 0.09, 0.034], [0.85, 7, -0.55, 0.55, -0.30, 0.9, 0.45, 0.10, 0.034], [1.20, 8, 1.0, 2.3, -1.1, 0.5, 0.0, 0.16, 0.044], [1.20, 8, -2.3, -1.0, -1.1, 0.5, 0.0, 0.16, 0.044], [1.40, 18, 2.2, 4.1, -1.2, 0.45, -0.05, 0.50, 0.052], [0.70, 14, 1.2, 5.1, 0.1, 1.0, 0.0, 0.09, 0.034]] } },
  horns: 1.0,
  outfit: [cloak("#7a1420")],
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
Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
