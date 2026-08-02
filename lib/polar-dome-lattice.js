const TAU = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
const EPSILON = 1e-7;

export const POLAR_DOME_LATTICE_VERSION = "wave-c-lattice-v2";

// A snow igloo is a catenary dome on a near-circular plan, not a bubble: the
// crown carries roughly as much height as the plan carries half-width, and the
// two horizontal radii are within about ten percent of each other. The previous
// [2.42, 1.46, 1.48] was a 1.63:1 plan ellipse only 0.30 as tall as it was
// wide, which rendered as a flattened blister no matter how the masonry was
// shaded. These radii keep the footprint inside the existing traversal collider
// (2.10 x 1.58 = 3.32 < 4.4, 1.86 x 1.58 = 2.94 < 3.2) so the world layout,
// dock and approach lane are untouched.
export const POLAR_DOME_LATTICE_GEOMETRY = Object.freeze({
  center: Object.freeze([0, 0.075, 0]),
  radii: Object.freeze([2.1, 2.8, 1.86]),
  thetaBase: HALF_PI,
  thetaTop: 0.1,
});

const AIRLOCK_ROTATION_Y = -0.08;
const AIRLOCK_AXIS_XZ = Object.freeze([
  Math.sin(AIRLOCK_ROTATION_Y),
  Math.cos(AIRLOCK_ROTATION_Y),
]);
const AIRLOCK_TANGENT_XZ = Object.freeze([
  Math.cos(AIRLOCK_ROTATION_Y),
  -Math.sin(AIRLOCK_ROTATION_Y),
]);

// The entrance tunnel is a signature part of the reference silhouette: a stubby
// arched passage standing clear of the dome, not a doorway flush with it. This
// one used to protrude 0.22 past a 1.48 z-radius shell; raising the dome to real
// snow-house proportion took the z-radius to 1.86 and swallowed the tunnel
// whole, so the entrance read as a dark patch on the flank. Pushed back out and
// lengthened, it clears the shell by 0.71 and reads as built structure again.
export const POLAR_DOME_AIRLOCK = Object.freeze({
  axisXZ: AIRLOCK_AXIS_XZ,
  depth: 0.92,
  innerRadius: 0.38,
  outerRadius: 0.6,
  position: Object.freeze([0.62, 0.035, 1.55]),
  rotationY: AIRLOCK_ROTATION_Y,
  springY: 0.25,
  tangentXZ: AIRLOCK_TANGENT_XZ,
});

export const POLAR_DOME_DOORWAY = Object.freeze({
  archCenterY: POLAR_DOME_AIRLOCK.position[1] + POLAR_DOME_AIRLOCK.springY,
  archRadiusY: POLAR_DOME_AIRLOCK.outerRadius,
  axisXZ: POLAR_DOME_AIRLOCK.axisXZ,
  centerXZ: Object.freeze([
    POLAR_DOME_AIRLOCK.position[0],
    POLAR_DOME_AIRLOCK.position[2],
  ]),
  clearArchRadiusY: POLAR_DOME_AIRLOCK.innerRadius,
  clearHalfWidth: POLAR_DOME_AIRLOCK.innerRadius,
  corridorBack: 0.16,
  corridorFront: POLAR_DOME_AIRLOCK.depth + 0.12,
  halfWidth: POLAR_DOME_AIRLOCK.outerRadius,
  padding: 0.04,
  sillY: POLAR_DOME_AIRLOCK.position[1],
  tangentXZ: POLAR_DOME_AIRLOCK.tangentXZ,
});

// The world schema keeps the seal outside the enlarged traversal footprint and
// guides it through a short exterior airlock corridor before entering the
// rendered lattice. Keep this local XZ anchor immutable so scene and traversal
// cannot silently drift apart.
// Keep the binary-exact offsets produced by the canonical world center/dock
// pair so the schema and renderer share one collision coordinate without
// introducing a rounding seam at the doorway.
export const POLAR_DOME_DOCK_LOCAL_XZ = Object.freeze([
  -4.260000000000002,
  1.9900000000000002,
]);

// Points from the dome footprint toward the approach lane. Traversal input
// negates this vector to enter the airlock, matching the authored route.
const TRAVERSAL_DOOR_AXIS_XZ = Object.freeze([-0.906, 0.423]);
const TRAVERSAL_DOOR_TANGENT_XZ = Object.freeze([-0.423, -0.906]);
const POLAR_DOME_TRAVERSAL_DOORWAY = Object.freeze({
  axisXZ: TRAVERSAL_DOOR_AXIS_XZ,
  centerXZ: POLAR_DOME_DOCK_LOCAL_XZ,
  clearHalfWidth: 0.62,
    corridorBack: 1.1,
  corridorFront: 0.86,
  halfWidth: 0.72,
  tangentXZ: TRAVERSAL_DOOR_TANGENT_XZ,
});

