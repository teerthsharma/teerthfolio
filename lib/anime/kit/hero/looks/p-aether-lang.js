// LOOK p-aether-lang: the approved character for this dock is look gojo (white spiked hair, ice-blue Six Eyes, dark
// uniform with an open collar). Spec for kit/hero.js plus `poses` and `expressions`, which the cutscene track names.
import { HERO_EXPRESSIONS, HERO_POSES } from "../../hero.js";
import gojo from "./gojo.js";
import { variant } from "./_merge.js";

const base = variant(gojo, { cool: { expr: "gojo", pose: "gojo-domain" } });
export default base;

// the held-out beat: the iris lights up
export const purple = variant(base, { eyes: { glow: 0.35 } });
// gojo already carries the streak marks, so the bloodied frame is the base
export const bloodied = base;

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const D2 = Math.PI / 180;

export const poses = {
  // the Domain Expansion sign: fore flippers crossed in an X at the chest, planted, head level
  "gojo-domain": (k) => ({ rx: -3 * D2 * k, head: { rx: 0.02 * k }, armR: arm(1.62, -0.56, 0.5, -1.9), wristR: wr(-1.16, 1.12, 0.83), armL: arm(1.5, -0.5, 0.5, -1.9), wristL: wr(-1.05, 1, 0.77) }),
  // the sign releases: flippers lower to the sides, the head turns toward the hole
  "gojo-release": (k) => ({ ry: -0.2 * k, head: { ry: 0.26 * k, rx: 0.02 * k } }),
  // both fore flippers raised forward and out, open
  "gojo-open": (k) => ({ rx: 3 * D2 * k, z: 0.02 * k, head: { rx: 0.03 * k }, armR: arm(1.55, 0.4, 0.2, -0.7), wristR: wr(0.2, -0.5, 0.2), armL: arm(1.55, 0.4, 0.2, -0.7), wristL: wr(0.2, -0.5, 0.2) }),
  // the flippers meet at the chest in front of the hero (Purple between them)
  "gojo-meet": (k) => ({ rx: 5 * D2 * k, z: 0.03 * k, head: { rx: 0.05 * k }, armR: arm(1.6, -0.12, 0.25, -1.0), wristR: wr(-0.3, 0.6, 0.4), armL: arm(1.6, -0.12, 0.25, -1.0), wristL: wr(-0.3, 0.6, 0.4) }),
};

export const expressions = {
  // calm, half-lidded Six Eyes, mouth closed, the muzzle corner just lifted
  "gojo": { eyes: "calm", brow: [-0.04, 0.004], mouth: ["smile", 0.22], head: { rx: -0.02 } },
  // brow shelf lowered one step
  "gojo-focus": { eyes: "calm", eyesK: 0.9, brow: [0.18, 0.008], mouth: ["closed", 0.1], head: { rx: 0.04 } },
  // eyes narrowed one step more
  "gojo-narrow": { eyes: "smug", eyesK: 0.7, brow: [0.28, 0.01], mouth: ["closed", 0.05], head: { rx: 0.05 } },
};

// register with the shared rig so `track` entries and `?pose=` can name them
Object.assign(HERO_POSES, poses);
Object.assign(HERO_EXPRESSIONS, expressions);
