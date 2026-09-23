import { polarGroundHeight } from "./polar-ground.js";
import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TRAVERSAL_SPEED_REFERENCE = 5.8;

// The mid and far bands are monuments — cairns and bergs — and stay rare on
// purpose. The near band is not a monument, it is ground: wind-cut sastrugi that
// the world is supposed to be covered in. Budgeting it like a monument left 50
// slivers along one ribbon and a playable field that reads as empty vinyl. Each
// band is a single instanced draw over a ~15-vertex geometry, so the near count
// is bounded by how much ground there is to cover, not by draw cost.
export const WORLD_DRESSING_BUDGET = Object.freeze({
  // Low's ground cover is sized like the tier it ships to, not like a fallback.
  // The measured quality ladder settles here on any machine that cannot hold
  // 60fps at high, so this is the field most visitors stand in — and at 180 the
  // sheet read as empty vinyl, which is the exact failure the whole band was
  // raised from 50 to fix. All three tiers are one instanced draw over a
  // ~15-vertex geometry; the dressing measures 0.8ms of a 15ms frame at high's
  // 640, so the cost of 340 here is not a tier decision worth making. It stays
  // under medium's 360 so the quality ladder is still a ladder.
  //
  // Medium was raised to high's 640/20/10 twice and put back twice. The reasoning that made
  // medium carry high's terrain detail — the world is fill-bound, so content is
  // close to free — does not survive contact with this table: measured paired
  // against a frozen clock, the denser field bought +0.2% mean gradient for
  // +0.4ms of frame, against +2.9% for no measurable cost when the same argument
  // was applied to terrain segments and shader detail. The low tier read -0.001
  // in the same run as a null control. Sastrugi at this scale is too small and
  // too low-contrast to register at the density that matters, so the extra
  // instances are cost without a picture.
  //
  // The second attempt measured it at a station instead, on the reasoning that
  // the dock parks the traveller with most of the near band behind the camera,
  // and read +5.1%. That figure is withdrawn: auto-travel does not arrive at a
  // deterministic pose, and the two arms had stopped at different distances from
  // the station centre, so the comparison measured the walk as much as the
  // change. probe:frame-detail now records the arrival pose and refuses a
  // comparison whose arms stopped more than 0.35 units apart — a null control of
  // one build against itself stopped 0.43 apart and was correctly refused.
  low: Object.freeze({ near: 340, mid: 10, far: 4, total: 354, drawCalls: 3 }),
  medium: Object.freeze({ near: 360, mid: 14, far: 7, total: 381, drawCalls: 3 }),
  high: Object.freeze({ near: 640, mid: 20, far: 10, total: 670, drawCalls: 3 }),
});

export const WORLD_DRESSING_COLOR_PROFILE = Object.freeze({
  ambientFloor: 0.8,
  farFrostMix: 0.94,
  midFrostMix: 0.68,
  nearFrostMix: 0.9,
});

const BAND_PROFILES = Object.freeze({
  near: Object.freeze({
    height: [-0.025, -0.008],
    // Sastrugi is a field, not a kerb. The old 0.85-2.35 ribbon hugged the route
    // centreline, so everything either side of the driving line was bare. The
    // outer edge reaches most of the way to the mid-band cairns; placements that
    // land in a station hero volume are still dropped by the protection test.
    lateral: [0.9, 9.5],
    // Relief the eye can actually find. A 0.08-0.16 ridge on a field whose hero
    // building stands 3.25 units tall is a sub-pixel scratch: the instances were
    // being drawn and were invisible. These stay well inside the 0.34 aspect
    // ceiling that keeps sastrugi wind-cut ground rather than standing rocks —
    // worst case is 0.42 / (2 x 0.7) = 0.30.
    // Wide and low, not tall and thin. Raising only the vertical scale turned
    // each sastrugi into a near-vertical fin whose faces point sideways, away
    // from an overhead key, so a dense band of them read as dark blue shards
    // stuck in white. Growing the footprint instead turns the lit top face
    // toward the light, which is how wind-carved drift actually reads.
    scaleX: [0.45, 0.95],
    scaleY: [0.12, 0.22],
    scaleZ: [1, 2.1],
  }),
  mid: Object.freeze({
    height: [-0.035, -0.012],
    lateral: [3.2, 6.0],
    scaleX: [0.34, 0.52],
    scaleY: [0.68, 1.08],
    scaleZ: [0.34, 0.52],
  }),
  far: Object.freeze({
    height: [-0.16, -0.085],
    lateral: [12.5, 20.5],
    scaleX: [0.85, 1.3],
    scaleY: [1.05, 1.65],
    scaleZ: [0.75, 1.18],
  }),
});

