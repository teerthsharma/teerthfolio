import { defineKit } from "./define.js";
import { builder, addBowl, addTaper, bothSides } from "./mesh.js";

export function buildEar({ side = 0 } = {}) {
  const one = (s) => {
    const b = builder();
    const cx = s * 0.22;
    addBowl(b, cx, 0.06, 0.02, 0.045, 0.052, 0.028, 8, 4);
    addTaper(b, cx, 0.02, 0.01, cx + s * 0.02, 0.08, -0.01, 0.018, 0.010, 6, 3);
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const ear = defineKit({
  name: "ear",
  family: "face",
  doc: "cupped seal-ear flap on the pear skull — a lobe, never a human helix",
  build: buildEar,
});

export default ear;
