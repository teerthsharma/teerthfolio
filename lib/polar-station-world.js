import { POLAR_DOME_TRAVERSAL_COLLIDER } from "./polar-dome-lattice.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const order = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

const stations = {
  "observatory-plaque": {
    id: "observatory-plaque",
    center: { x: -15, z: 7 },
    dock: { x: -19.26, z: 8.99 },
    collider: POLAR_DOME_TRAVERSAL_COLLIDER,
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
    id: "s2-kernel-core",
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
    id: "manifold-reactor",
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
    id: "field-chamber-coils",
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
    id: "qpu-ice-bridge",
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
    id: "upstream-radio-mast",
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
    id: "topology-archive-wall",
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
    id: "assembly-tool-locker",
    center: { x: -18, z: -2 },
    dock: { x: -20.98, z: -2.33 },
    collider: { radiusX: 2.15, radiusZ: 1.9, rotationDegrees: -9 },
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

const edges = [
  { from: "observatory-plaque", to: "s2-kernel-core" },
  { from: "s2-kernel-core", to: "manifold-reactor" },
  { from: "manifold-reactor", to: "field-chamber-coils" },
  { from: "field-chamber-coils", to: "qpu-ice-bridge" },
  { from: "qpu-ice-bridge", to: "upstream-radio-mast" },
  { from: "upstream-radio-mast", to: "topology-archive-wall" },
  { from: "topology-archive-wall", to: "assembly-tool-locker" },
  { from: "assembly-tool-locker", to: "observatory-plaque" },
];

export const STATION_WORLD_SCHEMA = deepFreeze({
  coordinateSpace: "canonical-world-xz",
  downstreamCoordinateScale: 1,
  stationWrapping: false,
  order,
  stations,
  edges,
});

/** Stable home three-quarter view, two degrees inside the approved Plaque cone. */
export const PLAQUE_HOME_CAMERA_AZIMUTH_DEGREES =
  stations["observatory-plaque"].camera.azimuthRanges[0][1] - 2;
