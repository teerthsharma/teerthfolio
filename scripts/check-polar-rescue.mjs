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
  polarIvory: "#F2D3A8",
  glacierWhite: "#D7E6F5",
  abetoTeal: "#57C7BE",
  dawnCyan: "#7FB9DE",
  skyMint: "#93DFD4",
  horizonBlue: "#6FB4C9",
  horizonIndigo: "#232E52",
  animeInk: "#1C2135",
  animeShadow: "#4C5C7E",
  emberAmber: "#F2B96B",
  evidenceMagenta: "#E25AA0",
  kelpChartreuse: "#BBD348",
  signalCobalt: "#5573E0",
  aetherViolet: "#8D69D6",
  fieldYellow: "#F5C044",
  qpuMint: "#55CE85",
  upstreamCoral: "#E8705E",
  fog: "#697CA6",
});

assert.deepEqual(DOME_XZ_COLOR_ZONES, {
  frost: "#C6D9EE",
  cream: "#E7D9BE",
  teal: "#6FA9B5",
  sage: "#94B3A4",
  warm: "#EFB27C",
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
  "observatory-plaque": { surface: "#CBDCD2", accent: "#5CC9C2" },
  "s2-kernel-core": { surface: "#7FB9DE", accent: "#5573E0" },
  "manifold-reactor": { surface: "#0B2A56", accent: "#2D6FA3" },
  "field-chamber-coils": { surface: "#EFC15C", accent: "#EE9440" },
  "qpu-ice-bridge": { surface: "#8FCDB2", accent: "#55CE85" },
  "upstream-radio-mast": { surface: "#E08A87", accent: "#55CE85" },
  "topology-archive-wall": { surface: "#C9A3BF", accent: "#E25AA0" },
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
  medium: { scale: 0.94, fisheye: 0.001, chroma: 0.12, ink: 0.05, scanline: 0, pixel: 1.3, quantize: 0.04, gradeBase: 0.56, gradeCurve: 0.4, shadowSeparation: 0 },
  high: { scale: 1, fisheye: 0.0015, chroma: 0.15, ink: 0.06, scanline: 0, pixel: 1.4, quantize: 0.05, gradeBase: 0.6, gradeCurve: 0.4, shadowSeparation: 0 },
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