const polarDomeTraversalCollider = {
  radiusX: 4.4,
  radiusZ: 3.2,
  rotationDegrees: 12,
};

// Keep the public schema shape stable while carrying the richer traversal
// metadata through the same immutable object reference.
Object.defineProperties(polarDomeTraversalCollider, {
  centerX: { value: 0 },
  centerZ: { value: 0 },
  collisionRotationDegrees: { value: 0 },
  doorway: { value: POLAR_DOME_TRAVERSAL_DOORWAY },
  kind: { value: "ellipse" },
  traversalY: { value: 0.18 },
});

export const POLAR_DOME_TRAVERSAL_COLLIDER = Object.freeze(
  polarDomeTraversalCollider,
);

export function isXZInsidePolarDomeDoorway(x, z) {
  const doorway = POLAR_DOME_TRAVERSAL_DOORWAY;
  const dx = x - doorway.centerXZ[0];
  const dz = z - doorway.centerXZ[1];
  const axial = dx * doorway.axisXZ[0] + dz * doorway.axisXZ[1];
  const lateral = dx * doorway.tangentXZ[0] + dz * doorway.tangentXZ[1];
  return (
    axial >= -doorway.corridorBack &&
    axial <= doorway.corridorFront &&
    Math.abs(lateral) <= doorway.clearHalfWidth
  );
}

// Course and column counts are the silhouette, not a detail budget. A real
// snow igloo is cut from about five courses of roughly one-metre blocks, so a
// two-metre-radius dome carries ~13 blocks around its widest course and ~55
// visible in total. The previous 10 x 24 lattice spent its cells on a fine
// mosaic that read as a paneled ball at any distance where the whole building
// is in frame. Fewer, larger blocks is the correction; the tiers still order
// low < medium < high so the quality ladder stays a ladder.
export const POLAR_DOME_LATTICE_TIERS = Object.freeze({
  low: Object.freeze({
    cellBudget: Object.freeze({ min: 18, max: 70 }),
    maxColumns: 10,
    minColumns: 6,
    radialRibs: 4,
    ringCount: 5,
    targetCellWidth: 1.25,
  }),
  medium: Object.freeze({
    cellBudget: Object.freeze({ min: 30, max: 96 }),
    maxColumns: 12,
    minColumns: 7,
    radialRibs: 6,
    ringCount: 6,
    targetCellWidth: 1,
  }),
  high: Object.freeze({
    cellBudget: Object.freeze({ min: 40, max: 120 }),
    maxColumns: 14,
    minColumns: 8,
    radialRibs: 8,
    ringCount: 8,
    targetCellWidth: 0.88,
  }),
});

/**
 * Peak-to-peak lay tolerance, in local units, for how far a block may sit proud
 * of or recessed into the ellipsoid it is cut against. Blocks stay seated: the
 * skeleton (ribs, ring seams, base ring) and the collision shell remain exactly
 * on the surface, and only the rendered block instances carry this offset.
 */
export const POLAR_DOME_BLOCK_SEAT_JITTER = 0.15;

/**
 * Smallest outward offset any block carries, in local units. It must exceed the
 * 1.004 mortar-fill scale the renderer gives the continuous shell, measured
 * against the smallest radius, so that every block is in front of the shell and
 * can occlude it: 0.004 x 1.86 = 0.0074.
 */
export const POLAR_DOME_BLOCK_SEAT_FLOOR = 0.009;

export const POLAR_DOME_INTERACTION_PROFILE = Object.freeze({
  angularSigma: 0.24,
  crownResponse: 0.82,
  dampingRatio: 1,
  doorwayButtressPenalty: 0.34,
  maxDisplacement: 0.018,
  naturalFrequency: 7.2,
  rootResponse: 0.2,
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < EPSILON) return [0, 0, 0];
  return vector.map((value) => value / length);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function normalizeXZ(vector, fallback = [0, 1]) {
  const length = Math.hypot(vector?.[0], vector?.[1]);
  if (length < EPSILON) return [...fallback];
  return [vector[0] / length, vector[1] / length];
}

function hash01(a, b, salt = 0) {
  const raw = Math.sin((a + 1) * 127.1 + (b + 3) * 311.7 + salt * 74.7) * 43758.5453;
  return raw - Math.floor(raw);
}

function ellipseCircumference(radiusA, radiusB) {
  const sum = radiusA + radiusB;
  if (sum < EPSILON) return 0;
  const h = ((radiusA - radiusB) ** 2) / (sum ** 2);
  return Math.PI * sum * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function makeCourseWeights(count) {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1);
    return 0.62 + t * 0.72;
  });
}

