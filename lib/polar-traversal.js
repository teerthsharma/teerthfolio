import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";

export const FIXED_STEP_SECONDS = 1 / 120;
export const MAX_SUBSTEPS = 8;
export const GUIDED_MAX_SPEED = 3.8;
export const MANUAL_MAX_SPEED = 4;

export const GUIDED_ACCELERATION = 14;
export const GUIDED_BRAKING = 18;
// A seal on snow glides; it does not stop dead. At 18 m/s^2 over a 4 m/s cap the
// character reached full speed in 0.22s and, at 24 m/s^2 braking, stopped in
// 0.17s — input mapped almost directly to position, which is why the world read
// as a cursor moving over a diorama rather than as a body being piloted through
// it. Spool-up is now 0.53s and a released key coasts for 1.25s.
export const MANUAL_ACCELERATION = 7.5;
/**
 * How fast the velocity vector may swing, in radians per second, once the seal
 * is actually moving. Without this the character has momentum along its heading
 * and none across it: a held key change swings the whole velocity vector at the
 * full 7.5 m/s^2, so the seal reverses direction in place while still reading as
 * gliding. A body moving through snow carves.
 *
 * Below MANUAL_PIVOT_SPEED the cap is released so a stationary or barely-moving
 * seal can still be aimed without a three-point turn.
 */
export const MANUAL_TURN_RATE = 2.4;
export const MANUAL_PIVOT_SPEED = 0.9;
export const MANUAL_BRAKING = 3.2;

export const NEARBY_ENTER_DISTANCE = 1.4;
export const NEARBY_EXIT_DISTANCE = 1.9;
export const DOCK_DISTANCE = 0.28;
export const DOCK_MAX_SPEED = 0.12;
export const DOCK_DWELL_SECONDS = 0.18;
export const PROXIMITY_FAR_DISTANCE = 6;
export const DOCK_SETTLE_OMEGA = 14;
export const SEAL_EFFECTIVE_MASS = 1.35;

const MAX_FRAME_SECONDS = 0.1;
const INPUT_EPSILON = 1e-4;
const POSITION_EPSILON = 0.012;
const STEP_EPSILON = 1e-10;
const PROXIMITY_RESPONSE = 8;
const COLLISION_EPSILON = 1e-9;
const IMPACT_DEBOUNCE_SECONDS = 0.42;
const MIN_IMPACT_SPEED = 0.08;
const GUIDED_LOOKAHEAD_DISTANCE = 2.6;
const GUIDED_WAYPOINT_SWITCH_DISTANCE = 0.72;
const GUIDED_CORNER_MIN_SPEED = 2.5;
const GUIDED_INTERMEDIATE_CLEARANCE = 1.35;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function distanceToStation(state, station) {
  return Math.hypot(station.x - state.x, station.z - state.z);
}

function proximityFromDistance(distance) {
  const normalized = clamp(
    (PROXIMITY_FAR_DISTANCE - distance) / (PROXIMITY_FAR_DISTANCE - DOCK_DISTANCE),
    0,
    1,
  );
  return normalized * normalized * (3 - 2 * normalized);
}

function accelerateVelocity(state, targetX, targetZ, maximumDelta) {
  const deltaX = targetX - state.vx;
  const deltaZ = targetZ - state.vz;
  const magnitude = Math.hypot(deltaX, deltaZ);
  if (magnitude <= maximumDelta || magnitude <= STEP_EPSILON) {
    state.vx = targetX;
    state.vz = targetZ;
    return;
  }
  const scale = maximumDelta / magnitude;
  state.vx += deltaX * scale;
  state.vz += deltaZ * scale;
}

