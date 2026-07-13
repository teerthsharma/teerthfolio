import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const libraryPath = join(root, "lib", "polar-station-mechanism-layer.js");
const componentPath = join(root, "components", "PolarStationMechanismLayer.jsx");
const scenePath = join(root, "components", "IglooScene.jsx");
const artifactsPath = join(root, "components", "IglooArtifacts.jsx");
const worldPath = join(root, "components", "IglooWorld.jsx");
const packagePath = join(root, "package.json");
const northeastPath = join(root, "components", "PolarStationMechanismsNE.jsx");
const southwestPath = join(root, "components", "PolarStationMechanismsSW.jsx");
const northeastLibraryPath = join(root, "lib", "polar-station-mechanisms.js");
const southwestLibraryPath = join(root, "lib", "polar-station-mechanisms-sw.js");

assert.ok(
  existsSync(libraryPath),
  "lib/polar-station-mechanism-layer.js must own deterministic family selection",
);
assert.ok(
  existsSync(componentPath),
  "components/PolarStationMechanismLayer.jsx must mount at most one mechanism family",
);

const layer = await import(pathToFileURL(libraryPath).href);
const {
  MECHANISM_BASE_MOTION_CONFLICTS,
  MECHANISM_FAMILY_IDS,
  MECHANISM_LAYER_INTEGRATION,
  MECHANISM_LAYER_BUDGET,
  buildMechanismSourceContext,
  isMechanismEvidenceReady,
  resolveMechanismLayerSelection,
} = layer;
const { NE_MECHANISM_BUDGET } = await import(
  pathToFileURL(northeastLibraryPath).href
);
const { SW_MECHANISM_BUDGET } = await import(
  pathToFileURL(southwestLibraryPath).href
);

