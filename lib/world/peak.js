// THE FOUNTAIN RISE (open2c/polychrom #79, place pr-polychrom-79): a low ice dome on the south-east plain (lib/world/rise.js).
// The seal walks over it, and the land itself rises under it; there is no stair, temple or wall. The wall circles stay in
// the land list so seeded props keep off the dome; lib/world/wild.js drops them from the physics once the rise is low.

import { RISE, riseHeight } from "./rise.js";

export const PEAK = { x: RISE.x, z: RISE.z, top: RISE.top, flat: RISE.flat, edge: RISE.edge };
export const PEAK_DOCK_RADIUS = 4.2; // dockPoint(place): the basin's dock, on the crown

export const PEAK_COLLIDERS = [];
for (let k = 1; k < 18; k++) {
  const a = Math.PI + (k * Math.PI * 2) / 18;
  PEAK_COLLIDERS.push({ x: +(PEAK.x + Math.cos(a) * 12).toFixed(2), z: +(PEAK.z + Math.sin(a) * 12).toFixed(2), radius: 2, land: "fountain-wall" });
}

const OFFSETS = [];
for (let i = 0; i <= 13; i++) OFFSETS.push([-22 + i, 0]);
OFFSETS.push([-8.5, 0], [-5.6, 3], [-5.6, 6.4], [0, 6.4], [0, PEAK_DOCK_RADIUS]);
export const PEAK_PATH = OFFSETS.map(([dx, dz]) => {
  const x = PEAK.x + dx;
  const z = PEAK.z + dz;
  return [x, z, riseHeight(x, z)];
});
export const PEAK_WAYPOINTS = PEAK_PATH.filter((_, i) => i === 0 || i >= 13).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);

export const peakBlocked = () => false;
export const peakFloor = riseHeight;

export const PEAK_WORLD = { floor: peakFloor, blocked: peakBlocked };
