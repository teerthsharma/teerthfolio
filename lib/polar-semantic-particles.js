import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
} from "./polar-station-personality.js";

const TAU = Math.PI * 2;
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

export const POLAR_PARTICLE_SOURCE_CREDIT = Object.freeze({
  adaptation:
    "Original bounded WebGL/R3F implementation for teerthfolio; no GLB or source asset is copied.",
  concepts: Object.freeze([
    "area-aware surface distribution",
    "per-particle offset and velocity",
    "cursor/traveler pusher",
    "spring-return envelope",
    "wrapped diffuse",
    "fractal displacement",
    "displacement glow",
    "Fresnel containment",
  ]),
  inspiration:
    "Cortiz / cortiz2894 hologram-particles, an Igloo Inc. particle-system study; used with user-supplied author permission and visible attribution.",
  source: "donotcommit/hologram-particles",
});

export const POLAR_PARTICLE_QUALITY = Object.freeze({
  low: Object.freeze({ countPerStation: 64, pointScale: 0.82 }),
  medium: Object.freeze({ countPerStation: 192, pointScale: 1 }),
  high: Object.freeze({ countPerStation: 512, pointScale: 1.3 }),
});

export const POLAR_PARTICLE_STATION_ORDER = STATION_PERSONALITY_ORDER;

const particleEngineProfiles = Object.freeze({
  "observatory-plaque": Object.freeze({
    behavior: 0,
    bounds: Object.freeze([2.5, 1.65, 1.65]),
    velocity: Object.freeze([0.06, 0.27, 0.038]),
  }),
  "s2-kernel-core": Object.freeze({
    behavior: 1,
    bounds: Object.freeze([1.45, 1.75, 1.45]),
    velocity: Object.freeze([-0.18, 0.12, -0.18]),
  }),
  "manifold-reactor": Object.freeze({
    behavior: 2,
    bounds: Object.freeze([1.85, 1.55, 1.85]),
    velocity: Object.freeze([0.3, 0.053, 0.3]),
  }),
  "field-chamber-coils": Object.freeze({
    behavior: 3,
    bounds: Object.freeze([2.15, 1.35, 1.35]),
    velocity: Object.freeze([-0.24, 0.075, -0.15]),
  }),
  "qpu-ice-bridge": Object.freeze({
    behavior: 4,
    bounds: Object.freeze([2.5, 1.15, 1.1]),
    velocity: Object.freeze([0.42, 0.03, 0]),
  }),
  "upstream-radio-mast": Object.freeze({
    behavior: 5,
    bounds: Object.freeze([1.7, 2.5, 1.7]),
    velocity: Object.freeze([0.3, 0.27, -0.21]),
  }),
  "topology-archive-wall": Object.freeze({
    behavior: 6,
    bounds: Object.freeze([2.55, 1.55, 1.05]),
    velocity: Object.freeze([0.135, 0.068, 0.12]),
  }),
  "assembly-tool-locker": Object.freeze({
    behavior: 7,
    bounds: Object.freeze([1.9, 1.8, 1.5]),
    velocity: Object.freeze([0.12, -0.24, 0.06]),
  }),
});

function stationPersonalityParticleIdentity(stationId) {
  const identity = STATION_PERSONALITY_PROFILES[stationId].particles;
  return Object.freeze({
    ...particleEngineProfiles[stationId],
    identity,
    family: identity.family,
    color: identity.color,
    semantic: identity.semanticLanguage,
  });
}

export const POLAR_PARTICLE_LANGUAGE = Object.freeze(Object.fromEntries(
  STATION_PERSONALITY_ORDER.map((stationId) => [
    stationId,
    stationPersonalityParticleIdentity(stationId),
  ]),
));

function normalizeQuality(quality) {
  return quality === "low" || quality === "medium" ? quality : "high";
}

function hash01(a, b, salt = 0) {
  const raw = Math.sin((a + 1) * 127.1 + (b + 3) * 311.7 + salt * 74.7) * 43758.5453;
  return raw - Math.floor(raw);
}

function sampleEllipsoidSurface(index, count, bounds, stationIndex) {
  const y01 = (index + 0.5) / count;
  const y = 1 - y01 * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = TAU * ((index * GOLDEN_RATIO_CONJUGATE + hash01(index, stationIndex, 3)) % 1);
  const surfaceBias = 0.72 + hash01(index, stationIndex, 4) * 0.28;
  return [
    Math.cos(angle) * radius * bounds[0] * surfaceBias,
    (y * 0.5 + 0.5) * bounds[1] + 0.08,
    Math.sin(angle) * radius * bounds[2] * surfaceBias,
  ];
}

