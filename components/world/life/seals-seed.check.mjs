/* global console */
// node components/world/life/seals-seed.check.mjs
// The colony's 8 seals all land clear of the Aether-Lang building, its
// dock, the path in, every landform and the water, on flat ground -- and
// every moat jumper's ring stays over water at every angle, so an arc never
// leaves the ring no matter when in its cycle it leaps.

import assert from "node:assert/strict";
import { COLONY, JUMPERS, RING_CENTER, sealClear } from "./seals-seed.js";
import { riverAt } from "../../../lib/world/river.js";
import { PLACE_BY_ID, dockPoint } from "../../../lib/world/places.js";

assert.equal(COLONY.length, 18, `expected 18 colony seals, got ${COLONY.length}`);

for (const s of COLONY) {
  assert.ok(sealClear(s.x, s.z, 1.5), `Easter-egg pup ${s.id} at (${s.x.toFixed(2)}, ${s.z.toFixed(2)}) is not clear`);
  for (const p of Object.values(PLACE_BY_ID)) {
    const dock = dockPoint(p);
    assert.ok(Math.hypot(s.x - dock.x, s.z - dock.z) > 2, `Easter-egg pup ${s.id} is on ${p.id}'s dock`);
  }
  for (const q of COLONY) if (q !== s) assert.ok(Math.hypot(s.x - q.x, s.z - q.z) > 12, `Easter-egg pups ${s.id} and ${q.id} are too close`);
  assert.ok(s.costume && s.color, `Easter-egg pup ${s.id} has no costume`);
}
// Every onBack pup points at a real seal that comes before it in the array.
for (const s of COLONY) {
  if (s.onBack >= 0) assert.ok(s.onBack < s.id, `seal ${s.id}'s onBack (${s.onBack}) is not an earlier seal`);
}

assert.equal(JUMPERS.length, 3, `expected 3 moat jumpers, got ${JUMPERS.length}`);
for (const j of JUMPERS) {
  for (let a = 0; a < 360; a += 5) {
    const rad = (a * Math.PI) / 180;
    const x = RING_CENTER.x + Math.cos(rad) * j.radius;
    const z = RING_CENTER.z + Math.sin(rad) * j.radius;
    assert.ok(riverAt(x, z).inside, `jumper radius ${j.radius} leaves the water at angle ${a}`);
  }
}

console.log(`seals-seed: ok (${COLONY.length} Easter-egg pups spread over the island, ${JUMPERS.length} moat jumpers)`);
