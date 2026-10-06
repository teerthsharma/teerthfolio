import { defineKit } from "./define.js";
import { builder, addTaper, bothSides } from "./mesh.js";

export function buildHairSidelock({ side = 0, count = 5 } = {}) {
  const one = (s) => {
    const b = builder();
    const n = Math.max(4, count);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const y0 = 0.10 - t * 0.06;
      const len = 0.14 + t * 0.08;
      addTaper(
        b,
        s * 0.18, y0, 0.06,
        s * (0.20 + t * 0.04), y0 - len, 0.08 + t * 0.03,
        0.024, 0.008, 6, 3,
      );
    }
    return b.finish();
  };
  if (side === 1 || side === -1) return one(side);
  return bothSides(one);
}

export const hairSidelock = defineKit({
  name: "hair-sidelock",
  family: "hair",
  doc: "temple sidelocks as several clumps — frames the pear face, never a human ear lock",
  build: buildHairSidelock,
});

export default hairSidelock;
