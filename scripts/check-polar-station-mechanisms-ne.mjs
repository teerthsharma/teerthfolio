import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const libraryPath = join(root, "lib", "polar-station-mechanisms.js");
const componentPath = join(root, "components", "PolarStationMechanismsNE.jsx");

assert.ok(
  existsSync(libraryPath),
  "lib/polar-station-mechanisms.js must define the shared northeast mechanism authority",
);

const mechanisms = await import(pathToFileURL(libraryPath).href);
const {
  NE_MECHANISM_BUDGET,
  NE_MECHANISM_IDS,
  NE_MECHANISM_PHASES,
  NE_MECHANISM_PROFILES,
  NE_MONUMENT_CONTRACTS,
  QPU_MANIFOLD_LAYOUT,
  advanceNortheastMechanisms,
  createNortheastMechanismSystem,
  resolveQpuConstructionStep,
  resolveNortheastStationReveal,
  sampleQpuManifoldBoundary,
} = mechanisms;

const IDS = [
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
];

assert.deepEqual(NE_MECHANISM_IDS, IDS);
assert.ok(Object.isFrozen(NE_MECHANISM_IDS));
assert.deepEqual(NE_MECHANISM_PHASES[IDS[0]], [
  "DORMANT",
  "ACQUIRE",
  "PRECESS",
  "STATE_LOCK",
  "RELEASE",
]);
assert.deepEqual(NE_MECHANISM_PHASES[IDS[1]], [
  "QUIESCENT",
  "SEED",
  "GROW_LOOPS",
  "PERSIST",
  "COLLAPSE",
]);
assert.deepEqual(NE_MECHANISM_PHASES[IDS[2]], [
  "DISCHARGED",
  "INDUCE",
  "POLARIZE",
  "RESONATE",
  "DECAY",
]);
assert.deepEqual(NE_MECHANISM_PHASES[IDS[3]], [
  "DECOHERENT",
  "SAMPLE",
  "ENTANGLE",
  "SPAN",
  "VERIFY",
  "RELAX",
]);
assert.ok(Object.values(NE_MECHANISM_PHASES).every(Object.isFrozen));
assert.deepEqual(NE_MECHANISM_BUDGET, {
  high: { drawCalls: 12, programs: 3, textures: 0 },
  medium: { drawCalls: 12, programs: 3, textures: 0 },
  low: { drawCalls: 4, programs: 2, textures: 0 },
  safe: { drawCalls: 0, programs: 0, textures: 0 },
});
assert.ok(Object.isFrozen(NE_MECHANISM_PROFILES));
assert.deepEqual(IDS.map((id) => NE_MECHANISM_PROFILES[id].angleDegrees), [38, -27, 74, -48]);
assert.equal(NE_MECHANISM_PROFILES[IDS[0]].proofToleranceDegrees, 2.5);
assert.equal(NE_MECHANISM_PROFILES[IDS[0]].lockHoldSeconds, 0.48);
assert.equal(NE_MECHANISM_PROFILES[IDS[0]].releaseSeconds, 1.1);
assert.equal(NE_MECHANISM_PROFILES[IDS[1]].beadCount, 7);
assert.equal(NE_MECHANISM_PROFILES[IDS[1]].persistHoldSeconds, 0.62);
assert.equal(NE_MECHANISM_PROFILES[IDS[2]].coilLimitDegrees, 2.5);
assert.equal(NE_MECHANISM_PROFILES[IDS[2]].packetCount, 4);
assert.equal(NE_MECHANISM_PROFILES[IDS[2]].resonanceHoldSeconds, 0.54);
assert.equal(NE_MECHANISM_PROFILES[IDS[3]].manifoldSliceCount, 13);
assert.equal(NE_MECHANISM_PROFILES[IDS[3]].coherenceThreshold, 0.82);
assert.equal(NE_MECHANISM_PROFILES[IDS[3]].verifySeconds, 0.7);

