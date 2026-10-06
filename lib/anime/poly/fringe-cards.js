import { defineKit } from "./define.js";
import { builder, addRibbon } from "./mesh.js";

export function buildFringeCards({ count = 9 } = {}) {
  const b = builder();
  const n = Math.max(5, count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x0 = -0.16 + t * 0.32;
    const lean = (t - 0.5) * 0.10 + ((i * 17) % 5 - 2) * 0.008;
    const drop = 0.15 + (i % 3) * 0.018;
    addRibbon(
      b,
      [x0, 0.16, 0.18],
      [x0 + lean, 0.16 - drop, 0.22 + (i % 2) * 0.012],
      0.022,
      0.009,
      4,
      0.005,
    );
  }
  return b.finish();
}

export const fringeCards = defineKit({
  name: "fringe-cards",
  family: "face",
  doc: "bangs as tapered cards over the brow — silhouette the lens hits, not a hairball",
  build: buildFringeCards,
});

export default fringeCards;
