import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  POLAR_DOME_AIRLOCK,
  POLAR_DOME_BLOCK_SEAT_JITTER,
  POLAR_DOME_DOORWAY,
  POLAR_DOME_INTERACTION_PROFILE,
  POLAR_DOME_LATTICE_COUNTS,
  POLAR_DOME_LATTICE_GEOMETRY,
  POLAR_DOME_LATTICE_TIERS,
  POLAR_DOME_LATTICE_VERSION,
  classifyPolarDomeCollisionPoint,
  computePolarDomeInteractionWeight,
  createPolarDomeLattice,
  doesPolarDomeCellIntersectDoorway,
  isPointInsidePolarDomeDoorway,
  isPointInsidePolarDomeDoorwayEnvelope,
  polarDomeEllipsoidValue,
  stepPolarDomeSpring,
  tracePolarDomeCollisionSegment,
} from "../lib/polar-dome-lattice.js";

const TAU = Math.PI * 2;
const EPSILON = 1e-6;
const QUALITY_TIERS = ["low", "medium", "high"];

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dotXZ = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (vector) => Math.hypot(...vector);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const closeTo = (actual, expected, tolerance = EPSILON, message = "values must match") => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );
};

function ellipseCircumference(radiusA, radiusB) {
  const sum = radiusA + radiusB;
  const h = ((radiusA - radiusB) ** 2) / (sum ** 2);
  return Math.PI * sum * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function expectedColumnCount(theta, tier) {
  const sinTheta = Math.sin(theta);
  const circumference = ellipseCircumference(
    POLAR_DOME_LATTICE_GEOMETRY.radii[0] * sinTheta,
    POLAR_DOME_LATTICE_GEOMETRY.radii[2] * sinTheta,
  );
  return Math.min(
    tier.maxColumns,
    Math.max(tier.minColumns, Math.round(circumference / tier.targetCellWidth)),
  );
}

function assertSurfacePoint(point, message) {
  closeTo(polarDomeEllipsoidValue(point), 1, EPSILON, message);
}

// Radial distance from the shell, in local units, for a point near it.
function shellDistance(point) {
  return (
    Math.abs(Math.sqrt(polarDomeEllipsoidValue(point)) - 1) *
    Math.min(...POLAR_DOME_LATTICE_GEOMETRY.radii)
  );
}

function assertSeatedPoint(point, message) {
  const distance = shellDistance(point);
  const bound = POLAR_DOME_BLOCK_SEAT_JITTER / 2 + 1e-6;
  assert.ok(
    distance <= bound,
    `${message}: ${distance} exceeds the ${bound} lay tolerance`,
  );
}

function assertSkeletonClearOfDoorway(lattice) {
  for (const rib of lattice.ribs) {
    for (const point of rib.points) {
      assertSurfacePoint(point, `${lattice.quality} rib point must lie on shell`);
      assert.equal(
        isPointInsidePolarDomeDoorwayEnvelope(point),
        false,
        `${lattice.quality} rib must not cross the doorway envelope`,
      );
    }
  }
  for (const loop of [...lattice.ringSeams, lattice.baseRing]) {
    assert.ok(loop.segments.length > 0, `${lattice.quality} structural loop must remain visible`);
    for (const segment of loop.segments) {
      assert.ok(segment.length >= 2, `${lattice.quality} structural segment must be drawable`);
      for (const point of segment) {
        assertSurfacePoint(point, `${lattice.quality} loop point must lie on shell`);
        assert.equal(
          isPointInsidePolarDomeDoorwayEnvelope(point),
          false,
          `${lattice.quality} structural loop must stop at the doorway`,
        );
      }
    }
  }
}

const visibleCounts = [];
for (const quality of QUALITY_TIERS) {
  const tier = POLAR_DOME_LATTICE_TIERS[quality];
  const lattice = createPolarDomeLattice({ quality });
  const duplicateKeys = new Set();
  const duplicatePositions = new Set();

  assert.deepEqual(
    lattice,
    createPolarDomeLattice({ quality }),
    `${quality} lattice generation must be deterministic`,
  );
  assert.equal(lattice.version, POLAR_DOME_LATTICE_VERSION);
  assert.equal(lattice.quality, quality);
  assert.equal(lattice.rings.length, tier.ringCount);
  assert.equal(lattice.ribs.length, tier.radialRibs);
  assert.equal(lattice.ringSeams.length, tier.ringCount - 1);
  assert.equal(lattice.skeleton.ribs, lattice.ribs);
  assert.equal(lattice.skeleton.ringSeams, lattice.ringSeams);
  assert.equal(lattice.skeleton.baseRing, lattice.baseRing);
  assert.equal(lattice.skeleton.doorwayArch, lattice.doorwayArch);
  assert.equal(lattice.collision.kind, "ellipsoid-hemisphere");
  assert.equal(lattice.collision.space, "component-local");
  assert.equal(lattice.collision.doorway.centerXZ[0], POLAR_DOME_AIRLOCK.position[0]);
  assert.equal(lattice.collision.doorway.centerXZ[1], POLAR_DOME_AIRLOCK.position[2]);
  assert.ok(lattice.visibleCells.length > 0, `${quality} must retain visible cells`);
  assert.ok(lattice.excludedCells.length > 0, `${quality} must reserve a real doorway`);
  assert.equal(
    lattice.cells.length,
    lattice.visibleCells.length + lattice.excludedCells.length,
  );
  assert.ok(
    lattice.cells.length >= tier.cellBudget.min &&
      lattice.cells.length <= tier.cellBudget.max,
    `${quality} cell count must remain within its tier budget`,
  );
  assert.deepEqual(
    {
      excludedCells: lattice.excludedCells.length,
      ringColumns: lattice.rings.map((ring) => ring.columnCount),
      totalCells: lattice.cells.length,
      visibleCells: lattice.visibleCells.length,
    },
    POLAR_DOME_LATTICE_COUNTS[quality],
    `${quality} exported profile metadata must reflect the generated lattice`,
  );

  for (const ring of lattice.rings) {
    const expectedColumns = expectedColumnCount(ring.theta, tier);
    assert.equal(
      ring.columnCount,
      expectedColumns,
      `${quality} ring ${ring.ringIndex} must derive columns from circumference`,
    );
    assert.equal(ring.cells.length, ring.columnCount);
    const stagger = ring.ringIndex % 2 === 0 ? 0.5 : 0;
    closeTo(
      ring.cells[0].angle,
      (stagger / ring.columnCount) * TAU,
      Number.EPSILON * 8,
      `${quality} ring ${ring.ringIndex} must use the deterministic half-cell stagger`,
    );
  }

  for (const cell of lattice.cells) {
    const key = `${cell.ringIndex}:${cell.cellIndex}`;
    const positionKey = cell.position.map((value) => value.toFixed(9)).join(":");
    assert.equal(duplicateKeys.has(key), false, `duplicate cell ${key}`);
    assert.equal(duplicatePositions.has(positionKey), false, `duplicate cell position ${positionKey}`);
    duplicateKeys.add(key);
    duplicatePositions.add(positionKey);

    assert.ok(cell.scale.every((value) => value > 0), `${key} scale must be positive`);
    closeTo(length(cell.normal), 1, EPSILON, `${key} normal must be unit length`);
    closeTo(length(cell.tangent), 1, EPSILON, `${key} tangent must be unit length`);
    closeTo(length(cell.bitangent), 1, EPSILON, `${key} bitangent must be unit length`);
    closeTo(dot(cell.normal, cell.tangent), 0, EPSILON, `${key} normal/tangent must be orthogonal`);
    closeTo(dot(cell.normal, cell.bitangent), 0, EPSILON, `${key} normal/bitangent must be orthogonal`);
    closeTo(dot(cell.tangent, cell.bitangent), 0, EPSILON, `${key} tangent/bitangent must be orthogonal`);
    assert.ok(
      dot(cross(cell.tangent, cell.bitangent), cell.normal) > 1 - EPSILON,
      `${key} frame must be right-handed`,
    );
    assert.ok(
      dot(cell.normal, subtract(cell.position, POLAR_DOME_LATTICE_GEOMETRY.center)) > 0,
      `${key} normal must face outward`,
    );
    // Blocks are laid by hand against the shell, not welded to it: each carries a
    // bounded proud/recessed offset along its own normal so the dome's outline is
    // masonry rather than a mathematically smooth sphere. The skeleton and the
    // collision shell are still asserted exactly on the surface above, so this
    // tolerance cannot hide a cell that has genuinely drifted off the dome.
    assertSeatedPoint(cell.position, `${key} must stay seated on shell`);
    assert.equal(cell.weight, cell.responseWeight, `${key} public weight must be authoritative`);
    assert.ok(cell.weight >= 0.08 && cell.weight <= 0.9, `${key} response must be bounded`);
    assert.ok(cell.structuralSupport >= 0 && cell.structuralSupport <= 1, `${key} support must be bounded`);
    assert.ok(cell.ringMass >= 1 && cell.ringMass <= 2.35, `${key} ring mass must be bounded`);
    assert.ok(cell.mass >= 1 && cell.mass <= 4.5, `${key} effective mass must be bounded`);
    assert.equal(
      doesPolarDomeCellIntersectDoorway(cell),
      cell.doorwayExcluded,
      `${key} doorway flag must include the projected cell extent`,
    );
  }

  assert.ok(
    lattice.visibleCells.every((cell) => !doesPolarDomeCellIntersectDoorway(cell)),
    `${quality} visible cells must not overlap the arched doorway`,
  );
  assert.ok(
    lattice.excludedCells.every((cell) => doesPolarDomeCellIntersectDoorway(cell)),
    `${quality} excluded cells must intersect the arched doorway`,
  );

  const buttresses = lattice.ribs.filter(
    (rib) => rib.structuralRole === "doorway-buttress",
  );
  assert.equal(buttresses.length, 2, `${quality} must brace both doorway shoulders`);
  assertSkeletonClearOfDoorway(lattice);

  const firstArchPoint = lattice.doorwayArch[0];
  const lastArchPoint = lattice.doorwayArch.at(-1);
  for (const [point, expectedLateral] of [
    [firstArchPoint, -POLAR_DOME_DOORWAY.halfWidth],
    [lastArchPoint, POLAR_DOME_DOORWAY.halfWidth],
  ]) {
    const offset = [
      point[0] - POLAR_DOME_DOORWAY.centerXZ[0],
      point[2] - POLAR_DOME_DOORWAY.centerXZ[1],
    ];
    closeTo(
      dotXZ(offset, POLAR_DOME_DOORWAY.tangentXZ),
      expectedLateral,
      EPSILON,
      `${quality} doorway arch endpoint must align to the rendered airlock tangent`,
    );
    closeTo(
      dotXZ(offset, POLAR_DOME_DOORWAY.axisXZ),
      0.018,
      EPSILON,
      `${quality} doorway arch endpoint must sit on the rendered airlock face`,
    );
    closeTo(
      point[1],
      POLAR_DOME_DOORWAY.archCenterY,
      EPSILON,
      `${quality} doorway arch endpoint must start at spring height`,
    );
  }

  const crown = lattice.visibleCells.reduce((best, cell) =>
    cell.height01 > best.height01 ? cell : best,
  );
  const root = lattice.visibleCells.reduce((best, cell) =>
    cell.height01 < best.height01 ? cell : best,
  );
  const farFromCrown = lattice.visibleCells.reduce((best, cell) =>
    dot(cell.normal, crown.normal) < dot(best.normal, crown.normal) ? cell : best,
  );
  assert.ok(crown.responseWeight > root.responseWeight, `${quality} crown must flex more than root`);
  assert.ok(root.mass > crown.mass, `${quality} root ring must remain heavier than crown`);
  assert.ok(root.structuralSupport > crown.structuralSupport, `${quality} root must retain stronger support`);
  closeTo(
    computePolarDomeInteractionWeight(crown, crown.normal),
    crown.responseWeight,
    EPSILON,
    `${quality} local interaction must preserve the cell response weight`,
  );
  assert.ok(
    computePolarDomeInteractionWeight(crown, farFromCrown.normal) < 0.001,
    `${quality} geodesically distant cells must not inherit local hover response`,
  );

  visibleCounts.push(lattice.visibleCells.length);
}

assert.ok(
  visibleCounts[0] < visibleCounts[1] && visibleCounts[1] < visibleCounts[2],
  "quality tiers must increase visible lattice detail",
);

closeTo(POLAR_DOME_AIRLOCK.axisXZ[0], Math.sin(POLAR_DOME_AIRLOCK.rotationY));
closeTo(POLAR_DOME_AIRLOCK.axisXZ[1], Math.cos(POLAR_DOME_AIRLOCK.rotationY));
closeTo(POLAR_DOME_AIRLOCK.tangentXZ[0], Math.cos(POLAR_DOME_AIRLOCK.rotationY));
closeTo(POLAR_DOME_AIRLOCK.tangentXZ[1], -Math.sin(POLAR_DOME_AIRLOCK.rotationY));
assert.deepEqual(POLAR_DOME_DOORWAY.centerXZ, [
  POLAR_DOME_AIRLOCK.position[0],
  POLAR_DOME_AIRLOCK.position[2],
]);

const corridorPoint = [
  POLAR_DOME_DOORWAY.centerXZ[0] + POLAR_DOME_DOORWAY.axisXZ[0] * 0.2,
  POLAR_DOME_DOORWAY.archCenterY - 0.05,
  POLAR_DOME_DOORWAY.centerXZ[1] + POLAR_DOME_DOORWAY.axisXZ[1] * 0.2,
];
const outsideDoorwayLateral = [
  corridorPoint[0] +
    POLAR_DOME_DOORWAY.tangentXZ[0] * (POLAR_DOME_DOORWAY.clearHalfWidth + 0.05),
  corridorPoint[1],
  corridorPoint[2] +
    POLAR_DOME_DOORWAY.tangentXZ[1] * (POLAR_DOME_DOORWAY.clearHalfWidth + 0.05),
];
const behindDoorway = [
  POLAR_DOME_DOORWAY.centerXZ[0] -
    POLAR_DOME_DOORWAY.axisXZ[0] * (POLAR_DOME_DOORWAY.corridorBack + 0.05),
  corridorPoint[1],
  POLAR_DOME_DOORWAY.centerXZ[1] -
    POLAR_DOME_DOORWAY.axisXZ[1] * (POLAR_DOME_DOORWAY.corridorBack + 0.05),
];
assert.equal(isPointInsidePolarDomeDoorway(corridorPoint), true);
assert.equal(isPointInsidePolarDomeDoorway(outsideDoorwayLateral), false);
assert.equal(isPointInsidePolarDomeDoorway(behindDoorway), false);

const shellPoint = [
  POLAR_DOME_LATTICE_GEOMETRY.center[0] + POLAR_DOME_LATTICE_GEOMETRY.radii[0],
  POLAR_DOME_LATTICE_GEOMETRY.center[1],
  POLAR_DOME_LATTICE_GEOMETRY.center[2],
];
const shellClassification = classifyPolarDomeCollisionPoint(shellPoint);
assert.equal(shellClassification.onShell, true);
assert.equal(shellClassification.doorwayCorridor, false);
assert.equal(shellClassification.blocked, true, "shell must block away from doorway");

const doorwayRayStart = [
  POLAR_DOME_DOORWAY.centerXZ[0] + POLAR_DOME_DOORWAY.axisXZ[0] * 1.2,
  corridorPoint[1],
  POLAR_DOME_DOORWAY.centerXZ[1] + POLAR_DOME_DOORWAY.axisXZ[1] * 1.2,
];
const doorwayRayEnd = [
  POLAR_DOME_DOORWAY.centerXZ[0] - POLAR_DOME_DOORWAY.axisXZ[0] * 0.2,
  corridorPoint[1],
  POLAR_DOME_DOORWAY.centerXZ[1] - POLAR_DOME_DOORWAY.axisXZ[1] * 0.2,
];
const doorwayTrace = tracePolarDomeCollisionSegment(doorwayRayStart, doorwayRayEnd);
assert.equal(doorwayTrace.crossings.length, 1, "doorway approach must cross the shell once");
assert.equal(doorwayTrace.crossings[0].doorwayCorridor, true);
assert.equal(doorwayTrace.blocked, false, "the rendered doorway corridor must remain passable");

const blockedRayY = POLAR_DOME_LATTICE_GEOMETRY.center[1] + 0.4;
const blockedTrace = tracePolarDomeCollisionSegment(
  [
    POLAR_DOME_LATTICE_GEOMETRY.center[0] - POLAR_DOME_LATTICE_GEOMETRY.radii[0] - 0.5,
    blockedRayY,
    POLAR_DOME_LATTICE_GEOMETRY.center[2],
  ],
  [
    POLAR_DOME_LATTICE_GEOMETRY.center[0],
    blockedRayY,
    POLAR_DOME_LATTICE_GEOMETRY.center[2],
  ],
);
assert.equal(blockedTrace.crossings.length, 1);
assert.equal(blockedTrace.blocked, true, "collision shell must remain continuous outside doorway");

let springAtSixty = { displacement: POLAR_DOME_INTERACTION_PROFILE.maxDisplacement, velocity: 0 };
let springAtThirty = springAtSixty;
let signChanges = 0;
let previousSign = Math.sign(springAtSixty.displacement);
for (let index = 0; index < 240; index += 1) {
  springAtSixty = stepPolarDomeSpring(springAtSixty, 1 / 60, 0);
  assert.ok(
    Math.abs(springAtSixty.displacement) <=
      POLAR_DOME_INTERACTION_PROFILE.maxDisplacement + Number.EPSILON,
    "spring displacement must remain bounded",
  );
  const nextSign = Math.sign(springAtSixty.displacement);
  if (nextSign && previousSign && nextSign !== previousSign) signChanges += 1;
  if (nextSign) previousSign = nextSign;
}
for (let index = 0; index < 120; index += 1) {
  springAtThirty = stepPolarDomeSpring(springAtThirty, 1 / 30, 0);
}
closeTo(
  springAtSixty.displacement,
  springAtThirty.displacement,
  1e-10,
  "analytic spring must remain stable across frame rates",
);
closeTo(
  springAtSixty.velocity,
  springAtThirty.velocity,
  1e-10,
  "analytic spring velocity must remain stable across frame rates",
);
assert.ok(signChanges <= 1, "near-critical return must not visibly oscillate");
assert.ok(
  Math.abs(springAtSixty.displacement) < 0.0001,
  "near-critical return must settle without permanent deformation",
);

const domeSource = readFileSync(
  new URL("../components/PolarObservatoryDome.jsx", import.meta.url),
  "utf8",
);
for (const [pattern, message] of [
  [/POLAR_DOME_AIRLOCK/, "component must consume the shared airlock authority"],
  [/POLAR_DOME_LATTICE_COUNTS/, "component must publish generated quality counts"],
  [/createPolarDomeLattice\(\{ quality: tier \}\)/, "component must build the shared tier lattice"],
  [/for \(const cell of lattice\.visibleCells\)/, "instances must consume visible lattice cells"],
  [/matrixBasis\.makeBasis\(tangent, bitangent, normal\)/, "instances must consume the lattice frame"],
  [/<InstancedDomeBlocks[\s\S]*assets=\{instancedAssets\}[\s\S]*lattice=\{lattice\}[\s\S]*\/>/, "medium/high must render shared cell instances"],
  [/<MergedLatticeSkeleton/, "component must render the structural skeleton"],
  [/lattice\.ringSeams/, "component must render ring seams"],
  [/lattice\.baseRing\.segments/, "component must render the base compression ring"],
  [/lattice\.doorwayArch/, "component must render the aligned doorway arch"],
  [/position=\{AIRLOCK\.position\}/, "airlock position must use shared authority"],
  [/rotation=\{\[0, AIRLOCK\.rotationY, 0\]\}/, "airlock rotation must use shared authority"],
  [/computePolarDomeInteractionWeight/, "per-brick hover must use geodesic weights"],
  [/stepPolarDomeSpring/, "component recoil must use the stable shared spring"],
  [/collision: lattice\.collision/, "component metadata must expose collision authority"],
  [/shellBlocksByQuality:[\s\S]*POLAR_DOME_LATTICE_COUNTS\.high\.visibleCells[\s\S]*POLAR_DOME_LATTICE_COUNTS\.medium\.visibleCells/, "profile counts must reflect the generated lattice"],
  [/material=\{tier === "low" \? shellMaterial : innerShellMaterial\}/, "medium/high inner shell must not fake brick courses"],
]) {
  assert.match(domeSource, pattern, message);
}

for (const [pattern, message] of [
  [/function domeSurfaceFrame/, "component must not duplicate lattice frame math"],
  [/highAndMediumShellBlocks:\s*104/, "profile must not retain the old fixed shell count"],
  [/DOME_TILE_COLUMNS_BY_ROW\[row\][\s\S]*blocks\.push/, "component must not rebuild a second brick lattice"],
  [/TextureLoader|useTexture|normalMap|displacementMap|\bmap=/, "dome must not use texture-faked bricks"],
]) {
  assert.doesNotMatch(domeSource, pattern, message);
}

console.log(
  `polar dome lattice contract passed (${visibleCounts.join("/")} visible cells; rendered-airlock corridor aligned)`,
);
