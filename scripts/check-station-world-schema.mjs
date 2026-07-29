import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { POLAR_DOME_DOCK_LOCAL_XZ } from "../lib/polar-dome-lattice.js";

const schemaPath = path.resolve("lib/polar-station-world.js");

assert.ok(
  existsSync(schemaPath),
  "canonical station-world schema is missing; the approved XZ world must have one immutable authority",
);

const { PLAQUE_HOME_CAMERA_AZIMUTH_DEGREES, STATION_WORLD_SCHEMA } = await import(
  `${pathToFileURL(schemaPath).href}?contract=${Date.now()}`
);

const EXPECTED_ORDER = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

const EXPECTED = {
  "observatory-plaque": {
    center: { x: -3, z: 1 },
    dock: {
      x: -3 + POLAR_DOME_DOCK_LOCAL_XZ[0],
      z: 1 + POLAR_DOME_DOCK_LOCAL_XZ[1],
    },
    collider: { radiusX: 4.4, radiusZ: 3.2, rotationDegrees: 12 },
    proximity: { far: 10.5, approach: 7, dock: 2.6 },
    camera: {
      azimuthDegrees: 295,
      elevationDegrees: 11,
      verticalFovDegrees: 38,
      azimuthRanges: [[267, 323]],
      elevationRange: [7, 15],
    },
  },
  "s2-kernel-core": {
    center: { x: 3, z: 8 },
    dock: { x: 1.99, z: 10.61 },
    collider: { radiusX: 2, radiusZ: 1.8, rotationDegrees: 38 },
    proximity: { far: 8.5, approach: 5.5, dock: 1.8 },
    camera: {
      azimuthDegrees: 339,
      elevationDegrees: 14,
      verticalFovDegrees: 36,
      azimuthRanges: [[317, 360], [0, 1]],
      elevationRange: [10, 18],
    },
  },
  "manifold-reactor": {
    center: { x: -14, z: -6 },
    dock: { x: -12.45, z: -3.67 },
    collider: { radiusX: 1.8, radiusZ: 2.35, rotationDegrees: -27 },
    proximity: { far: 8.8, approach: 5.8, dock: 1.9 },
    camera: {
      azimuthDegrees: 34,
      elevationDegrees: 10,
      verticalFovDegrees: 38,
      azimuthRanges: [[10, 58]],
      elevationRange: [6, 14],
    },
  },
  "field-chamber-coils": {
    center: { x: -10, z: -9 },
    dock: { x: -6.79, z: -8.24 },
    collider: { radiusX: 2.8, radiusZ: 1.75, rotationDegrees: 74 },
    proximity: { far: 9.2, approach: 6.2, dock: 2.2 },
    camera: {
      azimuthDegrees: 77,
      elevationDegrees: 12,
      verticalFovDegrees: 40,
      azimuthRanges: [[51, 103]],
      elevationRange: [8, 16],
    },
  },
  "qpu-ice-bridge": {
    center: { x: 17, z: -13 },
    dock: { x: 20, z: -14.6 },
    collider: { radiusX: 3.05, radiusZ: 1.65, rotationDegrees: -48 },
    proximity: { far: 9.4, approach: 6.4, dock: 2.4 },
    camera: {
      azimuthDegrees: 118,
      elevationDegrees: 9,
      verticalFovDegrees: 43,
      azimuthRanges: [[88, 148]],
      elevationRange: [5, 13],
    },
  },
  "upstream-radio-mast": {
    center: { x: 14, z: 12 },
    dock: { x: 14.59, z: 9.26 },
    collider: { radiusX: 1.75, radiusZ: 2.15, rotationDegrees: 19 },
    proximity: { far: 9, approach: 6, dock: 2 },
    camera: {
      azimuthDegrees: 168,
      elevationDegrees: 11,
      verticalFovDegrees: 39,
      azimuthRanges: [[144, 192]],
      elevationRange: [7, 15],
    },
  },
  "topology-archive-wall": {
    center: { x: 11, z: -8 },
    dock: { x: 8.53, z: -10.47 },
    collider: { radiusX: 3.1, radiusZ: 1.55, rotationDegrees: 61 },
    proximity: { far: 9.4, approach: 6.3, dock: 2.3 },
    camera: {
      azimuthDegrees: 225,
      elevationDegrees: 8,
      verticalFovDegrees: 36,
      azimuthRanges: [[205, 245]],
      elevationRange: [4, 12],
    },
  },
  "assembly-tool-locker": {
    center: { x: -16, z: 2 },
    dock: { x: -18.98, z: 1.67 },
    collider: { radiusX: 2.15, radiusZ: 1.9, rotationDegrees: 83.68091167100431 },
    proximity: { far: 8.7, approach: 5.8, dock: 2.1 },
    camera: {
      azimuthDegrees: 264,
      elevationDegrees: 13,
      verticalFovDegrees: 39,
      azimuthRanges: [[240, 288]],
      elevationRange: [9, 17],
    },
  },
};

