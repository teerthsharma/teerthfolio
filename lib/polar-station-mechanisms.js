import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import { STATION_PERSONALITY_PROFILES } from "./polar-station-personality.js";

const FIXED_STEP_SECONDS = 1 / 120;
const MAX_SUBSTEPS = 8;
const MAX_FRAME_SECONDS = 0.1;
const STEP_EPSILON = 1e-10;
const SEAL_MASS = 1.35;
const S2_BROWNIAN_RADIUS = 0.18;
const S2_BROWNIAN_SEEDS = Object.freeze([0.37, 1.41, 2.63, 3.79, 4.91, 5.87]);
const S2_BROWNIAN_FREQUENCIES = Object.freeze([0.73, 0.91, 1.13, 1.37, 1.61, 1.87]);
const QPU_MANIFOLD_SLICE_COUNT = 13;

export const NE_MECHANISM_IDS = Object.freeze([
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
]);

export const NE_MECHANISM_PHASES = Object.freeze({
  "s2-kernel-core": Object.freeze([
    "DORMANT",
    "ACQUIRE",
    "PRECESS",
    "STATE_LOCK",
    "RELEASE",
  ]),
  "manifold-reactor": Object.freeze([
    "QUIESCENT",
    "SEED",
    "GROW_LOOPS",
    "PERSIST",
    "COLLAPSE",
  ]),
  "field-chamber-coils": Object.freeze([
    "DISCHARGED",
    "INDUCE",
    "POLARIZE",
    "RESONATE",
    "DECAY",
  ]),
  "qpu-ice-bridge": Object.freeze([
    "DECOHERENT",
    "SAMPLE",
    "ENTANGLE",
    "SPAN",
    "VERIFY",
    "RELAX",
  ]),
});

export const NE_MECHANISM_BUDGET = Object.freeze({
  high: Object.freeze({ drawCalls: 12, programs: 3, textures: 0 }),
  medium: Object.freeze({ drawCalls: 12, programs: 3, textures: 0 }),
  low: Object.freeze({ drawCalls: 4, programs: 2, textures: 0 }),
  safe: Object.freeze({ drawCalls: 0, programs: 0, textures: 0 }),
});

function freezeMonumentContract({ geometryPools, silhouette, ...contract }) {
  return Object.freeze({
    ...contract,
    geometryPools: Object.freeze([...geometryPools]),
    silhouette: Object.freeze([...silhouette]),
  });
}

/**
 * Visual contracts are semantic rather than palette-only. Each monument owns
 * three bounded geometry pools and a physical state response. The renderer may
 * lower tessellation by quality tier, but it may not collapse these contracts
 * into a shared primitive or a hue swap.
 */
export const NE_MONUMENT_CONTRACTS = Object.freeze({
  "s2-kernel-core": freezeMonumentContract({
    geometryPools: ["antimatter-cryostat", "penning-trap-coils", "diagnostic-beamline"],
    heroScale: 1.65,
    heroSpanSealWidths: 5,
    interaction: "approach energizes the Penning trap; dock aligns the antimatter diagnostic beamline",
    materialSignature: "long cobalt/CERN cryogenic chamber / pale superconducting coils / bright cyan diagnostic rails and vacuum diagnostics",
    silhouette: ["CERN antimatter cryostat", "Penning trap coil rings", "vacuum diagnostic beamline"],
    topology: "antimatter is measured inside a controlled Penning trap",
  }),
  "manifold-reactor": freezeMonumentContract({
    geometryPools: ["primordial-sanctuary", "shield-hemispheres", "first-energy-seed"],
    heroScale: 1.78,
    heroSpanSealWidths: 4.6,
    interaction: "proximity parts the protective cradles; dock steadies one primordial golden energy seed",
    materialSignature: "dominant abyss-blue holder / deep-ocean shield hemispheres / readable living gold first-energy seed and gold particles",
    silhouette: ["separated shield hemispheres", "single primordial energy seed", "restrained upward holy rays"],
    topology: "first energy is shielded between two open cradles",
  }),
  "field-chamber-coils": freezeMonumentContract({
    geometryPools: ["containment-frame", "helical-coil", "flux-packet"],
    heroScale: 1.7,
    heroSpanSealWidths: 5.2,
    interaction: "signed approach current compresses opposed helices inside the chamber",
    materialSignature: "graphite thermal land / copper induction coils / large orange-white plasma heater and flux light below the chamber",
    silhouette: ["contained field chamber", "coil compression", "flux skin"],
    topology: "field compresses inside a boundary",
  }),
  "qpu-ice-bridge": freezeMonumentContract({
    geometryPools: ["stable-dock-band", "sampled-manifold-slices", "verification-conduit"],
    heroScale: 1.88,
    heroSpanSealWidths: 6.5,
    interaction: "route progress raises a continuous span; coherent dock traverses one beam",
    materialSignature: "huge suspended inverse nano-robot bridge / alien jade support / iridescent cyan-teal interference components and aqua-gold coherence light",
    silhouette: [
      "continuous sampled Riemann-manifold pavilion",
      "stable dock band and slender abutments",
      "contiguous floor shell and ribs",
      "verification beam",
    ],
    topology: "coherence closes continuously from both endpoints toward the center",
  }),
});

/**
 * Station-level visibility authority. The world may show one fully authored
 * monument and, at most, one subdued arrival promise. Family mounting alone is
 * intentionally insufficient: drawing every sibling collapses the perceived
 * XZ scale and makes stations read as a catalogue instead of destinations.
 */
