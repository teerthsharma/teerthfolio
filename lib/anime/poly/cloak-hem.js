import { defineKit } from "./define.js";
import { builder, addSweepX, addRibbon } from "./mesh.js";

export function buildCloakHem() {
  const b = builder();
  const profile = [
    [0.000, 0.000],
    [0.012, 0.018],
    [0.006, 0.032],
    [-0.010, 0.028],
    [-0.014, 0.008],
    [-0.004, 0.000],
  ];
  addSweepX(b, profile, -0.28, 0.28, 8);
  addRibbon(b, [-0.26, 0.00, 0.01], [0.26, 0.00, 0.01], 0.016, 0.016, 6, 0.006);
  return b.finish();
}

export const cloakHem = defineKit({
  name: "cloak-hem",
  family: "costume",
  doc: "weighted cloak hem roll — only the lip the lens hits, rest stays a card",
  build: buildCloakHem,
});

export default cloakHem;
