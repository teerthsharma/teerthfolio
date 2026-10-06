import { defineKit } from "./define.js";
import { builder, addSweepX, addBox } from "./mesh.js";

export function buildDeskLip() {
  const b = builder();
  const profile = [
    [0.000, 0.000],
    [0.008, 0.022],
    [0.000, 0.036],
    [-0.018, 0.036],
    [-0.022, 0.012],
    [-0.008, 0.000],
  ];
  addSweepX(b, profile, -0.42, 0.42, 8);
  addBox(b, 0, 0.004, -0.04, 0.40, 0.006, 0.04);
  return b.finish();
}

export const deskLip = defineKit({
  name: "desk-lip",
  family: "set-edge",
  doc: "desk front lip + overhang — the edge the camera hits, the field stays a card",
  build: buildDeskLip,
});

export default deskLip;
