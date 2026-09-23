import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import { STATION_PERSONALITY_PROFILES } from "./polar-station-personality.js";

const FIXED_STEP_SECONDS = 1 / 120;
const MAX_SUBSTEPS = 12;
const MAX_FRAME_SECONDS = 0.1;
const STEP_EPSILON = 1e-10;
const SCAN_INTENSITY_ALPHA = 1 - Math.exp(-7 * FIXED_STEP_SECONDS);
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TWO_PI = Math.PI * 2;
const TOPOLOGY_BAR_COUNT = 20;

export const SW_MECHANISM_IDS = Object.freeze([
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/**
 * One camp, one contractor. Every southwest station is a building at the same
 * Antarctic research base, so structure steel, safety trim, interior amber and
 * snow are authored once here instead of per station. Station identity lives
 * only in cladding hue and the signature mechanism.
 *
 * The values sit on a deliberate three-zone luma ladder so no station can
 * collapse into a single wash again:
 *   structure  ~0.12-0.19  (graphite steel frame, recessed grooves)
 *   cladding   ~0.42-0.46  (desaturated GRP panels)
 *   hardware   ~0.75-0.90  (rails, rivets, glass, drift snow)
 * Adjacent surfaces therefore keep >= 0.2 luma of separation by construction.
 */
export const SW_BASE_LANGUAGE = Object.freeze({
  structureSteel: "#2A3140",
  structureShadow: "#1B2029",
  cladding: "#6E6A7A",
  claddingAlt: "#767384",
  seamShadow: "#3A3746",
  hardware: "#C9CEDA",
  safetyTrim: "#E8705E",
  emberWindow: "#F2B96B",
  snow: "#DCE6F2",
});

export const SW_MECHANISM_VISUAL_CONTRACTS = deepFreeze({
  "upstream-radio-mast": {
    functions: ["bearing dish", "source packet", "signal rings"],
    // The diagonal web is named first because it is what makes this outline
    // nameable. Belts and legs alone read as a ladder; the zigzag bracing
    // between the legs is the feature a broadcast mast is recognised by, and
    // the dish is explicitly NOT the crown — a mast has to end in a point.
    silhouette: "slender aviation-banded lattice broadcast mast, diagonal-braced web between four tapered legs, tapering to a whip and a blinking warm tip beacon, with a face-on coral/mint radar dish carried at working height on a side pivot, antenna farm, guy-line stays, and a climbing run of keystream telemetry lamps up the dock-facing legs",
    material: "alternating coral and warm-ivory aviation paint bands over graphite base steel, warm white dish hardware, mint waveguide beacons, descending mint signal packets, and mint telemetry lamps whose blink pattern is a 32-bit maximal-length LFSR keystream seeded by SHA-256 of the relayed upstream repositories",
    colorScope: "station-local materials only",
    contact: "three broad snow footings tied into one low harbor plinth",
    highPoly: ["thick lathed dish", "beveled structural members", "layered bearing cradle"],
  },
  "topology-archive-wall": {
    functions: ["archive wall", "persistent trace", "category reconfiguration"],
    silhouette: "long insulated ice-core cold store on a skid platform — seamed panel walls, an open bay showing four tiers of racked core tubes, a core-logging rig travelling the rack line, and a gable end laid in converging SHA-256 Merkle courses that rise to a single capstone",
    material: "desaturated grey-mauve insulated panels with real seams over graphite steel racks, pale ice core tubes, a magenta logger scan line on the rack index labels, warm amber bench worklight, drift snow, and SHA-256 Merkle courses over the archived corpus whose block value, depth and rise are digest bytes — root capstone is the archive address",
    colorScope: "station-local materials only",
    contact: "a continuous plinth deck on steel skid footings seats the cold store into the drift",
    highPoly: ["beveled seamed panels", "layered tier rails", "lathed core tube bores"],
  },
  "assembly-tool-locker": {
    functions: ["gantry", "inspection backplane", "proof/tool mass"],
    silhouette: "graphite machine shop with the dock side open — workbenches, a hung tool wall of merged upstream relics, a welding bay, roof trusses and an overhead hoist rail over the deck",
    material: "graphite steel frame over desaturated seamed panel cladding, violet accent seams and indicator lights, coral safety trim, warm amber worklight and an intermittent welding arc, brass and steel relic tooling",
    colorScope: "station-local materials only",
    contact: "two snow skids and four load footings carry the shop deck and the hoist rail mass",
    highPoly: ["segmented curved roof trusses", "beveled seamed plates", "layered relic tooling"],
  },
});

export const SW_MECHANISM_PHASES = Object.freeze({
  "upstream-radio-mast": Object.freeze([
    "LISTEN",
    "FIND_BEARING",
    "SYNC",
    "RECEIVE",
    "QUIET",
  ]),
  "topology-archive-wall": Object.freeze([
    "INDEX",
    "TRACE",
    "LIFT_STRATA",
    "OPEN_ARCHIVE",
    "REFILE",
  ]),
  "assembly-tool-locker": Object.freeze([
    "STOWED",
    "INDEX_PARTS",
    "ASSEMBLE",
    "PROVE",
    "RESET",
  ]),
});

export const SW_ASSEMBLY_PART_TYPES = Object.freeze([
  "avx512",
  "paging",
  "no_std",
  "stencil_simd",
]);

export const SW_MECHANISM_BUDGET = Object.freeze({
  high: Object.freeze({ drawCalls: 9, programs: 3, textures: 0 }),
  medium: Object.freeze({ drawCalls: 9, programs: 3, textures: 0 }),
  low: Object.freeze({ drawCalls: 4, programs: 1, textures: 0 }),
  safe: Object.freeze({ drawCalls: 0, programs: 0, textures: 0 }),
});

export const SW_MECHANISM_SCALE_CONTRACTS = deepFreeze({
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

export const SW_MECHANISM_INTEGRATION = Object.freeze({
  fixedStepHz: 120,
  inputAuthority: "canonical traversal XZ plus source refs",
  outputAuthority: "ritual and evidence readiness only",
  evidenceTiming: "after physical dock proof",
  pointerRole: "optional bounded inspection",
});

function stationCoordinates(id) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  return {
    centerXZ: [station.center.x, station.center.z],
    dockXZ: [station.dock.x, station.dock.z],
    farRadius: station.proximity.far,
  };
}

export const ASSEMBLY_WORKSHOP_GEOMETRY = deepFreeze({
  backplaneLocalZ: 0.54,
  localOpenFaceXZ: [0, -1],
  ribPlanesLocalZ: [-0.62, 0.62],
});

export function deriveAssemblyVisitorYaw(
  centerXZ,
  dockXZ,
  localOpenFaceXZ = ASSEMBLY_WORKSHOP_GEOMETRY.localOpenFaceXZ,
) {
  const dockX = finite(dockXZ?.[0]) - finite(centerXZ?.[0]);
  const dockZ = finite(dockXZ?.[1]) - finite(centerXZ?.[1]);
  const localX = finite(localOpenFaceXZ?.[0]);
  const localZ = finite(localOpenFaceXZ?.[1], -1);
  if (Math.hypot(dockX, dockZ) <= STEP_EPSILON) return 0;
  return wrapAngle(Math.atan2(dockX, dockZ) - Math.atan2(localX, localZ));
}

function freezeProfile(profile) {
  return deepFreeze(profile);
}

const assemblyCoordinates = stationCoordinates("assembly-tool-locker");
const assemblyVisitorYaw = deriveAssemblyVisitorYaw(
  assemblyCoordinates.centerXZ,
  assemblyCoordinates.dockXZ,
);

export const SW_MECHANISM_PROFILES = Object.freeze({
  "upstream-radio-mast": freezeProfile({
    ...stationCoordinates("upstream-radio-mast"),
    halo: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].halo,
    accent: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].halo.colors[0],
    angleDegrees: 19,
    bearingToleranceDegrees: 3,
    dampingRatio: 0.86,
    homeBearingDegrees: 19,
    naturalFrequency: 5.4,
    scanAmplitudeDegrees: 7,
    scanFrequencyHz: 0.08,
    palette: {
      surface: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].palette.signature[2],
      bearing: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].palette.ink,
      signal: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].lighting.fill,
      shadow: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].palette.world.shadow,
      trim: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].palette.secondary,
      packet: STATION_PERSONALITY_PROFILES["upstream-radio-mast"].palette.glow,
    },
    receiveHoldSeconds: 0.34,
    quietSeconds: 0.6,
    ringCount: 3,
    beaconPeriodSeconds: 2,
    reducedMotionBeaconIntensity: 0.7,
    tipBeacon: "warm-white-coral-aviation-blink",
    dishOrientation: "face-on-camera",
    waveRingMode: "concentric-amplitude",
    directionalPacketCount: 1,
    y: 0.12,
  }),
  "topology-archive-wall": freezeProfile({
    ...stationCoordinates("topology-archive-wall"),
    halo: STATION_PERSONALITY_PROFILES["topology-archive-wall"].halo,
    accent: STATION_PERSONALITY_PROFILES["topology-archive-wall"].halo.colors[0],
    angleDegrees: 61,
    apertureDistance: 0.22,
    launchApertureDistance: 0.34,
    barCount: TOPOLOGY_BAR_COUNT,
    extrusionRange: [0.04, 0.16],
    liftThreshold: 0.62,
    refileStaggerSeconds: 0.045,
    countdownSeconds: 3,
    ignitionMotion: "countdown-then-ignition",
    scanDockedHz: 0.3,
    scanRestPhase: 0.5,
    scanSweepHz: 0.09,
    palette: {
      surface: STATION_PERSONALITY_PROFILES["topology-archive-wall"].palette.accent,
      layer: STATION_PERSONALITY_PROFILES["topology-archive-wall"].palette.surface,
      trace: STATION_PERSONALITY_PROFILES["topology-archive-wall"].halo.colors[1],
      shadow: STATION_PERSONALITY_PROFILES["topology-archive-wall"].palette.ink,
      glow: STATION_PERSONALITY_PROFILES["topology-archive-wall"].palette.glow,
    },
    y: 0.08,
  }),
  "assembly-tool-locker": freezeProfile({
    ...assemblyCoordinates,
    halo: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].halo,
    accent: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].halo.colors[0],
    angleDegrees: assemblyVisitorYaw * RAD_TO_DEG,
    angleRadians: assemblyVisitorYaw,
    workshopGeometry: ASSEMBLY_WORKSHOP_GEOMETRY,
    dampingRatio: 0.88,
    naturalFrequency: 7,
    orientationToleranceDegrees: 1.5,
    palette: {
      surface: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].palette.surface,
      steel: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].palette.accent,
      proof: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].palette.glow,
      shadow: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].palette.world.shadow,
      highlight: STATION_PERSONALITY_PROFILES["assembly-tool-locker"].lighting.key,
    },
    partCount: 4,
    assemblyBuildSeconds: 4.2,
    assemblyHoldUntilSeconds: 7,
    assemblyCycleSeconds: 9.4,
    railCount: 2,
    edgeLighting: "amber-worklight-and-welding-arc",
    proofHoldSeconds: 0.24,
    resetStaggerSeconds: 0.22,
    translationTolerance: 0.025,
    y: 0.08,
  }),
});

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

