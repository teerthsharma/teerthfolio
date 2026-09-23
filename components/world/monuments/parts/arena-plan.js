// The memory-plan skyline for the "arena" figure: google/XNNPACK #10801.
// Pure data — column positions, heights and the one special column with a
// floating slab and the empty "cave" beneath it — so Arena.jsx only has to
// animate it. Mirrors the design of fig.js's arena(): a wall of live values,
// one of them (the hero) sitting on top of the wall until the fix carries it
// down into the leading gap that was sitting below the first live block all
// along, and the arena's lid (its tallest slab) comes down with it.

// Column footprint, in metres. Two rows of six read as a small skyline block
// rather than a flat wall — more of a place, less of a bar chart.
const COL_W = 0.75;
const XS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
const BACK_Z = -0.55;
const FRONT_Z = 0.55; // the row that faces the dock

// Plain columns: a value live for the whole run, stacked from the floor.
// Heights are hand-set for a skyline silhouette, every one of them kept
// below FLOAT_TOP so the cave column stays the tallest once the fix lands.
const BACK_H = [1.9, 1.2, 2.2, 0.55, 1.5, 2.0];
const FRONT_H = [0.5, 1.7, null, 1.4, 2.2, 0.85]; // null marks the cave column

// The cave column: the first live block (the floating slab) with the empty
// leading gap sitting below it — the gap the old planner's search, starting
// at that block and sweeping upward, never looked beneath.
export const CAVE_X = XS[2];
export const CAVE_Z = FRONT_Z;
export const GAP = 1.6; // the cave's height, and exactly what the hero fills
export const SLAB = 0.9; // the floating slab's own thickness
export const FLOAT_BOTTOM = GAP;
export const FLOAT_TOP = FLOAT_BOTTOM + SLAB;

export const HERO_HEIGHT = GAP;
export const HERO_SIZE = COL_W - 0.14; // a hair inside the column footprint

export const COLUMNS = [
  ...XS.map((x, i) => ({ x, z: BACK_Z, w: COL_W, bottom: 0, h: BACK_H[i] })),
  ...XS.map((x, i) =>
    FRONT_H[i] === null
      ? { x, z: CAVE_Z, w: COL_W, bottom: FLOAT_BOTTOM, h: SLAB, cave: true }
      : { x, z: FRONT_Z, w: COL_W, bottom: 0, h: FRONT_H[i] },
  ),
];

// The peak before the fix (the cave's floating slab plus the hero stacked on
// top of it) and after (the tallest column once the hero is set into the
// gap instead) — the same 144-MiB-to-112-MiB drop the card reports, in shape.
const otherTops = COLUMNS.filter((c) => !c.cave).map((c) => c.bottom + c.h);
export const OLD_TOP = FLOAT_TOP + HERO_HEIGHT;
export const NEW_TOP = Math.max(FLOAT_TOP, ...otherTops);

// The wall's own footprint, for the floor shelf and the ghost/lid spans.
export const WALL_HALF_X = Math.max(...XS.map(Math.abs)) + COL_W / 2;
export const WALL_HALF_Z = Math.max(Math.abs(BACK_Z), Math.abs(FRONT_Z)) + COL_W / 2;

// mint (low) -> blue -> violet (high), the same offset ramp fig.js draws,
// built from hexes already in this app's palette rather than invented ones.
const MINT = [0x27, 0xa6, 0xb8]; // C.shallows
const BLUE = [0x4f, 0x7c, 0xff]; // a lab accent, reused here for the ramp's mid
const VIOLET = [0x8a, 0x5c, 0xff]; // a lab accent, reused here for the ramp's top

function mix(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function rampColor(top) {
  const t = Math.max(0, Math.min(1, top / FLOAT_TOP));
  const [r, g, b] = t < 0.5 ? mix(MINT, BLUE, t * 2) : mix(BLUE, VIOLET, t * 2 - 1);
  return [r / 255, g / 255, b / 255];
}