assert.deepEqual(Object.keys(NE_MONUMENT_CONTRACTS), IDS);
assert.deepEqual(NE_MONUMENT_CONTRACTS[IDS[0]].silhouette, [
  "CERN antimatter cryostat",
  "Penning trap coil rings",
  "vacuum diagnostic beamline",
]);
assert.deepEqual(NE_MONUMENT_CONTRACTS[IDS[1]].silhouette, [
  "separated shield hemispheres",
  "single primordial energy seed",
  "restrained upward holy rays",
]);
assert.deepEqual(NE_MONUMENT_CONTRACTS[IDS[2]].silhouette, [
  "contained field chamber",
  "coil compression",
  "flux skin",
]);
assert.deepEqual(NE_MONUMENT_CONTRACTS[IDS[3]].silhouette, [
  "continuous sampled Riemann-manifold pavilion",
  "stable dock band and slender abutments",
  "contiguous floor shell and ribs",
  "verification beam",
]);
assert.equal(NE_MONUMENT_CONTRACTS[IDS[0]].topology, "antimatter is measured inside a controlled Penning trap");
assert.equal(NE_MONUMENT_CONTRACTS[IDS[1]].topology, "first energy is shielded between two open cradles");
assert.match(NE_MONUMENT_CONTRACTS[IDS[1]].materialSignature, /abyss-blue[\s\S]*living gold/i);
assert.equal(NE_MONUMENT_CONTRACTS[IDS[2]].topology, "field compresses inside a boundary");
assert.match(NE_MONUMENT_CONTRACTS[IDS[2]].materialSignature, /graphite[\s\S]*copper[\s\S]*orange-white plasma/i);
assert.equal(NE_MONUMENT_CONTRACTS[IDS[3]].topology, "coherence closes continuously from both endpoints toward the center");
assert.match(NE_MONUMENT_CONTRACTS[IDS[3]].materialSignature, /alien jade[\s\S]*iridescent cyan[\s\S]*interference/i);
assert.deepEqual(
  IDS.map((id) => NE_MONUMENT_CONTRACTS[id].heroSpanSealWidths),
  [5, 4.6, 5.2, 6.5],
  "docked northeast monuments must read at 4–7 seal widths",
);
assert.deepEqual(
  IDS.map((id) => NE_MONUMENT_CONTRACTS[id].heroScale),
  [1.65, 1.78, 1.7, 1.88],
);
for (const id of IDS) {
  const contract = NE_MONUMENT_CONTRACTS[id];
  assert.ok(Object.isFrozen(contract));
  assert.ok(Object.isFrozen(contract.silhouette));
  assert.ok(Object.isFrozen(contract.geometryPools));
  assert.equal(contract.geometryPools.length, 3);
  assert.equal(new Set(contract.geometryPools).size, 3);
  assert.ok(contract.materialSignature.length >= 3);
  assert.ok(contract.interaction.length >= 8);
}

// Canonical reveal authority: one full station plus, only when distinct, one subdued arrival promise.
{
  const reveal = resolveNortheastStationReveal({
    arrivalStationId: IDS[1],
    arrivalStrength: 0.72,
    dockedId: IDS[0],
    proximityStationId: IDS[0],
    stationProximity: 1,
  });
  assert.equal(reveal.activeId, IDS[0]);
  assert.equal(reveal.promiseId, null, "docking is exclusive and suppresses every arrival promise");
  assert.equal(reveal.alphas[IDS[0]], 1);
  assert.equal(Object.values(reveal.alphas).filter((alpha) => alpha > 0).length, 1);

  const traveling = resolveNortheastStationReveal({
    arrivalStationId: IDS[1],
    arrivalStrength: 0.72,
    dockedId: null,
    proximityStationId: IDS[0],
    stationProximity: 0.56,
  });
  assert.equal(traveling.activeId, IDS[0]);
  assert.equal(traveling.promiseId, IDS[1]);
  assert.ok(traveling.alphas[IDS[1]] > 0 && traveling.alphas[IDS[1]] <= 0.24);
  assert.equal(Object.values(traveling.alphas).filter((alpha) => alpha > 0).length, 2);

  const nearby = resolveNortheastStationReveal({
    arrivalStationId: IDS[2],
    arrivalStrength: 1,
    dockedId: null,
    proximityStationId: IDS[2],
    stationProximity: 0.84,
  });
  assert.equal(nearby.activeId, IDS[2]);
  assert.equal(nearby.promiseId, null, "the active station cannot also render as its promise");
  assert.equal(Object.values(nearby.alphas).filter((alpha) => alpha > 0).length, 1);

  const hidden = resolveNortheastStationReveal(null);
  assert.equal(hidden.activeId, null);
  assert.equal(Object.values(hidden.alphas).filter((alpha) => alpha > 0).length, 0);
}
assert.equal(
  new Set(IDS.map((id) => NE_MONUMENT_CONTRACTS[id].silhouette.join("/"))).size,
  4,
  "every northeast monument needs a distinct grayscale silhouette contract",
);

function emptyInputs() {
  return Object.fromEntries(
    IDS.map((id) => [id, {
      arrivalStrength: 0,
      docked: false,
      positionX: 0,
      positionZ: 0,
      proximity: 0,
      routeProgress: 0,
      velocityX: 0,
      velocityZ: 0,
    }]),
  );
}

