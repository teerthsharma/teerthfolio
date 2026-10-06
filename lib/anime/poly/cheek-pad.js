import { defineKit } from "./define.js";
import { builder, addTaper, addDisc, bothSides } from "./mesh.js";

export function buildCheekPad({ side = 0 } = {}) {
  const one = (s) => {
    const b = builder();
    const cx = s * 0.16;
    addTaper(b, cx, -0.02, 0.18, cx + s * 0.04, -0.04, 0.22, 0.055, 0.038, 8, 4);
    addDisc(b, cx + s * 0.02, -0.03, 0.21, 0.042, 0.032, 0.15 * s, -0.2, 0.96, 10, 0.012);
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const cheekPad = defineKit({
  name: "cheek-pad",
  family: "face",
  doc: "chubby cheek pad the key light shades — pear mass, not a jawline",
  build: buildCheekPad,
});

export default cheekPad;
