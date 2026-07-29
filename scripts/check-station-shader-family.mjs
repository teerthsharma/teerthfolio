import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  POLAR_XZ_SHADER_POLICY,
  STATION_SHADER_FAMILY_POLICY,
  STATION_SHADER_PROFILES,
} from "../lib/polar-art-direction.js";

const root = process.cwd();
const readSource = (relativePath) => readFileSync(join(root, ...relativePath.split("/")), "utf8");
const stationIds = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

assert.deepEqual(Object.keys(STATION_SHADER_PROFILES), stationIds);
assert.ok(Object.isFrozen(STATION_SHADER_PROFILES), "station shader profiles must be frozen");
assert.ok(
  Object.values(STATION_SHADER_PROFILES).every(Object.isFrozen),
  "each station shader profile must be frozen",
);
assert.equal(
  new Set(Object.values(STATION_SHADER_PROFILES).map(({ silhouette }) => silhouette)).size,
  stationIds.length,
  "all eight physical stations need distinct silhouette responses",
);
assert.equal(
  new Set(
    Object.values(STATION_SHADER_PROFILES).map(
      ({ angle, macroScale, rimPower, stripeScale }) => `${angle}:${macroScale}:${rimPower}:${stripeScale}`,
    ),
  ).size,
  stationIds.length,
  "all eight stations need distinct branch-free shader profiles",
);

assert.equal(STATION_SHADER_FAMILY_POLICY.coordinateSpace, POLAR_XZ_SHADER_POLICY.coordinateSpace);
assert.deepEqual(STATION_SHADER_FAMILY_POLICY.compiledVariants, ["low", "full"]);
assert.equal(STATION_SHADER_FAMILY_POLICY.maxCompiledVariants, 2);
assert.equal(STATION_SHADER_FAMILY_POLICY.stationIdBranches, 0);
assert.equal(STATION_SHADER_FAMILY_POLICY.additionalDrawCalls, 0);
assert.deepEqual(STATION_SHADER_FAMILY_POLICY.qualityMapping, {
  low: "low",
  medium: "full",
  high: "full",
});
assert.deepEqual(STATION_SHADER_FAMILY_POLICY.low, {
  textures: 0,
  vertexNoiseSamples: 0,
  fragmentNoiseSamples: 0,
  vertexDisplacement: 0,
  derivativeNormals: false,
});
assert.deepEqual(STATION_SHADER_FAMILY_POLICY.full, {
  textures: 0,
  vertexNoiseSamples: 1,
  fragmentNoiseSamples: 2,
  derivativeNormals: true,
});

const component = readSource("components/StationSurfaceMaterial.jsx");
for (const needle of [
  "POLAR_XZ_NOISE_GLSL",
  "POLAR_XZ_SHADER_POLICY",
  "STATION_SHADER_FAMILY_POLICY",
  "STATION_SHADER_PROFILES",
  "vStationWorldPosition.xz",
  "dFdx(vStationWorldPosition)",
  "polarXZNoise(stationLocalXZ",
  "customProgramCacheKey",
  "polar-station-surface:${shaderVariant}",
]) {
  assert.ok(component.includes(needle), `StationSurfaceMaterial.jsx is missing ${JSON.stringify(needle)}`);
}
assert.ok(
  !component.includes("vStationWorldPosition.y"),
  "station color geography must use XZ, never a world-Y gradient",
);
assert.equal(
  (component.match(/polarXZNoise\(stationLocalXZ/g) || []).length,
  3,
  "full station shader is budgeted for one vertex and two fragment procedural samples",
);

const artifacts = readSource("components/IglooArtifacts.jsx");
for (const stationId of stationIds) {
  assert.ok(artifacts.includes(stationId), `IglooArtifacts.jsx is missing ${stationId}`);
}
for (const silhouette of [
  "split-kernel-proof-vault",
  "vertical-nerve-reactor",
  "helmholtz-field-gate",
  "segmented-qubit-span",
  "asymmetric-dish-spire",
  "stepped-barcode-vault",
  "forked-tool-gantry",
]) {
  assert.ok(artifacts.includes(silhouette), `IglooArtifacts.jsx is missing monument silhouette ${silhouette}`);
}
assert.ok(artifacts.includes("StationSurfaceMaterial"));
assert.ok(artifacts.includes("quality={quality}"));
assert.ok(artifacts.includes("const stationZoneOrigin"));
assert.ok(artifacts.includes("zoneOrigin={stationZoneOrigin}"));
// Two loops exactly: the station reveal/motion loop, plus the hoisted home-plaque
// accent light. The light's ramp used to live inside the station loop, but the light
// had to leave the visibility-toggled station group so the scene's point-light count
// (a shader program define) stops oscillating and relinking every lit material. Same
// per-frame work, one more callback — and no licence for a third loop.
assert.equal(
  (artifacts.match(/useFrame\(/g) || []).length,
  2,
  "monument art must not add per-frame React/R3F update loops beyond the station loop and the invariant accent light",
);
assert.match(
  artifacts,
  /function HomePlaqueAccentLight\([\s\S]*?useFrame\(\(\{ clock \}\) => \{[\s\S]*?light\.current\.intensity = homeRendered \? peakIntensity \* revealProgress : 0;/,
  "the second loop must be the always-mounted home-plaque accent light driven to zero when unused",
);
assert.doesNotMatch(
  artifacts,
  /stationLight/,
  "the per-station proxy light must not come back inside the reveal-toggled station group",
);

const scene = readSource("components/IglooScene.jsx");
assert.ok(scene.includes("<IglooArtifacts"));
assert.ok(scene.includes("quality={quality}"));

console.log("Station shader family contract verified: 8 profiles, 2 programs, 0 textures, XZ zoning.");
