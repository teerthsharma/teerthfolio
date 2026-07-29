/**
 * Canonical data and shader math for the eight Antarctic biome fields.
 *
 * This module intentionally owns no React state. Traversal supplies one canonical
 * world XZ pose; the compositor selects only the two nearest authored fields.
 */

import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
} from "./polar-station-personality.js";

export const BIOME_WEIGHT_EXPONENT = 2.2;
export const FRAMED_NEIGHBOR_SHARE_CAP = 0.28;
export const FRAMED_NEIGHBOR_SHARE_FLOOR = 0.04;

export const POLAR_BIOME_ORDER = STATION_PERSONALITY_ORDER;

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

function stationPersonalityBiomeIdentity(stationId, { fog, light, particleStrength, weather }) {
  const identity = STATION_PERSONALITY_PROFILES[stationId];
  const { environment, lighting, palette, particles } = identity;
  return {
    identity,
    personality: environment.personality,
    particleFamily: particles.family,
    ...(environment.forbiddenClimate
      ? { forbiddenClimate: environment.forbiddenClimate }
      : null),
    atmosphere: {
      kind: environment.backgroundFamily,
      coordinateSpace: "continuous-world-xz",
      colors: environment.backgroundColors,
      particleStrength,
    },
    geography: environment.fieldFamily,
    palette: palette.signature,
    colors: palette.world.colors,
    accent: palette.world.colors.accent,
    shadow: palette.world.shadow,
    fog: { color: palette.world.colors.fog, ...fog },
    light: { key: lighting.key, ...light, fill: lighting.fill, rim: lighting.rim },
    weather: { kind: environment.objectFamily, ...weather },
  };
}

const profiles = {
  "observatory-plaque": {
    ...stationPersonalityBiomeIdentity("observatory-plaque", {
      particleStrength: 1,
      fog: { density: 0.012, heightFalloff: 0.42 },
      light: { azimuth: 128, elevation: 24, fillStrength: 0.32, rimStrength: 0.46 },
      weather: { fieldKind: 0, speed: 0.36, angleDegrees: 102, opacity: 0.21 },
    }),
    fieldKind: 0,
    angleDegrees: 12,
    centerXZ: [-15, 7],
    radius: 10.5,
    falloff: 0.62,
    weatherVector: [-0.208, 0.978],
    dockXZ: [-19.26, 8.99],
    radii: { far: 10.5, approach: 7, dock: 2.6 },
    field: {
      macroScale: 0.09,
      macroAmplitude: 0.16,
      ridgeScale: 0.31,
      ridgeAmplitude: 0.055,
      waveFrequency: 2.4,
      waveWarp: 0.65,
      waveAmplitude: 0.018,
      sastrugiXScale: 0.33,
      sastrugiZScale: 1.4,
      meltSineAmplitude: 1.15,
      meltSineFrequency: 0.11,
      meltWarpAmplitude: 0.22,
    },
  },
  "s2-kernel-core": {
    ...stationPersonalityBiomeIdentity("s2-kernel-core", {
      particleStrength: 0.48,
      fog: { density: 0.01, heightFalloff: 0.36 },
      light: { azimuth: 205, elevation: 29, fillStrength: 0.28, rimStrength: 0.58 },
      weather: { fieldKind: 1, speed: 0.28, angleDegrees: 38, opacity: 0.19 },
    }),
    fieldKind: 1,
    angleDegrees: 38,
    centerXZ: [-5, 13],
    radius: 8.5,
    falloff: 0.62,
    weatherVector: [0.788, 0.616],
    dockXZ: [-6.01, 15.61],
    radii: { far: 8.5, approach: 5.5, dock: 1.8 },
    field: {
      ridgeScale: 0.28,
      ridgePower: 1.5,
      ridgeAmplitude: 0.22,
      macroScale: 0.11,
      macroAmplitude: 0.05,
      angularLobes: 6,
      angularWarp: 1.7,
      angularAmplitude: 0.024,
      radialDecay: 0.08,
      voronoiScale: 1.35,
      edgeStart: 0.035,
      edgeEnd: 0.085,
      parhelionRadius: 0.31,
      parhelionWidth: 0.012,
    },
  },
  "manifold-reactor": {
    ...stationPersonalityBiomeIdentity("manifold-reactor", {
      particleStrength: 0.72,
      fog: { density: 0.017, heightFalloff: 0.26 },
      light: { azimuth: 246, elevation: 18, fillStrength: 0.35, rimStrength: 0.44 },
      weather: { fieldKind: 2, speed: 0.14, angleDegrees: -27, opacity: 0.17 },
    }),
    fieldKind: 2,
    angleDegrees: -27,
    centerXZ: [8, 12],
    radius: 8.8,
    falloff: 0.64,
    weatherVector: [0.891, -0.454],
    dockXZ: [9.55, 14.33],
    radii: { far: 8.8, approach: 5.8, dock: 1.9 },
    field: {
      warpScale: 0.12,
      warpAmplitude: 0.72,
      cavernScale: 0.22,
      cavernAmplitude: -0.18,
      cavernSineFrequency: 1.7,
      cavernSineAmplitude: 0.055,
      ribbonSineAmplitude: 0.72,
      ribbonSineFrequency: 0.24,
      ribbonWarpAmplitude: 0.2,
      ribbonHalfWidth: 0.58,
      nerveSharpness: 95,
      nerveScale: 0.31,
      nerveChannels: 4,
    },
  },
  "field-chamber-coils": {
    ...stationPersonalityBiomeIdentity("field-chamber-coils", {
      particleStrength: 0.64,
      fog: { density: 0.006, heightFalloff: 0.34 },
      light: { azimuth: 282, elevation: 16, fillStrength: 0.24, rimStrength: 0.4 },
      weather: { fieldKind: 3, speed: 0.72, angleDegrees: 74, opacity: 0.18 },
    }),
    fieldKind: 3,
    angleDegrees: 74,
    centerXZ: [17, 4],
    radius: 9.2,
    falloff: 0.64,
    weatherVector: [0.276, 0.961],
    dockXZ: [20.21, 4.76],
    radii: { far: 9.2, approach: 6.2, dock: 2.2 },
    field: {
      poleDistance: 1.8,
      poleSoftness: 0.12,
      fieldFrequency: 6,
      fieldWarp: 1.6,
      saltVoronoiScale: 0.82,
      saltEdgeStart: 0.025,
      saltEdgeEnd: 0.07,
      macroScale: 0.13,
      macroAmplitude: 0.045,
      saltDepth: 0.018,
    },
  },
  "qpu-ice-bridge": {
    ...stationPersonalityBiomeIdentity("qpu-ice-bridge", {
      particleStrength: 0.68,
      fog: { density: 0.014, heightFalloff: 0.3 },
      light: { azimuth: 326, elevation: 20, fillStrength: 0.34, rimStrength: 0.52 },
      weather: { fieldKind: 4, speed: 0.18, angleDegrees: -48, opacity: 0.18 },
    }),
    fieldKind: 4,
    angleDegrees: -48,
    centerXZ: [15, -8],
    radius: 9.4,
    falloff: 0.62,
    weatherVector: [0.669, -0.743],
    dockXZ: [18, -9.6],
    radii: { far: 9.4, approach: 6.4, dock: 2.4 },
    field: {
      sources: [[-1.65, -0.78], [-0.42, 1.14], [1.08, -1.02], [1.72, 0.72]],
      waveVectors: [[1.21, 0.42], [-0.61, 1.14], [0.82, -1.03], [-1.18, -0.37]],
      phases: [0.2, 1.47, 2.72, 4.08],
      gaussianDivisor: 5.4,
      timeRate: 0.12,
      quantizationLevels: 4,
      leadSineAmplitude: 0.24,
      leadSineFrequency: 0.31,
      leadWarpAmplitude: 0.16,
      leadHalfWidth: 0.46,
      floeVoronoiScale: 1.1,
      floeEdgeStart: 0.025,
      floeEdgeEnd: 0.075,
    },
  },
  "upstream-radio-mast": {
    ...stationPersonalityBiomeIdentity("upstream-radio-mast", {
      particleStrength: 0.58,
      fog: { density: 0.011, heightFalloff: 0.32 },
      light: { azimuth: 18, elevation: 17, fillStrength: 0.3, rimStrength: 0.48 },
      weather: { fieldKind: 5, speed: 0.62, angleDegrees: 19, opacity: 0.22 },
    }),
    fieldKind: 5,
    angleDegrees: 19,
    centerXZ: [3, -14],
    radius: 9,
    falloff: 0.63,
    weatherVector: [0.946, 0.326],
    dockXZ: [3.59, -16.74],
    radii: { far: 9, approach: 6, dock: 2 },
    field: {
      auroraCenterScale: 0.55,
      auroraTimeRate: 0.035,
      auroraCenterAmplitude: 0.22,
      auroraVariance: 0.018,
      auroraFrequency: 9,
      auroraPhaseRate: 0.16,
      signalRadiusScale: 0.18,
      signalTimeRate: 0.12,
      signalSharpness: 22,
      katabaticXScale: 0.16,
      katabaticZScale: 1.7,
      katabaticTimeRate: 0.18,
    },
  },
  "topology-archive-wall": {
    ...stationPersonalityBiomeIdentity("topology-archive-wall", {
      particleStrength: 0.55,
      fog: { density: 0.009, heightFalloff: 0.33 },
      light: { azimuth: 64, elevation: 22, fillStrength: 0.34, rimStrength: 0.36 },
      weather: { fieldKind: 6, speed: 0.30, angleDegrees: 61, opacity: 0.16 },
    }),
    fieldKind: 6,
    angleDegrees: 61,
    centerXZ: [-11, -11],
    radius: 9.4,
    falloff: 0.64,
    weatherVector: [0.485, 0.875],
    dockXZ: [-13.47, -13.47],
    radii: { far: 9.4, approach: 6.3, dock: 2.3 },
    field: {
      warpScale: 0.12,
      warpAmplitude: 0.65,
      layerSpacing: 0.42,
      stratumStart: 0.04,
      stratumEnd: 0.11,
      barcodeRows: 7,
      barcodeSeed: 17.31,
      bubbleDensity: 0.075,
    },
  },
  "assembly-tool-locker": {
    ...stationPersonalityBiomeIdentity("assembly-tool-locker", {
      particleStrength: 0.52,
      fog: { density: 0.008, heightFalloff: 0.35 },
      light: { azimuth: 112, elevation: 25, fillStrength: 0.28, rimStrength: 0.34 },
      weather: { fieldKind: 7, speed: 0.50, angleDegrees: -9, opacity: 0.17 },
    }),
    fieldKind: 7,
    angleDegrees: -9,
    centerXZ: [-18, -2],
    radius: 8.7,
    falloff: 0.63,
    weatherVector: [0.988, -0.156],
    dockXZ: [-20.98, -2.33],
    radii: { far: 8.7, approach: 5.8, dock: 2.1 },
    field: {
      gridScale: 0.36,
      gridWidth: 0.025,
      toolPathScale: 0.2,
      toolPathSharpness: 82,
      toolPathThreshold: 0.5,
      toolPathSineX: 1.7,
      toolPathSineZ: 0.9,
      knurlFrequency: 18,
      macroScale: 0.1,
      macroAmplitude: 0.052,
      gridAmplitude: 0.012,
    },
  },
};

