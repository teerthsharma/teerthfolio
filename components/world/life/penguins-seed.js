// Pure seed data for Penguins: six groups' homes and roster. No React, no
// Three.js scene graph — just samplePoints() calls — so this file doubles as
// a Node-runnable check (spawn.check.mjs) and as Penguins.jsx's data source.

import { ISLAND_RADIUS, SPAWN } from "../../../lib/world/places.js";
import { samplePoints, sampleNearRiver, mulberry32 } from "./spawn.js";

const SEED = 20260924;

// A and B are the original playground pair, close to spawn. Four more homes
// come from samplePoints at runtime (below), spread across the island, one
// of them biased onto a river bank. A's near point + radius keeps its home
// right of the seal in the 1440x900 first frame, clear of the minimap: the
// only open ground that close to spawn sits past the two paths that fork
// round the name (forbidden() now keeps 1.7 m off every one of them), so A
// also gets a tighter clearance than radius + 1 — still comfortably past its
// own worst-case jitter (radius * 0.6 = 1.68 m), just not the wider margin
// every other group gets.
export const GROUPS = [
  { id: "A", near: { x: 11.5, z: 11.3 }, nearRadius: 0.5, radius: 2.8, clearance: 1.9, roster: ["adult", "adult", "chick"] },
  { id: "B", near: { x: SPAWN.x, z: SPAWN.z + 21 }, nearRadius: 10, radius: 4, roster: ["adult", "adult", "adult"] },
  { id: "C", radius: 3.2, roster: ["adult", "adult", "adult", "chick"] },
  { id: "D", radius: 3.2, roster: ["adult", "adult", "adult", "chick"], riverBank: true },
  { id: "E", radius: 3.2, roster: ["adult", "adult", "adult", "chick"] },
  { id: "F", radius: 3.2, roster: ["adult", "adult", "adult", "chick"] },
];

export function buildFlock() {
  // A, B: near-biased to their original playground spots.
  const centers = [];
  for (let gi = 0; gi < 2; gi++) {
    const g = GROUPS[gi];
    centers.push(
      samplePoints(1, SEED + gi, {
        gap: 9,
        avoid: centers.slice(),
        near: g.near,
        nearCount: 1,
        nearRadius: g.nearRadius,
        clearance: g.clearance ?? g.radius + 1, // keeps the whole wander disc, not just the sampled centre, off buildings/dock/spawn/name
      })[0],
    );
  }
  // C, D, E, F: spread island-wide (one runtime call, so they stay 18 m
  // apart from each other and from A/B), one of them biased onto a river
  // bank so it can watch the seal ride past.
  const wide = samplePoints(4, SEED + 77, { gap: 18, clearance: 5, avoid: centers.slice() });
  const edge = ISLAND_RADIUS - 8;
  for (const p of wide) {
    const r = Math.hypot(p.x, p.z) || 1e-6;
    if (r > edge) {
      p.x *= edge / r;
      p.z *= edge / r;
    }
  }
  const riverGroup = GROUPS.find((g) => g.riverBank);
  const bank = sampleNearRiver(SEED + 900, { distance: 6, clearance: riverGroup.radius + 1 });
  if (bank) wide[GROUPS.indexOf(riverGroup) - 2] = bank;
  centers.push(...wide);

  const flock = [];
  GROUPS.forEach((g, gi) => {
    const home = centers[gi];
    if (!home) return; // samplePoints gave up on every candidate for this group; skip it rather than crash on undefined
    const rand = mulberry32(SEED + 500 + gi);
    g.roster.forEach((role) => {
      const r = Math.sqrt(rand()) * g.radius * 0.6;
      const a = rand() * Math.PI * 2;
      const chick = role === "chick";
      flock.push({
        kind: "penguin",
        x: home.x + Math.cos(a) * r,
        z: home.z + Math.sin(a) * r,
        vx: 0,
        vz: 0,
        radius: chick ? 0.26 : 0.38,
        mass: chick ? 0.3 : 0.6,
        spin: 0,
        hit: 0,
        chick,
        homeX: home.x,
        homeZ: home.z,
        groupRadius: g.radius,
        rand: mulberry32(Math.floor(rand() * 1e9)),
        // behaviour state
        state: "wander",
        targetX: 0,
        targetZ: 0,
        hasTarget: false,
        pauseUntil: 0,
        walkHome: false,
        hopping: false,
        hopStart: 0,
        hopIndex: 0,
        calmSince: -1,
        startleStart: 0,
        flopStart: 0,
        prevHit: 0,
        // pose
        yaw: Math.atan2(-home.x, -home.z),
        phase: 0,
        pitch: 0,
        flipperRaise: 0,
        flap: 0,
        hop: 0,
      });
    });
  });
  return flock;
}
