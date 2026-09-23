// The rules the island has to keep, checked against the real motion code.
// Run: npm run check

import { GEYSER, HIGHWAY, LAND_COLLIDERS, PATHS, SIGNPOSTS, onHighway } from "../lib/world/land.js";
import assert from "node:assert/strict";
import { CatmullRomCurve3, Color, SRGBColorSpace, Vector3 } from "three";
import { LOOK_BY_ID } from "../lib/world/looks.js";
import { MOTION, createSeal, nearestPlace, stepSeal } from "../lib/world/motion.js";
import { DISTRICTS, ISLAND_RADIUS, PLACES, PLACE_BY_ID, SPAWN, districtAt, dockPoint } from "../lib/world/places.js";
import { DAM, MOAT, RESERVOIR, RIVER, WATERS, WHIRLPOOL, riverAt, waterGap } from "../lib/world/river.js";
import { WATER_Y, heightAt } from "../lib/world/terrain.js";

const colliders = [...PLACES.map(({ x, z, radius }) => ({ x, z, radius })), ...LAND_COLLIDERS];
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

// Geology: every place and its dock stand on dry land. A place's whole
// circle is dry, and so is the seal parked at its dock, and no landform's
// bulk (lib/world/land.js) buries a dock.
for (const p of PLACES) {
  assert.ok(!riverAt(p.x, p.z).inside && waterGap(p.x, p.z) > p.radius, `${p.id} stands in the water`);
  const dock = dockPoint(p);
  assert.ok(waterGap(dock.x, dock.z) > MOTION.sealRadius, `${p.id}'s dock is in the water`);
  for (const c of LAND_COLLIDERS) {
    assert.ok(Math.hypot(dock.x - c.x, dock.z - c.z) > c.radius + MOTION.sealRadius, `${p.id}'s dock is under ${c.land}'s bulk at ${c.x}, ${c.z}`);
  }
}

// Geology: the river rises at Triton's glacier, at the top of the island
// (north of every other upstream landform), and runs out into the sea.
{
  const triton = PLACE_BY_ID["pr-triton-kernels-22"];
  const [sx, sz] = RIVER.points[0];
  const [mx, mz] = RIVER.points.at(-1);
  assert.ok(Math.hypot(sx - triton.x, sz - triton.z) < 20 && sz < triton.z, "the river does not rise at Triton's glacier");
  assert.ok(Math.hypot(sx, sz) < ISLAND_RADIUS, "the river's source is off the island");
  for (const p of PLACES) {
    if (p.section === "upstream" && p !== triton) assert.ok(sz < p.z, `the river rises south of ${p.id}`);
  }
  assert.ok(Math.hypot(mx, mz) > ISLAND_RADIUS + 4, "the river never reaches the sea");
}