function domeSurfaceFrame(angle, theta, geometry) {
  const [centerX, centerY, centerZ] = geometry.center;
  const [radiusX, radiusY, radiusZ] = geometry.radii;
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const position = [
    centerX + Math.cos(angle) * sinTheta * radiusX,
    centerY + cosTheta * radiusY,
    centerZ + Math.sin(angle) * sinTheta * radiusZ,
  ];
  const normal = normalize([
    (position[0] - centerX) / (radiusX * radiusX),
    (position[1] - centerY) / (radiusY * radiusY),
    (position[2] - centerZ) / (radiusZ * radiusZ),
  ]);
  const tangent = normalize([
    -Math.sin(angle) * sinTheta * radiusX,
    0,
    Math.cos(angle) * sinTheta * radiusZ,
  ]);
  const bitangent = normalize(cross(normal, tangent));
  const thetaDerivative = [
    Math.cos(angle) * cosTheta * radiusX,
    -sinTheta * radiusY,
    Math.sin(angle) * cosTheta * radiusZ,
  ];
  return { bitangent, normal, position, tangent, thetaDerivative };
}

function resolveDoorway(doorway) {
  const centerAngle = Math.atan2(doorway.centerXZ[1], doorway.centerXZ[0]);
  const axisXZ = normalizeXZ(
    doorway.axisXZ,
    [Math.cos(centerAngle), Math.sin(centerAngle)],
  );
  const tangentXZ = normalizeXZ(
    doorway.tangentXZ,
    [axisXZ[1], -axisXZ[0]],
  );
  return { ...doorway, axisXZ, centerAngle, tangentXZ };
}

function doorwayCoordinates(point, doorway) {
  const offsetX = point[0] - doorway.centerXZ[0];
  const offsetZ = point[2] - doorway.centerXZ[1];
  return {
    axial: offsetX * doorway.axisXZ[0] + offsetZ * doorway.axisXZ[1],
    lateral: offsetX * doorway.tangentXZ[0] + offsetZ * doorway.tangentXZ[1],
  };
}

function frameProjectionExtent(frame, scale, axis) {
  return (
    Math.abs(dot(frame.tangent, axis)) * scale[0] * 0.5 +
    Math.abs(dot(frame.bitangent, axis)) * scale[1] * 0.5 +
    Math.abs(dot(frame.normal, axis)) * scale[2] * 0.5
  );
}

