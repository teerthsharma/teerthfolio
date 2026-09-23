// The river across the island, as one shared contract. It is why the seal
// can travel fast (dive in and the current carries it), why the TensorFlow
// district is a dam, and what fills the NVIDIA moat.
//
// Consumers: lib/world/motion.js (current and swimming), Sea.jsx or
// components/world/sea/ (the water), Island.jsx (the banks), the seal
// (swim pose while live.seal.water > 0), Effects (splashes). The world
// director owns the path; everyone else only reads it.

// Polyline centre in XZ metres, from source to mouth (the direction of flow).
export const RIVER = {
  points: [
    [-68, -46],
    [-44, -34],
    [-20, -30],
    [6, -18],
    [34, -14],
    [58, -24],
    [74, -30],
  ],
  width: 7, // m, bank to bank
  speed: 11, // m/s at the centre line, fading to 0 at the banks
};

// Where (x, z) is relative to the river: inside or not, how deep into it
// (1 at the centre line, 0 at the bank), and the flow velocity there.
export function riverAt(x, z, river = RIVER) {
  let best = { dist: Infinity, dx: 0, dz: 0 };
  const pts = river.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const sx = bx - ax;
    const sz = bz - az;
    const len2 = sx * sx + sz * sz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * sx + (z - az) * sz) / len2));
    const px = ax + sx * t;
    const pz = az + sz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) {
      const len = Math.sqrt(len2);
      best = { dist, dx: sx / len, dz: sz / len };
    }
  }
  const half = river.width / 2;
  const depth = Math.max(0, 1 - best.dist / half);
  return {
    inside: best.dist < half,
    depth,
    flowX: best.dx * river.speed * depth,
    flowZ: best.dz * river.speed * depth,
  };
}
