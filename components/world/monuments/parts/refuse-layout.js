// Pure layout for the "refuse" figure: planimeter (place id p-planimeter).
//
// Round 2 (judges' fixes): the two 45-peg boards that stood in for the
// figure's 528 test files -- a literal "grid of cubes standing for data",
// banned by SHOW, NEVER TELL -- are gone, along with the mint-then-coral
// "checking" reveal that only made sense between two boards. What is kept
// is the figure's one hero: a few pegs held open rather than closed on a
// guess ("exact, or refused"). Three fixed spots, no RNG needed.

export const PLATE_W = 1.6;
export const PLATE_H = 1.05;

// x/y local to the tilted plate; order spaces the three across the answer
// wave so they still pop in one after another, not all at once.
export const PLANIMETER_REF = [
  { x: -0.5, y: 0.28, order: 0 },
  { x: 0.04, y: -0.26, order: 1 },
  { x: 0.52, y: 0.16, order: 2 },
];
export const ORDER_SPAN = 2;
