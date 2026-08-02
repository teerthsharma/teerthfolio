import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  POLAR_DOME_DOCK_LOCAL_XZ,
  POLAR_DOME_TRAVERSAL_COLLIDER,
  isXZInsidePolarDomeDoorway,
} from "../lib/polar-dome-lattice.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import * as traversal from "../lib/polar-traversal.js";

const {
  GUIDED_MAX_SPEED,
  advanceTraversalFrame,
  createStationCollisionSet,
  createStationTraversalTarget,
  createTraversalState,
  routeTraversalToStation,
} = traversal;

assert.equal(
  typeof createStationTraversalTarget,
  "function",
  "traversal must expose canonical schema dock targets",
);
assert.equal(
  typeof createStationCollisionSet,
  "function",
  "traversal must expose all rotated schema colliders",
);

const stationTargets = STATION_WORLD_SCHEMA.order.map((id) =>
  createStationTraversalTarget(id),
);
const stationColliders = createStationCollisionSet();
const observatoryWorld = STATION_WORLD_SCHEMA.stations["observatory-plaque"];
const observatoryCollider = stationColliders.find(
  ({ id }) => id === "observatory-plaque",
);

assert.equal(
  observatoryWorld.collider,
  POLAR_DOME_TRAVERSAL_COLLIDER,
  "production Observatory schema must consume the rendered lattice collider authority",
);
assert.deepEqual(
  {
    x: observatoryWorld.dock.x - observatoryWorld.center.x,
    z: observatoryWorld.dock.z - observatoryWorld.center.z,
  },
  { x: POLAR_DOME_DOCK_LOCAL_XZ[0], z: POLAR_DOME_DOCK_LOCAL_XZ[1] },
  "production Observatory dock must align with the rendered airlock",
);

assert.deepEqual(
  stationTargets,
  STATION_WORLD_SCHEMA.order.map((id) => ({
    id,
    x: STATION_WORLD_SCHEMA.stations[id].dock.x,
    z: STATION_WORLD_SCHEMA.stations[id].dock.z,
  })),
  "guided targets must be the approved dock anchors without offsets or scaling",
);
assert.deepEqual(
  stationColliders,
  STATION_WORLD_SCHEMA.order.map((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    return {
      doorway: station.collider.doorway,
      centerX: station.center.x,
      centerZ: station.center.z,
      id,
      kind: station.collider.kind || "ellipse",
      radiusX: station.collider.radiusX,
      radiusZ: station.collider.radiusZ,
      rotationDegrees: station.collider.rotationDegrees,
      traversalY: station.collider.traversalY,
    };
  }),
  "collision authority must preserve every approved rotated ellipse",
);

{
  const toWorld = (localX, localZ) => ({
    x: observatoryWorld.center.x + localX,
    z: observatoryWorld.center.z + localZ,
  });
  const doorwayAxis = POLAR_DOME_TRAVERSAL_COLLIDER.doorway.axisXZ;
  const start = toWorld(
    POLAR_DOME_DOCK_LOCAL_XZ[0] + doorwayAxis[0] * 0.24,
    POLAR_DOME_DOCK_LOCAL_XZ[1] + doorwayAxis[1] * 0.24,
  );
  const doorwayPassage = createTraversalState(start);
  for (let frame = 0; frame < 22; frame += 1) {
    advanceTraversalFrame(doorwayPassage, {
      colliders: [observatoryCollider],
      dt: 1 / 60,
      input: { x: -doorwayAxis[0], z: -doorwayAxis[1] },
    });
  }
  const localX = doorwayPassage.x - observatoryWorld.center.x;
  const localZ = doorwayPassage.z - observatoryWorld.center.z;
  const ellipse =
    (localX / POLAR_DOME_TRAVERSAL_COLLIDER.radiusX) ** 2 +
    (localZ / POLAR_DOME_TRAVERSAL_COLLIDER.radiusZ) ** 2;
  assert.ok(ellipse < 1, "seal must pass inside the production dome footprint through its rendered doorway");
  assert.equal(
    isXZInsidePolarDomeDoorway(localX, localZ),
    true,
    "production passage must remain inside the lattice doorway corridor",
  );
  assert.equal(doorwayPassage.collisionId, null, "rendered doorway must never report shell contact");

  const shellStart = toWorld(POLAR_DOME_TRAVERSAL_COLLIDER.radiusX + 0.24, 0);
  const shellContact = createTraversalState(shellStart);
  for (let frame = 0; frame < 40; frame += 1) {
    advanceTraversalFrame(shellContact, {
      colliders: [observatoryCollider],
      dt: 1 / 60,
      input: { x: -1, z: 0 },
    });
  }
  const shellLocalX = shellContact.x - observatoryWorld.center.x;
  const shellLocalZ = shellContact.z - observatoryWorld.center.z;
  assert.ok(
    (shellLocalX / POLAR_DOME_TRAVERSAL_COLLIDER.radiusX) ** 2 +
      (shellLocalZ / POLAR_DOME_TRAVERSAL_COLLIDER.radiusZ) ** 2 >=
      1 - 1e-8,
    "production traversal must stop at the visible lattice shell outside the doorway",
  );
  assert.equal(shellContact.collisionId, "observatory-plaque");
}

