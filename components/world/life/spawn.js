// Deterministic placement for props and penguins, computed at runtime from
// lib/world/places.js instead of hard-coded x/z. A separate workflow is
// growing the island past 8 places, so every seed point here has to keep
// dodging buildings, docks, spawn and the name in the snow on its own.

import { PLACES, ISLAND_RADIUS, SPAWN, dockPoint } from "../../../lib/world/places";
import { RIVER, riverAt } from "../../../lib/world/river";
import { LAND_COLLIDERS } from "../../../lib/world/land";

// Reused every call so forbidden() never allocates.
const FORBIDDEN_RIVER_OUT = {};

// Small seeded PRNG (mulberry32) so hot reload and StrictMode's double mount
// always land on the same layout.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The 3D "TEERTH SHARMA" letters pressed into the snow, in the ground plane.
const NAME_BOX = { x0: -9, x1: 9, z0: 1.5, z1: 4.5 };

// Exported so callers that need to keep something OUT of the name (e.g. a
// penguin's wander target, not just its sampled home) can reuse the same box.
export function inNameBox(x, z, margin = 0) {
  return x > NAME_BOX.x0 - margin && x < NAME_BOX.x1 + margin && z > NAME_BOX.z0 - margin && z < NAME_BOX.z1 + margin;
}

// Buildings (+4 m clearance), docks (+3 m), the spawn circle (+6 m), the
// name pressed into the snow, and any land builder's extra bulk
// (LAND_COLLIDERS) are all off limits. `clearance` widens every one of those
// margins, e.g. so a whole group's wander disc (not just its sampled centre
// point) stays clear. Split from forbidden() below so sampleNearRiver can
// reuse it without also rejecting the riverbank it is aiming for.
function forbiddenOnLand(x, z, clearance = 0) {
  for (const place of PLACES) {
    if (Math.hypot(x - place.x, z - place.z) < place.radius + 4 + clearance) return true;
    const dock = dockPoint(place);
    if (Math.hypot(x - dock.x, z - dock.z) < 3 + clearance) return true;
  }
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6 + clearance) return true;
  if (inNameBox(x, z, clearance)) return true;
  for (const c of LAND_COLLIDERS) {
    if (Math.hypot(x - c.x, z - c.z) < c.radius + 2 + clearance) return true;
  }
  return false;
}

// forbiddenOnLand() plus the river/moat banks (within 2 + clearance m).
function forbidden(x, z, clearance = 0) {
  if (forbiddenOnLand(x, z, clearance)) return true;
  const river = riverAt(x, z, FORBIDDEN_RIVER_OUT);
  return river.depth > -(2 + clearance) / river.half;
}

// One dry point within `distance` m of a RIVER bank (outside the water),
// clear of everything forbiddenOnLand() rejects: for the one penguin group
// the brief wants close enough to watch the seal ride past. Returns null if
// `tries` candidates all miss (caller falls back to the general sample).
export function sampleNearRiver(seed, { distance = 6, clearance = 0, tries = 200 } = {}) {
  const rand = mulberry32(seed);
  const pts = RIVER.points;
  for (let i = 0; i < tries; i++) {
    const seg = Math.floor(rand() * (pts.length - 1));
    const [ax, az] = pts[seg];
    const [bx, bz] = pts[seg + 1];
    const u = rand();
    const cx = ax + (bx - ax) * u;
    const cz = az + (bz - az) * u;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const side = rand() < 0.5 ? 1 : -1;
    const half = riverAt(cx, cz, FORBIDDEN_RIVER_OUT).half;
    const off = half + 0.5 + rand() * Math.max(0.5, distance - 0.5);
    const x = cx + px * side * off;
    const z = cz + pz * side * off;
    if (riverAt(x, z, FORBIDDEN_RIVER_OUT).inside) continue;
    if (Math.hypot(x, z) > ISLAND_RADIUS - 3) continue;
    if (forbiddenOnLand(x, z, clearance)) continue;
    return { x, z };
  }
  return null;
}

// `count` points, each at least `gap` from every other point returned here
// and from `avoid`. The first `nearCount` are biased into a ring around
// `near` (widening if that ring turns out too tight), so a "playground" can
// sit close to a chosen point without ever hard-coding its x/z.
export function samplePoints(count, seed, { gap = 2.5, avoid = [], near = null, nearCount = 0, nearRadius = 9, clearance = 0 } = {}) {
  const rand = mulberry32(seed);
  const taken = avoid.slice();
  const points = [];
  const edge = ISLAND_RADIUS - 3;
  for (let i = 0; i < count; i++) {
    const biased = near && i < nearCount;
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 500 && !ok; tries++) {
      const spread = Math.min(nearRadius * (1 + tries / 150), edge);
      const r = biased ? Math.sqrt(rand()) * spread : Math.sqrt(rand()) * edge;
      const a = rand() * Math.PI * 2;
      x = (biased ? near.x : 0) + Math.cos(a) * r;
      z = (biased ? near.z : 0) + Math.sin(a) * r;
      ok = Math.hypot(x, z) <= edge && !forbidden(x, z, clearance) && taken.every((t) => Math.hypot(x - t.x, z - t.z) >= gap);
    }
    points.push({ x, z });
    taken.push({ x, z });
  }
  return points;
}
