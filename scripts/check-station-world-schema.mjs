import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
    center: { x: -15, z: 7 },
    dock: { x: -19.26, z: 8.99 },
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
    center: { x: -5, z: 13 },
    dock: { x: -6.01, z: 15.61 },
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
    center: { x: 8, z: 12 },
    dock: { x: 9.55, z: 14.33 },
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
    center: { x: 17, z: 4 },
    dock: { x: 20.21, z: 4.76 },
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
    center: { x: 15, z: -8 },
    dock: { x: 18, z: -9.6 },
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
    center: { x: 3, z: -14 },
    dock: { x: 3.59, z: -16.74 },
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
    center: { x: -11, z: -11 },
    dock: { x: -13.47, z: -13.47 },
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
    center: { x: -18, z: -2 },
    dock: { x: -20.98, z: -2.33 },
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
let perimeter = 0;
for (const { from, to } of STATION_WORLD_SCHEMA.edges) {
  degrees[from] += 1;
  degrees[to] += 1;
  const source = STATION_WORLD_SCHEMA.stations[from];
  const target = STATION_WORLD_SCHEMA.stations[to];
  const centerDistance = Math.hypot(
    source.center.x - target.center.x,
    source.center.z - target.center.z,
  );
  const conservativeClearance =
    centerDistance -
    Math.max(source.collider.radiusX, source.collider.radiusZ) -
    Math.max(target.collider.radiusX, target.collider.radiusZ);
  assert.ok(centerDistance >= 9.48 && centerDistance <= 14.32, `${from} -> ${to} spacing is out of contract`);
  assert.ok(conservativeClearance >= 2.9, `${from} -> ${to} hard shells lack safe separation`);
  perimeter += centerDistance;
}
assert.ok(Object.values(degrees).every((degree) => degree === 2), "every C8 node must have degree two");
assert.ok(Math.abs(perimeter - 97.53) <= 0.01, "C8 perimeter must match the approved 97.530 units");

for (let first = 0; first < stations.length - 1; first += 1) {
  for (let second = first + 1; second < stations.length; second += 1) {
    const a = stations[first];
    const b = stations[second];
    const centerDistance = Math.hypot(a.center.x - b.center.x, a.center.z - b.center.z);
    const conservativeClearance =
      centerDistance -
      Math.max(a.collider.radiusX, a.collider.radiusZ) -
      Math.max(b.collider.radiusX, b.collider.radiusZ);
    assert.ok(conservativeClearance >= 2.9, `${a.id}/${b.id} violate minimum world clearance`);
  }
}

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