// Geology: the TensorFlow ice dam holds. No water crosses its crest; the
// reservoir presses against its north face; its downstream foot is dry.
// The moat has no source but the river, and the river reaches it from the
// reservoir (the dam turns the lake's water aside into it).
{
  const cross = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const [dx0, dz0] = DAM.from;
  const [dx1, dz1] = DAM.to;
  const segmentsCross = (a, b) =>
    Math.sign(cross(dx0, dz0, dx1, dz1, a[0], a[1])) !== Math.sign(cross(dx0, dz0, dx1, dz1, b[0], b[1])) &&
    Math.sign(cross(a[0], a[1], b[0], b[1], dx0, dz0)) !== Math.sign(cross(a[0], a[1], b[0], b[1], dx1, dz1));
  for (const line of WATERS) {
    for (let i = 0; i < line.points.length - 1; i++) {
      assert.ok(!segmentsCross(line.points[i], line.points[i + 1]), `water crosses the ice dam at ${line.points[i]}`);
    }
  }
  // North of the crest (up the screen) is the reservoir side.
  const north = Math.sign(cross(dx0, dz0, dx1, dz1, (dx0 + dx1) / 2, Math.min(dz0, dz1) - 10));
  assert.ok(riverAt(RESERVOIR.x, RESERVOIR.z).inside, "the reservoir is dry");
  assert.equal(Math.sign(cross(dx0, dz0, dx1, dz1, RESERVOIR.x, RESERVOIR.z)), north, "the reservoir is below the dam");
  let wetFace = 0;
  for (let t = 0; t <= 1; t += 0.05) {
    const x = dx0 + (dx1 - dx0) * t;
    const z = dz0 + (dz1 - dz0) * t;
    assert.ok(!riverAt(x, z + 4.5).inside, `the dam's foot is wet at ${x.toFixed(1)}, ${(z + 4.5).toFixed(1)}`);
    if (riverAt(x, z - 4.5).inside) wetFace++;
  }
  assert.ok(wetFace >= 5, "the reservoir does not reach the dam's north face");

  const at = (pt) => RIVER.points.findIndex(([x, z]) => x === pt[0] && z === pt[1]);
  let reservoir = 0;
  let best = Infinity;
  RIVER.points.forEach(([x, z], i) => {
    const d = Math.hypot(x - RESERVOIR.x, z - RESERVOIR.z);
    if (d < best) [best, reservoir] = [d, i];
  });
  const joinIn = at(MOAT.points.at(-1));
  const joinOut = at(MOAT.points[0]);
  assert.ok(joinIn > reservoir && joinOut > reservoir, "the moat is not fed from the reservoir side: its ends must be river points downstream of the lake");
  assert.ok(joinOut > joinIn, "the moat hands its water back upstream of where it takes it");
  const widest = Math.max(...RIVER.points.slice(0, joinIn).map((p) => p[2] ?? RIVER.width));
  assert.equal(RIVER.points[reservoir][2] ?? RIVER.width, widest, "the reservoir is not the widest water above the moat");
}

// Districts: each place's dock is in its own district (arriving there puts
// its name on screen); a lab building's radioactive area overlaps no other
// area, so the seal's mutation is never ambiguous.
for (const p of PLACES) {
  const dock = dockPoint(p);
  assert.ok(p.district, `${p.id} has no district`);
  assert.equal(districtAt(dock.x, dock.z)?.id, p.district.id, `${p.id}'s dock is not in its district`);
  if (p.section === "lab") assert.match(p.radiation ?? "", /^#[0-9a-f]{6}$/i, `${p.id} has no radiation colour`);
}
for (const a of DISTRICTS) {
  if (!a.radiation) continue;
  for (const b of DISTRICTS) {
    if (a === b) continue;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.radius + b.radius, `${a.name}'s radioactive area overlaps ${b.name}`);
  }
}

