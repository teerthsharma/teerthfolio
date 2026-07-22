import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const libraryPath = join(root, "lib", "polar-station-mechanisms-sw.js");
const componentPath = join(root, "components", "PolarStationMechanismsSW.jsx");
const personalityPath = join(root, "lib", "polar-station-personality.js");

assert.ok(
  existsSync(libraryPath),
  "lib/polar-station-mechanisms-sw.js must define the southwest mechanism authority",
);

const mechanisms = await import(pathToFileURL(libraryPath).href);
const { STATION_PERSONALITY_PROFILES } = await import(pathToFileURL(personalityPath).href);
const {
  SW_ASSEMBLY_PART_TYPES,
  SW_MECHANISM_INTEGRATION,
  SW_MECHANISM_BUDGET,
  SW_MECHANISM_IDS,
  SW_MECHANISM_PHASES,
  SW_MECHANISM_PROFILES,
  SW_MECHANISM_SCALE_CONTRACTS,
  SW_MECHANISM_VISUAL_CONTRACTS,
  advanceSouthwestMechanisms,
  createSouthwestMechanismSystem,
  deriveAssemblyVisitorYaw,
  deriveStableSignalBearing,
  deriveTopologyBarcode,
  resolveSouthwestMechanismInputs,
  resolveSouthwestStationReveal,
} = mechanisms;

const IDS = [
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];

