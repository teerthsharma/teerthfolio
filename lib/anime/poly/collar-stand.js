import { defineKit } from "./define.js";
import { builder, addPlate } from "./mesh.js";

export function buildCollarStand() {
  const b = builder();
  const ring = [];
  const segs = 14;
  for (let i = 0; i <= segs; i++) {
    const a = -0.85 + (1.7 * i) / segs;
    const c = Math.cos(a), s = Math.sin(a);
    const x = s * 0.11;
    const z = 0.06 + c * 0.04;
    ring.push([x, z]);
  }
  const profile = [
    [0.00, 0.00],
    [0.045, 0.004],
    [0.048, 0.014],
    [0.006, 0.016],
  ];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[i + 1];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    for (let k = 0; k < profile.length; k++) {
      const k1 = (k + 1) % profile.length;
      const [y0, t0] = profile[k];
      const [y1, t1] = profile[k1];
      const a = b.vert(x0 + nx * t0, y0, z0 + nz * t0);
      const c = b.vert(x1 + nx * t0, y0, z1 + nz * t0);
      const d = b.vert(x1 + nx * t1, y1, z1 + nz * t1);
      const e = b.vert(x0 + nx * t1, y1, z0 + nz * t1);
      b.quad(a, c, d, e);
    }
  }
  addPlate(b, 0, 0.046, 0.09, [1, 0, 0], [0, 0, 1], 0.10, 0.03, 4, 2);
  return b.finish();
}

export const collarStand = defineKit({
  name: "collar-stand",
  family: "costume",
  doc: "vertical collar stand under the cotton — a band, not a decal",
  build: buildCollarStand,
});

export default collarStand;
