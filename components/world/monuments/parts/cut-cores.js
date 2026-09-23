// Pure layout for the "cut" building: topological-ml-toolkit (place id
// p-topological-ml-toolkit). No React, no three.js: just the rack of ice
// cores and the two portholes a scan gauge sweeps across, in the metres
// Cut.jsx builds from.
//
// Mirrors teerthsharma.github.io/fig.js's cut(): growing a scale r over a
// noisy point cloud, pieces (H0) and loops (H1) are born and die, and only
// the long-lived ones -- two loops, two pieces, per the figure's own comment
// -- cross the cut and survive; the rest (80 short pieces, 6 short loops in
// the real figure) is noise. Every core and porthole below reads its
// progress off the SAME growing scale (the gauge's x position mapped 0..1),
// exactly as every bar and hole in the source figure answers to the one r:
// six rack rows stand in for the pieces (2 long, 4 short noise), and two
// portholes in the front wall -- a hole opening, not a rod extending -- for
// the two loops.

export const SWEEP_X0 = -2.1;
export const SWEEP_X1 = 2.1;
export const SWEEP_RANGE = SWEEP_X1 - SWEEP_X0;
export const HOLD_DUR = 3; // s the full rack holds before the gauge resets
export const SHRINK_DUR = 0.6;
export const EASE_RATE = 4; // near/far blend: k = 1 - exp(-EASE_RATE*dt)

export const RACK_Z = 1.1; // centreline of posts, rails and cores
export const RACK_Y_BASE = 0.45;
export const RACK_Y_STEP = 0.22;
export const RACK_TOP_BEAM_Y = 1.75;
export const RACK_POST_H = 1.85;

// The two portholes: fixed in the wall above the rack, a fixed-size ring
// (chunky at any size beats a ring that shrinks below the island's ~0.12 m
// minimum thickness) that lights up and dims on the same scale, instead of
// a rod that grows sideways.
export const PORTHOLE_Y = 1.9;
export const PORTHOLE_Z = 0.46;
export const PORTHOLE_X = 1.4;
export const PORTHOLE_RADIUS = 0.22;
export const PORTHOLE_TUBE = 0.09;

// birth/death in metres of scale travel from SWEEP_X0 (world x = SWEEP_X0 +
// value). "piece" crosses the cut (span > 1.5 m); "noise" never does. Rows
// run bottom rung to top rung, survivors interleaved with noise the way a
// real rack would fill, not sorted into a block.
const RAW_CORES = [
  { birth: 0.5, death: 1.0, kind: "noise" },
  { birth: 0.0, death: 3.9, kind: "piece" },
  { birth: 1.8, death: 2.2, kind: "noise" },
  { birth: 0.9, death: 1.3, kind: "noise" },
  { birth: 0.2, death: 3.4, kind: "piece" },
  { birth: 2.4, death: 2.7, kind: "noise" },
];

export const CORES = RAW_CORES.map((c, row) => ({
  x0: SWEEP_X0 + c.birth,
  span: c.death - c.birth,
  y: RACK_Y_BASE + row * RACK_Y_STEP,
  kind: c.kind, // "piece" | "noise"
}));

// The two loops that cross the cut, each its own porthole.
const RAW_LOOPS = [
  { birth: 0.3, death: 3.6, side: -1 },
  { birth: 0.6, death: 3.1, side: 1 },
];
export const LOOPS = RAW_LOOPS.map((l) => ({
  x0: SWEEP_X0 + l.birth,
  span: l.death - l.birth,
  x: l.side * PORTHOLE_X,
}));

// 0 (not yet reached) .. 1 (fully grown) for one core/loop at scale x.
export function coreProgress(core, x) {
  return Math.min(1, Math.max(0, (x - core.x0) / core.span));
}