function markDocked(state, id) {
  state.dockedId = id;
  state.nearbyId = id;
  state.proximityStationId = id;
  state.stationProximity = 1;
}

function routeIds(state) {
  return [state.route, ...(state.routeQueue || [])].filter(Boolean).map(({ id }) => id);
}

function assertOutsideEveryCollider(state, label) {
  for (const collider of stationColliders) {
    const angle = (collider.rotationDegrees * Math.PI) / 180;
    const dx = state.x - collider.centerX;
    const dz = state.z - collider.centerZ;
    const localX = dx * Math.cos(angle) + dz * Math.sin(angle);
    const localZ = -dx * Math.sin(angle) + dz * Math.cos(angle);
    const ellipse =
      (localX / collider.radiusX) ** 2 +
      (localZ / collider.radiusZ) ** 2;
    assert.ok(ellipse >= 1 - 1e-8, `${label} penetrated ${collider.id}`);
  }
}

function runUntilDocked(state, destinationId, maximumSeconds = 18) {
  let maximumFrameDistance = 0;
  const frames = Math.ceil(maximumSeconds * 60);
  for (let frame = 0; frame < frames && state.dockedId !== destinationId; frame += 1) {
    const result = advanceTraversalFrame(state, {
      colliders: stationColliders,
      dt: 1 / 60,
      stations: stationTargets,
    });
    maximumFrameDistance = Math.max(maximumFrameDistance, result.frameDistance);
    assert.ok(
      result.frameDistance <= GUIDED_MAX_SPEED / 60 + 1e-6,
      `${destinationId} route exceeded bounded travel at frame ${frame}`,
    );
    assertOutsideEveryCollider(state, `${destinationId} route frame ${frame}`);
  }
  assert.equal(state.dockedId, destinationId, `${destinationId} must be reached through travel`);
  return maximumFrameDistance;
}

const plaque = createStationTraversalTarget("observatory-plaque");
const s2 = createStationTraversalTarget("s2-kernel-core");
const assembly = createStationTraversalTarget("assembly-tool-locker");
const state = createTraversalState(plaque);
markDocked(state, plaque.id);

const beforeSelection = { x: state.x, z: state.z };
routeTraversalToStation(state, s2.id);
assert.deepEqual({ x: state.x, z: state.z }, beforeSelection, "selection must never teleport");
assert.deepEqual(routeIds(state), [s2.id], "Plaque -> S2 must use the direct C8 edge");
runUntilDocked(state, s2.id);
const s2Pose = { x: state.x, z: state.z };

routeTraversalToStation(state, assembly.id);
assert.deepEqual(
  routeIds(state),
  [plaque.id, assembly.id],
  "S2 -> Assembly must choose the shorter C8 route through Plaque",
);
runUntilDocked(state, assembly.id);
const assemblyPose = { x: state.x, z: state.z };

routeTraversalToStation(state, plaque.id);
assert.deepEqual(routeIds(state), [plaque.id], "Assembly -> Plaque must close the C8 loop");
runUntilDocked(state, plaque.id);
const returnedPlaquePose = { x: state.x, z: state.z };

assert.ok(Math.hypot(s2Pose.x - assemblyPose.x, s2Pose.z - assemblyPose.z) > 9);
assert.ok(Math.hypot(assemblyPose.x - returnedPlaquePose.x, assemblyPose.z - returnedPlaquePose.z) > 8);
assert.ok(Math.hypot(returnedPlaquePose.x - plaque.x, returnedPlaquePose.z - plaque.z) <= 0.28);

