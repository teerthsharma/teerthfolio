// Pure precompute for the "funnel" sculpture (google-deepmind/mujoco_warp
// #1541, place id pr-mujoco-warp-1541): no React, no three.js, just the
// numbers Funnel.jsx animates against.
//
// The story (see data/showcase.json's figure.desc and
// teerthsharma.github.io/fig.js's "funnel —" comment): 22 kinematic trees,
// each its own island at first. A GPU kernel used to answer "are trees i and
// j joined?" with a 22x22 = 484-cell pair matrix; the fix is a disjoint-set
// union, one entry per tree. Contacts merge islands a few at a time; the
// merged forest's answer, read from 22 entries, reproduces every one of the
// 484 cells.
//
// ponytail: this is "an illustration of the mechanism, not the benchmark
// scene" in the source figure's own words, so the contact list below is
// original and small (14 unions across 3 rounds) rather than a port of the
// real kernel's 27-odd contacts — it produces the same shape of story (a
// couple of big islands, one pair, a few stragglers) at a size that reads at
// monument scale. Swap in the real contact list if a closer replay matters.

export const N = 22;
export const GRID = N;

// [a, b] hooks root(b) under root(a): a survives, b's island joins it.
export const ROUNDS = [
  [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15]],
  [[0, 2], [4, 6], [8, 10], [12, 14]],
  [[0, 4], [8, 12], [16, 17]],
];

// Home layout: a Fermat/sunflower spiral, evenly filling a disc with no RNG
// and no overlap (deterministic across renders and across reloads).
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const R_MAX = 1.5;
export const HOME = Array.from({ length: N }, (_, i) => {
  const a = i * GOLDEN_ANGLE;
  const r = R_MAX * Math.sqrt((i + 0.5) / N);
  return [Math.cos(a) * r, Math.sin(a) * r];
});

// A member's resting offset from its root once the forest compresses into
// tight island clusters (own small spiral, so members never stack).
const PULL = 0.4;
export function clusterOffset(i) {
  const a = i * GOLDEN_ANGLE * 1.7;
  return [Math.cos(a) * PULL, Math.sin(a) * PULL];
}

// ---- union-find, run once at module load -----------------------------

function find(parent, i) {
  while (parent[i] !== i) i = parent[i];
  return i;
}
function depthOf(parent, i) {
  let d = 0;
  while (parent[i] !== i) { i = parent[i]; d++; }
  return d;
}

const parent = Array.from({ length: N }, (_, i) => i);
export const depthSnapshots = []; // per round: depth of every node, pre-compression
const rootSnapshots = []; // per round: root of every node, pre-compression
for (const round of ROUNDS) {
  for (const [a, b] of round) {
    const ra = find(parent, a);
    const rb = find(parent, b);
    if (ra !== rb) parent[rb] = ra;
  }
  depthSnapshots.push(Array.from({ length: N }, (_, i) => depthOf(parent, i)));
  rootSnapshots.push(Array.from({ length: N }, (_, i) => find(parent, i)));
}

export const finalRoot = rootSnapshots[rootSnapshots.length - 1].slice();
// After compression every pointer snaps straight to its root: depth 0 for a
// root, 1 for everyone else.
export const compressedDepth = Array.from({ length: N }, (_, i) => (finalRoot[i] === i ? 0 : 1));

// The round a node's colour should turn to its island's: the first round its
// (evolving) root equals its final root. A node that is its own final root
// (a root, or a tree that never merges) gets -1 — it declares its colour the
// moment the forest lifts off, not partway through a round.
export const colorRound = Array.from({ length: N }, (_, i) => {
  if (finalRoot[i] === i) return -1;
  for (let r = 0; r < rootSnapshots.length; r++) if (rootSnapshots[r][i] === finalRoot[i]) return r;
  return rootSnapshots.length - 1;
});

// Islands, biggest first, so the roomiest cluster reads as the "hero" shade.
const sizeOf = {};
for (const r of finalRoot) sizeOf[r] = (sizeOf[r] || 0) + 1;
const roots = Object.keys(sizeOf).map(Number).sort((a, b) => sizeOf[b] - sizeOf[a] || a - b);
const islandIndexByRoot = Object.fromEntries(roots.map((r, k) => [r, k]));
export const ISLAND_COUNT = roots.length;
export function islandOf(i) {
  return islandIndexByRoot[finalRoot[i]];
}
export function sameIsland(i, j) {
  return finalRoot[i] === finalRoot[j];
}