export function resolveNortheastStationReveal(selection, exclusiveStationId = null) {
  const alphas = Object.fromEntries(NE_MECHANISM_IDS.map((id) => [id, 0]));
  if (exclusiveStationId) {
    const activeId = NE_MECHANISM_IDS.includes(exclusiveStationId)
      ? exclusiveStationId
      : null;
    if (activeId) alphas[activeId] = 1;
    return { activeId, alphas, promiseId: null };
  }
  if (!selection) return { activeId: null, alphas, promiseId: null };

  const dockedId = NE_MECHANISM_IDS.includes(selection.dockedId)
    ? selection.dockedId
    : null;
  const proximityId = NE_MECHANISM_IDS.includes(selection.proximityStationId)
    ? selection.proximityStationId
    : null;
  const activeId = dockedId || proximityId;
  if (activeId) alphas[activeId] = 1;

  const arrivalId = NE_MECHANISM_IDS.includes(selection.arrivalStationId)
    ? selection.arrivalStationId
    : null;
  const arrivalStrength = clamp(finite(selection.arrivalStrength), 0, 1);
  const promiseId = !dockedId && arrivalId && arrivalId !== activeId && arrivalStrength > 0.04
    ? arrivalId
    : null;
  if (promiseId) alphas[promiseId] = 0.24 * smoothstep01(arrivalStrength);

  return { activeId, alphas, promiseId };
}

function freezeProfile(profile) {
  for (const value of Object.values(profile)) {
    if (Array.isArray(value)) Object.freeze(value);
  }
  return Object.freeze(profile);
}

function stationCoordinates(id) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  return {
    centerXZ: [station.center.x, station.center.z],
    dockXZ: [station.dock.x, station.dock.z],
    farRadius: station.proximity.far,
  };
}

const fieldCoordinates = stationCoordinates("field-chamber-coils");
const fieldTangentLength = Math.hypot(
  fieldCoordinates.dockXZ[0] - fieldCoordinates.centerXZ[0],
  fieldCoordinates.dockXZ[1] - fieldCoordinates.centerXZ[1],
);

export const NE_MECHANISM_PROFILES = Object.freeze({
  "s2-kernel-core": freezeProfile({
    ...stationCoordinates("s2-kernel-core"),
    halo: STATION_PERSONALITY_PROFILES["s2-kernel-core"].halo,
    accent: STATION_PERSONALITY_PROFILES["s2-kernel-core"].halo.colors[0],
    angleDegrees: 38,
    dampingRatio: 0.74,
    lockHoldSeconds: 0.48,
    naturalFrequency: 6.2,
    proofMarks: [Math.PI / 2, -Math.PI / 2],
    proofToleranceDegrees: 2.5,
    releaseSeconds: 1.1,
    y: 0.7,
  }),
  "manifold-reactor": freezeProfile({
    ...stationCoordinates("manifold-reactor"),
    halo: STATION_PERSONALITY_PROFILES["manifold-reactor"].halo,
    accent: STATION_PERSONALITY_PROFILES["manifold-reactor"].halo.colors[0],
    angleDegrees: -27,
    beadCount: 7,
    persistHoldSeconds: 0.62,
    y: 0.62,
  }),
  "field-chamber-coils": freezeProfile({
    ...fieldCoordinates,
    halo: STATION_PERSONALITY_PROFILES["field-chamber-coils"].halo,
    accent: STATION_PERSONALITY_PROFILES["field-chamber-coils"].halo.colors[0],
    angleDegrees: 74,
    coilLimitDegrees: 2.5,
    currentTimeConstant: 0.18,
    packetCount: 4,
    resonanceHoldSeconds: 0.54,
    tangentXZ: [
      (fieldCoordinates.dockXZ[0] - fieldCoordinates.centerXZ[0]) / fieldTangentLength,
      (fieldCoordinates.dockXZ[1] - fieldCoordinates.centerXZ[1]) / fieldTangentLength,
    ],
    y: 0.64,
  }),
  "qpu-ice-bridge": freezeProfile({
    ...stationCoordinates("qpu-ice-bridge"),
    halo: STATION_PERSONALITY_PROFILES["qpu-ice-bridge"].halo,
    accent: STATION_PERSONALITY_PROFILES["qpu-ice-bridge"].halo.colors[0],
    angleDegrees: -48,
    coherenceThreshold: 0.82,
    manifoldSliceCount: QPU_MANIFOLD_SLICE_COUNT,
    verifySeconds: 0.7,
    y: 0.62,
  }),
});

export const AETHER_PHASE_BEADS = Object.freeze([
  Object.freeze([0.22, 0.01]),
  Object.freeze([0.15, 0.16]),
  Object.freeze([-0.035, 0.25]),
  Object.freeze([-0.215, 0.105]),
  Object.freeze([-0.185, -0.14]),
  Object.freeze([0.02, -0.255]),
  Object.freeze([0.205, -0.145]),
]);

export const AETHER_FILTRATION_EDGES = Object.freeze(
  AETHER_PHASE_BEADS.flatMap((first, firstIndex) =>
    AETHER_PHASE_BEADS.slice(firstIndex + 1).map((second, relativeIndex) => {
      const secondIndex = firstIndex + relativeIndex + 1;
      return Object.freeze({
        distance: Math.hypot(second[0] - first[0], second[1] - first[1]),
        first: firstIndex,
        persistent:
          secondIndex === firstIndex + 1 || (firstIndex === 0 && secondIndex === 6),
        second: secondIndex,
      });
    }),
  ),
);

