import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";

const modulePath = path.resolve("lib/polar-traversal.js");

assert.ok(
  existsSync(modulePath),
  "polar traversal module is missing; station selection must route without changing pose immediately",
);

const {
  FIXED_STEP_SECONDS,
  GUIDED_MAX_SPEED,
  MANUAL_MAX_SPEED,
  MAX_SUBSTEPS,
  advanceTraversalFrame,
  createStationCollisionSet,
  createStationTraversalTarget,
  createTraversalState,
  deriveLiveTraversalPresentation,
  deriveTraversalPresentation,
  didPhysicalDockOwnershipChange,
  getTraversalRenderPose,
  routeTraversalToStation,
} = await import(`${pathToFileURL(modulePath).href}?contract=${Date.now()}`);

assert.equal(FIXED_STEP_SECONDS, 1 / 120, "simulation must use the approved 120 Hz fixed step");
assert.equal(MAX_SUBSTEPS, 8, "frame spikes must have a finite substep budget");
assert.ok(
  GUIDED_MAX_SPEED >= 3 && GUIDED_MAX_SPEED <= 4,
  "guided travel must settle inside the approved 3-4 world m/s cruise band",
);
assert.ok(
  MANUAL_MAX_SPEED >= GUIDED_MAX_SPEED && MANUAL_MAX_SPEED <= 4,
  "ordinary manual travel must remain bounded by the approved 4 world m/s ceiling",
);

assert.equal(
  typeof deriveLiveTraversalPresentation,
  "function",
  "the world needs a pure presentation lifecycle that derives exclusivity from physical dock state",
);
assert.equal(
  typeof didPhysicalDockOwnershipChange,
  "function",
  "physical dock changes must bypass throttled semantic snapshots",
);

{
  const stations = STATION_WORLD_SCHEMA.order.map(createStationTraversalTarget);
  const plaque = createStationTraversalTarget("observatory-plaque");
  const qpu = createStationTraversalTarget("qpu-ice-bridge");
  const state = createTraversalState(plaque);
  state.dockedId = plaque.id;
  state.nearbyId = plaque.id;
  state.proximityStationId = plaque.id;
  state.stationProximity = 1;

  const docked = deriveLiveTraversalPresentation(state, {
    progress: 0,
    selectedDestinationId: plaque.id,
    stations,
  });
  assert.equal(docked.dockedStationId, plaque.id, "physical docking must acquire one exclusive owner");
  assert.equal(docked.isArrived, true);

  routeTraversalToStation(state, qpu.id);
  assert.equal(
    didPhysicalDockOwnershipChange(docked, state),
    true,
    "the first departure frame must invalidate the previous exclusive owner",
  );
  const departed = deriveLiveTraversalPresentation(state, {
    progress: 4 / 7,
    selectedDestinationId: qpu.id,
    stations,
  });
  assert.equal(state.dockedId, null, "routing away must release physical docking immediately");
  assert.equal(
    departed.dockedStationId,
    null,
    "departure must release exclusivity before the first travel frame",
  );
  assert.equal(departed.phase, "moving");
  assert.equal(didPhysicalDockOwnershipChange(departed, state), false);

  advanceTraversalFrame(state, { dt: 1 / 20, stations });
  const travelling = deriveLiveTraversalPresentation(state, {
    progress: 4 / 7,
    selectedDestinationId: qpu.id,
    stations,
  });
  assert.equal(travelling.dockedStationId, null, "travel must keep route promises enabled");
  assert.equal(travelling.isArrived, false);

  state.x = qpu.x;
  state.z = qpu.z;
  state.vx = 0;
  state.vz = 0;
  state.destinationId = null;
  state.route = null;
  state.dockedId = qpu.id;
  const arrived = deriveLiveTraversalPresentation(state, {
    progress: 4 / 7,
    selectedDestinationId: qpu.id,
    stations,
  });
  assert.equal(arrived.dockedStationId, qpu.id, "arrival must acquire the new exclusive owner");
  assert.equal(arrived.isArrived, true);
}