export const POLAR_BIOME_PROFILES = deepFreeze(profiles);

for (const stationId of STATION_PERSONALITY_ORDER) {
  const authority = STATION_PERSONALITY_PROFILES[stationId];
  const biome = POLAR_BIOME_PROFILES[stationId];
  if (
    authority.environment.fieldFamily !== biome.geography
    || authority.environment.backgroundFamily !== biome.atmosphere.kind
    || authority.environment.objectFamily !== biome.weather.kind
  ) {
    throw new Error(`Station personality environment drifted for ${stationId}`);
  }
}

export const POLAR_BIOME_QUALITY = deepFreeze({
  low: {
    terrainSegments: 32,
    skySegments: [24, 12],
    geographyInstances: 0,
    shaderDetail: 0.34,
    dynamicWeather: false,
    drawCalls: 2,
  },
  medium: {
    terrainSegments: 64,
    skySegments: [32, 16],
    geographyInstances: 24,
    shaderDetail: 0.72,
    dynamicWeather: true,
    drawCalls: 3,
  },
  high: {
    terrainSegments: 96,
    skySegments: [48, 24],
    geographyInstances: 32,
    shaderDetail: 1,
    dynamicWeather: true,
    drawCalls: 3,
  },
});

export const POLAR_BIOME_SHADER_POLICY = deepFreeze({
  coordinateSpace: "canonical-world-xz",
  localInfluence: "smoothstep(radius, radius * falloff, distanceXZ)",
  combinedInfluenceCap: 1,
  environmentInfluenceCap: 0.42,
  neutralBase: "warm off-white macro snow with cool cyan-lavender shadow",
  textures: 0,
  maxCompiledPrograms: 2,
  programRoles: ["solid", "sky"],
  maxDrawCalls: 3,
  drawRoles: ["terrain", "sky", "nearest-local-geography"],
  weatherOwners: 1,
  nearestFieldCount: 2,
  safeModeDrawCalls: 0,
  reducedMotion: "freeze shader time and remove dynamic weather; retain authored field/color",
});

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function computeLocalBiomeInfluence(profile, worldXZ) {
  const x = Number.isFinite(worldXZ?.[0]) ? worldXZ[0] : 0;
  const z = Number.isFinite(worldXZ?.[1]) ? worldXZ[1] : 0;
  const centerX = Number.isFinite(profile?.centerXZ?.[0]) ? profile.centerXZ[0] : 0;
  const centerZ = Number.isFinite(profile?.centerXZ?.[1]) ? profile.centerXZ[1] : 0;
  const radius = Math.max(0, Number.isFinite(profile?.radius) ? profile.radius : 0);
  const falloff = clamp01(profile?.falloff);
  const distanceXZ = Math.hypot(x - centerX, z - centerZ);
  const onOrOutsideRadius =
    radius <= 0 || distanceXZ >= radius - Number.EPSILON * Math.max(1, radius) * 8;
  const influence = onOrOutsideRadius
    ? 0
    : smoothstep(radius, radius * falloff, distanceXZ);
  return { distanceXZ, influence: clamp01(influence) };
}

export function clampCombinedBiomeInfluence(localInfluences) {
  const total = Math.min(
    1,
    localInfluences.reduce((sum, influence) => sum + clamp01(influence), 0),
  );
  return total;
}

export function computeBiomeProximity(profile, worldXZ) {
  const { distanceXZ, influence } = computeLocalBiomeInfluence(profile, worldXZ);
  return { distance: distanceXZ, proximity: influence };
}

/** Select the two nearest fields while reserving all remote energy for the neutral polar base. */
export function resolveTwoNearestBiomes(worldXZ, target = null) {
  const x = Number.isFinite(worldXZ?.[0]) ? worldXZ[0] : 0;
  const z = Number.isFinite(worldXZ?.[1]) ? worldXZ[1] : 0;
  let primaryId = POLAR_BIOME_ORDER[0];
  let secondaryId = POLAR_BIOME_ORDER[1];
  let primaryDistance = Number.POSITIVE_INFINITY;
  let secondaryDistance = Number.POSITIVE_INFINITY;
  let primaryProximity = 0;
  let secondaryProximity = 0;

  for (const id of POLAR_BIOME_ORDER) {
    const profile = POLAR_BIOME_PROFILES[id];
    const { distanceXZ: distance, influence: proximity } = computeLocalBiomeInfluence(
      profile,
      [x, z],
    );
    if (distance < primaryDistance) {
      secondaryId = primaryId;
      secondaryDistance = primaryDistance;
      secondaryProximity = primaryProximity;
      primaryId = id;
      primaryDistance = distance;
      primaryProximity = proximity;
    } else if (distance < secondaryDistance) {
      secondaryId = id;
      secondaryDistance = distance;
      secondaryProximity = proximity;
    }
  }

  const blend = target?.entries?.length >= 2
    ? target
    : { entries: [{}, {}], primary: null, secondary: null };
  const primary = blend.entries[0];
  const secondary = blend.entries[1];
  const primaryRawWeight = primaryProximity ** BIOME_WEIGHT_EXPONENT;
  const secondaryRawWeight = secondaryProximity ** BIOME_WEIGHT_EXPONENT;
  const weightTotal = primaryRawWeight + secondaryRawWeight;
  const totalInfluence = clampCombinedBiomeInfluence([
    primaryProximity,
    secondaryProximity,
  ]);

  primary.id = primaryId;
  primary.profile = POLAR_BIOME_PROFILES[primaryId];
  primary.distance = primaryDistance;
  primary.proximity = primaryProximity;
  primary.influence = primaryProximity;
  const normalizedSecondaryShare = weightTotal > 1e-8
    ? secondaryRawWeight / weightTotal
    : 0;
  const framedSecondaryShare = normalizedSecondaryShare < FRAMED_NEIGHBOR_SHARE_FLOOR
    ? 0
    : Math.min(FRAMED_NEIGHBOR_SHARE_CAP, normalizedSecondaryShare);
  primary.weight = totalInfluence * (1 - framedSecondaryShare);
  secondary.id = secondaryId;
  secondary.profile = POLAR_BIOME_PROFILES[secondaryId];
  secondary.distance = secondaryDistance;
  secondary.proximity = secondaryProximity;
  secondary.influence = secondaryProximity;
  secondary.weight = totalInfluence * framedSecondaryShare;
  blend.primary = primary;
  blend.secondary = secondary;
  blend.totalInfluence = totalInfluence;
  blend.neutralWeight = 1 - totalInfluence;
  return blend;
}