export function resolveSouthwestStationReveal(selection, exclusiveStationId = null) {
  const alphas = Object.fromEntries(SW_MECHANISM_IDS.map((id) => [id, 0]));
  if (exclusiveStationId) {
    const activeId = SW_MECHANISM_IDS.includes(exclusiveStationId)
      ? exclusiveStationId
      : null;
    if (activeId) alphas[activeId] = 1;
    return { activeId, alphas, promiseId: null };
  }
  if (!selection) return { activeId: null, alphas, promiseId: null };

  const dockedId = SW_MECHANISM_IDS.includes(selection.dockedId)
    ? selection.dockedId
    : null;
  const proximityId = SW_MECHANISM_IDS.includes(selection.proximityStationId)
    ? selection.proximityStationId
    : null;
  const activeId = dockedId || proximityId;
  if (activeId) alphas[activeId] = 1;

  const arrivalId = SW_MECHANISM_IDS.includes(selection.arrivalStationId)
    ? selection.arrivalStationId
    : null;
  const arrivalStrength = clamp(finite(selection.arrivalStrength), 0, 1);
  const promiseId = !dockedId && arrivalId && arrivalId !== activeId && arrivalStrength > 0.04
    ? arrivalId
    : null;
  if (promiseId) alphas[promiseId] = 0.24 * smoothstep01(arrivalStrength);

  return { activeId, alphas, promiseId };
}

function wrapAngle(angle) {
  let wrapped = (angle + Math.PI) % TWO_PI;
  if (wrapped < 0) wrapped += TWO_PI;
  return wrapped - Math.PI;
}

function wrapDegrees(degrees) {
  let wrapped = (degrees + 180) % 360;
  if (wrapped < 0) wrapped += 360;
  return wrapped - 180;
}

function setPhase(state, phase) {
  if (state.phase === phase) {
    state.phaseAge += FIXED_STEP_SECONDS;
  } else {
    state.phase = phase;
    state.phaseAge = 0;
  }
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return hashString(value) / 4294967295;
}