{
  assert.equal(
    typeof deriveTraversalPresentation,
    "function",
    "traversal must expose one pure presentation selector",
  );
  const stations = STATION_WORLD_SCHEMA.order.map(createStationTraversalTarget);
  const plaque = createStationTraversalTarget("observatory-plaque");
  const qpu = createStationTraversalTarget("qpu-ice-bridge");
  const enRoute = deriveTraversalPresentation(
    {
      destinationId: qpu.id,
      dockedStationId: plaque.id,
      positionXZ: plaque,
      progress: 4 / 7,
      routeActive: true,
      velocityXZ: { x: 1.2, z: -0.4 },
    },
    stations,
  );
  assert.deepEqual(
    Object.keys(enRoute).sort(),
    ["destinationId", "dockedStationId", "isArrived", "nearestStationId", "phase", "progress"],
    "presentation selector must expose only the canonical six-field contract",
  );
  assert.equal(enRoute.destinationId, "qpu-ice-bridge");
  assert.equal(enRoute.dockedStationId, "observatory-plaque");
  assert.equal(enRoute.nearestStationId, "observatory-plaque");
  assert.equal(enRoute.phase, "moving");
  assert.equal(enRoute.isArrived, false);

  const arrived = deriveTraversalPresentation(
    {
      destinationId: qpu.id,
      dockedStationId: qpu.id,
      positionXZ: qpu,
      progress: 4 / 7,
      routeActive: false,
      velocityXZ: { x: 0, z: 0 },
    },
    stations,
  );
  assert.equal(arrived.destinationId, "qpu-ice-bridge");
  assert.equal(arrived.dockedStationId, "qpu-ice-bridge");
  assert.equal(arrived.nearestStationId, "qpu-ice-bridge");
  assert.equal(arrived.phase, "arrived");
  assert.equal(arrived.isArrived, true);
}

{
  assert.equal(
    typeof createStationTraversalTarget,
    "function",
    "one canonical station-to-dock target authority is required",
  );
  const station = STATION_WORLD_SCHEMA.stations["s2-kernel-core"];
  const target = createStationTraversalTarget(station.id);
  assert.deepEqual(
    target,
    { id: station.id, x: station.dock.x, z: station.dock.z },
    "the routed seal center must use the approved dock without wrapping or scaling",
  );
  assert.deepEqual(
    createStationCollisionSet().find(({ id }) => id === station.id),
    {
      doorway: station.collider.doorway,
      centerX: station.center.x,
      centerZ: station.center.z,
      id: station.id,
      kind: station.collider.kind || "ellipse",
      radiusX: station.collider.radiusX,
      radiusZ: station.collider.radiusZ,
      rotationDegrees: station.collider.rotationDegrees,
      traversalY: station.collider.traversalY,
    },
    "collision and camera/monument placement must share the canonical station center",
  );
}

function routeState(target = { id: "qpu", x: 64, z: -2.4 }) {
  const state = createTraversalState({ x: 0, z: 0 });
  routeTraversalToStation(state, target);
  return state;
}

{
  const state = routeState();
  assert.deepEqual(
    { x: state.x, z: state.z },
    { x: 0, z: 0 },
    "selecting a station must never mutate the current world pose",
  );
  assert.equal(state.destinationId, "qpu", "selection should set intent separately from arrival");
  assert.equal(state.nearbyId, null, "selection must not pretend the seal is nearby");
  assert.equal(state.dockedId, null, "selection must not pretend the seal has docked");
  assert.equal(
    state.stationProximity,
    0,
    "selection intent must not fabricate spatial proximity for biome shaders",
  );
}

{
  const state = routeState();
  const result = advanceTraversalFrame(state, { dt: 1 / 20 });
  assert.ok(
    result.frameDistance <= GUIDED_MAX_SPEED / 20 + 1e-6,
    `a 20 Hz route frame jumped ${result.frameDistance.toFixed(4)} world units`,
  );
  assert.ok(state.x < 0.25, "the first routed frame must be speed bounded, not distance proportional");
}

function simulateRouteAt(hz, seconds = 4) {
  const state = routeState({ id: "field", x: 18, z: -3.25 });
  for (let frame = 0; frame < hz * seconds; frame += 1) {
    advanceTraversalFrame(state, { dt: 1 / hz });
  }
  return state;
}

