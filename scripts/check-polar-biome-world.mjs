import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import {
  BIOME_WEIGHT_EXPONENT,
  FRAMED_NEIGHBOR_SHARE_CAP,
  FRAMED_NEIGHBOR_SHARE_FLOOR,
  POLAR_BIOME_ORDER,
  POLAR_BIOME_PROFILES,
  POLAR_BIOME_QUALITY,
  POLAR_BIOME_SHADER_POLICY,
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_VERTEX_SHADER,
  amplifyBiomeColorLumaPreserving,
  clampCombinedBiomeInfluence,
  computeLocalBiomeInfluence,
  resolveNearestWeather,
  resolveLocalWorldOwnership,
  resolveTwoNearestBiomes,
} from "../lib/polar-biome-fields.js";

const root = process.cwd();
const source = readFileSync(join(root, "components", "PolarBiomeWorld.jsx"), "utf8");
const atmosphereSource = readFileSync(
  join(root, "components", "PolarAtmosphereField.jsx"),
  "utf8",
);
const dressingSource = readFileSync(
  join(root, "components", "AdaptivePolarWorldDressing.jsx"),
  "utf8",
);
assert.match(
  dressingSource,
  /STATION_DRESSING_BAND_POLICY[\s\S]*"observatory-plaque"[\s\S]*expeditionObjects: true[\s\S]*sastrugi: true[\s\S]*"s2-kernel-core"[\s\S]*expeditionObjects: false[\s\S]*sastrugi: false/,
  "Observatory dressing must retain expedition snow objects while S2 remains a clean scientific environment",
);
assert.match(
  dressingSource,
  /placementAllowedForStation[\s\S]*STATION_DRESSING_BAND_POLICY[\s\S]*visiblePlacements = placements\.filter/,
  "station dressing policy must be enforced before instance upload",
);
const legacyTerrainSource = readFileSync(
  join(root, "components", "IglooTerrain.jsx"),
  "utf8",
);
const artifactsSource = readFileSync(
  join(root, "components", "IglooArtifacts.jsx"),
  "utf8",
);
const sceneSource = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");
const worldSource = readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

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

assert.deepEqual(POLAR_BIOME_ORDER, stationIds);
assert.equal(BIOME_WEIGHT_EXPONENT, 2.2);
assert.ok(Object.isFrozen(POLAR_BIOME_PROFILES));
assert.ok(Object.values(POLAR_BIOME_PROFILES).every(Object.isFrozen));

const biomeIdentityContract = {
  "observatory-plaque": {
    personality: "cyan-white Antarctic frost sanctuary",
    particleFamily: "ice-crystal-snow",
    atmosphereKind: "antarctic-frost-snow-ice",
    forbiddenClimate: "warm-wash",
  },
  "s2-kernel-core": {
    personality: "clean-room cryogenic science",
    particleFamily: "sterile-pressure-prisms",
    atmosphereKind: "cern-cryogenic-clean-room",
  },
  "manifold-reactor": {
    personality: "abyss-blue and living-gold primordial chapel",
    particleFamily: "aether-votive-motes",
    atmosphereKind: "abyss-blue-living-gold-aether",
  },
  "field-chamber-coils": {
    personality: "graphite thermal plasma forge",
    particleFamily: "thermal-plasma-refraction",
    atmosphereKind: "graphite-thermal-plasma-heat-haze",
    forbiddenClimate: "ice",
  },
  "qpu-ice-bridge": {
    personality: "alien jade-cyan interference field",
    particleFamily: "quantized-interference-motes",
    atmosphereKind: "alien-jade-cyan-interference",
  },
  "upstream-radio-mast": {
    personality: "coral radio-signal uplink",
    particleFamily: "coral-signal-pulses",
    atmosphereKind: "coral-radio-propagation",
  },
  "topology-archive-wall": {
    personality: "magenta archive canyon",
    particleFamily: "laminar-archive-strata",
    atmosphereKind: "magenta-archive-canyon",
  },
  "assembly-tool-locker": {
    personality: "purple-lit basalt computational archaeology",
    particleFamily: "ochre-glyph-dust",
    atmosphereKind: "egyptian-basalt-ochre-computational-archaeology",
  },
};