assert.deepEqual(SW_MECHANISM_IDS, IDS);
assert.ok(Object.isFrozen(SW_MECHANISM_IDS));
assert.deepEqual(SW_MECHANISM_PHASES[IDS[0]], [
  "LISTEN",
  "FIND_BEARING",
  "SYNC",
  "RECEIVE",
  "QUIET",
]);
assert.deepEqual(SW_MECHANISM_PHASES[IDS[1]], [
  "INDEX",
  "TRACE",
  "LIFT_STRATA",
  "OPEN_ARCHIVE",
  "REFILE",
]);
assert.deepEqual(SW_MECHANISM_PHASES[IDS[2]], [
  "STOWED",
  "INDEX_PARTS",
  "ASSEMBLE",
  "PROVE",
  "RESET",
]);
assert.ok(Object.values(SW_MECHANISM_PHASES).every(Object.isFrozen));
assert.deepEqual(SW_MECHANISM_VISUAL_CONTRACTS[IDS[0]].functions, [
  "bearing dish",
  "source packet",
  "signal rings",
]);
assert.deepEqual(SW_MECHANISM_VISUAL_CONTRACTS[IDS[1]].functions, [
  "archive wall",
  "persistent trace",
  "category reconfiguration",
]);
assert.deepEqual(SW_MECHANISM_VISUAL_CONTRACTS[IDS[2]].functions, [
  "gantry",
  "inspection backplane",
  "proof/tool mass",
]);
assert.ok(Object.isFrozen(SW_MECHANISM_VISUAL_CONTRACTS));
assert.ok(Object.values(SW_MECHANISM_VISUAL_CONTRACTS).every(Object.isFrozen));
assert.equal(
  new Set(
    Object.values(SW_MECHANISM_VISUAL_CONTRACTS).map(({ silhouette }) => silhouette),
  ).size,
  3,
  "southwest stations need three distinct compound silhouettes",
);
for (const [id, contract] of Object.entries(SW_MECHANISM_VISUAL_CONTRACTS)) {
  assert.equal(contract.colorScope, "station-local materials only");
  assert.ok(contract.contact.includes("foot") || contract.contact.includes("plinth"));
  assert.ok(contract.highPoly.length >= 3, `${id} needs layered high-poly cues`);
  assert.ok(contract.material.length > 24, `${id} needs a specific optical response`);
}
assert.deepEqual(SW_MECHANISM_BUDGET, {
  high: { drawCalls: 9, programs: 3, textures: 0 },
  medium: { drawCalls: 9, programs: 3, textures: 0 },
  low: { drawCalls: 4, programs: 1, textures: 0 },
  safe: { drawCalls: 0, programs: 0, textures: 0 },
});
assert.deepEqual(SW_MECHANISM_SCALE_CONTRACTS, {
  "upstream-radio-mast": {
    dockedHeroScale: 1.9,
    dishDiameterSealWidths: 2.4,
    mastHeightSealHeights: 4.5,
    depthRole: "behind-seal",
  },
  "topology-archive-wall": {
    dockedHeroScale: 2.15,
    minimumDockedFrameWidthShare: 0.5,
    depthRole: "open-aisle-behind-seal",
  },
  "assembly-tool-locker": {
    dockedHeroScale: 2,
    workshopWidthSealWidths: 5.2,
    depthRole: "workshop-behind-seal",
  },
});
assert.deepEqual(SW_ASSEMBLY_PART_TYPES, ["avx512", "paging", "no_std", "stencil_simd"]);
assert.ok(Object.isFrozen(SW_ASSEMBLY_PART_TYPES));
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].naturalFrequency, 5.4);
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].dampingRatio, 0.86);
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].bearingToleranceDegrees, 3);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].liftThreshold, 0.62);
assert.deepEqual(SW_MECHANISM_PROFILES[IDS[1]].extrusionRange, [0.04, 0.16]);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].apertureDistance, 0.22);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].refileStaggerSeconds, 0.045);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].naturalFrequency, 7);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].dampingRatio, 0.88);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].orientationToleranceDegrees, 1.5);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].translationTolerance, 0.025);
{
  const profile = SW_MECHANISM_PROFILES[IDS[2]];
  const yaw = deriveAssemblyVisitorYaw(profile.centerXZ, profile.dockXZ);
  assert.equal(profile.angleRadians, yaw);
  assert.ok(Object.isFrozen(profile.localOpenFaceXZ));
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const worldOpenX = cosine * profile.localOpenFaceXZ[0] + sine * profile.localOpenFaceXZ[1];
  const worldOpenZ = -sine * profile.localOpenFaceXZ[0] + cosine * profile.localOpenFaceXZ[1];
  const dockX = profile.dockXZ[0] - profile.centerXZ[0];
  const dockZ = profile.dockXZ[1] - profile.centerXZ[1];
  const dockLength = Math.hypot(dockX, dockZ);
  const dot = worldOpenX * (dockX / dockLength) + worldOpenZ * (dockZ / dockLength);
  assert.ok(dot > 0.999999, `Tooling open face must point toward its dock (dot=${dot})`);
}
assert.equal(
  SW_MECHANISM_PROFILES[IDS[0]].palette.surface,
  STATION_PERSONALITY_PROFILES[IDS[0]].palette.signature[2],
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[0]].palette.signal,
  STATION_PERSONALITY_PROFILES[IDS[0]].lighting.fill,
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[0]].palette.bearing,
  STATION_PERSONALITY_PROFILES[IDS[0]].palette.ink,
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[1]].palette.surface,
  STATION_PERSONALITY_PROFILES[IDS[1]].palette.accent,
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[1]].palette.trace,
  STATION_PERSONALITY_PROFILES[IDS[1]].halo.colors[1],
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[1]].palette.shadow,
  STATION_PERSONALITY_PROFILES[IDS[1]].palette.ink,
);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].accent, STATION_PERSONALITY_PROFILES[IDS[2]].halo.colors[0]);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[2]].palette.surface,
  STATION_PERSONALITY_PROFILES[IDS[2]].palette.surface,
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[2]].palette.steel,
  STATION_PERSONALITY_PROFILES[IDS[2]].palette.accent,
);
assert.equal(
  SW_MECHANISM_PROFILES[IDS[2]].palette.highlight,
  STATION_PERSONALITY_PROFILES[IDS[2]].lighting.key,
);
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[0]].material, /mint waveguide/i);
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[1]].silhouette, /staggered relational canyon/i);
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[2]].material, /purple metallic basalt/i);
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].dishOrientation, "face-on-camera");
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].waveRingMode, "concentric-amplitude");
assert.equal(SW_MECHANISM_PROFILES[IDS[0]].directionalPacketCount, 1);
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[0]].silhouette, /face-on coral\/mint radar/i);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].launchApertureDistance, 0.34);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].countdownSeconds, 3);
assert.equal(SW_MECHANISM_PROFILES[IDS[1]].ignitionMotion, "countdown-then-ignition");
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[1]].silhouette, /magenta\/cyan rocket launch pad/i);
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[1]].material, /open gantry/i);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].railCount, 2);
assert.equal(SW_MECHANISM_PROFILES[IDS[2]].edgeLighting, "purple-gold-lit");
assert.match(SW_MECHANISM_VISUAL_CONTRACTS[IDS[2]].silhouette, /suspended assembly rails/i);
assert.equal(
  new Set(IDS.map((id) => SW_MECHANISM_PROFILES[id].palette.surface)).size,
  3,
  "station surfaces must differ by material family, not a hue-only shared material",
);
assert.deepEqual(SW_MECHANISM_INTEGRATION, {
  fixedStepHz: 120,
  inputAuthority: "canonical traversal XZ plus source refs",
  outputAuthority: "ritual and evidence readiness only",
  evidenceTiming: "after physical dock proof",
  pointerRole: "optional bounded inspection",
});