/**
 * Resolve the local visual owner separately from the nearest profile fallback.
 * Remote neutral terrain has no owner; an overlap may expose one framed neighbor.
 */
export function resolveLocalWorldOwnership(
  worldXZ,
  target = null,
  { exclusiveStationId = null } = {},
) {
  const ownership = target || {
    blend: { entries: [{}, {}], primary: null, secondary: null },
    visibleStationIds: [],
  };
  if (!ownership.blend?.entries || ownership.blend.entries.length < 2) {
    ownership.blend = { entries: [{}, {}], primary: null, secondary: null };
  }
  if (!Array.isArray(ownership.visibleStationIds)) ownership.visibleStationIds = [];
  if (POLAR_BIOME_PROFILES[exclusiveStationId]) {
    const profile = POLAR_BIOME_PROFILES[exclusiveStationId];
    const primary = ownership.blend.entries[0];
    const secondary = ownership.blend.entries[1];
    Object.assign(primary, {
      distance: 0,
      id: exclusiveStationId,
      influence: 1,
      profile,
      proximity: 1,
      weight: 1,
    });
    Object.assign(secondary, {
      distance: Number.POSITIVE_INFINITY,
      id: exclusiveStationId,
      influence: 0,
      profile,
      proximity: 0,
      weight: 0,
    });
    ownership.blend.primary = primary;
    ownership.blend.secondary = secondary;
    ownership.blend.totalInfluence = 1;
    ownership.blend.neutralWeight = 0;
    ownership.current = primary;
    ownership.framedNeighbor = null;
    ownership.visibleStationIds.length = 0;
    ownership.visibleStationIds.push(exclusiveStationId);
    return ownership;
  }
  const blend = resolveTwoNearestBiomes(worldXZ, ownership.blend);
  const hasCurrent = blend.totalInfluence > 1e-8 && blend.primary.weight > 0;
  const hasNeighbor = hasCurrent && blend.secondary.weight > 0;
  ownership.current = hasCurrent ? blend.primary : null;
  ownership.framedNeighbor = hasNeighbor ? blend.secondary : null;
  ownership.visibleStationIds.length = 0;
  if (ownership.current) ownership.visibleStationIds.push(ownership.current.id);
  if (ownership.framedNeighbor) {
    ownership.visibleStationIds.push(ownership.framedNeighbor.id);
  }
  return ownership;
}

/** Implements the approved luma-preserving saturation and bounded energy gain equation. */
export function amplifyBiomeColorLumaPreserving(color, proximity) {
  const source = [clamp01(color?.[0]), clamp01(color?.[1]), clamp01(color?.[2])];
  const p = clamp01(proximity);
  const luma = source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722;
  const saturation = 0.54 + 0.46 * p;
  const gain = 0.96 + 0.08 * p;
  return source.map((channel) => clamp01((luma + (channel - luma) * saturation) * gain));
}

/** Dynamic weather is singular: only the nearest field may animate above the 20% threshold. */
export function resolveNearestWeather(
  blend,
  { quality = "medium", reducedMotion = false, safeMode = false, target = null } = {},
) {
  const qualityPolicy = POLAR_BIOME_QUALITY[quality] || POLAR_BIOME_QUALITY.medium;
  if (safeMode || reducedMotion || !qualityPolicy.dynamicWeather) return null;
  if (!blend?.primary || blend.primary.proximity < 0.2) return null;
  const weather = target || {};
  weather.biomeId = blend.primary.id;
  weather.influence = blend.primary.proximity;
  weather.kind = blend.primary.profile.weather.kind;
  weather.fieldKind = blend.primary.profile.weather.fieldKind;
  weather.speed = blend.primary.profile.weather.speed;
  weather.angleDegrees = blend.primary.profile.weather.angleDegrees;
  weather.weatherVector = blend.primary.profile.weatherVector;
  weather.opacity = blend.primary.profile.weather.opacity;
  return weather;
}