{
  const rates = [30, 60, 90, 120, 144];
  const trajectories = rates.map((rate) => ({ rate, state: simulateRouteAt(rate) }));
  const reference = trajectories.find(({ rate }) => rate === 120).state;
  for (const { rate, state } of trajectories) {
    const divergence = Math.hypot(state.x - reference.x, state.z - reference.z);
    assert.ok(
      divergence <= 0.02,
      `${rate} Hz trajectory diverged ${divergence.toFixed(5)} units from the 120 Hz trace`,
    );
    assert.ok(
      Math.abs(state.stationProximity - reference.stationProximity) <= 0.002,
      `${rate} Hz station proximity diverged from the fixed-step reference`,
    );
  }
}

{
  const state = routeState({ id: "field", x: 18, z: 0 });
  for (let frame = 0; frame < 120; frame += 1) {
    advanceTraversalFrame(state, { dt: 1 / 60 });
  }
  const spike = advanceTraversalFrame(state, { dt: 0.75 });
  assert.ok(spike.frameWasCapped, "a long frame must be reported as capped");
  assert.ok(
    spike.frameDistance <= GUIDED_MAX_SPEED * FIXED_STEP_SECONDS * MAX_SUBSTEPS + 1e-6,
    `long frame advanced ${spike.frameDistance.toFixed(4)} units beyond the substep budget`,
  );
}

{
  const state = routeState({ id: "field", x: 18, z: 0 });
  advanceTraversalFrame(state, { dt: 1 / 60, input: { x: -1, z: 0 } });
  assert.equal(state.destinationId, null, "manual WASD input must cancel the guided destination");
  assert.equal(state.route, null, "manual WASD input must cancel the guided route");
  assert.ok(state.vx < 0, "manual input should take ownership on the same simulation frame");
}

{
  const dome = { id: "observatory-dome", centerX: 0, centerZ: 0, radiusX: 2, radiusZ: 1 };
  const state = createTraversalState({ x: 2.15, z: 0.35 });
  let contacted = false;
  for (let frame = 0; frame < 120; frame += 1) {
    advanceTraversalFrame(state, {
      colliders: [dome],
      dt: 1 / 120,
      input: { x: -1, z: 0 },
    });
    const ellipseDistance =
      ((state.x - dome.centerX) / dome.radiusX) ** 2 +
      ((state.z - dome.centerZ) / dome.radiusZ) ** 2;
    assert.ok(
      ellipseDistance >= 1 - 1e-8,
      `seal penetrated the solid observatory shell at frame ${frame}`,
    );
    contacted ||= state.collisionId === dome.id;
  }
  assert.ok(contacted, "manual movement must report observatory contact");
  assert.ok(state.z > 0.4, "inward velocity must project into a tangential slide, not glue");
  assert.equal(state.impactSequence, 1, "continuous wall pressure must emit one debounced impact");
  assert.ok(
    state.lastImpactStrength > 0 && state.lastImpactStrength <= 1,
    "the impact event must expose bounded inward-momentum strength",
  );
}

