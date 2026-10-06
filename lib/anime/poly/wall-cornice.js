import { defineKit } from "./define.js";
import { builder, addSweepX } from "./mesh.js";

export function buildWallCornice() {
  const b = builder();
  const ogee = [
    [0.000, 0.000],
    [0.008, 0.006],
    [0.018, 0.010],
    [0.028, 0.022],
    [0.022, 0.036],
    [0.008, 0.042],
    [0.000, 0.048],
    [-0.006, 0.036],
    [-0.004, 0.012],
  ];
  addSweepX(b, ogee, -0.55, 0.55, 10);
  return b.finish();
}

export const wallCornice = defineKit({
  name: "wall-cornice",
  family: "set-edge",
  doc: "wall/ceiling cornice ogee — only the silhouette strip, the wall stays a card",
  build: buildWallCornice,
});

export default wallCornice;