// One destination owns the frame; a distinct arrival may appear only as a subdued promise.
{
  const reveal = resolveSouthwestStationReveal({
    arrivalStationId: IDS[2],
    arrivalStrength: 0.8,
    dockedId: IDS[0],
    proximityStationId: IDS[0],
    stationProximity: 1,
  });
  assert.equal(reveal.activeId, IDS[0]);
  assert.equal(reveal.promiseId, null, "docking is exclusive and suppresses every arrival promise");
  assert.equal(reveal.alphas[IDS[0]], 1);
  assert.equal(Object.values(reveal.alphas).filter((alpha) => alpha > 0).length, 1);

  const traveling = resolveSouthwestStationReveal({
    arrivalStationId: IDS[2],
    arrivalStrength: 0.8,
    dockedId: null,
    proximityStationId: IDS[0],
    stationProximity: 0.55,
  });
  assert.equal(traveling.activeId, IDS[0]);
  assert.equal(traveling.promiseId, IDS[2]);
  assert.ok(traveling.alphas[IDS[2]] > 0 && traveling.alphas[IDS[2]] <= 0.24);
  assert.equal(Object.values(traveling.alphas).filter((alpha) => alpha > 0).length, 2);

  const nearby = resolveSouthwestStationReveal({
    arrivalStationId: IDS[1],
    arrivalStrength: 1,
    dockedId: null,
    proximityStationId: IDS[1],
    stationProximity: 0.9,
  });
  assert.equal(nearby.activeId, IDS[1]);
  assert.equal(nearby.promiseId, null);
  assert.equal(Object.values(nearby.alphas).filter((alpha) => alpha > 0).length, 1);

  const hidden = resolveSouthwestStationReveal(null);
  assert.equal(hidden.activeId, null);
  assert.equal(Object.values(hidden.alphas).filter((alpha) => alpha > 0).length, 0);
}

const liveSummary = Object.freeze({
  sourceMode: "live-github",
  generatedAt: "2026-07-12T00:00:00.000Z",
  profile: Object.freeze({
    html_url: "https://github.com/teerthsharma",
    login: "teerthsharma",
    name: "Teerth Sharma",
  }),
  latest: Object.freeze([
    Object.freeze({
      label: "Upstream PR opened",
      repo: "google-deepmind/mujoco",
      title: "Topology-aware island dispatch",
      url: "https://github.com/google-deepmind/mujoco/pull/1",
    }),
  ]),
});
const fallbackSummary = Object.freeze({
  sourceMode: "research-snapshot",
  profile: Object.freeze({ login: "teerthsharma" }),
  latest: Object.freeze([
    Object.freeze({
      label: "Source snapshot",
      repo: "teerthsharma/lambda-topo",
      title: "Research snapshot",
      url: "https://github.com/teerthsharma/lambda-topo",
    }),
  ]),
});

const liveBearingA = deriveStableSignalBearing(liveSummary);
const liveBearingB = deriveStableSignalBearing({
  ...liveSummary,
  generatedAt: "2099-01-01T00:00:00.000Z",
});
assert.equal(liveBearingA, liveBearingB, "timestamps must not jitter the signal bearing");
assert.ok(liveBearingA >= -180 && liveBearingA < 180);
assert.equal(
  deriveStableSignalBearing(fallbackSummary),
  SW_MECHANISM_PROFILES[IDS[0]].homeBearingDegrees,
  "fallback stays at the authored home direction",
);
assert.notEqual(
  liveBearingA,
  deriveStableSignalBearing({
    ...liveSummary,
    latest: [{ ...liveSummary.latest[0], repo: "vllm-project/vllm" }],
  }),
);

