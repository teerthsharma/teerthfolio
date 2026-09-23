/* global console */
// node components/world/life/spawn.check.mjs
// Every prop and penguin actually lands somewhere valid: outside every
// forbidden() circle and at least 2 m from any water. The review that asked
// for this found all 21 seeded points of the previous run silently invalid
// (forbidden()'s water test was always true on dry land) — this is the check
// that would have caught it.

import assert from "node:assert/strict";
import { forbidden } from "./spawn.js";
import { waterGap } from "../../../lib/world/river.js";
import { buildGroups } from "./props-seed.js";
import { buildFlock, GROUPS } from "./penguins-seed.js";

function checkPoint(label, x, z) {
  assert.ok(!forbidden(x, z), `${label} at (${x.toFixed(1)}, ${z.toFixed(1)}) is forbidden`);
  const gap = waterGap(x, z);
  assert.ok(gap > 2, `${label} at (${x.toFixed(1)}, ${z.toFixed(1)}) is only ${gap.toFixed(2)} m from the water`);
}

const groups = buildGroups();
let propCount = 0;
for (const kind of Object.keys(groups)) {
  for (const p of groups[kind]) {
    checkPoint(`prop ${kind}`, p.x, p.z);
    propCount++;
  }
}
// fix 13: 12 snowballs + 4 beach balls + 4 crates + 6 fish + 3 rings = 29.
assert.equal(propCount, 29, `expected 29 props, got ${propCount}`);

const flock = buildFlock();
const rosterTotal = GROUPS.reduce((n, g) => n + g.roster.length, 0);
assert.equal(flock.length, rosterTotal, `expected ${rosterTotal} penguins, got ${flock.length}`);
for (const p of flock) checkPoint("penguin", p.x, p.z);

// fix 12: group A's home stands right of the seal in the first frame.
const groupAHome = { x: flock[0].homeX, z: flock[0].homeZ };
assert.ok(
  groupAHome.x > 6 && groupAHome.x < 14 && groupAHome.z > 5 && groupAHome.z < 12,
  `group A's home (${groupAHome.x.toFixed(1)}, ${groupAHome.z.toFixed(1)}) is not in x 6..14, z 5..12`,
);

console.log(`spawn: ok (${propCount} props, ${flock.length} penguins)`);