const QPU_SOURCE_SEEDS = Object.freeze([0, 0.84, -1.17, 1.63]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function smoothstep01(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function wrapAngle(angle) {
  let wrapped = (angle + Math.PI) % (Math.PI * 2);
  if (wrapped < 0) wrapped += Math.PI * 2;
  return wrapped - Math.PI;
}

function setPhase(state, phase) {
  if (state.phase === phase) {
    state.phaseAge += FIXED_STEP_SECONDS;
    return;
  }
  state.phase = phase;
  state.phaseAge = 0;
}

function stepSpringAt(positions, velocities, index, target, omega, dampingRatio) {
  const position = positions[index];
  const velocity = velocities[index];
  const acceleration =
    omega * omega * (target - position) - 2 * dampingRatio * omega * velocity;
  const nextVelocity = velocity + acceleration * FIXED_STEP_SECONDS;
  const nextPosition = position + nextVelocity * FIXED_STEP_SECONDS;
  positions[index] = nextPosition;
  velocities[index] = nextVelocity;
}

function createInputBuffer() {
  return {
    arrivalStrength: 0,
    docked: false,
    positionX: 0,
    positionZ: 0,
    proximity: 0,
    routeProgress: 0,
    velocityX: 0,
    velocityZ: 0,
  };
}

function createRitual(haloColor) {
  return {
    breathingMultiplier: 1,
    bodyForwardShift: 0,
    haloAngularVelocity: 0,
    haloBounce: 0,
    haloBrightnessStep: 0,
    haloColor,
    haloEdgeColor: null,
    haloPulseHz: 0,
    haloTiltDegrees: 0,
    headDegrees: 0,
    leanDegrees: 0,
    lookBack: false,
    proofBitTracking: false,
  };
}

function createS2State() {
  return {
    angularMomentum: 0,
    brownianBlend: 0,
    brownianCoordinates: new Float32Array(6),
    brownianHarmonicSeeds: new Float32Array(S2_BROWNIAN_SEEDS),
    brownianRadius: S2_BROWNIAN_RADIUS,
    brownianTime: 0,
    brownianVelocities: new Float32Array(6),
    capExchange: false,
    evidenceReady: false,
    input: createInputBuffer(),
    lockHold: 0,
    phase: "DORMANT",
    phaseAge: 0,
    proofBitPhase: 0,
    proofErrors: new Float32Array(2),
    releaseAge: 0,
    ringAngles: new Float32Array(2),
    ringVelocities: new Float32Array(2),
    ritual: createRitual(NE_MECHANISM_PROFILES["s2-kernel-core"].halo.colors[0]),
    safeStatic: false,
    shellClosure: 0,
    stationId: "s2-kernel-core",
    targetAngularMomentum: 0,
  };
}

function createAetherState() {
  return {
    activeEdgeCount: 0,
    beadVisibility: new Float32Array(7),
    circulationPhase: 0,
    dockHold: 0,
    edgeVisibility: new Float32Array(21),
    evidenceReady: false,
    filtrationRadius: 0.08,
    input: createInputBuffer(),
    loopScales: new Float32Array([0.28, 0.44, 0.62]),
    phase: "QUIESCENT",
    phaseAge: 0,
    ritual: createRitual(NE_MECHANISM_PROFILES["manifold-reactor"].halo.colors[0]),
    safeStatic: false,
    sanctuaryBloom: 0,
    stationId: "manifold-reactor",
    visibleCycleCount: 0,
  };
}

function createFieldState() {
  return {
    coilTiltsDegrees: new Float32Array(2),
    compression: 0,
    current: 0,
    currentTarget: 0,
    evidenceReady: false,
    input: createInputBuffer(),
    packetLoopClosed: false,
    packetPhases: new Float32Array([0, 0.25, 0.5, 0.75]),
    peakCurrent: 0,
    phase: "DISCHARGED",
    phaseAge: 0,
    resonanceHold: 0,
    ritual: createRitual(NE_MECHANISM_PROFILES["field-chamber-coils"].halo.colors[0]),
    safeStatic: false,
    stationId: "field-chamber-coils",
    fluxSkin: 0,
  };
}

function createQpuState() {
  return {
    coherence: 0,
    evidenceReady: false,
    input: createInputBuffer(),
    manifoldBuild: 0,
    manifoldSliceBuild: new Float32Array(QPU_MANIFOLD_SLICE_COUNT),
    manifoldSliceVelocities: new Float32Array(QPU_MANIFOLD_SLICE_COUNT),
    phase: "DECOHERENT",
    phaseAge: 0,
    reweavePhase: 0,
    ritual: createRitual(NE_MECHANISM_PROFILES["qpu-ice-bridge"].halo.colors[0]),
    safeStatic: false,
    sanctumPulse: 0,
    sourcePhases: new Float32Array(QPU_SOURCE_SEEDS),
    stationId: "qpu-ice-bridge",
    verificationBeamProgress: 0,
    verificationSequence: 0,
    verificationStarted: false,
    verifyAge: 0,
  };
}

export function createNortheastMechanismSystem() {
  return {
    accumulator: 0,
    simulationTime: 0,
    states: {
      "s2-kernel-core": createS2State(),
      "manifold-reactor": createAetherState(),
      "field-chamber-coils": createFieldState(),
      "qpu-ice-bridge": createQpuState(),
    },
  };
}

function normalizeInput(input, target) {
  target.arrivalStrength = clamp(finite(input?.arrivalStrength), 0, 1);
  target.docked = Boolean(input?.docked);
  target.positionX = finite(input?.positionX);
  target.positionZ = finite(input?.positionZ);
  target.proximity = clamp(finite(input?.proximity), 0, 1);
  target.routeProgress = clamp(finite(input?.routeProgress, input?.proximity), 0, 1);
  target.velocityX = finite(input?.velocityX);
  target.velocityZ = finite(input?.velocityZ);
  return target;
}

function updateS2Ritual(state, proximity) {
  const active = state.phase === "ACQUIRE" || state.phase === "PRECESS";
  state.ritual.leanDegrees = active ? 4 * smoothstep01(proximity) : 0;
  state.ritual.headDegrees = 0;
  state.ritual.haloAngularVelocity =
    state.phase === "STATE_LOCK" ? 0 : state.ringVelocities[0] / 3;
  state.ritual.haloTiltDegrees = 0;
  state.ritual.haloPulseHz = 0;
  state.ritual.proofBitTracking = state.capExchange && state.phase !== "STATE_LOCK";
}

function stepS2BrownianManifold(state, proximity, reducedMotion) {
  if (reducedMotion) {
    state.brownianBlend = 0;
    state.brownianCoordinates.fill(0);
    state.brownianVelocities.fill(0);
    state.brownianTime = 0;
    return;
  }

  const activation = smoothstep01(proximity) * smoothstep01(0.25 + state.shellClosure * 0.75);
  state.brownianBlend = activation;
  state.brownianTime += FIXED_STEP_SECONDS;
  let magnitudeSquared = 0;
  for (let index = 0; index < state.brownianCoordinates.length; index += 1) {
    const position = state.brownianCoordinates[index];
    const velocity = state.brownianVelocities[index];
    const harmonic = Math.sin(
      state.brownianTime * S2_BROWNIAN_FREQUENCIES[index] * Math.PI * 2 +
        state.brownianHarmonicSeeds[index],
    );
    const acceleration =
      harmonic * 0.085 * activation - position * 3.6 - velocity * 2.7;
    const nextVelocity = clamp(
      velocity + acceleration * FIXED_STEP_SECONDS,
      -S2_BROWNIAN_RADIUS,
      S2_BROWNIAN_RADIUS,
    );
    const nextPosition = position + nextVelocity * FIXED_STEP_SECONDS;
    state.brownianVelocities[index] = nextVelocity;
    state.brownianCoordinates[index] = nextPosition;
    magnitudeSquared += nextPosition * nextPosition;
  }

  const magnitude = Math.sqrt(magnitudeSquared);
  if (magnitude > S2_BROWNIAN_RADIUS) {
    const projection = S2_BROWNIAN_RADIUS / magnitude;
    for (let index = 0; index < state.brownianCoordinates.length; index += 1) {
      state.brownianCoordinates[index] *= projection;
      state.brownianVelocities[index] *= projection;
    }
  }
  if (proximity <= 0.04 && state.phase === "DORMANT") {
    state.brownianBlend = 0;
    state.brownianCoordinates.fill(0);
    state.brownianVelocities.fill(0);
    state.brownianTime = 0;
  }
}

function stepS2(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = NE_MECHANISM_PROFILES[state.stationId];
  const radialX = input.positionX - profile.centerXZ[0];
  const radialZ = input.positionZ - profile.centerXZ[1];
  const crossMomentum =
    SEAL_MASS * (radialX * input.velocityZ - radialZ * input.velocityX);
  state.targetAngularMomentum = clamp(crossMomentum * input.proximity * 0.12, -1, 1);

  if (reducedMotion) {
    state.angularMomentum = 0;
    state.capExchange = input.proximity > 0.62;
    state.ringAngles[0] = input.docked ? profile.proofMarks[0] : 0.56;
    state.ringAngles[1] = input.docked ? profile.proofMarks[1] : -0.42;
    state.ringVelocities.fill(0);
    state.proofErrors.fill(0);
    state.evidenceReady = input.docked;
    state.shellClosure = input.docked ? 1 : input.proximity * 0.72;
    stepS2BrownianManifold(state, input.proximity, true);
    setPhase(state, input.docked ? "STATE_LOCK" : input.proximity > 0.05 ? "PRECESS" : "DORMANT");
    updateS2Ritual(state, input.proximity);
    return;
  }

  const departing = !input.docked && input.proximity <= 0.04;
  if (departing) {
    if (state.phase !== "DORMANT" && state.phase !== "RELEASE") {
      state.releaseAge = 0;
      setPhase(state, "RELEASE");
    }
    if (state.phase === "RELEASE") {
      state.releaseAge += FIXED_STEP_SECONDS;
      state.angularMomentum *= Math.exp(-FIXED_STEP_SECONDS / 0.2);
      if (state.releaseAge + STEP_EPSILON >= profile.releaseSeconds) {
        state.angularMomentum = 0;
        state.targetAngularMomentum = 0;
        state.capExchange = false;
        state.evidenceReady = false;
        state.lockHold = 0;
        state.releaseAge = 0;
        setPhase(state, "DORMANT");
      } else {
        setPhase(state, "RELEASE");
      }
    } else {
      setPhase(state, "DORMANT");
    }
  } else {
    state.releaseAge = 0;
    const momentumAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS * 7.5);
    state.angularMomentum +=
      (state.targetAngularMomentum - state.angularMomentum) * momentumAlpha;
    if (!input.docked) {
      state.lockHold = 0;
      state.evidenceReady = false;
      setPhase(state, input.proximity > 0.62 ? "PRECESS" : "ACQUIRE");
    }
  }

  const firstTarget = input.docked ? profile.proofMarks[0] : state.angularMomentum * 1.18;
  const secondTarget = input.docked ? profile.proofMarks[1] : -state.angularMomentum * 0.86;
  for (let index = 0; index < 2; index += 1) {
    stepSpringAt(
      state.ringAngles,
      state.ringVelocities,
      index,
      index === 0 ? firstTarget : secondTarget,
      profile.naturalFrequency,
      profile.dampingRatio,
    );
    state.ringAngles[index] = clamp(state.ringAngles[index], -Math.PI, Math.PI);
    state.ringVelocities[index] = clamp(state.ringVelocities[index], -7, 7);
    state.proofErrors[index] = wrapAngle(state.ringAngles[index] - profile.proofMarks[index]);
  }

  const proofTolerance = (profile.proofToleranceDegrees * Math.PI) / 180;
  if (
    input.docked &&
    Math.abs(state.proofErrors[0]) <= proofTolerance &&
    Math.abs(state.proofErrors[1]) <= proofTolerance
  ) {
    state.ringAngles[0] = profile.proofMarks[0];
    state.ringAngles[1] = profile.proofMarks[1];
    state.ringVelocities.fill(0);
    state.proofErrors.fill(0);
    state.lockHold += FIXED_STEP_SECONDS;
    setPhase(state, "STATE_LOCK");
    if (state.lockHold + STEP_EPSILON >= profile.lockHoldSeconds) {
      state.evidenceReady = true;
    }
  } else if (input.docked) {
    setPhase(state, "PRECESS");
  }

  state.capExchange = input.proximity > 0.62 && state.phase !== "RELEASE";
  if (state.capExchange) {
    state.proofBitPhase = wrapAngle(
      state.proofBitPhase + FIXED_STEP_SECONDS * (0.9 + Math.abs(state.angularMomentum) * 1.8),
    );
  }
  const shellClosureTarget = input.docked ? 1 : input.proximity * 0.78;
  const shellClosureAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS * 7.2);
  state.shellClosure += (shellClosureTarget - state.shellClosure) * shellClosureAlpha;
  state.shellClosure = clamp(state.shellClosure, 0, 1);
  stepS2BrownianManifold(state, input.proximity, false);
  updateS2Ritual(state, input.proximity);
}

