// LOOK for pr-polychrom-79: the kit's Gilgamesh look in grey fur with gold armour and a red cloak, the four channel sets the track sets, and the red-eyed form.
// Colours come from pal.js; the kit look and _merge.js are read only. lookB is the slicked-back hair candidate for the owner to choose.
import base from "../../kit/hero/looks/pr-polychrom-79.js";
import { variant } from "../../kit/hero/looks/_merge.js";
import { PAL } from "./pal.js";

const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const both = (a, w, hand) => ({ armR: a, armL: a, wristR: w, wristL: w, handR: hand, handL: hand });

const outfit = [
  { kind: "vest", col: PAL.vest, shade: PAL.vestShade, ink: PAL.sil, collar: "open" },
  { ...base.outfit[1], col: PAL.goldLo, shade: PAL.keyDk, lo: 0.5 },
  { kind: "armour", col: PAL.goldLo, shade: PAL.keyDk, trim: PAL.goldHi },
  { ...base.outfit[2], col: PAL.goldLo, shade: PAL.keyDk },
  { ...base.outfit[3], col: PAL.goldLo, shade: PAL.keyDk },
  { kind: "cape", col: PAL.cloak, shade: PAL.cloakDk },
];

const poses = {
  spread: { z: 0.04, rx: 5 * D2, head: { rx: 0.06 }, ...both(arm(1.14, -0.23, 0.01, 0.76), wr(-0.31, 0.78, -0.16), "open") },
  key: { head: { rx: -0.05 }, armR: arm(1.35, -0.5, 0.2, -0.3), wristR: wr(0.1, 0, 0), handR: "fist", armL: arm(1.0, 0.1, 0.9, -0.2), wristL: wr(0, 0.4, 0), handL: "fist" },
  ea: { head: { rx: 0.1 }, armR: arm(0.25, 0.1, 0.3, 0), wristR: wr(0, 0, 0), handR: "fist", armL: arm(1.2, 0.3, 0.8, -0.2), wristL: wr(0, 0.2, 0), handL: "fist" },
  aim: { rx: 4 * D2, head: { rx: -0.04 }, armR: arm(0.25, 0.1, 0.3, 0), wristR: wr(0, 0, 0), handR: "fist", armL: arm(1.2, 0.3, 0.8, -0.2), wristL: wr(0, 0.2, 0), handL: "fist" },
};

const look = variant(base, {
  fur: { coat: PAL.fur, shade: PAL.furShade, belly: PAL.belly, bellyShade: PAL.bellyShade },
  hair: { preset: "slick", col: "#e9d08c", shade: "#a8843a", hi: "#fff0b8", length: 0.55, volume: 0.7, seed: 33, cap: null },
  eyes: { iris: PAL.redHot, glow: 0 },
  mouth: { rest: "smile", sharp: 0 },
  outfit, poses, cool: { expr: "smirk", pose: "hold-out" },
});
export default look;
export const red = variant(look, { eyes: { iris: PAL.redHot, iris2: PAL.red, glow: 0 } });
export const lookB = variant(look, { hair: { preset: "swept", length: 0.5, volume: 0.7, fringe: 2 } });
