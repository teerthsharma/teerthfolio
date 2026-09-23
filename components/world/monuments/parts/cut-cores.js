// Pure layout for the "cut" building: topological-ml-toolkit (place id
// p-topological-ml-toolkit). No React, no three.js: just the log deck's
// timing and lanes that Cut.jsx builds from.
//
// Mirrors teerthsharma.github.io/fig.js's cut(): growing a scale r over a
// noisy point cloud, pieces (H0) and loops (H1) are born and die, and only
// the long-lived ones -- two loops, two pieces, per the figure's own comment
// -- cross the cut and survive; the rest (80 short pieces, 6 short loops in
// the real figure) is noise. Eight logs lie flat in the yard, one per
// row: a log's length is how long its piece or loop lived, read off the
// SAME growing scale (first the sweep gauge's x position, later the blade's).

export const SWEEP_X0 = -2.1;
export const SWEEP_X1 = 2.1;
export const SWEEP_RANGE = SWEEP_X1 - SWEEP_X0;
export const HOLD_DUR = 3; // s the reveal holds before the deck resets
export const SHRINK_DUR = 0.6;
export const SLIDE_DUR = 0.8; // s for every log to slide its start to zero (fig.js's "bars slide to start at zero")
export const CUT_DUR = 1.1; // s for the blade to travel in from BLADE_X_START to its stop
export const EASE_RATE = 4; // near/far blend: k = 1 - exp(-EASE_RATE*dt)

// A piece or loop whose span (how long it lived) exceeds this crosses the
// cut and survives; born, exactly the two long pieces and two long loops
// do. The blade's final stop is this same distance out from SWEEP_X0, so a
// log's slid-to-zero far end (0 + span) pokes past the blade only when its
// span clears this threshold -- geometry does the classifying.
export const SURVIVOR_SPAN = 1.5;

// The log deck: 8 lanes laid flat on the snow, from z LANE_Z0 to LANE_Z1.
export const LANE_Z0 = 0.4;
export const LANE_Z1 = 2.4;
export const LOG_Y = 0.32; // a log's centreline height above the snow -- proud of the 0.18 m deck rails, so it reads as timber, not a slat

export const BLADE_X_START = 2.0; // 2.6 put the blade+glow disc 9% past place.radius at some spin angle (round 1 review, verified with CylinderGeometry + matrix math); 2.0 keeps max reach at 3.46 m unscaled, under the 3.614 m budget
export const BLADE_X_STOP = SWEEP_X0 + SURVIVOR_SPAN; // -0.6: the "span > 1.5 m" line, in world x
export const BLADE_Y = 0.95;
export const BLADE_Z = (LANE_Z0 + LANE_Z1) / 2;
export const BLADE_RADIUS = 0.9;
export const BLADE_THICK = 0.3; // 0.2 collapsed to a hairline at any partially edge-on spin angle (round 2 review); thick enough to keep visible depth across the spin cycle, still under the place.radius reach budget (_check-blade-reach.mjs)

export const BEAD_DIAMETER = 0.3;

// birth/death in metres of scale travel from SWEEP_X0, kept exactly as the
// old CORES/LOOPS carried them. kind: "piece" (mint, H0), "loop" (violet,
// H1, the two old portholes -- fig.js's barcode draws loops as violet bars
// too), "noise" (ice, never crosses). Rows are pre-interleaved so survivors
// don't block into one end of the deck, the way a real yard would fill.
const RAW_LOGS = [
  { birth: 0.5, death: 1.0, kind: "noise" },
  { birth: 0.0, death: 3.9, kind: "piece" },
  { birth: 0.3, death: 3.6, kind: "loop" },
  { birth: 1.8, death: 2.2, kind: "noise" },
  { birth: 0.9, death: 1.3, kind: "noise" },
  { birth: 0.2, death: 3.4, kind: "piece" },
  { birth: 0.6, death: 3.1, kind: "loop" },
  { birth: 2.4, death: 2.7, kind: "noise" },
];

export const LOGS = RAW_LOGS.map((l, i) => ({
  x0: SWEEP_X0 + l.birth,
  span: l.death - l.birth,
  z: LANE_Z0 + (i * (LANE_Z1 - LANE_Z0)) / (RAW_LOGS.length - 1),
  kind: l.kind, // "piece" | "loop" | "noise"
  survivor: l.death - l.birth > SURVIVOR_SPAN,
}));

// The 4 that cross the cut (2 piece + 2 loop): each leaves a bead on the
// blade line in the second act.
export const SURVIVORS = LOGS.filter((l) => l.survivor);

// 0 (not yet reached) .. 1 (fully grown) for one log at scale x.
export function coreProgress(log, x) {
  return Math.min(1, Math.max(0, (x - log.x0) / log.span));
}
