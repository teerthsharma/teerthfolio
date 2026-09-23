// Seed data for the Aether-Lang seal colony (SealColony.jsx) and the moat's
// porpoising seals. Pure module (no React, no scene graph) so it doubles as
// a Node-runnable check (seals-seed.check.mjs) and as the component's data
// source, the same split penguins-seed.js uses for the flock.
//
// The colony is FOUR cuddle piles (18 seals), not a ring: each pile's
// members are authored by hand as small (dx, dz) offsets from the pile's own
// centre, in a fixed local frame (never rotated to face the building),
// because a huddle of seals leaning on each other doesn't care which way the
// building sits.
// placePile() only has to find a centre, walking outward along one compass
// direction from the building until every member's absolute position clears
// the building, its dock, every path, every landform and the water -- the
// same rule dockPoint()'s callers already keep, just with a seal's own
// (tighter) clearance instead of a prop's or a penguin's.

import { PLACE_BY_ID, dockPoint } from "../../../lib/world/places.js";
import { LAND_COLLIDERS, PATHS, onHighway } from "../../../lib/world/land.js";
import { riverAt, waterGap, MOAT } from "../../../lib/world/river.js";
import { heightAt } from "../../../lib/world/terrain.js";

const PLACE = PLACE_BY_ID["p-aether-lang"];
const DOCK = dockPoint(PLACE);

// Is (x, z) clear enough to stand a colony seal: off the building, its
// dock, every path (straight-segment approximation -- a path's own curve
// bows at most ~0.4 m off its waypoints, absorbed by the margin below),
// every landform's bulk, the highway, the water, and on flat ground (the
// same 0.3 m band terrain.js's own contract promises everywhere walkable).
export function sealClear(x, z, margin = 0.45) {
  if (Math.hypot(x - PLACE.x, z - PLACE.z) < PLACE.radius + margin) return false;
  if (Math.hypot(x - DOCK.x, z - DOCK.z) < 1.4 + margin) return false;
  for (const wp of PATHS) {
    for (let i = 0; i < wp.length - 1; i++) {
      const [ax, az] = wp[i];
      const [bx, bz] = wp[i + 1];
      const sx = bx - ax;
      const sz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1)));
      if (Math.hypot(x - ax - sx * t, z - az - sz * t) < 1.5 + margin) return false;
    }
  }
  for (const c of LAND_COLLIDERS) {
    if (Math.hypot(x - c.x, z - c.z) < c.radius + margin) return false;
  }
  if (onHighway(x, z)) return false;
  if (riverAt(x, z).inside || waterGap(x, z) < 1.5) return false;
  if (Math.abs(heightAt(x, z)) > 0.3) return false;
  return true;
}

// THE 18 EASTER EGGS (the owner: "keep these seals apart with distance, all
// 18 are Easter eggs, each my seal pup in an anime costume"): spread over
// the whole island by farthest-point sampling of clear, flat, dry ground
// (sealClear with a wide margin), away from spawn, each in its own costume
// (components/world/seal/Outfit.jsx COSTUMES) and accent colour.
const LOOKS = [
  ["saiyan", "#ffd23f"], ["ninja", "#ff7a1a"], ["sorcerer", "#4fb4ff"], ["demonKing", "#e0162b"], ["magi", "#ffcf4a"], ["straw", "#e03b3b"],
  ["flame", "#ff8a1a"], ["buns", "#e94bff"], ["goggles", "#22c55e"], ["frost", "#1ec8f0"], ["visor", "#84cc16"], ["hardHat", "#ff8f00"],
  ["cap", "#ff4d6a"], ["saiyan", "#62c8ff"], ["ninja", "#22c55e"], ["demonKing", "#8a5cff"], ["sorcerer", "#ff66c4"], ["flame", "#3f6fe0"],
];
const COATS = ["white", "grey", "cream", "spotted"];
function spread(count) {
  const candidates = [];
  for (let x = -78; x <= 78; x += 3) {
    for (let z = -78; z <= 78; z += 3) {
      if (Math.hypot(x, z) > 72 || Math.hypot(x, z - 9) < 12) continue; // on the island, off spawn
      if (sealClear(x, z, 1.6)) candidates.push([x, z]);
    }
  }
  const chosen = [candidates[Math.floor(candidates.length / 2)]];
  while (chosen.length < count) {
    let best = null;
    let bestD = -1;
    for (const c of candidates) {
      let d = Infinity;
      for (const q of chosen) d = Math.min(d, Math.hypot(c[0] - q[0], c[1] - q[1]));
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    chosen.push(best);
  }
  return chosen;
}
export const COLONY = spread(LOOKS.length).map(([x, z], i) => ({
  id: i,
  x,
  z,
  restYaw: Math.atan2(-x, -z) + (((i * 37) % 11) / 11 - 0.5) * 0.8, // roughly toward the island's middle
  scale: 0.78 + ((i * 7) % 5) * 0.05,
  coat: COATS[i % COATS.length],
  tone: (((i * 13) % 7) / 7) * 0.2 - 0.1,
  onBack: -1,
  costume: LOOKS[i][0],
  color: LOOKS[i][1],
  lookRate: 1.7 + ((i * 53) % 13) / 13,
  bowRate: 1.1 + ((i * 29) % 9) / 9,
  noticeStagger: ((i * 71) % 17) / 17 - 0.5,
  bowStagger: ((i * 19) % 7) / 7 - 0.5,
  idlePhase: i * 2.6 + 1.1,
}));

// ---- the moat's porpoising seals ------------------------------------------

// Centreline of the ring (lib/world/river.js): riverAt() gives depth 1 (the
// safest, deepest water) exactly on this circle, and the water is 9 m wide
// (half-width 4.5 m) round it -- every radius below clears the keep (7.5 m)
// on the inside and the bank (16.5 m) on the outside with over 2 m to
// spare, so an arc that never leaves its own radius never leaves the water.
const RING = MOAT.ring;
const DEG = Math.PI / 180;
export const JUMPERS = [
  { theta0: 20 * DEG, radius: 12.4, cycleLen: 5.2, leapDur: 1.2, phase0: 0.0, peak: 1.3, scale: 0.9 },
  { theta0: 150 * DEG, radius: 11.6, cycleLen: 6.0, leapDur: 1.3, phase0: 2.1, peak: 1.15, scale: 0.8 },
  { theta0: 260 * DEG, radius: 12.9, cycleLen: 5.6, leapDur: 1.15, phase0: 4.0, peak: 1.4, scale: 1.0 },
];
export const RING_CENTER = { x: RING.x, z: RING.z };
