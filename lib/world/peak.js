// THE FOUNTAIN PLATEAU (open2c/polychrom #79, place pr-polychrom-79): a mesa in the far south-east of the island,
// a flat stone deck 6.5 m up, with the TEMPLE of the Fountain of Immortality on it and the basin INSIDE the cella.
// It obeys the island's mountain law (lib/world/terrain.js): relief only inside a collider footprint, a FOOT + APRON
// grading the snow into the wall, a PEAKS[] entry for the flat top. The seal climbs a straight stair cut into the
// north face (PEAK_PATH), crosses the deck, and enters the temple by its +z door. The wall of the mesa is held by
// a ring of collider circles (PEAK_COLLIDERS, land "fountain-wall") with the stair as the one gap.
// Pure and allocation-free per call, like lib/world/terrain.js.

import { S } from "./scale.js";

export const PEAK = {
  x: S(30, 57)[0],
  z: S(30, 57)[1],
  top: 6.5, // the deck's height (m)
  flat: 9, // radius of the flat deck (18 m across)
  edge: 13, // radius of the foot on the plain (FOOT 2.4 / APRON 1.8 in terrain.js: 6.5 m rises over 3.95 m)
};
export const PEAK_DOCK_RADIUS = 4.2; // dockPoint(place): the doorway, inside the temple
export const STAIR = { w: 1.2, run: 13 }; // half-width; the stair runs north from the deck's rim down to the plain: 0.5 m per m
// the cella: a stone room on the deck, the basin in its middle, its door on +z (south)
export const TEMPLE = { hw: 4.5, hd: 5.5, wall: 0.5, door: 1.6, height: 5.2 };
const WALL_HOLD = 1; // the seal is held this far inside the wall's own thickness

// the mesa wall as collision circles: every 20 degrees round the foot, but not on the stair
export const PEAK_COLLIDERS = [];
for (let k = 1; k < 18; k++) {
  const a = -Math.PI / 2 + (k * Math.PI * 2) / 18;
  PEAK_COLLIDERS.push({ x: +(PEAK.x + Math.cos(a) * 12).toFixed(2), z: +(PEAK.z + Math.sin(a) * 12).toFixed(2), radius: 2, land: "fountain-wall" });
}

// The seal's walk: the stair from the plain, round the temple's east side, in at the door to the dock.
export const PEAK_PATH = [];
const push = (x, z, h) => PEAK_PATH.push([x, z, h]);
for (let i = 0; i <= 13; i++) push(PEAK.x, PEAK.z - PEAK.flat - STAIR.run + i, (PEAK.top * i) / 13); // the stair, 1 m steps
push(PEAK.x, PEAK.z - PEAK.flat + 0.5, PEAK.top);
push(PEAK.x + 5.4, PEAK.z - 5.2, PEAK.top);
push(PEAK.x + 5.4, PEAK.z + 6.4, PEAK.top);
push(PEAK.x, PEAK.z + 6.4, PEAK.top);
push(PEAK.x, PEAK.z + PEAK_DOCK_RADIUS, PEAK.top); // the dock, in the doorway
// waypoints for lib/world/land.js PATHS: the stair, round the temple to its door
export const PEAK_WAYPOINTS = PEAK_PATH.filter((_, i) => i === 0 || i >= 13).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);

const north = (dx, dz) => dz < 0 && -dz <= PEAK.flat + STAIR.run && Math.abs(dx) <= STAIR.w + 0.9;

function wallBlocked(dx, dz) {
  const { hw, hd, wall, door } = TEMPLE;
  if (Math.abs(dx) > hw + WALL_HOLD * 0.5 || Math.abs(dz) > hd + WALL_HOLD * 0.5) return false;
  const band = wall + WALL_HOLD;
  if (Math.abs(dx) > hw - band || dz < -hd + band) return true; // the west, east and north walls
  return dz > hd - band && Math.abs(dx) > door; // the south wall, the door open
}

// Can the seal stand here? On the deck outside the temple's walls, on the stair, on the plain.
export function peakBlocked(x, z) {
  const dx = x - PEAK.x;
  const dz = z - PEAK.z;
  const d = Math.hypot(dx, dz);
  if (d <= PEAK.flat) return wallBlocked(dx, dz);
  if (north(dx, dz)) return Math.abs(dx) > STAIR.w; // the stair's cheeks are walls
  return d < PEAK.edge - 0.5; // the cliff
}

// the walking height of the seal at (x, z): the deck, the stair, 0 elsewhere
export function peakFloor(x, z) {
  const dx = x - PEAK.x;
  const dz = z - PEAK.z;
  if (Math.hypot(dx, dz) <= PEAK.flat) return PEAK.top;
  if (north(dx, dz) && Math.abs(dx) <= STAIR.w + 0.6) return Math.min(PEAK.top, Math.max(0, (PEAK.top * (PEAK.flat + STAIR.run + dz)) / STAIR.run));
  return 0;
}

// the seal's view of the plateau (lib/world/motion.js world.peak)
export const PEAK_WORLD = { floor: peakFloor, blocked: peakBlocked };
