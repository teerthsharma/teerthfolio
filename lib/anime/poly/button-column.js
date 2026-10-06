import { defineKit } from "./define.js";
import { builder, addBox, addDisc } from "./mesh.js";

export function buildButtonColumn({ count = 4 } = {}) {
  const b = builder();
  addBox(b, 0, 0.02, 0.055, 0.018, 0.16, 0.008);
  const n = Math.max(3, count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const y = 0.14 - t * 0.24;
    addDisc(b, 0, y, 0.068, 0.014, 0.014, 0, 0.08, 1, 10, 0.004);
    addBox(b, 0, y, 0.074, 0.003, 0.003, 0.002);
  }
  return b.finish();
}

export const buttonColumn = defineKit({
  name: "button-column",
  family: "costume",
  doc: "placket + gold-catch button discs — a column the close-up can count",
  build: buildButtonColumn,
});

export default buttonColumn;