function liveSignalEvent(summary) {
  if (summary?.sourceMode !== "live-github") return null;
  if (!summary?.profile?.login) return null;
  const event = Array.isArray(summary.latest) ? summary.latest[0] : null;
  return event?.repo ? event : null;
}

function signalSignature(summary) {
  const event = liveSignalEvent(summary);
  if (!event) return "research-snapshot|teerthsharma|home";
  return [
    "live-github",
    summary.profile.login,
    event.repo,
    event.label || "activity",
  ].join("|");
}

/** A timestamp-independent bearing. Fallback data always points home and never claims live. */
export function deriveStableSignalBearing(summary) {
  const event = liveSignalEvent(summary);
  if (!event) return SW_MECHANISM_PROFILES["upstream-radio-mast"].homeBearingDegrees;
  const hash = hashString(signalSignature(summary));
  return wrapDegrees((hash / 4294967296) * 360 - 180);
}

function buildSignalPacket(summary) {
  const event = liveSignalEvent(summary);
  if (event) {
    return Object.freeze({
      eventLabel: event.label || "GitHub activity",
      eventTitle: event.title || "Public event",
      eventUrl: event.url || `https://github.com/${event.repo}`,
      profileLogin: summary.profile.login,
      profileName: summary.profile.name || summary.profile.login,
      profileUrl: summary.profile.html_url || `https://github.com/${summary.profile.login}`,
      repository: event.repo,
      sourceMode: "live-github",
    });
  }
  const snapshot = Array.isArray(summary?.latest) ? summary.latest[0] : null;
  return Object.freeze({
    eventLabel: snapshot?.label || "Source snapshot",
    eventTitle: snapshot?.title || "Research snapshot",
    eventUrl: snapshot?.url || "https://github.com/teerthsharma",
    profileLogin: summary?.profile?.login || "teerthsharma",
    profileName: summary?.profile?.name || null,
    profileUrl: summary?.profile?.html_url || "https://github.com/teerthsharma",
    repository: snapshot?.repo || null,
    sourceMode: "research-snapshot",
  });
}

function canonicalSource(source) {
  return [
    source?.category || "uncategorized",
    source?.name || source?.id || "source",
    source?.sourceUrl || source?.url || "",
  ].join("|");
}

/**
 * Physical archetypes for the toolkit chamber relic bench. Each merged
 * upstream contribution becomes one recognizable tool object, so the repo it
 * landed in is readable from silhouette alone.
 */
export const SW_ASSEMBLY_RELIC_FORMS = Object.freeze([
  "kernel-block-stack",
  "flame-profile",
  "relay-ring",
  "probe-fan",
]);
export const SW_ASSEMBLY_RELIC_CAPACITY = 4;

function relicForm(repo, label) {
  const name = String(repo || "").toLowerCase();
  if (/issue/i.test(String(label || "")) && name.includes("triton")) return "probe-fan";
  if (name.includes("triton")) return "kernel-block-stack";
  if (name.includes("torch")) return "flame-profile";
  if (name.includes("relay") || name.includes("nemo")) return "relay-ring";
  return SW_ASSEMBLY_RELIC_FORMS[hashString(name) % SW_ASSEMBLY_RELIC_FORMS.length];
}

function relicEntries(upstreamMetadata, evidenceSources) {
  const latest = Array.isArray(upstreamMetadata?.latest) ? upstreamMetadata.latest : [];
  if (latest.length) {
    return latest.filter((event) => event?.repo).map((event) => ({
      label: event.label || "Upstream contribution",
      repo: event.repo,
      title: event.title || event.repo,
      url: event.url || `https://github.com/${event.repo}`,
    }));
  }
  return (Array.isArray(evidenceSources) ? evidenceSources : [])
    .filter((source) => source?.fullName || source?.name)
    .map((source) => ({
      label: "Source snapshot",
      repo: source.fullName || source.name,
      title: source.name || source.fullName,
      url: source.sourceUrl || "",
    }));
}

let relicCache = { relics: Object.freeze([]), signature: "empty-bench" };

/**
 * Turns the real merged upstream feed (live GitHub `latest`, or the authored
 * `upstream` fallback in data/teerth-content.json when the API is down) into
 * up to four physical relics for the assembly bench. Project evidence sources
 * are the last resort so an offline archive still shows real tools rather than
 * invented ones. Memoized on identity so the frame loop never reallocates.
 */
export function deriveAssemblyRelics(upstreamMetadata, evidenceSources) {
  const entries = relicEntries(upstreamMetadata, evidenceSources)
    .slice(0, SW_ASSEMBLY_RELIC_CAPACITY);
  const signature = entries.length
    ? entries.map((entry) => `${entry.repo}|${entry.label}`).join("::")
    : "empty-bench";
  if (signature === relicCache.signature) return relicCache.relics;
  relicCache = {
    relics: deepFreeze(
      entries.map((entry, index) => ({
        form: relicForm(entry.repo, entry.label),
        label: entry.label,
        repo: entry.repo,
        slot: index,
        title: entry.title,
        url: entry.url,
      })),
    ),
    signature,
  };
  return relicCache.relics;
}

/**
 * Generates a stable, connected 20-bar trace from source identity, never from
 * frame time or invented success scores. Input order is normalized first.
 */
export function deriveTopologyBarcode(sources = [], category = "all") {
  const normalized = (Array.isArray(sources) ? sources : [])
    .map(canonicalSource)
    .sort();
  const signature = `${category || "all"}::${normalized.join("::") || "empty-archive"}`;
  const rootHash = hashString(signature);
  const pathLength = 4 + ((rootHash >>> 7) % 8);
  const pathStart = rootHash % (TOPOLOGY_BAR_COUNT - pathLength + 1);
  const heights = new Float32Array(TOPOLOGY_BAR_COUNT);
  const path = new Uint8Array(pathLength);
  const depths = new Float32Array(pathLength);
  const depthByBar = new Float32Array(TOPOLOGY_BAR_COUNT);
  const pathOrder = new Int16Array(TOPOLOGY_BAR_COUNT);
  pathOrder.fill(-1);

  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    heights[index] = 0.58 + hashUnit(`${signature}|height|${index}`) * 1.12;
  }
  for (let index = 0; index < pathLength; index += 1) {
    const bar = pathStart + index;
    const depth = 0.04 + hashUnit(`${signature}|depth|${bar}`) * 0.12;
    path[index] = bar;
    depths[index] = depth;
    depthByBar[bar] = depth;
    pathOrder[bar] = index;
  }
  return {
    depthByBar,
    depths,
    heights,
    path,
    pathOrder,
    signature,
  };
}

