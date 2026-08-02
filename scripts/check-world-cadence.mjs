import { polarGroundHeight } from "../lib/polar-ground.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WORLD_DRESSING_COLOR_PROFILE,
  WORLD_DRESSING_BUDGET,
  buildWorldDressingLayout,
  createWorldDressingGeometries,
  criticallyDampedStep,
  isWorldDressingPlacementProtected,
  motionWarpFromVelocity,
} from "../lib/polar-world-cadence.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import {
  POLAR_CAMERA_COMPOSITION_CONTRACT,
  solvePolarCameraComposition,
} from "../lib/polar-camera-composition.js";

const syntheticStations = STATION_WORLD_SCHEMA.order.map((id, index) => ({
  id,
  accent: `hsl(${index * 43} 70% 64%)`,
  position: [999 + index, 0, -999 - index],
}));

for (const [quality, budget] of Object.entries(WORLD_DRESSING_BUDGET)) {
  assert.equal(budget.drawCalls, 3, `${quality} dressing must remain exactly three draw calls`);
  assert.equal(
    budget.total,
    budget.near + budget.mid + budget.far,
    `${quality} total must match its three pooled bands`,
  );
}
// Ceilings are per band, because the bands are different things. Mid and far are
// monuments and stay rare; near is ground cover on one instanced draw and is
// budgeted by coverage. A single combined ceiling let the ground be starved to
// keep the monument count honest.
assert.ok(WORLD_DRESSING_BUDGET.low.total <= 200, "low tier must stay at or below 200 objects");
assert.ok(WORLD_DRESSING_BUDGET.high.total <= 700, "high tier must stay at or below 700 objects");
for (const [quality, budget] of Object.entries(WORLD_DRESSING_BUDGET)) {
  assert.ok(
    budget.mid <= 24 && budget.far <= 10,
    `${quality} monument bands must stay rare (mid ${budget.mid}, far ${budget.far})`,
  );
  assert.ok(
    budget.near >= 150,
    `${quality} ground cover must stay a field rather than a route kerb (near ${budget.near})`,
  );
}
assert.ok(
  WORLD_DRESSING_BUDGET.high.far <= 10,
  "far pool must not repeat platter silhouettes across the whole horizon",
);
assert.ok(
  WORLD_DRESSING_COLOR_PROFILE.farFrostMix >= 0.9 &&
    WORLD_DRESSING_COLOR_PROFILE.nearFrostMix >= 0.88 &&
    WORLD_DRESSING_COLOR_PROFILE.ambientFloor >= 0.78,
  "pooled ice and sastrugi must remain near snow/cyan luma instead of falling to gray",
);

const dressingGeometries = createWorldDressingGeometries();
const geometryMetrics = Object.fromEntries(
  Object.entries(dressingGeometries).map(([band, geometry]) => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    return [
      band,
      {
        depth: box.max.z - box.min.z,
        height: box.max.y - box.min.y,
        minY: box.min.y,
        width: box.max.x - box.min.x,
      },
    ];
  }),
);
assert.ok(
  Math.abs(geometryMetrics.far.minY) < 1e-6,
  `far berg geometry must be authored on terrain Y=0, got ${geometryMetrics.far.minY}`,
);
assert.ok(
  geometryMetrics.far.height /
      Math.max(geometryMetrics.far.width, geometryMetrics.far.depth) >=
    0.62,
  "far silhouettes must be upright bergs/nunataks, not horizontal platters",
);
assert.equal(
  dressingGeometries.near.userData.form,
  "wind-carved tapered ridge",
  "near dressing must be authored sastrugi topology, not a flattened primitive slab",
);
assert.equal(
  dressingGeometries.far.userData.form,
  "fractured faceted nunatak",
  "far dressing must read as fractured Antarctic ice rather than cooling towers",
);
assert.ok(
  dressingGeometries.near.attributes.position.count >= 15,
  "sastrugi need enough longitudinal sections for tapered wind-cut ends",
);
assert.ok(
  Math.abs(geometryMetrics.mid.minY) < 1e-6 &&
    geometryMetrics.mid.height /
      Math.max(geometryMetrics.mid.width, geometryMetrics.mid.depth) >=
      1.55,
  "mid geometry must be a grounded vertical expedition beacon",
);
for (const geometry of Object.values(dressingGeometries)) geometry.dispose();