const topologySources = Object.freeze([
  Object.freeze({ category: "topology", name: "lambda-topo", sourceUrl: "https://github.com/teerthsharma/lambda-topo" }),
  Object.freeze({ category: "topology", name: "topoflow", sourceUrl: "https://github.com/teerthsharma/topoflow" }),
  Object.freeze({ category: "memory", name: "phi-mem", sourceUrl: "https://github.com/teerthsharma/phi-mem" }),
  Object.freeze({ category: "visualization", name: "topoml", sourceUrl: "https://github.com/teerthsharma/topoml" }),
]);
const barcodeA = deriveTopologyBarcode(topologySources, "topology");
const barcodeB = deriveTopologyBarcode([...topologySources].reverse(), "topology");
assert.equal(barcodeA.signature, barcodeB.signature, "source order must not change archive topology");
assert.deepEqual(Array.from(barcodeA.heights), Array.from(barcodeB.heights));
assert.deepEqual(Array.from(barcodeA.path), Array.from(barcodeB.path));
assert.equal(barcodeA.heights.length, 20);
assert.ok(barcodeA.path.length >= 4);
assert.ok(
  Array.from(barcodeA.path).every((bar, index, path) =>
    index === 0 || Math.abs(bar - path[index - 1]) === 1,
  ),
  "the tracing light must follow a connected barcode path",
);
assert.ok(Array.from(barcodeA.depths).every((depth) => depth >= 0.04 && depth <= 0.16));

function emptyInputs() {
  return Object.fromEntries(
    IDS.map((id) => [id, {
      arrivalStrength: 0,
      docked: false,
      pointerPaused: false,
      pointerScrub: null,
      positionX: 0,
      positionZ: 0,
      proximity: 0,
      routeProgress: 0,
      signalMetadata: fallbackSummary,
      topologyCategory: "topology",
      topologySources,
      velocityX: 0,
      velocityZ: 0,
    }]),
  );
}

function advanceFor(system, inputs, seconds, options = {}, frameRate = 60) {
  const frames = Math.ceil(seconds * frameRate);
  for (let frame = 0; frame < frames; frame += 1) {
    advanceSouthwestMechanisms(system, inputs, 1 / frameRate, options);
  }
  return system;
}

// Upstream: stable real metadata drives bearing, pulses require lock, and fallback never claims live.
{
  const system = createSouthwestMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], {
    proximity: 0.76,
    signalMetadata: liveSummary,
  });
  advanceFor(system, inputs, 0.05);
  const state = system.states[IDS[0]];
  assert.equal(state.isLiveSignal, true);
  assert.equal(state.signalClaim, "public GitHub API");
  assert.equal(state.pulsesActive, false, "rings cannot pulse before the dish is within tolerance");
  advanceFor(system, inputs, 2.5);
  assert.equal(state.phase, "SYNC");
  assert.ok(Math.abs(state.bearingErrorDegrees) <= 3);
  assert.equal(state.pulsesActive, true);
  assert.equal(state.evidenceReady, false);

  Object.assign(inputs[IDS[0]], { docked: true, proximity: 1 });
  advanceFor(system, inputs, 0.7);
  assert.equal(state.phase, "RECEIVE");
  assert.equal(state.evidenceReady, true);
  assert.equal(state.receivedPacket.profileLogin, "teerthsharma");
  assert.equal(state.receivedPacket.repository, "google-deepmind/mujoco");
  assert.equal(state.ritual.breathingMultiplier, 1);
  assert.equal(state.ritual.haloColor, "#F47D69");

  Object.assign(inputs[IDS[0]], {
    docked: false,
    proximity: 0.7,
    signalMetadata: fallbackSummary,
  });
  advanceFor(system, inputs, 2.5);
  assert.equal(state.isLiveSignal, false);
  assert.equal(state.signalClaim, "research snapshot");
  assert.equal(state.pulsesActive, false, "snapshot lock cannot masquerade as a live pulse");
}

