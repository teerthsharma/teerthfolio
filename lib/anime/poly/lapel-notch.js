import { defineKit } from "./define.js";
import { builder, addPlate, addBox } from "./mesh.js";

export function buildLapelNotch({ side = 0 } = {}) {
  const b = builder();
  const one = (s) => {
    addPlate(b, s * 0.085, 0.12, 0.085, [s * 0.8, 0.4, 0.2], [s * -0.3, 0.7, 0.5], 0.055, 0.04, 2, 2);
    addPlate(b, s * 0.078, 0.10, 0.082, [s * 0.2, -0.6, 0.7], [s * 0.7, 0.2, 0.3], 0.048, 0.036, 2, 2);
    addBox(b, s * 0.072, 0.108, 0.080, 0.008, 0.010, 0.006);
  };
  if (side === 1 || side === -1) one(side);
  else { one(-1); one(1); }
  return b.finish();
}

export const lapelNotch = defineKit({
  name: "lapel-notch",
  family: "costume",
  doc: "step-cut notch where the lapel turns — the silhouette an avid watcher expects",
  build: buildLapelNotch,
});

export default lapelNotch;