function updateAetherRitual(state, proximity) {
  state.ritual.headDegrees = proximity > 0.16 ? -5 : -5 * smoothstep01(proximity / 0.16);
  state.ritual.haloTiltDegrees = 18 * smoothstep01(proximity);
  state.ritual.haloPulseHz = 0.16;
  state.ritual.proofBitTracking = state.phase === "GROW_LOOPS";
}

function stepAether(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = NE_MECHANISM_PROFILES[state.stationId];
  state.filtrationRadius = 0.08 + 0.48 * input.proximity;

  if (reducedMotion) {
    state.beadVisibility.fill(input.proximity > 0.02 ? 1 : 0.35);
    state.edgeVisibility.fill(0);
    for (let index = 0; index < AETHER_FILTRATION_EDGES.length; index += 1) {
      if (AETHER_FILTRATION_EDGES[index].persistent) state.edgeVisibility[index] = 1;
    }
    state.activeEdgeCount = 7;
    state.visibleCycleCount = input.docked ? 1 : 0;
    state.evidenceReady = input.docked;
    state.circulationPhase = input.docked ? Math.PI * 0.18 : 0;
    state.sanctuaryBloom = input.docked ? 1 : input.proximity;
    setPhase(state, input.docked ? "PERSIST" : input.proximity > 0.05 ? "GROW_LOOPS" : "QUIESCENT");
    updateAetherRitual(state, input.proximity);
    return;
  }

  const collapsing = !input.docked && input.proximity <= 0.04 && state.phase !== "QUIESCENT";
  if (collapsing) {
    setPhase(state, "COLLAPSE");
    state.dockHold = 0;
    state.visibleCycleCount = 0;
    state.evidenceReady = false;
  } else if (input.docked) {
    state.dockHold += FIXED_STEP_SECONDS;
    if (state.dockHold + STEP_EPSILON >= profile.persistHoldSeconds) {
      setPhase(state, "PERSIST");
      state.visibleCycleCount = 1;
      state.evidenceReady = true;
    } else {
      setPhase(state, "GROW_LOOPS");
    }
  } else if (input.proximity > 0.24) {
    state.dockHold = 0;
    state.visibleCycleCount = 0;
    state.evidenceReady = false;
    setPhase(state, "GROW_LOOPS");
  } else if (input.proximity > 0.06) {
    setPhase(state, "SEED");
  } else if (state.phase !== "COLLAPSE") {
    setPhase(state, "QUIESCENT");
  }

  const visibilityAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS * 8.5);
  for (let index = 0; index < state.beadVisibility.length; index += 1) {
    const threshold = 0.03 + index * 0.024;
    const target = smoothstep01((input.proximity - threshold) / 0.18);
    state.beadVisibility[index] += (target - state.beadVisibility[index]) * visibilityAlpha;
  }

  state.activeEdgeCount = 0;
  for (let index = 0; index < AETHER_FILTRATION_EDGES.length; index += 1) {
    const edge = AETHER_FILTRATION_EDGES[index];
    const inFiltration = edge.distance <= state.filtrationRadius + STEP_EPSILON;
    if (inFiltration) state.activeEdgeCount += 1;
    let target = inFiltration ? 1 : 0;
    if (state.phase === "PERSIST") target = edge.persistent ? 1 : 0;
    if (state.phase === "COLLAPSE") target = 0;
    state.edgeVisibility[index] += (target - state.edgeVisibility[index]) * visibilityAlpha;
  }

  let edgesCollapsed = true;
  for (let index = 0; index < state.edgeVisibility.length; index += 1) {
    if (state.edgeVisibility[index] >= 0.02) {
      edgesCollapsed = false;
      break;
    }
  }
  if (state.phase === "COLLAPSE" && state.phaseAge > 0.5 && edgesCollapsed) {
    setPhase(state, "QUIESCENT");
  }

  for (let index = 0; index < state.loopScales.length; index += 1) {
    const base = 0.3 + index * 0.17;
    const persistence = state.phase === "PERSIST" && index === 1 ? 0.12 : 0;
    state.loopScales[index] = base + input.proximity * 0.09 + persistence;
  }
  state.circulationPhase = wrapAngle(
    state.circulationPhase +
      FIXED_STEP_SECONDS * (0.16 + input.proximity * 0.48) *
        (state.phase === "COLLAPSE" ? 0.35 : 1),
  );
  const bloomTarget = state.phase === "PERSIST" ? 1 : input.proximity;
  state.sanctuaryBloom +=
    (bloomTarget - state.sanctuaryBloom) *
    (1 - Math.exp(-FIXED_STEP_SECONDS * 5.4));
  state.sanctuaryBloom = clamp(state.sanctuaryBloom, 0, 1);
  updateAetherRitual(state, input.proximity);
}