function createInputBuffer() {
  return {
    arrivalStrength: 0,
    docked: false,
    evidenceSources: null,
    pointerPaused: false,
    pointerScrub: null,
    positionX: 0,
    positionZ: 0,
    proximity: 0,
    relicMetadata: null,
    routeProgress: 0,
    signalMetadata: null,
    topologyCategory: "all",
    topologySources: null,
    velocityX: 0,
    velocityZ: 0,
  };
}

function createRitual(haloColor) {
  return {
    breathingMultiplier: 1,
    bodyCrouch: 0,
    bodyForwardShift: 0,
    eyeBias: 0,
    haloBounce: 0,
    haloBrightnessStep: 0,
    haloColor,
    haloEdgeColor: null,
    haloPulseHz: 0,
    haloTiltDegrees: 0,
    headDegrees: 0,
    leanDegrees: 0,
    scanProgress: 0,
  };
}

function createUpstreamState() {
  const profile = SW_MECHANISM_PROFILES["upstream-radio-mast"];
  return {
    beaconIntensity: 0,
    beaconTime: 0,
    bearingErrorDegrees: 0,
    dishAngularVelocity: 0,
    dishBearingRadians: profile.homeBearingDegrees * DEG_TO_RAD,
    evidenceReady: false,
    input: createInputBuffer(),
    isLiveSignal: false,
    packetProgress: 0,
    phase: "LISTEN",
    phaseAge: 0,
    pulsePhases: new Float32Array([0, 0.333333, 0.666667]),
    pulsesActive: false,
    quietAge: 0,
    receiveHold: 0,
    receivedPacket: null,
    scanPhase: 0,
    ritual: createRitual(profile.accent),
    safeStatic: false,
    signalClaim: "research snapshot",
    signalKey: "research-snapshot|teerthsharma|home",
    signalMetadata: null,
    stationId: "upstream-radio-mast",
    targetBearingRadians: profile.homeBearingDegrees * DEG_TO_RAD,
    // Clock for the LFSR keystream telemetry run. Separate from beaconTime on
    // purpose: the aviation beacon is a regulatory blink that keeps its 2 s duty
    // cycle regardless, while the telemetry pattern must HOLD AT ITS SEED STATE
    // under reduced motion rather than run or go dark.
    telemetryTime: 0,
    visualBearingRadians: profile.homeBearingDegrees * DEG_TO_RAD,
  };
}

function createTopologyState() {
  const profile = SW_MECHANISM_PROFILES["topology-archive-wall"];
  return {
    aperture: 0,
    apertureVelocity: 0,
    barExtrusions: new Float32Array(TOPOLOGY_BAR_COUNT),
    barVelocities: new Float32Array(TOPOLOGY_BAR_COUNT),
    barcode: deriveTopologyBarcode([], "all"),
    countdown: 0,
    evidenceReady: false,
    ignition: 0,
    input: createInputBuffer(),
    phase: "INDEX",
    phaseAge: 0,
    refileAge: 0,
    ritual: createRitual(profile.accent),
    safeStatic: false,
    scanIntensity: 0,
    scanPhase: 0,
    sourceCategory: "all",
    sourceReference: null,
    stationId: "topology-archive-wall",
    traceProgress: 0,
  };
}

const ASSEMBLY_START_DISTANCES = Object.freeze([0.42, 0.56, 0.48, 0.63]);
const ASSEMBLY_START_ANGLES = Object.freeze([18, 23, 16, 27]);

function createAssemblyState() {
  const profile = SW_MECHANISM_PROFILES["assembly-tool-locker"];
  return {
    armProgress: new Float32Array(2),
    assemblyTime: 0,
    currentPartIndex: -1,
    evidenceReady: false,
    input: createInputBuffer(),
    locatorPinLifts: new Float32Array(4),
    orientationErrorsDegrees: new Float32Array(ASSEMBLY_START_ANGLES),
    partProgress: new Float32Array(4),
    partTypes: SW_ASSEMBLY_PART_TYPES,
    partVelocities: new Float32Array(4),
    phase: "STOWED",
    phaseAge: 0,
    proofAge: 0,
    proofHold: 0,
    proofSequence: 0,
    proofWithinTolerance: false,
    relics: deriveAssemblyRelics(null, null),
    resetAge: 0,
    ritual: createRitual(profile.accent),
    safeStatic: false,
    stationId: "assembly-tool-locker",
    translationErrors: new Float32Array(ASSEMBLY_START_DISTANCES),
  };
}

export function createSouthwestMechanismSystem() {
  return {
    accumulator: 0,
    simulationTime: 0,
    states: {
      "assembly-tool-locker": createAssemblyState(),
      "topology-archive-wall": createTopologyState(),
      "upstream-radio-mast": createUpstreamState(),
    },
  };
}

function normalizeInput(input, target) {
  target.arrivalStrength = clamp(finite(input?.arrivalStrength), 0, 1);
  target.docked = Boolean(input?.docked);
  target.evidenceSources = Array.isArray(input?.evidenceSources) ? input.evidenceSources : null;
  target.relicMetadata = input?.relicMetadata || null;
  target.pointerPaused = Boolean(input?.pointerPaused);
  target.pointerScrub = Number.isFinite(input?.pointerScrub)
    ? clamp(input.pointerScrub, 0, 1)
    : null;
  target.positionX = finite(input?.positionX);
  target.positionZ = finite(input?.positionZ);
  target.proximity = clamp(finite(input?.proximity), 0, 1);
  target.routeProgress = clamp(finite(input?.routeProgress, target.proximity), 0, 1);
  target.signalMetadata = input?.signalMetadata || null;
  target.topologyCategory = String(input?.topologyCategory || "all");
  target.topologySources = Array.isArray(input?.topologySources) ? input.topologySources : null;
  target.velocityX = finite(input?.velocityX);
  target.velocityZ = finite(input?.velocityZ);
  return target;
}

function stepAngleSpring(state, targetRadians, omega, dampingRatio) {
  const error = wrapAngle(targetRadians - state.dishBearingRadians);
  const acceleration = omega * omega * error - 2 * dampingRatio * omega * state.dishAngularVelocity;
  state.dishAngularVelocity = clamp(
    state.dishAngularVelocity + acceleration * FIXED_STEP_SECONDS,
    -8,
    8,
  );
  state.dishBearingRadians = wrapAngle(
    state.dishBearingRadians + state.dishAngularVelocity * FIXED_STEP_SECONDS,
  );
}

