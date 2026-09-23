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

assert.equal(COLONY.length, 8, `expected 8 colony seals, got ${COLONY.length}`);

const place = PLACE_BY_ID["p-aether-lang"];
const dock = dockPoint(place);
for (const s of COLONY) {
  assert.ok(sealClear(s.x, s.z), `colony seal ${s.id} at (${s.x.toFixed(2)}, ${s.z.toFixed(2)}) is not clear`);
  const toBuilding = Math.hypot(s.x - place.x, s.z - place.z);
  assert.ok(toBuilding > place.radius, `colony seal ${s.id} is inside the building`);
  const toDock = Math.hypot(s.x - dock.x, s.z - dock.z);
  assert.ok(toDock > 1, `colony seal ${s.id} is on the dock`);
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

console.log(`seals-seed: ok (${COLONY.length} colony seals in 2 piles, ${JUMPERS.length} moat jumpers)`);
