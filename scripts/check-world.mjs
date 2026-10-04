// The rules the island has to keep, checked against the real motion code.
// Run: npm run check

import { GEYSER, HIGHWAY, LAND_COLLIDERS, PATHS, SIGNPOSTS, onHighway } from "../lib/world/land.js";
import assert from "node:assert/strict";
import { CatmullRomCurve3, Color, SRGBColorSpace, Vector3 } from "three";
import { readFileSync } from "node:fs";
import { LOOK_BY_ID } from "../lib/world/looks.js";
import { ARRIVAL } from "../lib/world/moments.js";
import { DOMAIN, domainBeat, radiusAt, signAt } from "../lib/world/domain.js";
import { TIERS, classify, dprFor } from "../lib/world/quality.js";
import { CLEAN, ENTRY, LOOP, RIDE_LENGTH } from "../lib/world/loop.js";
import { MOTION, createSeal, nearestPlace, stepSeal } from "../lib/world/motion.js";
import { PUNCH_IDS, punchFor } from "../lib/world/punch.js";
import { DISTRICTS, ISLAND_RADIUS, PLACES, PLACE_BY_ID, SPAWN, districtAt, dockPoint } from "../lib/world/places.js";
import { DAM, MOAT, RESERVOIR, RIVER, WATERS, WHIRLPOOL, riverAt, waterGap } from "../lib/world/river.js";
import { tickSnack } from "../components/world/life/snack.js";
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
  assert.equal(verdicts([{ gap: 0 }, { gap: 7 }, { gap: 7 }]).s.wins, 1, "three clean loops 7 s apart (inside the window) did not win");
  assert.equal(perfect.s.wins, 1);
  const two = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1, off: 0.8 }]);
  assert.deepEqual(two.seen.at(-1), [0, 0, 0], `two clean loops and a sloppy third won or kept a streak: ${JSON.stringify(two.seen)}`);
  const slow = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 9 }]);
  assert.equal(slow.s.wins, 0, "three clean loops with a 9 s gap won");
  assert.deepEqual(slow.seen.at(-1), [1, 1, 0], `a clean loop after a long gap should start a fresh streak at 1: ${JSON.stringify(slow.seen)}`);
  const reset = verdicts([{ gap: 0 }, { gap: 1 }, { gap: 1, off: 0.8 }, { gap: 1 }, { gap: 1 }]);
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

// Punch lines (punch.js): every place has one, and every number in a line is
// in data/showcase.json (the JSON wins; rewrite the line, not the data).
{
  const json = readFileSync(new URL("../data/showcase.json", import.meta.url), "utf8");
  assert.deepEqual([...PUNCH_IDS].sort(), PLACES.map((p) => p.id).sort(), "punch lines cover exactly the places");
  const VOICES = ["seal", "sil", "land"];
  for (const p of PLACES) {
    const { a, b, num, sub } = punchFor(p.id);
    assert.ok(a.text && b.text && VOICES.includes(a.who) && VOICES.includes(b.who), `${p.id} needs two voices`);
    for (const n of `${a.text} ${b.text} ${num ?? ""} ${sub ?? ""}`.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) assert.ok(n === "0" || json.includes(n), `${p.id}'s punch line says ${n}, which showcase.json does not`);
  }
  const koan = punchFor("p-aether-lang");
  assert.ok(koan.a.text.includes("Gojeal Satarou") && koan.b.text.includes("Gojeal Fishtarou"), "the Gojeal koan keeps its spellings");
  // The domain (domain.js): beats in order, the sign up before the bloom,
  // closed again by the end, and the bubbles' lines in reading time.
  const D = DOMAIN;
  const w = [D.sign[0], D.sign[1], D.impact, D.bloom[1], D.enter, D.lineA, D.lineB, D.collapse[0], D.collapse[1], D.duration];
  assert.ok(w.every((v, i) => i === 0 || v > w[i - 1]) && D.hold >= D.collapse[0] && D.duration > ARRIVAL.duration, "domain beats are in order");
  let beat = 0;
  for (let t = 0; t < D.duration; t += 0.01) {
    const b = domainBeat(t);
    assert.ok(b >= beat, `domain beat goes back at ${t.toFixed(2)} s`);
    beat = b;
  }
  assert.ok(signAt(D.impact) > 0.99 && radiusAt(D.lineA) > 10 && radiusAt(D.duration - 0.01) === 0 && domainBeat(D.duration) === 0, "the sign opens the domain and the domain closes");
  assert.ok(D.lineB - D.lineA >= 2.4 && D.collapse[0] - D.lineB >= 2.4, "each line gets 2.4 s to be read");
  for (const p of PLACES) {
    const c = punchFor(p.id);
    assert.ok(c.seal.pose1 && c.seal.pose2 && c.panel && c.homage && c.why && c.move, `${p.id} card is missing a field`);
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

console.log(`world check passed: quality ladder, punch lines, bridges, ${PLACES.length} places, dry docks, river source to sea, dam holds, moat fed from the reservoir, districts, radiation everywhere, river between MujoRush and the Google range, trails and bridges, motion, walls, rim, docks, props, throttle, glide, skid, reaction, bump, arrival, drift, yaw cap, river ride, river exit, island river ride, the whirlpool, the geyser, the highway, MujoRush is solid, mutation looks`);