function doorwayArchContains(lateral, y, doorway, lateralExtent = 0, verticalExtent = 0) {
  const expandedHalfWidth = doorway.halfWidth + lateralExtent + doorway.padding;
  if (y + verticalExtent < doorway.sillY) return false;
  if (Math.abs(lateral) > expandedHalfWidth) return false;
  if (y - verticalExtent <= doorway.archCenterY) return true;
  const normalizedX = Math.abs(lateral) / expandedHalfWidth;
  const normalizedY =
    (y - verticalExtent - doorway.archCenterY) /
    (doorway.archRadiusY + verticalExtent + doorway.padding);
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function isPointInsideDoorwayEnvelope(point, doorway) {
  const { axial, lateral } = doorwayCoordinates(point, doorway);
  if (
    axial < -doorway.corridorBack - doorway.padding ||
    axial > doorway.corridorFront + doorway.padding
  ) {
    return false;
  }
  return doorwayArchContains(lateral, point[1], doorway);
}

function doorwayContainsCell(frame, scale, doorway) {
  const coordinates = doorwayCoordinates(frame.position, doorway);
  const lateralAxis = [doorway.tangentXZ[0], 0, doorway.tangentXZ[1]];
  const axialAxis = [doorway.axisXZ[0], 0, doorway.axisXZ[1]];
  const verticalAxis = [0, 1, 0];
  const lateralExtent = frameProjectionExtent(frame, scale, lateralAxis);
  const axialExtent = frameProjectionExtent(frame, scale, axialAxis);
  const verticalExtent = frameProjectionExtent(frame, scale, verticalAxis);
  const intersectsCorridor =
    coordinates.axial + axialExtent >= -doorway.corridorBack - doorway.padding &&
    coordinates.axial - axialExtent <= doorway.corridorFront + doorway.padding;
  return Boolean(
    intersectsCorridor &&
      doorwayArchContains(
        coordinates.lateral,
        frame.position[1],
        doorway,
        lateralExtent,
        verticalExtent,
      ),
  );
}

function makeCell({
  angle,
  columnCount,
  geometry,
  ringIndex,
  cellIndex,
  theta,
  thetaBand,
  doorway,
}) {
  const frame = domeSurfaceFrame(angle, theta, geometry);
  // Hand-laid, not machined. Every cell sitting exactly on the ellipsoid gives a
  // mathematically smooth outline, and a smooth outline is the tell that says
  // "sphere with tiles on it" no matter how the faces are shaded — a real snow
  // dome's edge is bumpy because block corners stand proud of their neighbours.
  // Deterministic per-cell, on its own hash salt so it does not correlate with
  // the frost, facet or bevel variation.
  const seatSeed = hash01(ringIndex, cellIndex, 3);
  // Outward-only, and that is a rendering decision as much as a masonry one.
  // The amplitude and therefore the bumpy outline are unchanged; what changes is
  // that no block is ever recessed behind the continuous shell, which the
  // renderer draws at 1.004 of these radii. A block seated inward could not
  // occlude the shell, so half the masonry was failing to hide the full-coverage
  // hemisphere behind it and every dome pixel was shaded at least twice. Snow
  // blocks sit proud of their mortar in any case; they do not sink into it.
  const seatOffset =
    POLAR_DOME_BLOCK_SEAT_FLOOR + seatSeed * POLAR_DOME_BLOCK_SEAT_JITTER;
  frame.position = [
    frame.position[0] + frame.normal[0] * seatOffset,
    frame.position[1] + frame.normal[1] * seatOffset,
    frame.position[2] + frame.normal[2] * seatOffset,
  ];
  const [radiusX, , radiusZ] = geometry.radii;
  const sinTheta = Math.sin(theta);
  const circumference = ellipseCircumference(radiusX * sinTheta, radiusZ * sinTheta);
  // Cut snow is laid tight: neighbouring blocks touch and the joint is a dark
  // line, not a gap. At the old tile scale a 4.5% inset was that line; on blocks
  // this size the same ratio is a finger-wide slot that the lit interior pours
  // through, so the inset shrinks with the block count.
  const width = (circumference / columnCount) * 0.994;
  const height = Math.hypot(...frame.thetaDerivative) * thetaBand * 0.99;
  const frostSeed = hash01(ringIndex, cellIndex, 0);
  const facetSeed = hash01(ringIndex, cellIndex, 1);
  const bevelSeed = hash01(ringIndex, cellIndex, 2);
  // Cut-snow proportions: at the widest course a block is ~0.85 x 0.47, so a
  // depth near 0.21 gives the 4:2:1 slab a real igloo is built from. At the old
  // 0.122 the courses read as tiles laid on a shell rather than as blocks that
  // are themselves the wall, and the seam recesses had no depth to shade.
  const thickness = 0.205 + ringIndex * 0.006 + frostSeed * 0.014;
  const scale = [
    width * (0.982 + frostSeed * 0.018),
    height * (0.976 + facetSeed * 0.022),
    thickness,
  ];
  const doorwayExcluded = doorwayContainsCell(frame, scale, doorway);
  const baseY = geometry.center[1];
  const crownY = geometry.center[1] + geometry.radii[1];
  const height01 = clamp((frame.position[1] - baseY) / (crownY - baseY), 0, 1);
  const doorwayCoordinatesAtCell = doorwayCoordinates(frame.position, doorway);
  const buttressDistance = Math.abs(
    Math.abs(doorwayCoordinatesAtCell.lateral) - doorway.halfWidth,
  );
  const buttressInfluence =
    Math.exp(-((buttressDistance / 0.26) ** 2)) *
    Math.exp(-((doorwayCoordinatesAtCell.axial / 0.5) ** 2)) *
    (1 - height01);
  const structuralSupport = clamp(
    (1 - height01) * 0.72 + buttressInfluence * 0.28,
    0,
    1,
  );
  const ringMass = 1 + (1 - height01) * 1.35;
  const freeResponse =
    POLAR_DOME_INTERACTION_PROFILE.rootResponse +
    height01 *
      (POLAR_DOME_INTERACTION_PROFILE.crownResponse -
        POLAR_DOME_INTERACTION_PROFILE.rootResponse);
  const responseWeight = clamp(
    freeResponse * (1 - structuralSupport * 0.3) -
      buttressInfluence *
        POLAR_DOME_INTERACTION_PROFILE.doorwayButtressPenalty,
    0.08,
    0.9,
  );
  const mass = ringMass * (1 + structuralSupport * 0.62);

  return Object.freeze({
    angle,
    bevelSeed,
    bitangent: Object.freeze(frame.bitangent),
    cellIndex,
    columnCount,
    doorwayExcluded,
    facetSeed,
    frostSeed,
    height01,
    mass,
    normal: Object.freeze(frame.normal),
    position: Object.freeze(frame.position),
    responseWeight,
    ringMass,
    ringIndex,
    scale: Object.freeze(scale),
    structuralSupport,
    tangent: Object.freeze(frame.tangent),
    theta,
    weight: responseWeight,
  });
}

function makeRib(angle, geometry, structuralRole = "radial-rib", pointCount = 18) {
  const points = Array.from({ length: pointCount }, (_, index) => {
    const t = pointCount <= 1 ? 0 : index / (pointCount - 1);
    const theta = geometry.thetaTop + (geometry.thetaBase - geometry.thetaTop) * t;
    return Object.freeze(domeSurfaceFrame(angle, theta, geometry).position);
  });
  return Object.freeze({ angle, points: Object.freeze(points), structuralRole });
}

function ribIntersectsDoorway(angle, geometry, doorway, pointCount = 40) {
  for (let index = 0; index < pointCount; index += 1) {
    const t = pointCount <= 1 ? 0 : index / (pointCount - 1);
    const theta =
      geometry.thetaTop + (geometry.thetaBase - geometry.thetaTop) * t;
    if (
      isPointInsideDoorwayEnvelope(
        domeSurfaceFrame(angle, theta, geometry).position,
        doorway,
      )
    ) {
      return true;
    }
  }
  return false;
}

function resolveDoorwayAngularGap(geometry, doorway) {
  const probeDistance =
    doorway.corridorBack +
    (doorway.corridorFront - doorway.corridorBack) * 0.58;
  const probeX = doorway.centerXZ[0] + doorway.axisXZ[0] * probeDistance;
  const probeZ = doorway.centerXZ[1] + doorway.axisXZ[1] * probeDistance;
  const aimAngle = Math.atan2(
    probeZ - geometry.center[2],
    probeX - geometry.center[0],
  );
  const sampleCount = 360;
  const sampleStep = TAU / sampleCount;
  const blockedOffsets = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const offset = -Math.PI + (index + 0.5) * sampleStep;
    if (ribIntersectsDoorway(aimAngle + offset, geometry, doorway)) {
      blockedOffsets.push(offset);
    }
  }

  if (blockedOffsets.length === 0) {
    return Object.freeze({ endAngle: aimAngle + TAU, startAngle: aimAngle });
  }

  const margin = 0.025 + sampleStep;
  let startAngle = aimAngle + blockedOffsets.at(-1) + margin;
  let endAngle = aimAngle + blockedOffsets[0] + TAU - margin;
  while (ribIntersectsDoorway(startAngle, geometry, doorway)) {
    startAngle += sampleStep;
  }
  while (ribIntersectsDoorway(endAngle, geometry, doorway)) {
    endAngle -= sampleStep;
  }
  return Object.freeze({ endAngle, startAngle });
}

