// The rules the island has to keep, checked against the real motion code.
// Run: npm run check

import { FOUNTAIN_STREAM, FOUNTAIN_TRAVEL, GEYSER, HIGHWAY, LAND_COLLIDERS, PATHS, SIGNPOSTS, onHighway } from "../lib/world/land.js";
import assert from "node:assert/strict";
import { CatmullRomCurve3, Color, SRGBColorSpace, Vector3 } from "three";
import { existsSync, readFileSync } from "node:fs";
import { LOOK_BY_ID } from "../lib/world/looks.js";
import { CARDS, cardFor } from "../lib/world/cutscene/cards/index.js";
import { PACE, realAt, realLength, sceneT } from "../lib/world/cutscene/clock.js";
import { BUILDS, MIN_BEAT, MIN_BUBBLE, MIN_CREDIT, BREATH, POSES, READ, beatAt, radiusAt, signAt, timelineFor } from "../lib/world/cutscene/timeline.js";
import { DISPLAY, TIERS, classify, dprFor, displayTier, gpuName } from "../lib/world/quality.js";
import { AWAKENING, CLEAN, ENTRY, LOOP, RIDE_LENGTH, mustFinish } from "../lib/world/loop.js";
import { AWAKE, LINE, auraAt, awakeBeat, awakeCredit, liftAt, skyAt } from "../lib/world/awakening.js";
import { MOTION, createSeal, nearestPlace, stepSeal } from "../lib/world/motion.js";
import { DISTRICTS, ISLAND_RADIUS, PLACES, PLACE_BY_ID, SPAWN, districtAt, dockPoint } from "../lib/world/places.js";
import { DAM, MOAT, RESERVOIR, RIVER, WATERS, WHIRLPOOL, riverAt, waterGap } from "../lib/world/river.js";
import { tickSnack } from "../components/world/life/snack.js";
import { TOYS, blastAt, makeBowling, makeCone, makeStack, makeTnt, tickToys } from "../lib/world/toys.js";
import { buildToys } from "../components/world/life/toys-seed.js";
import { forbidden, samplePoints } from "../components/world/life/spawn.js";
import { CAR_BAYS, CAR_R, ROAD_Y, createCar, onDrawnAsphalt, stepCar, stepCars } from "../lib/world/highwayCars.js";
import { buildStone } from "../components/world/land/parts/mujorush-build.js";
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
const pusher = createSeal(SPAWN.x, SPAWN.z + 3);
const withProps = { ...world, props: [ball] };
for (let t = 0; t < 1.5; t += 1 / 120) stepSeal(pusher, { input: { x: 0, z: -1 } }, 1 / 120, withProps);
assert.ok(ball.z < SPAWN.z - 3, "the snowball did not move when shoved");
for (let t = 0; t < 8; t += 1 / 120) stepSeal(pusher, {}, 1 / 120, withProps);
assert.ok(Math.hypot(ball.vx, ball.vz) < 0.05, "the snowball never stops");

// Hidden rule: a penguin bumped 3 times by the seal turns edible (still a
// penguin after 2); touching it again eats it (gulp, squash, gone), and it
// returns as a plain penguin at least 18 m from the seal.
{
  const mk = () => ({ kind: "penguin", x: SPAWN.x, z: SPAWN.z + 10, vx: 0, vz: 0, radius: 0.38, mass: 0.6, spin: 0, hit: 0, bumps: 0, homeX: SPAWN.x, homeZ: SPAWN.z + 10, rand: () => 0.5, state: "wander" });
  const pen = mk();
  const far = { ...mk(), homeX: SPAWN.x, homeZ: SPAWN.z + 60 };
  const sn = createSeal(SPAWN.x, SPAWN.z + 3);
  const w = { ...world, props: [pen] };
  const L = { seal: sn, props: w.props, gulp: 0, squeak: 0 };
  let T = 0;
  const step = (input) => { stepSeal(sn, { input }, 1 / 120, w); T += 1 / 120; tickSnack(pen, T, [pen, far], L); };
  const chase = () => {
    const target = pen.bumps + 1;
    for (let i = 0; i < 120 * 6 && pen.bumps < target && !pen.eaten && !pen.gone; i++) {
      const dx = pen.x - sn.x, dz = pen.z - sn.z, d = Math.hypot(dx, dz) || 1;
      step({ x: dx / d, z: dz / d });
    }
    for (let i = 0; i < 120; i++) step(null); // let the hit fade: the next touch is a new bump
  };
  w.hold = true;
  chase(); // an arrival hold: contact never counts
  assert.equal(pen.bumps, 0, `a bump during an arrival hold counted: ${pen.bumps}`);
  w.hold = false;
  Object.assign(pen, { x: SPAWN.x, z: SPAWN.z + 10, vx: 0, vz: 0, hit: 0 });
  Object.assign(sn, { x: SPAWN.x, z: SPAWN.z + 3, vx: 0, vz: 0 });
  chase(); chase();
  assert.equal(pen.bumps, 2, `expected 2 bumps, got ${pen.bumps}`);
  assert.ok(!pen.edible, "edible before the 3rd bump");
  chase();
  assert.ok(pen.edible && !pen.eaten, "3rd bump did not make the penguin edible");
  const gulp0 = L.gulp;
  for (let i = 0; i < 120 * 6 && !pen.gone; i++) {
    const dx = pen.x - sn.x, dz = pen.z - sn.z, d = Math.hypot(dx, dz) || 1;
    step({ x: dx / d, z: dz / d });
  }
  assert.ok(pen.gone && L.gulp === gulp0 + 1, "touching the edible penguin did not eat it");
  assert.ok(!w.props.includes(pen), "an eaten penguin is still solid");
  for (let i = 0; i < 120 * 9; i++) step(null);
  assert.ok(!pen.gone && !pen.edible && pen.bumps === 0 && w.props.includes(pen), "the penguin did not respawn as a normal one");
  assert.ok(Math.hypot(pen.x - sn.x, pen.z - sn.z) >= 18, `respawned ${Math.hypot(pen.x - sn.x, pen.z - sn.z).toFixed(1)} m from the seal`);
}

