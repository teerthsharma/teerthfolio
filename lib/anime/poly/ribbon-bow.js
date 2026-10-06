import { defineKit } from "./define.js";
import { builder, addTaper, addRibbon, addDisc } from "./mesh.js";

export function buildRibbonBow() {
  const b = builder();
  addDisc(b, 0, 0.02, 0.07, 0.022, 0.016, 0, 0.2, 0.98, 8, 0.008);
  addTaper(b, -0.01, 0.02, 0.07, -0.08, 0.04, 0.05, 0.018, 0.006, 6, 3);
  addTaper(b, 0.01, 0.02, 0.07, 0.08, 0.04, 0.05, 0.018, 0.006, 6, 3);
  addRibbon(b, [0.00, 0.00, 0.06], [-0.05, -0.10, 0.04], 0.012, 0.010, 4, 0.003);
  addRibbon(b, [0.00, 0.00, 0.06], [0.05, -0.10, 0.04], 0.012, 0.010, 4, 0.003);
  return b.finish();
}

export const ribbonBow = defineKit({
  name: "ribbon-bow",
  family: "costume",
  doc: "school ribbon knot and two tails at the collar — still, printed, close-up only",
  build: buildRibbonBow,
});

export default ribbonBow;
