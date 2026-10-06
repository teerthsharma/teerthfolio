import { defineKit } from "./define.js";
import { builder, addLidBand, addPlate } from "./mesh.js";

export function buildBrowShelf() {
  const b = builder();
  addLidBand(b, {
    cx: 0, cy: 0.10, cz: 0.20, rx: 0.20, ry: 0.028, inner: 0.70,
    segs: 14, thick: 0.012, start: 0.08, end: 0.92, bulge: 0.016,
  });
  addPlate(b, 0, 0.11, 0.19, [1, 0, 0.08], [0, 0.2, 0.95], 0.36, 0.04, 6, 2);
  return b.finish();
}

export const browShelf = defineKit({
  name: "brow-shelf",
  family: "face",
  doc: "brow shelf above the pear eyes — a ledge for half-lid shade, not a human ridge",
  build: buildBrowShelf,
});

export default browShelf;