export function createPolarSemanticParticleAttributes(quality = "high") {
  const tierName = normalizeQuality(quality);
  const tier = POLAR_PARTICLE_QUALITY[tierName];
  const total = POLAR_PARTICLE_STATION_ORDER.length * tier.countPerStation;
  const centers = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const locals = new Float32Array(total * 3);
  const seeds = new Float32Array(total * 4);
  const stations = new Float32Array(total);
  const behaviors = new Float32Array(total);
  const bounds = new Float32Array(total * 3);
  const velocities = new Float32Array(total * 3);
  let cursor = 0;

  for (let stationIndex = 0; stationIndex < POLAR_PARTICLE_STATION_ORDER.length; stationIndex += 1) {
    const stationId = POLAR_PARTICLE_STATION_ORDER[stationIndex];
    const station = STATION_WORLD_SCHEMA.stations[stationId];
    const language = POLAR_PARTICLE_LANGUAGE[stationId];
    const color = Number.parseInt(language.color.slice(1), 16);
    const red = ((color >> 16) & 255) / 255;
    const green = ((color >> 8) & 255) / 255;
    const blue = (color & 255) / 255;

    for (let particleIndex = 0; particleIndex < tier.countPerStation; particleIndex += 1) {
      const local = sampleEllipsoidSurface(
        particleIndex,
        tier.countPerStation,
        language.bounds,
        stationIndex,
      );
      const vectorOffset = cursor * 3;
      const seedOffset = cursor * 4;
      centers[vectorOffset] = station.center.x;
      centers[vectorOffset + 1] = 0.12;
      centers[vectorOffset + 2] = station.center.z;
      bounds[vectorOffset] = language.bounds[0];
      bounds[vectorOffset + 1] = language.bounds[1];
      bounds[vectorOffset + 2] = language.bounds[2];
      locals[vectorOffset] = local[0];
      locals[vectorOffset + 1] = local[1];
      locals[vectorOffset + 2] = local[2];
      colors[vectorOffset] = red;
      colors[vectorOffset + 1] = green;
      colors[vectorOffset + 2] = blue;
      velocities[vectorOffset] = language.velocity[0] * (0.74 + hash01(particleIndex, stationIndex, 5) * 0.52);
      velocities[vectorOffset + 1] = language.velocity[1] * (0.74 + hash01(particleIndex, stationIndex, 6) * 0.52);
      velocities[vectorOffset + 2] = language.velocity[2] * (0.74 + hash01(particleIndex, stationIndex, 7) * 0.52);
      seeds[seedOffset] = hash01(particleIndex, stationIndex, 8);
      seeds[seedOffset + 1] = hash01(particleIndex, stationIndex, 9);
      seeds[seedOffset + 2] = hash01(particleIndex, stationIndex, 10);
      seeds[seedOffset + 3] = hash01(particleIndex, stationIndex, 11);
      stations[cursor] = stationIndex;
      behaviors[cursor] = language.behavior;
      cursor += 1;
    }
  }

  return Object.freeze({
    behaviors,
    bounds,
    centers,
    colors,
    count: total,
    locals,
    quality: tierName,
    seeds,
    stations,
    velocities,
  });
}

export function polarParticleStationIndex(stationId) {
  const index = POLAR_PARTICLE_STATION_ORDER.indexOf(stationId);
  return index >= 0 ? index : 0;
}

export function polarParticleCount(quality = "high") {
  return createPolarSemanticParticleAttributes(quality).count;
}