function advanceFor(system, inputs, seconds, options = {}, frameRate = 60) {
  const frames = Math.ceil(seconds * frameRate);
  for (let frame = 0; frame < frames; frame += 1) {
    advanceNortheastMechanisms(system, inputs, 1 / frameRate, options);
  }
  return system;
}

function advanceChunks(system, inputs, chunks, options = {}) {
  for (const chunk of chunks) {
    advanceNortheastMechanisms(system, inputs, chunk, options);
  }
  return system;
}

// Every authored QPU slice edge samples the same global manifold point, even at maximum fold.
{
  assert.equal(QPU_MANIFOLD_LAYOUT.sliceCount, 13);
  assert.ok(QPU_MANIFOLD_LAYOUT.halfSpan >= 1.2);
  assert.ok(Object.isFrozen(QPU_MANIFOLD_LAYOUT));
  for (const foldActivity of [0, 1]) {
    for (const time of [0, 0.75, 2.2]) {
      for (let boundary = 0; boundary < QPU_MANIFOLD_LAYOUT.sliceCount - 1; boundary += 1) {
        for (let transverseIndex = 0; transverseIndex <= 8; transverseIndex += 1) {
          const transverse = transverseIndex / 4 - 1;
          const left = sampleQpuManifoldBoundary(boundary, 1, transverse, foldActivity, time);
          const right = sampleQpuManifoldBoundary(boundary + 1, -1, transverse, foldActivity, time);
          assert.ok(
            Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z) < 1e-10,
            `QPU boundary ${boundary}/${boundary + 1} opened at v=${transverse}`,
          );
        }
      }
    }
  }
}

// S2: approach momentum drives bounded precession, cap exchange, proof lock, then timed release.
{
  const system = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], {
    positionX: -7.4,
    positionZ: 15.2,
    proximity: 0.78,
    velocityX: 2.4,
    velocityZ: 1.1,
  });
  advanceFor(system, inputs, 0.8);
  const state = system.states[IDS[0]];
  assert.equal(state.phase, "PRECESS");
  assert.ok(Math.abs(state.targetAngularMomentum) > 0.01);
  assert.equal(state.capExchange, true);
  assert.ok(Array.from(state.ringAngles).every((angle) => Math.abs(angle) <= Math.PI));
  assert.ok(state.shellClosure > 0.2 && state.shellClosure < 1);
  assert.equal(state.brownianCoordinates.length, 6);
  assert.equal(state.brownianVelocities.length, 6);
  assert.equal(state.brownianHarmonicSeeds.length, 6);
  assert.ok(Array.from(state.brownianCoordinates).some((coordinate) => Math.abs(coordinate) > 1e-4));
  assert.ok(
    Math.hypot(...state.brownianCoordinates) <= state.brownianRadius + 1e-6,
    "S2 tangent coordinates must remain projected onto the authored manifold bound",
  );
  assert.equal(state.ritual.breathingMultiplier, 1);
  assert.equal(state.ritual.haloColor, "#3E5BC7");
  const firstDiagnosticPhase = state.proofBitPhase;
  advanceFor(system, inputs, 0.2);
  assert.ok(state.proofBitPhase > firstDiagnosticPhase, "S2 diagnostic pulse must travel axially while approaching");

  Object.assign(inputs[IDS[0]], {
    docked: true,
    proximity: 1,
    velocityX: 0,
    velocityZ: 0,
  });
  advanceFor(system, inputs, 1.6);
  assert.equal(state.phase, "STATE_LOCK");
  assert.equal(state.evidenceReady, true);
  assert.ok(Array.from(state.proofErrors).every((error) => Math.abs(error) <= Math.PI / 72));
  assert.equal(state.ritual.haloAngularVelocity, 0);

  Object.assign(inputs[IDS[0]], { docked: false, proximity: 0 });
  advanceFor(system, inputs, 1.2);
  assert.equal(state.phase, "DORMANT");
  assert.ok(Math.abs(state.angularMomentum) < 0.02);
}