const BIOME_FIELD_GLSL = String.raw`
float biomeHash21(vec2 point) {
  vec3 p3 = fract(vec3(point.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float biomeValueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = biomeHash21(cell);
  float b = biomeHash21(cell + vec2(1.0, 0.0));
  float c = biomeHash21(cell + vec2(0.0, 1.0));
  float d = biomeHash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

mat2 biomeOctaveRotation() {
  float angle = radians(34.0);
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

float biomeFbm2(vec2 point) {
  float value = 0.0;
  float amplitude = 1.0;
  mat2 octaveRotation = biomeOctaveRotation();
  for (int octave = 0; octave < 2; octave += 1) {
    value += amplitude * (biomeValueNoise(point) * 2.0 - 1.0);
    point = octaveRotation * point * 2.0 + 7.17;
    amplitude *= 0.35;
  }
  return value;
}

float biomeFbm3(vec2 point) {
  float value = 0.0;
  float amplitude = 1.0;
  mat2 octaveRotation = biomeOctaveRotation();
  for (int octave = 0; octave < 3; octave += 1) {
    value += amplitude * (biomeValueNoise(point) * 2.0 - 1.0);
    point = octaveRotation * point * 2.0 + 7.17;
    amplitude *= 0.35;
  }
  return value;
}

float biomeFbm4(vec2 point) {
  float value = 0.0;
  float amplitude = 1.0;
  mat2 octaveRotation = biomeOctaveRotation();
  for (int octave = 0; octave < 4; octave += 1) {
    value += amplitude * (biomeValueNoise(point) * 2.0 - 1.0);
    point = octaveRotation * point * 2.0 + 7.17;
    amplitude *= 0.35;
  }
  return value;
}

float biomeRidged(vec2 point) {
  float ridge = 1.0 - abs(biomeValueNoise(point) * 2.0 - 1.0);
  return ridge * ridge;
}

float biomeVoronoiEdge(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  float nearest = 9.0;
  float secondNearest = 9.0;
  for (int z = -1; z <= 1; z += 1) {
    for (int x = -1; x <= 1; x += 1) {
      vec2 neighbor = vec2(float(x), float(z));
      vec2 seed = vec2(
        biomeHash21(cell + neighbor),
        biomeHash21(cell + neighbor + 19.31)
      );
      float distanceToSeed = length(neighbor + seed - local);
      if (distanceToSeed < nearest) {
        secondNearest = nearest;
        nearest = distanceToSeed;
      } else if (distanceToSeed < secondNearest) {
        secondNearest = distanceToSeed;
      }
    }
  }
  return max(0.0, secondNearest - nearest);
}

float biomeContour(float value, float width) {
  return 1.0 - smoothstep(width, width * 2.0, abs(fract(value) - 0.5));
}

vec2 rotateBiomeXZ(vec2 point, float angle) {
  float cosine = cos(angle);
  float sine = sin(angle);
  return mat2(cosine, -sine, sine, cosine) * point;
}

float biomeLocalInfluence(
  vec2 worldXZ,
  vec2 centerXZ,
  float radius,
  float falloff
) {
  float distanceXZ = length(worldXZ - centerXZ);
  return 1.0 - smoothstep(radius * falloff, radius, distanceXZ);
}

float polarMacroHeight(vec2 worldXZ) {
  float crossDrift = sin(worldXZ.x * 0.052 + worldXZ.y * 0.031) * 0.052;
  float longDrift = sin(worldXZ.y * 0.041 - worldXZ.x * 0.019 + 1.7) * 0.034;
  float softPath = biomeFbm2(worldXZ * 0.047 + vec2(3.1, -5.7)) * 0.038;
  return crossDrift + longDrift + softPath;
}

vec4 plaqueField(vec2 q, float time, float detail) {
  float macro = biomeFbm4(q * 0.09);
  float ridge = biomeRidged(q * 0.31);
  float wave = sin(2.4 * q.x + 0.65 * biomeFbm3(q * 0.22));
  float height = 0.16 * macro + 0.055 * ridge + 0.018 * wave * detail;
  float sastrugi = smoothstep(0.62, 0.83, biomeRidged(vec2(q.x * 0.33, q.y * 1.4)));
  float meltAxis = 1.15 * sin(0.11 * q.x) + 0.22 * biomeFbm3(vec2(q.x * 0.18, 3.7));
  float meltRibbon = 1.0 - smoothstep(0.10, 0.34, abs(q.y - meltAxis));
  return vec4(height, sastrugi, meltRibbon, ridge);
}

vec4 s2PressureField(vec2 q, float time, float detail) {
  float radius = length(q);
  float angle = atan(q.y, q.x);
  float pressure = pow(biomeRidged(q * 0.28), 1.5);
  float angular = cos(6.0 * angle + 1.7 * biomeFbm2(q * 0.20)) * exp(-0.08 * radius * radius);
  float height = 0.22 * pressure + 0.05 * biomeFbm3(q * 0.11) + 0.024 * angular;
  float pressureEdge = 1.0 - smoothstep(0.035, 0.085, biomeVoronoiEdge(q * 1.35));
  float proofOrbit = 0.5 + 0.5 * cos(6.0 * angle + radius * 1.7);
  return vec4(height, pressureEdge, pressure, proofOrbit * detail);
}

vec4 aetherRibbonField(vec2 q, float time, float detail) {
  vec2 warp = vec2(
    biomeFbm3((q + vec2(17.0, 3.0)) * 0.12),
    biomeFbm3((q + vec2(-9.0, 31.0)) * 0.12)
  );
  vec2 warped = q + 0.72 * warp;
  float cavern = -0.18 * abs(biomeFbm4(warped * 0.22)) + 0.055 * sin(1.7 * warped.x);
  float ribbonAxis = 0.72 * sin(0.24 * q.x) + 0.20 * biomeFbm3(q * 0.18);
  float ribbonSdf = abs(q.y - ribbonAxis) - 0.58;
  float ribbon = 1.0 - smoothstep(-0.04, 0.20, ribbonSdf);
  float nerve = exp(-95.0 * pow(biomeFbm3((warped + vec2(2.7, -1.4)) * 0.31) - 0.16, 2.0));
  nerve += exp(-95.0 * pow(biomeFbm3((warped + vec2(-4.1, 3.2)) * 0.31) + 0.10, 2.0));
  return vec4(cavern, ribbon, clamp(nerve, 0.0, 1.0) * detail, length(warp));
}

vec4 magneticSaltField(vec2 q, float time, float detail) {
  vec2 positivePole = vec2(1.8, 0.0);
  vec2 negativePole = vec2(-1.8, 0.0);
  float phi = log(length(q - positivePole) + 0.12) - log(length(q - negativePole) + 0.12);
  float fieldLine = 1.0 - smoothstep(0.035, 0.085, abs(sin(6.0 * phi + 1.6 * biomeFbm2(q * 0.18))));
  float saltEdge = 1.0 - smoothstep(0.025, 0.070, biomeVoronoiEdge(q * 0.82));
  float height = 0.045 * biomeFbm3(q * 0.13) - 0.018 * saltEdge;
  float poleEnergy = exp(-0.24 * min(length(q - positivePole), length(q - negativePole)));
  return vec4(height, saltEdge, fieldLine * detail, poleEnergy);
}

float qpuWave(vec2 q, vec2 source, vec2 wave, float phase, float time) {
  return exp(-dot(q - source, q - source) / 5.4) * cos(dot(wave, q) + phase + 0.12 * time);
}

vec4 qpuLeadField(vec2 q, float time, float detail) {
  float psi = qpuWave(q, vec2(-1.65, -0.78), vec2(1.21, 0.42), 0.20, time);
  psi += qpuWave(q, vec2(-0.42, 1.14), vec2(-0.61, 1.14), 1.47, time);
  psi += qpuWave(q, vec2(1.08, -1.02), vec2(0.82, -1.03), 2.72, time);
  psi += qpuWave(q, vec2(1.72, 0.72), vec2(-1.18, -0.37), 4.08, time);
  float probability = clamp(psi * psi * 0.22, 0.0, 1.0);
  float coherence = floor(probability * 4.0 + 0.5) / 4.0;
  float leadAxis = 0.24 * sin(0.31 * q.x) + 0.16 * biomeFbm3(q * 0.21);
  float leadSdf = abs(q.y - leadAxis) - 0.46;
  float lead = 1.0 - smoothstep(-0.04, 0.18, leadSdf);
  float floeCrack = 1.0 - smoothstep(0.025, 0.075, biomeVoronoiEdge(q * 1.1));
  float height = 0.035 * biomeFbm3(q * 0.14) - lead * 0.09 + floeCrack * 0.012;
  return vec4(height, lead, coherence * detail, floeCrack);
}

vec4 upstreamSignalField(vec2 q, float time, float detail) {
  float signalPhase = fract(0.18 * length(q) - 0.12 * time) - 0.5;
  float signalFront = exp(-22.0 * signalPhase * signalPhase);
  float katabatic = biomeFbm3(vec2(q.x * 0.16 - 0.18 * time, q.y * 1.7));
  float ridge = 0.075 * biomeRidged(vec2(q.x * 0.20, q.y * 0.46));
  float comb = smoothstep(0.53, 0.78, 0.5 + 0.5 * katabatic);
  return vec4(ridge + katabatic * 0.018, signalFront * detail, comb, ridge);
}

vec4 topologyStrataField(vec2 q, float time, float detail) {
  float warpedDepth = q.y + 0.65 * biomeFbm3(q * 0.12);
  float layerCoordinate = warpedDepth / 0.42;
  float layerId = floor(layerCoordinate);
  float layerSeed = biomeHash21(vec2(layerId, 17.31));
  float stratum = smoothstep(0.04, 0.11, abs(fract(layerCoordinate) - 0.5));
  float row = floor((q.y + 4.0) / 0.58);
  float birth = -2.8 + 1.4 * biomeHash21(vec2(row, 3.1));
  float death = birth + 0.7 + 2.8 * biomeHash21(vec2(row, 8.7));
  float barcode = step(birth, q.x) * step(q.x, death) * (1.0 - stratum);
  float height = 0.045 * biomeFbm3(q * 0.10) + barcode * 0.025 * detail;
  return vec4(height, stratum, barcode, layerSeed);
}

vec4 assemblyRunwayField(vec2 q, float time, float detail) {
  float grid = max(biomeContour(q.x * 0.36, 0.025), biomeContour(q.y * 0.36, 0.025));
  float toolScalar = biomeFbm3(q * 0.20) - 0.50;
  float toolPath = exp(-82.0 * toolScalar * toolScalar) * smoothstep(-0.2, 0.2, sin(1.7 * q.x + 0.9 * q.y));
  float knurl = 0.5 + 0.5 * sin(18.0 * (q.x + q.y)) * sin(18.0 * (q.x - q.y));
  float runway = 1.0 - smoothstep(0.10, 0.32, abs(q.y));
  float height = 0.052 * biomeFbm3(q * 0.10) + 0.012 * grid;
  return vec4(height, grid, toolPath * detail, mix(knurl, runway, 0.58));
}

vec4 evaluateBiomeField(float fieldKind, vec2 q, float time, float detail) {
  vec4 field = vec4(0.0);
  if (fieldKind < 0.5) {
    field = plaqueField(q, time, detail);
  } else if (fieldKind < 1.5) {
    field = s2PressureField(q, time, detail);
  } else if (fieldKind < 2.5) {
    field = aetherRibbonField(q, time, detail);
  } else if (fieldKind < 3.5) {
    field = magneticSaltField(q, time, detail);
  } else if (fieldKind < 4.5) {
    field = qpuLeadField(q, time, detail);
  } else if (fieldKind < 5.5) {
    field = upstreamSignalField(q, time, detail);
  } else if (fieldKind < 6.5) {
    field = topologyStrataField(q, time, detail);
  } else {
    field = assemblyRunwayField(q, time, detail);
  }
  return field;
}
`;

