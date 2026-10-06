import { defineKit } from "./define.js";
import { builder, addTaper, addDisc } from "./mesh.js";

export function buildFlipperPads() {
  const b = builder();
  addTaper(b, 0.00, 0.00, 0.00, 0.62, 0.04, -0.02, 0.085, 0.042, 8, 5);
  const pads = [
    [0.14, 0.02, 0.05, 0.028, 0.022],
    [0.28, 0.03, 0.06, 0.024, 0.018],
    [0.40, 0.035, 0.05, 0.022, 0.016],
    [0.50, 0.04, 0.03, 0.020, 0.014],
    [0.56, 0.045, -0.01, 0.018, 0.012],
  ];
  for (const [x, y, z, rx, ry] of pads) {
    addDisc(b, x, y, z, rx, ry, 0.05, 0.85, 0.52, 8, 0.007);
    addTaper(b, x - 0.02, y - 0.01, z - 0.01, x + 0.03, y + 0.01, z + 0.01, rx * 0.7, rx * 0.45, 6, 2);
  }
  return b.finish();
}

export const flipperPads = defineKit({
  name: "flipper-pads",
  family: "flipper",
  doc: "finger-suggest pads on the paddle — five pads, still a flipper, never a hand",
  build: buildFlipperPads,
});

export default flipperPads;
