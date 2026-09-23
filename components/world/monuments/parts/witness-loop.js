// Pure layout for the "witness" building: nerve (place id p-nerve). Where
// each bead of the polymer-chain loop sits, the one point they all share --
// the topological witness -- and the timing the chain is laid down on. No
// React, no three.js.
//
// The story (data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "witness --" comment, line ~2352): one
// chain, coloured blue to violet along its length, writhes in three
// dimensions until it passes over itself exactly once; that crossing is the
// witness. fig.js draws it as an OPEN trochoid, not a closed curve --
//   x = AA*u - BB*sin(u), y = -BB*cos(u), z = CC*sin(u), u in [-U, U]
// (canvas y points down; three.js y points up, so y is flipped here to
// +BB*cos(u)). Unlike a closed limaçon, the two ends never meet: the chain
// crosses itself exactly once, at u = +/-2.32, and that crossing sits away
// from either end -- not at a pole built into the curve.

export const N_BEADS = 90;
const U = 3.85; // fig.js: u in [-U, U]
const AA = 0.34;
const BB = 1.08;
const CC = 0.62;

// fig.js lays bead i down at B0 + BUILD*i/N, each growing 0 -> 1 over GROW.
// Converted from fig.js's milliseconds to seconds; B0 folds into the cycle's
// own start (bead 0 begins at cycleT = 0).
export const BUILD_DUR = 2.3; // BUILD 2300ms
export const GROW_DUR = 0.42; // GROW 420ms

// The true crossing: fig.js's over/under search finds it at u = +/-2.32,
// where the two strands (z = CC*sin(u), so z = +/-0.45) pass through the
// same (x, y). The ring sits at their shared point, z = 0, the midpoint
// between the two strands.
const WITNESS_U = 2.32;
export const WITNESS_LOCAL = {
  x: 0,
  y: BB * Math.cos(WITNESS_U),
  z: 0,
};

// Which bead index rides near u = +WITNESS_U (fig.js's own reckoning: the
// witness ring blooms once the chain has been laid BUILD*(U+WITNESS_U)/(2U)
// of the way through, "about 0.80N"), used to time the ring's bloom off the
// same build that lays the beads -- nothing places the ring by hand.
export const WITNESS_BEAD_INDEX = Math.ceil((N_BEADS * (U + WITNESS_U)) / (2 * U));

const BLUE = [0x24, 0x56, 0xdc]; // fig.js --blue-500: the chain's first bead
const VIOLET = [0xa6, 0x6c, 0xf0]; // fig.js --violet-500: its last

function hexOf(rgb) {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export function buildLoopBeads() {
  const beads = [];
  for (let i = 0; i < N_BEADS; i++) {
    const f = i / (N_BEADS - 1);
    const u = -U + 2 * U * f;
    beads.push({
      x: AA * u - BB * Math.sin(u),
      y: BB * Math.cos(u),
      z: CC * Math.sin(u),
      color: hexOf(BLUE.map((v, k) => v + (VIOLET[k] - v) * f)),
    });
  }
  return beads;
}
