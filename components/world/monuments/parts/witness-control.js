// Pure layout for "witness"'s control: randomised chains behind the main
// loop. fig.js's own words for why they're there: "random chains cross
// themselves as well, which is exactly why a crossing alone proves nothing
// and a control is needed" -- so each one MUST show a crossing of its own,
// not just writhe near the main chain. A limaçon (r = b + a*cos(t), a > b)
// crosses itself at its own pole by construction, so building each control
// chain on one guarantees the crossing without hand-placing it -- the same
// trick the old main-chain curve used before it became the open trochoid.

export const CONTROL_CHAINS = 3;
export const CONTROL_BEADS_PER_CHAIN = 30;
export const CONTROL_N = CONTROL_CHAINS * CONTROL_BEADS_PER_CHAIN;

// Fan the three chains out to the sides of the main loop (in the loop
// group's own unscaled x) instead of stacking them all behind its centre,
// so the dock-facing camera sees them framing it left and right.
export const CONTROL_OFFSET_X = [-1.3, 1.3, 0];

const hash = (i, j) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// One chain's base shape (before the per-frame writhe added in useFrame):
// a limaçon in its own tilted plane, sized and rotated by `seed` so the
// three chains don't stack identically, offset in x so they don't stack
// on top of one another either.
export function buildControlChain(seed, offsetX = 0) {
  const a = 0.55 + 0.18 * hash(seed, 1); // a > b: guarantees the inner loop's one self-crossing
  const b = 0.2 + 0.08 * hash(seed, 2);
  const yaw = hash(seed, 3) * Math.PI * 2;
  const tiltZ = 0.35 + 0.2 * hash(seed, 4);
  const cy = hash(seed, 5) * Math.PI * 2; // phase so the three chains' crossings don't line up
  const beads = [];
  for (let i = 0; i < CONTROL_BEADS_PER_CHAIN; i++) {
    const t = (i / (CONTROL_BEADS_PER_CHAIN - 1)) * Math.PI * 2;
    const r = b + a * Math.cos(t);
    const x0 = r * Math.sin(t);
    const y0 = r * Math.cos(t);
    const z0 = tiltZ * Math.sin(t + cy);
    beads.push({
      x: x0 * Math.cos(yaw) - z0 * Math.sin(yaw) + offsetX,
      y: y0,
      z: x0 * Math.sin(yaw) + z0 * Math.cos(yaw),
      phase: seed * 4.7 + i * 0.37, // per-bead writhe phase, used in useFrame
    });
  }
  return beads;
}

export function buildControlBeads() {
  const beads = [];
  for (let c = 0; c < CONTROL_CHAINS; c++) beads.push(...buildControlChain(0.15 + c * 0.61, CONTROL_OFFSET_X[c]));
  return beads;
}