function updateFieldRitual(state, proximity) {
  state.ritual.leanDegrees = clamp(state.current * 4.5, -4.5, 4.5) * smoothstep01(proximity);
  state.ritual.haloBounce = state.phase === "RESONATE" ? 0.06 : 0;
  state.ritual.haloTiltDegrees = 90;
  state.ritual.haloPulseHz = 0;
}

function stepField(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = NE_MECHANISM_PROFILES[state.stationId];
  const projectedVelocity =
    input.velocityX * profile.tangentXZ[0] + input.velocityZ * profile.tangentXZ[1];
  const inducedTarget = clamp(projectedVelocity * input.proximity * 0.24, -1, 1);
  const rememberedSign = Math.sign(state.peakCurrent || state.current || inducedTarget || 1);
  const arrivalCurrent = rememberedSign * (0.18 + input.arrivalStrength * 0.74);
  state.currentTarget = input.docked
    ? rememberedSign * Math.max(
        Math.abs(inducedTarget),
        Math.abs(state.peakCurrent),
        Math.abs(arrivalCurrent),
      )
    : inducedTarget;

  if (reducedMotion) {
    state.current = input.docked ? 0.82 : input.proximity * 0.72;
    state.currentTarget = state.current;
    state.coilTiltsDegrees[0] = profile.coilLimitDegrees * state.current;
    state.coilTiltsDegrees[1] = -state.coilTiltsDegrees[0];
    state.packetLoopClosed = input.docked;
    state.evidenceReady = input.docked;
    state.compression = Math.abs(state.current);
    state.fluxSkin = input.docked ? 1 : input.proximity * 0.72;
    setPhase(state, input.docked ? "RESONATE" : input.proximity > 0.05 ? "POLARIZE" : "DISCHARGED");
    updateFieldRitual(state, input.proximity);
    return;
  }

  const currentAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS / profile.currentTimeConstant);
  state.current += (state.currentTarget - state.current) * currentAlpha;
  state.current = clamp(state.current, -1, 1);
  if (Math.abs(state.current) > Math.abs(state.peakCurrent)) state.peakCurrent = state.current;

  const targetTilt = profile.coilLimitDegrees * state.current;
  state.coilTiltsDegrees[0] += (targetTilt - state.coilTiltsDegrees[0]) * currentAlpha;
  state.coilTiltsDegrees[1] = -state.coilTiltsDegrees[0];
  const packetSpeed = 0.08 + Math.abs(state.current) * 0.54;
  const packetDirection = Math.sign(state.current || 1);
  for (let index = 0; index < state.packetPhases.length; index += 1) {
    let phase = state.packetPhases[index] + packetDirection * packetSpeed * FIXED_STEP_SECONDS;
    phase %= 1;
    if (phase < 0) phase += 1;
    state.packetPhases[index] = phase;
  }

  if (!input.docked && input.proximity <= 0.04 && state.phase !== "DISCHARGED") {
    state.resonanceHold = 0;
    state.packetLoopClosed = false;
    state.evidenceReady = false;
    setPhase(state, "DECAY");
    if (Math.abs(state.current) < 0.018 && state.phaseAge > 0.35) {
      state.current = 0;
      state.peakCurrent = 0;
      setPhase(state, "DISCHARGED");
    }
  } else if (input.docked && Math.abs(state.current) > 0.72) {
    state.resonanceHold += FIXED_STEP_SECONDS;
    if (state.resonanceHold + STEP_EPSILON >= profile.resonanceHoldSeconds) {
      setPhase(state, "RESONATE");
      state.packetLoopClosed = true;
      state.evidenceReady = true;
    } else {
      setPhase(state, "POLARIZE");
    }
  } else if (input.proximity > 0.42) {
    state.resonanceHold = 0;
    state.packetLoopClosed = false;
    state.evidenceReady = false;
    setPhase(state, "POLARIZE");
  } else if (input.proximity > 0.06) {
    setPhase(state, "INDUCE");
  } else if (state.phase !== "DECAY") {
    setPhase(state, "DISCHARGED");
  }
  const compressionTarget = Math.abs(state.current);
  state.compression +=
    (compressionTarget - state.compression) *
    (1 - Math.exp(-FIXED_STEP_SECONDS * 8));
  state.compression = clamp(state.compression, 0, 1);
  const fluxSkinTarget = state.packetLoopClosed
    ? 1
    : Math.max(input.proximity * 0.36, state.compression * 0.72);
  state.fluxSkin +=
    (fluxSkinTarget - state.fluxSkin) *
    (1 - Math.exp(-FIXED_STEP_SECONDS * 6));
  state.fluxSkin = clamp(state.fluxSkin, 0, 1);
  updateFieldRitual(state, input.proximity);
}