export const POLAR_BIOME_VERTEX_SHADER = String.raw`
attribute float aBiomeRole;

uniform float uTime;
uniform float uShaderDetail;
uniform float uPrimaryFieldKind;
uniform float uSecondaryFieldKind;
uniform float uPrimaryAngle;
uniform float uSecondaryAngle;
uniform float uPrimaryWeight;
uniform float uSecondaryWeight;
uniform float uPrimaryRadius;
uniform float uSecondaryRadius;
uniform float uPrimaryFalloff;
uniform float uSecondaryFalloff;
uniform vec2 uPrimaryCenterXZ;
uniform vec2 uSecondaryCenterXZ;

varying float vBiomeRole;
varying vec2 vWorldXZ;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vSkyDirection;
varying vec4 vPrimaryField;
varying vec4 vSecondaryField;

${BIOME_FIELD_GLSL}

void main() {
  vec4 localPosition = vec4(position, 1.0);
  vec3 localNormal = normal;
  #ifdef USE_INSTANCING
    localPosition = instanceMatrix * localPosition;
    localNormal = mat3(instanceMatrix) * localNormal;
  #endif

  vec4 worldPosition = modelMatrix * localPosition;
  vec2 primaryQ = rotateBiomeXZ(worldPosition.xz - uPrimaryCenterXZ, uPrimaryAngle);
  vec2 secondaryQ = rotateBiomeXZ(worldPosition.xz - uSecondaryCenterXZ, uSecondaryAngle);
  vPrimaryField = vec4(0.0);
  vSecondaryField = vec4(0.0);

  if (aBiomeRole < 0.5) {
    vPrimaryField = evaluateBiomeField(uPrimaryFieldKind, primaryQ, uTime, uShaderDetail);
    vSecondaryField = evaluateBiomeField(uSecondaryFieldKind, secondaryQ, uTime, uShaderDetail);
    float primaryLocalInfluence = biomeLocalInfluence(
      worldPosition.xz,
      uPrimaryCenterXZ,
      uPrimaryRadius,
      uPrimaryFalloff
    ) * uPrimaryWeight;
    float secondaryLocalInfluence = biomeLocalInfluence(
      worldPosition.xz,
      uSecondaryCenterXZ,
      uSecondaryRadius,
      uSecondaryFalloff
    ) * uSecondaryWeight;
    float combinedLocalInfluence = min(
      1.0,
      primaryLocalInfluence + secondaryLocalInfluence
    );
    float localFieldHeight = (
      vPrimaryField.x * primaryLocalInfluence +
      vSecondaryField.x * secondaryLocalInfluence
    ) / max(primaryLocalInfluence + secondaryLocalInfluence, 0.0001);
    worldPosition.y += polarMacroHeight(worldPosition.xz);
    worldPosition.y += localFieldHeight * combinedLocalInfluence * 0.38;
  } else if (aBiomeRole > 1.5) {
    float localAccent = 0.5 + 0.5 * sin(localPosition.y * 3.1 + uPrimaryFieldKind * 1.7);
    worldPosition.xyz += normalize(mat3(modelMatrix) * localNormal) * localAccent * 0.012 * uShaderDetail;
  }

  vBiomeRole = aBiomeRole;
  vWorldXZ = worldPosition.xz;
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
  vSkyDirection = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const POLAR_BIOME_FRAGMENT_SHADER = String.raw`
uniform float uTime;
uniform float uShaderDetail;
uniform float uPrimaryFieldKind;
uniform float uSecondaryFieldKind;
uniform float uPrimaryWeight;
uniform float uSecondaryWeight;
uniform float uPrimaryProximity;
uniform float uSecondaryProximity;
uniform float uPrimaryRadius;
uniform float uSecondaryRadius;
uniform float uPrimaryFalloff;
uniform float uSecondaryFalloff;
uniform float uPrimaryFogDensity;
uniform float uSecondaryFogDensity;
uniform float uPrimaryFogHeightFalloff;
uniform float uSecondaryFogHeightFalloff;
uniform float uWeatherFieldKind;
uniform float uWeatherStrength;
uniform float uWeatherSpeed;
uniform float uPrimaryAtmosphereStrength;
uniform vec2 uWeatherDirection;
uniform vec2 uPrimaryCenterXZ;
uniform vec2 uSecondaryCenterXZ;
uniform vec2 uTravelerXZ;
uniform vec3 uPrimaryLightDirection;
uniform vec3 uSecondaryLightDirection;
uniform vec3 uPrimaryBaseColor;
uniform vec3 uPrimarySecondaryColor;
uniform vec3 uPrimaryAccentColor;
uniform vec3 uPrimaryGlowColor;
uniform vec3 uPrimaryFogColor;
uniform vec3 uPrimaryInkColor;
uniform vec3 uPrimaryShadowColor;
uniform vec3 uPrimaryAtmosphereColor;
uniform vec3 uPrimaryAtmosphereGlow;
uniform vec3 uSecondaryBaseColor;
uniform vec3 uSecondarySecondaryColor;
uniform vec3 uSecondaryAccentColor;
uniform vec3 uSecondaryGlowColor;
uniform vec3 uSecondaryFogColor;
uniform vec3 uSecondaryInkColor;
uniform vec3 uSecondaryShadowColor;
uniform vec3 uSecondaryAtmosphereColor;
uniform vec3 uSecondaryAtmosphereGlow;

varying float vBiomeRole;
varying vec2 vWorldXZ;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vSkyDirection;
varying vec4 vPrimaryField;
varying vec4 vSecondaryField;

${BIOME_FIELD_GLSL}

vec3 amplifyBiomeColor(vec3 color, float proximity) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 saturated = mix(vec3(luma), color, 0.51 + 0.49 * proximity);
  return clamp(saturated * (0.99 + 0.04 * proximity), 0.0, 1.0);
}

vec3 amplifyBiomeAccent(vec3 color, float proximity) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 saturated = mix(vec3(luma), color, 0.72 + 0.28 * proximity);
  return clamp(saturated * (0.98 + 0.05 * proximity), 0.0, 1.0);
}

float biomeTerrainAuthorship(float fieldKind) {
  if (fieldKind < 0.5) return 1.0;
  if (fieldKind < 1.5) return 0.68;
  if (fieldKind < 2.5) return 0.84;
  if (fieldKind < 3.5) return 0.62;
  if (fieldKind < 4.5) return 0.68;
  if (fieldKind < 5.5) return 0.84;
  if (fieldKind < 6.5) return 0.78;
  return 0.82;
}

float biomeSkyAuthorship(float fieldKind) {
  if (fieldKind < 0.5) return 1.0;
  if (fieldKind < 1.5) return 0.32;
  if (fieldKind < 2.5) return 0.38;
  if (fieldKind < 3.5) return 0.24;
  if (fieldKind < 4.5) return 0.30;
  if (fieldKind < 5.5) return 0.24;
  if (fieldKind < 6.5) return 0.30;
  return 0.38;
}

vec3 polarSkyAnchor(vec3 direction) {
  float altitude = smoothstep(-0.12, 0.72, direction.y);
  vec3 cyanHorizon = vec3(0.620, 0.715, 0.870);
  vec3 ivoryZenith = vec3(0.560, 0.650, 0.825);
  vec3 anchor = mix(cyanHorizon, ivoryZenith, altitude);
  // Horizon depth theatre: a pale exponential haze shelf brightens the world
  // seam, a noise-displaced remote ridge line rests just below the warm dawn
  // kiss, and one slow low stratus deck drifts beneath the cirrus veils.
  float azimuth = atan(direction.x, -direction.z);
  float hazeShelf = exp(-max(direction.y, 0.0) / 0.085);
  anchor = mix(anchor, vec3(0.760, 0.795, 0.885), hazeShelf * 0.54);
  float ridgeProfile = 0.012
    + 0.030 * biomeFbm3(vec2(azimuth * 1.9, 3.7))
    + 0.013 * biomeFbm2(vec2(azimuth * 5.1, 11.2));
  float ridgeMask = (1.0 - smoothstep(ridgeProfile - 0.008, ridgeProfile + 0.012, direction.y))
    * smoothstep(-0.150, -0.030, direction.y);
  anchor = mix(anchor, vec3(0.530, 0.578, 0.725), ridgeMask * 0.36);
  // Low Antarctic dawn: a warm kiss hugging the horizon around one low sun azimuth,
  // a bounded sun disc with a soft halo, and slow cirrus veils aloft. The shared
  // anchor owns this weather so every biome horizon keeps the same polar morning.
  vec3 sunDir = normalize(vec3(0.904, 0.235, -0.426));
  float sunAmount = max(dot(direction, sunDir), 0.0);
  float horizonBand = exp(-pow(max(direction.y, 0.0) / 0.15, 2.0));
  vec3 dawnKiss = vec3(0.910, 0.608, 0.373) * horizonBand * (0.3 + 0.7 * pow(sunAmount, 3.0));
  float sunDisc = smoothstep(0.9992, 0.99975, sunAmount);
  float sunHalo = pow(sunAmount, 22.0);
  anchor += dawnKiss * 0.55 + vec3(1.0, 0.85, 0.60) * (sunDisc * 0.85 + sunHalo * 0.2);
  vec2 stratusUv = vec2(azimuth * 1.15, direction.y * 16.0);
  float stratus = biomeFbm3(stratusUv + vec2(uTime * 0.0035, 1.9));
  stratus = smoothstep(0.50, 0.88, stratus)
    * smoothstep(0.025, 0.10, direction.y)
    * (1.0 - smoothstep(0.17, 0.30, direction.y));
  anchor = mix(anchor, vec3(0.520, 0.575, 0.735), stratus * 0.12);
  vec2 cirrusUv = vec2(azimuth * 2.4, direction.y * 8.0);
  float cirrus = biomeFbm3(cirrusUv + vec2(uTime * 0.006, 0.0));
  cirrus = smoothstep(0.56, 0.85, cirrus)
    * smoothstep(0.10, 0.32, direction.y)
    * (1.0 - smoothstep(0.60, 0.9, direction.y));
  anchor = mix(anchor, vec3(0.42, 0.50, 0.68), cirrus * 0.22);
  return anchor;
}

