// The island's water, as one shared contract. The geology, source to sea:
//
//   TRITON's ice mountain stands on the north coast. Its central glacier
//   ends in a snout at z = -72; meltwater leaves an ice cave there as THE
//   RIVER. Triton's second (western) outlet glacier flows south beside the
//   river, down the valley between Mount MujoRush (west) and the Google
//   range (east), and its tongue curls east across the valley floor: the
//   TENSORFLOW ICE DAM. The river fills the lake behind it (the reservoir).
//   The ice blocks the valley's old way south, so the lake spills east
//   through the col at the dam's tip, and that spill is what cut and fills
//   THE NVIDIA MOAT, a ring lake round the keep (a rock mesa). The water
//   runs round the moat's north-east side and leaves it at its east point
//   as the outflow, where the pyrefly floes are chained, and out to the sea.
//   The old riverbed below the dam is dry: the XLA geyser erupts there.
//
// Consumers: lib/world/motion.js (current and swimming), the sea track (the
// water surfaces), the ground track (banks cut into the land, bridges), the
// land builders (the dam, the moat, the floes), the seal (swim pose while
// live.seal.water > 0), Effects (splashes). The world director owns the
// course; everyone else only reads it.

// Polyline centre in XZ metres, from source to mouth (the direction of
// flow). A point's third value is the water's width there, bank to bank; the
// width changes linearly along each segment. Where the water widens it slows
// (the same water through a wider section), so the lake is calm and the
// spill is quick.

import { PEAK } from "./peak.js";

const RING = { x: 46, z: -30, radius: 12, width: 9, keep: 7.5 };

// Points on the moat's centre circle, clockwise seen from above (x east,
// z south), from angle a0 to a1 in degrees (0 = east, 90 = south).
function arc(a0, a1, step = 22.5) {
  const out = [];
  for (let a = a0; a <= a1 + 1e-9; a += step) {
    const r = (a * Math.PI) / 180;
    out.push([+(RING.x + Math.cos(r) * RING.radius).toFixed(2), +(RING.z + Math.sin(r) * RING.radius).toFixed(2), RING.width]);
  }
  return out;
}

export const RIVER = {
  points: [
    [-4, -72, 8], // the spring: the ice cave at the west end of Triton's glacier snout
    [-4, -67, 8],
    [-4, -62, 8], // down the valley: Triton's western glacier is the west bank
    [-3, -58, 8],
    [-1, -54, 12], // the lake behind the TensorFlow ice dam (the reservoir)
    [0, -50, 18],
    [1, -46, 16],
    [4, -42, 10], // along the dam's north face
    [8, -42, 8], // the spill: past the dam's tip, east through the col
    [18, -42, 8],
    [28, -42, 8],
    [38, -42, 8],
    ...arc(-90, 0), // into the NVIDIA moat at its north point, round its east side
    [66, -31, 9], // the outflow, where the pyrefly floes are chained
    [74, -33, 9],
    [82, -35, 10],
    [98, -39, 10],
    [112, -43, 10],
    [128, -47, 11], // the mouth, out in the sea past the rim
  ],
  width: 8, // m, bank to bank, wherever a point gives none; the speed below is for this width
  speed: 14, // m/s at the centre line of an 8 m channel, fading to 0 at the banks: faster than the seal slides (11)
  // Decks across the water where paths cross: centre, and the deck's width
  // along the flow. Each deck spans the water there, bank to bank, square
  // to the flow. Rendering data only; riverAt still reports water under them.
  bridges: [
    { name: "Spill Bridge", x: 13, z: -42, width: 3.4 }, // the spill, on the way north to Triton and the Google range
    { name: "Outflow Bridge", x: 64, z: -30.75, width: 3.4 }, // the outflow, between the pyrefly floes and XNNPACK
    { name: "Caustic Bridge", x: 55.5, z: 60.25, width: 3.4 }, // the glacier river, on the way to the lighthouse
    { name: "Planimeter Bridge", x: 43.6, z: 14.8, width: 3.4 }, // the glacier river, on the way to planimeter
    { name: "Moat Road Bridge", x: 46, z: -4.6, width: 3.4 }, // the glacier river, between NeMo-Relay's and topograph's docks
  ],
};