for (const [id, identity] of Object.entries(biomeIdentityContract)) {
  const profile = POLAR_BIOME_PROFILES[id];
  assert.equal(profile.personality, identity.personality, `${id} personality drifted`);
  assert.equal(
    profile.particleFamily,
    identity.particleFamily,
    `${id} particle family drifted`,
  );
  assert.equal(profile.atmosphere.kind, identity.atmosphereKind, `${id} atmosphere drifted`);
  assert.equal(
    profile.atmosphere.coordinateSpace,
    "continuous-world-xz",
    `${id} atmosphere must use a continuous XZ envelope`,
  );
  assert.equal(profile.atmosphere.colors.length, 2, `${id} needs a bounded two-color atmosphere`);
  assert.ok(
    profile.atmosphere.particleStrength >= 0 && profile.atmosphere.particleStrength <= 1,
    `${id} particle strength must remain bounded`,
  );
  if (identity.forbiddenClimate) {
    assert.equal(
      profile.forbiddenClimate,
      identity.forbiddenClimate,
      `${id} forbidden climate guard drifted`,
    );
  }
}

const plaqueParticleStrength =
  POLAR_BIOME_PROFILES["observatory-plaque"].atmosphere.particleStrength;
assert.equal(
  plaqueParticleStrength,
  Math.max(
    ...Object.values(POLAR_BIOME_PROFILES).map(
      ({ atmosphere }) => atmosphere.particleStrength,
    ),
  ),
  "Plaque must own the strongest Antarctic frost/snow/ice particle field",
);

const exactProfiles = {
  "observatory-plaque": {
    angle: 12,
    center: [-15, 7],
    dock: [-19.26, 8.99],
    radii: [10.5, 7, 2.6],
    palette: ["#F2D3A8", "#D7E6F5", "#A9C9C4", "#5CC9C2", "#93B4A6", "#F2B96B", "#232E52"],
    geography: "sastrugi-melt-ribbon",
  },
  "s2-kernel-core": {
    angle: 38,
    center: [-5, 13],
    dock: [-6.01, 15.61],
    radii: [8.5, 5.5, 1.8],
    palette: ["#B7D6EC", "#7FB9DE", "#6FA8C9", "#5573E0", "#A5E9FF", "#232E52"],
    geography: "voronoi-pressure-ridge-parhelion",
  },
  "manifold-reactor": {
    angle: -27,
    center: [8, 12],
    dock: [9.55, 14.33],
    radii: [8.8, 5.8, 1.9],
    palette: ["#020711", "#07152F", "#0B2A56", "#2D6FA3", "#FFD05A", "#FFF1B8"],
    geography: "ribbon-cavern-isocontours",
  },
  "field-chamber-coils": {
    angle: 74,
    center: [17, 4],
    dock: [20.21, 4.76],
    radii: [9.2, 6.2, 2.2],
    palette: ["#F5E3B0", "#EFC15C", "#F5C044", "#EE9440", "#7FA8C0", "#40312F"],
    geography: "salt-pan-field-lines",
  },
  "qpu-ice-bridge": {
    angle: -48,
    center: [15, -8],
    dock: [18, -9.6],
    radii: [9.4, 6.4, 2.4],
    palette: ["#BCE4D4", "#8FCDB2", "#55CE85", "#36D8FF", "#6FA8C9", "#24443F"],
    geography: "sea-ice-lead-interference",
  },
  "upstream-radio-mast": {
    angle: 19,
    center: [3, -14],
    dock: [3.59, -16.74],
    radii: [9, 6, 2],
    palette: ["#E5B9AC", "#E08A87", "#E8705E", "#55CE85", "#6FB0A9", "#3F3547"],
    geography: "aurora-signal-ridge",
  },
  "topology-archive-wall": {
    angle: 61,
    center: [-11, -11],
    dock: [-13.47, -13.47],
    radii: [9.4, 6.3, 2.3],
    palette: ["#E3C6D6", "#C9A3BF", "#E25AA0", "#8D69D6", "#7FB3AF", "#453043"],
    geography: "strata-barcode-cliff",
  },
  "assembly-tool-locker": {
    angle: -9,
    center: [-18, -2],
    dock: [-20.98, -2.33],
    radii: [8.7, 5.8, 2.1],
    palette: ["#080713", "#151024", "#2A1B4A", "#6D4BE8", "#A78BFA", "#F2B96B", "#F2ECFF"],
    geography: "runway-knurl-yard",
  },
};

