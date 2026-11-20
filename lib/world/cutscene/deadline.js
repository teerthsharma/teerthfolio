// The cutscene prewarm's clock: seconds until the seal could reach a dock's arrival ring at its quickest. Pure numbers, read by
// components/world/cutscene/prewarm.js and its check. Times replace distances, so a bigger island needs no new constants.
import { MOTION } from "../motion.js";

export const V_FAST = MOTION.maxSpeed * MOTION.boost; // m/s, the quickest the seal can arrive
export const APPROACH = 7; // m, the arrival ring outside a dock (Controller.jsx APPROACH_REACH)
export const CRITICAL_S = 1.6; // s: before ready only the dock the seal reaches first (p-resolvent, 1.52 s from spawn) and the spawn statue are built; the rest wait for ready
export const SPAWN_CRITICAL_S = 12; // s: the spawn statue's play waits for the seal to leave and return, so it is warmed from farther off
export const HORIZON_S = 8; // s: after ready, docks this close are built
export const DROP_S = 12; // s: a built dock farther than this is disposed

export function deadlineS(seal, dock) {
  const gap = Math.hypot(seal.x - dock.x, seal.z - dock.z) - dock.radius - APPROACH - MOTION.sealRadius;
  return Math.max(0, gap) / V_FAST;
}