vec3 polarSnowAnchor(vec2 worldXZ) {
  float crossDrift = 0.5 + 0.5 * sin(worldXZ.x * 0.055 + worldXZ.y * 0.031);
  float longDrift = 0.5 + 0.5 * sin(worldXZ.y * 0.041 - worldXZ.x * 0.019 + 1.7);
  float pathBand = 0.5 + 0.5 * biomeFbm2(worldXZ * 0.045 + vec2(3.1, -5.7));
  float snowBand = smoothstep(
    0.24,
    0.78,
    crossDrift * 0.48 + longDrift * 0.32 + pathBand * 0.20
  );
  vec3 cyanShadow = vec3(0.545, 0.600, 0.705);
  vec3 lavenderShadow = vec3(0.572, 0.586, 0.715);
  vec3 warmSnow = vec3(0.930, 0.905, 0.850);
  vec3 coolSnow = mix(cyanShadow, lavenderShadow, longDrift * 0.28);
  return mix(coolSnow, warmSnow, 0.34 + snowBand * 0.58);
}

float biomeLocalColorEnvelope(
  vec2 worldXZ,
  vec2 centerXZ,
  float radius,
  float falloff
) {
  return biomeLocalInfluence(worldXZ, centerXZ, radius, falloff);
}

float continuousAtmosphereXZEnvelope(
  vec2 worldXZ,
  vec2 centerXZ,
  float radius,
  float falloff
) {
  return biomeLocalInfluence(worldXZ, centerXZ, radius, falloff);
}

float biomeLocalGeographyAccent(float fieldKind) {
  if (fieldKind < 0.5) return 0.035;
  if (fieldKind < 1.5) return 0.48;
  if (fieldKind < 2.5) return 0.55;
  if (fieldKind < 3.5) return 0.48;
  if (fieldKind < 4.5) return 0.55;
  if (fieldKind < 5.5) return 0.58;
  if (fieldKind < 6.5) return 0.62;
  return 0.60;
}

float assemblyGroundSignal(
  float fieldKind,
  vec4 field,
  float localColorEnvelope
) {
  float assembly = step(6.5, fieldKind);
  float runwayFeature = clamp(field.y * 0.7 + field.z + field.w * 0.35, 0.0, 1.0);
  return assembly * localColorEnvelope * (0.20 + 0.42 * runwayFeature);
}

float topologyGroundSignal(
  float fieldKind,
  vec4 field,
  float localColorEnvelope
) {
  float topology = step(5.5, fieldKind) * (1.0 - step(6.5, fieldKind));
  float archiveFeature = clamp(field.z + field.w * 0.28, 0.0, 1.0);
  return topology * localColorEnvelope * (0.16 + 0.30 * archiveFeature);
}

float biomeSkyAccentStrength(float fieldKind) {
  if (fieldKind > 0.5 && fieldKind < 1.5) return 0.36;
  if (fieldKind > 1.5 && fieldKind < 2.5) return 0.62;
  if (fieldKind > 4.5 && fieldKind < 5.5) return 0.50;
  if (fieldKind > 5.5 && fieldKind < 6.5) return 0.48;
  if (fieldKind > 6.5) return 0.52;
  return 0.36;
}

vec3 biomeSkyAccentColor(float fieldKind, vec3 accentColor, vec3 glowColor) {
  if (fieldKind > 1.5 && fieldKind < 2.5) {
    return mix(glowColor, accentColor, 0.58);
  }
  if (fieldKind > 4.5 && fieldKind < 5.5) {
    return mix(glowColor, accentColor, 0.72);
  }
  if (fieldKind > 5.5 && fieldKind < 6.5) {
    return mix(glowColor, accentColor, 0.70);
  }
  if (fieldKind > 6.5) {
    return mix(glowColor, accentColor, 0.25);
  }
  return glowColor;
}

vec3 authoredTerrainColor(
  float fieldKind,
  vec4 field,
  vec3 baseColor,
  vec3 secondaryColor,
  vec3 accentColor,
  vec3 glowColor,
  vec3 shadowColor,
  vec3 inkColor
) {
  vec3 color = mix(baseColor, secondaryColor, clamp(field.y, 0.0, 1.0) * 0.24);
  if (fieldKind < 0.5) {
    float plaqueSecondaryMix = clamp(field.y * 0.10, 0.0, 1.0);
    color = mix(baseColor, secondaryColor, plaqueSecondaryMix);
    color = mix(color, shadowColor, field.z * 0.10);
    color = mix(color, glowColor, field.w * 0.025);
  } else if (fieldKind < 1.5) {
    color = mix(color, accentColor, field.y * 0.18 + field.w * 0.08);
    color = mix(color, glowColor, field.z * 0.10);
  } else if (fieldKind < 2.5) {
    color = mix(color, accentColor, field.z * 0.34);
    color = mix(color, glowColor, field.y * 0.18);
  } else if (fieldKind < 3.5) {
    color = mix(color, accentColor, field.y * 0.22);
    color = mix(color, glowColor, field.z * 0.18);
  } else if (fieldKind < 4.5) {
    color = mix(color, shadowColor, field.y * 0.24);
    color = mix(color, accentColor, field.z * 0.20);
  } else if (fieldKind < 5.5) {
    color = mix(color, accentColor, field.y * 0.30);
    color = mix(color, glowColor, field.z * 0.16);
  } else if (fieldKind < 6.5) {
    color = mix(color, accentColor, field.z * 0.34);
    color = mix(color, secondaryColor, field.w * 0.12);
  } else {
    color = mix(color, accentColor, field.y * 0.22);
    color = mix(color, glowColor, field.z * 0.24 + field.w * 0.12);
  }
  float contour = smoothstep(0.58, 0.94, 1.0 - abs(normalize(vWorldNormal).y));
  return mix(color, inkColor, contour * 0.06);
}

