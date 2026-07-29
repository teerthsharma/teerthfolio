import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
} from "./polar-station-personality.js";

const TAU = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
// Particle system's shared emitter center height above the snow (aCenter.y).
const EMITTER_CENTER_Y = 0.12;

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

/**
 * Facility emitter profiles for the rebuilt Antarctic camp. Every field is
 * authored in STATION-LOCAL space and rotated into world space at attribute
 * build time by `yawDegrees` (the station monument's yaw), so particles stay
 * pinned to real facility features:
 *
 * - anchor: local feature the matter emits from (y is height above the snow)
 * - spread: emitter half-extents around the anchor before rotation
 * - velocity: mean local motion direction/speed (per-particle randomized)
 * - bounds: world-axis containment ellipsoid enclosing the full motion
 * - emitterShape: "box" sheet/volume or "disc" radial burst (chips, sparks)
 * - whiten: how far the identity color is pushed toward frost white so cold
 *   matter (snow, chips, breath) stays pale while hot matter keeps its hue
 */
const particleEngineProfiles = Object.freeze({
  // Observatory: gentle snow motes settling over the dome plaza.
  "observatory-plaque": Object.freeze({
    behavior: 0,
    yawDegrees: 0,
    anchor: Object.freeze([0, 1.35, 0]),
    spread: Object.freeze([2.3, 0.8, 2.3]),
    velocity: Object.freeze([0.08, -0.5, 0.05]),
    bounds: Object.freeze([2.7, 2.4, 2.7]),
    emitterShape: "box",
    whiten: 0.5,
  }),
  // Server hut: cool data motes rising from the cooling louvres / fan wall.
  "s2-kernel-core": Object.freeze({
    behavior: 1,
    yawDegrees: 38,
    anchor: Object.freeze([-0.98, 0.78, 0.3]),
    spread: Object.freeze([0.07, 0.14, 0.72]),
    velocity: Object.freeze([-0.26, 0.55, 0]),
    bounds: Object.freeze([1.8, 1.9, 1.8]),
    emitterShape: "box",
    whiten: 0,
  }),
  // Generator hall: warm ember drift leaving the exhaust stack, leeward.
  "manifold-reactor": Object.freeze({
    behavior: 2,
    yawDegrees: -27,
    anchor: Object.freeze([-0.95, 1.52, -0.42]),
    spread: Object.freeze([0.1, 0.07, 0.1]),
    velocity: Object.freeze([-0.34, 0.8, -0.24]),
    bounds: Object.freeze([2.1, 2.8, 2.1]),
    emitterShape: "box",
    whiten: 0,
  }),
  // Heat plant: brief heat-shimmer sparks over the helical elements.
  "field-chamber-coils": Object.freeze({
    behavior: 3,
    yawDegrees: 74,
    anchor: Object.freeze([0, 1.0, 0]),
    spread: Object.freeze([0.88, 0.1, 0.28]),
    velocity: Object.freeze([0, 0.62, 0]),
    bounds: Object.freeze([1.6, 1.9, 1.6]),
    emitterShape: "box",
    whiten: 0,
  }),
  // Drill rig: ice chips thrown up around the borehole collar, falling back.
  "qpu-ice-bridge": Object.freeze({
    behavior: 4,
    yawDegrees: -48,
    anchor: Object.freeze([1.52, 0.42, 0]),
    spread: Object.freeze([0.22, 0.05, 0.22]),
    velocity: Object.freeze([0, 1.3, 0]),
    bounds: Object.freeze([2.4, 1.6, 2.4]),
    emitterShape: "disc",
    whiten: 0.3,
  }),
  // Radio: signal motes climbing the mast column in a slow spiral.
  "upstream-radio-mast": Object.freeze({
    behavior: 5,
    yawDegrees: 19,
    anchor: Object.freeze([0, 0.35, 0]),
    spread: Object.freeze([0.14, 0.1, 0.14]),
    velocity: Object.freeze([0, 0.95, 0]),
    bounds: Object.freeze([1.3, 2.5, 1.3]),
    emitterShape: "box",
    whiten: 0,
  }),
  // Cold store: frost breath exhaled from the open racking bay, sinking.
  "topology-archive-wall": Object.freeze({
    behavior: 6,
    yawDegrees: 61,
    anchor: Object.freeze([0, 0.52, -0.78]),
    spread: Object.freeze([1.15, 0.32, 0.09]),
    velocity: Object.freeze([0, -0.09, -0.5]),
    bounds: Object.freeze([2.3, 1.4, 2.3]),
    emitterShape: "box",
    whiten: 0.5,
  }),
  // Machine shop: brief orange weld sparks off the jig, pulled down by gravity.
  "assembly-tool-locker": Object.freeze({
    behavior: 7,
    yawDegrees: 83.68091167100431,
    anchor: Object.freeze([0.6, 0.46, 0.12]),
    spread: Object.freeze([0.06, 0.04, 0.06]),
    velocity: Object.freeze([0, 1.0, 0]),
    bounds: Object.freeze([1.8, 1.7, 1.8]),
    emitterShape: "disc",
    whiten: 0,
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

/**
 * Deterministic emitter sample in station-local space. "box" fills the spread
 * volume (sheets, walls, snowfields); "disc" fills a radial footprint and also
 * reports the radial direction so chips/sparks can fly outward from the hole
 * or the weld jig.
 */
function sampleEmitterOffset(profile, particleIndex, stationIndex) {
  if (profile.emitterShape === "disc") {
    const angle = hash01(particleIndex, stationIndex, 3) * TAU;
    const radius = Math.sqrt(hash01(particleIndex, stationIndex, 4));
    return {
      offset: [
        Math.cos(angle) * radius * profile.spread[0],
        (hash01(particleIndex, stationIndex, 5) * 2 - 1) * profile.spread[1],
        Math.sin(angle) * radius * profile.spread[2],
      ],
      radial: [Math.cos(angle), Math.sin(angle)],
    };
  }
  return {
    offset: [
      (hash01(particleIndex, stationIndex, 3) * 2 - 1) * profile.spread[0],
      (hash01(particleIndex, stationIndex, 4) * 2 - 1) * profile.spread[1],
      (hash01(particleIndex, stationIndex, 5) * 2 - 1) * profile.spread[2],
    ],
    radial: null,
  };
}

/**
 * Per-particle local motion vector for each facility behavior. Radial
 * behaviors (borehole chips, weld sparks) burst outward from the emitter axis;
 * everything else jitters around the profile's mean velocity.
 */
function sampleParticleVelocity(profile, radial, particleIndex, stationIndex) {
  const jitterA = hash01(particleIndex, stationIndex, 6);
  const jitterB = hash01(particleIndex, stationIndex, 7);
  if (radial) {
    const radialSpeed =
      profile.behavior === 7 ? 1.0 + jitterA * 1.3 : 0.6 + jitterA * 0.8;
    return [
      radial[0] * radialSpeed,
      profile.velocity[1] * (0.7 + jitterB * 0.6),
      radial[1] * radialSpeed,
    ];
  }
  return [
    profile.velocity[0] * (0.72 + jitterA * 0.56),
    profile.velocity[1] * (0.72 + jitterB * 0.56),
    profile.velocity[2] * (0.72 + hash01(particleIndex, stationIndex, 12) * 0.56),
  ];
}

function rotateYaw(vector, cosYaw, sinYaw) {
  return [
    vector[0] * cosYaw + vector[2] * sinYaw,
    vector[1],
    -vector[0] * sinYaw + vector[2] * cosYaw,
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
    const yaw = language.yawDegrees * DEG_TO_RAD;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const color = Number.parseInt(language.color.slice(1), 16);
    const whiten = language.whiten;
    const red = (((color >> 16) & 255) / 255) * (1 - whiten) + whiten;
    const green = (((color >> 8) & 255) / 255) * (1 - whiten) + whiten;
    const blue = ((color & 255) / 255) * (1 - whiten) + whiten;

    for (let particleIndex = 0; particleIndex < tier.countPerStation; particleIndex += 1) {
      const sample = sampleEmitterOffset(language, particleIndex, stationIndex);
      const spawnLocal = [
        language.anchor[0] + sample.offset[0],
        language.anchor[1] + sample.offset[1],
        language.anchor[2] + sample.offset[2],
      ];
      const spawn = rotateYaw(spawnLocal, cosYaw, sinYaw);
      const radialWorld = sample.radial
        ? rotateYaw([sample.radial[0], 0, sample.radial[1]], cosYaw, sinYaw)
        : null;
      const velocity = sampleParticleVelocity(
        language,
        radialWorld ? [radialWorld[0], radialWorld[2]] : null,
        particleIndex,
        stationIndex,
      );
      const velocityWorld = sample.radial
        ? velocity
        : rotateYaw(velocity, cosYaw, sinYaw);
      const vectorOffset = cursor * 3;
      const seedOffset = cursor * 4;
      centers[vectorOffset] = station.center.x;
      centers[vectorOffset + 1] = EMITTER_CENTER_Y;
      centers[vectorOffset + 2] = station.center.z;
      bounds[vectorOffset] = language.bounds[0];
      bounds[vectorOffset + 1] = language.bounds[1];
      bounds[vectorOffset + 2] = language.bounds[2];
      locals[vectorOffset] = spawn[0];
      locals[vectorOffset + 1] = spawn[1] - EMITTER_CENTER_Y;
      locals[vectorOffset + 2] = spawn[2];
      colors[vectorOffset] = red;
      colors[vectorOffset + 1] = green;
      colors[vectorOffset + 2] = blue;
      velocities[vectorOffset] = velocityWorld[0];
      velocities[vectorOffset + 1] = velocityWorld[1];
      velocities[vectorOffset + 2] = velocityWorld[2];
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

/**
 * One shared program for all eight facilities. Each behavior branch is a
 * looping particle life: phase = fract(seed + time * rate), motion authored
 * along the pre-rotated per-particle velocity, and a smoothstep envelope at
 * both ends of the loop so matter condenses and dissipates instead of popping.
 * Reduced motion drives uMotion to 0, freezing every phase at its seed.
 */
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

float lifeEnvelope(float phase, float fadeIn, float fadeOut) {
  return smoothstep(0.0, fadeIn, phase) * (1.0 - smoothstep(1.0 - fadeOut, 1.0, phase));
}

void main() {
  float time = uTime * uMotion;
  vec3 local = aLocal;
  float envelope = 1.0;
  float glow = 0.0;
  float sizeScale = 1.0;
  float wobble = polarParticleNoise(aLocal.xz * 1.4 + vec2(time * 0.11, aSeed.z * 7.0)) * 2.0 - 1.0;

  if (aBehavior < 0.5) {
    // Observatory: gentle snow motes drifting down over the dome plaza.
    float phase = fract(aSeed.x + time * (0.045 + aSeed.y * 0.035));
    local += aVelocity * phase * 2.4;
    local.xz += vec2(wobble, -wobble) * (0.1 + phase * 0.26);
    envelope = lifeEnvelope(phase, 0.16, 0.14);
    sizeScale = 1.0;
  } else if (aBehavior < 1.5) {
    // Server hut: cool data motes streaming up off the louvre wall.
    float phase = fract(aSeed.x + time * (0.14 + aSeed.y * 0.1));
    local += aVelocity * phase * 1.25;
    local.y += phase * phase * 0.12;
    envelope = lifeEnvelope(phase, 0.1, 0.2);
    glow = 0.35 + 0.35 * sin(time * (2.6 + aSeed.z * 3.4) + aSeed.w * 6.28318);
    sizeScale = 0.85;
  } else if (aBehavior < 2.5) {
    // Generator: warm embers leaving the stack, drifting leeward and cooling.
    float phase = fract(aSeed.x + time * (0.11 + aSeed.y * 0.07));
    local += aVelocity * phase * 1.7;
    local.xz += vec2(wobble, wobble * 0.6) * phase * 0.16;
    envelope = lifeEnvelope(phase, 0.06, 0.34);
    glow = (1.0 - phase) * (0.55 + 0.3 * sin(time * 5.0 + aSeed.w * 6.28318));
    sizeScale = 1.15 - phase * 0.4;
  } else if (aBehavior < 3.5) {
    // Heat plant: brief shimmer sparks over the heating elements.
    float phase = fract(aSeed.x + time * (0.42 + aSeed.y * 0.34));
    local += aVelocity * phase * 0.6;
    local.xz += vec2(wobble, -wobble) * 0.05;
    envelope = lifeEnvelope(phase, 0.14, 0.12) * step(phase, 0.62);
    glow = (1.0 - phase) * 0.5;
    sizeScale = 0.62;
  } else if (aBehavior < 4.5) {
    // Drill rig: ice chips popped from the borehole, falling under gravity.
    float phase = fract(aSeed.x + time * (0.5 + aSeed.y * 0.24));
    local += aVelocity * phase;
    local.y -= 2.4 * phase * phase;
    local.y = max(local.y, 0.05 - aCenter.y);
    envelope = lifeEnvelope(phase, 0.05, 0.22);
    glow = 0.15;
    sizeScale = 0.85;
  } else if (aBehavior < 5.5) {
    // Radio: signal motes climbing the mast in a slow spiral.
    float phase = fract(aSeed.x + time * (0.13 + aSeed.y * 0.07));
    float spiral = aSeed.z * 6.28318 + phase * 2.6;
    local.y += phase * 1.65;
    local.xz += vec2(cos(spiral), sin(spiral)) * (0.3 + phase * 0.18);
    envelope = lifeEnvelope(phase, 0.08, 0.24);
    glow = 0.3 + 0.4 * smoothstep(0.4, 1.0, fract(phase * 3.0));
    sizeScale = 0.85;
  } else if (aBehavior < 6.5) {
    // Cold store: frost breath exhaled from the bay in slow cohort puffs.
    float phase = fract(aSeed.x * 0.34 + time * (0.09 + aSeed.y * 0.025));
    local += aVelocity * phase * 1.5;
    local.xz += vec2(wobble, wobble) * phase * 0.2;
    envelope = sin(phase * 3.14159) * 0.85;
    sizeScale = 1.25 + phase * 1.5;
  } else {
    // Machine shop: brief weld-spark bursts with gravity, dark between arcs.
    float phase = fract(time * 0.42 + aSeed.x * 0.16);
    local += aVelocity * phase * 1.1;
    local.y -= 5.0 * phase * phase;
    local.y = max(local.y, 0.06 - aCenter.y);
    envelope = smoothstep(0.0, 0.02, phase) * (1.0 - smoothstep(0.26, 0.34, phase));
    glow = envelope * 1.4;
    sizeScale = 0.8;
  }

  // Arrival impulse: a brief outward breath instead of a shape morph, so the
  // matter acknowledges docking without abandoning its facility.
  local *= 1.0 + uMorphPhase * (0.06 + aSeed.y * 0.06);

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
  vOpacity = reveal * envelope * (0.5 + aSeed.w * 0.38);
  vGlow = clamp(glow + pusher * 0.6 + stationActive * 0.08, 0.0, 1.4);
  vParticleColor = aColor;
  vSeed = aSeed.x;

  vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float perspectiveSize = uPointScale * sizeScale * (0.82 + aSeed.z * 0.6) / max(1.0, -viewPosition.z);
  // Ceiling keeps near-camera travel-past sprites from ballooning into
  // screen-filling blended quads (raster cost, and the anti-screen-fill law).
  gl_PointSize = clamp(perspectiveSize * min(reveal * (0.3 + envelope), 1.0), 1.0, 30.0);
  // Vertex-stage cull: fully faded matter (distant stations, dead loop
  // phases) collapses outside the clip volume so it never rasterizes or
  // blends - the pool pays vertex cost only for particles that can be seen.
  if (vOpacity < 0.004) {
    gl_Position = vec4(3.0, 3.0, 3.0, 1.0);
    gl_PointSize = 1.0;
  }
}
`;

/**
 * Soft round sprite: a gaussian alpha disc (never a hard square) with a
 * slightly brighter core so a mote reads as a lit grain of matter. vGlow
 * pushes hot cores (embers, weld sparks) toward white heat.
 */
export const POLAR_PARTICLE_FRAGMENT_SHADER = `
varying vec3 vParticleColor;
varying float vGlow;
varying float vOpacity;
varying float vSeed;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radiusSquared = dot(point, point);
  if (radiusSquared > 1.0) discard;
  float disc = exp(-radiusSquared * 3.4);
  float core = exp(-radiusSquared * 8.0);
  float dither = fract(sin(dot(gl_FragCoord.xy + vSeed * 13.0, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 color = vParticleColor * (0.82 + core * 0.3);
  color = mix(color, vec3(1.0, 0.97, 0.9), clamp(vGlow * core, 0.0, 0.85));
  float alpha = disc * vOpacity * (0.86 + dither * 0.14);
  gl_FragColor = vec4(color, alpha);
}
`;