function stepSpringAt(positions, velocities, index, target, omega, dampingRatio) {
  const position = positions[index];
  const velocity = velocities[index];
  const acceleration = omega * omega * (target - position) - 2 * dampingRatio * omega * velocity;
  const nextVelocity = velocity + acceleration * FIXED_STEP_SECONDS;
  positions[index] = position + nextVelocity * FIXED_STEP_SECONDS;
  velocities[index] = nextVelocity;
}

function syncUpstreamMetadata(state, summary) {
  if (summary === state.signalMetadata) return;
  const key = signalSignature(summary);
  const changedIdentity = key !== state.signalKey;
  state.signalKey = key;
  state.signalMetadata = summary;
  state.isLiveSignal = Boolean(liveSignalEvent(summary));
  state.signalClaim = state.isLiveSignal ? "public GitHub API" : "research snapshot";
  state.targetBearingRadians = deriveStableSignalBearing(summary) * DEG_TO_RAD;
  if (changedIdentity) {
    state.evidenceReady = false;
    state.receiveHold = 0;
    state.receivedPacket = null;
  }
}

function updateUpstreamRitual(state, proximity) {
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  const receiving = state.phase === "RECEIVE";
  const crouch = receiving ? 0 : 0.03 * smoothstep01(proximity);
  state.ritual.bodyCrouch = crouch;
  state.ritual.bodyForwardShift = -crouch * 0.34;
  state.ritual.eyeBias = receiving ? 0 : smoothstep01(proximity);
  state.ritual.haloBounce = 0;
  state.ritual.haloColor = profile.halo.colors[0];
  state.ritual.haloEdgeColor = state.phase === "RECEIVE"
    ? profile.halo.colors[1]
    : null;
  state.ritual.haloPulseHz = state.pulsesActive ? 0.8 : 0;
  state.ritual.haloTiltDegrees = wrapDegrees(state.dishBearingRadians * RAD_TO_DEG);
  state.ritual.leanDegrees = -3 * smoothstep01(proximity);
}

/**
 * Deterministic aviation tip beacon: a fixed-step 2 s duty cycle shaped by a
 * smoothstepped cosine so the blink reads roughly 0.8 s warm-on / 1.2 s off.
 * Reduced motion holds the beacon steady at 70% instead of blinking.
 */
function stepUpstreamBeacon(state, profile, reducedMotion) {
  state.beaconTime += FIXED_STEP_SECONDS;
  if (reducedMotion) {
    state.beaconIntensity = profile.reducedMotionBeaconIntensity;
    return;
  }
  state.telemetryTime += FIXED_STEP_SECONDS;
  const beaconWave =
    0.5 -
    0.5 *
      Math.cos(
        ((state.beaconTime % profile.beaconPeriodSeconds) /
          profile.beaconPeriodSeconds) *
          TWO_PI,
      );
  state.beaconIntensity = smoothstep01((beaconWave - 0.6) / 0.24);
}

function stepUpstream(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  syncUpstreamMetadata(state, input.signalMetadata);
  stepUpstreamBeacon(state, profile, reducedMotion);
  const activeBearing = input.proximity > 0.04 || input.docked
    ? state.targetBearingRadians
    : profile.homeBearingDegrees * DEG_TO_RAD;

  if (reducedMotion) {
    state.dishBearingRadians = activeBearing;
    state.visualBearingRadians = activeBearing;
    state.dishAngularVelocity = 0;
    state.scanPhase = 0;
    state.bearingErrorDegrees = 0;
    state.pulsesActive = state.isLiveSignal && input.proximity > 0.04;
    state.packetProgress = input.docked ? 1 : 0;
    if (input.docked && !state.receivedPacket) {
      state.receivedPacket = buildSignalPacket(input.signalMetadata);
    } else if (!input.docked) {
      state.receivedPacket = null;
    }
    state.evidenceReady = input.docked;
    setPhase(state, input.docked ? "RECEIVE" : input.proximity > 0.04 ? "SYNC" : "LISTEN");
    updateUpstreamRitual(state, input.proximity);
    return;
  }

  stepAngleSpring(state, activeBearing, profile.naturalFrequency, profile.dampingRatio);
  if (input.proximity > 0.04 || input.docked) {
    state.scanPhase = (
      state.scanPhase + FIXED_STEP_SECONDS * profile.scanFrequencyHz * TWO_PI
    ) % TWO_PI;
  } else {
    state.scanPhase = 0;
  }
  state.visualBearingRadians =
    state.dishBearingRadians +
    Math.sin(state.scanPhase) *
      profile.scanAmplitudeDegrees *
      DEG_TO_RAD *
      smoothstep01(input.proximity);
  state.bearingErrorDegrees = wrapAngle(activeBearing - state.dishBearingRadians) * RAD_TO_DEG;
  const locked = Math.abs(state.bearingErrorDegrees) <= profile.bearingToleranceDegrees;
  state.pulsesActive = Boolean(state.isLiveSignal && locked && input.proximity > 0.04);
  // Live-lock pulses and the docked receive ritual both ride the same ring
  // phases: while RECEIVE holds, the rings become signal packets descending
  // the mast, so the phases keep advancing after a packet lands even when the
  // metadata is a research snapshot that never claims a live pulse.
  if (state.pulsesActive || state.phase === "RECEIVE") {
    for (let index = 0; index < state.pulsePhases.length; index += 1) {
      state.pulsePhases[index] = (state.pulsePhases[index] + FIXED_STEP_SECONDS * 0.34) % 1;
    }
  }

  if (!input.docked && input.proximity <= 0.04) {
    state.receiveHold = 0;
    state.evidenceReady = false;
    state.packetProgress = 0;
    state.receivedPacket = null;
    if (state.phase !== "LISTEN" && state.phase !== "QUIET") state.quietAge = 0;
    if (state.phase === "LISTEN") {
      setPhase(state, "LISTEN");
    } else {
      state.quietAge += FIXED_STEP_SECONDS;
      if (state.quietAge + STEP_EPSILON >= profile.quietSeconds) {
        state.quietAge = 0;
        setPhase(state, "LISTEN");
      } else {
        setPhase(state, "QUIET");
      }
    }
  } else if (input.docked && locked) {
    state.receiveHold += FIXED_STEP_SECONDS;
    if (state.receiveHold + STEP_EPSILON >= profile.receiveHoldSeconds) {
      setPhase(state, "RECEIVE");
      state.packetProgress =
        ((state.receiveHold - profile.receiveHoldSeconds) / 1.1) % 1;
      state.evidenceReady = true;
      if (!state.receivedPacket) state.receivedPacket = buildSignalPacket(input.signalMetadata);
    } else {
      setPhase(state, "SYNC");
    }
  } else {
    state.receiveHold = 0;
    state.evidenceReady = false;
    state.packetProgress = 0;
    state.receivedPacket = null;
    setPhase(state, locked ? "SYNC" : "FIND_BEARING");
  }
  updateUpstreamRitual(state, input.proximity);
}

