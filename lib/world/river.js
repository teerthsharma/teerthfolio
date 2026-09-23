// The river across the island, as one shared contract. It is why the seal
// can travel fast (dive in and the current carries it), why the TensorFlow
// district is a dam, and what fills the NVIDIA moat.
//
// Consumers: lib/world/motion.js (current and swimming), Sea.jsx or
// components/world/sea/ (the water), Island.jsx (the banks), the seal
// (swim pose while live.seal.water > 0), Effects (splashes). The world
// director owns the path; everyone else only reads it.
//
// The course, source to mouth: a glacier spring in the Google range between
// Highway Pass and Mount MujoRush; south into a lake held back by the
// TensorFlow Dam (the water squeezes through its spillway, 7 m wide); past
// the dam's powerhouse; east across the island north of the igloo, under the
// Home Bridge; along the north side of the NVIDIA keep (the moat's fourth
// side); and out past Trident Point into the sea.

// Polyline centre in XZ metres, from source to mouth (the direction of flow).
// A point's third value is the river's width there, bank to bank; the width
// changes linearly along each segment.
export const RIVER = {
  points: [
    [-36, -83, 8], // the spring, under the glacier
    [-36, -77, 8],
    [-36, -71, 8],
    [-36, -65, 8],
    [-36, -59, 16], // the lake behind the dam
    [-36, -54, 16],
    [-36, -49, 7], // the dam's spillway
    [-36, -42, 8],
    [-34, -35, 8],
    [-27, -29, 8],
    [-13, -27, 8],
    [0, -27, 8], // the Home Bridge
    [16, -27, 8],
    [30, -28, 9], // the moat's north side, along the NVIDIA keep
    [62, -28, 9],
    [75, -33, 9],
    [96, -40, 10], // the mouth, out in the sea past the rim
  ],
  width: 8, // m, bank to bank, wherever a point gives none
  speed: 14, // m/s at the centre line, fading to 0 at the banks: faster than the seal slides (11)
  // Decks across the water, where paths cross: centre, and the deck's width
  // along the flow. The deck spans the whole river. Rendering data only;
  // riverAt still reports water under them.
  bridges: [
    { name: "dam footbridge", x: -36, z: -44, width: 4 },
    { name: "Home Bridge", x: 0, z: -27, width: 6 },
    { name: "Trident Bridge", x: 70, z: -31, width: 5 },
  ],
};

// The NVIDIA moat: the river is its north side; this channel is the other
// three, taking water off the river at the keep's north-east corner and
// handing it back at the north-west one, so the moat circulates. Same point
// format. The south side is wider (13 m): NeMo-Relay and topograph float on
// it near the south bank, with open water behind them.
export const MOAT = {
  points: [
    [62, -22, 9],
    [62, -6, 9],
    [58, 2, 13],
    [34, 2, 13],
    [30, -6, 9],
    [30, -22, 9],
  ],
  speed: 5, // a lazy loop
};

const WATERS = [RIVER, MOAT];

// Deepest point of one polyline under (x, z), into `out`.
function probe(line, x, z, out) {
  const pts = line.points;
  const width = line.width ?? RIVER.width;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az, aw = width] = pts[i];
    const [bx, bz, bw = width] = pts[i + 1];
    const sx = bx - ax;
    const sz = bz - az;
    const len2 = sx * sx + sz * sz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * sx + (z - az) * sz) / len2));
    const dist = Math.hypot(x - (ax + sx * t), z - (az + sz * t));
    const half = (aw + (bw - aw) * t) / 2;
    const depth = 1 - dist / half;
    if (depth > out.depth) {
      const len = Math.sqrt(len2);
      out.depth = depth;
      out.half = half;
      out.flowX = (sx / len) * line.speed * depth;
      out.flowZ = (sz / len) * line.speed * depth;
    }
  }
}

// Where (x, z) is relative to the water (river or moat): inside or not, how
// deep into it (1 at the centre line, 0 at the bank), the half-width there
// (m), and the flow velocity. Pass `out` to reuse one object per frame.
export function riverAt(x, z, out = {}) {
  out.depth = 0;
  out.half = RIVER.width / 2;
  out.flowX = 0;
  out.flowZ = 0;
  for (const line of WATERS) probe(line, x, z, out);
  out.inside = out.depth > 0;
  return out;
}
