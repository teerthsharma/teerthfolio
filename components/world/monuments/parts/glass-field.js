// Pure layout for the glass building (faraday / p-faraday): the cabinet and
// deck it stands on, the two bushings' positions, and the field-line motif
// drawn on the deck between them. No React, no three.js -- just the numbers
// and curve samples Glass.jsx turns into geometry.
//
// The story (data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "glass --" comment): a two-wire line
// pierces a sheet of glass. E's lines are the circles that pass through
// BOTH wires; H's are the circles that run round EACH one; the two families
// cross at right angles everywhere -- the real field of a two-wire line.
// fig.js finds that field by relaxing a wrong guess toward it, over and
// over, until it settles; only then does the coupling E x H glow. This file
// lays out the settled (converged) shape; Glass.jsx bakes a jittered "wrong
// guess" beside it once, at module load, and crossfades one into the other
// each cycle, so the building keeps telling "several starts, one fixed
// point" without re-running the relaxation every frame.

// fig.js's own hues for this figure (its glass() cache: --blue-500,
// --violet-500), kept exact. The amber coupling instead uses the place's
// own radiation colour (Glass.jsx), which lands in the same family.
export const BLUE = "#2456dc";
export const VIOLET = "#a66cf0";

export const WIRE_X = 0.52; // each bushing's x offset from centre, on the deck
export const BASE_W = 2.2, BASE_D = 1.3, BASE_H = 0.46; // the cabinet the deck sits on
export const DECK_W = 2.0, DECK_D = 1.1, DECK_T = 0.09; // the glass deck itself
export const DECK_Y = BASE_H + DECK_T; // the deck's top surface, local y
export const BUSHING_H = 3.4; // insulator stack height above the deck

// H field: circles round a single wire, radii growing outward.
export const H_RADII = [0.15, 0.28, 0.42];

// E field: circles through BOTH wire points. A circle through (-a,0) and
// (a,0) with its centre offset h along their perpendicular bisector has
// radius sqrt(a*a + h*h); the short arc between the two points is what gets
// drawn, so a few h values nest into the lens bundle a real two-wire field
// makes -- one side of the line for h > 0, the other for h < 0.
const A = WIRE_X;
const E_BULGE = [0.3, 0.58, 0.95];
const E_SAMPLES = 16;

// A tiny deterministic hash standing in for the jitter a wrong guess would
// have. Module scope must never call Math.random(): that would make the
// server's and the client's very first frame disagree.
export function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function arc(h, samples = E_SAMPLES) {
  const r = Math.sqrt(A * A + h * h);
  let a0 = Math.atan2(-h, -A);
  let a1 = Math.atan2(-h, A);
  if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
  if (a0 - a1 > Math.PI) a0 -= Math.PI * 2;
  return Array.from({ length: samples }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / (samples - 1));
    return [r * Math.cos(a), h + r * Math.sin(a)]; // [x, z] on the deck
  });
}

// One polyline per nested field line, in local [x, z]: Glass.jsx lifts each
// onto DECK_Y to trace it as a tube.
export const E_LINES = E_BULGE.flatMap((h) => [arc(h), arc(-h)]);
