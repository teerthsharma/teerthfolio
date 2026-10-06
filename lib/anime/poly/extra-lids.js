import { defineKit } from "./define.js";
import { builder, addLidBand, bothSides } from "./mesh.js";

export function buildExtraLids({ side = 0 } = {}) {
  const one = (s) => {
    const b = builder();
    const cx = s * 0.12;
    addLidBand(b, {
      cx, cy: 0.055, cz: 0.24, rx: 0.074, ry: 0.030, inner: 0.52,
      segs: 14, thick: 0.013, start: 0.10, end: 0.90, bulge: 0.014,
    });
    addLidBand(b, {
      cx, cy: 0.078, cz: 0.232, rx: 0.068, ry: 0.016, inner: 0.62,
      segs: 12, thick: 0.009, start: 0.16, end: 0.84, bulge: 0.010,
    });
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const extraLids = defineKit({
  name: "extra-lids",
  family: "face",
  doc: "stacked lid plates on the pear eye — extra crease the camera hits, never a human almond",
  build: buildExtraLids,
});

export default extraLids;