// Aether: seven deterministic beads filter by epsilon and leave exactly one cycle at dock.
{
  const system = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[1]], { proximity: 0.5 });
  advanceFor(system, inputs, 0.3);
  const state = system.states[IDS[1]];
  assert.equal(state.phase, "GROW_LOOPS");
  assert.ok(Math.abs(state.filtrationRadius - 0.32) < 1e-8);
  assert.equal(state.beadVisibility.length, 7);
  assert.equal(state.edgeVisibility.length, 21);
  assert.ok(state.activeEdgeCount > 0);
  assert.ok(Math.abs(state.circulationPhase) > 0.01);
  assert.ok(state.sanctuaryBloom > 0.1);
  const firstCirculationPhase = state.circulationPhase;
  advanceFor(system, inputs, 0.2);
  assert.ok(state.circulationPhase > firstCirculationPhase, "Aether motes must circulate on one closed deterministic path");

  Object.assign(inputs[IDS[1]], { docked: true, proximity: 1 });
  advanceFor(system, inputs, 0.9);
  assert.equal(state.phase, "PERSIST");
  assert.equal(state.visibleCycleCount, 1);
  assert.equal(state.evidenceReady, true);
  assert.equal(state.ritual.headDegrees, -5);
  assert.equal(state.ritual.haloTiltDegrees, 18);

  Object.assign(inputs[IDS[1]], { docked: false, proximity: 0 });
  advanceFor(system, inputs, 0.25);
  assert.equal(state.phase, "COLLAPSE");
}

// Field: signed traversal current drives opposing coils and four packets, with no hover motor.
{
  const system = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  const tangent = NE_MECHANISM_PROFILES[IDS[2]].tangentXZ;
  Object.assign(inputs[IDS[2]], {
    proximity: 0.9,
    velocityX: tangent[0] * 5.4,
    velocityZ: tangent[1] * 5.4,
  });
  advanceFor(system, inputs, 0.5);
  const state = system.states[IDS[2]];
  assert.equal(state.phase, "POLARIZE");
  assert.ok(state.current > 0.72);
  assert.equal(state.packetPhases.length, 4);
  assert.ok(Array.from(state.coilTiltsDegrees).every((tilt) => Math.abs(tilt) <= 2.5 + 1e-8));
  assert.ok(Math.abs(state.coilTiltsDegrees[0] + state.coilTiltsDegrees[1]) < 1e-7);
  assert.ok(state.compression > 0.5);
  assert.ok(state.fluxSkin > 0.25);
  const firstHeaterPacket = state.packetPhases[1];
  advanceFor(system, inputs, 0.2);
  assert.notEqual(state.packetPhases[1], firstHeaterPacket, "Field heater packets must travel longitudinally");

  Object.assign(inputs[IDS[2]], {
    arrivalStrength: 1,
    docked: true,
    proximity: 1,
    velocityX: 0,
    velocityZ: 0,
  });
  advanceFor(system, inputs, 0.8);
  assert.equal(state.phase, "RESONATE");
  assert.equal(state.packetLoopClosed, true);
  assert.equal(state.evidenceReady, true);
  assert.equal(state.ritual.haloBounce, 0.06);

  Object.assign(inputs[IDS[2]], { docked: false, proximity: 0, arrivalStrength: 0 });
  advanceFor(system, inputs, 0.2);
  assert.equal(state.phase, "DECAY");
}

// QPU: one continuous build envelope closes from both endpoints; coherent dock emits one finite beam.
{
  const system = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[3]], { proximity: 0.62, routeProgress: 0.52 });
  advanceFor(system, inputs, 0.7);
  const state = system.states[IDS[3]];
  assert.equal(state.phase, "ENTANGLE");
  assert.ok(state.manifoldBuild > 0.45 && state.manifoldBuild < 0.6);
  assert.equal(state.manifoldSliceBuild.length, 13);
  assert.ok(state.manifoldSliceBuild[0] > state.manifoldSliceBuild[6]);
  assert.ok(state.manifoldSliceBuild[12] > state.manifoldSliceBuild[6]);
  assert.ok(
    Math.abs(state.manifoldSliceBuild[0] - state.manifoldSliceBuild[12]) < 1e-6,
    "QPU endpoint construction must be symmetric",
  );
  assert.ok(state.sanctumPulse > 0.1);
  assert.equal(state.ritual.breathingMultiplier, 1);

  Object.assign(inputs[IDS[3]], { docked: true, proximity: 1, routeProgress: 1 });
  advanceFor(system, inputs, 1.6);
  assert.equal(state.phase, "VERIFY");
  assert.ok(state.coherence >= 0.82);
  assert.equal(state.verificationSequence, 1);
  assert.equal(state.verificationBeamProgress, 1);
  assert.equal(state.evidenceReady, true);
  assert.equal(state.ritual.haloBrightnessStep, 4);
  assert.ok(Array.from(state.manifoldSliceBuild).every((segment) => segment > 0.98));

  advanceFor(system, inputs, 0.8);
  assert.equal(state.verificationSequence, 1, "verification beam must not loop while docked");
}

