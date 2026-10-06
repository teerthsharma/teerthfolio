import { defineKit } from "./define.js";
import { builder, addTaper } from "./mesh.js";

export function buildHairNape({ count = 7 } = {}) {
  const b = builder();
  const n = Math.max(5, count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = -0.10 + t * 0.20;
    const len = 0.18 + (i % 3) * 0.025;
    addTaper(b, x, 0.02, -0.06, x * 1.2, -len, -0.10 - (i % 2) * 0.02, 0.032, 0.010, 6, 4);
  }
  return b.finish();
}

export const hairNape = defineKit({
  name: "hair-nape",
  family: "hair",
  doc: "nape clumps falling off the back of the pear skull — silhouette, not three tufts",
  build: buildHairNape,
});

export default hairNape;