const EXPECTED_EDGES = EXPECTED_ORDER.map((from, index) => ({
  from,
  to: EXPECTED_ORDER[(index + 1) % EXPECTED_ORDER.length],
}));

function deepFrozen(value) {
  if (!value || typeof value !== "object" || !Object.isFrozen(value)) return false;
  return Object.values(value).every((nested) =>
    nested && typeof nested === "object" ? deepFrozen(nested) : true,
  );
}

function pointKey(point) {
  return `${point.x.toFixed(6)},${point.z.toFixed(6)}`;
}

function twiceTriangleArea(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function assertNoCollinearTriples(points, label) {
  for (let first = 0; first < points.length - 2; first += 1) {
    for (let second = first + 1; second < points.length - 1; second += 1) {
      for (let third = second + 1; third < points.length; third += 1) {
        assert.ok(
          Math.abs(twiceTriangleArea(points[first], points[second], points[third])) > 1e-6,
          `${label} ${first}/${second}/${third} are collinear`,
        );
      }
    }
  }
}

function ellipseValue(point, station) {
  const radians = (-station.collider.rotationDegrees * Math.PI) / 180;
  const dx = point.x - station.center.x;
  const dz = point.z - station.center.z;
  const localX = dx * Math.cos(radians) - dz * Math.sin(radians);
  const localZ = dx * Math.sin(radians) + dz * Math.cos(radians);
  return (
    (localX / station.collider.radiusX) ** 2 +
    (localZ / station.collider.radiusZ) ** 2
  );
}

assert.ok(STATION_WORLD_SCHEMA, "schema module must export STATION_WORLD_SCHEMA");
assert.ok(deepFrozen(STATION_WORLD_SCHEMA), "the full station-world graph must be deeply immutable");
assert.equal(STATION_WORLD_SCHEMA.coordinateSpace, "canonical-world-xz");
assert.equal(STATION_WORLD_SCHEMA.downstreamCoordinateScale, 1);
assert.equal(STATION_WORLD_SCHEMA.stationWrapping, false);
assert.deepEqual(STATION_WORLD_SCHEMA.order, EXPECTED_ORDER);
assert.deepEqual(Object.keys(STATION_WORLD_SCHEMA.stations), EXPECTED_ORDER);
assert.equal(Object.keys(STATION_WORLD_SCHEMA.stations).length, 8);
assert.equal(
  PLAQUE_HOME_CAMERA_AZIMUTH_DEGREES,
  321,
  "home camera must sit two degrees inside the approved Plaque cone",
);

for (const id of EXPECTED_ORDER) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  assert.deepEqual(station, { id, ...EXPECTED[id] }, `${id} must match the approved world contract`);
  assert.ok(
    station.proximity.far > station.proximity.approach &&
      station.proximity.approach > station.proximity.dock,
    `${id} proximity radii must descend far -> approach -> dock`,
  );
  assert.ok(ellipseValue(station.dock, station) > 1, `${id} dock must sit outside its hard collider`);
  assert.ok(
    !Object.keys(station).some((key) => /scale|multiplier|wrapped|visualHome/i.test(key)),
    `${id} must not carry a downstream coordinate transform`,
  );
}

const stations = EXPECTED_ORDER.map((id) => STATION_WORLD_SCHEMA.stations[id]);
const centers = stations.map(({ center }) => center);
const docks = stations.map(({ dock }) => dock);

assert.equal(new Set(centers.map(pointKey)).size, 8, "station centers must be unique");
assert.equal(new Set(docks.map(pointKey)).size, 8, "station docks must be unique");
assertNoCollinearTriples(centers, "station centers");
assertNoCollinearTriples(docks, "station docks");

assert.deepEqual(STATION_WORLD_SCHEMA.edges, EXPECTED_EDGES, "guided graph must be the approved C8");
const degrees = Object.fromEntries(EXPECTED_ORDER.map((id) => [id, 0]));
for (const { from, to } of STATION_WORLD_SCHEMA.edges) {
  degrees[from] += 1;
  degrees[to] += 1;
}
assert.ok(Object.values(degrees).every((degree) => degree === 2), "every C8 node must have degree two");

