import { defineKit } from "./define.js";
import { builder, addTaper } from "./mesh.js";

export function buildHairClumps({ count = 12 } = {}) {
  const b = builder();
  const n = Math.max(8, Math.min(16, count | 0));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const yaw = -1.25 + t * 2.50;
    const pitch = 0.18 + (i % 4) * 0.11 + ((i * 3) % 5) * 0.02;
    const len = 0.20 + (i % 5) * 0.028 + (i % 2) * 0.012;
    const r0 = 0.042 - (i % 3) * 0.004;
    const ax = Math.sin(yaw) * 0.03;
    const ay = 0.04;
    const az = Math.cos(yaw) * 0.02;
    const bx = ax + Math.sin(yaw) * Math.cos(pitch) * len;
    const by = ay + Math.sin(pitch) * len;
    const bz = az + Math.cos(yaw) * Math.cos(pitch) * len;
    addTaper(b, ax, ay, az, bx, by, bz, r0, 0.011, 6, 4);
  }
  return b.finish();
}

export const hairClumps = defineKit({
  name: "hair-clumps",
  family: "hair",
  doc: "8–16 tapered hair clumps from the scalp — not three tufts",
  build: buildHairClumps,
});

export default hairClumps;
