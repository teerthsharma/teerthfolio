import { defineKit } from "./define.js";
import { builder, addTaper, addDisc, bothSides } from "./mesh.js";

export function buildCuffTurn({ side = 0 } = {}) {
  const one = (s) => {
    const b = builder();
    addTaper(b, s * 0.18, -0.08, 0.04, s * 0.26, -0.12, 0.02, 0.042, 0.038, 8, 3);
    addDisc(b, s * 0.24, -0.11, 0.025, 0.044, 0.040, s * 0.35, -0.4, 0.85, 10, 0.010);
    addTaper(b, s * 0.22, -0.10, 0.03, s * 0.27, -0.13, 0.00, 0.036, 0.030, 7, 2);
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const cuffTurn = defineKit({
  name: "cuff-turn",
  family: "costume",
  doc: "sleeve cuff fold-over at the flipper root — a turn, not a painted ring",
  build: buildCuffTurn,
});

export default cuffTurn;
