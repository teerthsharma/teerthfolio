// Pure layout for the "cut" building: topological-ml-toolkit (place id
// p-topological-ml-toolkit). No React, no three.js: just the log deck's
// fixed layout and the blade's sweep timing that Cut.jsx builds from.
//
// Round 2 review: the deck used to grow each log from its own birth point,
// then slide every log's start to zero -- teerthsharma.github.io/fig.js's
// own persistent-homology barcode chart, re-enacted with logs standing in
// for bars ("no diagrams, charts, plotted curves... grids of cubes standing
// for data"). Fixed: the yard is a static pile, already stocked with logs of
// varied length flush against a stop rail, the way a real mill's log deck
// looks. A saw blade periodically sweeps in from its resting line and back
// out, doing an ordinary mill's job -- culling the short offcuts, marking
// what's long enough to keep -- a machine's travel, not a data axis. Kind
// (piece/loop/noise) still splits the pile into fig.js's own mint/violet
// tokens plus dim offcuts, but no log's length or position is derived from
// any birth/death timing any more: the eight lengths below are just a
// stocked yard's own variety.

export const PILE_X0 = -1.7; // every log's near end rests here, flush against a stop rail
export const REST_DUR = 3.2; // s (far) the blade parks before it sweeps in; eased down near the seal, see Cut.jsx
export const REST_DUR_NEAR_DELTA = 1.6; // restDur = REST_DUR - REST_DUR_NEAR_DELTA*k
export const CUT_DUR = 1.1; // s for the blade to travel in to its stop line
export const HOLD_DUR = 2.2; // s the blade holds at its stop line
export const RETRACT_DUR = 0.9; // s for the blade to travel back out to rest
export const EASE_RATE = 4; // near/far blend: k = 1 - exp(-EASE_RATE*dt)

// A log whose tip (PILE_X0 + length) reaches past this line is long enough
// to keep; the blade's stop is this same line, so which logs poke past it
// is decided by geometry, not a stored flag.
export const BLADE_X_STOP = -0.6;
export const BLADE_X_START = 2.0; // 2.6 put the blade+glow disc 9% past place.radius at some spin angle (round 1 review, verified with CylinderGeometry + matrix math); 2.0 keeps max reach at 3.41 m unscaled, under the 3.614 m budget (_check-blade-reach.mjs)
export const BLADE_Y = 0.95;
export const BLADE_RADIUS = 0.9;
export const BLADE_THICK = 0.3; // 0.2 collapsed to a hairline at any partially edge-on spin angle (round 2 review); thick enough to keep visible depth across the spin cycle, still under the place.radius reach budget (_check-blade-reach.mjs)

export const BEAD_DIAMETER = 0.3;

// The log deck: 8 lanes laid flat on the snow, from z LANE_Z0 to LANE_Z1.
// LANE_Z0 sits flush against the shed's intake threshold (Cut.jsx's
// SHED_Z1 = 0.2) so the lanes visibly start right at the doorway, no gap
// (round 2 review).
export const LANE_Z0 = 0.2;
export const LANE_Z1 = 2.4;
export const LOG_Y = 0.42; // a log's centreline height -- clears the 0.18 m deck rails at the thickened LOG_RADIUS (Cut.jsx), so a log sits proud of the rail, not sunk into it

export const BLADE_Z = (LANE_Z0 + LANE_Z1) / 2;

// Fixed, non-data-derived lengths: a yard already stocked with varied logs,
// not ones that grow. kind: "piece" (mint, H0), "loop" (violet, H1 -- the
// two colours fig.js's own barcode draws pieces and loops in), "noise"
// (dim offcuts, never crosses). Rows are pre-interleaved so the two kept
// kinds don't block into one end of the deck, the way a real yard fills.
const RAW_LOGS = [
  { length: 0.6, kind: "noise" },
  { length: 2.6, kind: "piece" },
  { length: 2.1, kind: "loop" },
  { length: 0.8, kind: "noise" },
  { length: 0.5, kind: "noise" },
  { length: 3.0, kind: "piece" },
  { length: 2.4, kind: "loop" },
  { length: 0.9, kind: "noise" },
];

export const LOGS = RAW_LOGS.map((l, i) => ({
  x0: PILE_X0,
  length: l.length,
  z: LANE_Z0 + (i * (LANE_Z1 - LANE_Z0)) / (RAW_LOGS.length - 1),
  kind: l.kind, // "piece" | "loop" | "noise"
  survivor: PILE_X0 + l.length > BLADE_X_STOP,
}));

// The 4 that cross the cut (2 piece + 2 loop): each leaves a bead on the
// blade line when the blade holds at its stop.
export const SURVIVORS = LOGS.filter((l) => l.survivor);
