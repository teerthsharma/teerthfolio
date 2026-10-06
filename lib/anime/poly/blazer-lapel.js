import { defineKit } from "./define.js";
import { builder, addPlate, addBox } from "./mesh.js";

export function buildBlazerLapel({ side = 0 } = {}) {
  const b = builder();
  const one = (s) => {
    addPlate(b, s * 0.10, 0.06, 0.08, [s * 0.55, 0.75, 0.15], [s * 0.2, -0.3, 0.92], 0.16, 0.22, 3, 4);
    addPlate(b, s * 0.07, 0.02, 0.09, [s * 0.4, 0.2, 0.9], [0, 1, 0.05], 0.05, 0.20, 2, 4);
    addBox(b, s * 0.04, 0.10, 0.07, 0.012, 0.08, 0.010);
  };
  if (side === 1 || side === -1) one(side);
  else { one(-1); one(1); }
  return b.finish();
}

export const blazerLapel = defineKit({
  name: "blazer-lapel",
  family: "costume",
  doc: "folded blazer lapel with thickness — the V the camera hits, not a painted stripe",
  build: buildBlazerLapel,
});

export default blazerLapel;
