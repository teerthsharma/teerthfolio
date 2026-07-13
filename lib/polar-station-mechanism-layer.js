import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";

const NORTHEAST_IDS = Object.freeze([
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
]);
const SOUTHWEST_IDS = Object.freeze([
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
]);

export const MECHANISM_FAMILY_IDS = Object.freeze({
  northeast: NORTHEAST_IDS,
  southwest: SOUTHWEST_IDS,
});

const FAMILY_BY_STATION = Object.freeze(
  Object.fromEntries([
    ...NORTHEAST_IDS.map((id) => [id, "northeast"]),
    ...SOUTHWEST_IDS.map((id) => [id, "southwest"]),
  ]),
);
const ALL_MECHANISM_IDS = Object.freeze([...NORTHEAST_IDS, ...SOUTHWEST_IDS]);
const SWITCH_ADVANTAGE = 0.72;
const EDGE_FADE_DISTANCE = 1.25;
const TIE_EPSILON = 1e-6;

function freezeBudget(drawCalls, programs, textures, activeFamilies) {
  return Object.freeze({ activeFamilies, drawCalls, programs, textures });
}

export const MECHANISM_LAYER_BUDGET = Object.freeze({
  high: freezeBudget(12, 3, 0, 1),
  medium: freezeBudget(12, 3, 0, 1),
  low: freezeBudget(4, 2, 0, 1),
  safe: freezeBudget(0, 0, 0, 0),
});

export const MECHANISM_BASE_MOTION_CONFLICTS = Object.freeze({
  disable: Object.freeze([
    "StationInteractionRig",
    "ArtifactMesh continuous bob",
    "ArtifactMesh continuous yaw",
    "physical-station-subject",
    "StationGridPedestal",
    "StationSurfaceMaterial",
    "station point light",
  ]),
  keep: Object.freeze([
    "mechanism-navigation-proxy",
    "stream reveal",
    "pointer focus",
  ]),
  stationIds: ALL_MECHANISM_IDS,
  visualOwner: "PolarStationMechanismLayer",
});

export const MECHANISM_LAYER_INTEGRATION = Object.freeze({
  authority:
    "one selector useFrame plus exactly one mounted family fixed-step useFrame",
  conflictRule:
    "all seven mechanism stations return a transparent pointer proxy before legacy ArtifactMesh visuals",
  evidenceRule:
    "forward evidence only when the mounted family's existing state machine reports evidenceReady after physical proof",
  navigationProxy:
    "colorWrite false, depthWrite false, depthTest false, zero opacity, pointer focus retained",
  visualOwnership:
    "PolarStationMechanismLayer exclusively owns the visible station architecture; IglooArtifacts owns navigation only",
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function finite(value, fallback = Number.NaN) {
  return Number.isFinite(value) ? value : fallback;
}

function readPosition(pose) {
  if (Array.isArray(pose)) {
    return { x: finite(pose[0]), z: finite(pose[1]) };
  }
  return { x: finite(pose?.x), z: finite(pose?.z) };
}

function clearSelection(target) {
  target.distance = Number.POSITIVE_INFINITY;
  target.family = null;
  target.farRadius = 0;
  target.stationId = null;
  target.visibility = 0;
  target.withinFarRadius = false;
  return target;
}

function stationDistance(stationId, x, z) {
  const station = STATION_WORLD_SCHEMA.stations[stationId];
  return Math.hypot(x - station.dock.x, z - station.dock.z);
}

/**
 * Select the physically nearest mechanism station inside its authored far
 * radius. Semantic focus only resolves exact distance ties; it cannot summon a
 * distant mechanism. `target` lets the render loop reuse one object per frame.
 */
export function resolveMechanismLayerSelection(
  traversalPose,
  activeArtifactId,
  {
    exclusiveStationId = null,
    previousSelection = null,
    safeMode = false,
    target = {},
    visible = true,
  } = {},
) {
  clearSelection(target);
  if (safeMode || !visible) return target;

  if (exclusiveStationId) {
    const family = FAMILY_BY_STATION[exclusiveStationId];
    if (!family) return target;
    const station = STATION_WORLD_SCHEMA.stations[exclusiveStationId];
    target.distance = 0;
    target.family = family;
    target.farRadius = station.proximity.far;
    target.stationId = exclusiveStationId;
    target.visibility = 1;
    target.withinFarRadius = true;
    return target;
  }

  const { x, z } = readPosition(traversalPose);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return target;

  let candidateId = null;
  let candidateDistance = Number.POSITIVE_INFINITY;
  for (const stationId of ALL_MECHANISM_IDS) {
    const station = STATION_WORLD_SCHEMA.stations[stationId];
    const distance = stationDistance(stationId, x, z);
    if (distance > station.proximity.far) continue;
    const exactTie = Math.abs(distance - candidateDistance) <= TIE_EPSILON;
    if (
      distance + TIE_EPSILON < candidateDistance ||
      (exactTie && stationId === activeArtifactId)
    ) {
      candidateId = stationId;
      candidateDistance = distance;
    }
  }

  const previousId = previousSelection?.stationId;
  if (candidateId && previousId && previousId !== candidateId && FAMILY_BY_STATION[previousId]) {
    const previousStation = STATION_WORLD_SCHEMA.stations[previousId];
    const previousDistance = stationDistance(previousId, x, z);
    if (
      previousDistance <= previousStation.proximity.far &&
      candidateDistance + SWITCH_ADVANTAGE >= previousDistance
    ) {
      candidateId = previousId;
      candidateDistance = previousDistance;
    }
  }

  if (!candidateId) return target;
  const station = STATION_WORLD_SCHEMA.stations[candidateId];
  target.distance = candidateDistance;
  target.family = FAMILY_BY_STATION[candidateId];
  target.farRadius = station.proximity.far;
  target.stationId = candidateId;
  target.visibility = smoothstep01(
    (station.proximity.far - candidateDistance) / EDGE_FADE_DISTANCE,
  );
  target.withinFarRadius = true;
  return target;
}

function projectEvidence(project) {
  return Object.freeze({
    category: project?.domain || "uncategorized",
    fullName: project?.fullName || null,
    name: project?.name || project?.fullName || "unnamed-source",
    sourceUrl: project?.sourceUrl || project?.url || "",
  });
}

/** Preserve source truth: live/fallback status stays exactly as the server sent
 * it, and topology/assembly evidence is derived only from supplied projects. */
export function buildMechanismSourceContext(liveSummary, projects) {
  const sources = Object.freeze(
    (Array.isArray(projects) ? projects : [])
      .filter((project) => project && typeof project === "object")
      .map(projectEvidence),
  );
  return Object.freeze({
    assemblyInspection: Object.freeze({
      evidenceSources: sources,
      paused: false,
      scrub: null,
    }),
    topologyEvidence: Object.freeze({ category: "all", sources }),
    upstreamMetadata: liveSummary || null,
  });
}

export function isMechanismEvidenceReady(stationId, state, selection) {
  return Boolean(
    FAMILY_BY_STATION[stationId] &&
      selection?.stationId === stationId &&
      selection?.family === FAMILY_BY_STATION[stationId] &&
      state?.evidenceReady === true,
  );
}
