// Pure layout math for the "prune" sculpture (google/highway #3244,
// place id pr-highway-3244). No React, no three.js: just where the keys sit
// on the slot table and which pairs of their windows overlap.
//
// Mirrors the idea teerthsharma.github.io/fig.js's prune() draws (see its
// long comment): a perfect-hash builder used to compare every pair of keys
// to find duplicates; a key can only ever land inside its own slice (its
// "window"), so two keys whose windows never overlap can never collide, and
// the pruned check only looks at the pairs that do. Reduced from that
// figure's 48 keys to 18 for a legible physical model, and the gaps are
// clumped the same deterministic way (no Math.random, so the sculpture never
// reshuffles between builds).

export const KEY_COUNT = 18;
const SPAN = 3.0; // table length, metres, centred on local x = 0
const WINDOW = 0.62; // world-space gap under which two windows overlap ("kept")

function hash(i, k) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Key centres along the table: gaps with a floor and a log tail, so keys
// clump the way hashed keys do instead of sitting evenly spaced.
const gaps = [];
for (let i = 1; i < KEY_COUNT; i++) gaps.push(0.35 - Math.log(1 - 0.97 * hash(i, 143)));
const gapTotal = gaps.reduce((a, b) => a + b, 0);
const gapScale = SPAN / gapTotal;
export const KEY_X = [-SPAN / 2];
for (const g of gaps) KEY_X.push(KEY_X[KEY_X.length - 1] + g * gapScale);

// Every pair of keys (the old check's whole dome), and which of those pairs
// have overlapping windows (the pruned check's low arcs).
export const DOME_PAIRS = [];
for (let j = 1; j < KEY_COUNT; j++) {
  for (let i = 0; i < j; i++) {
    const d = KEY_X[j] - KEY_X[i];
    DOME_PAIRS.push({ i, j, d, kept: d < WINDOW });
  }
}
export const KEPT_PAIRS = DOME_PAIRS.filter((p) => p.kept);
export const KEPT_X_MIN = Math.min(...KEPT_PAIRS.map((p) => KEY_X[p.i]));
export const KEPT_X_MAX = Math.max(...KEPT_PAIRS.map((p) => KEY_X[p.j]));

// Two duplicate pairs, one on each half of the table, so the flash the
// figure describes ("the same amber duplicate pairs are found by both
// checks") reads clearly on both sides. The tallest kept pair per half is
// the most visible choice, not an arbitrary index.
function tallest(pairs) {
  return pairs.reduce((best, p) => (!best || p.d > best.d ? p : best), null);
}
export const DUP_PAIRS = [
  tallest(KEPT_PAIRS.filter((p) => KEY_X[p.i] < 0)),
  tallest(KEPT_PAIRS.filter((p) => KEY_X[p.i] >= 0)),
].filter(Boolean);

// Arc height for a pair d apart: same gamma curve as the figure (height
// grows with distance, but sublinearly, so nearby keys hug the table and far
// keys arc high overhead).
const MAX_D = KEY_X[KEY_COUNT - 1] - KEY_X[0];
// Metres, the tallest arc (the two end keys). Kept modest on purpose: the
// dock camera and the near-place prompt both crowd the top of the frame, so
// the whole dome -- not just its base -- has to read inside that headroom.
export const MAX_HEIGHT = 1.8;
export function archHeight(d) {
  return MAX_HEIGHT * Math.pow(d / MAX_D, 0.7);
}
