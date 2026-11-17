// LOOK p-resolvent: the seal as Frieren (Sousou no Frieren, Madhouse). Two long pale twin tails with a straight fringe,
// calm half-lidded green eyes, red drop earrings, a short white mantle with a gold hem over a black neck band and
// clasp. Spec for kit/hero.js plus `extras`, the named `poses` and `expressions` the cutscene calls.
import { HERO_EXPRESSIONS, HERO_POSES } from "../motion.js";
import { variant } from "./_merge.js";
import { bands, cap, clasp, sideLocks, tails } from "./p-resolvent.parts.js";

const HAIR = "#d9dcec", HAIR_SH = "#9096bb", HAIR_HI = "#f4f6ff";

const base = {
  cool: { expr: "frieren", pose: "fist" },
  fur: { coat: "#86aad6", shade: "#5d749c", belly: "#f8eee0", bellyShade: "#b4bcc7", nose: "#2a2030", ink: "#1a0e16", blush: "#f0a69a" },
  eyes: { style: "tareme", iris: "#4f9a72", iris2: "#2c6a4c", pupil: "round", size: 1.0, lash: "#1a0e16" },
  brows: { col: "#9096bb", thick: 0.7 },
  mouth: { rest: "closed", sharp: 0.3 },
  hair: null,
  marks: [],
  acc: [{ kind: "earrings", drop: true, dropCol: "#c8262c", col: "#c8262c", r: 0.012 }],
  outfit: [
    { kind: "mantle", col: "#eef0f8", shade: "#9096bb", trim: "#d9a93a", hemCol: "#d9a93a", ink: "#1a0e16" },
    { kind: "choker", col: "#2a2430", ring: true, ringCol: "#d9a93a" },
  ],
  hands: { kind: "flipper", skin: "#5d749c" },
  extras(engine, h) {
    Object.assign(HERO_POSES, poses); Object.assign(HERO_EXPRESSIONS, expressions);
    const t = h.spec.wind ?? 0;
    return [h.attach(clasp(engine), "body"), h.attach(cap(engine), "head"), h.attach(tails(engine, t), "head"), h.attach(sideLocks(engine), "head"), h.attach(bands(engine), "head")];
  },
};
export default base;

export const wind = variant(base, { wind: 1 });

// the bow of the dock at 17.92 s; the press and crouch use the shared fist and crouch poses
export const poses = {
  "fr-bow": (k) => ({ rx: 0.1 * k, y: -0.01 * k, head: { rx: 0.42 * k } }),
};
// frieren: the flat half-lidded deadpan; steady: lowered brow for the limiters; wide: eyes open and clear; bow: lids shut
export const expressions = {
  calm: { eyes: "calm", brow: [-0.04, 0.004], mouth: ["closed", 0.15], adj: { lid: 0.3 } },
  frieren: { eyes: "calm", brow: [-0.04, 0.004], mouth: ["closed", 0.05], adj: { lid: 0.3, open: -0.1 } },
  "fr-steady": { eyes: "calm", brow: [0.12, 0.006], mouth: ["closed", -0.05], adj: { lid: 0.18, open: -0.04 } },
  "fr-wide": { eyes: "neutral", brow: [-0.1, -0.004], mouth: ["closed", 0], adj: { open: 0.1 } },
  "fr-bow": { eyes: "shut", brow: [-0.06, 0.004], mouth: ["closed", 0.1] },
};
