// Pure precompute for the "smatrix" sculpture (resolvent, place id
// p-resolvent): where each hop's bead sits in the glass case, and its size,
// mass and colour. No React, no three.js -- just the numbers Smatrix.jsx
// animates against.
//
// The story (data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "smatrix --" comment): the resolvent
// (I - gamma*P)^-1 expands as I + gamma*P + gamma^2*P^2 + ..., one term per
// hop, gamma = 0.82. The figure stacks the K = 22 hops as translucent slices
// of a glass block -- depth is hop order -- each slice a plume of mass that
// travels, widens and fades by gamma^k as it goes, the deeper terms thinning
// into thrown grains of dust; a back wall carries the running sum, the
// out-state; and once a cycle the whole stack is read straight down its
// depth axis, where "the path between [in-state and out-state] cannot be
// seen anywhere" -- Wheeler's S-matrix (1937). Here the K + 1 hops are a
// beaded spiral strung through the case, hop 0 at the front, hop K at the
// back against the sum panel; the bead orbit and its Gaussian-scatter dust
// are "made up for the picture, not a measurement", exactly as the source
// figure says its own lattice and transition matrix are -- but gamma and K
// are the figure's own numbers, kept exact.

export const K = 22; // labels: "(I - gammaP)-1 = I + gammaP + gamma2P2 + ..."
export const GAM = 0.82; // labels: "shrinking while gamma.rho(P) < 1"
export const BEADS = K + 1;

// fig.js's own hue ramp (--blue-500, --violet-500, --coral-500): the slice
// colours in the source figure, kept exact.
const BLUE = [0x24, 0x56, 0xdc];
const VIOLET = [0xa6, 0x6c, 0xf0];
const CORAL = [0xd9, 0x37, 0x6e];
export const VIOLET_HEX = "#a66cf0"; // fig.js paints every partial/running sum in this one violet

function hexOf(rgb) {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
function ramp(f) {
  const x = Math.max(0, Math.min(1, f)) * 2;
  const i = Math.min(1, Math.floor(x));
  const u = x - i;
  const a = i === 0 ? BLUE : VIOLET;
  const b = i === 0 ? VIOLET : CORAL;
  return hexOf(a.map((v, n) => v + (b[n] - v) * u));
}

// A tiny deterministic hash standing in for the figure's own Gaussian
// scatter. Module scope must never call Math.random(): that would make the
// server's and the client's very first frame disagree.
function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

const TURNS = 1.35; // how many times the orbit winds over the K hops
const ANGLE0 = -0.35; // fig.js: X0 = 0.68 * [cos(-0.35), sin(-0.35)]
const R0 = 0.16; // orbit radius at hop 0: tight, by the in-state point
const RMAX = 0.95; // orbit radius at hop K: the travelled, widened arm
const BEAD_R0 = 0.15; // hop 0: the identity term, a small bright core
const BEAD_RMIN = 0.09; // hop K: nearly dust -- fix 4: 0.05 -> 0.09, so it still reads through the glass at game distance

// SLICES[k]: one bead per hop. x, y and zFrac are normalized (metres for
// x/y, 0..1 front-to-back for z) so Smatrix.jsx can scale them to the case
// it actually builds.
export const SLICES = Array.from({ length: BEADS }, (_, k) => {
  const f = k / K;
  const angle = ANGLE0 + f * TURNS * Math.PI * 2;
  const radius = R0 + (RMAX - R0) * f ** 0.7;
  const mass = GAM ** k; // fig.js: slice k = gamma^k P^k x0
  const shrink = f ** 0.6;
  return {
    k,
    f,
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    zFrac: f,
    mass,
    beadRadius: BEAD_R0 + (BEAD_RMIN - BEAD_R0) * shrink,
    color: ramp(f),
  };
});

// Dust: 0-4 satellite grains per bead, only past the midpoint -- "the deeper
// terms of the series ... crumble into dust" (figure.desc). Flattened to one
// array so the component can drive a single instancedMesh.
export const DUST = SLICES.flatMap((s) => {
  if (s.f <= 0.45) return [];
  const n = Math.round(1 + s.f * 3.2);
  return Array.from({ length: n }, (_, m) => {
    const a = hash(s.k * 7 + m) * Math.PI * 2;
    const rr = 0.05 + hash(s.k * 13 + m * 3) * 0.17;
    return {
      k: s.k,
      dx: Math.cos(a) * rr,
      dy: Math.sin(a) * rr * 0.6,
      dz: (hash(s.k * 5 + m) - 0.5) * 0.14,
      size: 0.02 + hash(s.k * 3 + m * 11) * 0.025,
    };
  });
});
