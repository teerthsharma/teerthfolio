// Seed data for the Aether-Lang seal colony (SealColony.jsx) and the moat's
// porpoising seals. Pure module (no React, no scene graph) so it doubles as
// a Node-runnable check (seals-seed.check.mjs) and as the component's data
// source, the same split penguins-seed.js uses for the flock.
//
// The colony is TWO cuddle piles, not a ring: each pile's members are
// authored by hand as small (dx, dz) offsets from the pile's own centre, in
// a fixed local frame (never rotated to face the building), because a huddle
// of seals leaning on each other doesn't care which way the building sits.
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
export function sealClear(x, z, margin = 0.3) {
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

// Each pile's composition: hand-placed (dx, dz) from the pile's own centre,
// a size (a colony seal's own "1.0" is a good deal shorter nose-to-tail
// than the player pup -- see BODY_LENGTH in seals-geo -- so every one of
// these reads smaller than or level with the player), a coat, and whether
// it rests its head up on the seal it leans against (onBack: lifted and
// pitched forward, roughly onto that neighbour's shoulder).
const PILE_A = [
  { dx: 0.0, dz: 0.0, scale: 1.05, coat: "grey", tone: 0.0 }, // the anchor the rest lean on
  { dx: -0.62, dz: 0.3, scale: 0.88, coat: "grey", tone: -0.15 },
  { dx: 0.6, dz: 0.22, scale: 0.82, coat: "grey", tone: 0.12 },
  { dx: 0.12, dz: -0.16, scale: 0.6, coat: "grey", tone: 0.2, onBack: 0 }, // onBack: index of the seal it rests on, set below
  { dx: -0.15, dz: 0.62, scale: 0.76, coat: "cream", tone: 0.0 },
];
const PILE_B = [
  { dx: 0.0, dz: 0.0, scale: 0.95, coat: "cream", tone: 0.0 },
  { dx: 0.55, dz: -0.2, scale: 0.7, coat: "grey", tone: -0.1 },
  { dx: -0.42, dz: 0.28, scale: 0.58, coat: "grey", tone: 0.15 },
];

// Walk outward from the building along one compass direction until every
// member of `offsets` clears sealClear() at its absolute position.
function placePile(angleDeg, offsets) {
  const rad = (angleDeg * Math.PI) / 180;
  const dirX = Math.cos(rad);
  const dirZ = Math.sin(rad);
  for (let r = 6.4; r <= 9; r += 0.1) {
    const cx = PLACE.x + dirX * r;
    const cz = PLACE.z + dirZ * r;
    if (offsets.every((o) => sealClear(cx + o.dx, cz + o.dz))) return { x: cx, z: cz };
  }
  // Never hit in practice (Aether-Lang's own clearing is generous on every
  // side but the dock's); land far out rather than crash the build.
  return { x: PLACE.x + dirX * 9, z: PLACE.z + dirZ * 9 };
}

function buildPile(centerAngle, offsets, idStart) {
  const c = placePile(centerAngle, offsets);
  return offsets.map((o, i) => {
    // Faces the pile's own middle by default (nuzzling in), each with a
    // small per-seal jitter off that so the huddle doesn't read as a ring
    // of heads all aimed at one point.
    const toCenter = Math.atan2(-o.dx, -o.dz);
    const jitter = ((i * 37) % 11) / 11 - 0.5; // deterministic, no RNG needed for 8 seals
    return {
      id: idStart + i,
      x: c.x + o.dx,
      z: c.z + o.dz,
      restYaw: toCenter + jitter * 0.7,
      scale: o.scale,
      coat: o.coat,
      tone: o.tone,
      onBack: o.onBack !== undefined ? idStart + o.onBack : -1,
      // Individual lag: how fast this seal's notice/bow eases toward its
      // target, and its own stagger on the distance thresholds, so the
      // whole colony never turns or bows as one rigid unit.
      lookRate: 1.7 + ((i * 53) % 13) / 13,
      bowRate: 1.1 + ((i * 29) % 9) / 9,
      noticeStagger: ((i * 71) % 17) / 17 - 0.5, // +/- 0.5 * 3 m
      bowStagger: ((i * 19) % 7) / 7 - 0.5, // +/- 0.5 * 2.4 m
      idlePhase: i * 2.6 + 1.1,
    };
  });
}

// Two piles on opposite flanks of the building: 200 deg (west, past the
// building) and 350 deg (east, short of the path in from the science
// quarter) -- both outside the sector the dock and its approach path sit
// in (roughly 25..110 deg), found the same way placePile() finds every
// centre: by trying, not by asserting the angle is clear.
export const COLONY = [...buildPile(200, PILE_A, 0), ...buildPile(350, PILE_B, PILE_A.length)];

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