export const POLAR_PARTICLE_VERTEX_SHADER = `
uniform float uActiveStation;
uniform float uImpulseAge;
uniform float uMotion;
uniform float uMorphPhase;
uniform float uPointScale;
uniform float uTime;
uniform vec2 uTravelerXZ;

attribute float aBehavior;
attribute vec3 aBounds;
attribute vec3 aCenter;
attribute vec3 aColor;
attribute vec3 aLocal;
attribute vec4 aSeed;
attribute float aStation;
attribute vec3 aVelocity;

varying vec3 vParticleColor;
varying float vGlow;
varying float vOpacity;
varying float vSeed;
varying vec3 vSurfaceNormal;

float polarParticleHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float polarParticleNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(polarParticleHash(i), polarParticleHash(i + vec2(1.0, 0.0)), f.x),
    mix(polarParticleHash(i + vec2(0.0, 1.0)), polarParticleHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float polarParticleFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 1.0;
  for (int octave = 0; octave < 3; octave += 1) {
    value += (polarParticleNoise(p) * 2.0 - 1.0) * amplitude;
    p *= 2.0;
    amplitude *= 0.35;
  }
  return value;
}

mat2 polarParticleRotation(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  float time = uTime * uMotion;
  vec3 local = aLocal;
  float phase = fract(aSeed.x + time * (0.035 + aSeed.y * 0.055));
  float noiseSignal = polarParticleFbm(aLocal.xz * 0.8 + vec2(time * 0.06, aSeed.z * 5.0));

  if (aBehavior < 0.5) {
    local.y += phase * 0.34;
    local.xz += vec2(noiseSignal, -noiseSignal) * 0.055;
  } else if (aBehavior < 1.5) {
    float interrupt = smoothstep(0.78, 0.9, fract(time * 0.72 + aSeed.x));
    local += aVelocity * interrupt * 0.62;
    local.xz *= 1.0 - interrupt * 0.16;
  } else if (aBehavior < 2.5) {
    local.xz = polarParticleRotation(time * (0.22 + aSeed.y * 0.16)) * local.xz;
    local.y += sin(time * 0.8 + aSeed.z * 6.28318) * 0.055;
  } else if (aBehavior < 3.5) {
    float compression = 0.8 + sin(time * 0.92 + aSeed.x * 6.28318) * 0.12;
    local.xz *= compression;
    local.y += noiseSignal * 0.07;
  } else if (aBehavior < 4.5) {
    local.x = mix(-2.25, 2.25, fract(aSeed.x + time * (0.12 + aSeed.y * 0.08)));
    local.y += sin(local.x * 1.7 + time) * 0.07;
    local.z *= 0.62;
  } else if (aBehavior < 5.5) {
    float bearing = fract(aSeed.x + time * (0.11 + aSeed.y * 0.08));
    local += aVelocity * bearing * 2.2;
  } else if (aBehavior < 6.5) {
    float trace = aSeed.x * 6.28318 + time * 0.18;
    local.x += sin(trace * 1.7) * 0.2;
    local.y += cos(trace * 2.3) * 0.08;
    local.z += sin(trace * 1.1) * 0.12;
  } else {
    float inspection = abs(sin(time * 0.66 + aSeed.x * 6.28318));
    local.y += inspection * 0.14;
    local.xz += aVelocity.xz * (inspection - 0.5) * 0.42;
  }

  float morphPhase = uMorphPhase * (0.42 + aSeed.y * 0.38);
  vec3 morphTarget = normalize(aLocal + vec3(0.0001)) * aBounds * (0.72 + aSeed.z * 0.12);
  morphTarget += aVelocity * (aSeed.w - 0.5) * 0.8;
  local = mix(local, morphTarget, morphPhase);

  vec3 normalizedContainment = local / max(aBounds, vec3(0.001));
  float containmentLength = length(normalizedContainment);
  if (containmentLength > 1.0) {
    local /= containmentLength;
  }

  vec3 worldPosition = aCenter + local;
  vec2 travelerDelta = worldPosition.xz - uTravelerXZ;
  float travelerDistance = length(travelerDelta);
  float pusher = exp(-travelerDistance * travelerDistance * 1.45) * uMotion;
  vec2 pusherDirection = travelerDistance > 0.0001 ? travelerDelta / travelerDistance : vec2(0.0);
  float springReturn = exp(-uImpulseAge * 3.8) * cos(uImpulseAge * 8.6);
  worldPosition.xz += pusherDirection * pusher * (0.11 + springReturn * 0.035);

  float stationActive = 1.0 - step(0.45, abs(aStation - uActiveStation));
  float activeDistance = distance(aCenter.xz, uTravelerXZ);
  float activeReveal = stationActive * (1.0 - smoothstep(6.0, 14.0, activeDistance));
  float localReveal = 1.0 - smoothstep(3.2, 9.0, distance(worldPosition.xz, uTravelerXZ));
  float reveal = max(activeReveal, localReveal);
  vOpacity = reveal * (0.34 + aSeed.w * 0.46);
  vGlow = clamp(pusher * 0.85 + stationActive * 0.2 + abs(noiseSignal) * 0.12, 0.0, 1.0);
  vParticleColor = aColor;
  vSeed = aSeed.x;
  vSurfaceNormal = normalize(normalMatrix * normalize(local / max(aBounds, vec3(0.001))));

  vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float perspectiveSize = uPointScale * (0.82 + aSeed.z * 0.72) / max(1.0, -viewPosition.z);
  gl_PointSize = max(1.0, perspectiveSize * reveal);
}
`;

export const POLAR_PARTICLE_FRAGMENT_SHADER = `
varying vec3 vParticleColor;
varying float vGlow;
varying float vOpacity;
varying float vSeed;
varying vec3 vSurfaceNormal;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radiusSquared = dot(point, point);
  if (radiusSquared > 1.0) discard;
  float normalZ = sqrt(max(0.0, 1.0 - radiusSquared));
  vec3 spriteNormal = normalize(vec3(point, normalZ));
  vec3 opticalNormal = normalize(mix(spriteNormal, vSurfaceNormal, 0.24));
  vec3 lightDirection = normalize(vec3(-0.38, 0.72, 0.58));
  float wrappedDiffuse = clamp((dot(opticalNormal, lightDirection) + 0.46) / 1.46, 0.0, 1.0);
  float fresnel = pow(1.0 - max(opticalNormal.z, 0.0), 2.8);
  float containment = 1.0 - smoothstep(0.58, 1.0, sqrt(radiusSquared));
  float dither = fract(sin(dot(gl_FragCoord.xy + vSeed * 13.0, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 color = vParticleColor * (0.72 + wrappedDiffuse * 0.34);
  color += mix(vParticleColor, vec3(1.0), 0.58) * (fresnel * 0.16 + vGlow * 0.2);
  float alpha = containment * vOpacity * (0.72 + dither * 0.08);
  gl_FragColor = vec4(color, alpha);
}
`;