function makeStructuralRibs(count, geometry, doorway) {
  const gap = resolveDoorwayAngularGap(geometry, doorway);
  const availableSpan = gap.endAngle - gap.startAngle;
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0.5 : index / (count - 1);
    const angle = wrapAngle(gap.startAngle + availableSpan * t);
    const structuralRole =
      index === 0 || index === count - 1
        ? "doorway-buttress"
        : "radial-rib";
    return makeRib(angle, geometry, structuralRole);
  });
}

function makeDoorwayArch(doorway, pointCount = 20) {
  const points = Array.from({ length: pointCount }, (_, index) => {
    const t = pointCount <= 1 ? 0 : index / (pointCount - 1);
    const angle = Math.PI * (1 - t);
    const lateral = Math.cos(angle) * doorway.halfWidth;
    const y = doorway.archCenterY + Math.sin(angle) * doorway.archRadiusY;
    return Object.freeze([
      doorway.centerXZ[0] +
        doorway.tangentXZ[0] * lateral +
        doorway.axisXZ[0] * 0.018,
      y,
      doorway.centerXZ[1] +
        doorway.tangentXZ[1] * lateral +
        doorway.axisXZ[1] * 0.018,
    ]);
  });
  return Object.freeze(points);
}

function splitVisibleLoop(points, excluded) {
  const excludedIndex = excluded.findIndex(Boolean);
  if (excludedIndex < 0) {
    return Object.freeze([
      Object.freeze([...points, points[0]]),
    ]);
  }
  const segments = [];
  let segment = [];
  for (let offset = 1; offset <= points.length; offset += 1) {
    const index = (excludedIndex + offset) % points.length;
    if (excluded[index]) {
      if (segment.length >= 2) segments.push(Object.freeze(segment));
      segment = [];
    } else {
      segment.push(points[index]);
    }
  }
  if (segment.length >= 2) segments.push(Object.freeze(segment));
  return Object.freeze(segments);
}

