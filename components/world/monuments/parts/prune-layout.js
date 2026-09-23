// Pure layout for Highway Pass's story (google/highway #3244, place id
// pr-highway-3244): where the keys float across the mouth of the pass and
// which pairs of their windows overlap. No React, no three.js.
//
// The idea teerthsharma.github.io/fig.js's prune() draws: a perfect-hash
// builder compared every pair of keys to find duplicates; a key can only
// ever land inside its own slice (its "window"), so two keys whose windows
// never overlap can never collide, and the pruned check only compares the
// pairs that do. Reduced from the figure's 48 keys to 16 so every arc reads
// from the follow camera; the gaps clump the same deterministic way (no
// Math.random, so the pass never reshuffles between builds).
//
// Local metres: x across the pass (west to east), y up from the snow, the
// row at z = 0 (+z faces the camera).

export const KEY_COUNT = 16;
const SPAN = 13; // the row's length across the pass mouth
const WINDOW = 2.2; // m: two keys closer than this have overlapping windows ("kept")
export const KEY_Y = 1.75; // how high the keys float (the seal slides under them)

function hash(i, k) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Key centres: gaps with a floor and a log tail, so keys clump the way
// hashed keys do instead of sitting evenly spaced.
const gaps = [];
for (let i = 1; i < KEY_COUNT; i++) gaps.push(1.2 - Math.log(1 - 0.97 * hash(i, 143)));
const gapScale = SPAN / gaps.reduce((a, b) => a + b, 0);
export const KEY_X = [-SPAN / 2];
for (const g of gaps) KEY_X.push(KEY_X[KEY_X.length - 1] + g * gapScale);

// Each key's boulder: as big as its nearest neighbour allows, never touching.
export const KEY_R = KEY_X.map((x, i) => {
  const left = i > 0 ? x - KEY_X[i - 1] : Infinity;
  const right = i < KEY_COUNT - 1 ? KEY_X[i + 1] - x : Infinity;
  return Math.max(0.24, Math.min(0.46, 0.44 * Math.min(left, right)));
});

// Arc height for a pair d apart: the figure's gamma curve (taller the
// further apart, sublinear, so near keys hug the row and far keys vault).
const MAX_D = KEY_X[KEY_COUNT - 1] - KEY_X[0];
export const MAX_HEIGHT = 4.4;
export function archHeight(d) {
  return MAX_HEIGHT * Math.pow(d / MAX_D, 0.7);
}

// Every pair (the old check's whole dome), in the order the old sweep fires
// them: by the later key j, each key compared with every key before it.
export const DOME_PAIRS = [];
for (let j = 1; j < KEY_COUNT; j++) {
  for (let i = 0; i < j; i++) {
    const d = KEY_X[j] - KEY_X[i];
    DOME_PAIRS.push({ i, j, d, h: archHeight(d), kept: d < WINDOW });
  }
}
// The pairs whose windows overlap: the only ones the new check compares
// (same order), and the rest, lowest first, for the light that drains the
// dome from the top down.
export const KEPT_PAIRS = DOME_PAIRS.filter((p) => p.kept);
export const PRUNED_PAIRS = DOME_PAIRS.filter((p) => !p.kept).sort((a, b) => a.h - b.h);
export const KEPT_TOP = Math.max(...KEPT_PAIRS.map((p) => p.h));

// How many of `pairs` (in their order) have j <= k: what one sweep has
// fired by the time it reaches key k.
export function firedBy(pairs, k) {
  let n = 0;
  while (n < pairs.length && pairs[n].j <= k) n++;
  return n;
}

// Two duplicate pairs, one on each half of the row: the tallest kept pair
// per half, so the amber flash the figure describes ("the same amber
// duplicate pairs are found by both checks") reads on both sides.
function tallest(pairs) {
  return pairs.reduce((best, p) => (!best || p.d > best.d ? p : best), null);
}
export const DUP_PAIRS = [
  tallest(KEPT_PAIRS.filter((p) => KEY_X[p.i] < 0)),
  tallest(KEPT_PAIRS.filter((p) => KEY_X[p.i] >= 0)),
].filter(Boolean);
