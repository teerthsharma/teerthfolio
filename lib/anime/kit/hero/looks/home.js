// LOOK home: the seal as young Thorfinn (Vinland Saga, welcome home); `thors` is the father variant.
// Five identifiers: messy light-brown boy's crop with a forelock, small round blue-grey eyes with no sparkle,
// low heavy brows, plain wool tunic with a belt and iron buckle, freckles on the muzzle pads.
import { HERO_EXPRESSIONS } from "../../hero.js";
import { variant } from "./_merge.js";
import { beard, tornCloak } from "./home.parts.js";

const INK = "#221e1c";
const dots = (list, col = "#6b5a5a") => list.map(([u, v]) => ({ kind: "dot", at: [u, v], w: 0.008, col }));

const base = {
  fur: { coat: "#8a8e92", shade: "#686c74", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2a2030", ink: INK, blush: null },
  eyes: { style: "round", iris: "#5f84a8", pupil: "round", lash: INK, size: 0.8, catchlight: { k: 0 } },
  brows: { col: "#5c4330", thick: 1.4 },
  mouth: { rest: "closed" },
  hair: { preset: "forelock", col: "#94724a", shade: "#5c4330", hi: "#bd9564", seed: 9, spike: 0.28, width: 0.11 },
  marks: dots([[-0.2, -0.3], [-0.12, -0.36], [-0.27, -0.38], [0.2, -0.3], [0.12, -0.36], [0.27, -0.38]]),
  outfit: [{ kind: "tunic", col: "#b9ab92", shade: "#8d8068", trim: "#8d8068", belt: "#4a3226", buckle: "#8d8068", ink: INK }],
  hands: { kind: "flipper", skin: "#f3e3d6" },
  blinkEvery: 0,
  // plop squash, one flipper up (Thors), wary brows for the fin watch
  poses: { plop: { sy: 0.8, sxz: 1.12 }, lift: { armR: { sx: 2.4, sz: 0.2, elbow: 0.2, sy: 0 } } },
};
// Thorfinn at this beat: a hollow glare, brows low and level, mouth shut
export const expressions = {
  wary: { eyes: "rage", eyesK: 0.4, brow: [0.25, -0.004], mouth: ["closed", 0] },
  hollow: { eyes: "rage", eyesK: 0.4, brow: [0.25, -0.004], mouth: ["closed", 0] },
};
Object.assign(HERO_EXPRESSIONS, expressions);
export default base;

export const thors = variant(base, {
  scale: 1.4,
  fur: { coat: "#5c6876", shade: "#353f4a", belly: "#d9d0bc", bellyShade: "#a9a290" },
  eyes: { iris: "#7a5232", size: 0.8 },
  brows: { col: "#2c231c", thick: 1.6 },
  hair: { preset: "ponytail", col: "#5a4636", shade: "#2c231c", hi: "#8a6a4e" },
  marks: dots([[-0.55, -0.1], [-0.62, -0.2], [-0.5, -0.22]], "#353f4a"),
  outfit: [{ kind: "bands", col: "#4a3a2e", trim: "#8a8e92" }],
  extras(engine, h) { return [h.attach(beard(engine), "head"), h.attach(tornCloak(engine), "body")]; },
});