function makeSurfaceLoop(theta, geometry, doorway, pointCount = 72) {
  const points = Array.from({ length: pointCount }, (_, index) =>
    Object.freeze(
      domeSurfaceFrame((index / pointCount) * TAU, theta, geometry).position,
    ),
  );
  const excluded = points.map((point) =>
    isPointInsideDoorwayEnvelope(point, doorway),
  );
  return Object.freeze({
    segments: splitVisibleLoop(points, excluded),
    theta,
  });
}

export function normalizePolarDomeQuality(quality) {
  return quality === "low" || quality === "medium" ? quality : "high";
}

export function createPolarDomeLattice({
  doorway: doorwayInput = POLAR_DOME_DOORWAY,
  geometry: geometryInput = POLAR_DOME_LATTICE_GEOMETRY,
  quality = "high",
} = {}) {
  const tierName = normalizePolarDomeQuality(quality);
  const tier = POLAR_DOME_LATTICE_TIERS[tierName];
  const geometry = {
    ...geometryInput,
    center: [...geometryInput.center],
    radii: [...geometryInput.radii],
  };
  const doorway = resolveDoorway(doorwayInput);
  const weights = makeCourseWeights(tier.ringCount);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const thetaSpan = geometry.thetaBase - geometry.thetaTop;
  const cells = [];
  const visibleCells = [];
  const excludedCells = [];
  const rings = [];
  const ringBoundaries = [geometry.thetaTop];
  let accumulatedWeight = 0;

  for (let ringIndex = 0; ringIndex < tier.ringCount; ringIndex += 1) {
    const thetaBand = (weights[ringIndex] / weightTotal) * thetaSpan;
    const theta = geometry.thetaTop + (accumulatedWeight / weightTotal) * thetaSpan + thetaBand * 0.5;
    accumulatedWeight += weights[ringIndex];
    ringBoundaries.push(
      geometry.thetaTop + (accumulatedWeight / weightTotal) * thetaSpan,
    );
    const sinTheta = Math.sin(theta);
    const circumference = ellipseCircumference(
      geometry.radii[0] * sinTheta,
      geometry.radii[2] * sinTheta,
    );
    const columnCount = clamp(
      Math.round(circumference / tier.targetCellWidth),
      tier.minColumns,
      tier.maxColumns,
    );
    const stagger = ringIndex % 2 === 0 ? 0.5 : 0;
    const ringCells = [];
    for (let cellIndex = 0; cellIndex < columnCount; cellIndex += 1) {
      const angle = ((cellIndex + stagger) / columnCount) * TAU;
      const cell = makeCell({
        angle,
        cellIndex,
        columnCount,
        doorway,
        geometry,
        ringIndex,
        theta,
        thetaBand,
      });
      cells.push(cell);
      ringCells.push(cell);
      if (cell.doorwayExcluded) excludedCells.push(cell);
      else visibleCells.push(cell);
    }
    rings.push(Object.freeze({
      cells: Object.freeze(ringCells),
      columnCount,
      ringIndex,
      theta,
      thetaBand,
    }));
  }

  const ribs = makeStructuralRibs(tier.radialRibs, geometry, doorway);
  const ringSeams = ringBoundaries.slice(1, -1).map((theta) =>
    makeSurfaceLoop(theta, geometry, doorway),
  );
  const baseRing = makeSurfaceLoop(geometry.thetaBase, geometry, doorway, 80);
  const doorwayArch = makeDoorwayArch(doorway);
  const collisionDoorway = Object.freeze({
    ...doorway,
    axisXZ: Object.freeze([...doorway.axisXZ]),
    centerXZ: Object.freeze([...doorway.centerXZ]),
    tangentXZ: Object.freeze([...doorway.tangentXZ]),
  });
  const collision = Object.freeze({
    authority: "continuous ellipsoid shell with one rendered-airlock arched corridor",
    baseY: geometry.center[1],
    center: Object.freeze([...geometry.center]),
    doorway: collisionDoorway,
    kind: "ellipsoid-hemisphere",
    radii: Object.freeze([...geometry.radii]),
    shellThickness: 0.14,
    space: "component-local",
  });
  const skeleton = Object.freeze({
    baseRing,
    doorwayArch,
    ribs: Object.freeze(ribs),
    ringSeams: Object.freeze(ringSeams),
  });

  return Object.freeze({
    baseRing,
    cells: Object.freeze(cells),
    collision,
    doorwayArch,
    excludedCells: Object.freeze(excludedCells),
    quality: tierName,
    ribs: Object.freeze(ribs),
    ringSeams: Object.freeze(ringSeams),
    rings: Object.freeze(rings),
    skeleton,
    version: POLAR_DOME_LATTICE_VERSION,
    visibleCells: Object.freeze(visibleCells),
  });
}

