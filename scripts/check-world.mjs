// The rules the island has to keep, checked against the real motion code.
// Run: npm run check

import assert from "node:assert/strict";
import { MOTION, createSeal, nearestPlace, stepSeal } from "../lib/world/motion.js";
import { ISLAND_RADIUS, PLACES, SPAWN, dockPoint } from "../lib/world/places.js";

const colliders = PLACES.map(({ x, z, radius }) => ({ x, z, radius }));
const world = { colliders, radius: ISLAND_RADIUS, props: [] };
const run = (seal, controls, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) stepSeal(seal, controls, 1 / 120, world);
  return seal;
};

// Layout: every building fits on the island, none overlap, and each one's
// dock is reachable open snow.
for (const a of PLACES) {
  assert.ok(Math.hypot(a.x, a.z) + a.radius < ISLAND_RADIUS - 2, `${a.id} hangs off the island`);
  const dock = dockPoint(a);
  for (const b of PLACES) {
    const gap = Math.hypot(dock.x - b.x, dock.z - b.z) - b.radius - MOTION.sealRadius;
    assert.ok(gap > 0, `${a.id}'s dock is inside ${b.id}`);
    if (a === b) continue;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.radius + b.radius + 4, `${a.id} and ${b.id} leave no lane between them`);
  }
}
assert.equal(new Set(PLACES.map((p) => p.id)).size, PLACES.length, "place ids are unique");
for (const p of PLACES) {
  assert.ok(p.proof.length >= 2 && p.links.length >= 1, `${p.id} needs proof and a link`);
}

// Motion: holding a direction reaches top speed and releasing glides to a stop.
const seal = createSeal(SPAWN.x, SPAWN.z);
run(seal, { input: { x: 1, z: 0 } }, 3);
assert.ok(seal.speed > MOTION.maxSpeed * 0.9, `top speed not reached: ${seal.speed}`);
assert.ok(Math.abs(seal.heading - Math.PI / 2) < 0.05, "the body faces where it slides");
run(seal, {}, 4);
assert.ok(seal.speed < 0.1, `the seal never stops: ${seal.speed}`);

// Walls: driving straight at a building never ends inside it.
const home = PLACES.find((p) => p.id === "home");
const rammer = createSeal(home.x, home.z + 12);
run(rammer, { input: { x: 0, z: -1 }, boost: true }, 5);
assert.ok(Math.hypot(rammer.x - home.x, rammer.z - home.z) >= home.radius + MOTION.sealRadius - 1e-6, "tunnelled into the igloo");

// Rim: the seal cannot leave the island.
const swimmer = createSeal(0, 0);
run(swimmer, { input: { x: 1, z: 1 }, boost: true }, 12);
assert.ok(Math.hypot(swimmer.x, swimmer.z) <= ISLAND_RADIUS, "slid off the island");

// Click-to-move: sending the seal to a dock arrives and reports that building.
for (const place of PLACES) {
  const traveller = createSeal(SPAWN.x, SPAWN.z);
  const dock = dockPoint(place);
  run(traveller, { target: dock }, 20);
  assert.equal(nearestPlace(traveller, PLACES)?.id, place.id, `click-to-move never reached ${place.id}`);
}

// Props: a shoved snowball moves, then stops.
const ball = { x: SPAWN.x, z: SPAWN.z - 2, vx: 0, vz: 0, radius: 0.55, mass: 1, spin: 0 };
const pusher = createSeal(SPAWN.x, SPAWN.z + 1);
const withProps = { ...world, props: [ball] };
for (let t = 0; t < 1.5; t += 1 / 120) stepSeal(pusher, { input: { x: 0, z: -1 } }, 1 / 120, withProps);
assert.ok(ball.z < SPAWN.z - 3, "the snowball did not move when shoved");
for (let t = 0; t < 8; t += 1 / 120) stepSeal(pusher, {}, 1 / 120, withProps);
assert.ok(Math.hypot(ball.vx, ball.vz) < 0.05, "the snowball never stops");

console.log(`world check passed: ${PLACES.length} places, motion, walls, rim, docks, props`);
