// The rules the island has to keep, checked against the real motion code.
// Run: npm run check

import assert from "node:assert/strict";
import { MOTION, createSeal, nearestPlace, stepSeal } from "../lib/world/motion.js";
import { ISLAND_RADIUS, PLACES, SPAWN, dockPoint } from "../lib/world/places.js";
import { RIVER, riverAt } from "../lib/world/river.js";

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

// Throttle: set while input is held, cleared shortly after release.
const th = createSeal(SPAWN.x, SPAWN.z);
run(th, { input: { x: 1, z: 0 } }, 0.5);
assert.equal(th.throttle, 1, "throttle not set while held");
run(th, {}, 0.1);
assert.equal(th.throttle, 0, "throttle still set 0.1s after release");

// Glide: released from top speed, the seal travels 4-6.5 m before it settles.
// The weight of the ice becomes a tested number, not a feeling.
const glider = createSeal(SPAWN.x, SPAWN.z);
run(glider, { input: { x: 1, z: 0 } }, 3);
let glideDist = 0;
let steps = 0;
while (glider.speed >= 0.1 && steps < 10000) {
  const px = glider.x;
  const pz = glider.z;
  stepSeal(glider, {}, 1 / 120, world);
  glideDist += Math.hypot(glider.x - px, glider.z - pz);
  steps++;
}
assert.ok(glideDist > 4 && glideDist < 6.5, `glide distance out of range: ${glideDist}`);

// Skid: reversing the stick at top speed spikes the skid read, which then
// settles once the seal has been gliding straight for a couple of seconds.
const skidder = createSeal(SPAWN.x, SPAWN.z);
run(skidder, { input: { x: 1, z: 0 } }, 3);
let peakSkid = 0;
for (let t = 0; t < 0.25; t += 1 / 120) {
  stepSeal(skidder, { input: { x: -1, z: 0 } }, 1 / 120, world);
  peakSkid = Math.max(peakSkid, skidder.skid);
}
assert.ok(peakSkid > 0.3, `skid peak too low: ${peakSkid}`);
run(skidder, {}, 2);
assert.ok(skidder.skid < 0.05, `skid did not settle after gliding straight: ${skidder.skid}`);

// Reaction: a heavy crate stops the seal harder than a light snowball, and
// both register a fresh hit that fades within a couple of seconds. Approach
// due south of spawn: the only clear lane with no building on it.
function reactionLoss(mass, radius) {
  const prop = { x: SPAWN.x, z: SPAWN.z + 20, vx: 0, vz: 0, radius, mass, spin: 0, hit: 0 };
  const seal = createSeal(SPAWN.x, SPAWN.z);
  const w = { ...world, props: [prop] };
  // stepProps runs before seal.speed is cached, so seal.speed already holds
  // the impulse; vx/vz are read directly to stay independent of that order.
  const rawSpeed = () => Math.hypot(seal.vx, seal.vz);
  let prevSpeed = rawSpeed();
  let speedBefore = null;
  let speedAtContact = null;
  for (let t = 0; t < 6 && speedAtContact === null; t += 1 / 120) {
    stepSeal(seal, { input: { x: 0, z: 1 } }, 1 / 120, w);
    if (prop.hit > 0) {
      speedAtContact = rawSpeed();
      speedBefore = prevSpeed;
    }
    prevSpeed = rawSpeed();
  }
  assert.ok(speedAtContact !== null, `mass ${mass} prop was never reached`);
  assert.ok(prop.hit > 0.2, `mass ${mass} prop hit too low right after contact: ${prop.hit}`);
  for (let t = 0; t < 2; t += 1 / 120) stepSeal(seal, {}, 1 / 120, w);
  assert.ok(prop.hit < 0.01, `mass ${mass} prop hit did not fade: ${prop.hit}`);
  return speedBefore - speedAtContact;
}
const crateLoss = reactionLoss(3.5, 0.62);
const snowballLoss = reactionLoss(1, 0.55);
assert.ok(crateLoss > snowballLoss, `a crate should slow the seal more than a snowball: ${crateLoss} vs ${snowballLoss}`);