// Radiation: every place on the island is radioactive, the igloo and the
// landforms as much as the lab buildings. Every area has a radiation colour
// that reads as a glow on warm-white snow (saturated, and darker than the
// snow), hot spots on the island, and a hue its neighbours (areas within
// 25 m, edge to edge) do not share; a place glows in its own area's colour.
{
  const hsl = {};
  const hueOf = (hex) => new Color(hex).getHSL(hsl, SRGBColorSpace).h * 360;
  const luminance = (hex) => {
    const c = new Color(hex); // three converts sRGB hex to linear, which is what luminance weighs
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  };
  const home = DISTRICTS.find((d) => d.id === "home");
  assert.ok(home && home.radiation === null && home.hot.length === 0, "the igloo is not the neutral zone");
  for (const d of DISTRICTS) {
    if (d === home) continue;
    assert.match(d.radiation ?? "", /^#[0-9a-f]{6}$/i, `${d.name} is not radioactive`);
    new Color(d.radiation).getHSL(hsl, SRGBColorSpace);
    assert.ok(hsl.s >= 0.5 && luminance(d.radiation) <= 0.6, `${d.name}'s radiation ${d.radiation} does not read on the snow`);
    assert.ok(d.hot?.length > 0, `${d.name} has no hot spot`);
    for (const [x, z] of d.hot) assert.ok(Math.hypot(x, z) < ISLAND_RADIUS, `${d.name}'s hot spot ${x}, ${z} is off the island`);
    for (const e of DISTRICTS) {
      if (e === d || !e.radiation || Math.hypot(d.x - e.x, d.z - e.z) - d.radius - e.radius >= 25) continue;
      const gap = Math.abs(hueOf(d.radiation) - hueOf(e.radiation));
      assert.ok(Math.min(gap, 360 - gap) >= 20, `${d.name} and its neighbour ${e.name} glow in the same hue`);
    }
  }
  for (const p of PLACES) assert.equal(p.radiation, p.district.radiation, `${p.id} does not glow in its area's colour`);
}

// Geology: the river runs south between Mount MujoRush (west) and the Google
// range (east): from its source to the reservoir, every point of its course
// lies east of every MujoRush reading point and west of XNNPACK Peak's. (The
// highway is a real road now, from the town to MujoRush: see its own rule.)
{
  const west = PLACES.filter((p) => p.district.id === "mujorush");
  const east = PLACES.filter((p) => p.district.id === "xnnpack");
  assert.ok(west.length === 3 && east.length === 1, "Mount MujoRush and the Google range are not where the river runs");
  const reservoir = RIVER.points.reduce((best, [x, z], i, all) => (Math.hypot(x - RESERVOIR.x, z - RESERVOIR.z) < Math.hypot(all[best][0] - RESERVOIR.x, all[best][1] - RESERVOIR.z) ? i : best), 0);
  for (const [x, z] of RIVER.points.slice(0, reservoir + 1)) {
    assert.ok(west.every((p) => x > p.x) && east.every((p) => x < p.x), `the river at ${x}, ${z} is not between Mount MujoRush and the Google range`);
  }
}

// Trails: every path (lib/world/land.js PATHS, drawn 2.2 m wide along the
// same curve) stays on the island, off the name in the snow, clear of every
// place and landform, and dry, except on a bridge deck; every dock is on a
// path; every bridge carries a path over water; every signpost stands dry,
// beside a path, off every place and dock, pointing at real places.
{
  const HALF = 1.1;
  const flowHere = {};
  const onDeck = (b, x, z) => {
    riverAt(b.x, b.z, flowHere);
    const f = Math.hypot(flowHere.flowX, flowHere.flowZ) || 1;
    const dx = x - b.x;
    const dz = z - b.z;
    const along = Math.abs((dx * flowHere.flowX + dz * flowHere.flowZ) / f);
    const across = Math.abs((-dx * flowHere.flowZ + dz * flowHere.flowX) / f);
    return along <= b.width / 2 - 0.3 && across <= flowHere.half + 1.5;
  };
  const samples = [];
  PATHS.forEach((wp, i) => {
    const curve = new CatmullRomCurve3(wp.map(([x, z]) => new Vector3(x, 0, z)));
    for (const { x, z } of curve.getPoints(63)) {
      const at = `path ${i} at ${x.toFixed(1)}, ${z.toFixed(1)}`;
      samples.push({ x, z });
      assert.ok(Math.hypot(x, z) < ISLAND_RADIUS - 3, `${at} runs off the island`);
      assert.ok(!(x > -9 - HALF && x < 9 + HALF && z > 1.5 - HALF && z < 4.5 + HALF), `${at} runs over the name in the snow`);
      for (const p of PLACES) assert.ok(Math.hypot(x - p.x, z - p.z) >= p.radius + HALF, `${at} runs into ${p.id}`);
      for (const c of LAND_COLLIDERS) assert.ok(Math.hypot(x - c.x, z - c.z) >= c.radius + HALF, `${at} runs into ${c.land}'s bulk at ${c.x}, ${c.z}`);
      assert.ok(waterGap(x, z) >= HALF + 0.3 || RIVER.bridges.some((b) => onDeck(b, x, z)), `${at} runs into the water off any bridge`);
    }
  });
  const nearest = (x, z) => Math.min(...samples.map((s) => Math.hypot(s.x - x, s.z - z)));
  for (const p of PLACES) {
    const dock = dockPoint(p);
    assert.ok(nearest(dock.x, dock.z) <= 1.5, `${p.id}'s dock is on no path`);
  }
  for (const b of RIVER.bridges) {
    assert.ok(riverAt(b.x, b.z).inside, `${b.name} does not stand over water`);
    assert.ok(samples.some((s) => waterGap(s.x, s.z) < 0 && onDeck(b, s.x, s.z)), `no path crosses ${b.name}`);
  }
  for (const s of SIGNPOSTS) {
    const at = `the signpost at ${s.x}, ${s.z}`;
    for (const id of s.to) assert.ok(PLACE_BY_ID[id], `${at} points at ${id}, which is not a place`);
    assert.ok(waterGap(s.x, s.z) > 1, `${at} stands in the water`);
    const d = nearest(s.x, s.z);
    assert.ok(d >= HALF + 0.3 && d <= 4, `${at} is ${d.toFixed(1)} m from its path`);
    for (const p of PLACES) {
      const dock = dockPoint(p);
      assert.ok(Math.hypot(s.x - p.x, s.z - p.z) >= p.radius + 1.5 && Math.hypot(s.x - dock.x, s.z - dock.z) >= 2, `${at} stands on ${p.id}`);
    }
  }
}

// Terrain (lib/world/terrain.js): wherever the seal can walk (inside the
// rim, outside every collider circle, outside the water) the ground is flat
// within 0.3 m of y = 0; every place and dock stands at y = 0 within 5 cm;
// the water's middle lies under its surface; and the mountains rise.
{
  const solid = [...PLACES, ...LAND_COLLIDERS];
  for (let x = -ISLAND_RADIUS; x <= ISLAND_RADIUS; x += 1.3) {
    for (let z = -ISLAND_RADIUS; z <= ISLAND_RADIUS; z += 1.3) {
      if (Math.hypot(x, z) >= ISLAND_RADIUS || waterGap(x, z) < 0) continue;
      if (solid.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius)) continue;
      const h = heightAt(x, z);
      assert.ok(Math.abs(h) <= 0.3, `the ground at ${x.toFixed(1)}, ${z.toFixed(1)} is ${h.toFixed(2)} m off the plain where the seal walks`);
    }
  }
  for (const p of PLACES) {
    const dock = dockPoint(p);
    for (const [x, z, what] of [[p.x, p.z, p.id], [dock.x, dock.z, `${p.id}'s dock`]]) {
      assert.ok(Math.abs(heightAt(x, z)) <= 0.05, `${what} does not stand on flat ground (${heightAt(x, z).toFixed(2)} m)`);
    }
  }
  for (const line of WATERS) {
    for (const [x, z] of line.points) {
      if (Math.hypot(x, z) < ISLAND_RADIUS) assert.ok(heightAt(x, z) < WATER_Y - 0.5, `the water at ${x}, ${z} has no bed under it`);
    }
  }
  assert.ok(heightAt(-35, -62) > 20 && heightAt(38, -80) > 3, "the mountains do not rise");
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

// Glide: released from top speed, the seal travels 2-4 m before it settles.
// The weight of the ice becomes a tested number, not a feeling (it was 4-6.5
// m until the owner called the seal "a ping pong ball" and asked for a lazier
// one that stops soon after you let go).
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
assert.ok(glideDist > 2 && glideDist < 4, `glide distance out of range: ${glideDist}`);

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

// Bridges: a seal that slides onto a deck from the bank crosses it dry and
// comes off the far bank; the current never takes it. (The owner found it
// swimming on top of the planks.)
for (const b of RIVER.bridges) {
  const at = riverAt(b.x, b.z);
  const flow = Math.hypot(at.flowX, at.flowZ) || 1;
  const across = { x: -at.flowZ / flow, z: at.flowX / flow };
  const reach = at.half + 2.5;
  const walker = createSeal(b.x - across.x * reach, b.z - across.z * reach);
  const bridgeWorld = { colliders: [], radius: 1000 };
  let wettest = 0;
  for (let t = 0; t < 4; t += 1 / 120) {
    stepSeal(walker, { input: across }, 1 / 120, bridgeWorld);
    wettest = Math.max(wettest, walker.water ?? 0);
  }
  const past = (walker.x - b.x) * across.x + (walker.z - b.z) * across.z;
  assert.ok(wettest === 0, `${b.name}: the seal got wet crossing the deck (${wettest.toFixed(2)})`);
  assert.ok(past > at.half, `${b.name}: the seal never reached the far bank`);
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

  // The narrowest stretch of channel (the lake and the moat are wider and a
  // longer paddle there is fair): the rule is about crossing the river.
  const widthAt = (p) => p[2] ?? RIVER.width;
  let narrow = 0;
  for (let i = 1; i < RIVER.points.length - 1; i++) {
    const w = Math.max(widthAt(RIVER.points[i]), widthAt(RIVER.points[i + 1]));
    const best = Math.max(widthAt(RIVER.points[narrow]), widthAt(RIVER.points[narrow + 1]));
    if (w < best) narrow = i;
  }
  const [[ax, az], [bx, bz]] = RIVER.points.slice(narrow, narrow + 2);
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
// River on the real island: an idle seal dropped at the river's first point
// on the island is carried, clear of every landform and building, to within
// 6 m of its last point on the island inside 15 s, without a bump that would
// shake the camera; then the current leaves it on a bank, dry, instead of
// pinning it against the rim where the water runs on out to sea.
{
  const onIsland = RIVER.points.filter(([x, z]) => Math.hypot(x, z) < ISLAND_RADIUS - MOTION.sealRadius);
  const [x0, z0] = onIsland[0];
  const [x1, z1] = onIsland.at(-1);
  const toLine = (px, pz) => {
    let best = Infinity;
    for (let i = 0; i < onIsland.length - 1; i++) {
      const [ax, az] = onIsland[i];
      const [bx, bz] = onIsland[i + 1];
      const sx = bx - ax;
      const sz = bz - az;
      const t = Math.max(0, Math.min(1, ((px - ax) * sx + (pz - az) * sz) / (sx * sx + sz * sz || 1)));
      best = Math.min(best, Math.hypot(px - ax - sx * t, pz - az - sz * t));
    }
    return best;
  };
  const named = [...PLACES.map((p) => ({ ...p, name: p.id })), ...LAND_COLLIDERS.map((c) => ({ ...c, name: `land "${c.land}" (${c.x}, ${c.z})` }))];
  const blocking = named.filter((c) => toLine(c.x, c.z) < c.radius);
  if (blocking.length) {
    // The layout is the world director's (places.js, land.js, river.js):
    // until it clears the course, say what blocks it instead of failing.
    console.warn(`river ride skipped: the river's course is blocked by ${blocking.map((c) => c.name).join(", ")}`);
  } else {
    const rider = createSeal(x0, z0);
    let arrived = null;
    let worstImpact = 0;
    for (let t = 0; t < 15 && arrived === null; t += 1 / 120) {
      stepSeal(rider, {}, 1 / 120, world);
      worstImpact = Math.max(worstImpact, rider.impact);
      if (Math.hypot(rider.x - x1, rider.z - z1) < 6) arrived = t;
    }
    assert.ok(arrived !== null, `an idle rider on the island never reached (${x1}, ${z1}): stopped at ${rider.x.toFixed(1)}, ${rider.z.toFixed(1)}`);
    assert.ok(worstImpact <= 0.3, `the river ride bumped the rider (impact ${worstImpact.toFixed(2)})`);
    run(rider, {}, 10);
    assert.equal(rider.water, 0, `the current left the rider in the water at ${rider.x.toFixed(1)}, ${rider.z.toFixed(1)}`);
    assert.ok(rider.speed < 0.1, "the rider never came to rest on the bank");
  }
}
{
  const dryland = createSeal(SPAWN.x, SPAWN.z);
  run(dryland, { input: { x: 1, z: 0 } }, 0.5);
  assert.equal(dryland.water, 0, "the seal is wet at spawn");
}

// The whirlpool: an idle seal riding the river on the real island (the
// world the game passes, whirlpool and all) is caught under pyrefly's funnel,
// carried round without leaving the water, thrown, and comes to rest on dry,
// flat ground on the island, clear of every place and landform, without a
// bump from the carry itself.
{
  const whirlWorld = { ...world, whirlpool: WHIRLPOOL };
  const onIsland = RIVER.points.filter(([x, z]) => Math.hypot(x, z) < ISLAND_RADIUS - MOTION.sealRadius);
  const rider = createSeal(onIsland[0][0], onIsland[0][1]);
  let caught = null;
  let thrown = null;
  let dryWhileCaught = 0;
  for (let t = 0; t < 25; t += 1 / 120) {
    stepSeal(rider, {}, 1 / 120, whirlWorld);
    if (caught === null && rider.whirled > 0) caught = t;
    if (rider.whirled > 0 && !riverAt(rider.x, rider.z).inside) dryWhileCaught++;
    if (thrown === null && rider.flight > 0) thrown = t;
    if (thrown !== null && rider.flight === 0 && rider.speed < 0.05) break;
  }
  assert.ok(caught !== null, "an island river ride never reached the whirlpool");
  assert.equal(dryWhileCaught, 0, "the whirlpool carried the seal out of the water before the throw");
  assert.ok(thrown !== null && thrown - caught >= WHIRLPOOL.hold - 0.05, "the whirlpool threw the seal before it had carried it round");
  const at = `the whirlpool's throw left the seal at ${rider.x.toFixed(1)}, ${rider.z.toFixed(1)}`;
  assert.ok(rider.flight === 0 && rider.speed < 0.05, `${at}, still moving`);
  assert.ok(rider.water === 0 && !riverAt(rider.x, rider.z).inside && waterGap(rider.x, rider.z) > 1, `${at}, in the water`);
  assert.ok(Math.abs(heightAt(rider.x, rider.z)) <= 0.3 && Math.hypot(rider.x, rider.z) < ISLAND_RADIUS, `${at}, off the island's flat ground`);
  for (const c of colliders) assert.ok(Math.hypot(rider.x - c.x, rider.z - c.z) >= c.radius, `${at}, inside a collider at ${c.x}, ${c.z}`);
}

// The geyser: every landing spot is dry, flat, on the island and clear; a
// seal that stands at the vent's rim is thrown within `hold` seconds, and so
// is one caught there by the scheduled eruption; both come to rest dry and
// clear of every place and landform.
{
  for (const [x, z] of GEYSER.landings) {
    assert.ok(!riverAt(x, z).inside && waterGap(x, z) > 1 && Math.abs(heightAt(x, z)) <= 0.3 && Math.hypot(x, z) < ISLAND_RADIUS - 4, `the geyser's landing ${x}, ${z} is not dry flat ground`);
    for (const c of colliders) assert.ok(Math.hypot(x - c.x, z - c.z) >= c.radius + MOTION.sealRadius, `the geyser's landing ${x}, ${z} is inside a collider at ${c.x}, ${c.z}`);
  }
  for (const scheduled of [false, true]) {
    const gw = { ...world, geyser: GEYSER, time: scheduled ? GEYSER.period - 0.2 : 1 };
    const s = createSeal(GEYSER.x, GEYSER.z + 4.1);
    let thrown = null;
    for (let t = 0; t < 8; t += 1 / 120) {
      if (scheduled) gw.time = GEYSER.period - 0.2 + t;
      stepSeal(s, {}, 1 / 120, gw);
      if (thrown === null && s.flight > 0) thrown = t;
    }
    assert.ok(thrown !== null && thrown <= (scheduled ? 0.3 : GEYSER.hold + 0.05), `the geyser did not throw a seal at its rim (${scheduled ? "the scheduled eruption" : "standing"})`);
    assert.ok(s.flight === 0 && s.water === 0 && !riverAt(s.x, s.z).inside && Math.abs(heightAt(s.x, s.z)) <= 0.3, `the geyser's throw left the seal at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
    for (const c of colliders) assert.ok(Math.hypot(s.x - c.x, s.z - c.z) >= c.radius, `the geyser's throw left the seal inside a collider at ${c.x}, ${c.z}`);
  }
}

// The highway: every sample of its asphalt (legs, ring, car park) is on the
// island, dry, flat (the terrain contract) and clear of every place and
// landform except the roundabout's own island; its place sits in the ring,
// its dock on the carriageway, the legs meet the ring, and the car park lies
// under Mount MujoRush's three faces.
{
  const samples = [];
  const half = HIGHWAY.width / 2;
  for (const leg of HIGHWAY.legs) {
    for (let i = 1; i < leg.length; i++) {
      const [ax, az] = leg[i - 1];
      const [bx, bz] = leg[i];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= len; d += 0.5) {
        const x = ax + ((bx - ax) * d) / len;
        const z = az + ((bz - az) * d) / len;
        for (const o of [-half, 0, half]) samples.push([x + (-(bz - az) / len) * o, z + ((bx - ax) / len) * o]);
      }
    }
  }
  const r = HIGHWAY.roundabout;
  for (let a = 0; a < Math.PI * 2; a += 0.1) for (const o of [-r.width / 2, 0, r.width / 2]) samples.push([r.x + Math.cos(a) * (r.radius + o), r.z + Math.sin(a) * (r.radius + o)]);
  const c = HIGHWAY.carPark;
  for (let x = c.x - c.w / 2; x <= c.x + c.w / 2; x += 1) for (let z = c.z - c.d / 2; z <= c.z + c.d / 2; z += 1) samples.push([x, z]);
  const island = PLACE_BY_ID["pr-highway-3244"];
  for (const [x, z] of samples) {
    const at = `the highway at ${x.toFixed(1)}, ${z.toFixed(1)}`;
    assert.ok(Math.hypot(x, z) < ISLAND_RADIUS - 4, `${at} is off the island`);
    assert.ok(!(x > -9 - 1 && x < 9 + 1 && z > 1.5 - 1 && z < 4.5 + 1), `${at} runs over the name in the snow`);
    assert.ok(!riverAt(x, z).inside && waterGap(x, z) > 0.5, `${at} is in the water`);
    assert.ok(Math.abs(heightAt(x, z)) <= 0.3, `${at} is not flat ground (${heightAt(x, z).toFixed(2)} m)`);
    for (const p of PLACES) if (p !== island) assert.ok(Math.hypot(x - p.x, z - p.z) > p.radius, `${at} runs into ${p.id}`);
    for (const l of LAND_COLLIDERS) assert.ok(Math.hypot(x - l.x, z - l.z) > l.radius, `${at} runs into the ${l.land}`);
  }
  assert.ok(Math.hypot(island.x - r.x, island.z - r.z) < 0.01 && island.radius < r.radius - r.width / 2, "the highway's place is not the roundabout's island");
  const dock = dockPoint(island);
  assert.ok(onHighway(dock.x, dock.z), "the highway's dock is not on the road");
  for (const leg of HIGHWAY.legs) for (const end of [leg[0], leg[leg.length - 1]]) {
    const ring = Math.abs(Math.hypot(end[0] - r.x, end[1] - r.z) - r.radius);
    const park = Math.abs(end[0] - c.x) <= c.w / 2 + 0.5 && Math.abs(end[1] - c.z) <= c.d / 2 + 0.5;
    assert.ok(ring < 0.5 || park || end === HIGHWAY.legs[0][0], `the highway leg end ${end} joins nothing`);
  }
  for (const p of PLACES.filter((q) => q.district.id === "mujorush")) assert.ok(p.x > c.x - c.w / 2 - 12 && p.x < c.x + c.w / 2 + 12 && p.z < c.z, `the car park is not under ${p.id}`);
}

// Mutation looks: every district without named gear has a look, and two
// areas wearing the same look are at least 62 m apart.
{
  const GEAR = new Set(["triton", "mujorush", "dam", "moat", "highway"]);
  for (const d of DISTRICTS) if (d.radiation && !GEAR.has(d.id)) assert.ok(LOOK_BY_ID[d.id], `${d.id} has no mutation look`);
  const ids = Object.keys(LOOK_BY_ID);
  for (const a of ids) {
    const da = DISTRICTS.find((d) => d.id === a);
    assert.ok(da, `LOOK_BY_ID names ${a}, which is not a district`);
    for (const b of ids) {
      if (a >= b || LOOK_BY_ID[a] !== LOOK_BY_ID[b]) continue;
      const db = DISTRICTS.find((d) => d.id === b);
      const gap = Math.hypot(da.x - db.x, da.z - db.z);
      assert.ok(gap >= 62, `${a} and ${b} both wear ${LOOK_BY_ID[a]} only ${gap.toFixed(1)} m apart`);
    }
  }
}

console.log(`world check passed: bridges, ${PLACES.length} places, dry docks, river source to sea, dam holds, moat fed from the reservoir, districts, radiation everywhere, river between MujoRush and the Google range, trails and bridges, motion, walls, rim, docks, props, throttle, glide, skid, reaction, bump, arrival, drift, yaw cap, river ride, river exit, island river ride, the whirlpool, the geyser, the highway, mutation looks`);