// CAMP-ERA LAYOUT INVARIANTS. The ring-era perimeter/edge-spacing contract
// (97.530 perimeter, 9.48-14.32 uniform hops) is retired: the camp reads as
// functional zones with deliberately unequal hops, so we pin zone logic instead.
function centerDistanceBetween(a, b) {
  return Math.hypot(a.center.x - b.center.x, a.center.z - b.center.z);
}

/** Extent of a station's hard ellipse along a world-space unit direction. */
function ellipseSupport(station, unitX, unitZ) {
  const radians = (-station.collider.rotationDegrees * Math.PI) / 180;
  const localX = unitX * Math.cos(radians) - unitZ * Math.sin(radians);
  const localZ = unitX * Math.sin(radians) + unitZ * Math.cos(radians);
  return Math.hypot(station.collider.radiusX * localX, station.collider.radiusZ * localZ);
}

const ENERGY_PAIR = ["manifold-reactor", "field-chamber-coils"];
const isEnergyPair = (a, b) =>
  ENERGY_PAIR.includes(a.id) && ENERGY_PAIR.includes(b.id) && a.id !== b.id;

for (let first = 0; first < stations.length - 1; first += 1) {
  for (let second = first + 1; second < stations.length; second += 1) {
    const a = stations[first];
    const b = stations[second];
    const centerDistance = centerDistanceBetween(a, b);
    // Clearance is the true directional shell gap along the pair axis
    // (ellipse support function), not the ring-era max-radius bound: camp
    // zoning intentionally angles narrow colliders toward near neighbors.
    const unitX = (b.center.x - a.center.x) / centerDistance;
    const unitZ = (b.center.z - a.center.z) / centerDistance;
    const directionalClearance =
      centerDistance - ellipseSupport(a, unitX, unitZ) - ellipseSupport(b, unitX, unitZ);
    if (isEnergyPair(a, b)) {
      // The generator hall and heat plant are a deliberately clustered energy
      // pair; at ~5 apart they cannot carry the full 2.9 corridor, so pin no
      // overlap plus at least one full walk gap between hard shells.
      assert.ok(
        directionalClearance >= 1,
        `${a.id}/${b.id} energy pair must keep a walkable shell gap of at least 1`,
      );
      continue;
    }
    assert.ok(directionalClearance >= 2.9, `${a.id}/${b.id} violate minimum world clearance`);
  }
}

for (const station of stations) {
  const nearest = Math.min(
    ...stations
      .filter((other) => other.id !== station.id)
      .map((other) => centerDistanceBetween(station, other)),
  );
  assert.ok(nearest >= 4.5, `${station.id} nearest-neighbor distance must stay >= 4.5`);
  assert.ok(
    Math.abs(station.center.x) <= 18 && Math.abs(station.center.z) <= 15,
    `${station.id} center must stay inside the camp bounds |x|<=18 |z|<=15`,
  );
}

const observatory = STATION_WORLD_SCHEMA.stations["observatory-plaque"];
const farthestFromHousing = stations
  .filter(({ id }) => id !== "observatory-plaque")
  .reduce((farthest, station) =>
    centerDistanceBetween(observatory, station) > centerDistanceBetween(observatory, farthest)
      ? station
      : farthest,
  );
assert.equal(
  farthestFromHousing.id,
  "qpu-ice-bridge",
  "the drill rig must remain the farthest station from housing (safety separation)",
);

const energyPairDistance = centerDistanceBetween(
  STATION_WORLD_SCHEMA.stations["manifold-reactor"],
  STATION_WORLD_SCHEMA.stations["field-chamber-coils"],
);
assert.ok(
  energyPairDistance >= 4 && energyPairDistance <= 7,
  "generator hall and heat plant must remain a paired energy cluster (4-7 apart)",
);

const source = readFileSync(schemaPath, "utf8");
assert.doesNotMatch(
  source,
  /STATION_DEPTH_SCALE|WORLD_LOOP_LENGTH|nearestLoopedX|position\s*\[\s*[02]\s*\]\s*\*|(?:center|dock)\s*\.\s*[xz]\s*\*/,
  "canonical schema must not reinterpret, wrap, or scale approved XZ coordinates",
);

assert.throws(
  () => {
    STATION_WORLD_SCHEMA.stations["observatory-plaque"].center.x = 0;
  },
  TypeError,
  "nested station coordinates must reject mutation",
);

console.log(
  "station-world schema contract passed: 8 immutable non-collinear XZ stations, unique docks, clear C8 graph, canonical scale",
);