// Bump: a full-speed hit against a wall ends facing the wall, not turned
// round to face the knock-back. Open world (one collider standing in for
// "the wall", island rim pushed out to 1000 so it never interferes).
{
  const openStretch = { colliders: [], radius: 1000 };
  const bumpWorld = { colliders: [{ x: home.x, z: home.z, radius: home.radius }], radius: 1000 };
  const bumper = createSeal(home.x, home.z + 30);
  // Reach full speed on open ground, well short of the wall, so the
  // approach itself doesn't grind the seal into it for seconds at a time.
  for (let t = 0; t < 2; t += 1 / 120) stepSeal(bumper, { input: { x: 0, z: -1 } }, 1 / 120, openStretch);
  assert.ok(bumper.speed > MOTION.maxSpeed * 0.9, `bump test never reached full speed: ${bumper.speed}`);
  // Drive into the wall and stop the input the instant contact registers.
  let hit = false;
  for (let t = 0; t < 3 && !hit; t += 1 / 120) {
    stepSeal(bumper, { input: { x: 0, z: -1 } }, 1 / 120, bumpWorld);
    hit = bumper.impact > 0;
  }
  assert.ok(hit, "bump test never reached the wall");
  let worstOff = 0;
  for (let t = 0; t < 0.6; t += 1 / 120) {
    stepSeal(bumper, {}, 1 / 120, bumpWorld);
    const diff = Math.atan2(Math.sin(bumper.heading - Math.PI), Math.cos(bumper.heading - Math.PI));
    worstOff = Math.max(worstOff, Math.abs(diff));
  }
  assert.ok(worstOff < (20 * Math.PI) / 180, `heading turned away from the wall after a bump: ${worstOff}`);
}

// Click-to-move: an 8 m straight move doesn't overshoot much, and doesn't
// spin the body round to face the target while arriving.
{
  const openWorld = { colliders: [], radius: 1000 };
  const target = { x: SPAWN.x, z: SPAWN.z - 8 };
  const traveller = createSeal(SPAWN.x, SPAWN.z);
  let reached = false;
  let overshoot = 0;
  let worstHeading = Math.PI;
  for (let t = 0; t < 20; t += 1 / 120) {
    stepSeal(traveller, { target }, 1 / 120, openWorld);
    const dist = Math.hypot(traveller.x - target.x, traveller.z - target.z);
    if (dist < 0.3) reached = true;
    if (reached) overshoot = Math.max(overshoot, dist);
    if (dist < 1.5) worstHeading = Math.min(worstHeading, Math.abs(traveller.heading));
  }
  assert.ok(reached, "8 m click-to-move never arrived");
  assert.ok(overshoot < 0.5, `click-to-move overshot by ${overshoot} m`);
  assert.ok(worstHeading > (160 * Math.PI) / 180, `heading turned round approaching the target: ${worstHeading}`);
}

// Drift: a 90-degree turn at top speed visibly leads with the body before
// the path catches up, and the skid read moves with it.
{
  const openWorld = { colliders: [], radius: 1000 };
  const turner = createSeal(SPAWN.x, SPAWN.z);
  for (let t = 0; t < 3; t += 1 / 120) stepSeal(turner, { input: { x: 1, z: 0 } }, 1 / 120, openWorld);
  let peakAngle = 0;
  for (let t = 0; t < 1; t += 1 / 120) {
    stepSeal(turner, { input: { x: 0, z: -1 } }, 1 / 120, openWorld);
    const velAngle = Math.atan2(turner.vx, turner.vz);
    const diff = Math.atan2(Math.sin(turner.heading - velAngle), Math.cos(turner.heading - velAngle));
    peakAngle = Math.max(peakAngle, Math.abs(diff));
  }
  assert.ok(peakAngle > (15 * Math.PI) / 180, `drift too subtle in a 90° turn: ${peakAngle}`);
}

