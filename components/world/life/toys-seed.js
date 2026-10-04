// Pure seed data for Toys.jsx: where the TNT crates and the Bruno-style toys
// stand. samplePoints() (spawn.js) already dodges buildings, docks, spawn, the
// name, trails and water; this adds the asphalt, a clear run for each toy's
// whole footprint, and the existing props. Node-runnable, no React.

import { HIGHWAY, onHighway } from "../../../lib/world/land.js";
import { SPAWN } from "../../../lib/world/places.js";
import { makeBowling, makeCone, makeStack, makeTnt } from "../../../lib/world/toys.js";
import { buildGroups } from "./props-seed.js";
import { forbidden, mulberry32, samplePoints } from "./spawn.js";

const SEED = 20261004;

const open = (x, z, clearance = 0.5) => !forbidden(x, z, clearance) && !onHighway(x, z) && Math.hypot(x - SPAWN.x, z - SPAWN.z) >= 12;

export function buildToys() {
  const groups = buildGroups();
  const taken = Object.values(groups).flat().map(({ x, z }) => ({ x, z }));
  const claim = (pts) => taken.push(...pts);

  // A free spot whose whole footprint (`shape`: [dx, dz] offsets) is open.
  let n = 0;
  const anchor = (gap, shape, clearance = 3) => {
    for (let k = 0; k < 120; k++) {
      const [a] = samplePoints(1, SEED + 31 * ++n, { gap, avoid: taken, clearance });
      if (a && shape.every(([dx, dz]) => open(a.x + dx, a.z + dz, 1))) {
        claim([a]);
        return a;
      }
    }
    throw new Error("toys-seed: no open spot for a toy");
  };

  // 4 loose crates and 2 pairs (a pair 3.6 m apart: one blast reaches the other).
  const tnt = [];
  const rand = mulberry32(SEED);
  for (let i = 0; i < 4; i++) {
    const a = anchor(12, [[0, 0]]);
    tnt.push(makeTnt(a.x, a.z));
  }
  for (let i = 0; i < 2; i++) {
    const turn = rand() * Math.PI * 2;
    const dirs = [0, 1, 2, 3, 4, 5].map((j) => turn + j * 1.047);
    let pair = null;
    for (let k = 0; k < 30 && !pair; k++) {
      const a = anchor(12, [[0, 0]]);
      const d = dirs.find((t) => open(a.x + Math.cos(t) * 3.6, a.z + Math.sin(t) * 3.6, 1));
      if (d !== undefined) pair = [a, { x: a.x + Math.cos(d) * 3.6, z: a.z + Math.sin(d) * 3.6 }];
    }
    if (!pair) throw new Error("toys-seed: no open spot for a crate pair");
    tnt.push(makeTnt(pair[0].x, pair[0].z), makeTnt(pair[1].x, pair[1].z));
  }

  // Two pyramids of cubes, and one bowling lane (ball 3.2 m up from the apex).
  const stacks = [0, 1].map(() => {
    const a = anchor(10, [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]]);
    return makeStack(a.x, a.z);
  });
  const lane = anchor(10, [[0, -3.6], [0, 0], [-0.8, 1.2], [0.8, 1.2]], 4);
  const bowling = makeBowling(lane.x, lane.z);

  // Cones in a row on the verge beside the highway: the first run of four
  // open spots along either side of any leg.
  const cones = [];
  const half = HIGHWAY.width / 2;
  legs: for (const leg of HIGHWAY.legs) {
    for (let i = 1; i < leg.length; i++) {
      const [ax, az] = leg[i - 1];
      const [bx, bz] = leg[i];
      const len = Math.hypot(bx - ax, bz - az);
      const ux = (bx - ax) / len;
      const uz = (bz - az) / len;
      for (const side of [1, -1]) {
        for (let s = 1; s + 5.4 < len; s += 1) {
          const row = [0, 1, 2, 3].map((j) => [ax + ux * (s + j * 1.8) - uz * side * (half + 1), az + uz * (s + j * 1.8) + ux * side * (half + 1)]);
          if (row.every(([x, z]) => open(x, z, 0))) {
            for (const [x, z] of row) cones.push(makeCone(x, z));
            break legs;
          }
        }
      }
    }
  }
  if (!cones.length) throw new Error("toys-seed: no verge for the cones");

  return { tnt, stacks, bowling, cones };
}

// Every solid prop, for live.props (the stack's riders join when it topples).
export function solidProps(toys) {
  return [...toys.tnt, ...toys.stacks.flatMap((s) => s.base), ...toys.bowling.pins, toys.bowling.ball, ...toys.cones];
}
