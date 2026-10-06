import { defineKit } from "./define.js";
import { builder, addTaper, addDisc } from "./mesh.js";

export function buildSnoutPad() {
  const b = builder();
  for (const s of [-1, 1]) {
    addTaper(b, s * 0.028, -0.02, 0.28, s * 0.042, -0.04, 0.33, 0.022, 0.016, 7, 3);
    addDisc(b, s * 0.038, -0.035, 0.325, 0.020, 0.016, s * 0.12, -0.25, 0.96, 8, 0.008);
  }
  addDisc(b, 0, -0.01, 0.345, 0.016, 0.012, 0, -0.15, 0.99, 8, 0.007);
  return b.finish();
}

export const snoutPad = defineKit({
  name: "snout-pad",
  family: "face",
  doc: "two soft muzzle pads + nose disc — stub pear snout, never a human philtrum",
  build: buildSnoutPad,
});

export default snoutPad;