export const POLAR_DOME_LATTICE_COUNTS = Object.freeze(
  Object.fromEntries(
    ["low", "medium", "high"].map((quality) => {
      const lattice = createPolarDomeLattice({ quality });
      return [
        quality,
        Object.freeze({
          excludedCells: lattice.excludedCells.length,
          ringColumns: Object.freeze(
            lattice.rings.map((ring) => ring.columnCount),
          ),
          totalCells: lattice.cells.length,
          visibleCells: lattice.visibleCells.length,
        }),
      ];
    }),
  ),
);

export function computePolarDomeInteractionWeight(cell, contactNormal) {
  const direction = normalize(contactNormal);
  const angularDistance = Math.acos(clamp(dot(cell.normal, direction), -1, 1));
  const sigma = POLAR_DOME_INTERACTION_PROFILE.angularSigma;
  const geodesicInfluence = Math.exp(-0.5 * (angularDistance / sigma) ** 2);
  return clamp(geodesicInfluence * cell.responseWeight, 0, 1);
}

export function stepPolarDomeSpring(state, deltaSeconds, target = 0) {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);
  const omega = POLAR_DOME_INTERACTION_PROFILE.naturalFrequency;
  const dampingRatio = POLAR_DOME_INTERACTION_PROFILE.dampingRatio;
  const displacement = Number.isFinite(state?.displacement) ? state.displacement : 0;
  const velocity = Number.isFinite(state?.velocity) ? state.velocity : 0;
  const offset = displacement - target;
  let nextOffset;
  let nextVelocity;

  if (dampingRatio < 1 - EPSILON) {
    const dampedOmega = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
    const decay = Math.exp(-dampingRatio * omega * dt);
    const cosine = Math.cos(dampedOmega * dt);
    const sine = Math.sin(dampedOmega * dt);
    const coefficient =
      (velocity + dampingRatio * omega * offset) / dampedOmega;
    const oscillation = offset * cosine + coefficient * sine;
    nextOffset = decay * oscillation;
    nextVelocity =
      decay *
      (-dampingRatio * omega * oscillation -
        offset * dampedOmega * sine +
        coefficient * dampedOmega * cosine);
  } else {
    const coefficient = velocity + omega * offset;
    const decay = Math.exp(-omega * dt);
    nextOffset = (offset + coefficient * dt) * decay;
    nextVelocity = (velocity - omega * coefficient * dt) * decay;
  }

  const unclampedDisplacement = target + nextOffset;
  const nextDisplacement = clamp(
    unclampedDisplacement,
    -POLAR_DOME_INTERACTION_PROFILE.maxDisplacement,
    POLAR_DOME_INTERACTION_PROFILE.maxDisplacement,
  );
  if (
    nextDisplacement !== unclampedDisplacement &&
    Math.sign(nextVelocity) === Math.sign(unclampedDisplacement)
  ) {
    nextVelocity = 0;
  }
  return Object.freeze({ displacement: nextDisplacement, velocity: nextVelocity });
}