const layout = buildWorldDressingLayout(syntheticStations, { quality: "high" });
const repeated = buildWorldDressingLayout(syntheticStations, { quality: "high" });
assert.deepEqual(layout, repeated, "procedural dressing must be deterministic");
assert.equal(layout.looped, true, "dressing must follow the closed canonical C8 traverse");
assert.equal(layout.bands.near.length, WORLD_DRESSING_BUDGET.high.near);
assert.equal(layout.bands.mid.length, WORLD_DRESSING_BUDGET.high.mid);
assert.equal(layout.bands.far.length, WORLD_DRESSING_BUDGET.high.far);
assert.ok(
  Object.values(layout.bands).flat().every((item) =>
    item.position.every(Number.isFinite) &&
    item.scale.every((value) => Number.isFinite(value) && value > 0) &&
    Number.isFinite(item.morphology) &&
    item.morphology >= 0 &&
    item.morphology <= 1 &&
    STATION_WORLD_SCHEMA.order.includes(item.anchorId),
  ),
  "every pooled object must carry a finite deterministic morphology seed and derive from a real station anchor",
);
for (const [band, placements] of Object.entries(layout.bands)) {
  assert.ok(
    new Set(placements.map((placement) => placement.morphology.toFixed(3))).size >=
      Math.min(4, placements.length),
    `${band} instances must expose enough morphology variation to avoid stamp repetition`,
  );
}
for (const [band, placements] of Object.entries(layout.bands)) {
  assert.ok(
    placements.every(
      (placement) => !isWorldDressingPlacementProtected(placement.position, band),
    ),
    `${band} dressing must stay outside every station hero volume and camera corridor`,
  );
}
assert.ok(
  layout.bands.far.every(
    (placement) =>
      placement.position[1] -
        polarGroundHeight(placement.position[0], placement.position[2]) +
        geometryMetrics.far.minY * placement.scale[1] <=
        -0.06 &&
      placement.rotation[0] === 0 &&
      placement.rotation[2] === 0 &&
      (geometryMetrics.far.height * placement.scale[1]) /
        Math.max(
          geometryMetrics.far.width * placement.scale[0],
          geometryMetrics.far.depth * placement.scale[2],
        ) >=
        0.5,
  ),
  "far berg silhouettes must stay embedded, upright, and taller than platter aspect",
);
assert.ok(
  layout.bands.mid.every(
    (placement) =>
      placement.position[1] -
        polarGroundHeight(placement.position[0], placement.position[2]) +
        geometryMetrics.mid.minY * placement.scale[1] <=
        0 &&
      placement.rotation[0] === 0 &&
      placement.rotation[2] === 0,
  ),
  "mid expedition beacons must stand upright with their bases in terrain",
);
assert.ok(
  layout.bands.near.every(
    (placement) =>
      (geometryMetrics.near.height * placement.scale[1]) /
        Math.max(
          geometryMetrics.near.width * placement.scale[0],
          geometryMetrics.near.depth * placement.scale[2],
        ) <=
      0.34,
  ),
  "near sastrugi must remain low wind-cut terrain detail",
);

const translatedStations = syntheticStations.map((station) => ({
  ...station,
  position: [station.position[0] + 37, station.position[1], station.position[2] - 11],
}));
const translated = buildWorldDressingLayout(translatedStations, { quality: "high" });
assert.deepEqual(
  translated,
  layout,
  "legacy artifact positions must not translate the canonical dressing map",
);

function simulateSpring(fps) {
  let state = { position: 0, velocity: 0 };
  for (let frame = 0; frame < fps; frame += 1) {
    state = criticallyDampedStep(state, 0.11, 12, 1 / fps);
  }
  return state;
}
const spring30 = simulateSpring(30);
const spring60 = simulateSpring(60);
const spring144 = simulateSpring(144);
assert.ok(Math.abs(spring30.position - spring60.position) < 1e-9);
assert.ok(Math.abs(spring60.position - spring144.position) < 1e-9);
assert.ok(spring60.position > 0.109, "movement lift must settle close to its 0.11 target");

assert.deepEqual(motionWarpFromVelocity(0, 0, { quality: "high" }), {
  fisheye: 0,
  x: 0,
  y: 0,
});
const warp = motionWarpFromVelocity(99, -99, { quality: "high" });
assert.ok(warp.fisheye > 0 && warp.fisheye <= 0.008, "moving fisheye must be visible but capped");
assert.ok(Math.hypot(warp.x, warp.y) <= 0.0036, "composition shift must remain below nausea threshold");
assert.deepEqual(motionWarpFromVelocity(5, 2, { quality: "high", reducedMotion: true }), {
  fisheye: 0,
  x: 0,
  y: 0,
});

