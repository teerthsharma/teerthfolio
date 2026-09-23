// Pure seed data for Props: where every loose object starts. No React, no
// Three.js scene graph — just samplePoints() calls — so this file doubles as
// a Node-runnable check (spawn.check.mjs) and as Props.jsx's data source.

import { Quaternion } from "three";
import { PLACE_BY_ID, PLACES, SPAWN, dockPoint } from "../../../lib/world/places.js";
import { samplePoints, mulberry32 } from "./spawn.js";

const SEED = 20260923;
// The playground just south of spawn, close enough to sit in the 1440x900
// first frame (6-9.5 m below spawn on screen).
const NEAR = { x: SPAWN.x, z: SPAWN.z + 7 };
// The harbour, anchored off the igloo's dock. Computed at runtime so it
// tracks wherever another workflow moves the igloo.
const HOME_DOCK = dockPoint(PLACE_BY_ID.home);
const HARBOUR = { x: HOME_DOCK.x + 6, z: HOME_DOCK.z + 2 };

// Every upstream landform's district, once, in showcase order: so a small
// prop cluster can sit in front of each one ("something to shove").
const UPSTREAM_DISTRICTS = (() => {
  const seen = new Set();
  const list = [];
  for (const p of PLACES) {
    if (p.section === "upstream" && !seen.has(p.district.id)) {
      seen.add(p.district.id);
      list.push(p.district);
    }
  }
  return list;
})();
function districtNear(i) {
  const d = UPSTREAM_DISTRICTS[i % UPSTREAM_DISTRICTS.length];
  return { x: d.x, z: d.z + d.radius * 1.3 };
}

// ---- seeded layout, built once ---------------------------------------------

export function buildGroups() {
  let taken = [];
  const sample = (count, seedOffset, opts) => {
    const pts = samplePoints(count, SEED + seedOffset, { avoid: taken, ...opts });
    taken = taken.concat(pts);
    return pts;
  };

  const snowRand = mulberry32(SEED + 101);
  // 3 pyramids of 3 (the spawn playground, plus two landform clusters) and 3
  // loose singles on three more landforms: island-wide density without
  // scattering the whole budget at random.
  const pyramidPts = [
    ...sample(3, 1, { gap: 1, near: NEAR, nearCount: 3, nearRadius: 1.6 }),
    ...sample(3, 10, { gap: 1, near: districtNear(0), nearCount: 3, nearRadius: 1.6 }),
    ...sample(3, 11, { gap: 1, near: districtNear(1), nearCount: 3, nearRadius: 1.6 }),
  ];
  const loosePts = [
    ...sample(1, 12, { gap: 1.4, near: districtNear(2), nearCount: 1, nearRadius: 2 }),
    ...sample(1, 13, { gap: 1.4, near: districtNear(3), nearCount: 1, nearRadius: 2 }),
    ...sample(1, 14, { gap: 1.4, near: districtNear(4), nearCount: 1, nearRadius: 2 }),
  ];
  const snowball = [...pyramidPts, ...loosePts].map(({ x, z }) => {
    const r = 0.45 + snowRand() * 0.15;
    return { kind: "snowball", x, z, vx: 0, vz: 0, radius: r, mass: (r / 0.5) ** 3, spin: 0, hit: 0, seedX: x, seedZ: z, q: new Quaternion() };
  });

  const beachball = [
    ...sample(2, 2, { gap: 1.4, near: NEAR, nearCount: 1, nearRadius: 2.5 }),
    ...sample(2, 15, { gap: 1.4, near: districtNear(5), nearCount: 2, nearRadius: 2.2 }),
  ].map(({ x, z }) => ({
    kind: "beachball", x, z, vx: 0, vz: 0, radius: 0.45, mass: 0.35, spin: 0, hit: 0, seedX: x, seedZ: z, q: new Quaternion(),
  }));

  const ring = [
    ...sample(2, 3, { gap: 2.4 }),
    ...sample(1, 16, { gap: 2.4, near: districtNear(6), nearCount: 1, nearRadius: 2.2 }),
  ].map(({ x, z }) => ({ kind: "ring", x, z, vx: 0, vz: 0, radius: 0.55, mass: 0.6, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0 }));

  // Both original crates biased to the harbour, plus one more landform cluster.
  const crate = [
    ...sample(2, 4, { gap: 1.6, near: HARBOUR, nearCount: 2, nearRadius: 3 }),
    ...sample(2, 17, { gap: 1.6, near: districtNear(7), nearCount: 2, nearRadius: 2.5 }),
  ].map(({ x, z }) => ({ kind: "crate", x, z, vx: 0, vz: 0, radius: 0.62, mass: 3.5, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0 }));

  // One fish in the playground (first frame), two at the harbour, three more
  // spread across landform clusters.
  const fishPts = [
    ...sample(1, 5, { gap: 1.4, near: NEAR, nearCount: 1, nearRadius: 2.5 }),
    ...sample(2, 6, { gap: 1.6, near: HARBOUR, nearCount: 2, nearRadius: 3 }),
    ...sample(1, 18, { gap: 1.6, near: districtNear(0), nearCount: 1, nearRadius: 2.5 }),
    ...sample(1, 19, { gap: 1.6, near: districtNear(3), nearCount: 1, nearRadius: 2.5 }),
    ...sample(1, 20, { gap: 1.6, near: districtNear(6), nearCount: 1, nearRadius: 2.5 }),
  ];
  const fish = fishPts.map(({ x, z }, i) => {
    const rand = mulberry32(SEED + 900 + i);
    // Broadside to the fixed camera, not end-on as a vertical sliver.
    const yaw = (rand() < 0.5 ? -1 : 1) * (Math.PI / 2 + (rand() - 0.5) * 0.8);
    return {
      kind: "fish", x, z, vx: 0, vz: 0, radius: 0.5, mass: 0.4, spin: 0, hit: 0, seedX: x, seedZ: z, yaw, side: 0,
      rand, flopAt: 2 + rand() * 3, flopT: -1, eaten: false, eatenAt: 0, respawnAt: undefined, scale: 1,
    };
  });

  return { snowball, beachball, ring, crate, fish };
}