// Topology: deterministic connected trace, bounded lifts, 0.22 aperture, reverse 45 ms refile.
{
  const system = createSouthwestMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[1]], {
    proximity: 0.78,
    topologyCategory: "topology",
    topologySources,
  });
  advanceFor(system, inputs, 1.2);
  const state = system.states[IDS[1]];
  assert.equal(state.phase, "LIFT_STRATA");
  assert.equal(state.countdown, 0);
  assert.equal(state.ignition, 0);
  const traced = new Set(state.barcode.path);
  for (let index = 0; index < state.barExtrusions.length; index += 1) {
    if (traced.has(index)) {
      assert.ok(state.barExtrusions[index] >= 0.039);
      assert.ok(state.barExtrusions[index] <= 0.161);
    } else {
      assert.ok(state.barExtrusions[index] < 1e-5, "untraced strata must stay seated");
    }
  }
  assert.equal(state.evidenceReady, false);
  assert.equal(state.ritual.haloTiltDegrees, 61);

  Object.assign(inputs[IDS[1]], { docked: true, proximity: 1 });
  advanceFor(system, inputs, 0.8);
  assert.equal(state.phase, "OPEN_ARCHIVE");
  assert.ok(Math.abs(state.aperture - 0.22) < 1e-4);
  assert.equal(state.countdown, 3);
  assert.ok(state.ignition > 0);
  assert.equal(state.evidenceReady, true);

  Object.assign(inputs[IDS[1]], { docked: false, proximity: 0 });
  advanceFor(system, inputs, 0.07);
  assert.equal(state.phase, "REFILE");
  const firstPathBar = state.barcode.path[0];
  const lastPathBar = state.barcode.path[state.barcode.path.length - 1];
  assert.ok(
    state.barExtrusions[lastPathBar] / state.barcode.depthByBar[lastPathBar] <
      state.barExtrusions[firstPathBar] / state.barcode.depthByBar[firstPathBar],
    "reverse stagger must refile the final traced bar first",
  );
}

// Assembly: pins index four typed groups, two arms seat them, proof is tolerance-gated and finite.
{
  const system = createSouthwestMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[2]], { proximity: 0.74 });
  advanceFor(system, inputs, 0.7);
  const state = system.states[IDS[2]];
  assert.equal(state.phase, "INDEX_PARTS");
  assert.ok(Array.from(state.locatorPinLifts).some((lift) => lift > 0.5));
  assert.equal(state.partProgress.length, 4);
  assert.equal(state.armProgress.length, 2);
  assert.equal(state.evidenceReady, false);

  Object.assign(inputs[IDS[2]], { docked: true, proximity: 1 });
  advanceFor(system, inputs, 6);
  assert.equal(state.phase, "PROVE");
  assert.equal(state.evidenceReady, true);
  assert.equal(state.proofSequence, 1);
  assert.equal(state.proofWithinTolerance, true);
  assert.ok(Array.from(state.translationErrors).every((error) => error <= 0.025));
  assert.ok(Array.from(state.orientationErrorsDegrees).every((error) => error <= 1.5));
  assert.equal(state.ritual.haloColor, STATION_PERSONALITY_PROFILES[IDS[2]].halo.colors[0]);
  assert.equal(state.ritual.haloEdgeColor, STATION_PERSONALITY_PROFILES[IDS[2]].halo.colors[1]);
  advanceFor(system, inputs, 0.8);
  assert.equal(state.proofSequence, 1, "proof lock must not loop while docked");

  Object.assign(inputs[IDS[2]], { docked: false, proximity: 0 });
  advanceFor(system, inputs, 0.2);
  assert.equal(state.phase, "RESET");
  assert.equal(state.evidenceReady, false);
  advanceFor(system, inputs, 3.5);
  assert.equal(state.phase, "STOWED");
}