function qpuCoherence(sourcePhases) {
  let real = 0;
  let imaginary = 0;
  for (const phase of sourcePhases) {
    real += Math.cos(phase);
    imaginary += Math.sin(phase);
  }
  return Math.hypot(real, imaginary) / sourcePhases.length;
}

function updateQpuRitual(state, proximity) {
  const profile = NE_MECHANISM_PROFILES[state.stationId];
  state.ritual.bodyForwardShift =
    state.phase === "SPAN" || state.phase === "VERIFY" ? 0.04 : 0;
  state.ritual.haloBrightnessStep = Math.min(4, Math.floor(proximity * 4 + STEP_EPSILON));
  state.ritual.haloEdgeColor = profile.halo.colors[1];
  state.ritual.lookBack = state.evidenceReady;
}

function stepQpu(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = NE_MECHANISM_PROFILES[state.stationId];

  if (reducedMotion) {
    state.manifoldBuild = 1;
    state.manifoldSliceBuild.fill(1);
    state.manifoldSliceVelocities.fill(0);
    state.reweavePhase = 0;
    state.sourcePhases.fill(0);
    state.coherence = 1;
    state.verificationBeamProgress = input.docked ? 1 : 0;
    state.evidenceReady = input.docked;
    state.sanctumPulse = input.docked ? 1 : input.proximity * 0.5;
    if (input.docked && !state.verificationStarted) {
      state.verificationStarted = true;
      state.verificationSequence += 1;
    }
    setPhase(state, input.docked ? "VERIFY" : input.proximity > 0.05 ? "SPAN" : "DECOHERENT");
    updateQpuRitual(state, input.proximity);
    return;
  }

  const alignment = smoothstep01(input.proximity);
  const phaseAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS * 6.4);
  for (let index = 0; index < state.sourcePhases.length; index += 1) {
    const target = QPU_SOURCE_SEEDS[index] * (1 - alignment);
    state.sourcePhases[index] += (target - state.sourcePhases[index]) * phaseAlpha;
  }
  state.coherence = qpuCoherence(state.sourcePhases);

  const manifoldTarget = input.docked ? 1 : input.routeProgress;
  state.manifoldBuild +=
    (manifoldTarget - state.manifoldBuild) * (1 - Math.exp(-FIXED_STEP_SECONDS * 8.6));
  state.manifoldBuild = clamp(state.manifoldBuild, 0, 1);
  const lastSlice = state.manifoldSliceBuild.length - 1;
  const halfSliceCount = lastSlice * 0.5;
  for (let index = 0; index < state.manifoldSliceBuild.length; index += 1) {
    const centerDistance = Math.min(index, lastSlice - index) / halfSliceCount;
    const target = smoothstep01((state.manifoldBuild - centerDistance + 0.18) / 0.18);
    stepSpringAt(
      state.manifoldSliceBuild,
      state.manifoldSliceVelocities,
      index,
      target,
      9.2,
      1,
    );
    state.manifoldSliceBuild[index] = clamp(state.manifoldSliceBuild[index], 0, 1);
    state.manifoldSliceVelocities[index] = clamp(
      state.manifoldSliceVelocities[index],
      -5,
      5,
    );
  }
  state.reweavePhase = state.manifoldBuild > 0.985
    ? wrapAngle(state.reweavePhase + FIXED_STEP_SECONDS * 0.42)
    : 0;

  let continuousSpan = true;
  for (let index = 0; index < state.manifoldSliceBuild.length; index += 1) {
    if (state.manifoldSliceBuild[index] < 0.94) {
      continuousSpan = false;
      break;
    }
  }
  const departing = !input.docked && input.proximity <= 0.04;
  if (departing && state.phase !== "DECOHERENT") {
    setPhase(state, "RELAX");
    state.evidenceReady = false;
    if (state.phaseAge > 0.7 && state.manifoldBuild < 0.03) {
      state.verificationBeamProgress = 0;
      state.verificationStarted = false;
      state.verifyAge = 0;
      setPhase(state, "DECOHERENT");
    }
  } else if (
    input.docked &&
    continuousSpan &&
    state.coherence >= profile.coherenceThreshold
  ) {
    if (!state.verificationStarted) {
      state.verificationStarted = true;
      state.verificationSequence += 1;
      state.verificationBeamProgress = 0;
      state.verifyAge = 0;
    }
    setPhase(state, "VERIFY");
    state.verifyAge = Math.min(profile.verifySeconds, state.verifyAge + FIXED_STEP_SECONDS);
    state.verificationBeamProgress = clamp(state.verifyAge / profile.verifySeconds, 0, 1);
    if (state.verificationBeamProgress >= 1) state.evidenceReady = true;
  } else if (continuousSpan && state.coherence > 0.72) {
    setPhase(state, "SPAN");
  } else if (input.proximity > 0.34) {
    setPhase(state, "ENTANGLE");
  } else if (input.proximity > 0.06) {
    setPhase(state, "SAMPLE");
  } else if (state.phase !== "RELAX") {
    setPhase(state, "DECOHERENT");
  }
  const sanctumTarget = Math.max(
    input.proximity * 0.42,
    state.coherence * 0.38,
    state.verificationBeamProgress,
  );
  state.sanctumPulse +=
    (sanctumTarget - state.sanctumPulse) *
    (1 - Math.exp(-FIXED_STEP_SECONDS * 6.8));
  state.sanctumPulse = clamp(state.sanctumPulse, 0, 1);
  updateQpuRitual(state, input.proximity);
}