function smoothstep01(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function intermediateRouteVelocity(
  state,
  offsetX,
  offsetZ,
  routeDistance,
  routeAimX,
  routeAimZ,
) {
  const next = state.routeQueue[0];
  const outgoingX = next.x - routeAimX;
  const outgoingZ = next.z - routeAimZ;
  const outgoingLength = Math.hypot(outgoingX, outgoingZ);
  const incomingDirectionX = offsetX / Math.max(routeDistance, STEP_EPSILON);
  const incomingDirectionZ = offsetZ / Math.max(routeDistance, STEP_EPSILON);
  const outgoingDirectionX = outgoingX / Math.max(outgoingLength, STEP_EPSILON);
  const outgoingDirectionZ = outgoingZ / Math.max(outgoingLength, STEP_EPSILON);
  const turnAlignment = clamp(
    incomingDirectionX * outgoingDirectionX +
      incomingDirectionZ * outgoingDirectionZ,
    -1,
    1,
  );
  const lookaheadBlend = smoothstep01(
    (GUIDED_LOOKAHEAD_DISTANCE - routeDistance) / GUIDED_LOOKAHEAD_DISTANCE,
  );
  const blend = lookaheadBlend * 0.84;
  let directionX =
    incomingDirectionX * (1 - blend) + outgoingDirectionX * blend;
  let directionZ =
    incomingDirectionZ * (1 - blend) + outgoingDirectionZ * blend;
  const directionLength = Math.hypot(directionX, directionZ);
  if (directionLength > STEP_EPSILON) {
    directionX /= directionLength;
    directionZ /= directionLength;
  }
  const cornerSpeed =
    GUIDED_CORNER_MIN_SPEED +
    (GUIDED_MAX_SPEED - GUIDED_CORNER_MIN_SPEED) * ((turnAlignment + 1) * 0.5);
  const desiredSpeed =
    GUIDED_MAX_SPEED + (cornerSpeed - GUIDED_MAX_SPEED) * lookaheadBlend;
  return {
    x: directionX * desiredSpeed,
    z: directionZ * desiredSpeed,
  };
}

function advanceDockSettle(state, stepSeconds) {
  const position = state.dockSettleOffset;
  const velocity = state.dockSettleVelocity;
  if (Math.abs(position) + Math.abs(velocity) < 1e-7) {
    state.dockSettleOffset = 0;
    state.dockSettleVelocity = 0;
    return;
  }
  const coefficient = velocity + DOCK_SETTLE_OMEGA * position;
  const decay = Math.exp(-DOCK_SETTLE_OMEGA * stepSeconds);
  const nextPosition = (position + coefficient * stepSeconds) * decay;
  const nextVelocity =
    (coefficient - DOCK_SETTLE_OMEGA * (position + coefficient * stepSeconds)) * decay;
  state.dockSettleOffset = nextPosition;
  state.dockSettleVelocity = nextVelocity;
}

function isColliderDoorwayPassage(x, z, doorway) {
  if (!doorway || !Array.isArray(doorway.centerXZ) || !Array.isArray(doorway.axisXZ)) {
    return false;
  }
  const tangentXZ = doorway.tangentXZ || [-doorway.axisXZ[1], doorway.axisXZ[0]];
  const dx = x - doorway.centerXZ[0];
  const dz = z - doorway.centerXZ[1];
  const axial = dx * doorway.axisXZ[0] + dz * doorway.axisXZ[1];
  const lateral = dx * tangentXZ[0] + dz * tangentXZ[1];
  return (
    axial >= -doorway.corridorBack &&
    axial <= doorway.corridorFront &&
    Math.abs(lateral) <= doorway.clearHalfWidth
  );
}

function resolveEllipticalCollisions(state, colliders) {
  const previousCollisionId = state.collisionId;
  let collisionId = null;
  let strongestInwardSpeed = 0;

  for (const collider of colliders || []) {
    if (
      !collider?.id ||
      !Number.isFinite(collider.centerX) ||
      !Number.isFinite(collider.centerZ) ||
      !Number.isFinite(collider.radiusX) ||
      !Number.isFinite(collider.radiusZ) ||
      collider.radiusX <= 0 ||
      collider.radiusZ <= 0
    ) {
      continue;
    }

    const rotation =
      ((collider.collisionRotationDegrees ?? collider.rotationDegrees ?? 0) *
        Math.PI) /
      180;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    let offsetX = state.x - collider.centerX;
    let offsetZ = state.z - collider.centerZ;
    let localX = offsetX * cosine + offsetZ * sine;
    let localZ = -offsetX * sine + offsetZ * cosine;
    if (isColliderDoorwayPassage(localX, localZ, collider.doorway)) continue;
    let normalizedX = localX / collider.radiusX;
    let normalizedZ = localZ / collider.radiusZ;
    let normalizedLength = Math.hypot(normalizedX, normalizedZ);
    if (normalizedLength >= 1 - COLLISION_EPSILON) continue;

    if (normalizedLength <= COLLISION_EPSILON) {
      offsetX = state.previousX - collider.centerX;
      offsetZ = state.previousZ - collider.centerZ;
      localX = offsetX * cosine + offsetZ * sine;
      localZ = -offsetX * sine + offsetZ * cosine;
      normalizedX = localX / collider.radiusX;
      normalizedZ = localZ / collider.radiusZ;
      normalizedLength = Math.hypot(normalizedX, normalizedZ);
      if (normalizedLength <= COLLISION_EPSILON) {
        normalizedX = state.vx <= 0 ? 1 : -1;
        normalizedZ = 0;
        normalizedLength = 1;
        localX = normalizedX * collider.radiusX;
        localZ = 0;
      }
    }

    const projectionScale = 1 / normalizedLength;
    const projectedLocalX = localX * projectionScale;
    const projectedLocalZ = localZ * projectionScale;
    state.x = collider.centerX + projectedLocalX * cosine - projectedLocalZ * sine;
    state.z = collider.centerZ + projectedLocalX * sine + projectedLocalZ * cosine;

    const localGradientX = projectedLocalX / (collider.radiusX ** 2);
    const localGradientZ = projectedLocalZ / (collider.radiusZ ** 2);
    const gradientX = localGradientX * cosine - localGradientZ * sine;
    const gradientZ = localGradientX * sine + localGradientZ * cosine;
    const gradientLength = Math.max(
      COLLISION_EPSILON,
      Math.hypot(gradientX, gradientZ),
    );
    const normalX = gradientX / gradientLength;
    const normalZ = gradientZ / gradientLength;
    const normalVelocity = state.vx * normalX + state.vz * normalZ;
    const inwardSpeed = Math.max(0, -normalVelocity);
    if (normalVelocity < 0) {
      state.vx -= normalVelocity * normalX;
      state.vz -= normalVelocity * normalZ;
    }

    collisionId = collider.id;
    strongestInwardSpeed = Math.max(strongestInwardSpeed, inwardSpeed);
  }

  state.collisionCooldown = Math.max(
    0,
    state.collisionCooldown - FIXED_STEP_SECONDS,
  );
  if (
    collisionId &&
    collisionId !== previousCollisionId &&
    strongestInwardSpeed >= MIN_IMPACT_SPEED &&
    state.collisionCooldown <= 0
  ) {
    state.lastImpactStrength = clamp(
      strongestInwardSpeed / (MANUAL_MAX_SPEED * 0.72),
      0.04,
      1,
    );
    state.impactSequence += 1;
    state.collisionCooldown = IMPACT_DEBOUNCE_SECONDS;
  }
  state.collisionId = collisionId;
}

function updateProximityAndDocking(state, stations, stepSeconds) {
  const previouslyDockedId = state.dockedId;
  const candidates = stations?.length ? stations : state.route ? [state.route] : [];
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const station of candidates) {
    const distance = distanceToStation(state, station);
    if (distance < nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }
  let nearby = state.nearbyId
    ? candidates.find((station) => station.id === state.nearbyId) || null
    : null;

  if (nearby && distanceToStation(state, nearby) > NEARBY_EXIT_DISTANCE) {
    nearby = null;
  }

  if (!nearby && candidates.length) {
    if (nearestDistance <= NEARBY_ENTER_DISTANCE) nearby = nearest;
  }

  state.nearbyId = nearby?.id || null;
  const destination = state.destinationId
    ? candidates.find((station) => station.id === state.destinationId) || state.route
    : null;
  const proximityStation = destination || nearby || nearest;
  const proximityTarget = proximityStation
    ? proximityFromDistance(distanceToStation(state, proximityStation))
    : 0;
  const proximityAlpha = 1 - Math.exp(-PROXIMITY_RESPONSE * stepSeconds);
  state.stationProximity += (proximityTarget - state.stationProximity) * proximityAlpha;
  state.stationProximity = clamp(state.stationProximity, 0, 1);
  state.proximityStationId = proximityStation?.id || null;
  if (!nearby) {
    state.dockDwell = 0;
    state.dockedId = null;
    return;
  }

  const distance = distanceToStation(state, nearby);
  const speed = Math.hypot(state.vx, state.vz);
  state.approachPeakSpeed = Math.max(state.approachPeakSpeed, speed);
  if (distance <= DOCK_DISTANCE && speed <= DOCK_MAX_SPEED) {
    state.dockDwell += stepSeconds;
    if (state.dockDwell + STEP_EPSILON >= DOCK_DWELL_SECONDS) {
      state.dockedId = nearby.id;
      if (state.destinationId === nearby.id) {
        state.destinationId = null;
        state.route = null;
      }
      state.vx = 0;
      state.vz = 0;
      state.stationProximity = 1;
      state.proximityStationId = nearby.id;
      if (previouslyDockedId !== nearby.id) {
        const momentum = SEAL_EFFECTIVE_MASS * Math.max(speed, state.approachPeakSpeed);
        const arrivalStrength = clamp(
          momentum / (SEAL_EFFECTIVE_MASS * GUIDED_MAX_SPEED),
          0.08,
          1,
        );
        const compression = 0.012 + arrivalStrength * 0.026;
        const reboundImpulse = SEAL_EFFECTIVE_MASS * compression * DOCK_SETTLE_OMEGA * 2.1;
        state.arrivalSequence += 1;
        state.arrivalStationId = nearby.id;
        state.arrivalStrength = arrivalStrength;
        state.dockSettleOffset = -compression;
        state.dockSettleVelocity = reboundImpulse / SEAL_EFFECTIVE_MASS;
      }
    }
  } else {
    state.dockDwell = 0;
    if (state.dockedId !== nearby.id) state.dockedId = null;
  }
}

function stepTraversal(state, input, stations, colliders) {
  advanceDockSettle(state, FIXED_STEP_SECONDS);
  state.previousX = state.x;
  state.previousZ = state.z;

  const rawInputX = finite(input?.x);
  const rawInputZ = finite(input?.z);
  const rawInputLength = Math.hypot(rawInputX, rawInputZ);
  const hasManualInput = rawInputLength > INPUT_EPSILON;

  if (hasManualInput) {
    state.route = null;
    state.routeQueue = [];
    state.destinationId = null;
    state.dockDwell = 0;
    state.dockedId = null;
    state.approachPeakSpeed = 0;
  }

  let targetVelocityX = 0;
  let targetVelocityZ = 0;
  let acceleration = MANUAL_BRAKING;
  let routeDistance = null;
  let routeAimX = null;
  let routeAimZ = null;

  if (hasManualInput) {
    const inputScale = MANUAL_MAX_SPEED / rawInputLength;
    targetVelocityX = rawInputX * inputScale;
    targetVelocityZ = rawInputZ * inputScale;
    acceleration = MANUAL_ACCELERATION;
    // Steering, not teleporting the heading. The target keeps its speed and is
    // rotated toward the input by at most MANUAL_TURN_RATE this step, so a
    // moving seal arcs into a new direction instead of pivoting inside its own
    // footprint. Guided routing never reaches here.
    const currentSpeed = Math.hypot(state.vx, state.vz);
    if (currentSpeed > MANUAL_PIVOT_SPEED) {
      const currentAngle = Math.atan2(state.vz, state.vx);
      const targetAngle = Math.atan2(targetVelocityZ, targetVelocityX);
      let swing = targetAngle - currentAngle;
      swing = Math.atan2(Math.sin(swing), Math.cos(swing));
      const maximumSwing = MANUAL_TURN_RATE * FIXED_STEP_SECONDS;
      if (Math.abs(swing) > maximumSwing) {
        const steered = currentAngle + Math.sign(swing) * maximumSwing;
        targetVelocityX = Math.cos(steered) * MANUAL_MAX_SPEED;
        targetVelocityZ = Math.sin(steered) * MANUAL_MAX_SPEED;
      }
    }
  } else if (state.route) {
    routeAimX = state.route.x;
    routeAimZ = state.route.z;
    if (state.routeQueue.length) {
      const stationWorld = STATION_WORLD_SCHEMA.stations[state.route.id];
      if (stationWorld) {
        const radialX = state.route.x - stationWorld.center.x;
        const radialZ = state.route.z - stationWorld.center.z;
        const radialLength = Math.max(STEP_EPSILON, Math.hypot(radialX, radialZ));
        routeAimX += (radialX / radialLength) * GUIDED_INTERMEDIATE_CLEARANCE;
        routeAimZ += (radialZ / radialLength) * GUIDED_INTERMEDIATE_CLEARANCE;
      }
    }
    const offsetX = routeAimX - state.x;
    const offsetZ = routeAimZ - state.z;
    routeDistance = Math.hypot(offsetX, offsetZ);
    if (routeDistance > POSITION_EPSILON) {
      if (state.routeQueue.length) {
        const intermediateVelocity = intermediateRouteVelocity(
          state,
          offsetX,
          offsetZ,
          routeDistance,
          routeAimX,
          routeAimZ,
        );
        targetVelocityX = intermediateVelocity.x;
        targetVelocityZ = intermediateVelocity.z;
      } else {
        const stoppingSpeed = Math.sqrt(
          2 * GUIDED_BRAKING * Math.max(0, routeDistance - POSITION_EPSILON),
        );
        const desiredSpeed = Math.min(GUIDED_MAX_SPEED, stoppingSpeed);
        targetVelocityX = (offsetX / routeDistance) * desiredSpeed;
        targetVelocityZ = (offsetZ / routeDistance) * desiredSpeed;
      }
    }
    const currentSpeed = Math.hypot(state.vx, state.vz);
    const targetSpeed = Math.hypot(targetVelocityX, targetVelocityZ);
    acceleration = targetSpeed + STEP_EPSILON < currentSpeed
      ? GUIDED_BRAKING
      : GUIDED_ACCELERATION;
  }

  accelerateVelocity(
    state,
    targetVelocityX,
    targetVelocityZ,
    acceleration * FIXED_STEP_SECONDS,
  );

  const beforeX = state.x;
  const beforeZ = state.z;
  state.x += state.vx * FIXED_STEP_SECONDS;
  state.z += state.vz * FIXED_STEP_SECONDS;

  if (state.route && routeDistance !== null) {
    const afterDistance = Math.hypot(routeAimX - state.x, routeAimZ - state.z);
    const advancedDistance = Math.hypot(state.x - beforeX, state.z - beforeZ);
    if (
      !state.routeQueue.length &&
      afterDistance > routeDistance &&
      advancedDistance + STEP_EPSILON >= routeDistance
    ) {
      state.x = state.route.x;
      state.z = state.route.z;
      state.vx = 0;
      state.vz = 0;
    }
    const next = state.routeQueue[0];
    const outgoingX = next ? next.x - routeAimX : 0;
    const outgoingZ = next ? next.z - routeAimZ : 0;
    const passedWaypoint = next
      ? (state.x - routeAimX) * outgoingX +
          (state.z - routeAimZ) * outgoingZ >=
        0
      : false;
    if (
      state.routeQueue.length &&
      (afterDistance <= GUIDED_WAYPOINT_SWITCH_DISTANCE || passedWaypoint)
    ) {
      state.route = state.routeQueue.shift();
    }
  }

  resolveEllipticalCollisions(state, colliders);
  updateProximityAndDocking(state, stations, FIXED_STEP_SECONDS);
  state.simulationTime += FIXED_STEP_SECONDS;
}

export function createTraversalState({ x = 0, z = 0, vx = 0, vz = 0 } = {}) {
  const safeX = finite(x);
  const safeZ = finite(z);
  return {
    accumulator: 0,
    approachPeakSpeed: 0,
    arrivalSequence: 0,
    arrivalStationId: null,
    arrivalStrength: 0,
    collisionCooldown: 0,
    collisionId: null,
    destinationId: null,
    dockDwell: 0,
    dockSettleOffset: 0,
    dockSettleVelocity: 0,
    dockedId: null,
    impactSequence: 0,
    lastImpactStrength: 0,
    nearbyId: null,
    previousX: safeX,
    previousZ: safeZ,
    proximityStationId: null,
    route: null,
    routeQueue: [],
    simulationTime: 0,
    stationProximity: 0,
    vx: finite(vx),
    vz: finite(vz),
    x: safeX,
    z: safeZ,
  };
}

export function createStationTraversalTarget(stationOrId) {
  const id = typeof stationOrId === "string" ? stationOrId : stationOrId?.id;
  const station = STATION_WORLD_SCHEMA.stations[id];
  if (!station) return null;
  return {
    id,
    x: station.dock.x,
    z: station.dock.z,
  };
}

export function createStationCollisionSet() {
  return STATION_WORLD_SCHEMA.order.map((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    const collider = {
      centerX: station.center.x,
      centerZ: station.center.z,
      doorway: station.collider.doorway,
      id,
      kind: station.collider.kind || "ellipse",
      radiusX: station.collider.radiusX,
      radiusZ: station.collider.radiusZ,
      rotationDegrees: station.collider.rotationDegrees,
      traversalY: station.collider.traversalY,
    };
    if (Number.isFinite(station.collider.collisionRotationDegrees)) {
      Object.defineProperty(collider, "collisionRotationDegrees", {
        value: station.collider.collisionRotationDegrees,
      });
    }
    return collider;
  });
}

function presentationPointXZ(value) {
  if (Array.isArray(value)) {
    return { x: finite(value[0]), z: finite(value[1]) };
  }
  return {
    x: finite(value?.x),
    z: finite(value?.z),
  };
}

function presentationStationList(stations) {
  if (Array.isArray(stations)) return stations;
  if (Array.isArray(stations?.order) && stations?.stations) {
    return stations.order.map((id) => ({ id, ...stations.stations[id] }));
  }
  if (stations && typeof stations === "object") {
    return Object.entries(stations).map(([id, station]) => ({ id, ...station }));
  }
  return [];
}

function presentationStationPoint(station) {
  if (!station) return null;
  const point = station.dock || station.positionXZ || station;
  if (Array.isArray(point)) {
    return Number.isFinite(point[0]) && Number.isFinite(point[1])
      ? { x: point[0], z: point[1] }
      : null;
  }
  return Number.isFinite(point?.x) && Number.isFinite(point?.z)
    ? { x: point.x, z: point.z }
    : null;
}

/**
 * Derive the semantic state consumed by every traversal presentation surface.
 * Physical `dockedId` remains a live contact signal; `dockedStationId` is the
 * last station whose evidence was earned by a completed arrival.
 */
export function deriveTraversalPresentation(snapshot = {}, stations = []) {
  const stationList = presentationStationList(stations);
  const position = presentationPointXZ(snapshot.positionXZ);
  const velocity = presentationPointXZ(snapshot.velocityXZ);
  const destinationId =
    typeof snapshot.destinationId === "string" ? snapshot.destinationId : null;
  const dockedStationId =
    typeof snapshot.dockedStationId === "string" ? snapshot.dockedStationId : null;

  let nearestStationId =
    typeof snapshot.nearestStationId === "string" ? snapshot.nearestStationId : null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  if (!nearestStationId) {
    for (const station of stationList) {
      const point = presentationStationPoint(station);
      if (!station?.id || !point) continue;
      const distance = Math.hypot(point.x - position.x, point.z - position.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStationId = station.id;
      }
    }
  }

  const destinationStation = stationList.find((station) => station?.id === destinationId);
  const destinationPoint = presentationStationPoint(destinationStation);
  const destinationDistance = destinationPoint
    ? Math.hypot(destinationPoint.x - position.x, destinationPoint.z - position.z)
    : Number.POSITIVE_INFINITY;
  const speed = Math.hypot(velocity.x, velocity.z);
  const routeActive = Boolean(snapshot.routeActive);
  const arrived = Boolean(
    destinationId &&
      destinationId === dockedStationId &&
      !routeActive &&
      speed <= DOCK_MAX_SPEED,
  );

  const explicitPhase = ["idle", "moving", "docking", "arrived"].includes(
    snapshot.phase,
  )
    ? snapshot.phase
    : null;
  let phase = explicitPhase;
  if (!phase && arrived) {
    phase = "arrived";
  } else if (!phase && destinationId && (routeActive || speed > DOCK_MAX_SPEED)) {
    phase = destinationDistance <= NEARBY_ENTER_DISTANCE ? "docking" : "moving";
  } else if (!phase && speed > DOCK_MAX_SPEED) {
    phase = "moving";
  } else if (!phase) {
    phase = "idle";
  }

  return {
    destinationId,
    dockedStationId,
    nearestStationId,
    phase,
    progress: clamp(finite(snapshot.progress), 0, 1),
    isArrived: phase === "arrived",
  };
}

/**
 * Bind world exclusivity to the live physical dock signal. Destination intent
 * and previously earned evidence may outlive a dock, but neither may keep a
 * full-detail station mounted after departure.
 */
export function deriveLiveTraversalPresentation(
  traversal = {},
  {
    pose = getTraversalRenderPose(traversal),
    progress = 0,
    selectedDestinationId = traversal?.destinationId || null,
    stations = [],
  } = {},
) {
  return deriveTraversalPresentation(
    {
      destinationId: selectedDestinationId,
      dockedStationId:
        typeof traversal?.dockedId === "string" ? traversal.dockedId : null,
      positionXZ: { x: pose.x, z: pose.z },
      progress,
      routeActive: Boolean(traversal?.destinationId),
      velocityXZ: { x: pose.vx, z: pose.vz },
    },
    stations,
  );
}

export function didPhysicalDockOwnershipChange(presentation = {}, traversal = {}) {
  const presentedDockId =
    typeof presentation?.dockedStationId === "string"
      ? presentation.dockedStationId
      : null;
  const physicalDockId =
    typeof traversal?.dockedId === "string" ? traversal.dockedId : null;
  return presentedDockId !== physicalDockId;
}

function routeLength(ids) {
  let length = 0;
  for (let index = 1; index < ids.length; index += 1) {
    const previous = createStationTraversalTarget(ids[index - 1]);
    const current = createStationTraversalTarget(ids[index]);
    length += Math.hypot(current.x - previous.x, current.z - previous.z);
  }
  return length;
}

function routeDirection(startIndex, destinationIndex, direction) {
  const order = STATION_WORLD_SCHEMA.order;
  const ids = [order[startIndex]];
  let index = startIndex;
  while (index !== destinationIndex) {
    index = (index + direction + order.length) % order.length;
    ids.push(order[index]);
  }
  return ids;
}

function nearestStationId(state) {
  let nearestId = STATION_WORLD_SCHEMA.order[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const id of STATION_WORLD_SCHEMA.order) {
    const target = createStationTraversalTarget(id);
    const distance = Math.hypot(target.x - state.x, target.z - state.z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = id;
    }
  }
  return nearestId;
}

function shortestStationPath(startId, destinationId) {
  if (startId === destinationId) return [];
  const order = STATION_WORLD_SCHEMA.order;
  const startIndex = order.indexOf(startId);
  const destinationIndex = order.indexOf(destinationId);
  const clockwise = routeDirection(startIndex, destinationIndex, 1);
  const counterClockwise = routeDirection(startIndex, destinationIndex, -1);
  const selected =
    routeLength(clockwise) <= routeLength(counterClockwise)
      ? clockwise
      : counterClockwise;
  return selected.slice(1);
}

export function routeTraversalToStation(state, stationOrId) {
  if (!state) return state;
  const requestedId =
    typeof stationOrId === "string" ? stationOrId : stationOrId?.id;
  const canonicalTarget = createStationTraversalTarget(requestedId);
  const customTarget =
    !canonicalTarget &&
    stationOrId?.id &&
    Number.isFinite(stationOrId.x) &&
    Number.isFinite(stationOrId.z)
      ? { id: stationOrId.id, x: stationOrId.x, z: stationOrId.z }
      : null;
  const destination = canonicalTarget || customTarget;
  if (!destination) {
    return state;
  }

  let waypoints = [destination];
  if (canonicalTarget) {
    const startId =
      (STATION_WORLD_SCHEMA.stations[state.dockedId] && state.dockedId) ||
      (STATION_WORLD_SCHEMA.stations[state.nearbyId] && state.nearbyId) ||
      nearestStationId(state);
    const pathIds = shortestStationPath(startId, destination.id);
    const startTarget = createStationTraversalTarget(startId);
    const needsStartAnchor =
      Math.hypot(startTarget.x - state.x, startTarget.z - state.z) >
      NEARBY_EXIT_DISTANCE;
    const resolvedIds = needsStartAnchor ? [startId, ...pathIds] : pathIds;
    waypoints = (resolvedIds.length ? resolvedIds : [destination.id]).map((id) =>
      createStationTraversalTarget(id),
    );
  }

  state.route = waypoints[0];
  state.routeQueue = waypoints.slice(1);
  state.destinationId = destination.id;
  state.dockDwell = 0;
  state.approachPeakSpeed = 0;
  if (state.dockedId !== destination.id) state.dockedId = null;
  return state;
}

export function advanceTraversalFrame(
  state,
  { colliders = null, dt = 0, input = null, stations = null } = {},
) {
  const frameStartX = state.x;
  const frameStartZ = state.z;
  const requestedDt = Math.max(0, finite(dt));
  const acceptedDt = Math.min(requestedDt, MAX_FRAME_SECONDS);
  const maximumAccumulation = FIXED_STEP_SECONDS * MAX_SUBSTEPS;
  const nextAccumulator = state.accumulator + acceptedDt;
  const frameWasCapped =
    requestedDt > MAX_FRAME_SECONDS || nextAccumulator > maximumAccumulation + STEP_EPSILON;

  state.accumulator = Math.min(nextAccumulator, maximumAccumulation);
  let steps = Math.min(
    MAX_SUBSTEPS,
    Math.floor((state.accumulator + STEP_EPSILON) / FIXED_STEP_SECONDS),
  );
  const completedSteps = steps;
  while (steps > 0) {
    stepTraversal(state, input, stations, colliders);
    state.accumulator -= FIXED_STEP_SECONDS;
    steps -= 1;
  }
  if (state.accumulator < STEP_EPSILON) state.accumulator = 0;

  return {
    frameDistance: Math.hypot(state.x - frameStartX, state.z - frameStartZ),
    frameWasCapped,
    steps: completedSteps,
  };
}

export function getTraversalRenderPose(state) {
  const alpha = clamp(state.accumulator / FIXED_STEP_SECONDS, 0, 1);
  return {
    vx: state.vx,
    vz: state.vz,
    x: state.previousX + (state.x - state.previousX) * alpha,
    z: state.previousZ + (state.z - state.previousZ) * alpha,
  };
}