// Tooling repeats one readable workshop cycle while docked: prove, disassemble, rebuild, prove.
{
  const system = createSouthwestMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[2]], { docked: true, proximity: 1 });
  advanceFor(system, inputs, 6);
  const state = system.states[IDS[2]];
  assert.equal(state.phase, "PROVE");
  assert.equal(state.proofSequence, 1);
  advanceFor(system, inputs, 1.5);
  assert.equal(state.phase, "RESET");
  assert.equal(state.evidenceReady, false);
  advanceFor(system, inputs, 8.4);
  assert.equal(state.phase, "PROVE");
  assert.equal(state.proofSequence, 2, "the docked workshop must complete a second proof cycle");
}

// Shared resolver accepts canonical XZ pose and source context without mutating semantic state.
{
  const target = {};
  const pose = {
    arrivalStationId: IDS[0],
    arrivalStrength: 0.7,
    dockedId: null,
    proximityStationId: IDS[0],
    stationProximity: 0.84,
    vx: 1.2,
    vz: -0.4,
    x: 3.4,
    z: -15.2,
  };
  const resolved = resolveSouthwestMechanismInputs(pose, target, {
    assemblyInspection: { paused: true, scrub: 0.5 },
    topologyCategory: "memory",
    topologySources,
    upstreamMetadata: liveSummary,
  });
  assert.equal(resolved, target);
  assert.equal(resolved[IDS[0]].signalMetadata, liveSummary);
  assert.equal(resolved[IDS[1]].topologySources, topologySources);
  assert.equal(resolved[IDS[1]].topologyCategory, "memory");
  assert.equal(resolved[IDS[2]].pointerPaused, true);
  assert.equal(resolved[IDS[2]].pointerScrub, 0.5);
  assert.equal(resolved[IDS[0]].arrivalStrength, 0.7);
  assert.ok(resolved[IDS[0]].proximity >= 0.84);
}

// Reduced/safe variants keep complete semantic access without moving geometry.
{
  const inputs = emptyInputs();
  for (const id of IDS) Object.assign(inputs[id], { docked: true, proximity: 1 });
  inputs[IDS[0]].signalMetadata = liveSummary;
  const reduced = createSouthwestMechanismSystem();
  advanceFor(reduced, inputs, 0.1, { reducedMotion: true });
  assert.equal(reduced.states[IDS[0]].phase, "RECEIVE");
  assert.equal(reduced.states[IDS[0]].dishAngularVelocity, 0);
  assert.equal(reduced.states[IDS[1]].phase, "OPEN_ARCHIVE");
  assert.ok(Array.from(reduced.states[IDS[1]].barExtrusions).every((depth) => depth === 0));
  assert.equal(reduced.states[IDS[2]].phase, "PROVE");
  assert.ok(Array.from(reduced.states[IDS[2]].partVelocities).every((speed) => speed === 0));
  assert.deepEqual(Array.from(reduced.states[IDS[2]].locatorPinLifts), [1, 1, 1, 1]);
  const frozenPins = Array.from(reduced.states[IDS[2]].locatorPinLifts);
  advanceFor(reduced, inputs, 0.8, { reducedMotion: true });
  assert.deepEqual(
    Array.from(reduced.states[IDS[2]].locatorPinLifts),
    frozenPins,
    "reduced-motion locator pins must resolve immediately and remain static",
  );

  const safe = createSouthwestMechanismSystem();
  advanceFor(safe, inputs, 0.1, { safeMode: true });
  assert.ok(IDS.every((id) => safe.states[id].safeStatic));
  assert.ok(IDS.every((id) => safe.states[id].evidenceReady));
}

// Fixed 120 Hz authority remains display-refresh independent.
{
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], { proximity: 0.83, signalMetadata: liveSummary });
  const at30 = advanceFor(createSouthwestMechanismSystem(), inputs, 2, {}, 30);
  const at144 = advanceFor(createSouthwestMechanismSystem(), inputs, 2, {}, 144);
  assert.ok(
    Math.abs(
      at30.states[IDS[0]].dishBearingRadians -
        at144.states[IDS[0]].dishBearingRadians,
    ) < 1e-5,
  );
}

