import { defineKit } from "./define.js";
import { builder, addBox, addSweepX } from "./mesh.js";

export function buildWindowSash() {
  const b = builder();
  const stile = [
    [0.00, 0.00],
    [0.42, 0.00],
    [0.42, 0.018],
    [0.014, 0.018],
    [0.014, 0.032],
    [0.00, 0.032],
  ];
  addSweepX(b, stile, -0.01, 0.03, 2);
  addBox(b, 0.22, 0.00, 0.010, 0.22, 0.016, 0.016);
  addBox(b, 0.22, 0.42, 0.010, 0.22, 0.014, 0.014);
  addBox(b, 0.44, 0.21, 0.010, 0.014, 0.21, 0.014);
  addBox(b, 0.22, 0.21, 0.008, 0.012, 0.20, 0.010);
  return b.finish();
}

export const windowSash = defineKit({
  name: "window-sash",
  family: "set-edge",
  doc: "window sash L + mullion — only the frame the lens hits, pane stays a card",
  build: buildWindowSash,
});

export default windowSash;
