// The coral beach and the atoll (E16). The beach is a sand disc on the Knot Coast's east shore: ground decals 0.04 m above heightAt.
// The atoll is a ring reef on the open sea 49 m off the river; its ground lies 4 to 8 m under the water, so its pieces sit on SEA_Y.
import { SEA_Y, heightAt } from "./terrain.js";

export const BEACH = { x: 84, z: 58, r: 8 };
export const ATOLL = { x: 122, z: 64, r: 8 };
export const COLORS = { sand: "#ffe1dc", reef: "#ff6b7a", lagoon: "#7de3ff" };
const SPOKES = 36;
const BEACH_LIFT = 0.04;

const tri = (out, a, b, c) => out.push(...a, ...b, ...c);

// A ring between radii r0 and r1, over the angles a0 to a1 (radians), laid at height(x, z).
function band({ x, z }, r0, r1, a0, a1, height, n = SPOKES) {
  const out = [];
  const point = (r, j) => {
    const a = a0 + ((a1 - a0) * j) / n;
    const px = x + r * Math.cos(a);
    const pz = z + r * Math.sin(a);
    return [px, height(px, pz), pz];
  };
  for (let j = 0; j < n; j++) {
    tri(out, point(r0, j), point(r1, j), point(r1, j + 1));
    tri(out, point(r0, j), point(r1, j + 1), point(r0, j + 1));
  }
  return out;
}

const ground = (x, z) => heightAt(x, z) + BEACH_LIFT;
const sea = (lift) => () => SEA_Y + lift;
const TAU = 2 * Math.PI;

function beachPieces() {
  return Array.from({ length: BEACH.r }, (_, k) => band(BEACH, k, k + 1, 0, TAU, ground));
}

export const PIECES = [
  { color: COLORS.sand, pos: beachPieces().flat() },
  { color: COLORS.lagoon, pos: band(ATOLL, 0, 5.2, 0, TAU, sea(0.12), 40) },
  { color: COLORS.reef, pos: band(ATOLL, 5.2, ATOLL.r, 0, TAU, sea(0.3), 40) },
  { color: COLORS.sand, pos: band(ATOLL, 4.4, 5.2, (200 * Math.PI) / 180, (290 * Math.PI) / 180, sea(0.4), 16) },
];

export const GROUND_VERTS = PIECES[0].pos.reduce((v, c, i) => {
  if (i % 3 === 0) v.push([c]);
  else v[v.length - 1].push(c);
  return v;
}, []);
