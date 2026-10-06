import { defineKit } from "./define.js";
import { builder, addTaper } from "./mesh.js";

export function buildHairCrown({ count = 8 } = {}) {
  const b = builder();
  const n = Math.max(6, Math.min(12, count | 0));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tilt = 0.55 + (i % 3) * 0.08;
    const len = 0.16 + (i % 4) * 0.02;
    addTaper(
      b,
      Math.sin(a) * 0.04, 0.08, Math.cos(a) * 0.03,
      Math.sin(a) * 0.04 * 0.4, 0.08 + Math.sin(tilt) * len, Math.cos(a) * 0.03 - Math.cos(tilt) * len * 0.35,
      0.038, 0.012, 6, 4,
    );
  }
  return b.finish();
}

export const hairCrown = defineKit({
  name: "hair-crown",
  family: "hair",
  doc: "crown volume clumps standing off the scalp — extra mass the close-up reads",
  build: buildHairCrown,
});

export default hairCrown;