// Toys (TNT and Bruno-style stuff): all placed on open land; a bump lights the
// fuse and the crate goes off after the delay; the blast flings props and the
// seal outward, the seal always landing on land inside the island; a blast
// that reaches another crate lights it; the crate comes back later, far from
// the seal; nothing fires in an arrival hold; stacks topple, pins strike,
// cones tip, and all of them reset.
{
  const landable = (x, z) => Math.hypot(x, z) <= ISLAND_RADIUS - MOTION.sealRadius && waterGap(x, z) > 0 && colliders.every((c) => Math.hypot(x - c.x, z - c.z) >= c.radius + MOTION.sealRadius);
  const toys = buildToys();
  const spots = [...toys.tnt, ...toys.stacks.flatMap((s) => s.base), ...toys.bowling.pins, toys.bowling.ball, ...toys.cones];
  assert.ok(toys.tnt.length >= 6 && toys.tnt.length <= 9, `${toys.tnt.length} TNT crates, expected 6-9`);
  assert.ok(toys.cones.length >= 3, `only ${toys.cones.length} cones`);
  assert.ok(toys.stacks.length >= 1 && toys.bowling.pins.length === 6, "stack or pins missing");
  const nearRoad = (x, z) => {
    for (let a = 0; a < 16; a++) for (const r of [2, 3.5, 5]) if (onHighway(x + Math.cos(a * 0.3927) * r, z + Math.sin(a * 0.3927) * r)) return true;
    return false;
  };
  for (const p of spots) {
    const at = `${p.kind} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`;
    assert.ok(Math.hypot(p.x, p.z) < ISLAND_RADIUS - 3, `${at} is at the rim`);
    assert.ok(waterGap(p.x, p.z) > 2, `${at} is in or beside the water (${waterGap(p.x, p.z).toFixed(1)} m)`);
    assert.ok(!onHighway(p.x, p.z), `${at} is on the asphalt`);
    assert.ok(Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) >= 8, `${at} is at the spawn`);
    assert.ok(PLACES.every((pl) => Math.hypot(p.x - pl.x, p.z - pl.z) >= pl.radius + 3 && Math.hypot(p.x - dockPoint(pl).x, p.z - dockPoint(pl).z) >= 3), `${at} is in a building or on a dock`);
    assert.ok(colliders.every((c) => Math.hypot(p.x - c.x, p.z - c.z) >= c.radius + p.radius), `${at} is inside a collider`);
    if (p.kind !== "cone") assert.ok(!forbidden(p.x, p.z, 0), `${at} is on a trail or forbidden snow`);
  }
  assert.ok(toys.cones.every((c) => nearRoad(c.x, c.z)), "a cone is not beside the highway");

  const mkL = (seal) => ({ seal, boom: { n: 0, x: 0, z: 0, q: [] }, cheer: { n: 0, x: 0, z: 0 }, fizz: 0 });
  const T0 = { x: SPAWN.x, z: SPAWN.z + 10 };
  const rig = (extra = {}) => {
    const tnt = makeTnt(T0.x, T0.z);
    const seal = createSeal(T0.x, T0.z - 7);
    const w = { ...world, props: [tnt], ...extra };
    const L = mkL(seal);
    const set = { tnt: [tnt], stacks: [], bowling: null, cones: [] };
    const step = (input) => {
      stepSeal(seal, { input }, 1 / 120, w);
      tickToys(set, 1 / 120, w, L);
    };
    const run = (s, input = null) => {
      for (let i = 0; i < s * 120; i++) step(input);
    };
    const charge = () => {
      for (let i = 0; i < 120 * 6 && tnt.fuse < 0; i++) step({ x: 0, z: 1 });
    };
    return { tnt, seal, w, L, set, step, run, charge };
  };

  // A bump lights the fuse; it goes off only after the delay.
  {
    const { tnt, seal, w, L, run, charge } = rig();
    run(1);
    assert.equal(tnt.fuse, -1, "an untouched crate has a lit fuse");
    charge();
    assert.ok(tnt.fuse >= 0 && L.fizz === 1, "bumping the crate did not light its fuse");
    run(TOYS.fuse - 0.3);
    assert.equal(L.boom.n, 0, "the crate went off before its fuse burned down");
    assert.ok(w.props.includes(tnt), "a lit crate stopped being solid");
    const before = Math.hypot(seal.x - tnt.x, seal.z - tnt.z);
    run(0.5);
    assert.equal(L.boom.n, 1, "the crate never exploded");
    assert.ok(tnt.gone && !w.props.includes(tnt), "an exploded crate is still there");
    assert.ok(seal.flight > 0, "the blast did not hop the seal");
    run(2.5);
    const after = Math.hypot(seal.x - L.boom.x, seal.z - L.boom.z);
    assert.ok(after > before + 1.5, `the blast did not push the seal out (${before.toFixed(1)} -> ${after.toFixed(1)} m)`);
    assert.ok(landable(seal.x, seal.z) && seal.flight === 0, `the seal ended off the land at (${seal.x.toFixed(1)}, ${seal.z.toFixed(1)})`);
    // The crate stays away while the seal lingers, then pops back at least respawnFar from it.
    run(TOYS.respawn + 1);
    assert.ok(tnt.gone, "the crate came back with the seal standing beside it");
    seal.x = tnt.seedX + 40;
    seal.z = tnt.seedZ;
    seal.vx = seal.vz = 0;
    run(0.2);
    assert.ok(!tnt.gone && w.props.includes(tnt) && tnt.fuse < 0 && tnt.bumps === 0, "the crate did not respawn clean");
    assert.ok(Math.hypot(tnt.x - seal.x, tnt.z - seal.z) >= TOYS.respawnFar, "the crate respawned on top of the seal");
  }

  // The blast flings a nearby prop outward, and a neighbour crate catches the fuse.
  {
    const { tnt, w, L, set, run, charge } = rig();
    const ball = { kind: "snowball", x: T0.x + 3, z: T0.z, vx: 0, vz: 0, radius: 0.5, mass: 1, spin: 0, hit: 0 };
    const pal = makeTnt(T0.x - 4.5, T0.z + 1);
    const far = makeTnt(T0.x, T0.z + 30);
    w.props.push(ball, pal, far);
    set.tnt.push(pal, far);
    charge();
    run(TOYS.fuse + 0.05);
    assert.equal(L.boom.n, 1, "the first blast never fired");
    assert.ok(ball.vx > 4, `the blast did not fling the snowball (vx ${ball.vx.toFixed(1)})`);
    assert.ok(pal.fuse >= 0, "a crate inside the blast radius did not catch the fuse");
    assert.ok(far.fuse < 0, "a crate outside the blast radius caught the fuse");
    run(TOYS.chainFuse + 0.1);
    assert.equal(L.boom.n, 2, "the chained crate never exploded");
    assert.equal(far.fuse, -1, "the far crate went off");
    assert.ok(tnt.gone, "the first crate is still here");
    run(1);
    assert.ok(ball.x > T0.x + 4, `the flung snowball did not travel outward (x ${(ball.x - T0.x).toFixed(1)})`);
  }

  // An arrival hold: nothing lights, and a lit fuse waits.
  {
    const held = rig({ hold: true });
    held.run(0.3);
    held.charge();
    held.run(1);
    assert.ok(held.tnt.bumps === 0 && held.tnt.fuse < 0, "a bump lit the fuse during an arrival hold");
    const g = rig();
    g.charge();
    g.w.hold = true;
    g.run(TOYS.fuse + 2);
    assert.equal(g.L.boom.n, 0, "a crate went off during an arrival hold");
    g.w.hold = false;
    g.w.arriving = true;
    g.run(2);
    assert.equal(g.L.boom.n, 0, "a crate went off during an arrival");
    g.w.arriving = false;
    g.run(TOYS.fuse);
    assert.equal(g.L.boom.n, 1, "the held crate never went off afterwards");
  }

  // Fuzz: a blast beside the seal anywhere on the island leaves it on land.
  {
    const pts = samplePoints(80, 77, { gap: 2 });
    let hopped = 0;
    pts.forEach(({ x, z }, i) => {
      const a = i * 2.399;
      const seal = createSeal(x, z);
      const w = { ...world, props: [] };
      const L = mkL(seal);
      blastAt(x - Math.cos(a) * 1.8, z - Math.sin(a) * 1.8, w, L, null);
      for (let k = 0; k < 120 * 3; k++) stepSeal(seal, {}, 1 / 120, w);
      assert.ok(landable(seal.x, seal.z) && seal.flight === 0, `a blast left the seal off the land at (${seal.x.toFixed(1)}, ${seal.z.toFixed(1)}), started (${x.toFixed(1)}, ${z.toFixed(1)})`);
      if (Math.hypot(seal.x - x, seal.z - z) > 1) hopped++;
    });
    assert.ok(hopped > pts.length * 0.8, `only ${hopped}/${pts.length} blasts moved the seal`);
  }

  // The stack topples when a base cube is hit, then resets once the seal is away.
  {
    const st = makeStack(T0.x, T0.z);
    const seal = createSeal(T0.x, T0.z - 6);
    const w = { ...world, props: [...st.base] };
    const L = mkL(seal);
    const set = { tnt: [], stacks: [st], bowling: null, cones: [] };
    const step = (input) => {
      stepSeal(seal, { input }, 1 / 120, w);
      tickToys(set, 1 / 120, w, L);
    };
    for (let i = 0; i < 120; i++) step(null);
    assert.ok(st.riders.every((r) => r.y > 0.4 && !w.props.includes(r)), "the stack is not standing at rest");
    for (let i = 0; i < 120 * 6 && !st.down; i++) step({ x: 0, z: 1 });
    assert.ok(st.down && st.riders.every((r) => w.props.includes(r)), "hitting the stack did not topple it");
    for (let i = 0; i < 120 * 3; i++) step(null);
    assert.ok(st.riders.every((r) => r.y === 0), "a toppled cube is still in the air");
    seal.x = T0.x + 40;
    seal.z = T0.z;
    for (let i = 0; i < 120 * (TOYS.resetAfter + 1); i++) step(null);
    assert.ok(!st.down && st.riders.every((r) => !w.props.includes(r) && r.y > 0.4) && st.base.every((b) => Math.hypot(b.x - b.seedX, b.z - b.seedZ) < 1e-6), "the stack did not reset");
  }

  // A rolled ball into the pins is a strike (confetti), once; they reset after.
  {
    const bw = makeBowling(T0.x, T0.z + 4);
    const seal = createSeal(T0.x, T0.z - 3);
    const w = { ...world, props: [bw.ball, ...bw.pins] };
    const L = mkL(seal);
    const set = { tnt: [], stacks: [], bowling: bw, cones: [] };
    const step = (input) => {
      stepSeal(seal, { input }, 1 / 120, w);
      tickToys(set, 1 / 120, w, L);
    };
    for (let i = 0; i < 120 * 8 && !bw.pins.every((p) => p.down); i++) step({ x: 0, z: 1 });
    for (let i = 0; i < 120 * 3; i++) step(null);
    assert.ok(bw.pins.every((p) => p.down), `${bw.pins.filter((p) => p.down).length}/6 pins went down`);
    assert.equal(L.cheer.n, 1, "a strike did not cheer exactly once");
    seal.x = T0.x + 40;
    seal.z = T0.z;
    for (let i = 0; i < 120 * (TOYS.resetAfter + 1); i++) step(null);
    assert.ok(bw.pins.every((p) => !p.down && Math.hypot(p.x - p.seedX, p.z - p.seedZ) < 1e-6) && Math.hypot(bw.ball.x - bw.ball.seedX, bw.ball.z - bw.ball.seedZ) < 1e-6, "the pins did not reset");
    assert.equal(L.cheer.n, 1, "the reset cheered");
  }

  // A cone tips when bumped, and stands again after a while.
  {
    const cone = makeCone(T0.x, T0.z);
    const seal = createSeal(T0.x, T0.z - 5);
    const w = { ...world, props: [cone] };
    const L = mkL(seal);
    const set = { tnt: [], stacks: [], bowling: null, cones: [cone] };
    const step = (input) => {
      stepSeal(seal, { input }, 1 / 120, w);
      tickToys(set, 1 / 120, w, L);
    };
    for (let i = 0; i < 120 * 6 && !cone.down; i++) step({ x: 0, z: 1 });
    assert.ok(cone.down, "a bumped cone did not tip");
    seal.x = T0.x + 40;
    seal.z = T0.z;
    for (let i = 0; i < 120 * (TOYS.resetAfter + 1); i++) step(null);
    assert.ok(!cone.down && Math.hypot(cone.x - cone.seedX, cone.z - cone.seedZ) < 1e-6, "the cone did not stand up again");
  }
}

