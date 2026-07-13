import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
  deepFreezeStationPersonality,
} from "../lib/polar-station-personality.js";
import { STATION_PALETTE } from "../lib/polar-art-direction.js";
import {
  POLAR_BIOME_ORDER,
  POLAR_BIOME_PROFILES,
  resolveLocalWorldOwnership,
} from "../lib/polar-biome-fields.js";
import {
  POLAR_PARTICLE_LANGUAGE,
  POLAR_PARTICLE_STATION_ORDER,
} from "../lib/polar-semantic-particles.js";
import {
  NE_MECHANISM_PROFILES,
  advanceNortheastMechanisms,
  createNortheastMechanismSystem,
  resolveNortheastStationReveal,
} from "../lib/polar-station-mechanisms.js";
import {
  SW_MECHANISM_PROFILES,
  advanceSouthwestMechanisms,
  createSouthwestMechanismSystem,
  resolveSouthwestStationReveal,
} from "../lib/polar-station-mechanisms-sw.js";
import { resolveMechanismLayerSelection } from "../lib/polar-station-mechanism-layer.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import {
  createStationTraversalTarget,
  createTraversalState,
  deriveLiveTraversalPresentation,
  routeTraversalToStation,
} from "../lib/polar-traversal.js";

const root = process.cwd();
const biomeSource = readFileSync(join(root, "lib", "polar-biome-fields.js"), "utf8");
const particleSource = readFileSync(join(root, "lib", "polar-semantic-particles.js"), "utf8");
const sceneSource = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");
const worldSource = readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8");
const artifactsSource = readFileSync(join(root, "components", "IglooArtifacts.jsx"), "utf8");
const mechanismLayerSource = readFileSync(
  join(root, "components", "PolarStationMechanismLayer.jsx"),
  "utf8",
);
const northeastMechanismSource = readFileSync(
  join(root, "components", "PolarStationMechanismsNE.jsx"),
  "utf8",
);
const southwestMechanismSource = readFileSync(
  join(root, "components", "PolarStationMechanismsSW.jsx"),
  "utf8",
);

const EXPECTED_ORDER = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