// THE GLACIER RIVER: meltwater of the Fountain Peak (lib/world/peak.js). It leaves the summit as a waterfall
// down the north-east cliff, gathers in a spring pool at the foot (the first point) and runs north across the
// island, a real channel with depth the seal swims and rides, to join the NVIDIA moat at its south point.
export const GLACIER = {
  points: [
    [PEAK.x + 15.5, PEAK.z - 5.6, 5], // the spring pool (the peak stands further out now: the river runs on to its old course)
    [56, 72, 4],
    [56, 63, 3.8],
    [54, 56, 3.6],
    [48, 52.5, 3.6],
    [45.5, 51.4, 4], // the spring pool, where the waterfall lands at the peak's foot
    [44.6, 46, 3.6],
    [44.4, 42.1, 3.6],
    [43.3, 34, 5.4],
    [43.3, 25, 4],
    [43.3, 18.5, 3.4],
    [43.8, 8, 4],
    [46, -4.6, 3],
    [46.2, -12, 6],
    [46, -18, 9], // the moat's south point
  ],
  width: 5.4,
  speed: 9, // m/s at the centre line: a brisk melt-stream, slower than the main river
};

// The NVIDIA moat: the river runs its north-east quarter (above); this line
// is the other three quarters, taking water on at the east point and handing
// it back at the north point, so the whole ring circulates clockwise. Its
// south side is where NeMo-Relay and topograph float, in front of the keep.
export const MOAT = {
  points: arc(0, 270),
  width: RING.width,
  speed: 5, // a lazy loop
  // The ring itself, for whoever draws it: centre, centre-line radius, water
  // width, and the keep's radius (the rock mesa the water surrounds).
  ring: RING,
};

// The TensorFlow ice dam: the crest line of the glacier tongue across the
// valley, west to east. The reservoir presses against its north face; south
// of it the old riverbed is dry. scripts/check-world.mjs holds it to that.
export const DAM = { from: [-12, -34], to: [4, -34] };

// The middle of the reservoir, the lake the dam holds back.
export const RESERVOIR = { x: 0, z: -48 };

// Every water line, for code that walks them all (banks, water surfaces).
export const WATERS = [RIVER, MOAT, GLACIER];

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
    const w = aw + (bw - aw) * t;
    const half = w / 2;
    const depth = 1 - dist / half;
    if (depth > out.depth) {
      const len = Math.sqrt(len2);
      const speed = line.speed * Math.min(1.15, width / w) * depth;
      out.depth = depth;
      out.half = half;
      out.flowX = (sx / len) * speed;
      out.flowZ = (sz / len) * speed;
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

// Distance (m) from (x, z) to the nearest bank: negative in the water. For
// placing things near the water without putting them in it.
export function waterGap(x, z) {
  let gap = Infinity;
  for (const line of WATERS) {
    const pts = line.points;
    const width = line.width ?? RIVER.width;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az, aw = width] = pts[i];
      const [bx, bz, bw = width] = pts[i + 1];
      const sx = bx - ax;
      const sz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1)));
      gap = Math.min(gap, Math.hypot(x - (ax + sx * t), z - (az + sz * t)) - (aw + (bw - aw) * t) / 2);
    }
  }
  return gap;
}

// THE PYREFLY WHIRLPOOL, on the channel's centre line beside the floes'
// funnel (its pin, components/world/land/parts/floes-layout.js PIN, stands
// 1.5 m off the north bank, too close to orbit round): a swimmer who drifts in
// is caught, carried round the pin, tighter and faster, for `hold` seconds,
// then thrown back onto the island through the air for `flight` seconds to
// land at `throwTo` (lib/world/motion.js, for a world that passes it; npm run
// check holds the landing dry, flat and clear). The owner: "it should catch
// the seal and throw it a little back in the map".
export const WHIRLPOOL = { x: 74, z: -33, radius: 4.5, hold: 1.4, flight: 0.9, throwTo: [64, -17] };