for (const [id, exact] of Object.entries(exactProfiles)) {
  const profile = POLAR_BIOME_PROFILES[id];
  assert.equal(profile.angleDegrees, exact.angle, `${id} angle drifted`);
  assert.deepEqual(profile.centerXZ, exact.center, `${id} center drifted`);
  assert.deepEqual(profile.dockXZ, exact.dock, `${id} dock drifted`);
  assert.deepEqual(
    [profile.radii.far, profile.radii.approach, profile.radii.dock],
    exact.radii,
    `${id} proximity radii drifted`,
  );
  assert.deepEqual(profile.palette, exact.palette, `${id} palette drifted`);
  assert.equal(profile.geography, exact.geography, `${id} geography identity drifted`);
  for (const fieldKey of [
    "centerXZ",
    "radius",
    "falloff",
    "accent",
    "shadow",
    "weatherVector",
  ]) {
    assert.ok(
      Object.hasOwn(profile, fieldKey),
      `${id} local field is missing ${fieldKey}`,
    );
  }
  assert.equal(
    profile.radius,
    profile.radii.far,
    `${id} local radius must match Rfar`,
  );
  assert.ok(
    profile.falloff > 0 && profile.falloff < 1,
    `${id} falloff must be reversed-edge smoothstep safe`,
  );
  assert.equal(
    profile.accent,
    profile.colors.accent,
    `${id} accent must have one authored source`,
  );
  assert.match(
    profile.shadow,
    /^#[0-9A-F]{6}$/i,
    `${id} shadow must be an explicit color`,
  );
  assert.equal(profile.weatherVector.length, 2, `${id} weather vector must stay in XZ`);
  assert.ok(
    Math.abs(Math.hypot(...profile.weatherVector) - 1) < 0.002,
    `${id} weather vector must be normalized`,
  );
}

for (const profile of Object.values(POLAR_BIOME_PROFILES)) {
  const inner = computeLocalBiomeInfluence(profile, profile.centerXZ);
  const outer = computeLocalBiomeInfluence(profile, [
    profile.centerXZ[0] + profile.radius,
    profile.centerXZ[1],
  ]);
  assert.equal(
    inner.influence,
    1,
    `${profile.geography} center must own its local field`,
  );
  assert.equal(
    outer.influence,
    0,
    `${profile.geography} must end at its local radius`,
  );
}
assert.equal(clampCombinedBiomeInfluence([0.72, 0.61]), 1);
assert.ok(
  Math.abs(clampCombinedBiomeInfluence([0.18, 0.24]) - 0.42) < 1e-12,
);

assert.equal(
  new Set(Object.values(POLAR_BIOME_PROFILES).map(({ fieldKind }) => fieldKind)).size,
  8,
  "all eight zones need a distinct authored field kind",
);
assert.equal(
  new Set(Object.values(POLAR_BIOME_PROFILES).map(({ weather }) => weather.kind)).size,
  8,
  "all eight zones need distinct bounded weather behavior",
);

const plaqueDock = exactProfiles["observatory-plaque"].dock;
const atPlaque = resolveTwoNearestBiomes(plaqueDock);
assert.equal(atPlaque.primary.id, "observatory-plaque");
assert.equal(atPlaque.entries.length, 2);
assert.ok(atPlaque.primary.weight > atPlaque.secondary.weight);
assert.ok(
  Math.abs(
    atPlaque.primary.weight + atPlaque.secondary.weight + atPlaque.neutralWeight - 1
  ) < 1e-10,
);
assert.equal(atPlaque.secondary.weight, 0, "an out-of-Rfar neighbor must not receive invented ambient weight");

assert.equal(FRAMED_NEIGHBOR_SHARE_CAP, 0.28);
assert.equal(FRAMED_NEIGHBOR_SHARE_FLOOR, 0.04);
for (const id of stationIds) {
  const ownership = resolveLocalWorldOwnership(exactProfiles[id].dock);
  assert.equal(ownership.current?.id, id, `${id} must own its dock region`);
  assert.ok(
    ownership.blend.primary.weight >= ownership.blend.totalInfluence * 0.72 - 1e-10,
    `${id} must dominate its local authored energy`,
  );
  assert.ok(ownership.visibleStationIds.length <= 2, `${id} may frame at most one neighbor`);
  assert.equal(ownership.visibleStationIds[0], id);
  assert.ok(
    !ownership.visibleStationIds.some((visibleId) => /igloo/i.test(visibleId)),
    `${id} local ownership must not leak an igloo owner`,
  );
}