function updateTopologySource(state, sources, category) {
  if (state.sourceReference === sources && state.sourceCategory === category) return;
  state.sourceReference = sources;
  state.sourceCategory = category;
  state.barcode = deriveTopologyBarcode(sources || [], category);
  state.barExtrusions.fill(0);
  state.barVelocities.fill(0);
  state.evidenceReady = false;
  state.aperture = 0;
  state.apertureVelocity = 0;
  state.countdown = 0;
  state.ignition = 0;
}

function updateTopologyRitual(state, proximity) {
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  state.ritual.haloBounce = 0;
  state.ritual.haloBrightnessStep = clamp(Math.floor(proximity * 5), 0, 4);
  state.ritual.haloColor = profile.halo.colors[0];
  state.ritual.haloEdgeColor = profile.halo.colors[1];
  state.ritual.haloTiltDegrees = 61;
  state.ritual.scanProgress = state.traceProgress;
  state.ritual.headDegrees = proximity > 0.08 ? 9 : 0;
}

function springTopologyBars(state) {
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  for (let index = 0; index < state.barExtrusions.length; index += 1) {
    const pathIndex = state.barcode.pathOrder[index];
    let target = 0;
    if (pathIndex >= 0 && state.phase === "REFILE") {
      const reverseDelay =
        (state.barcode.path.length - 1 - pathIndex) * profile.refileStaggerSeconds;
      target = state.refileAge + STEP_EPSILON >= reverseDelay
        ? 0
        : state.barcode.depthByBar[index];
    } else if (
      pathIndex >= 0 &&
      (state.phase === "LIFT_STRATA" || state.phase === "OPEN_ARCHIVE")
    ) {
      target = state.barcode.depthByBar[index];
    }
    stepSpringAt(
      state.barExtrusions,
      state.barVelocities,
      index,
      target,
      9,
      1,
    );
    state.barExtrusions[index] = clamp(state.barExtrusions[index], 0, 0.16);
    state.barVelocities[index] = clamp(state.barVelocities[index], -1.4, 1.4);
  }
}

function stepTopology(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  updateTopologySource(state, input.topologySources, input.topologyCategory);
  state.traceProgress = smoothstep01(input.proximity);

  if (reducedMotion) {
    state.barExtrusions.fill(0);
    state.barVelocities.fill(0);
    state.aperture = input.docked ? profile.apertureDistance : 0;
    state.apertureVelocity = 0;
    state.countdown = input.docked ? profile.countdownSeconds : 0;
    state.ignition = input.docked ? 1 : 0;
    // Reduced motion freezes the scan mid-wall but keeps the read line lit.
    state.scanPhase = profile.scanRestPhase;
    state.scanIntensity = input.docked ? 1 : 0.55;
    state.evidenceReady = input.docked;
    setPhase(
      state,
      input.docked
        ? "OPEN_ARCHIVE"
        : input.proximity > profile.liftThreshold
          ? "LIFT_STRATA"
          : input.proximity > 0.04
            ? "TRACE"
            : "INDEX",
    );
    updateTopologyRitual(state, input.proximity);
    return;
  }

  const departing = !input.docked && input.proximity <= 0.04 && state.phase !== "INDEX";
  if (departing) {
    if (state.phase !== "REFILE") state.refileAge = 0;
    state.refileAge += FIXED_STEP_SECONDS;
    setPhase(state, "REFILE");
  } else if (input.docked) {
    state.refileAge = 0;
    setPhase(state, "OPEN_ARCHIVE");
  } else if (input.proximity > profile.liftThreshold) {
    state.refileAge = 0;
    setPhase(state, "LIFT_STRATA");
  } else if (input.proximity > 0.04) {
    state.refileAge = 0;
    setPhase(state, "TRACE");
  } else {
    state.refileAge = 0;
    setPhase(state, "INDEX");
  }

  springTopologyBars(state);

  // The archive is visibly being read: a scan line sweeps the strata barcode
  // continuously, accelerating and brightening while the visitor is docked.
  const scanHz = input.docked
    ? profile.scanDockedHz
    : profile.scanSweepHz * (1 + smoothstep01(input.proximity));
  state.scanPhase = (state.scanPhase + FIXED_STEP_SECONDS * scanHz) % 1;
  const scanTarget = input.docked ? 1 : 0.3 + 0.5 * smoothstep01(input.proximity);
  state.scanIntensity += (scanTarget - state.scanIntensity) * SCAN_INTENSITY_ALPHA;

  const apertureTarget = state.phase === "OPEN_ARCHIVE" ? profile.apertureDistance : 0;
  const apertureAcceleration =
    100 * (apertureTarget - state.aperture) - 20 * state.apertureVelocity;
  state.apertureVelocity += apertureAcceleration * FIXED_STEP_SECONDS;
  state.aperture += state.apertureVelocity * FIXED_STEP_SECONDS;
  state.aperture = clamp(state.aperture, 0, profile.apertureDistance);
  if (state.phase === "OPEN_ARCHIVE" && state.phaseAge >= 0.55) {
    state.aperture = profile.apertureDistance;
    state.apertureVelocity = 0;
  }

  if (state.phase === "OPEN_ARCHIVE" && input.docked) {
    state.countdown = Math.ceil(
      clamp(profile.countdownSeconds - state.phaseAge, 0, profile.countdownSeconds),
    );
    const ignitionWindow = smoothstep01(state.phaseAge / 0.55);
    state.ignition = 0.22 + 0.78 * ignitionWindow;
  } else {
    state.countdown = 0;
    state.ignition = 0;
  }

  state.evidenceReady =
    state.phase === "OPEN_ARCHIVE" &&
    Math.abs(state.aperture - profile.apertureDistance) <= 1e-5;

  if (state.phase === "REFILE") {
    const lastDelay = (state.barcode.path.length - 1) * profile.refileStaggerSeconds;
    let settled = state.aperture < 0.001;
    for (let index = 0; index < state.barExtrusions.length; index += 1) {
      if (state.barExtrusions[index] >= 0.001) settled = false;
    }
    if (state.refileAge > lastDelay + 0.8 && settled) {
      state.refileAge = 0;
      setPhase(state, "INDEX");
    }
  }
  updateTopologyRitual(state, input.proximity);
}