function applySafeState(state) {
  state.safeStatic = true;
  state.evidenceReady = true;
  if (state.stationId === "s2-kernel-core") {
    state.ringAngles[0] = NE_MECHANISM_PROFILES[state.stationId].proofMarks[0];
    state.ringAngles[1] = NE_MECHANISM_PROFILES[state.stationId].proofMarks[1];
    state.ringVelocities.fill(0);
    state.proofErrors.fill(0);
    state.capExchange = true;
    state.shellClosure = 1;
    setPhase(state, "STATE_LOCK");
  } else if (state.stationId === "manifold-reactor") {
    state.beadVisibility.fill(1);
    state.edgeVisibility.fill(0);
    for (let index = 0; index < AETHER_FILTRATION_EDGES.length; index += 1) {
      if (AETHER_FILTRATION_EDGES[index].persistent) state.edgeVisibility[index] = 1;
    }
    state.visibleCycleCount = 1;
    state.circulationPhase = Math.PI * 0.18;
    state.sanctuaryBloom = 1;
    setPhase(state, "PERSIST");
  } else if (state.stationId === "field-chamber-coils") {
    state.current = 0.82;
    state.coilTiltsDegrees[0] = 2.05;
    state.coilTiltsDegrees[1] = -2.05;
    state.packetLoopClosed = true;
    state.compression = 0.82;
    state.fluxSkin = 1;
    setPhase(state, "RESONATE");
  } else {
    state.manifoldBuild = 1;
    state.manifoldSliceBuild.fill(1);
    state.manifoldSliceVelocities.fill(0);
    state.reweavePhase = 0;
    state.sourcePhases.fill(0);
    state.coherence = 1;
    state.verificationBeamProgress = 1;
    state.sanctumPulse = 1;
    setPhase(state, "VERIFY");
  }
}