for (const id of stationIds) {
  const exclusive = resolveLocalWorldOwnership([900, -900], null, {
    exclusiveStationId: id,
  });
  assert.equal(exclusive.current?.id, id, `${id} must fully own its docked scene`);
  assert.equal(exclusive.framedNeighbor, null, "a docked scene cannot frame another station");
  assert.deepEqual(exclusive.visibleStationIds, [id]);
  assert.equal(exclusive.blend.primary.weight, 1);
  assert.equal(exclusive.blend.secondary.weight, 0);
  assert.equal(exclusive.blend.neutralWeight, 0);
}

const exactTie = resolveTwoNearestBiomes([-12.5, 10]);
assert.ok(
  Math.abs(
    exactTie.primary.weight + exactTie.secondary.weight - exactTie.totalInfluence,
  ) < 1e-10,
);
assert.ok(exactTie.entries.every(({ weight }) => Number.isFinite(weight)));

const remoteFallback = resolveTwoNearestBiomes([900, -900]);
assert.equal(remoteFallback.primary.weight, 0, "remote terrain must not inherit a station wash");
assert.equal(remoteFallback.secondary.weight, 0);
assert.equal(remoteFallback.totalInfluence, 0);
assert.equal(remoteFallback.neutralWeight, 1, "remote terrain must retain the neutral polar base");
const remoteOwnership = resolveLocalWorldOwnership([900, -900]);
assert.equal(remoteOwnership.current, null, "remote terrain must not invent a current station");
assert.equal(remoteOwnership.framedNeighbor, null, "remote terrain must not frame a distant monument");
assert.deepEqual(remoteOwnership.visibleStationIds, []);

const overlappingFields = resolveTwoNearestBiomes([-10, 10]);
assert.ok(overlappingFields.totalInfluence <= 1, "overlapping local fields must remain clamped");
assert.ok(overlappingFields.neutralWeight >= 0, "overlap must not create negative neutral energy");

const reusableBlend = { entries: [{}, {}], primary: null, secondary: null };
const reusableEntries = [...reusableBlend.entries];
assert.equal(resolveTwoNearestBiomes([0, 0], reusableBlend), reusableBlend);
assert.equal(resolveTwoNearestBiomes([1, 1], reusableBlend), reusableBlend);
assert.equal(reusableBlend.entries[0], reusableEntries[0]);
assert.equal(reusableBlend.entries[1], reusableEntries[1]);

const inputColor = [0.18, 0.47, 0.82];
const proximity = 0.64;
const shown = amplifyBiomeColorLumaPreserving(inputColor, proximity);
const luma = (color) => color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
const expectedGain = 0.96 + 0.08 * proximity;
assert.ok(Math.abs(luma(shown) - luma(inputColor) * expectedGain) < 1e-10);
assert.ok(shown.every((channel) => channel >= 0 && channel <= 1));

assert.equal(resolveNearestWeather(atPlaque, { quality: "high" }).biomeId, "observatory-plaque");
const reusableWeather = {};
assert.equal(
  resolveNearestWeather(atPlaque, { quality: "high", target: reusableWeather }),
  reusableWeather,
);
assert.equal(resolveNearestWeather(atPlaque, { reducedMotion: true }), null);
assert.equal(resolveNearestWeather(atPlaque, { safeMode: true }), null);
assert.equal(resolveNearestWeather(atPlaque, { quality: "low" }), null);

assert.deepEqual(Object.keys(POLAR_BIOME_QUALITY), ["low", "medium", "high"]);
assert.equal(POLAR_BIOME_SHADER_POLICY.textures, 0);
assert.equal(POLAR_BIOME_SHADER_POLICY.combinedInfluenceCap, 1);
assert.equal(POLAR_BIOME_SHADER_POLICY.environmentInfluenceCap, 0.42);
assert.equal(
  POLAR_BIOME_SHADER_POLICY.localInfluence,
  "smoothstep(radius, radius * falloff, distanceXZ)",
);
assert.equal(POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms, 2);
assert.equal(POLAR_BIOME_SHADER_POLICY.maxDrawCalls, 3);
assert.equal(POLAR_BIOME_SHADER_POLICY.weatherOwners, 1);
assert.equal(POLAR_BIOME_QUALITY.high.drawCalls, 3);
assert.equal(POLAR_BIOME_QUALITY.medium.drawCalls, 3);
assert.equal(POLAR_BIOME_QUALITY.low.drawCalls, 2);
assert.equal(POLAR_BIOME_QUALITY.high.geographyInstances, 32);
assert.equal(POLAR_BIOME_QUALITY.medium.geographyInstances, 24);
assert.equal(POLAR_BIOME_QUALITY.low.geographyInstances, 0);
assert.equal(
  (source.match(/new THREE\.InstancedMesh/g) || []).length,
  2,
  "terrain and nearest geography must share the instanced solid program",
);

