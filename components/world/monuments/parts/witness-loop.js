// Pure layout for the "witness" building: nerve (place id p-nerve). Where
// each bead of the polymer-chain loop sits, and the one point they all
// share -- the topological witness. No React, no three.js.
//
// The story (data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "witness --" comment): one chain, coloured
// blue to violet along its length, writhes in three dimensions until it
// passes over itself exactly once; that crossing is the witness. A limaçon
// (r = B + A cos t, A > B > 0) is the simplest closed curve with exactly one
// self-crossing, and — unlike a hand-placed ring — it crosses AT ITS OWN
// POLE, so the pole is the witness point by construction, not a value picked
// to match. Oriented a quarter turn off the schoolbook form (x = r sin t,
// y = r cos t instead of r cos t, r sin t) so the big lobe stands straight up
// the mast instead of lying on its side.

export const N_BEADS = 26;
const A = 0.9; // outer lobe's reach
const B = 0.46; // A > B: this is what gives the inner loop and its one crossing
const WOBBLE = 0.1; // z-depth writhe, baked in once — "writhes in three dimensions"

const BLUE = [0x24, 0x56, 0xdc]; // fig.js --blue-500: the chain's first bead
const VIOLET = [0xa6, 0x6c, 0xf0]; // fig.js --violet-500: its last

function hexOf(rgb) {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

// r(t) = 0 at t = acos(-B/A) and its mirror 2*pi - t — both map straight to
// the pole regardless of t, so this is exactly where the loop passes over
// itself, not a value anyone had to place by hand.
export const WITNESS_LOCAL = { x: 0, y: 0, z: 0 };

export function buildLoopBeads() {
  const beads = [];
  for (let i = 0; i < N_BEADS; i++) {
    const f = i / (N_BEADS - 1);
    const t = f * Math.PI * 2;
    const r = B + A * Math.cos(t);
    beads.push({
      x: r * Math.sin(t),
      y: r * Math.cos(t),
      z: WOBBLE * Math.sin(3 * t),
      color: hexOf(BLUE.map((v, k) => v + (VIOLET[k] - v) * f)),
    });
  }
  return beads;
}
