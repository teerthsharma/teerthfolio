// The nunatak of the West Ice (plan 2.4): a granite tooth of MujoRush through the blue ice, its wind scoop on the windward
// side, a drift tail to the lee and the erratics of the moraine and the blow-out. Pure layout; components/world/land/Nunatak.jsx
// draws it. mulberry32 is copied from life/spawn.js.
import { heightAt } from "./terrain.js";

export const WIND = [0.8, 0.6];
export const ROCK = { x: -93, z: -27, base: 3.9, height: 11 };
export const SCOOP = { r0: 4.4, r1: 6.6, span: (140 * Math.PI) / 180, from: Math.atan2(-WIND[1], -WIND[0]) };
export const SCOOP_GRID = { na: 18, nr: 3 };
export const TAIL = { from: 3, len: 9, width: 3.5, tip: 0.4, high: 0.28 };
export const COLLIDERS = [
  { x: ROCK.x, z: ROCK.z, radius: 4, land: "nunatak" },
  { x: -75.5, z: -43.5, radius: 1, land: "nunatak" },
  { x: -80, z: -40.5, radius: 1.2, land: "nunatak" },
];

export const decal = (x, z, lift = 0.04) => heightAt(x, z) + lift;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scoopPoint(i, j) {
  const a = SCOOP.from - SCOOP.span / 2 + (SCOOP.span * i) / SCOOP_GRID.na;
  const r = SCOOP.r0 + ((SCOOP.r1 - SCOOP.r0) * j) / SCOOP_GRID.nr;
  return [ROCK.x + r * Math.cos(a), ROCK.z + r * Math.sin(a)];
}

const TRAIL = [[-73.2, -47.6], [-75.5, -43.5], [-77.6, -42.2], [-80, -40.5], [-82.4, -38.1], [-84.6, -36.4], [-87.2, -33.4], [-89.3, -31.2]];
const LEE = [[-89.2, -24.4], [-86.4, -22.3], [-83.8, -20.1], [-81, -18.3], [-87.8, -20.9], [-84.9, -17.6], [-90.6, -22.1], [-79.4, -15.9]];
const BIG = { 1: 1.0, 3: 1.2 };
const rnd = mulberry32(93027);
const erratic = (x, z, rock, fixed) => ({ x, z, rock, r: fixed ?? (0.3 + 0.4 * rnd()), spin: rnd() * 2 * Math.PI });
export const ERRATICS = [
  ...TRAIL.map(([x, z], i) => erratic(x, z, [2, 5].includes(i) ? "dark" : "granite", BIG[i])),
  ...LEE.map(([x, z], i) => erratic(x, z, i % 2 === 0 ? "dark" : "granite")),
];

export const GROUND_VERTS = [];
for (let i = 0; i <= SCOOP_GRID.na; i++) {
  for (let j = 0; j <= SCOOP_GRID.nr; j++) {
    const [x, z] = scoopPoint(i, j);
    GROUND_VERTS.push([x, decal(x, z), z]);
  }
}