{
  const state = createTraversalState({ x: 0, z: 0 });
  const station = { id: "s2", x: 1.1, z: 0 };
  routeTraversalToStation(state, station);
  for (let frame = 0; frame < 8 * 120 && state.dockedId !== station.id; frame += 1) {
    advanceTraversalFrame(state, { dt: 1 / 120, stations: [station] });
  }
  assert.equal(state.dockedId, station.id, "arrival must be earned by distance, speed, and dwell");
  assert.equal(state.destinationId, null, "a completed dock should clear routing intent");
  assert.equal(state.nearbyId, station.id, "docked station remains the nearby station");
  assert.equal(state.stationProximity, 1, "a completed dock must expose full shader proximity");
  assert.equal(
    state.proximityStationId,
    station.id,
    "shader proximity must identify the station that owns the zone transition",
  );
  assert.equal(state.arrivalSequence, 1, "docking must emit one station-arrival event");
  assert.equal(state.arrivalStationId, station.id, "arrival event must identify its station");
  assert.ok(
    state.arrivalStrength > 0 && state.arrivalStrength <= 1,
    "arrival must expose bounded approach-momentum strength",
  );
  assert.ok(state.dockSettleOffset < 0, "arrival must begin with a small weighted compression");

  let positiveRebound = false;
  let signChanges = 0;
  let previousSign = Math.sign(state.dockSettleOffset);
  for (let frame = 0; frame < 120; frame += 1) {
    advanceTraversalFrame(state, { dt: 1 / 120, stations: [station] });
    const nextSign = Math.sign(state.dockSettleOffset);
    positiveRebound ||= state.dockSettleOffset > 0;
    if (nextSign && previousSign && nextSign !== previousSign) signChanges += 1;
    if (nextSign) previousSign = nextSign;
  }
  assert.ok(positiveRebound, "weighted settle must include one restrained rebound");
  assert.ok(signChanges <= 1, "critically damped settle must never loop or cartoon-bounce");
  assert.ok(Math.abs(state.dockSettleOffset) < 0.001, "settle must return quietly to permanent breathing");
  assert.equal(state.arrivalSequence, 1, "remaining docked must not spam arrival events");
  advanceTraversalFrame(state, { dt: 1 / 60, input: { x: 1, z: 0 }, stations: [station] });
  assert.equal(state.dockedId, null, "manual departure must clear docked semantics immediately");
}

{
  const state = routeState({ id: "field", x: 18, z: -3.25 });
  advanceTraversalFrame(state, { dt: 1 / 60 });
  const pose = getTraversalRenderPose(state);
  assert.ok(Number.isFinite(pose.x) && Number.isFinite(pose.z), "render interpolation must stay finite");
  assert.ok(pose.x <= state.x + 1e-9, "render interpolation may lag one fixed tick but never lead it");
}

{
  const start = createStationTraversalTarget("s2-kernel-core");
  const state = createTraversalState({ x: start.x, z: start.z });
  state.dockedId = "s2-kernel-core";
  state.nearbyId = "s2-kernel-core";
  routeTraversalToStation(state, "assembly-tool-locker");
  assert.equal(state.route?.id, "observatory-plaque", "S2 -> Assembly must bend through Plaque");
  assert.equal(state.routeQueue[0]?.id, "assembly-tool-locker");

  const stations = STATION_WORLD_SCHEMA.order.map(createStationTraversalTarget);
  const colliders = createStationCollisionSet();
  let routeTransitions = 0;
  let minimumIntermediateSpeed = Number.POSITIVE_INFINITY;
  let maximumHeadingChange = 0;
  let maximumHeadingContext = null;
  let previousRouteId = state.route?.id;
  let previousHeading = null;

  for (let frame = 0; frame < 30 * 120 && state.dockedId !== "assembly-tool-locker"; frame += 1) {
    const distanceToIntermediate = Math.hypot(
      state.x - STATION_WORLD_SCHEMA.stations["observatory-plaque"].dock.x,
      state.z - STATION_WORLD_SCHEMA.stations["observatory-plaque"].dock.z,
    );
    const speed = Math.hypot(state.vx, state.vz);
    if (distanceToIntermediate <= 1.25 && state.destinationId === "assembly-tool-locker") {
      minimumIntermediateSpeed = Math.min(minimumIntermediateSpeed, speed);
    }
    if (speed > 0.6) {
      const heading = Math.atan2(state.vz, state.vx);
      if (previousHeading !== null) {
        const wrapped = Math.atan2(
          Math.sin(heading - previousHeading),
          Math.cos(heading - previousHeading),
        );
        if (Math.abs(wrapped) > maximumHeadingChange) {
          maximumHeadingChange = Math.abs(wrapped);
          maximumHeadingContext = {
            collisionId: state.collisionId,
            frame,
            routeId: state.route?.id,
            speed,
            x: state.x,
            z: state.z,
          };
        }
      }
      previousHeading = heading;
    }

    advanceTraversalFrame(state, {
      colliders,
      dt: 1 / 120,
      stations,
    });
    if (previousRouteId && state.route?.id && previousRouteId !== state.route.id) {
      routeTransitions += 1;
    }
    previousRouteId = state.route?.id;
  }

  assert.equal(routeTransitions, 1, "the C8 route must advance through one intermediate waypoint");
  assert.ok(
    minimumIntermediateSpeed >= 1.5,
    `guided travel nearly stopped at Plaque (${minimumIntermediateSpeed.toFixed(3)} u/s)`,
  );
  assert.ok(
    maximumHeadingChange <= 0.09,
    `guided corner changed heading by ${(maximumHeadingChange * 180 / Math.PI).toFixed(2)} degrees in one fixed step: ${JSON.stringify(maximumHeadingContext)}`,
  );
  assert.equal(
    state.dockedId,
    "assembly-tool-locker",
    "continuous intermediate steering must still earn the final semantic dock",
  );
}