const northeast = [
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
];
const southwest = [
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

assert.deepEqual(MECHANISM_FAMILY_IDS.northeast, northeast);
assert.deepEqual(MECHANISM_FAMILY_IDS.southwest, southwest);
assert.ok(Object.isFrozen(MECHANISM_FAMILY_IDS));
assert.ok(Object.values(MECHANISM_FAMILY_IDS).every(Object.isFrozen));
assert.deepEqual(MECHANISM_LAYER_BUDGET, {
  high: { activeFamilies: 1, drawCalls: 12, programs: 3, textures: 0 },
  medium: { activeFamilies: 1, drawCalls: 12, programs: 3, textures: 0 },
  low: { activeFamilies: 1, drawCalls: 4, programs: 2, textures: 0 },
  safe: { activeFamilies: 0, drawCalls: 0, programs: 0, textures: 0 },
});
assert.deepEqual(NE_MECHANISM_BUDGET, {
  high: { drawCalls: 12, programs: 3, textures: 0 },
  medium: { drawCalls: 12, programs: 3, textures: 0 },
  low: { drawCalls: 4, programs: 2, textures: 0 },
  safe: { drawCalls: 0, programs: 0, textures: 0 },
});
assert.deepEqual(SW_MECHANISM_BUDGET, {
  high: { drawCalls: 9, programs: 3, textures: 0 },
  medium: { drawCalls: 9, programs: 3, textures: 0 },
  low: { drawCalls: 4, programs: 1, textures: 0 },
  safe: { drawCalls: 0, programs: 0, textures: 0 },
});

const stationDocks = {
  "s2-kernel-core": [-6.01, 15.61],
  "manifold-reactor": [9.55, 14.33],
  "field-chamber-coils": [20.21, 4.76],
  "qpu-ice-bridge": [18, -9.6],
  "upstream-radio-mast": [3.59, -16.74],
  "topology-archive-wall": [-13.47, -13.47],
  "assembly-tool-locker": [-20.98, -2.33],
};

for (const [stationId, [x, z]] of Object.entries(stationDocks)) {
  const selection = resolveMechanismLayerSelection(
    { dockedId: stationId, proximityStationId: stationId, x, z },
    stationId,
  );
  assert.equal(selection.stationId, stationId, `${stationId} must select itself`);
  assert.equal(
    selection.family,
    northeast.includes(stationId) ? "northeast" : "southwest",
    `${stationId} must select the correct family`,
  );
  assert.equal(selection.distance, 0);
  assert.ok(selection.withinFarRadius);
}

for (const [x, z] of [[-15, 7], [-19.26, 8.99]]) {
  assert.equal(
    resolveMechanismLayerSelection(
      { dockedId: "observatory-plaque", proximityStationId: "observatory-plaque", x, z },
      "observatory-plaque",
    ).family,
    null,
    "Plaque must never allocate a station mechanism family",
  );
}

assert.equal(
  resolveMechanismLayerSelection({ x: 200, z: 200 }, "s2-kernel-core").family,
  null,
  "semantic focus must not allocate a mechanism when the seal is outside every far radius",
);
assert.equal(
  resolveMechanismLayerSelection(stationDocks["s2-kernel-core"], null, {
    safeMode: true,
  }).family,
  null,
  "safe mode allocates zero mechanism families",
);
assert.equal(
  resolveMechanismLayerSelection(stationDocks["s2-kernel-core"], null, {
    visible: false,
  }).family,
  null,
  "offscreen worlds allocate zero mechanism families",
);

const liveSummary = Object.freeze({
  sourceMode: "live-github",
  profile: Object.freeze({ login: "teerthsharma" }),
  latest: Object.freeze([
    Object.freeze({ repo: "google-deepmind/mujoco", url: "https://github.com/google-deepmind/mujoco/pull/1" }),
  ]),
});
const projects = Object.freeze([
  Object.freeze({
    domain: "Topology / Geometric ML",
    fullName: "teerthsharma/lambda-topo",
    name: "lambda-topo",
    url: "https://github.com/teerthsharma/lambda-topo",
  }),
  Object.freeze({
    domain: "Operating Systems / Runtime",
    fullName: "teerthsharma/Epsilon-Hollow",
    name: "Epsilon-Hollow",
    url: "https://github.com/teerthsharma/Epsilon-Hollow",
  }),
]);
const sourceContext = buildMechanismSourceContext(liveSummary, projects);
assert.equal(
  sourceContext.upstreamMetadata,
  liveSummary,
  "upstream metadata must remain the unaltered server/API summary",
);
assert.equal(sourceContext.topologyEvidence.category, "all");
assert.deepEqual(
  sourceContext.topologyEvidence.sources.map(({ category, name, sourceUrl }) => ({
    category,
    name,
    sourceUrl,
  })),
  [
    {
      category: "Topology / Geometric ML",
      name: "lambda-topo",
      sourceUrl: "https://github.com/teerthsharma/lambda-topo",
    },
    {
      category: "Operating Systems / Runtime",
      name: "Epsilon-Hollow",
      sourceUrl: "https://github.com/teerthsharma/Epsilon-Hollow",
    },
  ],
);
assert.equal(sourceContext.assemblyInspection.paused, false);
assert.equal(sourceContext.assemblyInspection.scrub, null);
assert.deepEqual(
  sourceContext.assemblyInspection.evidenceSources,
  sourceContext.topologyEvidence.sources,
  "assembly proof must retain the same honest project evidence rather than invented parts",
);

const activeSelection = {
  family: "southwest",
  stationId: "upstream-radio-mast",
};
assert.equal(
  isMechanismEvidenceReady(
    "upstream-radio-mast",
    { evidenceReady: true, phase: "RECEIVE" },
    activeSelection,
  ),
  true,
);
assert.equal(
  isMechanismEvidenceReady(
    "upstream-radio-mast",
    { evidenceReady: false, phase: "SYNC" },
    activeSelection,
  ),
  false,
  "approach/animation state must never emit evidence before the physical proof",
);
assert.equal(
  isMechanismEvidenceReady(
    "topology-archive-wall",
    { evidenceReady: true, phase: "OPEN_ARCHIVE" },
    activeSelection,
  ),
  false,
  "a stale non-selected mechanism must never emit evidence",
);

assert.deepEqual(
  MECHANISM_BASE_MOTION_CONFLICTS.stationIds,
  [...northeast, ...southwest],
);
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("StationInteractionRig"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("ArtifactMesh continuous bob"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("ArtifactMesh continuous yaw"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("physical-station-subject"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("StationGridPedestal"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("StationSurfaceMaterial"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.disable.includes("station point light"));
assert.ok(MECHANISM_BASE_MOTION_CONFLICTS.keep.includes("mechanism-navigation-proxy"));
assert.equal(MECHANISM_BASE_MOTION_CONFLICTS.visualOwner, "PolarStationMechanismLayer");
assert.equal(
  MECHANISM_LAYER_INTEGRATION.visualOwnership,
  "PolarStationMechanismLayer exclusively owns the visible station architecture; IglooArtifacts owns navigation only",
);
assert.match(MECHANISM_LAYER_INTEGRATION.navigationProxy, /colorWrite false/);
assert.match(MECHANISM_LAYER_INTEGRATION.navigationProxy, /depthWrite false/);
assert.ok(!("baseSilhouette" in MECHANISM_LAYER_INTEGRATION));

const source = readFileSync(componentPath, "utf8");
for (const token of [
  "PolarStationMechanismsNE",
  "PolarStationMechanismsSW",
  "NE_MECHANISM_BUDGET",
  "SW_MECHANISM_BUDGET",
  "FAMILY_BUDGETS",
  "resolveFamilyBudget",
  "traversalPoseRef",
  "activeArtifactId",
  "quality",
  "reducedMotion",
  "safeMode",
  "visible",
  "liveSummary",
  "projects",
  "mechanismStateRef",
  "ritualStateRef",
  "onEvidenceReady",
  "topologyEvidenceRef",
  "assemblyInspectionRef",
  "upstreamMetadataRef",
  "isMechanismEvidenceReady",
  "mountedFamily === \"northeast\"",
  "mountedFamily === \"southwest\"",
  "familyRootRef",
  "baseOpacity",
  "mechanismActiveFamilies",
  "mechanismDrawBudget",
  "mechanismProgramBudget",
  "mechanismTextureBudget",
  "mechanismFamily",
  "mechanismOpacity",
  "mechanismStation",
]) {
  assert.ok(source.includes(token), `mechanism layer is missing ${JSON.stringify(token)}`);
}
for (const forbidden of [
  "Math.random",
  "useTexture",
  "TextureLoader",
  "CanvasTexture",
  "/assets/",
  "breathingMultiplier =",
  "mascot",
]) {
  assert.ok(!source.includes(forbidden), `mechanism layer must not include ${JSON.stringify(forbidden)}`);
}
assert.equal(
  (source.match(/useFrame\(/g) || []).length,
  1,
  "the orchestration layer must use one shared selection/handoff frame authority",
);
assert.equal(
  (source.match(/<PolarStationMechanismsNE/g) || []).length,
  1,
  "northeast family mounts from one conditional branch",
);
assert.equal(
  (source.match(/<PolarStationMechanismsSW/g) || []).length,
  1,
  "southwest family mounts from one conditional branch",
);
assert.match(
  source,
  /resolveFamilyBudget\(desiredFamily, quality, safeMode\)/,
  "first family mount must publish the selected family's authoritative budget",
);
assert.match(
  source,
  /resolveFamilyBudget\(mountedFamilyRef\.current, quality, safeMode\)/,
  "steady-state diagnostics must publish the mounted family's authoritative budget",
);

const northeastSource = readFileSync(northeastPath, "utf8");
for (const token of [
  "RoundedBoxGeometry",
  "mergeGeometries",
  "createS2AntimatterCryostatGeometry",
  "createS2PenningTrapCoilGeometry",
  "createS2DiagnosticBeamlineGeometry",
  "createAetherPrimordialSanctuaryGeometry",
  "createAetherShieldHemisphereGeometry",
  "createAetherFirstEnergySeedGeometry",
  "createFieldContainmentFrameGeometry",
  "createFieldHelixGeometry",
  "createQpuCausewayFrameGeometry",
  "createQpuCoherencePlateGeometry",
  "awardLowPass",
  "s2-cern-antimatter-cryostat",
  "aether-primordial-first-energy-sanctuary",
  "field-graphite-copper-contained-thermal-chamber",
  "qpu-jade-cyan-coherence-causeway",
  "materials.s2Frame",
  "materials.aetherFrame",
  "materials.fieldFrame",
  "materials.qpuFrame",
  "customProgramCacheKey",
  "resolveNortheastStationReveal",
  "stationRootRefs",
  "promiseId",
]) {
  assert.ok(northeastSource.includes(token), `northeast visual correction is missing ${JSON.stringify(token)}`);
}
for (const forbidden of [
  "material={resources.surface}",
  "material={resources.glow}",
  "material={resources.line}",
  "aether-nested-loops",
  "field-opposed-coils",
  "qpu-stepped-ice-coherence-span",
]) {
  assert.ok(!northeastSource.includes(forbidden), `northeast renderer still uses undifferentiated ${forbidden}`);
}
assert.equal(
  (northeastSource.match(/<instancedMesh/g) || []).length,
  12,
  "NE high/medium must retain three bounded architectural pools per monument",
);
assert.equal(
  (northeastSource.match(/<lineSegments/g) || []).length,
  0,
  "NE silhouettes cannot depend on thin debug-line draws",
);

const southwestSource = readFileSync(southwestPath, "utf8");
for (const token of [
  "createHarborMemberGeometry",
  "createBearingDishGeometry",
  "createArchiveSlabGeometry",
  "createAssemblyBlockGeometry",
  "materials.upstreamSurface",
  "materials.upstreamSignal",
  "materials.topologySurface",
  "materials.topologyTrace",
  "materials.assemblySurface",
  "materials.assemblyProof",
  "upstream-coral-signal-harbor-footing-and-bearing-cradle",
  "upstream-bearing-dish",
  "topology-thick-relational-archive-canyon-walls-and-plinths",
  "assembly-heavy-curved-gantry-inspection-backplane-and-proof-tool-mass",
  "DoubleSide",
  "resolveSouthwestStationReveal",
  "stationRootRefs",
  "promiseId",
]) {
  assert.ok(southwestSource.includes(token), `southwest visual correction is missing ${JSON.stringify(token)}`);
}
for (const forbidden of [
  "material={resources.surface}",
  "material={resources.glow}",
  "material={resources.line}",
]) {
  assert.ok(!southwestSource.includes(forbidden), `southwest renderer still uses undifferentiated ${forbidden}`);
}
assert.equal(
  (southwestSource.match(/<instancedMesh/g) || []).length,
  8,
  "SW high/medium must retain eight bounded compound instance pools",
);
assert.equal(
  (southwestSource.match(/<lineSegments/g) || []).length,
  1,
  "SW topology may use only its single bounded relational trace draw",
);

const sceneSource = readFileSync(scenePath, "utf8");
for (const token of [
  'import PolarStationMechanismLayer from "./PolarStationMechanismLayer"',
  "const mechanismStateRef = useRef(null)",
  "const mechanismRitualStateRef = useRef(null)",
  "const mechanismEvidenceRef = useRef(null)",
  "handleMechanismEvidenceReady",
  "<PolarStationMechanismLayer",
  "traversalPoseRef={traversalPoseRef}",
  "activeArtifactId={activeArtifact.id}",
  "liveSummary={liveSummary}",
  "projects={projects}",
  "mechanismStateRef={mechanismStateRef}",
  "ritualStateRef={mechanismRitualStateRef}",
  "onEvidenceReady={handleMechanismEvidenceReady}",
  "safeMode={!renderEnabled}",
  "visible={worldActive}",
]) {
  assert.ok(sceneSource.includes(token), `IglooScene integration is missing ${JSON.stringify(token)}`);
}
assert.ok(
  sceneSource.indexOf("<IglooArtifacts") < sceneSource.indexOf("<PolarStationMechanismLayer"),
  "base monument silhouettes must mount before detailed station mechanisms",
);
assert.ok(
  sceneSource.indexOf("<PolarStationMechanismLayer") < sceneSource.indexOf("<RetroCinematicPostProcess"),
  "station mechanisms must pass through the shared cinematic post process",
);
assert.ok(
  sceneSource.includes("evidenceReady: state?.evidenceReady === true"),
  "scene evidence ref must retain the physical proof flag",
);
assert.ok(
  !sceneSource.includes("setMechanismEvidence"),
  "physical proof must not directly mutate DOM evidence state",
);

const artifactsSource = readFileSync(artifactsPath, "utf8");
for (const token of [
  "MECHANISM_BASE_MOTION_CONFLICTS",
  "MECHANISM_STATION_IDS",
  "mechanismMotionOwned",
  "if (mechanismMotionOwned)",
  "mechanism-navigation-proxy",
  'visualOwner: "PolarStationMechanismLayer"',
  "transparent-navigation-volume",
  "colorWrite={false}",
  "depthTest={false}",
  "depthWrite={false}",
  "opacity={0}",
]) {
  assert.ok(artifactsSource.includes(token), `IglooArtifacts visual-ownership handoff is missing ${JSON.stringify(token)}`);
}
const proxyMatch = artifactsSource.match(
  /if \(mechanismMotionOwned\) \{([\s\S]*?)\r?\n {2}\}\r?\n\r?\n {2}return \(/,
);
assert.ok(proxyMatch, "mechanism navigation proxy branch is missing");
const proxyStart = proxyMatch.index;
const proxyBranchEnd = proxyStart + proxyMatch[0].length;
const legacyVisualStart = artifactsSource.indexOf("<StationGridPedestal", proxyBranchEnd);
assert.ok(
  legacyVisualStart > proxyBranchEnd,
  "mechanism stations must return their navigation proxy before any legacy pedestal/subject/light JSX",
);
const proxyBranch = proxyMatch[1];
for (const forbidden of [
  "StationGridPedestal",
  "StationSurfaceMaterial",
  "physical-station-subject",
  "pointLight",
]) {
  assert.ok(
    !proxyBranch.includes(forbidden),
    `transparent mechanism proxy must not retain legacy visible overlap: ${forbidden}`,
  );
}
assert.equal(
  (proxyBranch.match(/<meshBasicMaterial/g) || []).length,
  1,
  "mechanism proxy must use one non-rendering pointer volume",
);

const worldSource = readFileSync(worldPath, "utf8");
const sceneCallStart = worldSource.indexOf("<IglooScene");
const sceneCallEnd = worldSource.indexOf("/>", sceneCallStart);
const sceneCall = worldSource.slice(sceneCallStart, sceneCallEnd);
assert.ok(sceneCall.includes("liveSummary={liveSummary}"));
assert.ok(sceneCall.includes("projects={projects}"));

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
assert.equal(
  packageJson.scripts["check:station-mechanisms-ne"],
  "node scripts/check-polar-station-mechanisms-ne.mjs",
);
assert.equal(
  packageJson.scripts["check:station-mechanisms-sw"],
  "node scripts/check-polar-station-mechanisms-sw.mjs",
);
assert.equal(
  packageJson.scripts["check:station-mechanism-layer"],
  "node scripts/check-polar-station-mechanism-layer.mjs",
);
for (const command of [
  "npm run check:station-mechanisms-ne",
  "npm run check:station-mechanisms-sw",
  "npm run check:station-mechanism-layer",
]) {
  assert.ok(packageJson.scripts.build.includes(command), `build gate is missing ${command}`);
}

console.log(
  "Polar station mechanism layer verified: one nearest family, 12/4/0 draw tiers, proof-gated evidence, honest source refs, deterministic handoff, zero textures.",
);