function anchorGeometryToTerrain(geometry) {
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox.min.y, 0);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSastrugiGeometry() {
  const sections = [
    { height: 0.02, ridgeX: -0.08, width: 0.025, z: -1 },
    { height: 0.48, ridgeX: -0.06, width: 0.34, z: -0.58 },
    { height: 1, ridgeX: 0.04, width: 0.52, z: 0 },
    { height: 0.4, ridgeX: 0.09, width: 0.29, z: 0.58 },
    { height: 0.015, ridgeX: 0.13, width: 0.02, z: 1 },
  ];
  const vertices = [];
  const indices = [];

  for (const section of sections) {
    vertices.push(
      section.ridgeX - section.width,
      0,
      section.z,
      section.ridgeX,
      section.height,
      section.z + section.height * 0.035,
      section.ridgeX + section.width,
      0,
      section.z,
    );
  }
  for (let section = 0; section < sections.length - 1; section += 1) {
    const current = section * 3;
    const next = current + 3;
    indices.push(
      current,
      current + 1,
      next,
      current + 1,
      next + 1,
      next,
      current + 1,
      current + 2,
      next + 1,
      current + 2,
      next + 2,
      next + 1,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.form = "wind-carved tapered ridge";
  return anchorGeometryToTerrain(geometry);
}

function createSignalCairnGeometry() {
  const foot = new THREE.CylinderGeometry(0.33, 0.4, 0.18, 7).toNonIndexed();
  foot.translate(0, 0.09, 0);
  const mast = new THREE.CylinderGeometry(0.052, 0.082, 0.88, 7).toNonIndexed();
  mast.translate(0, 0.59, 0);
  const signalRing = new THREE.TorusGeometry(0.3, 0.032, 4, 12).toNonIndexed();
  signalRing.rotateX(Math.PI / 2);
  signalRing.translate(0, 0.98, 0);
  const lens = new THREE.OctahedronGeometry(0.22, 0);
  lens.scale(1, 1.28, 1);
  lens.translate(0, 1.18, 0);
  const geometry = mergeGeometries([foot, mast, signalRing, lens], false);
  foot.dispose();
  mast.dispose();
  signalRing.dispose();
  lens.dispose();
  geometry.computeVertexNormals();
  return anchorGeometryToTerrain(geometry);
}

function createTabularBergGeometry() {
  const geometry = new THREE.CylinderGeometry(0.2, 1.05, 1.6, 5, 2, false, 0.36);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const sourceX = positions.getX(index);
    const height = positions.getY(index) + 0.8;
    const sourceZ = positions.getZ(index);
    const normalizedHeight = height / 1.6;
    const windLean = normalizedHeight * normalizedHeight;
    const frontAsymmetry = sourceZ > 0 ? 0.72 : 1.04;
    const sideAsymmetry = sourceX > 0 ? 0.84 : 1.08;
    positions.setXYZ(
      index,
      sourceX * sideAsymmetry + windLean * 0.28,
      height,
      sourceZ * frontAsymmetry - windLean * 0.12,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.userData.form = "fractured faceted nunatak";
  return anchorGeometryToTerrain(geometry);
}

export function createWorldDressingGeometries() {
  return {
    far: createTabularBergGeometry(),
    mid: createSignalCairnGeometry(),
    near: createSastrugiGeometry(),
  };
}

const HERO_PROTECTION_BY_BAND = Object.freeze({
  near: Object.freeze({
    back: 7.4,
    ellipsePadding: 1.3,
    front: 4.8,
    lateral: 5.8,
  }),
  mid: Object.freeze({
    back: 8.8,
    ellipsePadding: 1.9,
    front: 5.8,
    lateral: 6.4,
  }),
  far: Object.freeze({
    back: 10.5,
    ellipsePadding: 3.1,
    front: 7.4,
    lateral: 6.4,
  }),
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function hashString(value) {
  let hash = 2166136261;
  const string = String(value);
  for (let index = 0; index < string.length; index += 1) {
    hash ^= string.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function lerp(minimum, maximum, progress) {
  return minimum + (maximum - minimum) * progress;
}

function normalizeStations(artifacts) {
  const artifactById = new Map((artifacts || []).map((artifact) => [artifact.id, artifact]));
  return STATION_WORLD_SCHEMA.order.map((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    return {
      accent: artifactById.get(id)?.accent || "#63DCE5",
      id,
      x: station.center.x,
      z: station.center.z,
    };
  });
}

function insideExpandedCollider(x, z, station, padding) {
  const radians = (-station.collider.rotationDegrees * Math.PI) / 180;
  const deltaX = x - station.center.x;
  const deltaZ = z - station.center.z;
  const localX = deltaX * Math.cos(radians) - deltaZ * Math.sin(radians);
  const localZ = deltaX * Math.sin(radians) + deltaZ * Math.cos(radians);
  const radiusX = station.collider.radiusX + padding;
  const radiusZ = station.collider.radiusZ + padding;
  return (localX / radiusX) ** 2 + (localZ / radiusZ) ** 2 <= 1;
}

/**
 * Keep pooled scenery out of the authored monument silhouette and the horizontal
 * footprint of its accepted hero view. This is a world-space constraint, so the
 * same deterministic layout stays safe through camera damping and route returns.
 */
export function isWorldDressingPlacementProtected(position, band = "near") {
  const profile = HERO_PROTECTION_BY_BAND[band] || HERO_PROTECTION_BY_BAND.near;
  const x = finite(position?.[0]);
  const z = finite(position?.[2]);

  return STATION_WORLD_SCHEMA.order.some((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    if (insideExpandedCollider(x, z, station, profile.ellipsePadding)) return true;

    const azimuth = (station.camera.azimuthDegrees * Math.PI) / 180;
    const towardCameraX = Math.sin(azimuth);
    const towardCameraZ = Math.cos(azimuth);
    const deltaX = x - station.center.x;
    const deltaZ = z - station.center.z;
    const cameraDepth = deltaX * towardCameraX + deltaZ * towardCameraZ;
    const viewLateral = Math.abs(
      deltaX * -towardCameraZ + deltaZ * towardCameraX,
    );
    const perspectiveWidth = profile.lateral + Math.max(0, -cameraDepth) * 0.12;
    return (
      cameraDepth >= -profile.back &&
      cameraDepth <= profile.front &&
      viewLateral <= perspectiveWidth
    );
  });
}

function buildRoute(stations) {
  if (stations.length < 2) return { looped: false, segments: [], totalLength: 0 };
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const segments = [];
  let totalLength = 0;

  for (const edge of STATION_WORLD_SCHEMA.edges) {
    const start = stationById.get(edge.from);
    const end = stationById.get(edge.to);
    if (!start || !end) continue;
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    segments.push({ end, length, start, startDistance: totalLength });
    totalLength += length;
  }

  return {
    looped: true,
    segments: segments.filter((segment) => segment.length > 1e-6),
    totalLength,
  };
}

function sampleRoute(route, requestedDistance) {
  if (!route.segments.length || route.totalLength <= 0) return null;
  const distance = ((requestedDistance % route.totalLength) + route.totalLength) % route.totalLength;
  const segment =
    route.segments.find(
      (candidate) => distance <= candidate.startDistance + candidate.length,
    ) || route.segments[route.segments.length - 1];
  const local = clamp((distance - segment.startDistance) / segment.length, 0, 1);
  const tangentX = (segment.end.x - segment.start.x) / segment.length;
  const tangentZ = (segment.end.z - segment.start.z) / segment.length;
  return {
    accent: local < 0.5 ? segment.start.accent : segment.end.accent,
    anchorId: local < 0.5 ? segment.start.id : segment.end.id,
    tangentX,
    tangentZ,
    x: lerp(segment.start.x, segment.end.x, local),
    z: lerp(segment.start.z, segment.end.z, local),
  };
}

function buildBand(route, band, count) {
  const profile = BAND_PROFILES[band];
  const averageCadence = route.totalLength / Math.max(1, count);
  const placements = [];

  const maximumCandidates = Math.max(count * 64, 64);
  for (
    let candidateIndex = 0;
    candidateIndex < maximumCandidates && placements.length < count;
    candidateIndex += 1
  ) {
    const seed = hashString(
      `${band}:${candidateIndex}:${route.segments[candidateIndex % route.segments.length]?.start.id}`,
    );
    const cadenceJitter = (randomUnit(seed + 1) - 0.5) * averageCadence * 0.34;
    const routeDistance =
      ((candidateIndex + 0.5) / count) * route.totalLength + cadenceJitter;
    const sample = sampleRoute(route, routeDistance);
    if (!sample) continue;
    const side = (candidateIndex + (seed & 1)) % 2 === 0 ? -1 : 1;
    const lateral = lerp(profile.lateral[0], profile.lateral[1], randomUnit(seed + 2)) * side;
    const normalX = -sample.tangentZ;
    const normalZ = sample.tangentX;
    const yawNoise = (randomUnit(seed + 3) - 0.5) * (band === "far" ? 0.62 : 0.24);
    const placementX = sample.x + normalX * lateral;
    const placementZ = sample.z + normalZ * lateral;
    const upright = band === "far" || band === "mid";
    const placement = {
      accent: sample.accent,
      anchorId: sample.anchorId,
      position: [
        placementX,
        // Authored height is an offset into the surface, not an absolute Y:
        // dressing embedded at a fixed -0.02 either floats over a dune trough
        // or buries itself in a crest once the ground stopped being a plane.
        lerp(profile.height[0], profile.height[1], randomUnit(seed + 4)) +
          polarGroundHeight(placementX, placementZ),
        placementZ,
      ],
      morphology: randomUnit(seed + 10),
      rotation: [
        upright ? 0 : (randomUnit(seed + 5) - 0.5) * 0.12,
        Math.atan2(sample.tangentX, sample.tangentZ) + yawNoise,
        upright ? 0 : (randomUnit(seed + 6) - 0.5) * 0.14,
      ],
      routeDistance,
      scale: [
        lerp(profile.scaleX[0], profile.scaleX[1], randomUnit(seed + 7)),
        lerp(profile.scaleY[0], profile.scaleY[1], randomUnit(seed + 8)),
        lerp(profile.scaleZ[0], profile.scaleZ[1], randomUnit(seed + 9)),
      ],
    };
    if (!isWorldDressingPlacementProtected(placement.position, band)) {
      placements.push(placement);
    }
  }
  return placements;
}

export function buildWorldDressingLayout(
  artifacts,
  { quality = "medium" } = {},
) {
  const budget = WORLD_DRESSING_BUDGET[quality] || WORLD_DRESSING_BUDGET.medium;
  const stations = normalizeStations(artifacts);
  const route = buildRoute(stations);
  if (!route.segments.length) {
    return { bands: { far: [], mid: [], near: [] }, looped: false, routeLength: 0 };
  }
  return {
    bands: {
      far: buildBand(route, "far", budget.far),
      mid: buildBand(route, "mid", budget.mid),
      near: buildBand(route, "near", budget.near),
    },
    looped: route.looped,
    routeLength: route.totalLength,
  };
}

export function criticallyDampedStep(state, target, omega, deltaSeconds) {
  const position = finite(state?.position);
  const velocity = finite(state?.velocity);
  const safeTarget = finite(target);
  const safeOmega = Math.max(0.001, finite(omega, 12));
  const delta = clamp(finite(deltaSeconds), 0, 0.1);
  const displacement = position - safeTarget;
  const coefficient = velocity + safeOmega * displacement;
  const decay = Math.exp(-safeOmega * delta);
  return {
    position: safeTarget + (displacement + coefficient * delta) * decay,
    velocity: (velocity - safeOmega * coefficient * delta) * decay,
  };
}

export function motionWarpFromVelocity(
  velocityX,
  velocityZ,
  { quality = "medium", reducedMotion = false } = {},
) {
  if (reducedMotion) return { fisheye: 0, x: 0, y: 0 };
  const speed = Math.hypot(finite(velocityX), finite(velocityZ));
  if (speed <= 1e-5) return { fisheye: 0, x: 0, y: 0 };
  const intensity = clamp(speed / TRAVERSAL_SPEED_REFERENCE, 0, 1);
  const fisheyeCap = quality === "high" ? 0.008 : quality === "low" ? 0.003 : 0.006;
  const shiftCap = quality === "high" ? 0.0035 : quality === "low" ? 0.0015 : 0.0026;
  const directionX = velocityX / speed;
  const directionY = (-velocityZ / speed) * 0.36;
  return {
    fisheye: fisheyeCap * intensity,
    x: directionX * shiftCap * intensity,
    y: directionY * shiftCap * intensity,
  };
}