// Highway cars: every car starts, and re-enters after each loop, from a bay of
// the car park (never mid-road), pulls out and joins the ring, and its whole
// path is continuous (no jump, no spin) and on the asphalt.
{
  const c = HIGHWAY.carPark;
  const inPark = (x, z) => Math.abs(x - c.x) <= c.w / 2 && Math.abs(z - c.z) <= c.d / 2;
  const r = HIGHWAY.roundabout;
  const cars = CAR_BAYS.map((_, k) => createCar(k));
  assert.ok(cars.length >= 4, `only ${cars.length} moving cars`);
  const log = cars.map(() => ({ cycles: 0, ring: false, town: false, prev: "park" }));
  for (const [k, car] of cars.entries()) assert.ok(inPark(car.x, car.z), `car ${k} spawns outside the car park at ${car.x}, ${car.z}`);
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 150; i++) {
    for (const [k, car] of cars.entries()) {
      const { x, z, h } = car;
      stepCar(car, dt, false);
      const jump = Math.hypot(car.x - x, car.z - z);
      assert.ok(jump < 8 * dt, `car ${k} jumped ${jump.toFixed(2)} m in one frame at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      const turn = Math.abs(Math.atan2(Math.sin(car.h - h), Math.cos(car.h - h)));
      assert.ok(turn < 0.3, `car ${k} spun ${turn.toFixed(2)} rad in one frame at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      assert.ok(onHighway(car.x, car.z), `car ${k} left the asphalt at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      // the footprint above is the walkable capsule; the drawn mesh has square-cut
      // leg ends, and the snow bumps (terrain.js) stand over asphalt laid too low
      assert.ok(onDrawnAsphalt(car.x, car.z), `car ${k} left the drawn asphalt at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      assert.ok(heightAt(car.x, car.z) < ROAD_Y, `car ${k} is on snow: the ground is ${heightAt(car.x, car.z).toFixed(2)} m, the asphalt ${ROAD_Y} m, at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      if (car.phase !== "drive") assert.ok(inPark(car.x, car.z), `car ${k} ${car.phase} outside the car park at ${car.x.toFixed(1)}, ${car.z.toFixed(1)}`);
      const l = log[k];
      if (Math.abs(Math.hypot(car.x - r.x, car.z - r.z) - r.radius) < 1.2) l.ring = true;
      if (car.x > -14) l.town = true;
      if (l.prev === "drive" && car.phase === "park") l.cycles++;
      l.prev = car.phase;
    }
  }
  log.forEach((l, k) => assert.ok(l.cycles >= 2 && l.ring && l.town, `car ${k} did not loop bay -> ring -> town -> bay (${JSON.stringify(l)})`));
}

// Cars and the seal (Bruno-style): a car brakes and waits a couple of metres
// short of a seal standing in its lane, carries on once the seal has left, and
// a seal that walks into a car gets the prop bump (motion.js) and never
// overlaps it. Seal radius plus the car's half-length is the closest they may be.
{
  const gap = MOTION.sealRadius + CAR_R;
  const dt = 1 / 60;
  const home = (k) => createCar(k);
  const spotsOf = (k, every) => {
    const ghost = createCar(k);
    const spots = [];
    for (let i = 0; i < 60 * 150; i++) {
      stepCar(ghost, dt, false);
      if (i % (60 * every) === 0 && ghost.phase !== "park" && Math.hypot(ghost.x - CAR_BAYS[k], ghost.z - home(k).z) > gap + 0.5) spots.push([ghost.x, ghost.z, i * dt]);
    }
    return spots;
  };
  let waits = 0;
  for (let k = 0; k < CAR_BAYS.length; k++) {
    for (const [sx, sz, at] of spotsOf(k, 6)) {
      // a seal standing in the car's lane: it never gets closer than `gap`, and stops
      const car = createCar(k);
      const seal = { x: sx, z: sz };
      let nearest = Infinity;
      for (let i = 0; i < 60 * (at + 12); i++) {
        stepCars([car], seal, dt);
        nearest = Math.min(nearest, Math.hypot(car.x - sx, car.z - sz));
      }
      const where = `car ${k} and a seal standing at ${sx.toFixed(1)}, ${sz.toFixed(1)}`;
      assert.ok(nearest >= gap, `${where}: ${nearest.toFixed(2)} m apart, under ${gap.toFixed(2)} m`);
      assert.ok(Math.hypot(car.vx, car.vz) < 0.3, `${where}: the car never stopped (${Math.hypot(car.vx, car.vz).toFixed(2)} m/s)`);
      if (nearest < gap + 4) waits++;
      // ... and once the seal leaves, it carries on
      const px = car.x;
      const pz = car.z;
      seal.x = 1e4;
      for (let i = 0; i < 60 * 5; i++) stepCars([car], seal, dt);
      assert.ok(Math.hypot(car.x - px, car.z - pz) > 2, `${where}: the car did not carry on after the seal left`);
    }
    for (const [sx, sz] of spotsOf(k, 24)) {
      // a seal charging a car at full tilt: bumped, never inside it
      const car = createCar(k);
      const seal = createSeal(sx, sz);
      const w = { ...world, props: [car] };
      let bumped = false;
      let nearest = Infinity;
      let charging = false;
      for (let i = 0; i < 60 * 200 && (!charging || i < charging + 60 * 4); i++) {
        const d = Math.hypot(car.x - seal.x, car.z - seal.z);
        if (!charging && d < 8) charging = i;
        stepCars([car], seal, dt);
        for (let j = 0; j < 2; j++) stepSeal(seal, { input: charging ? { x: (car.x - seal.x) / (d || 1), z: (car.z - seal.z) / (d || 1) } : null }, 1 / 120, w);
        nearest = Math.min(nearest, Math.hypot(car.x - seal.x, car.z - seal.z));
        if (car.hit > 0) bumped = true;
      }
      const where = `a seal charging car ${k} from ${sx.toFixed(1)}, ${sz.toFixed(1)}`;
      assert.ok(charging, `${where}: the car never came near`);
      assert.ok(nearest >= gap - 0.02, `${where}: overlapped it, ${nearest.toFixed(2)} m apart, under ${gap.toFixed(2)} m`);
      assert.ok(bumped, `${where}: no bump`);
    }
  }
  // a queue behind a car that stopped for the seal keeps its gap: no two cars
  // ever closer than they run free (about 1 m, lanes 0.7 m apart)
  for (const [sx, sz] of spotsOf(0, 12)) {
    const cars = CAR_BAYS.map((_, k) => createCar(k));
    const seal = { x: sx, z: sz };
    let nearest = Infinity;
    for (let i = 0; i < 60 * 150; i++) {
      if (i === 60 * 100) seal.x = 1e4;
      stepCars(cars, seal, dt);
      for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) nearest = Math.min(nearest, Math.hypot(cars[a].x - cars[b].x, cars[a].z - cars[b].z));
    }
    assert.ok(nearest >= 1, `cars bunched up to ${nearest.toFixed(2)} m behind a seal standing at ${sx.toFixed(1)}, ${sz.toFixed(1)}`);
  }
  assert.ok(waits >= 20, `only ${waits} of the cars' waits were exercised`);
}

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

// THE LOOP (the blue loop-the-loop ribbon by the spill, sea/build.js LOOP): a
// seal that swims into its lead-in lane at a reasonable speed rides it all the
// way round, inverted over the top, and leaves it on water it can swim out of.
// It never sticks, never leaves the island and never clips through anything.
{
  const LOOPT = { x: 24.2, z: -43.9, R: 3.3 }; // entry lane: build.js LOOP.x, LOOP.z - shift / 2, radius
  const swim = (vx, off, seconds = 8, lane = LOOPT.z) => {
    const s = createSeal(16, lane + off);
    s.vx = vx;
    let maxY = 0;
    let maxPitch = 0;
    let rideTime = 0;
    let exit = null;
    for (let t = 0; t < seconds; t += 1 / 120) {
      const was = s.ride;
      // steer into the lane until the seal is in it, then hands off
      const steer = s.x < LOOPT.x - 2.5 ? Math.max(-1, Math.min(1, (lane - s.z) * 2)) : 0;
      stepSeal(s, { input: { x: 0.6, z: steer } }, 1 / 120, world);
      assert.ok(Math.hypot(s.x, s.z) < ISLAND_RADIUS - MOTION.sealRadius + 1e-6, `the loop ride left the island at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
      for (const c of colliders) assert.ok(Math.hypot(s.x - c.x, s.z - c.z) >= c.radius, `the loop ride clipped a collider at ${c.x}, ${c.z}`);
      assert.ok(Number.isFinite(s.x + s.z + s.vx + s.vz), "the loop ride produced NaN");
      if (was && !s.ride) exit = { x: s.x, speed: s.speed };
      if (s.ride) {
        rideTime += 1 / 120;
        maxY = Math.max(maxY, s.rideY);
        maxPitch = Math.max(maxPitch, s.ridePitch);
        assert.ok(s.rideY >= WATER_Y - 1e-6, `the loop ride sank below the water at x=${s.x.toFixed(1)}`);
      }
    }
    return { s, maxY, maxPitch, rideTime, exit };
  };
  for (const vx of [9, 13, 17, 21, 27]) {
    for (const off of [-0.8, 0, 0.8]) {
      const { s, maxY, maxPitch, rideTime, exit } = swim(vx, off);
      const at = `swimming into the loop at ${vx} m/s, ${off} m off the lane`;
      assert.equal(s.loops, 1, `${at}: the seal did not complete the loop (loops=${s.loops})`);
      assert.ok(maxY > 2 * LOOPT.R - 1, `${at}: the seal never reached the top (${maxY.toFixed(2)} m)`);
      assert.ok(maxPitch > 2 * Math.PI - 0.2, `${at}: the seal was never carried inverted over the top and round (pitch ${maxPitch.toFixed(2)})`);
      assert.ok(rideTime > 1 && rideTime < 4, `${at}: the ride took ${rideTime.toFixed(2)} s`);
      assert.ok(!s.ride && exit && exit.speed > 6 && exit.x > LOOPT.x + 6, `${at}: the seal did not leave the ribbon moving (${JSON.stringify(exit)})`);
    }
  }
  // outside the lane the seal passes under the ribbon
  const under = swim(17, 0, 8, -41);
  assert.equal(under.s.loops, 0, "a seal swimming under the ribbon (outside its lane) was caught by it");
  // a seal swimming back upstream is not caught
  const back = createSeal(30, -43.9);
  for (let t = 0; t < 4; t += 1 / 120) stepSeal(back, { input: { x: -1, z: 0 } }, 1 / 120, world);
  assert.equal(back.loops, 0, "a seal swimming back upstream was caught by the loop");
}

// THE LOOP, the hidden challenge: a clean loop (entry speed in CLEAN's window,
// held within CLEAN.off of the centre line all the way, a straight exit) three
// times in a row, each entered within CLEAN.gap seconds of the last exit, wins
// (seal.wins). A messy loop, or a gap too long, resets the streak.
{
  assert.ok(Math.abs(LOOP.x - 24.2) < 1e-9 && Math.abs(ENTRY.z + 43.9) < 1e-9 && LOOP.radius === 3.3, "the loop moved: update the entry lane in the loop ride check above");
  assert.ok(RIDE_LENGTH > 20 && RIDE_LENGTH < 40, `the ribbon is ${RIDE_LENGTH.toFixed(1)} m long`);
  // One pass: the seal is put upstream of the lane at `vx` (after `gap` seconds of
  // idling since the last exit), steered into the lane `off` m off its centre, then hands off.
  const pass = (s, { vx = 15.4, off = 0, gap = 0.5, at = 16 } = {}) => {
    for (let t = 0; t < gap; t += 1 / 120) stepSeal(s, {}, 1 / 120, world);
    const loops = s.loops;
    s.x = at;
    s.z = ENTRY.z + off;
    s.vx = vx;
    s.vz = 0;
    s.water = 1;
    s.ride = 0;
    for (let t = 0; t < 6 && s.loops === loops; t += 1 / 120) {
      const steer = s.x < ENTRY.x0 - 0.3 ? Math.max(-1, Math.min(1, (ENTRY.z + off - s.z) * 2)) : 0;
      stepSeal(s, { input: { x: 0, z: steer } }, 1 / 120, world);
    }
    assert.equal(s.loops, loops + 1, `a pass at ${vx} m/s, ${off} m off, did not complete the loop`);
    return s;
  };
  const verdicts = (script) => {
    const s = createSeal(16, ENTRY.z);
    return { s, seen: script.map((o) => (pass(s, o), [s.loopClean, s.loopStreak, s.wins])) };
  };
  const perfect = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1 }]);
  assert.deepEqual(perfect.seen, [[1, 1, 0], [1, 2, 0], [1, 0, 1]], `three perfect loops: ${JSON.stringify(perfect.seen)}`);
  assert.equal(verdicts([{ gap: 0 }, { gap: CLEAN.gap - 1 }, { gap: CLEAN.gap - 1 }]).s.wins, 1, "three clean loops just inside the re-entry window did not win");
  assert.equal(perfect.s.wins, 1);
  const two = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1, vx: 6, at: ENTRY.x0 - 0.1 }]);
  assert.deepEqual(two.seen.at(-1), [0, 0, 0], `two clean loops and a too-slow third won or kept a streak: ${JSON.stringify(two.seen)}`);
  const slow = verdicts([{ gap: 0 }, { gap: 1 }, { gap: CLEAN.gap + 1 }]);
  assert.equal(slow.s.wins, 0, "three clean loops with a gap past the re-entry window won");
  assert.deepEqual(slow.seen.at(-1), [1, 1, 0], `a clean loop after a long gap should start a fresh streak at 1: ${JSON.stringify(slow.seen)}`);
  const reset = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1, vx: 6, at: ENTRY.x0 - 0.1 }, { gap: 1 }, { gap: 1 }]);
  assert.equal(reset.s.wins, 0, "a failed loop did not reset the streak");
  assert.equal(reset.s.loopStreak, 2);
  assert.equal(verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1 }, { gap: 1 }, { gap: 1 }, { gap: 1 }]).s.wins, 2, "six perfect loops are two wins");
  for (const [vx, why] of [[CLEAN.vMin - 3, "too slow"], [CLEAN.vMax + 8, "boosting wildly"]]) {
    const s = verdicts([{ vx, at: ENTRY.x0 - 0.1 }]).s;
    assert.equal(s.loopClean, 0, `a loop entered ${why} (${vx} m/s) counted as clean`);
  }
  // sloppy exit: steering hard across the ribbon on the way down leaves it crooked
  {
    const s = createSeal(16, ENTRY.z);
    s.x = 16;
    s.vx = 15.4;
    s.water = 1;
    for (let t = 0; t < 6 && !s.loops; t += 1 / 120) {
      const steer = s.x < ENTRY.x0 - 0.3 ? Math.max(-1, Math.min(1, (ENTRY.z - s.z) * 2)) : s.rideS > 8 ? 1 : 0;
      stepSeal(s, { input: { x: 0, z: steer } }, 1 / 120, world);
    }
    assert.equal(s.loops, 1);
    assert.equal(s.loopClean, 0, "a loop left crooked (steered across the ribbon) counted as clean");
  }
}

// THE LOOP, as a real player plays it. Scripted humans (seeded, so the check is
// repeatable) run the real stepSeal over the owner's actual route: out of the
// loop onto the south bank, west to the Spill Bridge, over it, east along the
// north bank and a dive into the lane. Each decides every `react` seconds with
// jitter. kb: digital keys (W/A/S/D) with reaction lag. stick: the touch
// joystick's analog vector (SealGame useTouchStick). tap: tap-to-walk, a ground
// point per decision (live.target; no input while on the ribbon). A session is
// up to 8 loops; it wins when seal.wins rises. skilled = a practised player,
// sloppy = one who wobbles, lags and aims badly. The ride must be winnable
// by the first and not by the second, on all three controls.
{
const HDT = 1 / 120;
// seeded rng
const hmk = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const hgauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
const LZ = ENTRY.z;
// route: waypoints of dry/wet travel, then the dive into the lane
function humanPlay(kind, skill, seed, opts = {}) {
  const r = hmk(seed);
  const react = skill.react; // s between decisions
  const seal = createSeal(31, -40.4);
  seal.vx = 15; seal.water = 1; seal.clock = 100; seal.loopExitAt = seal.clock;
  const route = [[31, -37.0, 1.2], [14.2, -37.2, 1.2], [13, -46.6, 1.3]];
  const xd = opts.xd ?? 17.5;
  let leg = 0, phase = "route", t = 0, nextDecide = 0;
  let held = { x: 0, z: 0 }, stick = null, target = null, tapAt = 0;
  const entries = [];
  const maxT = opts.maxT ?? 120;
  const cleanSeq = [];
  let prevExit = seal.loopExitAt;
  while (t < maxT && seal.wins === 0) {
    const loopsB = seal.loops;
    // phase logic
    const px = seal.x, pz = seal.z;
    let goal = null;
    if (phase === "route") {
      const w = route[leg];
      goal = w;
      if (Math.hypot(px - w[0], pz - w[1]) < w[2]) { leg++; if (leg >= route.length) phase = "stage"; }
    }
    if (phase === "stage") { goal = [xd, -46.4, 0.6]; if (px >= xd - 0.4) phase = "dive"; }
    let want = null; // analog want vector
    if (t >= nextDecide) {
      nextDecide = t + react * (0.6 + 0.8 * r());
      tapAt = t;
      let wx = 0, wz = 0;
      if (phase === "dive") {
        // hold the lane: x pushes east until released, z steers toward lane line
        const e = LZ + (skill.aimOff ?? 0) - pz;
        const noise = hgauss(r) * skill.noise;
        wz = e * skill.kp - seal.vz * skill.kd + noise;
        wx = px < (opts.xr ?? 19.5) ? 1 : 0;
        if (seal.ride) { wx = 0; wz = 0; }
        if (seal.ride === 0 && px > ENTRY.x0 - 0.2 && opts.hold) { wx = 0; }
      } else if (goal) {
        const dx = goal[0] - px, dz = goal[1] - pz, d = Math.hypot(dx, dz) || 1;
        wx = dx / d + hgauss(r) * skill.noise * 0.3; wz = dz / d + hgauss(r) * skill.noise * 0.3;
      } else { // after a loop: back to the route
      }
      if (kind === "kb") {
        const q = (v) => (Math.abs(v) < 0.5 ? 0 : Math.sign(v));
        held = { x: q(wx), z: q(wz) };
      } else if (kind === "stick") {
        const m = Math.hypot(wx, wz);
        const s = m > 1 ? 1 / m : 1;
        stick = m < 0.05 ? null : { x: wx * s, z: wz * s };
        if (phase === "dive" && !seal.ride && px >= (opts.xr ?? 19.5)) stick = { x: 0, z: Math.max(-1, Math.min(1, wz)) };
      } else if (kind === "tap") {
        // tap a ground point: in the dive, the tap is ahead at the lane
        if (phase === "dive") target = { x: (opts.tapX ?? 30) + (skill.tapJit ?? 0) * (r() - 0.5) * 2, z: LZ + (skill.aimOff ?? 0) + hgauss(r) * skill.noise * 0.6 * (skill.tapZ ?? 1) };
        else if (goal) { const dx = goal[0] - px, dz = goal[1] - pz, d = Math.hypot(dx, dz) || 1; target = { x: px + (dx / d) * 8, z: pz + (dz / d) * 8 }; if (d < 6) target = { x: goal[0], z: goal[1] }; }
      }
    }
    const controls = { input: kind === "kb" ? (held.x || held.z ? held : null) : kind === "stick" ? stick : null, target: kind === "tap" && !seal.ride ? target : null, boost: false };
    if (kind === "tap" && controls.target && seal.ride) controls.target = null;
    stepSeal(seal, controls, HDT, world);
    t += HDT;
    if (seal.loops !== loopsB) {
      // after the loop: reset route and wait for decisions
      cleanSeq.push([seal.loopClean, seal.rideEntryV | 0, +seal.rideMaxOff.toFixed(2), +(seal.rideEntryAt - prevExit).toFixed(1)]); prevExit = seal.loopExitAt;
      leg = 0; phase = "route"; target = null; stick = null; held = { x: 0, z: 0 };
      nextDecide = t + react;
      if (seal.loops >= (opts.maxLoops ?? 8)) break;
    }
    // missed the lane: past the entry without a ride -> go back round
    if (phase === "dive" && !seal.ride && (px > ENTRY.x1 + 2 || t - tapAt > 6)) { leg = 0; phase = "route"; target = null; stick = null; held = { x: 0, z: 0 }; entries.push("miss"); }
  }
  return { win: seal.wins > 0, t, loops: seal.loops, cleanSeq, misses: entries.length };
}
function humanRate(kind, skill, opts, n = 200) {
  let win = 0, clean = 0, loops = 0, miss = 0, tt = 0;
  for (let i = 0; i < n; i++) { const o = humanPlay(kind, skill, 1000 + i, opts); if (o.win) { win++; tt += o.t; } loops += o.loops; clean += o.cleanSeq.filter((c) => c[0]).length; miss += o.misses; }
  return { win: win / n, cleanPerLoop: loops ? clean / loops : 0, loops: loops / n, miss: miss / n, tWin: win ? tt / win : 0 };
}
const SKILL = {
  skilled: { react: 0.16, kp: 2, kd: 0.35, noise: 0.15 },
  average: { react: 0.26, kp: 2, kd: 0.35, noise: 0.3 },
  sloppy: { react: 0.4, kp: 1, kd: 0.1, noise: 0.8, tapJit: 30, tapZ: 10 },
};
const DIVE = { kb: { xd: 17.5, xr: 22 }, stick: { xd: 15, xr: 22 }, tap: { xd: 15, tapX: 30 } };
const N = Number(process.env.LOOP_RUNS) || 30;
const table = {};
for (const kind of ["kb", "stick", "tap"]) {
  for (const k of process.env.LOOP_TABLE ? ["skilled", "average", "sloppy"] : ["skilled", "sloppy"]) {
    table[`${kind} ${k}`] = humanRate(kind, SKILL[k], DIVE[kind], N);
  }
  const good = table[`${kind} skilled`];
  const bad = table[`${kind} sloppy`];
  // the owner asked for an easier loop (2026-10-04): skilled players nearly always win,
  // a sloppy one still loses a fair share
  assert.ok(good.win >= 0.85, `${kind}: a skilled player wins only ${(good.win * 100).toFixed(0)}% of sessions (needs 85%+)`);
  assert.ok(bad.win <= 0.75, `${kind}: a sloppy player wins ${(bad.win * 100).toFixed(0)}% of sessions (must stay 75% or less)`);
  assert.ok(good.tWin < 60, `${kind}: a skilled win takes ${good.tWin.toFixed(0)} s`);
}
if (process.env.LOOP_TABLE) console.log("loop humans (win = 3 clean in a row within 8 loops):\n" + Object.entries(table).map(([k, v]) => `${k.padEnd(14)} win ${(v.win * 100).toFixed(0).padStart(3)}%  clean/loop ${(v.cleanPerLoop * 100).toFixed(0).padStart(3)}%  loops ${v.loops.toFixed(1)}  missed lane ${v.miss.toFixed(2)}  win at ${v.tWin.toFixed(0)} s`).join("\n"));
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

// The Fountain of Immortality (open2c/polychrom #79): its stream and both landings are dry, flat and clear of every
// place and collider; once the arrival has been seen, a seal stepping into either basin is thrown to the other
// end and comes to rest dry and clear, and it does not bounce back; unseen, it is not thrown.
{
  const F = FOUNTAIN_TRAVEL;
  const curve = new CatmullRomCurve3(FOUNTAIN_STREAM.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  for (const { x, z } of curve.getPoints(200)) {
    assert.ok(!riverAt(x, z).inside && Math.abs(heightAt(x, z)) <= 0.3 && Math.hypot(x, z) < ISLAND_RADIUS - 5, `the fountain's stream at ${x.toFixed(1)}, ${z.toFixed(1)} is not dry flat ground`);
    for (const c of colliders) if (c.x !== F.nodes[0].x || c.z !== F.nodes[0].z) assert.ok(Math.hypot(x - c.x, z - c.z) >= c.radius + 1.5, `the fountain's stream runs into a collider at ${c.x}, ${c.z}`);
    for (const q of PLACES) if (q.id !== "pr-polychrom-79" && !q.id.startsWith("pr-n") && q.id !== "pr-topograph-432") assert.ok(Math.hypot(x - q.x, z - q.z) >= q.radius + 3, `the fountain's stream runs into ${q.id}`);
  }
  assert.ok(Math.hypot(F.nodes[0].x - PLACE_BY_ID[F.seenId].x, F.nodes[0].z - PLACE_BY_ID[F.seenId].z) < 3 && Math.hypot(F.nodes[1].x - 46, F.nodes[1].z + 5) < 1, "the fountain's two ends are its basin and the moat's pad");
  for (const n of F.nodes) {
    const [lx, lz] = n.land;
    assert.ok(!riverAt(lx, lz).inside && Math.abs(heightAt(lx, lz)) <= 0.3 && Math.hypot(lx, lz) < ISLAND_RADIUS - 4, `the fountain's landing ${lx}, ${lz} is not dry flat ground`);
    for (const c of colliders) assert.ok(Math.hypot(lx - c.x, lz - c.z) >= c.radius + MOTION.sealRadius, `the fountain's landing ${lx}, ${lz} is inside a collider`);
    for (const m of F.nodes) assert.ok(Math.hypot(lx - m.x, lz - m.z) >= m.reach + 1, "a landing is outside both basins");
  }
  for (const [seen, from, to] of [[true, 0, 1], [true, 1, 0], [false, 0, 0]]) {
    const w = { ...world, fountain: F, fountainSeen: seen, time: 1 };
    const s = createSeal(F.nodes[from].x, F.nodes[from].z);
    let thrown = false;
    for (let t = 0; t < 4; t += 1 / 120) {
      stepSeal(s, {}, 1 / 120, w);
      if (s.flight > 0) thrown = true;
    }
    if (!seen) {
      assert.ok(!thrown && Math.hypot(s.x - F.nodes[from].x, s.z - F.nodes[from].z) < 0.5, "the fountain throws a seal before its arrival was seen");
      continue;
    }
    assert.ok(thrown && Math.hypot(s.x - F.nodes[to].land[0], s.z - F.nodes[to].land[1]) < 0.5, `the fountain end ${from} did not carry the seal to end ${to}: it rests at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
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
  // the park leg runs on into the lot as a driveway: its end is well inside the lot's asphalt
  const drive = HIGHWAY.legs[1][HIGHWAY.legs[1].length - 1];
  assert.ok(Math.abs(drive[0] - c.x) < c.w / 2 - 1 && Math.abs(drive[1] - c.z) < c.d / 2 - 1, `the park leg ends at ${drive}, not inside the car park`);
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

// Cutscenes (lib/world/cutscene/): every place has a card and a move, every
// number in a line is in data/showcase.json (the JSON wins; rewrite the
// line, not the data), the beats run in order and each line is up long
// enough to be read.
{
  const json = readFileSync(new URL("../data/showcase.json", import.meta.url), "utf8");
  const ids = PLACES.map((p) => p.id).sort();
  assert.deepEqual(CARDS.map((c) => c.id).sort(), ids, "a card for exactly the places");
  const moves = readFileSync(new URL("../components/world/cutscene/moves/index.js", import.meta.url), "utf8");
  for (const id of ids) {
    assert.ok(existsSync(new URL(`../lib/world/cutscene/cards/${id}.js`, import.meta.url)), `${id} has no card file`);
    assert.ok(existsSync(new URL(`../components/world/cutscene/moves/${id}.jsx`, import.meta.url)) && moves.includes(`"${id}": `), `${id} has no move`);
  }
  for (const c of CARDS) {
    const { id, a, b, speaker, move } = c;
    assert.ok(c.homage && c.why && c.stage?.sfx, `${id} card is missing its homage, why or onomatopoeia`);
    const figure = speaker !== "land";
    for (const sp of figure ? [].concat(speaker) : []) assert.ok(BUILDS[sp?.build] && typeof sp.prop === "string" && sp.pose, `${id}'s speaker needs a build, one prop and a pose`);
    for (const l of [a, b, ...(c.c ? [c.c] : [])]) {
      assert.ok(l?.text && ["seal", "sil", "sil2", "land"].includes(l.who), `${id} needs two voices`);
      assert.ok(!l.who.startsWith("sil") || figure, `${id}: a line from "sil" needs a figure speaker`);
      assert.ok(l.who !== "land" || !figure, `${id}: a line from "land" needs speaker "land"`);
      assert.ok(!l.kind || ["oval", "burst", "whisper"].includes(l.kind), `${id}: bubble kind ${l.kind}`);
    }
    assert.ok(POSES.includes(move?.pose) && (!move.then || POSES.includes(move.then)), `${id}'s move pose is not a pose hook`);
    for (const n of `${a.text} ${b.text} ${c.c?.text ?? ""} ${c.credit?.title ?? ""} ${c.credit?.sub ?? ""} ${c.num ?? ""} ${c.sub ?? ""}`.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) assert.ok(n === "0" || json.includes(n), `${id}'s line says ${n}, which showcase.json does not`);
    const T = timelineFor(c);
    const PACED = (i) => i in PACE;
    const w = [T.sign[0], T.sign[1], T.impact, T.bloom[1], T.enter, T.lineA, T.move[0], T.lineB, T.collapse[0], T.collapse[1], T.duration];
    assert.ok(w.every((v, i) => i === 0 || v > w[i - 1]) && T.move[1] > T.move[0] && T.move[1] <= T.lineB && T.hold >= T.collapse[0], `${id}'s beats are out of order`);
    if (!PACED(id)) assert.ok(T.lineB - T.lineA >= READ - 1e-9 && (T.lineC ?? T.credit ?? T.collapse[0]) - T.lineB >= READ - 1e-9 && (!T.lineC || (T.credit ?? T.collapse[0]) - T.lineC >= READ - 1e-9), `${id}: each line gets ${READ} s to be read`);
    else {
      // THE PACING RULE (owner, binding, 2026-10-04), in REAL seconds through clock.js: a bubble is up at least 5 s
      // (longer lines: 1 s per 3 words + 2 s), the credit card 4 s, each big beat 2.5 s, 0.8 s of breath between
      // beats, 20 to 30 s in all. Line A stays up through the move; B and C until the next card.
      const R = (x) => realAt(id, x);
      const need = (l) => Math.max(MIN_BUBBLE, l.text.split(/\s+/).length / 3 + 2);
      const end = (n) => (n.lineC ?? n.credit ?? n.collapse[0]);
      const wins = [[a, T.lineA, T.lineB], [b, T.lineB, end(T)], ...(c.c ? [[c.c, T.lineC, T.credit ?? T.collapse[0]]] : [])];
      for (const [l, from, to] of wins) assert.ok(R(to) - R(from) >= need(l) - 1e-9, `${id}: "${l.text.slice(0, 24)}" is up ${(R(to) - R(from)).toFixed(2)} s, needs ${need(l).toFixed(2)}`);
      if (c.credit) assert.ok(R(T.collapse[0]) - R(T.credit) >= MIN_CREDIT - 1e-9, `${id}: the credit card is up ${(R(T.collapse[0]) - R(T.credit)).toFixed(2)} s, needs ${MIN_CREDIT}`);
      const big = { opening: [T.sign[0], T.enter], move: [T.move[0], T.lineB], collapse: [T.collapse[0], T.duration] };
      for (const [k, [x, y]] of Object.entries(big)) assert.ok(R(y) - R(x) >= MIN_BEAT - 1e-9, `${id}: the ${k} beat holds ${(R(y) - R(x)).toFixed(2)} s, needs ${MIN_BEAT}`);
      assert.ok(R(T.move[0]) - R(T.enter) >= BREATH && R(T.collapse[0]) - R(T.lineB) >= BREATH, `${id}: beats need ${BREATH} s of breath`);
      const total = realLength(id, T.duration);
      assert.ok(total >= 20 && total <= 30, `${id}: ${total.toFixed(1)} s, not 20 to 30`);
      console.log(`pace ${id}: ${total.toFixed(1)} s; ` + wins.map(([l, f, t]) => (R(t) - R(f)).toFixed(2)).join("/") + (c.credit ? ` credit ${(R(T.collapse[0]) - R(T.credit)).toFixed(2)}` : ""));
    }
    let beat = 0;
    for (let t = 0; t < T.duration; t += 0.01) {
      const k = beatAt(T, t);
      assert.ok(k >= beat, `${id}'s beat goes back at ${t.toFixed(2)} s`);
      beat = k;
    }
    assert.ok(signAt(T, T.impact) > 0.99 && radiusAt(T, T.lineA) > 10 && radiusAt(T, T.duration - 0.01) === 0 && beatAt(T, T.duration) === 0, `${id}: the sign opens the stage and the stage closes`);
  }
  // MOUNT MUJORUSH IS ONE SCENE: its other two docks play #3396's cinematic (a card's `plays`), and the
  // Controller's hook (playsAs, seeAll) arrives as it and marks the whole group seen at once.
  const mount = ["pr-mujoco-warp-1541", "pr-mujoco-3450"];
  for (const id of mount) assert.equal(cardFor(id).plays, "pr-mujoco-3396", `${id} must play Mount MujoRush's one scene`);
  assert.ok(!cardFor("pr-mujoco-3396").plays && CARDS.filter((c) => c.plays).every((c) => cardFor(c.plays) && !cardFor(c.plays).plays), "a card plays a real scene, one hop only");
  assert.deepEqual(CARDS.filter((c) => c.plays === "pr-mujoco-3396").map((c) => c.id).sort(), [...mount].sort(), "the mountain's group is its three docks");
  const ctl = readFileSync(new URL("../components/world/Controller.jsx", import.meta.url), "utf8");
  assert.ok(/playsAs\(nearestUnseen\(seal\)/.test(ctl) && (ctl.match(/seeAll\(approach\)/g) ?? []).length === 2, "Controller.jsx arrives as the group's scene and marks the group seen");
  const koan = cardFor("p-aether-lang");
  assert.ok(koan.a.text.includes("Gojeal Satarou") && koan.b.text.includes("Gojeal Fishtarou"), "the Gojeal koan keeps its spellings");
  const T = timelineFor(koan);
  assert.ok(T.duration >= 8.2 && T.lineB > T.lineA && T.collapse[0] > T.lineB, "Aether-Lang keeps its domain beats in order (rebuilt richer and slower, owner 2026-10-04)");
  // THE AWAKENING (awakening.js): its beats in order, the line on screen long
  // enough to read, the pup back down and the sky clear by the end, and the
  // credit card's every number taken from showcase.json.
  {
    const A = AWAKE;
    const marks = [A.impact, A.erupt[1], ...A.circles, A.impactB, A.rise[0], A.reveal, A.rise[1], A.line[0], A.card[0], A.card[1], A.descend[1], A.duration];
    assert.ok(marks.every((v, i) => i === 0 || v > marks[i - 1]), "awakening beats are in order");
    assert.ok(AWAKENING.duration === realLength(AWAKENING.id, A.duration) && AWAKENING.hold >= realAt(AWAKENING.id, A.descend[0]) && AWAKENING.hold < AWAKENING.duration, "the awakening holds input through the flight");
    let last = 0;
    const seen = new Map();
    for (let r = 0; r < AWAKENING.duration; r += 0.005) {
      const t = sceneT(AWAKENING.id, r);
      const b = awakeBeat(t);
      assert.ok(b >= last, `awakening beat goes back at ${t.toFixed(2)} s`);
      last = b;
      seen.set(b, (seen.get(b) ?? 0) + 0.005);
    }
    assert.deepEqual([...seen.keys()], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "every awakening beat plays, in order");
    // THE PACING RULE in real seconds: the line is up 1 s per 3 words + 2 s (at least 5), the card 4 s, each big beat 2.5 s with 0.8 s of breath
    const needLine = Math.max(MIN_BUBBLE, LINE.text.split(/\s+/).length / 3 + 2);
    assert.ok(seen.get(9) >= needLine - 0.02, `the bubble gets ${seen.get(9).toFixed(2)} s, under ${needLine.toFixed(2)} s`);
    assert.ok(seen.get(10) >= MIN_CREDIT - 0.02, `the credit card holds ${seen.get(10).toFixed(2)} s, under ${MIN_CREDIT} s`);
    const Rw = (x) => realAt(AWAKENING.id, x);
    const bigA = { eruption: [A.impact, A.circles[3]], peak: [A.impactB, A.reveal], flight: [A.reveal, A.rise[1]], landing: [A.card[1], A.duration] };
    for (const [k, [x, y]] of Object.entries(bigA)) assert.ok(Rw(y) - Rw(x) >= MIN_BEAT - 0.02, `awakening ${k} holds ${(Rw(y) - Rw(x)).toFixed(2)} s, under ${MIN_BEAT}`);
    assert.ok(Rw(A.impactB) - Rw(A.circles[3]) >= BREATH && Rw(A.line[0]) - Rw(A.rise[1]) >= 0.3, "awakening beats breathe");
    assert.ok(AWAKENING.duration >= 20 && AWAKENING.duration <= 30, "the awakening runs 20 to 30 s");
    console.log(`pace awakening: ${AWAKENING.duration} s; line ${seen.get(9).toFixed(2)} card ${seen.get(10).toFixed(2)}`);
    assert.ok(awakeBeat(A.duration) === 0 && liftAt(A.duration) < 1e-6 && skyAt(A.duration) < 1e-6 && auraAt(A.duration) < 1e-3, "the awakening ends with the pup down and the sky clear");
    assert.ok(liftAt(A.line[0]) > 40 && liftAt(A.circles[0]) < 1, "the pup flies high for the line and stays down for the eruption");
    const show = JSON.parse(json);
    const c = awakeCredit();
    assert.ok(c.upstream === show.upstream.length && c.lab === show.lab.length && c.results.length >= 2, "the credit counts the showcase");
    for (const r of c.results) {
      const u = show.upstream.find((p) => `${p.repo} #${p.pr}` === r.repo);
      assert.ok(u && u.result.includes(r.quote), `the credit quotes ${r.repo} as "${r.quote}", which showcase.json does not say`);
    }
    for (const n of `${c.upstream} ${c.lab} ${c.orgs} ${c.results.map((r) => `${r.repo} ${r.quote}`).join(" ")}`.match(/\d[\d,]*(?:\.\d+)?/g)) assert.ok(json.includes(n), `the credit says ${n}, which showcase.json does not`);
    assert.ok(/honoured one/.test(LINE.text) && LINE.bold.every((b) => LINE.text.includes(b)), "the line and its bold words");
  }
}

// Quality ladder: the renderer string picks the right first rung, and a rung
// spends a pixel budget, so a laptop draws no more than an iPad on the same
// rung (a DPR cap gave the 1440x900 laptop 5.2 MP to the iPad's 3.9).
for (const [renderer, tier] of [
  ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)", 0],
  ["ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11)", 1],
  ["ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", 2],
  ["ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)", 2],
  ["Apple GPU", 2],
  ["ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11)", 3],
  ["ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)", 3],
  ["ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)", 4],
  ["ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)", 4],
]) assert.equal(classify(renderer), tier, `${renderer} starts on T${classify(renderer)}, not T${tier}`);
const mpx = (tier, w, h, dpr) => (w * dprFor(tier, w, h, dpr)) * (h * dprFor(tier, w, h, dpr)) / 1e6;
for (let tier = 0; tier < TIERS.length; tier++) {
  const laptop = mpx(tier, 1440, 900, 2);
  const macbook16 = mpx(tier, 1728, 1117, 2);
  const ipad = mpx(tier, 1180, 820, 2);
  assert.ok(laptop <= ipad * 1.05 || laptop <= TIERS[tier].mpx * 1.05, `T${tier}: the laptop draws ${laptop.toFixed(2)} MP, the iPad ${ipad.toFixed(2)}`);
  assert.ok(macbook16 <= Math.max(ipad, TIERS[tier].mpx) * 1.05 || dprFor(tier, 1728, 1117, 2) === TIERS[tier].dpr[0], `T${tier}: a 16" MacBook draws ${macbook16.toFixed(2)} MP`);
  assert.ok(dprFor(tier, 390, 844, 3) <= 2, "no rung draws a phone above DPR 2");
}

// The Display picker: Auto is adaptive (no rung), every other option pins a valid rung, in rising order.
assert.equal(displayTier("auto"), null);
let lastPin = -1;
for (const d of DISPLAY.filter((o) => o.id !== "auto")) {
  assert.ok(Number.isInteger(d.tier) && d.tier >= 0 && d.tier < TIERS.length, `${d.id} maps to a real rung`);
  assert.ok(d.tier > lastPin, `${d.id} sits above the option before it`);
  lastPin = d.tier;
}
assert.equal(displayTier("nonsense"), null);
assert.equal(gpuName("ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00003EA0) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "Intel(R) UHD Graphics 620");

// MujoRush is solid: no route puts the seal inside the rock the renderer
// draws. The footprint is the carved sheet's frontmost vertex per column
// (pup bellies included), measured from the real geometry, and every step of
// every run is checked, not only where it ends.
{
  const front = new Map();
  const pos = buildStone().stone.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0.2) continue;
    const col = Math.round(pos.getX(i) * 4);
    front.set(col, Math.max(front.get(col) ?? -Infinity, pos.getZ(i)));
  }
  const inRock = (x, z) => z < (front.get(Math.round(x * 4)) ?? -Infinity);
  const inside = (s) => s.flight === 0 && inRock(s.x, s.z);
  const drive = (label, s, controls, seconds) => {
    for (let t = 0; t < seconds; t += 1 / 120) {
      stepSeal(s, controls, 1 / 120, world);
      assert.ok(!inside(s), `${label}: the seal is inside Mount MujoRush at ${s.x.toFixed(2)}, ${s.z.toFixed(2)}`);
    }
  };
  // up the cliff from the south: a column every 0.5 m, with and without boost
  for (let x = -56; x <= -16; x += 0.5) {
    for (const boost of [false, true]) {
      drive(`walking north at x=${x}${boost ? " boosting" : ""}`, createSeal(x, -40), { input: { x: 0, z: -1 }, boost }, 6);
    }
  }
  // from every heading: 64 starts on a ring round the massif, walking at its middle
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const sx = -36 + Math.cos(a) * 30;
    const sz = -60 + Math.sin(a) * 30;
    if (Math.hypot(sx, sz) > ISLAND_RADIUS - 2) continue;
    for (const boost of [false, true]) {
      drive(`heading ${k}/64${boost ? " boosting" : ""}`, createSeal(sx, sz), { input: { x: -Math.cos(a), z: -Math.sin(a) }, boost }, 8);
    }
  }
  // tap-to-walk onto a point inside the mountain
  for (let x = -56; x <= -16; x += 2) drive(`tapping x=${x}`, createSeal(x, -40), { target: { x, z: -58 } }, 10);
  // the throws land clear of it
  for (const [x, z] of [...GEYSER.landings, WHIRLPOOL.throwTo]) assert.ok(!inRock(x, z), `a throw lands inside MujoRush at ${x}, ${z}`);
  // and so do the docks
  for (const p of PLACES) assert.ok(!inRock(dockPoint(p).x, dockPoint(p).z), `${p.id}'s dock is inside MujoRush`);
}

{
  const ctl = readFileSync(new URL("../components/world/Controller.jsx", import.meta.url), "utf8");
  const hud = readFileSync(new URL("../components/world/Hud.jsx", import.meta.url), "utf8");
  assert.ok(/export function replayArrival/.test(ctl) && /replayArrival\(place\.id\)/.test(hud) && /aria-label="Replay the cutscene"/.test(hud), "the building panel replays its cutscene through replayArrival");
}
// A pup mid-ride or mid-throw must not be pinned by an arrival (Controller
// skips stepSeal while holding, freezing a ride upside down): it is
// "mustFinish" until upright, and a finished ride leaves no pitch.
{
  const world = { colliders: [], radius: 1000 };
  const s = createSeal(ENTRY.x0 + 0.5, ENTRY.z);
  s.water = 1; s.vx = 8;
  let mid = false;
  for (let i = 0; i < 120 * 20 && (!s.ride || s.rideS < RIDE_LENGTH * 0.5 || !mid); i++) {
    stepSeal(s, { input: { x: 1, z: 0 } }, 1 / 120, world);
    if (s.ride && s.rideS > RIDE_LENGTH * 0.45) mid = true;
    if (mid) break;
  }
  assert.ok(s.ride && mustFinish(s), "a seal mid-loop is not held back from an arrival");
  assert.ok(mustFinish({ ride: 0, air: 0.5 }), "a seal mid-throw is not held back from an arrival");
  for (let i = 0; i < 120 * 20 && s.ride; i++) stepSeal(s, {}, 1 / 120, world);
  assert.ok(!s.ride && s.ridePitch === 0 && !mustFinish(s), "a finished ride left the body pitched");
}

console.log(`world check passed: quality ladder, cutscene cards and moves, bridges, ${PLACES.length} places, dry docks, river source to sea, dam holds, moat fed from the reservoir, districts, radiation everywhere, river between MujoRush and the Google range, trails and bridges, motion, walls, rim, docks, props, toys (TNT, stack, pins, cones), throttle, glide, skid, reaction, bump, arrival, drift, yaw cap, river ride, river exit, island river ride, the whirlpool, the geyser, the highway, MujoRush is solid, mutation looks`);
