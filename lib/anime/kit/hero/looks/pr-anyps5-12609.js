// LOOK pr-anyps5-12609: the Vice seal, a street-outfit lead in a painted key-art trailer. No hair; an open teal blazer over
// the bare cream belly, a yellow palm-leaf print, denim, a red bandana, sunglasses pushed up on the brow
// (named export `shadesDown` for the chase), a cocky grin. Poses: the kit's raise, point, sit, crouch, salute.
import { HERO_EXPRESSIONS } from "../../hero.js";
import { variant } from "./_merge.js";
import { bandana, denim, palmPrint, shades } from "./pr-anyps5-12609.parts.js";

const INK = "#1a120c";
const extras = (down) => (engine, h) => [h.attach(denim(engine), "body"), h.attach(palmPrint(engine), "body"), h.attach(bandana(engine), "body"), h.attach(shades(engine, down), "head")];

const base = {
  fur: { coat: "#8f93a2", shade: "#4a4a6a", belly: "#f4e7cc", bellyShade: "#b9a0a0", nose: "#2a2328", ink: INK, blush: "#f08a6a" },
  eyes: { style: "round", iris: "#3a2a24", size: 1.02, lash: "#1a120c" },
  brows: { col: "#2a1c16", thick: 1.3 },
  mouth: { rest: "grin", sharp: 0 },
  hair: null,
  marks: [],
  acc: [],
  outfit: [
    { kind: "blazer", col: "#1f8a8a", shade: "#0f4a5c", trim: "#2fb0a8", lapel: "#2aa59c", collar: "open", shirt: null, tie: false, notch: false, buttons: 0, hem: 0.17, v0: 0.19, cuffAt: 0.085, cuffs: true, folds: true },
  ],
  hands: { kind: "flipper", skin: "#8f93a2" },
  extras: extras(false),
};
export default base;

// the chase: the sunglasses come down over the eyes
export const shadesDown = variant(base, { extras: extras(true) });

export const expressions = {
  // the Vice grin: half-lidded smug eyes, a wide open-corner grin, brow cocked
  vice: { eyes: "smug", eyesK: 0.7, brow: [-0.04, 0.004], mouth: ["grin", 0.5], head: { rx: -0.03 } },
  "vice-glare": { eyes: "calm", eyesK: 0.9, brow: [0.2, 0.007], mouth: ["grin", 0.3], head: { rx: 0.05 } },
};
Object.assign(HERO_EXPRESSIONS, expressions);