// Turn cap: a top-speed reversal never turns faster than maxYaw, so it reads
// as digging in, not a sprite flip.
{
  const openWorld = { colliders: [], radius: 1000 };
  const flipper = createSeal(SPAWN.x, SPAWN.z);
  for (let t = 0; t < 3; t += 1 / 120) stepSeal(flipper, { input: { x: 1, z: 0 } }, 1 / 120, openWorld);
  let worstRate = 0;
  for (let t = 0; t < 1; t += 1 / 120) {
    const before = flipper.heading;
    stepSeal(flipper, { input: { x: -1, z: 0 } }, 1 / 120, openWorld);
    const dh = Math.abs(Math.atan2(Math.sin(flipper.heading - before), Math.cos(flipper.heading - before)));
    worstRate = Math.max(worstRate, dh / (1 / 120));
  }
  assert.ok(worstRate <= MOTION.maxYaw + 1e-6, `yaw rate exceeded the cap: ${worstRate} rad/s`);
}

// Rim: a boosted run into the rim leaves an impact spike, and the seal stays on the island.
const rimRunner = createSeal(0, 0);
let peakRimImpact = 0;
for (let t = 0; t < 6; t += 1 / 120) {
  stepSeal(rimRunner, { input: { x: 1, z: 1 }, boost: true }, 1 / 120, world);
  peakRimImpact = Math.max(peakRimImpact, rimRunner.impact);
}
assert.ok(peakRimImpact > 0.2, `boosted rim run produced no impact: ${peakRimImpact}`);
assert.ok(Math.hypot(rimRunner.x, rimRunner.z) <= ISLAND_RADIUS, "the rim let the seal off the island");

// River: an idle seal dropped in near a bank at the source rides the whole
// river to the mouth within 20 s and the current keeps it in the water round
// every bend (without the centring drift it strands in the slack water by a
// bank); paddling across reaches a bank in well under two seconds; on land
// the seal is dry. Open world, so a building on the river can't hide a
// motion bug.
{
  const openWorld = { colliders: [], radius: 1000 };
  const [[x0, z0], [x1, z1]] = RIVER.points;
  const [mx, mz] = RIVER.points.at(-1);
  const l0 = Math.hypot(x1 - x0, z1 - z0);
  const bank = 0.7 * (RIVER.width / 2);
  const rider = createSeal(x0 - ((z1 - z0) / l0) * bank, z0 + ((x1 - x0) / l0) * bank);
  let dry = 0;
  let rode = null;
  for (let t = 0; t < 20 && rode === null; t += 1 / 120) {
    stepSeal(rider, {}, 1 / 120, openWorld);
    if (!(rider.water > 0)) dry++;
    if (Math.hypot(rider.x - mx, rider.z - mz) < 4) rode = t;
  }
  assert.ok(rode !== null, `an idle rider never reached the mouth: stopped at ${rider.x.toFixed(1)}, ${rider.z.toFixed(1)}`);
  assert.equal(dry, 0, "the current beached an idle rider on a bend");

  const [[ax, az], [bx, bz]] = RIVER.points.slice(2, 4);
  const len = Math.hypot(bx - ax, bz - az);
  for (const side of [1, -1]) {
    const swimmer = createSeal((ax + bx) / 2, (az + bz) / 2);
    const across = { x: (-(bz - az) / len) * side, z: ((bx - ax) / len) * side };
    run(swimmer, {}, 0.5);
    let t = 0;
    for (; t < 3 && riverAt(swimmer.x, swimmer.z).inside; t += 1 / 120) stepSeal(swimmer, { input: across }, 1 / 120, openWorld);
    assert.ok(t < 1.5, `paddling out to a bank took ${t} s`);
    stepSeal(swimmer, { input: across }, 1 / 120, openWorld);
    assert.equal(swimmer.water, 0, "the seal is still wet on the bank");
  }
}
{
  const dryland = createSeal(SPAWN.x, SPAWN.z);
  run(dryland, { input: { x: 1, z: 0 } }, 0.5);
  assert.equal(dryland.water, 0, "the seal is wet at spawn");
}

console.log(`world check passed: ${PLACES.length} places, motion, walls, rim, docks, props, throttle, glide, skid, reaction, bump, arrival, drift, yaw cap, river ride, river exit`);