float biomeSkyIdentity(float fieldKind, vec3 direction, float time, float detail) {
  vec2 uv = vec2(atan(direction.x, -direction.z) / 6.2831853 + 0.5, direction.y * 0.5 + 0.5);
  if (fieldKind < 0.5) {
    float dawn = exp(-pow((uv.y - 0.48) / 0.075, 2.0));
    float veil = exp(-pow((uv.y - 0.63) / 0.12, 2.0)) * 0.42;
    return dawn * (0.72 + 0.28 * sin(uv.x * 6.2831853))
      + veil * (0.55 + 0.45 * sin(uv.x * 12.566371 + 1.3));
  }
  if (fieldKind < 1.5) {
    vec2 sunUv = vec2(0.68, 0.62);
    float parhelion = exp(-abs(length(uv - sunUv) - 0.31) / 0.012);
    return parhelion * smoothstep(-0.15, 0.18, cos(2.0 * atan(uv.y - sunUv.y, uv.x - sunUv.x)));
  }
  if (fieldKind < 2.5) {
    float ribbon = abs(uv.y - 0.56 - 0.045 * sin(uv.x * 18.0 + biomeFbm2(uv * 4.0)));
    return exp(-ribbon * 72.0) * (0.58 + 0.42 * detail);
  }
  if (fieldKind < 3.5) {
    float lowSun = exp(-length((uv - vec2(0.76, 0.48)) * vec2(1.0, 2.4)) * 13.0);
    return lowSun + 0.15 * (1.0 - smoothstep(0.02, 0.08, abs(sin(6.0 * uv.x + 2.0 * uv.y))));
  }
  if (fieldKind < 4.5) {
    float interference = sin(19.0 * uv.x + 4.0 * sin(7.0 * uv.y)) * sin(13.0 * uv.y - 3.0 * uv.x);
    return smoothstep(0.62, 0.92, 0.5 + 0.5 * interference) * 0.42;
  }
  if (fieldKind < 5.5) {
    float auroraCenter = 0.54 + 0.22 * biomeFbm3(vec2(uv.x * 0.55, time * 0.035));
    float aurora = exp(-pow(uv.y - auroraCenter, 2.0) / 0.018);
    return aurora * (0.55 + 0.45 * sin(9.0 * uv.x + 0.16 * time + 2.0 * biomeFbm2(uv * 1.4)));
  }
  if (fieldKind < 6.5) {
    float layer = abs(fract((uv.y + 0.03 * biomeFbm2(vec2(uv.x * 4.0, 2.1))) / 0.065) - 0.5);
    float topologySkyEnvelope = exp(-pow((uv.x - 0.46) / 0.23, 2.0));
    topologySkyEnvelope *= smoothstep(0.38, 0.48, uv.y) * (1.0 - smoothstep(0.78, 0.90, uv.y));
    return (1.0 - smoothstep(0.045, 0.11, layer)) * topologySkyEnvelope;
  }
  float runwayBeam = exp(-abs(uv.x - 0.5) * 38.0) * exp(-abs(uv.y - 0.47) * 22.0);
  float knurl = sin(18.0 * (uv.x + uv.y)) * sin(18.0 * (uv.x - uv.y));
  return runwayBeam + smoothstep(0.84, 0.98, knurl) * 0.12;
}

float fieldThermalPlasmaHaze(vec2 point, float time) {
  vec2 thermalUv = point * vec2(0.19, 0.72);
  float thermalWave = sin(thermalUv.y * 7.0 + time * 0.38);
  thermalWave += biomeFbm3(thermalUv + vec2(time * 0.045, 0.0)) * 1.2;
  return smoothstep(0.56, 0.92, thermalWave * 0.5 + 0.5);
}

vec3 biomeAtmosphereTint(
  float fieldKind,
  vec3 atmosphereColor,
  vec3 atmosphereGlow,
  float signal
) {
  if (fieldKind < 0.5) return mix(atmosphereColor, atmosphereGlow, 0.34 + signal * 0.24);
  if (fieldKind < 1.5) return mix(atmosphereColor, atmosphereGlow, 0.18 + signal * 0.18);
  if (fieldKind < 2.5) return mix(atmosphereColor, atmosphereGlow, 0.42 + signal * 0.30);
  if (fieldKind < 3.5) return mix(atmosphereColor, atmosphereGlow, 0.38 + signal * 0.48);
  if (fieldKind < 4.5) return mix(atmosphereColor, atmosphereGlow, 0.45 + signal * 0.36);
  if (fieldKind < 5.5) return mix(atmosphereColor, atmosphereGlow, 0.30 + signal * 0.42);
  if (fieldKind < 6.5) return mix(atmosphereColor, atmosphereGlow, 0.28 + signal * 0.38);
  return mix(atmosphereColor, atmosphereGlow, 0.24 + signal * 0.46);
}

float weatherField(vec2 point, float fieldKind, float time) {
  vec2 moving = point - uWeatherDirection * time * uWeatherSpeed;
  if (fieldKind < 0.5) return smoothstep(0.82, 0.98, biomeValueNoise(moving * vec2(0.55, 5.8)));
  if (fieldKind < 1.5) return smoothstep(0.74, 0.94, biomeVoronoiEdge(moving * 1.7));
  if (fieldKind < 2.5) return exp(-abs(sin(moving.x * 0.43 + biomeFbm2(moving * 0.16))) * 12.0);
  if (fieldKind < 3.5) return fieldThermalPlasmaHaze(moving, time);
  if (fieldKind < 4.5) return smoothstep(0.80, 0.97, biomeValueNoise(moving * 2.1)) * 0.72;
  if (fieldKind < 5.5) return smoothstep(0.62, 0.88, biomeFbm3(moving * vec2(0.18, 1.7)) * 0.5 + 0.5);
  if (fieldKind < 6.5) return smoothstep(0.88, 0.98, sin(moving.y * 5.7) * 0.5 + 0.5);
  return smoothstep(0.84, 0.98, biomeValueNoise(moving * vec2(0.24, 7.2)));
}

vec3 boundPolarHighlights(vec3 color) {
  float peak = max(color.r, max(color.g, color.b));
  float overage = max(peak - 0.96, 0.0);
  float compressedPeak = 0.96 + (1.0 - exp(-overage * 18.0)) * 0.025;
  float boundedPeak = mix(peak, compressedPeak, step(0.96, peak));
  return max(color * (boundedPeak / max(peak, 0.0001)), vec3(0.035));
}

