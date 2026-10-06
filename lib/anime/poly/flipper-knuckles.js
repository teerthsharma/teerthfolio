import { defineKit } from "./define.js";
import { builder, addRibbon, addTaper } from "./mesh.js";

export function buildFlipperKnuckles() {
  const b = builder();
  addTaper(b, 0.00, 0.00, 0.00, 0.58, 0.03, -0.01, 0.080, 0.040, 8, 4);
  for (let i = 0; i < 4; i++) {
    const x = 0.16 + i * 0.10;
    addRibbon(b, [x, 0.02, -0.06], [x + 0.02, 0.05, 0.07], 0.014, 0.010, 3, 0.005);
  }
  return b.finish();
}

export const flipperKnuckles = defineKit({
  name: "flipper-knuckles",
  family: "flipper",
  doc: "digit ridges across the paddle — suggest fingers without growing a human hand",
  build: buildFlipperKnuckles,
});

export default flipperKnuckles;
