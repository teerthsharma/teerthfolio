// One knob for the island's spacing. Layout positions (lab buildings, the
// Fountain Peak, the paths that reach them) go through S(); object sizes
// (buildings, pup, river and path widths) never do, so the gaps grow and the
// open snow between landmarks widens. The rigid north (Triton, MujoRush, the
// dam, the moat, the highway) is hand-sculpted and keeps its coordinates.
export const WORLD_SCALE = 1.5;
export const S = (x, z) => [Math.round(x * WORLD_SCALE * 10) / 10, Math.round(z * WORLD_SCALE * 10) / 10];
export const Sx = (x) => S(x, 0)[0];
export const Sz = (z) => S(0, z)[1];