void main() {
  vec3 primaryBase = amplifyBiomeColor(uPrimaryBaseColor, uPrimaryProximity);
  vec3 primarySecondary = amplifyBiomeColor(uPrimarySecondaryColor, uPrimaryProximity);
  vec3 primaryAccent = amplifyBiomeAccent(uPrimaryAccentColor, uPrimaryProximity);
  vec3 primaryGlow = amplifyBiomeAccent(uPrimaryGlowColor, uPrimaryProximity);
  vec3 secondaryBase = amplifyBiomeColor(uSecondaryBaseColor, uSecondaryProximity);
  vec3 secondarySecondary = amplifyBiomeColor(uSecondarySecondaryColor, uSecondaryProximity);
  vec3 secondaryAccent = amplifyBiomeAccent(uSecondaryAccentColor, uSecondaryProximity);
  vec3 secondaryGlow = amplifyBiomeAccent(uSecondaryGlowColor, uSecondaryProximity);
  float localBlendWeight = min(1.0, uPrimaryWeight + uSecondaryWeight);
  float neutralBlendWeight = 1.0 - localBlendWeight;
  float primaryEnvironmentWeight = uPrimaryWeight * 0.42;
  float secondaryEnvironmentWeight = uSecondaryWeight * 0.42;
  float neutralEnvironmentWeight = neutralBlendWeight + localBlendWeight * 0.58;
  vec3 color;

  if (vBiomeRole > 0.5 && vBiomeRole < 1.5) {
    float horizon = smoothstep(-0.12, 0.22, vSkyDirection.y);
    float zenith = smoothstep(0.18, 0.72, vSkyDirection.y);
    vec3 primaryHorizon = mix(uPrimaryFogColor, primarySecondary, 0.22);
    vec3 secondaryHorizon = mix(uSecondaryFogColor, secondarySecondary, 0.22);
    vec3 primarySky = mix(primaryHorizon, primarySecondary, horizon);
    vec3 secondarySky = mix(secondaryHorizon, secondarySecondary, horizon);
    primarySky = mix(primarySky, primaryBase, zenith);
    secondarySky = mix(secondarySky, secondaryBase, zenith);
    vec3 sharedPolarSky = polarSkyAnchor(vSkyDirection);
    primarySky = mix(sharedPolarSky, primarySky, biomeSkyAuthorship(uPrimaryFieldKind));
    secondarySky = mix(sharedPolarSky, secondarySky, biomeSkyAuthorship(uSecondaryFieldKind));
    float primaryIdentity = biomeSkyIdentity(uPrimaryFieldKind, vSkyDirection, uTime, uShaderDetail);
    float secondaryIdentity = biomeSkyIdentity(uSecondaryFieldKind, vSkyDirection, uTime, uShaderDetail);
    vec3 primarySkyAccent = biomeSkyAccentColor(
      uPrimaryFieldKind,
      uPrimaryAtmosphereColor,
      uPrimaryAtmosphereGlow
    );
    vec3 secondarySkyAccent = biomeSkyAccentColor(
      uSecondaryFieldKind,
      uSecondaryAtmosphereColor,
      uSecondaryAtmosphereGlow
    );
    primarySky = mix(
      primarySky,
      primarySkyAccent,
      clamp(primaryIdentity, 0.0, 1.0) * biomeSkyAccentStrength(uPrimaryFieldKind)
    );
    secondarySky = mix(
      secondarySky,
      secondarySkyAccent,
      clamp(secondaryIdentity, 0.0, 1.0) * biomeSkyAccentStrength(uSecondaryFieldKind)
    );
    color = sharedPolarSky * neutralEnvironmentWeight;
    color += primarySky * primaryEnvironmentWeight;
    color += secondarySky * secondaryEnvironmentWeight;
  } else {
    vec3 primaryTerrain = authoredTerrainColor(
      uPrimaryFieldKind,
      vPrimaryField,
      primaryBase,
      primarySecondary,
      primaryAccent,
      primaryGlow,
      uPrimaryShadowColor,
      uPrimaryInkColor
    );
    vec3 secondaryTerrain = authoredTerrainColor(
      uSecondaryFieldKind,
      vSecondaryField,
      secondaryBase,
      secondarySecondary,
      secondaryAccent,
      secondaryGlow,
      uSecondaryShadowColor,
      uSecondaryInkColor
    );
    vec3 sharedPolarSnow = polarSnowAnchor(vWorldXZ);
    float localGeography = step(1.5, vBiomeRole);
    float primaryLocalColorEnvelope = biomeLocalColorEnvelope(
      vWorldXZ,
      uPrimaryCenterXZ,
      uPrimaryRadius,
      uPrimaryFalloff
    );
    float secondaryLocalColorEnvelope = biomeLocalColorEnvelope(
      vWorldXZ,
      uSecondaryCenterXZ,
      uSecondaryRadius,
      uSecondaryFalloff
    );
    float primaryBaseAuthorship = biomeTerrainAuthorship(uPrimaryFieldKind);
    float secondaryBaseAuthorship = biomeTerrainAuthorship(uSecondaryFieldKind);
    float primaryAuthorship = mix(
      primaryBaseAuthorship * 0.16,
      primaryBaseAuthorship,
      primaryLocalColorEnvelope
    );
    float secondaryAuthorship = mix(
      secondaryBaseAuthorship * 0.16,
      secondaryBaseAuthorship,
      secondaryLocalColorEnvelope
    );
    primaryAuthorship = mix(primaryAuthorship, 0.92, localGeography);
    secondaryAuthorship = mix(secondaryAuthorship, 0.92, localGeography);
    primaryTerrain = mix(sharedPolarSnow, primaryTerrain, primaryAuthorship);
    secondaryTerrain = mix(sharedPolarSnow, secondaryTerrain, secondaryAuthorship);
    float primaryTerrainInfluence = primaryLocalColorEnvelope * uPrimaryWeight;
    float secondaryTerrainInfluence = secondaryLocalColorEnvelope * uSecondaryWeight;
    float terrainInfluence = min(
      1.0,
      primaryTerrainInfluence + secondaryTerrainInfluence
    );
    color = sharedPolarSnow * (1.0 - terrainInfluence);
    color += primaryTerrain * primaryTerrainInfluence;
    color += secondaryTerrain * secondaryTerrainInfluence;
    float primaryAssemblySignal = assemblyGroundSignal(
      uPrimaryFieldKind,
      vPrimaryField,
      primaryLocalColorEnvelope
    ) * (1.0 - localGeography);
    float secondaryAssemblySignal = assemblyGroundSignal(
      uSecondaryFieldKind,
      vSecondaryField,
      secondaryLocalColorEnvelope
    ) * (1.0 - localGeography);
    vec3 primaryAssemblyColor = mix(
      primaryAccent,
      primaryGlow,
      clamp(vPrimaryField.w, 0.0, 1.0)
    );
    vec3 secondaryAssemblyColor = mix(
      secondaryAccent,
      secondaryGlow,
      clamp(vSecondaryField.w, 0.0, 1.0)
    );
    color = mix(
      color,
      primaryAssemblyColor,
      primaryAssemblySignal * uPrimaryWeight
    );
    color = mix(
      color,
      secondaryAssemblyColor,
      secondaryAssemblySignal * uSecondaryWeight
    );
    float primaryTopologySignal = topologyGroundSignal(
      uPrimaryFieldKind,
      vPrimaryField,
      primaryLocalColorEnvelope
    ) * (1.0 - localGeography);
    float secondaryTopologySignal = topologyGroundSignal(
      uSecondaryFieldKind,
      vSecondaryField,
      secondaryLocalColorEnvelope
    ) * (1.0 - localGeography);
    vec3 primaryTopologyColor = mix(primarySecondary, primaryAccent, 0.82);
    vec3 secondaryTopologyColor = mix(secondarySecondary, secondaryAccent, 0.82);
    color = mix(
      color,
      primaryTopologyColor,
      primaryTopologySignal * uPrimaryWeight
    );
    color = mix(
      color,
      secondaryTopologyColor,
      secondaryTopologySignal * uSecondaryWeight
    );
    if (vBiomeRole > 1.5) {
      float localLight = max(dot(normalize(vWorldNormal), normalize(vec3(-0.42, 0.82, 0.38))), 0.0);
      float localFacet = mix(0.90 + 0.10 * localLight, 0.74 + 0.26 * localLight, step(0.5, uPrimaryFieldKind));
      float localAccent = biomeLocalGeographyAccent(uPrimaryFieldKind);
      color = mix(color, primaryAccent, localAccent) * localFacet;
    }
  }

  float weatherEnvelope = continuousAtmosphereXZEnvelope(
    uTravelerXZ,
    uPrimaryCenterXZ,
    uPrimaryRadius,
    uPrimaryFalloff
  );
  if (vBiomeRole < 0.5 || vBiomeRole > 1.5) {
    weatherEnvelope = continuousAtmosphereXZEnvelope(
      vWorldXZ,
      uPrimaryCenterXZ,
      uPrimaryRadius,
      uPrimaryFalloff
    );
  }
  float weather = weatherField(vWorldXZ, uWeatherFieldKind, uTime) *
    uWeatherStrength * uPrimaryAtmosphereStrength * weatherEnvelope;
  vec3 atmosphereTint = biomeAtmosphereTint(
    uWeatherFieldKind,
    uPrimaryAtmosphereColor,
    uPrimaryAtmosphereGlow,
    weather
  );
  color = mix(color, atmosphereTint, weather * (vBiomeRole > 0.5 ? 0.22 : 0.14));

  if (vBiomeRole < 0.5 || vBiomeRole > 1.5) {
    vec3 neutralLightDirection = normalize(vec3(-0.42, 0.82, 0.38));
    vec3 blendedLightDirection = normalize(
      neutralLightDirection * neutralEnvironmentWeight +
      uPrimaryLightDirection * primaryEnvironmentWeight +
      uSecondaryLightDirection * secondaryEnvironmentWeight
    );
    float wrappedLight = clamp(dot(normalize(vWorldNormal), blendedLightDirection) * 0.5 + 0.5, 0.0, 1.0);
    float toonLight = floor(wrappedLight * 4.0 + 0.5) / 4.0;
    color *= 0.84 + toonLight * 0.18;

    float polarDistance = length(vWorldXZ - uTravelerXZ);
    float blendedFogDensity =
      0.0065 * neutralEnvironmentWeight +
      uPrimaryFogDensity * primaryEnvironmentWeight +
      uSecondaryFogDensity * secondaryEnvironmentWeight;
    float blendedFogHeightFalloff =
      0.34 * neutralEnvironmentWeight +
      uPrimaryFogHeightFalloff * primaryEnvironmentWeight +
      uSecondaryFogHeightFalloff * secondaryEnvironmentWeight;
    float heightFog = exp(-max(0.0, vWorldPosition.y) * blendedFogHeightFalloff);
    float fogFactor = (1.0 - exp(-polarDistance * blendedFogDensity)) * heightFog;
    vec3 neutralFogColor = vec3(0.545, 0.612, 0.745);
    vec3 blendedFogColor = neutralFogColor * neutralEnvironmentWeight +
      uPrimaryFogColor * primaryEnvironmentWeight +
      uSecondaryFogColor * secondaryEnvironmentWeight;
    color = mix(color, blendedFogColor, clamp(fogFactor, 0.0, 0.46));
    // Horizon theatre seam: the far terrain rim dissolves into the same pale
    // haze shelf the sky anchor paints, so ground never hard-cuts to sky.
    float horizonFade = smoothstep(18.0, 25.5, polarDistance);
    color = mix(color, vec3(0.695, 0.755, 0.880), horizonFade * 0.88);
  }
  color = boundPolarHighlights(color);
  float dither = (biomeHash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(color + dither, 0.03, 0.99), 1.0);
}
`;