function updateAssemblyErrors(state) {
  for (let index = 0; index < state.partProgress.length; index += 1) {
    const unseated = clamp(1 - state.partProgress[index], 0, 1);
    state.translationErrors[index] = ASSEMBLY_START_DISTANCES[index] * unseated;
    state.orientationErrorsDegrees[index] = ASSEMBLY_START_ANGLES[index] * unseated;
  }
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  state.proofWithinTolerance = true;
  for (let index = 0; index < state.partProgress.length; index += 1) {
    if (
      state.translationErrors[index] > profile.translationTolerance ||
      state.orientationErrorsDegrees[index] > profile.orientationToleranceDegrees
    ) {
      state.proofWithinTolerance = false;
      break;
    }
  }
}

function updateAssemblyRitual(state, proximity) {
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  const proofBounceWindow = 0.38;
  state.ritual.bodyForwardShift = state.phase === "INDEX_PARTS" ? 0.03 : 0;
  state.ritual.haloBounce =
    state.phase === "PROVE" && state.proofAge < proofBounceWindow
      ? 0.04 * Math.sin((state.proofAge / proofBounceWindow) * Math.PI)
      : 0;
  state.ritual.haloColor = profile.halo.colors[0];
  state.ritual.haloEdgeColor = profile.halo.colors[1];
  state.ritual.haloBrightnessStep = state.phase === "PROVE" ? 4 : 1;
  state.ritual.haloTiltDegrees = -9;
  state.ritual.leanDegrees = state.phase === "INDEX_PARTS" ? 3 * smoothstep01(proximity) : 0;
}

function stepAssemblyParts(state, mode, indexLimit = -1) {
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  for (let index = 0; index < state.partProgress.length; index += 1) {
    let target = 0;
    if (mode === "assemble") {
      target = index <= indexLimit ? 1 : 0;
    } else if (mode === "reset") {
      const reverseDelay =
        (state.partProgress.length - 1 - index) * profile.resetStaggerSeconds;
      target = state.resetAge + STEP_EPSILON >= reverseDelay ? 0 : 1;
    }
    stepSpringAt(
      state.partProgress,
      state.partVelocities,
      index,
      target,
      profile.naturalFrequency,
      profile.dampingRatio,
    );
    state.partProgress[index] = clamp(state.partProgress[index], 0, 1);
    state.partVelocities[index] = clamp(state.partVelocities[index], -5, 5);
  }
}

function stepAssembly(state, rawInput, reducedMotion) {
  const input = normalizeInput(rawInput, state.input);
  const profile = SW_MECHANISM_PROFILES[state.stationId];
  state.relics = deriveAssemblyRelics(input.relicMetadata, input.evidenceSources);
  if (reducedMotion) {
    state.locatorPinLifts.fill(input.docked ? 1 : 0);
    if (input.docked) {
      state.partProgress.fill(1);
      state.partVelocities.fill(0);
      state.armProgress.fill(1);
      state.currentPartIndex = 3;
      state.evidenceReady = true;
      state.proofWithinTolerance = true;
      state.translationErrors.fill(0);
      state.orientationErrorsDegrees.fill(0);
      setPhase(state, "PROVE");
    } else {
      state.partProgress.fill(0);
      state.partVelocities.fill(0);
      state.armProgress.fill(0);
      state.currentPartIndex = -1;
      state.evidenceReady = false;
      updateAssemblyErrors(state);
      setPhase(state, input.proximity > 0.04 ? "INDEX_PARTS" : "STOWED");
    }
    updateAssemblyRitual(state, input.proximity);
    return;
  }

  const pinAlpha = 1 - Math.exp(-FIXED_STEP_SECONDS * 11);
  for (let index = 0; index < state.locatorPinLifts.length; index += 1) {
    const threshold = 0.12 + index * 0.13;
    const target = input.proximity >= threshold ? 1 : 0;
    state.locatorPinLifts[index] += (target - state.locatorPinLifts[index]) * pinAlpha;
  }

  const departing = !input.docked && input.proximity <= 0.04 && state.phase !== "STOWED";
  if (departing) {
    if (state.phase !== "RESET") state.resetAge = 0;
    state.resetAge += FIXED_STEP_SECONDS;
    state.evidenceReady = false;
    state.proofWithinTolerance = false;
    setPhase(state, "RESET");
    stepAssemblyParts(state, "reset");
  } else if (input.docked) {
    if (!input.pointerPaused) state.assemblyTime += FIXED_STEP_SECONDS;
    if (input.pointerScrub !== null) {
      state.assemblyTime = input.pointerScrub * profile.assemblyCycleSeconds;
    }
    const assemblyCycleTime = state.assemblyTime % profile.assemblyCycleSeconds;
    if (assemblyCycleTime >= profile.assemblyHoldUntilSeconds) {
      state.resetAge = assemblyCycleTime - profile.assemblyHoldUntilSeconds;
      state.currentPartIndex = -1;
      state.evidenceReady = false;
      state.proofWithinTolerance = false;
      state.proofHold = 0;
      state.proofAge = 0;
      setPhase(state, "RESET");
      stepAssemblyParts(state, "reset");
    } else {
      state.resetAge = 0;
      const partInterval = profile.assemblyBuildSeconds / state.partProgress.length;
      const availableIndex = clamp(Math.floor(assemblyCycleTime / partInterval), 0, 3);
      state.currentPartIndex = availableIndex;
      stepAssemblyParts(state, "assemble", availableIndex);
      updateAssemblyErrors(state);
      if (state.proofWithinTolerance) {
        state.proofHold += FIXED_STEP_SECONDS;
        if (state.proofHold + STEP_EPSILON >= profile.proofHoldSeconds) {
          if (state.phase !== "PROVE") {
            state.proofSequence += 1;
            state.proofAge = 0;
          }
          state.proofAge += FIXED_STEP_SECONDS;
          state.evidenceReady = true;
          setPhase(state, "PROVE");
        } else {
          state.evidenceReady = false;
          setPhase(state, "ASSEMBLE");
        }
      } else {
        state.proofHold = 0;
        state.proofAge = 0;
        state.evidenceReady = false;
        setPhase(state, "ASSEMBLE");
      }
    }
  } else if (input.proximity > 0.04) {
    state.resetAge = 0;
    state.assemblyTime = 0;
    state.proofAge = 0;
    state.proofHold = 0;
    state.evidenceReady = false;
    state.currentPartIndex = -1;
    stepAssemblyParts(state, "stow");
    updateAssemblyErrors(state);
    setPhase(state, "INDEX_PARTS");
  } else {
    state.resetAge = 0;
    state.assemblyTime = 0;
    state.proofAge = 0;
    state.proofHold = 0;
    state.evidenceReady = false;
    state.currentPartIndex = -1;
    stepAssemblyParts(state, "stow");
    updateAssemblyErrors(state);
    setPhase(state, "STOWED");
  }

  let firstArm = 0;
  let secondArm = 0;
  for (let index = 0; index < state.partProgress.length; index += 1) {
    if (index % 2 === 0) firstArm = Math.max(firstArm, state.partProgress[index]);
    else secondArm = Math.max(secondArm, state.partProgress[index]);
  }
  state.armProgress[0] = firstArm;
  state.armProgress[1] = secondArm;

  if (state.phase === "RESET") {
    updateAssemblyErrors(state);
    let settled = true;
    for (let index = 0; index < state.partProgress.length; index += 1) {
      if (state.partProgress[index] >= 0.001) settled = false;
    }
    const finalDelay = (state.partProgress.length - 1) * profile.resetStaggerSeconds;
    if (state.resetAge > finalDelay + 1.5 && settled) {
      state.resetAge = 0;
      state.partProgress.fill(0);
      state.partVelocities.fill(0);
      state.armProgress.fill(0);
      setPhase(state, "STOWED");
    }
  }
  updateAssemblyRitual(state, input.proximity);
}

