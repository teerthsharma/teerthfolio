import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAMERA_COMPOSITION,
  DOME_XZ_COLOR_ZONES,
  MOTION_TIMINGS,
  POLAR_PALETTE,
  POLAR_XZ_SHADER_POLICY,
  POST_PROCESS_BUDGET,
  STATION_PALETTE,
  WORLD_STREAM_TIMINGS,
  easeWorldStream,
} from "../lib/polar-art-direction.js";
import { deriveSealGuideState, SEAL_GUIDE_STATES } from "../lib/seal-guide-state.js";

const root = process.cwd();
const readSource = (relativePath) => readFileSync(join(root, ...relativePath.split("/")), "utf8");

function expectIncludes(relativePath, needles) {
  const source = readSource(relativePath);
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${relativePath} is missing ${JSON.stringify(needle)}`);
  }
}

assert.deepEqual(POLAR_PALETTE, {
  polarIvory: "#F6F1E7",
  glacierWhite: "#EDF6F9",
  abetoTeal: "#65C1BC",
  dawnCyan: "#8FD0E0",
  skyMint: "#A7E5DF",
  horizonBlue: "#78C9D2",
  horizonIndigo: "#33406E",
  animeInk: "#34384F",
  animeShadow: "#71839B",
  emberAmber: "#E2B86A",
  evidenceMagenta: "#D8478F",
  kelpChartreuse: "#C4D64B",
  signalCobalt: "#3E5BC7",
  aetherViolet: "#8D69D6",
  fieldYellow: "#F4C84E",
  qpuMint: "#4BC076",
  upstreamCoral: "#F47D69",
  fog: "#B8E2DF",
});

assert.deepEqual(DOME_XZ_COLOR_ZONES, {
  frost: "#EDF6F9",
  cream: "#F6F1E7",
  teal: "#65C1BC",
  sage: "#B9D8B1",
  warm: "#F2C98B",
});
assert.equal(POLAR_XZ_SHADER_POLICY.coordinateSpace, "world-xz");
assert.equal(POLAR_XZ_SHADER_POLICY.derivativeNormals, true);
assert.equal(POLAR_XZ_SHADER_POLICY.fragmentNoiseSamples, 2);
assert.deepEqual(POLAR_XZ_SHADER_POLICY.quality, {
  low: { derivativeNormals: false, fragmentNoiseSamples: 0, vertexDisplacement: 0 },
  medium: { derivativeNormals: true, fragmentNoiseSamples: 2, vertexDisplacement: 0.012 },
  high: { derivativeNormals: true, fragmentNoiseSamples: 2, vertexDisplacement: 0.02 },
});

assert.deepEqual(STATION_PALETTE, {
  "observatory-plaque": { surface: "#F4F8ED", accent: "#65C1BC" },
  "s2-kernel-core": { surface: "#A6DFF4", accent: "#3E5BC7" },
  "manifold-reactor": { surface: "#0B2A56", accent: "#2D6FA3" },
  "field-chamber-coils": { surface: "#FFE37A", accent: "#F29C46" },
  "qpu-ice-bridge": { surface: "#BFF4D9", accent: "#4BC076" },
  "upstream-radio-mast": { surface: "#FFB0AF", accent: "#4BC076" },
  "topology-archive-wall": { surface: "#F2D4E8", accent: "#D8478F" },
  "assembly-tool-locker": { surface: "#2A1B4A", accent: "#6D4BE8" },
});

assert.deepEqual(CAMERA_COMPOSITION, {
  desktopFov: 39,
  portraitFov: 46,
  restHeight: 1.48,
  positionDamping: 5.5,
  lookDamping: 7,
});

assert.deepEqual(MOTION_TIMINGS, {
  worldRevealMs: 500,
  stationRevealMs: 200,
  stationStaggerMs: 120,
  probingPulseMs: 900,
  idleBreathMs: 2400,
  blinkMs: 120,
  dockingNodMs: 300,
  waddleHz: 2.2,
  waddleDegrees: 6,
});

assert.deepEqual(WORLD_STREAM_TIMINGS, {
  silhouetteRevealMs: 180,
  terrainRevealMs: 300,
  domeRevealMs: 500,
  stationStartMs: 200,
  stationRevealMs: 200,
  stationStaggerMs: 120,
  easing: "cubic-bezier(0.33, 0, 0.2, 1)",
});

assert.deepEqual(POST_PROCESS_BUDGET, {
  low: { scale: 0.82, fisheye: 0, chroma: 0, ink: 0.08, scanline: 0, pixel: 1, quantize: 0.12, gradeBase: 0.04, gradeCurve: 0.9, shadowSeparation: 0.24 },
  medium: { scale: 0.94, fisheye: 0.003, chroma: 0.55, ink: 0.14, scanline: 0.004, pixel: 1.7, quantize: 0.18, gradeBase: 0.49, gradeCurve: 0.4, shadowSeparation: 0 },
  high: { scale: 1, fisheye: 0.005, chroma: 0.8, ink: 0.18, scanline: 0.007, pixel: 2.2, quantize: 0.24, gradeBase: 0.52, gradeCurve: 0.4, shadowSeparation: 0 },
});

assert.ok(Object.isFrozen(POLAR_PALETTE), "POLAR_PALETTE must be frozen");
assert.ok(Object.isFrozen(DOME_XZ_COLOR_ZONES), "DOME_XZ_COLOR_ZONES must be frozen");
assert.ok(Object.isFrozen(POLAR_XZ_SHADER_POLICY), "POLAR_XZ_SHADER_POLICY must be frozen");
assert.ok(Object.isFrozen(POLAR_XZ_SHADER_POLICY.paletteUniforms), "XZ palette uniforms must be frozen");
assert.ok(Object.values(POLAR_XZ_SHADER_POLICY.quality).every(Object.isFrozen), "XZ shader quality tiers must be frozen");
assert.ok(Object.isFrozen(STATION_PALETTE), "STATION_PALETTE must be frozen");
assert.ok(Object.values(STATION_PALETTE).every(Object.isFrozen), "every station palette pair must be frozen");
assert.ok(Object.isFrozen(CAMERA_COMPOSITION), "CAMERA_COMPOSITION must be frozen");
assert.ok(Object.isFrozen(MOTION_TIMINGS), "MOTION_TIMINGS must be frozen");
assert.ok(Object.isFrozen(WORLD_STREAM_TIMINGS), "WORLD_STREAM_TIMINGS must be frozen");
assert.ok(Object.isFrozen(POST_PROCESS_BUDGET), "POST_PROCESS_BUDGET must be frozen");
assert.ok(Object.values(POST_PROCESS_BUDGET).every(Object.isFrozen), "every post quality tier must be frozen");
assert.equal(easeWorldStream(-1), 0, "world-stream easing must clamp below zero");
assert.equal(easeWorldStream(1.5), 1, "world-stream easing must clamp above one");
assert.ok(
  easeWorldStream(0.25) < easeWorldStream(0.5) && easeWorldStream(0.5) < easeWorldStream(0.75),
  "world-stream easing must stay monotonic",
);

assert.deepEqual([...SEAL_GUIDE_STATES], ["idle", "probing", "moving", "docking", "error"]);
assert.equal(
  deriveSealGuideState({ hasRenderError: true, moving: true, rendererMode: "webgl", stationDistance: 1 }),
  "error",
);
assert.equal(deriveSealGuideState({ bridgeActive: true, rendererMode: "probe" }), "probing");
assert.equal(
  deriveSealGuideState({ approachingStation: true, moving: true, rendererMode: "webgl", stationDistance: 3.8 }),
  "docking",
);
assert.equal(
  deriveSealGuideState({ approachingStation: true, moving: true, rendererMode: "webgl", stationDistance: 3.81 }),
  "moving",
);
assert.equal(
  deriveSealGuideState({ approachingStation: false, moving: true, rendererMode: "webgl", stationDistance: 1 }),
  "moving",
  "a seal departing a nearby station must not turn back into docking",
);
assert.equal(deriveSealGuideState({ moving: false, rendererMode: "webgl" }), "idle");

expectIncludes("components/IglooWorld.jsx", [
  "deriveSealGuideState",
  "hasCurrentFatalRenderEvent",
  "approachingStation",
  "data-seal-guide-state",
  "guideState={sealGuideState}",
  "setSealAwake(true)",
]);
expectIncludes("components/IglooScene.jsx", [
  "PolarBiomeWorld",
  "travelerRef={traversalPoseRef}",
  "visible={worldActive}",
  "ForegroundExpeditionKit",
  "dockComposition.camera.verticalFovDegrees",
  "STATION_WORLD_SCHEMA",
  "WorldStreamReveal",
  "streamEpochMsRef",
  "fogExp2",
  "guideState",
]);
for (const redundantOwner of [
  "<PolarGradientSky",
  "<IglooTerrain",
  "<SnowAtmosphere",
  "<PolarAtmosphereField",
  "<HorizontalParallaxSignalField",
]) {
  assert.ok(
    !readSource("components/IglooScene.jsx").includes(redundantOwner),
    `IglooScene.jsx must not retain redundant world owner ${redundantOwner}`,
  );
}
expectIncludes("components/PolarBiomeWorld.jsx", [
  "POLAR_BIOME_WORLD_PROFILE",
  "scene.fog",
  "keyLightRef",
  "fillLightRef",
  "simulationPaused",
  "safeMode",
]);
expectIncludes("components/IglooTerrain.jsx", ["ANIME_TERRAIN_SHADER_PROFILE", "MeshToonMaterial"]);
expectIncludes("components/PolarObservatoryDome.jsx", [
  "DOME_ANIME_ICE_PROFILE",
  "DOME_XZ_SHADER_PROFILE",
  "DOME_LOW_XZ_FRAGMENT_PROFILE",
  "DOME_XZ_COLOR_ZONES",
  "vDomeWorldPosition.xz",
  "dFdx(vDomeWorldPosition)",
  "uDomeDisplacementStrength",
  "POLAR_XZ_NOISE_GLSL",
  "POLAR_XZ_SHADER_POLICY.quality",
  "POLAR_PALETTE.horizonIndigo",
  "POLAR_PALETTE.dawnCyan",
  "streamRevealProgressRef",
]);
expectIncludes("lib/polar-art-direction.js", [
  "POLAR_XZ_NOISE_GLSL",
  "POLAR_XZ_SHADER_POLICY",
  'coordinateSpace: "world-xz"',
  "fragmentNoiseSamples: 2",
]);
assert.ok(
  !readSource("components/PolarObservatoryDome.jsx").includes("vDomeWorldPosition.y"),
  "dome color zoning must use world XZ geography, never a world-Y gradient",
);
expectIncludes("components/IglooArtifacts.jsx", [
  "STATION_PALETTE",
  "STATION_PALETTE[artifact.id]",
  "WORLD_STREAM_TIMINGS.stationStaggerMs",
  "revealProgress",
]);
expectIncludes("components/SealAvatar.jsx", [
  "SEAL_TOON_MATERIAL_PROFILE",
  "MeshToonMaterial",
  "DataTexture",
  "NormalBlending",
  'guideState === "idle"',
  'guideState === "probing"',
  'guideState === "moving"',
  'guideState === "docking"',
  'guideState === "error"',
]);
expectIncludes("components/SdfSealSplash.jsx", [
  "sdf-seal-splash",
  "Opening gate is a pure shader threshold",
]);
expectIncludes("components/RetroCinematicPostProcess.jsx", [
  "GLOBAL_ANIME_POST_PROFILE",
  "anime-soft depth pixel fog",
  "gaussianEdgeConfidence",
  "depthEdgeConfidence",
  "chromaticEdgeAA",
  "toonQuantize",
  "uFisheyeStrength",
  "uScanlineStrength",
  "uInkStrength",
  "uGradeBase",
  "uGradeCurve",
  "DepthTexture",
  "color *= (uGradeBase + uGradeCurve * color);",
]);
expectIncludes("app/globals.css", [
  "--polar-ivory",
  "--abeto-teal",
  "--anime-ink",
  "--evidence-magenta",
  '.sdf-gate-seal[data-guide-state="idle"]',
  '.sdf-gate-seal[data-guide-state="probing"]',
  '.sdf-gate-seal[data-guide-state="error"]',
  ".open-world-loading-bridge",
  ".igloo-artifact-readout",
  "station-readout-corner-settle",
  "@media (min-width: 721px)",
]);

const bannedPureBlack = ["#000000", "#010304", "#020607", "#060b0c"];
for (const relativePath of [
  "app/globals.css",
  "components/IglooWorld.jsx",
  "components/IglooScene.jsx",
  "components/IglooTerrain.jsx",
  "components/PolarObservatoryDome.jsx",
  "components/SealAvatar.jsx",
  "components/RetroCinematicPostProcess.jsx",
  "components/SdfSealSplash.jsx",
]) {
  const source = readSource(relativePath).toLowerCase();
  for (const bannedColor of bannedPureBlack) {
    assert.ok(!source.includes(bannedColor), `${relativePath} still contains banned world black ${bannedColor}`);
  }
}

const packageJson = JSON.parse(readSource("package.json"));
assert.equal(packageJson.scripts["check:polar-rescue"], "node scripts/check-polar-rescue.mjs");
assert.match(
  packageJson.scripts.build,
  /check:teerth[\s\S]*check:render-budget[\s\S]*check:polar-rescue[\s\S]*next build/,
  "build must run the polar rescue gate before next build",
);

console.log("polar rescue contract passed: palette, guide states, anime post, bright HUD, and integration profiles");
