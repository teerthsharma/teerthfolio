import { defineKit } from "./define.js";
import { builder, addRibbon } from "./mesh.js";

export function buildCloakFolds({ count = 6 } = {}) {
  const b = builder();
  const n = Math.max(4, count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = -0.22 + t * 0.44;
    const sag = 0.02 + (i % 2) * 0.015;
    addRibbon(b, [x, 0.18, 0.02], [x * 1.15, -0.22, -0.04 - sag], 0.028, 0.034, 5, 0.008);
    addRibbon(b, [x + 0.018, 0.16, 0.00], [x * 1.12 + 0.02, -0.20, -0.06 - sag], 0.012, 0.016, 5, 0.005);
  }
  return b.finish();
}

export const cloakFolds = defineKit({
  name: "cloak-folds",
  family: "costume",
  doc: "hanging cloak fold ridges — cloth volume at the silhouette, far cloak stays a card",
  build: buildCloakFolds,
});

export default cloakFolds;
