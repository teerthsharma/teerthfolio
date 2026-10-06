import { defineKit } from "./define.js";
import { builder, addLidBand, bothSides } from "./mesh.js";

export function buildLowerLid({ side = 0 } = {}) {
  const one = (s) => {
    const b = builder();
    addLidBand(b, {
      cx: s * 0.12, cy: 0.028, cz: 0.238, rx: 0.070, ry: 0.018, inner: 0.58,
      segs: 12, thick: 0.010, start: 1.08, end: 1.92, bulge: -0.008,
    });
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const lowerLid = defineKit({
  name: "lower-lid",
  family: "face",
  doc: "lower lid plate under the pear eye — extra bag the camera reads, still round",
  build: buildLowerLid,
});

export default lowerLid;