// Reduced and safe modes are deterministic and never gate semantic evidence.
{
  const reduced = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  for (const id of IDS) Object.assign(inputs[id], { docked: true, proximity: 1, routeProgress: 1 });
  advanceFor(reduced, inputs, 0.1, { reducedMotion: true });
  const s2 = reduced.states[IDS[0]];
  const aether = reduced.states[IDS[1]];
  const field = reduced.states[IDS[2]];
  const qpu = reduced.states[IDS[3]];
  const frozenS2Rings = Array.from(s2.ringAngles);
  const frozenS2Brownian = Array.from(s2.brownianCoordinates);
  const frozenAetherPhase = aether.circulationPhase;
  const frozenFieldPackets = Array.from(field.packetPhases);
  advanceFor(reduced, inputs, 0.8, { reducedMotion: true });
  assert.deepEqual(Array.from(s2.ringAngles), frozenS2Rings);
  assert.deepEqual(Array.from(s2.brownianCoordinates), frozenS2Brownian);
  assert.deepEqual(Array.from(s2.brownianVelocities), [0, 0, 0, 0, 0, 0]);
  assert.equal(aether.circulationPhase, frozenAetherPhase);
  assert.deepEqual(Array.from(field.packetPhases), frozenFieldPackets);
  assert.equal(field.phase, "RESONATE");
  assert.equal(field.evidenceReady, true);
  assert.deepEqual(Array.from(qpu.manifoldSliceBuild), new Array(13).fill(1));
  assert.deepEqual(Array.from(qpu.manifoldSliceVelocities), new Array(13).fill(0));

  const safe = createNortheastMechanismSystem();
  advanceFor(safe, inputs, 0.1, { safeMode: true });
  assert.ok(IDS.every((id) => safe.states[id].safeStatic));
  assert.ok(IDS.every((id) => safe.states[id].evidenceReady));
}

// Fixed-step output remains stable across common display refresh rates.
{
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], {
    positionX: -7,
    positionZ: 15,
    proximity: 0.8,
    velocityX: 2.2,
    velocityZ: 1.4,
  });
  const at30 = advanceFor(createNortheastMechanismSystem(), inputs, 2, {}, 30);
  const at10 = advanceFor(createNortheastMechanismSystem(), inputs, 2, {}, 10);
  const at144 = advanceFor(createNortheastMechanismSystem(), inputs, 2, {}, 144);
  const mixed = advanceChunks(
    createNortheastMechanismSystem(),
    inputs,
    Array.from({ length: 8 }, () => [0.1, 0.025, 0.05, 0.075]).flat(),
  );
  const a = at30.states[IDS[0]];
  const b = at144.states[IDS[0]];
  assert.ok(Math.abs(at10.simulationTime - at144.simulationTime) < 1e-8);
  assert.ok(Math.abs(mixed.simulationTime - at144.simulationTime) < 1e-8);
  assert.ok(Math.abs(a.ringAngles[0] - b.ringAngles[0]) < 1e-5);
  assert.ok(Math.abs(a.ringAngles[1] - b.ringAngles[1]) < 1e-5);
  for (let index = 0; index < a.brownianCoordinates.length; index += 1) {
    assert.ok(Math.abs(a.brownianCoordinates[index] - b.brownianCoordinates[index]) < 1e-5);
    assert.ok(Math.abs(a.brownianVelocities[index] - b.brownianVelocities[index]) < 1e-5);
    assert.ok(Math.abs(at10.states[IDS[0]].brownianCoordinates[index] - b.brownianCoordinates[index]) < 1e-5);
    assert.ok(Math.abs(mixed.states[IDS[0]].brownianCoordinates[index] - b.brownianCoordinates[index]) < 1e-5);
  }
}

// A fractional display remainder survives the largest accepted hitch instead of being pre-clamped away.
{
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], { proximity: 0.8, positionX: -7, positionZ: 15 });
  const fractionalHitch = createNortheastMechanismSystem();
  advanceNortheastMechanisms(fractionalHitch, inputs, 1 / 144);
  advanceNortheastMechanisms(fractionalHitch, inputs, 0.1);
  assert.ok(Math.abs(fractionalHitch.simulationTime + fractionalHitch.accumulator - (1 / 144 + 0.1)) < 1e-10);
  assert.ok(fractionalHitch.accumulator > 0 && fractionalHitch.accumulator < 1 / 120);

  const fractionalMixed = createNortheastMechanismSystem();
  const chunks = Array.from({ length: 20 }, () => [1 / 144, 0.1, 1 / 165, 0.05]).flat();
  let acceptedTime = 0;
  for (const chunk of chunks) {
    acceptedTime += chunk;
    advanceNortheastMechanisms(fractionalMixed, inputs, chunk);
    assert.ok(fractionalMixed.accumulator < 1 / 120 + 1e-10, "accepted <=0.1 frames must not accumulate an unbounded backlog");
  }
  assert.ok(Math.abs(fractionalMixed.simulationTime + fractionalMixed.accumulator - acceptedTime) < 1e-9);
}

