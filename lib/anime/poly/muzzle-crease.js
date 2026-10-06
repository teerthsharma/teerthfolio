import { defineKit } from "./define.js";
import { builder, addRibbon, addTaper } from "./mesh.js";

export function buildMuzzleCrease() {
  const b = builder();
  addRibbon(b, [0.00, 0.02, 0.30], [0.00, -0.04, 0.34], 0.010, 0.006, 3, 0.004);
  addRibbon(b, [0.00, 0.00, 0.31], [0.055, -0.035, 0.30], 0.009, 0.005, 4, 0.0035);
  addRibbon(b, [0.00, 0.00, 0.31], [-0.055, -0.035, 0.30], 0.009, 0.005, 4, 0.0035);
  addTaper(b, 0, 0.01, 0.33, 0, -0.01, 0.36, 0.014, 0.008, 6, 3);
  return b.finish();
}

export const muzzleCrease = defineKit({
  name: "muzzle-crease",
  family: "face",
  doc: "Y-crease on the stub snout — chubby pear, never a rat tube",
  build: buildMuzzleCrease,
});

export default muzzleCrease;