export function doesPolarDomeCellIntersectDoorway(
  cell,
  doorwayInput = POLAR_DOME_DOORWAY,
) {
  if (!cell) return false;
  return doorwayContainsCell(
    {
      bitangent: cell.bitangent,
      normal: cell.normal,
      position: cell.position,
      tangent: cell.tangent,
    },
    cell.scale,
    resolveDoorway(doorwayInput),
  );
}

export function isPointInsidePolarDomeDoorwayEnvelope(
  point,
  doorwayInput = POLAR_DOME_DOORWAY,
) {
  return isPointInsideDoorwayEnvelope(point, resolveDoorway(doorwayInput));
}

export function isPointInsidePolarDomeDoorway(point, doorwayInput = POLAR_DOME_DOORWAY) {
  const doorway = resolveDoorway(doorwayInput);
  const { axial, lateral } = doorwayCoordinates(point, doorway);
  if (axial < -doorway.corridorBack || axial > doorway.corridorFront) {
    return false;
  }
  const clearDoorway = {
    ...doorway,
    archRadiusY: doorway.clearArchRadiusY || doorway.archRadiusY,
    halfWidth: doorway.clearHalfWidth || doorway.halfWidth,
    padding: 0,
  };
  return doorwayArchContains(lateral, point[1], clearDoorway);
}

export function classifyPolarDomeCollisionPoint(
  point,
  {
    doorway = POLAR_DOME_DOORWAY,
    geometry = POLAR_DOME_LATTICE_GEOMETRY,
    shellThickness = 0.14,
  } = {},
) {
  const normalizedRadius = Math.sqrt(
    Math.max(0, polarDomeEllipsoidValue(point, geometry)),
  );
  const distanceScale = Math.min(...geometry.radii);
  const shellDistance = (normalizedRadius - 1) * distanceScale;
  const doorwayCorridor = isPointInsidePolarDomeDoorway(point, doorway);
  const withinHemisphere = point[1] >= geometry.center[1] - EPSILON;
  const onShell =
    withinHemisphere && Math.abs(shellDistance) <= shellThickness * 0.5;
  return Object.freeze({
    blocked: onShell && !doorwayCorridor,
    doorwayCorridor,
    inside: normalizedRadius < 1,
    normalizedRadius,
    onShell,
    shellDistance,
    withinHemisphere,
  });
}

export function tracePolarDomeCollisionSegment(
  start,
  end,
  {
    doorway = POLAR_DOME_DOORWAY,
    geometry = POLAR_DOME_LATTICE_GEOMETRY,
  } = {},
) {
  const startLocal = subtract(start, geometry.center).map(
    (value, index) => value / geometry.radii[index],
  );
  const endLocal = subtract(end, geometry.center).map(
    (value, index) => value / geometry.radii[index],
  );
  const direction = subtract(endLocal, startLocal);
  const a = dot(direction, direction);
  const b = 2 * dot(startLocal, direction);
  const c = dot(startLocal, startLocal) - 1;
  const discriminant = b * b - 4 * a * c;
  const crossings = [];

  if (a > EPSILON && discriminant >= -EPSILON) {
    const root = Math.sqrt(Math.max(0, discriminant));
    const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)];
    for (const t of candidates) {
      if (t < -EPSILON || t > 1 + EPSILON) continue;
      if (crossings.some((crossing) => Math.abs(crossing.t - t) < EPSILON)) {
        continue;
      }
      const boundedT = clamp(t, 0, 1);
      const point = Object.freeze([
        start[0] + (end[0] - start[0]) * boundedT,
        start[1] + (end[1] - start[1]) * boundedT,
        start[2] + (end[2] - start[2]) * boundedT,
      ]);
      if (point[1] < geometry.center[1] - EPSILON) continue;
      crossings.push(
        Object.freeze({
          doorwayCorridor: isPointInsidePolarDomeDoorway(point, doorway),
          point,
          t: boundedT,
        }),
      );
    }
  }

  crossings.sort((left, right) => left.t - right.t);
  return Object.freeze({
    blocked: crossings.some((crossing) => !crossing.doorwayCorridor),
    crossings: Object.freeze(crossings),
  });
}

export function polarDomeEllipsoidValue(point, geometry = POLAR_DOME_LATTICE_GEOMETRY) {
  const local = subtract(point, geometry.center);
  return (
    (local[0] * local[0]) / (geometry.radii[0] * geometry.radii[0]) +
    (local[1] * local[1]) / (geometry.radii[1] * geometry.radii[1]) +
    (local[2] * local[2]) / (geometry.radii[2] * geometry.radii[2])
  );
}