// The actual one-draw manifold reveal advances in endpoint-paired construction steps.
{
  assert.equal(resolveQpuConstructionStep(0, 24), 0);
  assert.equal(resolveQpuConstructionStep(0.24, 24), 5);
  assert.equal(resolveQpuConstructionStep(0.5, 24), 12);
  assert.equal(resolveQpuConstructionStep(1, 24), 24);
}

// Deterministic harmonic/OU forcing remains mean-reverting and bounded over a long run.
{
  const system = createNortheastMechanismSystem();
  const inputs = emptyInputs();
  Object.assign(inputs[IDS[0]], { proximity: 0.86, positionX: -7, positionZ: 15 });
  advanceFor(system, inputs, 90, {}, 60);
  const state = system.states[IDS[0]];
  assert.ok(Math.hypot(...state.brownianCoordinates) <= state.brownianRadius + 1e-6);
  assert.ok(Array.from(state.brownianCoordinates).every(Number.isFinite));
  assert.ok(Array.from(state.brownianVelocities).every(Number.isFinite));
}

assert.ok(
  existsSync(componentPath),
  "components/PolarStationMechanismsNE.jsx must render the pooled northeast mechanisms",
);
const source = readFileSync(componentPath, "utf8");
const librarySource = readFileSync(libraryPath, "utf8");

for (const token of [
  "brownianCoordinates",
  "brownianVelocities",
  "brownianHarmonicSeeds",
  "S2_BROWNIAN_RADIUS",
  "S2_BROWNIAN_FREQUENCIES",
  "stepS2BrownianManifold",
]) {
  assert.ok(librarySource.includes(token), `S2 Brownian authority is missing ${JSON.stringify(token)}`);
}
assert.ok(!librarySource.includes("Math.random"), "mechanism authority must not sample Math.random");

function materialValue(materialName, property) {
  const block = source.match(
    new RegExp(`${materialName}:\\s*makeArchitecturalSurface\\(\\{([\\s\\S]*?)\\n\\s*\\}\\),`),
  );
  assert.ok(block, `${materialName} material definition must remain explicit`);
  const value = block[1].match(new RegExp(`${property}:\\s*"([^"]+)"`));
  assert.ok(value, `${materialName} must define ${property}`);
  return value[1];
}