for (const shader of [POLAR_BIOME_VERTEX_SHADER, POLAR_BIOME_FRAGMENT_SHADER]) {
  assert.ok(shader.includes("void main()"));
  assert.equal((shader.match(/{/g) || []).length, (shader.match(/}/g) || []).length);
}
for (const shaderIdentity of [
  "plaqueField",
  "s2PressureField",
  "aetherRibbonField",
  "magneticSaltField",
  "qpuLeadField",
  "upstreamSignalField",
  "topologyStrataField",
  "assemblyRunwayField",
]) {
  assert.ok(
    POLAR_BIOME_VERTEX_SHADER.includes(shaderIdentity),
    `vertex shader is missing authored identity ${shaderIdentity}`,
  );
}

const material = new THREE.ShaderMaterial({
  fragmentShader: POLAR_BIOME_FRAGMENT_SHADER,
  vertexShader: POLAR_BIOME_VERTEX_SHADER,
});
assert.equal(material.type, "ShaderMaterial");
material.dispose();

for (const needle of [
  "useFrame",
  "THREE.ShaderMaterial",
  "THREE.InstancedMesh",
  "resolveLocalWorldOwnership",
  "resolveNearestWeather",
  "populateGeographyInstances",
  "makeGeographyGeometryBank",
  "THREE.CapsuleGeometry",
  "THREE.DodecahedronGeometry",
  "THREE.TorusGeometry",
  "THREE.CylinderGeometry",
  "plaqueInstanceCount",
  "exclusiveStationId",
  "uPrimaryFieldKind",
  "uSecondaryFieldKind",
  "uPrimaryWeight",
  "uSecondaryWeight",
  "uPrimaryRadius",
  "uSecondaryRadius",
  "uPrimaryFalloff",
  "uSecondaryFalloff",
  "uPrimaryFogDensity",
  "uSecondaryFogDensity",
  "uPrimaryLightDirection",
  "uSecondaryLightDirection",
  "uPrimaryShadowColor",
  "uSecondaryShadowColor",
  "LOCAL_ENVIRONMENT_CAP",
  "uTravelerXZ",
  "uWeatherFieldKind",
  "scene.fog",
  "keyLightRef",
  "fillLightRef",
  "biomeDrawBudget",
  "biomeProgramBudget",
  "biomeTextureBudget",
  "biomePrimary",
  "biomeFramedNeighbor",
  "geographyMesh.count = 0",
  "<directionalLight",
  "reducedMotion",
  "safeMode",
  "visible",
]) {
  assert.ok(source.includes(needle), `PolarBiomeWorld.jsx is missing ${JSON.stringify(needle)}`);
}