function applySafeState(state) {
  state.safeStatic = true;
  state.evidenceReady = true;
  if (state.stationId === "upstream-radio-mast") {
    state.beaconIntensity =
      SW_MECHANISM_PROFILES[state.stationId].reducedMotionBeaconIntensity;
    state.dishAngularVelocity = 0;
    state.dishBearingRadians = state.targetBearingRadians;
    state.visualBearingRadians = state.targetBearingRadians;
    state.scanPhase = 0;
    state.bearingErrorDegrees = 0;
    state.pulsesActive = false;
    state.packetProgress = 1;
    state.telemetryTime = 0;
    if (!state.receivedPacket) {
      state.receivedPacket = buildSignalPacket(state.input.signalMetadata);
    }
    setPhase(state, "RECEIVE");
  } else if (state.stationId === "topology-archive-wall") {
    state.barExtrusions.fill(0);
    state.barVelocities.fill(0);
    state.aperture = SW_MECHANISM_PROFILES[state.stationId].apertureDistance;
    state.apertureVelocity = 0;
    state.countdown = 0;
    state.ignition = 1;
    state.scanPhase = SW_MECHANISM_PROFILES[state.stationId].scanRestPhase;
    state.scanIntensity = 1;
    setPhase(state, "OPEN_ARCHIVE");
  } else {
    state.relics = deriveAssemblyRelics(
      state.input.relicMetadata,
      state.input.evidenceSources,
    );
    state.partProgress.fill(1);
    state.partVelocities.fill(0);
    state.armProgress.fill(1);
    state.translationErrors.fill(0);
    state.orientationErrorsDegrees.fill(0);
    state.proofWithinTolerance = true;
    setPhase(state, "PROVE");
  }
}

function stepSystem(system, inputsByStation, reducedMotion, safeMode) {
  if (safeMode) {
    for (const id of SW_MECHANISM_IDS) {
      const state = system.states[id];
      normalizeInput(inputsByStation?.[id], state.input);
      if (id === "upstream-radio-mast") {
        syncUpstreamMetadata(state, state.input.signalMetadata);
      } else if (id === "topology-archive-wall") {
        updateTopologySource(
          state,
          state.input.topologySources,
          state.input.topologyCategory,
        );
      }
      applySafeState(state);
    }
    return;
  }
  for (const id of SW_MECHANISM_IDS) system.states[id].safeStatic = false;
  stepUpstream(
    system.states["upstream-radio-mast"],
    inputsByStation?.["upstream-radio-mast"],
    reducedMotion,
  );
  stepTopology(
    system.states["topology-archive-wall"],
    inputsByStation?.["topology-archive-wall"],
    reducedMotion,
  );
  stepAssembly(
    system.states["assembly-tool-locker"],
    inputsByStation?.["assembly-tool-locker"],
    reducedMotion,
  );
}

export function advanceSouthwestMechanisms(
  system,
  inputsByStation,
  deltaSeconds,
  { reducedMotion = false, safeMode = false } = {},
) {
  if (!system?.states) return system;
  const acceptedDelta = Math.min(MAX_FRAME_SECONDS, Math.max(0, finite(deltaSeconds)));
  system.accumulator += acceptedDelta;
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

/**
 * Maps the one canonical traversal pose into each station input. It writes only
 * into the caller-owned buffer; semantic ritual/evidence state remains in the
 * fixed-step authority until a real dock proof is complete.
 */
export function resolveSouthwestMechanismInputs(
  traversalPose,
  target = {},
  {
    assemblyInspection = null,
    topologyCategory = "all",
    topologySources = null,
    upstreamMetadata = null,
  } = {},
) {
  const pose = traversalPose || {};
  const positionX = finite(pose.x);
  const positionZ = finite(pose.z);
  for (const id of SW_MECHANISM_IDS) {
    const profile = SW_MECHANISM_PROFILES[id];
    const input = target[id] || (target[id] = {});
    const distance = Math.hypot(
      positionX - profile.dockXZ[0],
      positionZ - profile.dockXZ[1],
    );
    const geometricProximity = smoothstep01(1 - distance / profile.farRadius);
    input.arrivalStrength = pose.arrivalStationId === id
      ? clamp(finite(pose.arrivalStrength), 0, 1)
      : 0;
    input.docked = pose.dockedId === id;
    // The tool wall shows the real merged upstream work: live GitHub `latest`
    // first, then the authored upstream fallback, then project evidence — the
    // same honesty ladder the mast uses for its packet.
    input.relicMetadata = id === "assembly-tool-locker" ? upstreamMetadata : null;
    input.evidenceSources = id === "assembly-tool-locker" && Array.isArray(assemblyInspection?.evidenceSources)
      ? assemblyInspection.evidenceSources
      : null;
    input.pointerPaused = id === "assembly-tool-locker" && Boolean(assemblyInspection?.paused);
    input.pointerScrub = id === "assembly-tool-locker" && Number.isFinite(assemblyInspection?.scrub)
      ? clamp(assemblyInspection.scrub, 0, 1)
      : null;
    input.positionX = positionX;
    input.positionZ = positionZ;
    input.proximity = pose.proximityStationId === id
      ? Math.max(geometricProximity, clamp(finite(pose.stationProximity), 0, 1))
      : geometricProximity;
    input.routeProgress = input.proximity;
    input.signalMetadata = id === "upstream-radio-mast" ? upstreamMetadata : null;
    input.topologyCategory = id === "topology-archive-wall" ? topologyCategory : "all";
    input.topologySources = id === "topology-archive-wall" ? topologySources : null;
    input.velocityX = finite(pose.vx);
    input.velocityZ = finite(pose.vz);
  }
  return target;
}
