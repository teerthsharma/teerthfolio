// LOOK pr-tensorflow-128930: the seal as Godzilla (Toho kaiju films), "Godsealzilla". Pebbled charcoal hide, a heavy
// brow over sunken amber slit eyes, fanged jaws, a long tapered tail ending in a fanned seal tail-flipper, and 27 crystal
// dorsal fins shaped like seal flippers (3 rows x 9 columns) that light one column at a time. `h.fins.set(n, f, throat)`
// drives them from a cutscene; `mecha` is the Mechasealzilla variant. Spec for kit/hero.js plus `extras`, `poses`, `expressions`.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { variant } from "./_merge.js";
import { bodyFigure, finGlow, headScutes, visor } from "./pr-tensorflow-128930.parts.js";

const base = {
  fur: { coat: "#555b65", shade: "#2a2e37", belly: "#a89c80", bellyShade: "#6a6252", nose: "#1d1f24", ink: "#121419", blush: null, poreCol: "#6a7079" },
  eyes: { style: "tsurime", iris: "#f2b13a", iris2: "#b8641a", pupil: "slit", glow: 0.25, size: 1.0, lash: "#0c0d10", sclera: "#e8dcb8" },
  brows: { col: "#0c0d10", thick: 1.5 },
  mouth: { rest: "closed", fangs: true, sharp: 1, gum: "#2a1014", tongue: "#6a2c34", tooth: "#efe6d0", toothShade: "#a89a82" },
  hair: null,
  marks: [
    { kind: "line", at: [0.1, 0.5], to: [0.46, 0.46], w: 0.005, w1: 0.003, col: "#6a7079" }, { kind: "line", at: [-0.1, 0.5], to: [-0.46, 0.46], w: 0.005, w1: 0.003, col: "#6a7079" },
    { kind: "line", at: [0.02, 0.66], to: [0.3, 0.6], w: 0.004, w1: 0.002, col: "#6a7079" }, { kind: "line", at: [-0.02, 0.66], to: [-0.3, 0.6], w: 0.004, w1: 0.002, col: "#6a7079" },
    { kind: "arc", at: [0.62, -0.5], to: [0.88, -0.1], w: 0.004, w1: 0.002, col: "#6a7079", bend: 0.25 }, { kind: "arc", at: [-0.62, -0.5], to: [-0.88, -0.1], w: 0.004, w1: 0.002, col: "#6a7079", bend: -0.25 },
    { kind: "dot", at: [0.3, 0.2], w: 0.003, col: "#2a2e35" }, { kind: "dot", at: [-0.3, 0.2], w: 0.003, col: "#2a2e35" },
  ],
  acc: [],
  outfit: [],
  hands: { kind: "flipper", skin: "#4a4f58" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    const fins = finGlow(engine);
    h.fins = fins;
    return [h.attach(bodyFigure(engine, "hero"), "body"), h.attach(fins.mesh, "body"), h.attach(headScutes(engine), "head")];
  },
};
export default base;

// the breath beat: the eyes whiten and blaze
export const charged = variant(base, { eyes: { iris: "#d8f4ff", iris2: "#3ac8ff", glow: 0.9 } });

// Mechasealzilla (the fake): the same pup, a value step lighter, smooth skin, fins spaced perfectly evenly, a red visor
export const mecha = variant(base, {
  fur: { coat: "#575c64", shade: "#26292f", belly: "#b8c0c8", bellyShade: "#6a727c", ink: "#16181c" },
  eyes: { glow: 0 },
  mouth: { fangs: false, sharp: 0.2 },
  brows: { thick: 0 },
  marks: [],
  acc: [{ kind: "blindfold", col: "#2a2e35" }],
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    return [h.attach(bodyFigure(engine, "mecha"), "body"), h.attach(visor(engine), "head")];
  },
});

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const D2 = Math.PI / 180;
const sw = (t, f, p = 0) => Math.sin(t * f + p);

export const poses = {
  // upright and heavy: chest out, chin tucked, short fore flippers bent in front like a theropod's
  "zilla-stand": (k, t) => ({ rx: -3 * D2 * k, y: 0.012 * k, sxz: 1 + 0.04 * k, head: { rx: 0.05 * k }, armR: arm(0.3, 0.5, 1.3, -0.5 + 0.02 * sw(t, 1.6)), wristR: wr(-0.2, 0.5, 0), armL: arm(0.3, 0.5, 1.3, -0.5 + 0.02 * sw(t, 1.6, 1)), wristL: wr(-0.2, 0.5, 0) }),
  // wading: leaning into the water, head forward and low, arms hanging out
  "zilla-wade": (k, t) => ({ rx: 9 * D2 * k, y: -0.03 * k + 0.008 * sw(t, 6) * k, sy: 1 - 0.06 * k, sxz: 1 + 0.07 * k, head: { rx: 0.1 * k }, armR: arm(0.35, 0.7, 0.9, -0.4), wristR: wr(0.2, 0.6, 0), armL: arm(0.35, 0.7, 0.9, -0.4), wristL: wr(0.2, 0.6, 0) }),
  // head down, shoulders hunched, flippers wide: the plates lock
  "zilla-brace": (k) => ({ rx: 13 * D2 * k, y: -0.045 * k, sy: 1 - 0.13 * k, sxz: 1 + 0.1 * k, head: { rx: 0.2 * k }, armR: arm(0.9, 0.75, 0.8, -0.3), wristR: wr(0.1, 0.6, 0), armL: arm(0.9, 0.75, 0.8, -0.3), wristL: wr(0.1, 0.6, 0) }),
  // the roar: body thrown back, head up, chest swelling, flippers dropped behind
  "zilla-roar": (k) => ({ rx: -10 * D2 * k, y: 0.04 * k, sy: 1 + 0.06 * k, sxz: 1 + 0.02 * k, head: { rx: -0.36 * k }, armR: arm(0.0, 0.55, 0.7, -0.4), wristR: wr(0.1, 0.7, 0), armL: arm(0.0, 0.55, 0.7, -0.4), wristL: wr(0.1, 0.7, 0) }),
};

export const expressions = {
  // the glare: eyes narrowed under the brow, jaw shut
  "zilla-glare": { eyes: "rage", eyesK: 0.5, brow: [0.5, 0.008], mouth: ["snarl", 0.35], head: { rx: 0.06 } },
  // the roar: mouth wide, eyes narrowed
  "zilla-roar": { eyes: "rage", eyesK: 0.6, brow: [0.5, 0.01], mouth: ["open", 1], head: { rx: -0.02 } },
  // the dawn: the glare gone slack
  "zilla-calm": { eyes: "calm", eyesK: 0.9, brow: [0.14, 0.008], mouth: ["closed", 0.05], head: { rx: 0.03 } },
};