for (const needle of ["dockedStationId", "exclusiveStationId"]) {
  assert.ok(sceneSource.includes(needle), `IglooScene.jsx is missing dock exclusivity ${JSON.stringify(needle)}`);
  assert.ok(worldSource.includes(needle), `IglooWorld.jsx is missing dock exclusivity ${JSON.stringify(needle)}`);
}
for (const needle of ["exclusiveStationId", "artifactsToRender", ".filter("]) {
  assert.ok(
    artifactsSource.includes(needle),
    `IglooArtifacts.jsx is missing exclusive dock rendering ${JSON.stringify(needle)}`,
  );
}
for (const forbidden of ["useTexture", "TextureLoader", "/assets/", "map:", "CanvasTexture"] ) {
  assert.ok(!source.includes(forbidden), `PolarBiomeWorld.jsx must not use ${JSON.stringify(forbidden)}`);
}
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("exp(-polarDistance * blendedFogDensity)"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("floor(wrappedLight * 4.0 + 0.5) / 4.0"));
assert.ok(POLAR_BIOME_VERTEX_SHADER.includes("polarMacroHeight(worldPosition.xz)"));
assert.ok(POLAR_BIOME_VERTEX_SHADER.includes("combinedLocalInfluence"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("biomeLocalColorEnvelope"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("continuousAtmosphereXZEnvelope"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("biomeAtmosphereTint"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("fieldThermalPlasmaHaze"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("neutralBlendWeight"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("boundPolarHighlights"));
assert.ok(POLAR_BIOME_FRAGMENT_SHADER.includes("clamp(color + dither, 0.03, 0.99)"));

for (const needle of [
  "resolveLocalWorldOwnership",
  "visibleStationIds",
  "placement.anchorId",
  "localWorldDrawCalls",
  'quality === "low"',
]) {
  assert.ok(
    dressingSource.includes(needle),
    `AdaptivePolarWorldDressing.jsx is missing local ownership ${JSON.stringify(needle)}`,
  );
}
for (const needle of [
  "uBiomeCenterXZ",
  "uBiomeRadius",
  "vWorldXZ",
  "continuousAtmosphereXZEnvelope",
  "POLAR_ATMOSPHERE_BUDGET",
  "reducedMotion",
]) {
  assert.ok(
    atmosphereSource.includes(needle),
    `PolarAtmosphereField.jsx is missing bounded XZ atmosphere ${JSON.stringify(needle)}`,
  );
}
assert.ok(!atmosphereSource.includes("Y_ONLY_TINT"));
assert.ok(!legacyTerrainSource.includes("distant-monument"));

for (const needle of [
  'import PolarBiomeWorld from "./PolarBiomeWorld"',
  "<PolarBiomeWorld",
  "travelerRef={traversalPoseRef}",
  "visible={worldActive}",
  "simulationPaused={!worldActive || !renderEnabled}",
  "<AdaptivePolarWorldDressing",
  "<RetroCinematicPostProcess",
]) {
  assert.ok(sceneSource.includes(needle), `IglooScene.jsx is missing live integration ${JSON.stringify(needle)}`);
}
for (const removedOwner of [
  'import IglooTerrain from "./IglooTerrain"',
  'import PolarAtmosphereField from "./PolarAtmosphereField"',
  'import SnowAtmosphere from "./SnowAtmosphere"',
  "function PolarGradientSky()",
  "function HorizontalParallaxSignalField(",
  "<PolarGradientSky",
  "<IglooTerrain",
  "<PolarAtmosphereField",
  "<SnowAtmosphere",
  "<HorizontalParallaxSignalField",
]) {
  assert.ok(!sceneSource.includes(removedOwner), `IglooScene.jsx still mounts redundant owner ${JSON.stringify(removedOwner)}`);
}
for (const removedWorldAtmosphere of [
  "function useAtmosphereCanvas(",
  "useAtmosphereCanvas(",
  "igloo-atmosphere-canvas",
  "ATMOSPHERE_FRAME_MS",
]) {
  assert.ok(
    !worldSource.includes(removedWorldAtmosphere),
    `IglooWorld.jsx still retains redundant CPU atmosphere ${JSON.stringify(removedWorldAtmosphere)}`,
  );
}
assert.ok(
  sceneSource.indexOf("<PolarBiomeWorld") < sceneSource.indexOf("<IglooArtifacts"),
  "biome world must mount behind monument silhouettes",
);
assert.ok(
  sceneSource.indexOf("<IglooArtifacts") < sceneSource.indexOf("<RetroCinematicPostProcess"),
  "postprocess must remain the final scene layer",
);

assert.equal(packageJson.scripts["check:biome-world"], "node scripts/check-polar-biome-world.mjs");
assert.equal(
  packageJson.scripts["verify:biome-shaders"],
  "node scripts/verify-polar-biome-shader-compile.mjs",
);
assert.ok(packageJson.scripts.build.includes("npm run check:biome-world"));
assert.ok(!packageJson.scripts.build.includes("npm run verify:biome-shaders"));
assert.equal(packageJson.scripts["verify:ci-browser"], "npm run verify:biome-shaders");

console.log(
  "Polar biome world contract verified: dominant local owner plus <=1 framed neighbor, 8 continuous-XZ atmospheres, no remote geography leakage, bounded highlights, 1 weather owner, 2 programs, <=3 draws, 0 textures.",
);
