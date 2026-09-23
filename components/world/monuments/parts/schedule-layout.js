// Pure layout for the "schedule" sculpture (triton-lang/kernels #22, place id
// pr-triton-kernels-22): the causal staircase's tiers and scheduled tiles,
// and the topology cloud's centroids. No React, no three.js.
//
// Mirrors the landing figure's own construction (fig.js, "schedule —
// triton-kernels-22", see its long comment): for every query block, a sorted
// schedule of the sink column (0), the local window (itself and the block
// before it), and the salience picks that are at or before it. Reduced from
// the figure's 16 query/key blocks to 10 for a legible physical model, the
// same way prune-layout.js reduces 48 keys to 18: the two salience picks (4
// and 10 there, out of 16) scale to the same fractional position, 3 and 6
// out of 10.

export const NB = 10;
export const SAL = [3, 6];

export const CELL = 0.4;
export const TIER_H = 0.32;
export const TIER_D = 0.3;
export const BASE_Y = 0.05;
export const X0 = -((NB - 1) / 2) * CELL; // column 0, the sink, sits here in every tier

// rows[q]: the sorted schedule for query block q — sink, local window, and
// any salience pick at or before q. Exactly the builder the figure draws.
export const ROWS = Array.from({ length: NB }, (_, q) => {
  const set = new Set([0, q]);
  if (q > 0) set.add(q - 1);
  for (const s of SAL) if (s <= q) set.add(s);
  return [...set].sort((a, b) => a - b);
});
export const MAX_STEPS = Math.max(...ROWS.map((r) => r.length));

// tiers[q]: the stepped-pyramid slab for query block q — the full causal
// width (every key up to q), widest at the base and tapering to the single
// sink block at the apex.
export const TIERS = ROWS.map((_, q) => {
  const t = NB - 1 - q; // 0 at the base, NB-1 at the apex
  const w = (q + 1) * CELL;
  const cx = X0 - CELL / 2 + w / 2;
  const y = BASE_Y + t * TIER_H + TIER_H / 2;
  return { q, t, w, cx, y };
});
export const APEX_Y = BASE_Y + NB * TIER_H;

// tiles: one entry per scheduled (query, key) block — the pop-blocks that
// rise when a program's walk reaches them. `step` is this block's place in
// its own row's list, driving the synchronised sweep every program walks at
// once (they all launch together, so the same global step advances every
// row's own list in lockstep).
export const TILES = [];
ROWS.forEach((row, q) => {
  const tier = TIERS[q];
  row.forEach((k, step) => {
    TILES.push({
      q,
      k,
      step,
      isSalience: k === SAL[0] || k === SAL[1],
      x: X0 + k * CELL,
      y: tier.y,
      z0: TIER_D / 2,
    });
  });
});

// beads: the output marker for every row, at its diagonal tile (k === q) —
// it lands once that row's whole schedule has grown in. Short lists near the
// apex finish first, so the beads chain downward to the base.
export const BEADS = ROWS.map((row, q) => {
  const tier = TIERS[q];
  return { q, x: X0 + q * CELL, y: tier.y, z: TIER_D / 2 + 0.02, lastStep: row.length - 1 };
});

// The topology cloud, floating above the apex: one centroid per column.
// Three tight-ish clusters plus the two salience picks held apart from
// everything — the same 0D-persistence rule the kernel's salience score
// follows: the two whose discs never touch a neighbour stay salient longest.
const CLOUD_X = 1.0;
const CLOUD_Y = APEX_Y + 0.5;
const CLOUD_Z = 0.15;
const OFFSETS = [
  [-0.09, -0.07],
  [0.08, -0.05],
  [-0.06, 0.09],
  [0.07, 0.08],
];
const CLUSTER_A = [0, 1, 2, 4];
const CLUSTER_B = [5, 7, 8, 9];

export const CLOUD_POINTS = Array.from({ length: NB }, (_, k) => {
  if (k === SAL[0]) return { k, x: CLOUD_X - 0.62, y: CLOUD_Y + 0.46, z: CLOUD_Z, isSalience: true };
  if (k === SAL[1]) return { k, x: CLOUD_X + 0.62, y: CLOUD_Y + 0.46, z: CLOUD_Z, isSalience: true };
  const inA = CLUSTER_A.includes(k);
  const side = inA ? -1 : 1;
  const i = (inA ? CLUSTER_A : CLUSTER_B).indexOf(k);
  const [dx, dy] = OFFSETS[i];
  return { k, x: CLOUD_X + side * 0.32 + dx, y: CLOUD_Y - 0.06 + dy, z: CLOUD_Z, isSalience: false };
});
export const CLOUD_DISC_R = 0.22; // grown radius: clusters' discs touch, survivors' never do

// Where each salience pick's pulse beam lands: the base of its own column's
// first tile — the tier for the query block that equals that pick.
export const PULSE_TARGETS = SAL.map((s) => {
  const tier = TIERS[s];
  return { x: X0 + s * CELL, y: tier.y, z: TIER_D / 2 };
});
