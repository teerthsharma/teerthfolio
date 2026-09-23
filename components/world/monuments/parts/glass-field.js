// Pure layout for the glass building (faraday / p-faraday): the transformer
// tank and deck it stands on, the two bushings' positions, and the
// field-line motif drawn on the deck between them. No React, no three.js --
// just the numbers and point arrays Glass.jsx turns into geometry.
//
// The story (data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "glass --" comment): a two-wire line
// pierces a sheet of glass. E's lines are the circles that pass through
// BOTH wires (the gradient of the two-wire potential); H's are the
// Apollonian circles that run round EACH one (the potential's own level
// sets) -- the two families are orthogonal everywhere, because one is a
// gradient and the other its level set. fig.js finds that field by relaxing
// a wrong guess toward it, over and over, until it settles; only then does
// the coupling E x H glow. This file lays out the settled (converged)
// shape, both families clipped to the deck rectangle exactly as fig.js
// clips every traced line to its own illustration box (glass()'s inside()
// check). Glass.jsx bakes three jittered "wrong guess" states beside it
// once, at module load, and crossfades them in sequence each cycle, so the
// building keeps telling "several starts, one fixed point" without
// re-running the relaxation every frame.

// fig.js's own hues for this figure (its glass() cache: --blue-500,
// --violet-500, --mint-500), kept exact. The amber coupling instead uses
// the place's own radiation colour (Glass.jsx), which lands in the same
// family.
export const BLUE = "#3a6bff"; // brighter than the raw navy so E holds its own against ~235-luma snow
export const VIOLET = "#a66cf0";
export const MINT = "#0b93ab"; // the deck's edge frame
export const GLASS_TINT = "#dff3f6"; // the deck itself: clear, not radiation-amber

export const WIRE_X = 1.1; // each bushing's x offset from centre, on the deck

// The transformer tank: a recognisable, opaque mass under the deck, well
// short of the deck's own footprint so snow shows all round it.
export const BASE_W = 1.8, BASE_D = 1.0, BASE_H = 1.0;
export const FIN_W = 0.1, FIN_H = 0.9, FIN_T = 0.12, FIN_COUNT = 6; // radiator fins, per long side

// The glass deck: raised clear of the tank on four legs, so the snow shows
// underneath and round it -- the opposite of the old flush opaque tile.
export const DECK_W = 4.4, DECK_D = 2.8, DECK_T = 0.12;
export const DECK_Y = 1.1; // the deck's top surface, local y
export const LEG_SIZE = 0.14, LEG_INSET = 0.5;
export const LEG_Y = DECK_Y - DECK_T / 2; // leg height, ground to the deck's underside

export const BUSHING_H = 2.8; // insulator stack height above the deck
export const CAP_Y = DECK_Y + BUSHING_H;

// The two coupled circuits leaving the yard: a sagging conductor from each
// bushing cap out to a pole, both well inside place.radius (3 m).
export const POLE_X = 2.6, POLE_R = 0.2, POLE_Y = CAP_Y - 0.3;
export const CONDUCTOR_R = 0.08;

// A small hazard plate on the tank's corner, tilted for charm.
export const TREFOIL_R = 0.25;

const A = WIRE_X;
const E_BULGE = [0.25, 0.5, 0.9, 1.6].map((v) => v * (WIRE_X / 0.52));
const E_SAMPLES = 20;
const H_K = [1.6, 1.15, 0.8, 0.55]; // the Apollonian family's parameter, both wires
// clip margin so lines stay shy of the deck's raw edge, same idea as
// fig.js's own illustration-box clip
const HALF_W = DECK_W / 2 - 0.18, HALF_D = DECK_D / 2 - 0.18;

// A tiny deterministic hash standing in for the jitter a wrong guess would
// have. Module scope must never call Math.random(): that would make the
// server's and the client's very first frame disagree.
export function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

// Sample an arc from a0 to a1 (a1 may run past a0 by more than a turn) and
// split it into the runs that stay inside the deck rectangle: a line can
// leave and re-enter, so this can hand back more than one polyline.
function sampleRuns(cx, cz, r, a0, a1, samples) {
  const runs = [];
  let cur = [];
  for (let i = 0; i <= samples; i++) {
    const a = a0 + (a1 - a0) * (i / samples);
    const x = cx + r * Math.cos(a);
    const z = cz + r * Math.sin(a);
    if (Math.abs(x) <= HALF_W && Math.abs(z) <= HALF_D) cur.push([x, z]);
    else if (cur.length > 1) { runs.push(cur); cur = []; }
    else cur = [];
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

// A circle through (-a,0) and (a,0) with its centre offset h along their
// perpendicular bisector has radius sqrt(a*a + h*h); a0/a1 bound the SHORT
// way round between the two wire points.
function wireAngles(h) {
  const r = Math.sqrt(A * A + h * h);
  let a0 = Math.atan2(-h, -A);
  let a1 = Math.atan2(-h, A);
  if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
  if (a0 - a1 > Math.PI) a0 -= Math.PI * 2;
  return { r, a0, a1 };
}

// The short "lens" arc through both wires: always close to the axis, so it
// never needs clipping.
function shortArc(h) {
  const { r, a0, a1 } = wireAngles(h);
  return [Array.from({ length: E_SAMPLES }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / (E_SAMPLES - 1));
    return [r * Math.cos(a), h + r * Math.sin(a)];
  })];
}

// The same circle's long way round, clipped to the deck rectangle -- this
// is what turns the old lens-only arcs into the full crossing mesh of
// landing-p-faraday-a.png.
function longArc(h) {
  const { r, a0, a1 } = wireAngles(h);
  const dir = a1 >= a0 ? 1 : -1;
  const b0 = a1, b1 = a1 + dir * (Math.PI * 2 - Math.abs(a1 - a0));
  return sampleRuns(0, h, r, b0, b1, 64);
}

// One polyline per E field line, in local [x, z]: Glass.jsx lifts each onto
// DECK_Y to trace it as a tube.
export const E_LINES = E_BULGE.flatMap((h) => [...shortArc(h), ...longArc(h), ...shortArc(-h), ...longArc(-h)]);

// H field: the Apollonian circle family round each wire (bipolar
// coordinates) -- centre a*coth(k) from the origin, radius a/sinh(k) --
// crosses the E family above at right angles everywhere, unlike a plain
// ring centred on the wire.
function apollonius(sign, k) {
  const cx = (sign * A) / Math.tanh(k);
  const r = A / Math.sinh(k);
  return sampleRuns(cx, 0, r, 0, Math.PI * 2, 72);
}
export const H_LINES = H_K.flatMap((k) => [...apollonius(-1, k), ...apollonius(1, k)]);
