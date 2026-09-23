// Pure layout for the "refuse" figure: planimeter (place id p-planimeter).
//
// The landing figure (fig.js, "refuse — planimeter") holds 528 tiny line
// drawings on each of two sheets — planimeter's answers on top, shapely's
// below — and one diagonal wave answers both in step, file by file. Here
// each sheet becomes a peg grid: same idea, far fewer pegs (an illustration,
// per figure.desc: "which drawing sits where... is illustrative"), the same
// measured ratios: planimeter refuses 33/528 and is never wrong; shapely
// answers every file and is wrong on 336/528.
//
// board(seed, refFrac, badFrac) returns COLS*ROWS pegs, each
// { x, y, order, ref, bad }: x/y the peg's position on its board (y up from
// the board's own bottom row), order its place in the one diagonal wave
// (matches fig.js's `(x + 0.45*y)` front), ref/bad which measured outcome it
// stands for. Two independent seeds so the two boards don't scatter alike —
// the figure draws the same 528 files on both sheets, but which are refused
// (top) and which are wrong (bottom) are unrelated, per figure.desc.

const COLS = 9;
const ROWS = 5;
export const PEG_COUNT = COLS * ROWS;
export const PITCH = 0.3;
export const BOARD_W = (COLS - 1) * PITCH;
export const BOARD_H = (ROWS - 1) * PITCH;
const DIAG = 0.6; // fig.js's own wave front is x + 0.45*y; steeper here, a smaller grid
export const ORDER_SPAN = (COLS - 1) + (ROWS - 1) * DIAG;

// mulberry32: the same small deterministic RNG fig.js's own build() uses, so
// the scatter is fixed from load to load rather than reshuffling every time.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function rnd() {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function board(seed, refFrac, badFrac) {
  const rnd = mulberry32(seed);
  const pegs = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      pegs.push({
        x: (col - (COLS - 1) / 2) * PITCH,
        y: row * PITCH,
        order: col + row * DIAG,
        ref: false,
        bad: false,
      });
    }
  }
  // Which pegs carry the outcome is picked independently of position
  // (Fisher-Yates on a shuffled index list), since the figure itself only
  // fixes the counts, not the placement.
  const idx = pegs.map((_, i) => i);
  for (let k = idx.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    const t = idx[k];
    idx[k] = idx[j];
    idx[j] = t;
  }
  const nRef = Math.round(pegs.length * refFrac);
  const nBad = Math.round(pegs.length * badFrac);
  idx.slice(0, nRef).forEach((i) => (pegs[i].ref = true));
  idx.slice(nRef, nRef + nBad).forEach((i) => (pegs[i].bad = true));
  return pegs;
}

// planimeter: 495/528 exact, 33/528 refused, 0/528 wrong.
export const PLANIMETER_PEGS = board(7, 33 / 528, 0);
// shapely.polygonize_full: answers every file, 336/528 wrong, 0/528 refused.
export const SHAPELY_PEGS = board(13, 0, 336 / 528);