assert.ok(
  existsSync(componentPath),
  "components/PolarStationMechanismsSW.jsx must render the pooled southwest mechanisms",
);
const source = readFileSync(componentPath, "utf8");
for (const token of [
  "useFrame",
  "createSouthwestMechanismSystem",
  "advanceSouthwestMechanisms",
  "resolveSouthwestMechanismInputs",
  "<instancedMesh",
  "instanceMatrix",
  "DynamicDrawUsage",
  "ritualStateRef",
  "traversalPoseRef",
  "upstreamMetadataRef",
  "topologyEvidenceRef",
  "reducedMotion",
  "safeMode",
  "upstream-bearing-dish",
  "upstream-verified-signal-rings",
  "upstream-coral-signal-harbor-footing-and-bearing-cradle",
  "upstream-received-source-packet",
  "topology-thick-relational-archive-canyon-walls-and-plinths",
  "topology-connected-trace",
  "topologyPanelX",
  "TOPOLOGY_SURFACE_COUNT",
  "assembly-heavy-curved-gantry-inspection-backplane-and-proof-tool-mass",
  "assembly-locator-pins",
  "assembly-proof-tolerance-ring",
  "upstream-radio-harbor-antenna-farm upstream-mint-waveguide-beacons",
  "archive-luminous-provenance-apertures archive-index-strata-crowns",
  "assembly-purple-lit-archaeology-gantry assembly-ochre-circuit-hieroglyphs",
  "setInstanceColor",
  "instanceColor.needsUpdate",
  "upstreamPalette.surface",
  "archivePalette.trace",
  "toolingPalette.highlight",
  "SW_MECHANISM_SCALE_CONTRACTS",
  "dockedHeroScale",
  "assemblyCycleTime",
  "visualBearingRadians",
  "ASSEMBLY_ARCH_SEGMENTS",
  "ASSEMBLY_STRUCTURE_COUNT",
  "gantryCompression",
  "THREE.ExtrudeGeometry",
  "THREE.LatheGeometry",
  "geometry.computeVertexNormals()",
  "POLAR_GROUND_Y",
  "localGroundY",
  "createHarborMemberGeometry",
  "createArchiveSlabGeometry",
  "createAssemblyBlockGeometry",
  "shape.holes.push(aperture)",
  "shape.lineTo(0.1, 0.38)",
  "vertexColors: true",
  "disposeRenderResources",
  "resources.archiveSlab.dispose()",
  "resources.assemblyBlock.dispose()",
  "resources.harborMember.dispose()",
  "resources.locatorPin.dispose()",
  "upstream-face-on-coral-mint-radar",
  "upstream-concentric-amplitude-wave-rings",
  "upstream-directional-source-packet",
  "archive-magenta-cyan-rocket-launch-pad",
  "archive-open-canyon-gantry",
  "archive-launch-aperture-countdown-ignition",
  "assembly-purple-gold-lit-workshop",
  "assembly-visitor-facing-open-workshop",
  "assembly-suspended-assembly-rails",
  "assembly-lit-edge-rails",
]) {
  assert.ok(source.includes(token), `PolarStationMechanismsSW.jsx is missing ${JSON.stringify(token)}`);
}
for (const forbidden of [
  "Math.random",
  "useState(",
  "useTexture",
  "TextureLoader",
  "CanvasTexture",
  "/assets/",
  "THREE.BoxGeometry",
  "THREE.SphereGeometry",
  "upstream-mast-structure",
  "assembly-two-gantry-arms-and-typed-parts",
  "<pointLight",
  "<ambientLight",
  "scene.fog",
  "scene.background",
  "new THREE.Color(\"#D86F62\")",
  "new THREE.Color(\"#BD4B88\")",
  "new THREE.Color(\"#6D4BE8\")",
]) {
  assert.ok(!source.includes(forbidden), `southwest renderer must not include ${JSON.stringify(forbidden)}`);
}
assert.equal((source.match(/useFrame\(/g) || []).length, 1, "all three mechanisms share one frame loop");
assert.equal((source.match(/<instancedMesh/g) || []).length, 8, "high/medium use eight pooled instance draws");
assert.equal((source.match(/<lineSegments/g) || []).length, 1, "topology uses one pooled trace line draw");

console.log(
  "Southwest station mechanisms verified: coral-mint signal harbor, magenta-cyan relational archive canyon, purple-basalt proof gantry, source-backed state, 9/4/0 draw tiers, zero textures.",
);
