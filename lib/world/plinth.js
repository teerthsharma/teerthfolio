// The SEAL SEAL plinth at the spawn point: a granite pad 0.85 m high. The seal spawns on its top and steps down its sloped rim.
import { SPAWN } from "./places.js";

export const PLINTH = { x: SPAWN.x, z: SPAWN.z - 1, top: 0.85, r0: 2.6, r1: 3.2 };
export function plinthLift(x, z) {
  const d = Math.hypot(x - PLINTH.x, z - PLINTH.z);
  if (d <= PLINTH.r0) return PLINTH.top;
  if (d >= PLINTH.r1) return 0;
  return PLINTH.top * (1 - (d - PLINTH.r0) / (PLINTH.r1 - PLINTH.r0));
}