function assertDeepFrozen(value, path) {
  assert.ok(Object.isFrozen(value), `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") {
      assertDeepFrozen(child, `${path}.${key}`);
    }
  }
}

function assertUnique(signatures, label) {
  assert.equal(new Set(signatures).size, EXPECTED_ORDER.length, `${label} must be unique`);
}

assert.deepEqual(STATION_PERSONALITY_ORDER, EXPECTED_ORDER);
assert.deepEqual(Object.keys(STATION_PERSONALITY_PROFILES), EXPECTED_ORDER);
assertDeepFrozen(STATION_PERSONALITY_ORDER, "STATION_PERSONALITY_ORDER");
assertDeepFrozen(STATION_PERSONALITY_PROFILES, "STATION_PERSONALITY_PROFILES");
const mutableChild = { nested: { value: 1 } };
const shallowFrozenParent = Object.freeze({ mutableChild });
assert.equal(deepFreezeStationPersonality(shallowFrozenParent), shallowFrozenParent);
assertDeepFrozen(mutableChild, "shallowFrozenParent.mutableChild");

const facets = [
  "palette",
  "lighting",
  "environment",
  "monument",
  "particles",
  "halo",
  "interaction",
];

for (const stationId of EXPECTED_ORDER) {
  const profile = STATION_PERSONALITY_PROFILES[stationId];
  assert.deepEqual(Object.keys(profile), facets, `${stationId} must expose the complete identity API`);
  assert.match(profile.palette.surface, /^#[0-9A-F]{6}$/i);
  assert.match(profile.palette.accent, /^#[0-9A-F]{6}$/i);
  assert.match(profile.palette.glow, /^#[0-9A-F]{6}$/i);
  assert.match(profile.palette.ink, /^#[0-9A-F]{6}$/i);
  assert.ok(profile.palette.signature.length >= 6);
  assert.ok(profile.particles.semanticLanguage.length > 24);
}

const profiles = EXPECTED_ORDER.map((id) => STATION_PERSONALITY_PROFILES[id]);
assertUnique(profiles.map(({ palette }) => palette.signature.join("/")), "palette signatures");
assertUnique(profiles.map(({ lighting }) => lighting.rig), "lighting rigs");
assertUnique(profiles.map(({ environment }) => environment.fieldFamily), "field families");
assertUnique(profiles.map(({ environment }) => environment.backgroundFamily), "background families");
assertUnique(profiles.map(({ environment }) => environment.objectFamily), "object families");
assertUnique(profiles.map(({ monument }) => monument.materialFamily), "material families");
assertUnique(profiles.map(({ monument }) => monument.motionFamily), "motion families");
assertUnique(profiles.map(({ monument }) => monument.family), "monument families");
assertUnique(profiles.map(({ particles }) => particles.family), "particle families");
assertUnique(profiles.map(({ particles }) => particles.semanticLanguage), "particle languages");
assertUnique(
  profiles.map(({ halo }) => [halo.form, ...halo.colors, halo.motion].join("/")),
  "halo signatures",
);
assertUnique(profiles.map(({ interaction }) => interaction.family), "interaction families");

assert.equal(POLAR_BIOME_ORDER, STATION_PERSONALITY_ORDER);
assert.equal(POLAR_PARTICLE_STATION_ORDER, STATION_PERSONALITY_ORDER);
for (const stationId of EXPECTED_ORDER) {
  const authority = STATION_PERSONALITY_PROFILES[stationId];
  const biome = POLAR_BIOME_PROFILES[stationId];
  const particle = POLAR_PARTICLE_LANGUAGE[stationId];
  assert.equal(biome.identity, authority, `${stationId} biome must retain its authority reference`);
  assert.equal(authority.palette.signature, biome.palette);
  assert.equal(authority.palette.world.colors, biome.colors);
  assert.equal(authority.palette.world.shadow, biome.shadow);
  assert.equal(authority.palette.world.colors.fog, biome.fog.color);
  assert.equal(authority.environment.backgroundColors, biome.atmosphere.colors);
  assert.equal(authority.lighting.key, biome.light.key);
  assert.equal(authority.lighting.fill, biome.light.fill);
  assert.equal(authority.lighting.rim, biome.light.rim);
  assert.equal(authority.environment.fieldFamily, biome.geography);
  assert.equal(authority.environment.backgroundFamily, biome.atmosphere.kind);
  assert.equal(authority.environment.objectFamily, biome.weather.kind);
  assert.equal(authority.particles.family, biome.particleFamily);
  assert.equal(particle.identity, authority.particles);
  assert.equal(authority.particles.family, particle.family);
  assert.equal(authority.particles.semanticLanguage, particle.semantic);
  assert.equal(authority.particles.color, particle.color);
  assert.equal(STATION_PALETTE[stationId].surface, authority.palette.surface);
  assert.equal(STATION_PALETTE[stationId].accent, authority.palette.accent);
}

for (const [stationId, profile] of Object.entries(NE_MECHANISM_PROFILES)) {
  assert.equal(profile.halo, STATION_PERSONALITY_PROFILES[stationId].halo);
  assert.equal(profile.accent, STATION_PERSONALITY_PROFILES[stationId].halo.colors[0]);
}
for (const [stationId, profile] of Object.entries(SW_MECHANISM_PROFILES)) {
  assert.equal(profile.halo, STATION_PERSONALITY_PROFILES[stationId].halo);
  assert.equal(profile.accent, STATION_PERSONALITY_PROFILES[stationId].halo.colors[0]);
}

const runtimeSystems = [
  createNortheastMechanismSystem(),
  createSouthwestMechanismSystem(),
];
for (const system of runtimeSystems) {
  for (const [stationId, state] of Object.entries(system.states)) {
    assert.equal(
      state.ritual.haloColor,
      STATION_PERSONALITY_PROFILES[stationId].halo.colors[0],
      `${stationId} runtime halo color must derive from authority`,
    );
  }
}

const northeastSystem = createNortheastMechanismSystem();
const northeastInputs = Object.fromEntries(
  Object.keys(NE_MECHANISM_PROFILES).map((stationId) => [stationId, {
    arrivalStrength: 0,
    docked: stationId === "qpu-ice-bridge",
    positionX: 0,
    positionZ: 0,
    proximity: stationId === "qpu-ice-bridge" ? 1 : 0,
    routeProgress: stationId === "qpu-ice-bridge" ? 1 : 0,
    velocityX: 0,
    velocityZ: 0,
  }]),
);
advanceNortheastMechanisms(
  northeastSystem,
  northeastInputs,
  0.1,
  { reducedMotion: true },
);
const qpuState = northeastSystem.states["qpu-ice-bridge"];
assert.equal(qpuState.phase, "VERIFY");
assert.equal(qpuState.ritual.haloColor, STATION_PERSONALITY_PROFILES["qpu-ice-bridge"].halo.colors[0]);
assert.equal(qpuState.ritual.haloEdgeColor, STATION_PERSONALITY_PROFILES["qpu-ice-bridge"].halo.colors[1]);

const southwestSystem = createSouthwestMechanismSystem();
const southwestInputs = Object.fromEntries(
  Object.keys(SW_MECHANISM_PROFILES).map((stationId) => [stationId, {
    arrivalStrength: 0,
    docked: true,
    pointerPaused: false,
    pointerScrub: null,
    positionX: 0,
    positionZ: 0,
    proximity: 1,
    routeProgress: 1,
    signalMetadata: null,
    topologyCategory: "all",
    topologySources: null,
    velocityX: 0,
    velocityZ: 0,
  }]),
);
advanceSouthwestMechanisms(
  southwestSystem,
  southwestInputs,
  0.1,
  { reducedMotion: true },
);
const expectedSouthwestPhases = {
  "upstream-radio-mast": "RECEIVE",
  "topology-archive-wall": "OPEN_ARCHIVE",
  "assembly-tool-locker": "PROVE",
};
for (const [stationId, expectedPhase] of Object.entries(expectedSouthwestPhases)) {
  const state = southwestSystem.states[stationId];
  const halo = STATION_PERSONALITY_PROFILES[stationId].halo;
  assert.equal(state.phase, expectedPhase);
  assert.equal(state.ritual.haloColor, halo.colors[0]);
  assert.equal(state.ritual.haloEdgeColor, halo.colors[1]);
}

const contradictoryPose = {
  arrivalStationId: "qpu-ice-bridge",
  arrivalStrength: 1,
  dockedId: null,
  proximityStationId: "s2-kernel-core",
};
const exclusiveNortheastReveal = resolveNortheastStationReveal(
  contradictoryPose,
  "manifold-reactor",
);
assert.equal(exclusiveNortheastReveal.activeId, "manifold-reactor");
assert.equal(exclusiveNortheastReveal.promiseId, null);
assert.deepEqual(
  Object.entries(exclusiveNortheastReveal.alphas)
    .filter(([, alpha]) => alpha > 0)
    .map(([stationId]) => stationId),
  ["manifold-reactor"],
  "docked northeast ownership must suppress sibling monuments and arrival promises",
);

const exclusiveSouthwestReveal = resolveSouthwestStationReveal(
  {
    arrivalStationId: "assembly-tool-locker",
    arrivalStrength: 1,
    dockedId: null,
    proximityStationId: "upstream-radio-mast",
  },
  "topology-archive-wall",
);
assert.equal(exclusiveSouthwestReveal.activeId, "topology-archive-wall");
assert.equal(exclusiveSouthwestReveal.promiseId, null);
assert.deepEqual(
  Object.entries(exclusiveSouthwestReveal.alphas)
    .filter(([, alpha]) => alpha > 0)
    .map(([stationId]) => stationId),
  ["topology-archive-wall"],
  "docked southwest ownership must suppress sibling monuments and arrival promises",
);

const s2Dock = STATION_WORLD_SCHEMA.stations["s2-kernel-core"].dock;
const exclusiveMechanismSelection = resolveMechanismLayerSelection(
  { x: s2Dock.x, z: s2Dock.z },
  "s2-kernel-core",
  { exclusiveStationId: "qpu-ice-bridge" },
);
assert.equal(exclusiveMechanismSelection.stationId, "qpu-ice-bridge");
assert.equal(exclusiveMechanismSelection.family, "northeast");
assert.equal(exclusiveMechanismSelection.visibility, 1);

for (const stationId of EXPECTED_ORDER) {
  const ownership = resolveLocalWorldOwnership([999, -999], null, {
    exclusiveStationId: stationId,
  });
  assert.deepEqual(
    ownership.visibleStationIds,
    [stationId],
    `${stationId} must be the sole docked biome and dressing owner`,
  );
}
for (const stationId of EXPECTED_ORDER) {
  const dock = STATION_WORLD_SCHEMA.stations[stationId].dock;
  const ownership = resolveLocalWorldOwnership([dock.x, dock.z]);
  assert.ok(
    ownership.visibleStationIds.length <= 2,
    "travel ownership must remain bounded to one local owner and at most one framed neighbor",
  );
}

const lifecycleStations = EXPECTED_ORDER.map(createStationTraversalTarget);
const lifecyclePlaque = createStationTraversalTarget("observatory-plaque");
const lifecycleQpu = createStationTraversalTarget("qpu-ice-bridge");
const lifecycleState = createTraversalState(lifecyclePlaque);
lifecycleState.dockedId = lifecyclePlaque.id;
lifecycleState.nearbyId = lifecyclePlaque.id;
lifecycleState.proximityStationId = lifecyclePlaque.id;
lifecycleState.stationProximity = 1;
const dockedLifecycle = deriveLiveTraversalPresentation(lifecycleState, {
  progress: 0,
  selectedDestinationId: lifecyclePlaque.id,
  stations: lifecycleStations,
});
assert.equal(dockedLifecycle.dockedStationId, lifecyclePlaque.id);
assert.deepEqual(
  resolveLocalWorldOwnership([lifecyclePlaque.x, lifecyclePlaque.z], null, {
    exclusiveStationId: dockedLifecycle.dockedStationId,
  }).visibleStationIds,
  [lifecyclePlaque.id],
);

routeTraversalToStation(lifecycleState, lifecycleQpu.id);
const departedLifecycle = deriveLiveTraversalPresentation(lifecycleState, {
  progress: 4 / 7,
  selectedDestinationId: lifecycleQpu.id,
  stations: lifecycleStations,
});
assert.equal(
  departedLifecycle.dockedStationId,
  null,
  "dock -> depart must release every exclusive scene owner and restore travel promises",
);
const travelOwnership = resolveLocalWorldOwnership(
  [lifecycleState.x, lifecycleState.z],
  null,
  { exclusiveStationId: departedLifecycle.dockedStationId },
);
assert.ok(
  travelOwnership.visibleStationIds.length <= 2,
  "released travel may expose only bounded contextual local owners",
);

lifecycleState.x = lifecycleQpu.x;
lifecycleState.z = lifecycleQpu.z;
lifecycleState.vx = 0;
lifecycleState.vz = 0;
lifecycleState.destinationId = null;
lifecycleState.route = null;
lifecycleState.dockedId = lifecycleQpu.id;
const arrivedLifecycle = deriveLiveTraversalPresentation(lifecycleState, {
  progress: 4 / 7,
  selectedDestinationId: lifecycleQpu.id,
  stations: lifecycleStations,
});
assert.equal(arrivedLifecycle.dockedStationId, lifecycleQpu.id);
assert.deepEqual(
  resolveLocalWorldOwnership([lifecycleQpu.x, lifecycleQpu.z], null, {
    exclusiveStationId: arrivedLifecycle.dockedStationId,
  }).visibleStationIds,
  [lifecycleQpu.id],
  "arrival must acquire exactly the new station owner",
);

assert.match(
  sceneSource,
  /<PolarStationMechanismLayer[\s\S]*?exclusiveStationId=\{dockedStationId\}/,
  "IglooScene must route dock ownership into mechanism visibility",
);
for (const componentName of [
  "PolarBiomeWorld",
  "AdaptivePolarWorldDressing",
  "IglooArtifacts",
]) {
  assert.match(
    sceneSource,
    new RegExp(`<${componentName}[\\s\\S]*?exclusiveStationId=\\{dockedStationId\\}`),
    `${componentName} must receive the dock owner`,
  );
}
assert.match(
  sceneSource,
  /<PolarSemanticParticles[\s\S]*?activeStationId=\{dockedStationId \|\| activeArtifact\.id\}/,
  "semantic particles must use the dock identity before travel context",
);
assert.match(
  artifactsSource,
  /exclusiveStationId[\s\S]*?artifacts\.filter\(\(artifact\) => artifact\.id === exclusiveStationId\)/,
  "docked monument ownership must filter out every sibling artifact",
);
assert.match(
  worldSource,
  /const exclusiveStationId = traversalPresentation\.dockedStationId \|\| null/,
  "exclusive ownership must derive only from an earned dock",
);
assert.match(
  worldSource,
  /earnedDockedStationIdRef/,
  "earned semantic evidence may remain available separately from live ownership",
);
assert.doesNotMatch(
  worldSource,
  /selectedDestinationIdRef\.current,\s*earnedDockedStationIdRef\.current/,
  "earned semantic history must never feed live dock presentation ownership",
);
assert.match(
  sceneSource,
  /<IglooArtifacts[\s\S]*?activeArtifactId=\{activeArtifact\.id\}/,
  "the dock-first resolved artifact must own active monument state",
);
assert.match(
  sceneSource,
  /!dockedStationId \? \(\s*<PolarRouteNetwork/,
  "released travel ownership must restore bounded route promises",
);
assert.match(
  sceneSource,
  /!dockedStationId \? \(\s*<TopologyConstellation/,
  "released travel ownership must restore topology context",
);
assert.match(
  sceneSource,
  /!dockedStationId \|\| dockedStationId === "observatory-plaque"/,
  "Observatory must retain its dedicated travel/docked dome handling",
);
assert.match(
  worldSource,
  /traversalPresentation\.isArrived[\s\S]{0,120}traversalPresentation\.dockedStationId === ARCHIVE_STATION_ID/,
  "archive offer gating must still require a physically arrived archive presentation",
);
assert.match(
  worldSource,
  /<IglooHud[\s\S]*?activeArtifact=\{evidenceArtifact\}/,
  "the HUD must receive the dock-first evidence identity",
);
assert.match(
  mechanismLayerSource,
  /resolveMechanismLayerSelection\([\s\S]*?exclusiveStationId/,
  "the mechanism selector must use dock ownership rather than only activeArtifactId",
);
assert.match(
  mechanismLayerSource,
  /<PolarStationMechanisms(?:NE|SW)[\s\S]*?exclusiveStationId/,
  "the mounted mechanism family must receive dock ownership to suppress siblings",
);
assert.match(
  northeastMechanismSource,
  /const selectedId = NE_MECHANISM_IDS\.includes\(exclusiveStationId\)/,
  "northeast ritual identity must prioritize the dock owner",
);
assert.match(
  southwestMechanismSource,
  /const selectedId = SW_MECHANISM_IDS\.includes\(exclusiveStationId\)/,
  "southwest ritual identity must prioritize the dock owner",
);

assert.match(biomeSource, /stationPersonalityBiomeIdentity/);
assert.equal((biomeSource.match(/\.\.\.stationPersonalityBiomeIdentity\(/g) || []).length, 8);
assert.match(particleSource, /stationPersonalityParticleIdentity/);
assert.doesNotMatch(particleSource, /semantic:\s*"/);
assert.doesNotMatch(particleSource, /color:\s*"#[0-9A-F]{6}"/i);

console.log("Station personality authority verified: 8 deeply frozen, complete, exclusive identity profiles.");