for (const id of STATION_WORLD_SCHEMA.order) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  const composition = solvePolarCameraComposition({
    height: 1000,
    quality: "high",
    sealPosition: station.dock,
    station,
    width: 1600,
  });
  assert.equal(
    composition.metrics.contractSatisfied,
    true,
    `${id} must preserve the two-subject station/seal composition contract`,
  );
  assert.ok(
    composition.metrics.heroBounds.left >=
      POLAR_CAMERA_COMPOSITION_CONTRACT.heroInsetPixels,
    `${id} hero must retain the 48px cinematic inset`,
  );
}

const [dressingSource, cadenceSource, sceneSource, sealSource, postSource] = await Promise.all([
  readFile(new URL("../components/AdaptivePolarWorldDressing.jsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/polar-world-cadence.js", import.meta.url), "utf8"),
  readFile(new URL("../components/IglooScene.jsx", import.meta.url), "utf8"),
  readFile(new URL("../components/TopologicalSealMascot.jsx", import.meta.url), "utf8"),
  readFile(new URL("../components/RetroCinematicPostProcess.jsx", import.meta.url), "utf8"),
]);

assert.equal(
  dressingSource.match(/<instancedMesh/g)?.length,
  4,
  "dressing must use exactly four instanced draw sites: three sastrugi bands plus one pooled horizon-theatre ring",
);
assert.match(
  dressingSource,
  /HORIZON_THEATRE_POLICY = Object\.freeze\(\{ low: 1, medium: 2, high: 3 \}\)/,
  "horizon theatre must stay tier-bounded to at most three extra draws",
);
assert.doesNotMatch(dressingSource, /useState/, "dressing cannot allocate React state per object or frame");
assert.match(dressingSource, /bands\.near/);
assert.match(dressingSource, /bands\.mid/);
assert.match(dressingSource, /bands\.far/);
assert.match(
  dressingSource,
  /createWorldDressingGeometries/,
  "the rendered pools must use the geometry measured by this contract",
);
assert.match(
  dressingSource,
  /instanceMorphology/,
  "pooled scenery must send per-instance morphology into the Three.js vertex shader",
);
assert.match(
  dressingSource,
  /morphologyWarp/,
  "the vertex shader must vary pooled silhouettes instead of stamping one shape",
);
assert.match(
  dressingSource,
  /UniformsLib\.fog/,
  "custom dressing shader must provide uniforms required by Three.js fog chunks",
);
assert.ok(
  (cadenceSource.match(/\.toNonIndexed\(\)/g) || []).length >= 3,
  "merged cairn primitives must share non-indexed topology",
);
assert.doesNotMatch(
  cadenceSource,
  /function createSastrugiGeometry\(\)[\s\S]*?new THREE\.ConeGeometry/,
  "near sastrugi cannot regress to flattened cone paving slabs",
);
assert.match(sceneSource, /<AdaptivePolarWorldDressing/);
assert.match(sceneSource, /traversalPoseRef=\{traversalPoseRef\}/);
assert.match(
  sceneSource,
  /solvePolarCameraComposition/,
  "camera framing must be solved from canonical station cones and footprints",
);
assert.match(
  sceneSource,
  /dockComposition\.camera\.azimuthDegrees/,
  "CameraRig must consume the authored in-cone two-subject azimuth",
);
assert.match(
  sceneSource,
  /dockComposition\.metrics\.contractSatisfied/,
  "the canvas must expose whether the envelope composition contract was satisfied",
);
assert.doesNotMatch(
  sceneSource,
  /HOME_CAMERA_DISTANCE_DESKTOP|PLAQUE_HOME_CAMERA_AZIMUTH_DEGREES/,
  "camera framing may not regress to one screenshot-specific home constant",
);
assert.match(postSource, /motionPoseRef/);
assert.match(postSource, /uMotionFisheye/);
assert.match(sealSource, /MOVEMENT_LIFT_MAX\s*=\s*0\.145/);
assert.match(sealSource, /criticallyDampedStep/);
assert.match(sealSource, /continuousBreath/, "approved permanent breathing must remain intact");
assert.match(
  sealSource,
  /Math\.sin\(clock\.elapsedTime \* 2\.6\) \* 0\.014/,
  "the approved permanent breath expression must remain byte-for-byte",
);

console.log(
  `world cadence contract passed: ${WORLD_DRESSING_BUDGET.high.total} high-tier objects / 3 draw calls`,
);