function hexLuminance(hex) {
  const value = hex.replace(/^#/, "");
  assert.match(value, /^[0-9a-f]{6}$/i, `expected a six-digit hex material color: ${hex}`);
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

// Focused visual hotfix contracts: palette checks fail before the material fix;
// span checks lock the authored geometry/scale against future shrinkage.
const s2FrameColor = materialValue("s2Frame", "color");
assert.ok(
  Number.parseInt(s2FrameColor.slice(5, 7), 16) >= 140 && hexLuminance(s2FrameColor) >= 58,
  `S2 frame must read as cobalt rather than a near-black silhouette (${s2FrameColor})`,
);
const aetherFrameColor = materialValue("aetherFrame", "color");
assert.ok(
  Number.parseInt(aetherFrameColor.slice(5, 7), 16) >= 100 && hexLuminance(aetherFrameColor) >= 32,
  `Aether holder must remain a dominant abyss-blue volume (${aetherFrameColor})`,
);
const qpuFrameColor = materialValue("qpuFrame", "color");
assert.ok(
  Number.parseInt(qpuFrameColor.slice(2, 4), 16) >= 100 && hexLuminance(qpuFrameColor) >= 38,
  `QPU bridge support must read as luminous teal rather than black (${qpuFrameColor})`,
);
const fieldHeaterHalfLength = Number(source.match(/const FIELD_HEATER_HALF_LENGTH = ([0-9.]+);/)?.[1]);
const qpuAbutmentRadius = Number(source.match(/const QPU_ABUTMENT_RADIUS = ([0-9.]+);/)?.[1]);
const qpuAbutmentHeight = Number(source.match(/const QPU_ABUTMENT_HEIGHT = ([0-9.]+);/)?.[1]);
assert.ok(fieldHeaterHalfLength >= 0.9, "Field heater must retain its authored thermal-land span");
assert.ok(qpuAbutmentRadius <= 0.1, "QPU endpoint abutments must stay slender rather than reading as blocks");
assert.ok(qpuAbutmentHeight <= 0.55, "QPU endpoint abutments must stay subordinate to the shell");

assert.match(
  source,
  /S2_CRYOGENIC_LAB_PROFILE[\s\S]*CERN Penning-trap cryogenic laboratory[\s\S]*cobalt shell[\s\S]*machined pale metal[\s\S]*cyan diagnostics[\s\S]*axial halo/,
  "S2 must publish the complete CERN/Penning-trap laboratory identity",
);
assert.match(
  source,
  /applyStationRootReveal[\s\S]*heroScale[\s\S]*isDocked/,
  "active docked northeast monuments must expand to their measured hero scale",
);
assert.match(
  source,
  /s2AxialTravel[\s\S]*S2_DIAGNOSTIC_HALF_SPAN/,
  "S2 must render an axial travelling diagnostic pulse",
);
assert.match(
  source,
  /AETHER_DOMINANT_SEED_RADIUS[\s\S]*SphereGeometry/,
  "Aether must suspend a dominant spherical golden first-energy seed",
);
assert.match(
  source,
  /FIELD_HEATER_HALF_LENGTH[\s\S]*FieldHelixCurve[\s\S]*target\.set/,
  "Field coils must run along a macro-scale longitudinal heater axis",
);
assert.match(
  source,
  /QPU_MANIFOLD_SLICE_COUNT[\s\S]*manifoldSliceBuild[\s\S]*manifoldBuild/,
  "QPU must reconstruct continuously from one bounded build envelope",
);
assert.match(
  source,
  /createQpuCausewayFrameGeometry[\s\S]*stableVertexCount[\s\S]*constructionStepEndVertexCounts/,
  "the one-draw QPU frame must retain stable and endpoint-paired construction vertex ranges",
);
assert.match(
  source,
  /const leftBand = step[\s\S]*const rightBand = uSegments - 1 - step[\s\S]*orderedIndices\.push/,
  "non-indexed manifold triangles must be ordered in symmetric endpoint-to-center pairs",
);
assert.match(
  source,
  /function updateQpuFrameDrawRange[\s\S]*geometry\.setDrawRange\(0, visibleVertexCount\)/,
  "the QPU frame helper must change actual geometry visibility",
);
assert.match(
  source,
  /updateQpuFrameDrawRange\(pools\.frame, state\.manifoldBuild\)/,
  "actual QPU floor and shell visibility must consume manifold build progress",
);
assert.match(
  source,
  /createS2AntimatterCryostatGeometry[\s\S]*s2-machined-axial-rails[\s\S]*s2-calibration-collars[\s\S]*createS2PenningTrapCoilGeometry/,
  "S2 containment geometry must include machined rails and calibration collars without new pools",
);
assert.match(
  source,
  /AETHER_ABYSS_PROFILE[\s\S]*abyss-blue[\s\S]*golden seed[\s\S]*golden deterministic motes[\s\S]*caustic arcs/,
  "Aether must publish a readable abyss-blue and living-gold identity",
);
assert.match(
  source,
  /FIELD_THERMAL_FORGE_PROFILE[\s\S]*graphite[\s\S]*copper[\s\S]*orange-white plasma[\s\S]*heat shimmer/,
  "Field must publish a graphite, copper, and plasma thermal-forge identity",
);
assert.match(
  source,
  /QPU_ALIEN_COHERENCE_PROFILE[\s\S]*Riemann-manifold ice pavilion[\s\S]*alien jade dock band[\s\S]*contiguous floor shell and ribs[\s\S]*verification beam/,
  "QPU must publish a continuous alien-jade/cyan manifold pavilion identity",
);
assert.match(
  source,
  /awardThermalBand[\s\S]*objectNormal[\s\S]*uAwardActivity[\s\S]*FIELD_VERTEX_DISPLACEMENT_LIMIT/,
  "Field heat must deform vertices with bounded activity-driven normal displacement",
);
assert.match(
  source,
  /awardQpuFold[\s\S]*transformed\.x[\s\S]*transformed\.z[\s\S]*QPU_VERTEX_FOLD_LIMIT/,
  "QPU interference must perform a bounded spatial coordinate fold",
);
assert.match(
  source,
  /const authoredTime = reducedMotion \? REDUCED_MOTION_SHADER_TIME : elapsed/,
  "reduced motion must freeze every shader displacement at one authored instant",
);
assert.match(
  source,
  /if \(safeMode \|\| !visible\) return EMPTY_RENDER_RESOURCES[\s\S]*createRenderResources\(quality, detailed\)/,
  "safe and hidden modes must not allocate northeast geometry",
);
assert.match(
  source,
  /const geometries = \{[\s\S]*aetherFrame[\s\S]*fieldFrame[\s\S]*qpuFrame[\s\S]*s2Frame[\s\S]*if \(detailed\) \{[\s\S]*Object\.assign\(geometries/,
  "low quality must construct only the four rendered frame geometry pools",
);
for (const token of [
  "useFrame",
  "RoundedBoxGeometry",
  "mergeGeometries",
  "createNortheastMechanismSystem",
  "advanceNortheastMechanisms",
  "<instancedMesh",
  "instanceMatrix",
  "DynamicDrawUsage",
  "ritualStateRef",
  "traversalPoseRef",
  "reducedMotion",
  "safeMode",
  "verification-beam",
  "persistent-cycle",
  "field-charge-packets",
  "s2-proof-bit",
  "createS2AntimatterCryostatGeometry",
  "createS2PenningTrapCoilGeometry",
  "createS2DiagnosticBeamlineGeometry",
  "createAetherPrimordialSanctuaryGeometry",
  "createAetherShieldHemisphereGeometry",
  "createAetherFirstEnergySeedGeometry",
  "createAetherCausticArcGeometry",
  "createFieldContainmentFrameGeometry",
  "createFieldHelixGeometry",
  "createFieldPlasmaCoreGeometry",
  "createQpuCausewayFrameGeometry",
  "createQpuContinuousManifoldGeometry",
  "createQpuManifoldRibGeometry",
  "createQpuStableDockBandGeometry",
  "awardLowPass",
  "wrapped diffuse",
  "Fresnel containment",
  "S2_KERNEL_SHELL_GAP",
  "QPU_BRIDGE_HALF_SPAN",
  "QPU_MANIFOLD_SLICE_COUNT",
  "s2-cern-antimatter-cryostat",
  "s2-penning-trap-superconducting-coil-rings",
  "s2-vacuum-throat diagnostic-beamline",
  "aether-primordial-first-energy-sanctuary",
  "aether-two-separated-shield-hemispheres",
  "aether-one-golden-energy-seed holy-upward-rays",
  "aether-abyss-blue-caustic-arc",
  "resolveNortheastStationReveal",
  "stationRootRefs",
  "promiseId",
  "field-graphite-copper-contained-thermal-chamber",
  "field-compressing-helical-coils",
  "field-graphite-copper-orange-white-plasma",
  "qpu-continuous-riemann-manifold-pavilion",
  "qpu-contiguous-floor-shell-and-ribs",
  "qpu-stable-visitor-dock-band-and-slender-abutments",
  "qpu-manifold-verification-beam",
  "new THREE.BufferGeometry()",
  "geometry.setAttribute(\"position\"",
  "constructionStepEndVertexCounts",
  "brownianCoordinates",
  "customProgramCacheKey",
  "castShadow",
  "receiveShadow",
]) {
  assert.ok(source.includes(token), `PolarStationMechanismsNE.jsx is missing ${JSON.stringify(token)}`);
}
for (const forbidden of [
  "Math.random",
  "useState(",
  "useTexture",
  "TextureLoader",
  "CanvasTexture",
  "/assets/",
  "breath",
  "aether-nested-loops",
  "aether-outward-circulating-manifold-ribbons",
  "aether-seven-phase-beads",
  "s2-split-kernel-shells-and-state-planes",
  "field-amber-mint-contained-field-chamber",
  "qpuNaniteScatter",
  "QPU_ENDPOINT_SCALE",
  "qpu-stepped-coherence-span",
  "paired-sanctums",
  "createQpuSampledRiemannStripGeometry",
]) {
  assert.ok(!source.includes(forbidden), `mechanism renderer must not include ${JSON.stringify(forbidden)}`);
}
assert.equal((source.match(/useFrame\(/g) || []).length, 1, "all four mechanisms share one frame loop");
assert.equal((source.match(/<instancedMesh/g) || []).length, 12, "high/medium use three bounded architectural pools per monument");
assert.equal((source.match(/<lineSegments/g) || []).length, 0, "thin debug lines cannot carry monument silhouettes");
assert.ok(
  !source.includes("s2-gyroscope-rings"),
  "S2 must not retain the dominant generic Saturn/gyroscope orbit silhouette",
);
for (const forbidden of [
  "aether-nested-loops",
  "field-opposed-coils",
  "qpu-stepped-ice-coherence-span",
  "new THREE.BoxGeometry(0.48, 0.105, 0.78)",
]) {
  assert.ok(!source.includes(forbidden), `old primitive mechanism is still present: ${forbidden}`);
}

console.log(
  "Northeast station mechanisms verified: continuous QPU manifold, bounded deterministic S2 Brownian coordinates, three bounded pools each, 12/4/0 draw tiers, zero textures.",
);