function stepSystem(system, inputsByStation, reducedMotion, safeMode) {
  if (safeMode) {
    for (const id of NE_MECHANISM_IDS) applySafeState(system.states[id]);
    return;
  }
  for (const id of NE_MECHANISM_IDS) system.states[id].safeStatic = false;
  stepS2(system.states["s2-kernel-core"], inputsByStation?.["s2-kernel-core"], reducedMotion);
  stepAether(
    system.states["manifold-reactor"],
    inputsByStation?.["manifold-reactor"],
    reducedMotion,
  );
  stepField(
    system.states["field-chamber-coils"],
    inputsByStation?.["field-chamber-coils"],
    reducedMotion,
  );
  stepQpu(
    system.states["qpu-ice-bridge"],
    inputsByStation?.["qpu-ice-bridge"],
    reducedMotion,
  );
}

export function advanceNortheastMechanisms(
  system,
  inputsByStation,
  deltaSeconds,
  { reducedMotion = false, safeMode = false } = {},
) {
  if (!system?.states) return system;
  const acceptedDelta = Math.min(MAX_FRAME_SECONDS, Math.max(0, finite(deltaSeconds)));
  const maximumAccumulation = FIXED_STEP_SECONDS * MAX_SUBSTEPS;
  system.accumulator = Math.min(system.accumulator + acceptedDelta, maximumAccumulation);
  let steps = Math.min(
    MAX_SUBSTEPS,
    Math.floor((system.accumulator + STEP_EPSILON) / FIXED_STEP_SECONDS),
  );
  while (steps > 0) {
    stepSystem(system, inputsByStation, reducedMotion, safeMode);
    system.accumulator -= FIXED_STEP_SECONDS;
    system.simulationTime += FIXED_STEP_SECONDS;
    steps -= 1;
  }
  if (system.accumulator < STEP_EPSILON) system.accumulator = 0;
  return system;
}

export function resolveNortheastMechanismInputs(traversalPose, target = {}) {
  const pose = traversalPose || {};
  for (const id of NE_MECHANISM_IDS) {
    const profile = NE_MECHANISM_PROFILES[id];
    const input = target[id] || (target[id] = {});
    const positionX = finite(pose.x);
    const positionZ = finite(pose.z);
    const distance = Math.hypot(
      positionX - profile.dockXZ[0],
      positionZ - profile.dockXZ[1],
    );
    const proximity = smoothstep01(1 - distance / profile.farRadius);
    input.arrivalStrength = pose.arrivalStationId === id ? clamp(finite(pose.arrivalStrength), 0, 1) : 0;
    input.docked = pose.dockedId === id;
    input.positionX = positionX;
    input.positionZ = positionZ;
    input.proximity = pose.proximityStationId === id
      ? Math.max(proximity, clamp(finite(pose.stationProximity), 0, 1))
      : proximity;
    input.routeProgress = input.proximity;
    input.velocityX = finite(pose.vx);
    input.velocityZ = finite(pose.vz);
  }
  return target;
}