{
  const rotationDegrees = 47;
  const angle = (rotationDegrees * Math.PI) / 180;
  const toWorld = (localX, localZ) => ({
    x: localX * Math.cos(angle) - localZ * Math.sin(angle),
    z: localX * Math.sin(angle) + localZ * Math.cos(angle),
  });
  const start = toWorld(2.15, 0.35);
  const inward = toWorld(-1, 0);
  const rotated = createTraversalState(start);
  const collider = {
    centerX: 0,
    centerZ: 0,
    id: "rotated-proof",
    radiusX: 2,
    radiusZ: 1,
    rotationDegrees,
  };
  for (let frame = 0; frame < 120; frame += 1) {
    advanceTraversalFrame(rotated, {
      colliders: [collider],
      dt: 1 / 120,
      input: inward,
    });
    const dx = rotated.x - collider.centerX;
    const dz = rotated.z - collider.centerZ;
    const localX = dx * Math.cos(angle) + dz * Math.sin(angle);
    const localZ = -dx * Math.sin(angle) + dz * Math.cos(angle);
    assert.ok((localX / 2) ** 2 + localZ ** 2 >= 1 - 1e-8);
  }
  const finalLocalZ = -rotated.x * Math.sin(angle) + rotated.z * Math.cos(angle);
  assert.ok(finalLocalZ > 0.4, "rotated ellipse contact must preserve a tangential slide");
}

const canonicalConsumers = [
  "components/AdaptivePolarWorldDressing.jsx",
  "components/IglooArtifacts.jsx",
  "components/IglooScene.jsx",
  "components/IglooWorld.jsx",
  "components/SealAvatar.jsx",
  "components/TopologicalSealMascot.jsx",
  "components/TopologyConstellation.jsx",
  "lib/polar-traversal.js",
  "lib/polar-world-cadence.js",
];

for (const file of canonicalConsumers) {
  const source = readFileSync(path.resolve(file), "utf8");
  assert.match(source, /STATION_WORLD_SCHEMA/, `${file} must consume the canonical XZ schema`);
  assert.doesNotMatch(
    source,
    /STATION_DEPTH_SCALE|WORLD_LOOP_LENGTH|WORLD_AXIS_LENGTH|ARTIFACT_LOOP_LENGTH|SEAL_WORLD_LOOP_LENGTH|nearestLoopedX|observatoryVisualHomeX/,
    `${file} still contains a wrapping, scale, or visual-home coordinate authority`,
  );
  assert.doesNotMatch(
    source,
    /artifact\.position\s*\[\s*2\s*\]\s*\*|artifact\.position\s*\[\s*0\s*\]\s*\+\s*Math\.round/,
    `${file} still reinterprets an artifact coordinate downstream`,
  );
}

const sceneSource = readFileSync(path.resolve("components/IglooScene.jsx"), "utf8");
// The artifact records themselves live in lib/igloo-artifacts.js so that
// importing the station list does not pull three.js into the first-load
// bundle; the R3F components that render them stay in the .jsx.
const artifactSource =
  readFileSync(path.resolve("lib/igloo-artifacts.js"), "utf8") +
  readFileSync(path.resolve("components/IglooArtifacts.jsx"), "utf8");
const worldSource = readFileSync(path.resolve("components/IglooWorld.jsx"), "utf8");
assert.match(
  sceneSource,
  /solvePolarCameraComposition\([\s\S]*station:\s*stationWorld[\s\S]*dockComposition\.camera/,
  "camera must resolve the approved per-station cone through the composition authority",
);
assert.match(
  sceneSource,
  /PolarRouteNetwork[\s\S]*local-route-lead max-two-station-promises/,
  "rendered route must expose only the local lead and one framed promise",
);
assert.match(artifactSource, /world:\s*stationWorld/, "artifact records must expose their canonical world contract");
assert.match(worldSource, /createStationCollisionSet/, "world simulation must use all station colliders");
assert.match(worldSource, /createStationTraversalTarget/, "world routing must target canonical docks");

console.log(
  "station-world integration contract passed: canonical XZ consumers, rotated collisions, bounded Plaque -> S2 -> Assembly -> Plaque C8 travel",
);