const worldSource = readFileSync(path.resolve("components/IglooWorld.jsx"), "utf8");
const sceneSource = readFileSync(path.resolve("components/IglooScene.jsx"), "utf8");
const mascotSource = readFileSync(path.resolve("components/TopologicalSealMascot.jsx"), "utf8");
const hudSource = readFileSync(path.resolve("components/IglooHud.jsx"), "utf8");

assert.match(worldSource, /advanceTraversalFrame/, "IglooWorld must consume the fixed-step controller");
assert.match(worldSource, /routeTraversalToStation/, "station selection must set traversal intent");
assert.match(worldSource, /traversalPoseRef/, "render pose must travel by ref without 60 Hz React state");
assert.doesNotMatch(worldSource, /axisTargetRef|depthTargetRef|function smoothDamp/, "legacy target chasing must be removed");
assert.match(sceneSource, /STATION_WORLD_SCHEMA/, "route and camera must share canonical station XZ");
assert.doesNotMatch(
  sceneSource,
  /STATION_DEPTH_SCALE|WORLD_LOOP_LENGTH|nearestLoopedX|position\[2\]\s*\*/,
  "route geometry must not wrap or scale canonical station coordinates",
);
assert.match(mascotSource, /traversalPoseRef/, "the mascot must consume the interpolated traversal pose directly");
assert.doesNotMatch(mascotSource, /velocity\.current\.lerp\(vectors\.desired/, "the primary seal must not apply a second translation chase");
assert.match(mascotSource, /dockSettleOffset/, "the mascot must consume the one-shot weighted dock settle");
assert.match(worldSource, /deriveTraversalPresentation/, "IglooWorld must publish the canonical presentation selector");
assert.match(worldSource, /traversalPresentation/, "IglooWorld must retain one shared semantic snapshot");
assert.match(hudSource, /presentation/, "HUD must consume the shared traversal presentation");
assert.doesNotMatch(
  worldSource,
  /setActiveArtifactId|setDestinationArtifactId/,
  "parallel React station authorities must not survive the presentation selector",
);
assert.match(worldSource, /IntersectionObserver/, "world visibility must be observer-driven");
assert.match(
  worldSource,
  /OFFSCREEN_GPU_RELEASE_DELAY_MS\s*=\s*(?:1\d{2}|2[0-5]\d)/,
  "GPU unmount must begin within 100-250 ms so Fiber's delayed context loss lands below 800 ms",
);
assert.match(worldSource, /data-world-suspended/, "suspension state must remain inspectable");
assert.match(worldSource, /data-docked-station/, "semantic docking must remain browser-inspectable");
assert.match(worldSource, /data-route-waypoint/, "guided waypoint continuity must remain browser-inspectable");
assert.match(worldSource, /data-traversal-speed/, "route speed must remain browser-inspectable");
assert.match(worldSource, /gpuStageMounted/, "Canvas lifetime must be distinct from renderer authorization");
assert.match(sceneSource, /worldActive/, "R3F scheduling must consume immediate world visibility");
assert.match(sceneSource, /:\s*"never"/, "offscreen R3F must use the zero-frame scheduling mode");

console.log("polar traversal contract passed: fixed-step, 3-4 m/s cruise, canonical presentation, semantic docking, offscreen suspension");
