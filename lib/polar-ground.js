import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import { POLAR_DOME_LATTICE_GEOMETRY } from "./polar-dome-lattice.js";
import {
  MECHANISM_VERTICAL_ENVELOPES,
  SEAL_ENVELOPE,
} from "./polar-camera-composition.js";
import { STATION_PERSONALITY_PROFILES } from "./polar-station-personality.js";

/**
 * The one ground-height field for the polar world.
 *
 * The terrain used to be a plane displaced by a GPU-only macro height whose
 * peak was 0.12 across a 58-unit field — invisible next to a 4.5-unit building,
 * so the world read as vinyl — while the seal rode a fixed Y and SealAvatar
 * carried its own unrelated `0.45 + sin(x * 0.13) * 0.08` bob. Three
 * descriptions of the same surface, none of which agreed.
 *
 * This module is that surface. The GLSL below is generated from the same table
 * the JS reads, so the shader and every CPU consumer cannot drift: there is no
 * second copy of the constants to keep in sync. That constrains the field to
 * closed-form terms — sums of sines, no fbm — which is also what a wind-carved
 * dune field is.
 */

// Long crossing swells first, finer sastrugi ripple last. Wavelength is
// 2*pi/hypot(ax, az): 34, 28, 15 and 10 world units.
const DUNE_TERMS = Object.freeze([
  Object.freeze({ amplitude: 0.3, ax: 0.163, az: 0.091, phase: 0 }),
  Object.freeze({ amplitude: 0.17, ax: -0.071, az: 0.207, phase: 1.7 }),
  Object.freeze({ amplitude: 0.09, ax: 0.331, az: 0.238, phase: 3.9 }),
  Object.freeze({ amplitude: 0.05, ax: -0.517, az: 0.383, phase: 5.2 }),
]);

/**
 * Every station is built on a graded shelf. Without this the dunes run straight
 * through the facilities, which sit at a fixed Y, and each one either floats
 * over a trough or has its plinth buried in a crest. The pad is flat out to
 * PAD_RADIUS and eases to the open field by PAD_RADIUS + PAD_FALLOFF.
 */
export const POLAR_GROUND_PAD_RADIUS = 4.6;
export const POLAR_GROUND_PAD_FALLOFF = 5.4;

/**
 * Wind drift banks against anything standing in a polar field, and both
 * reference sites show it: the igloo's lowest course is buried in a skirt of
 * packed snow rather than meeting a flat plane at a hard line. This raises a
 * ring of drift just outside each station shelf — peaking a little past the
 * graded pad, so a facility keeps flat ground under its plinth and the seal
 * crests a bank on its way in.
 */
export const POLAR_GROUND_DRIFT_INNER_RADIUS = 3.3;
export const POLAR_GROUND_DRIFT_OUTER_RADIUS = 8.5;
export const POLAR_GROUND_DRIFT_HEIGHT = 0.26;

export const POLAR_GROUND_PEAK = DUNE_TERMS.reduce(
  (sum, term) => sum + term.amplitude,
  0,
);

const PAD_CENTERS = Object.freeze(
  STATION_WORLD_SCHEMA.order.map((id) =>
    Object.freeze([
      STATION_WORLD_SCHEMA.stations[id].center.x,
      STATION_WORLD_SCHEMA.stations[id].center.z,
    ]),
  ),
);

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 0 on a station shelf, 1 in the open field. */
export function polarGroundPadMask(x, z) {
  const nearest = nearestPadDistance(x, z);
  return smoothstep(
    POLAR_GROUND_PAD_RADIUS,
    POLAR_GROUND_PAD_RADIUS + POLAR_GROUND_PAD_FALLOFF,
    nearest,
  );
}

/** Nearest station distance, shared by the pad mask and the drift ring. */
function nearestPadDistance(x, z) {
  let nearest = Infinity;
  for (let index = 0; index < PAD_CENTERS.length; index += 1) {
    const distance = Math.hypot(x - PAD_CENTERS[index][0], z - PAD_CENTERS[index][1]);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

/**
 * Drift bank against the nearest facility. Compactly supported on purpose: a
 * gaussian's tail is never zero, so it lifted the station shelf off flat and
 * left a sixth of its height out in the open field. This is exactly zero inside
 * the graded pad and exactly zero past the bank.
 */
export function polarGroundDrift(x, z) {
  const t =
    (nearestPadDistance(x, z) - POLAR_GROUND_DRIFT_INNER_RADIUS) /
    (POLAR_GROUND_DRIFT_OUTER_RADIUS - POLAR_GROUND_DRIFT_INNER_RADIUS);
  if (t <= 0 || t >= 1) return 0;
  const shape = Math.sin(Math.PI * t);
  return POLAR_GROUND_DRIFT_HEIGHT * shape * shape;
}

/** World-space surface height at (x, z). Exactly 0 on every station shelf. */
export function polarGroundHeight(x, z) {
  let height = 0;
  for (let index = 0; index < DUNE_TERMS.length; index += 1) {
    const term = DUNE_TERMS[index];
    height += term.amplitude * Math.sin(term.ax * x + term.az * z + term.phase);
  }
  return height * polarGroundPadMask(x, z) + polarGroundDrift(x, z);
}

const glslNumber = (value) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/**
 * The GLSL twin, emitted from the same table and the same station centres. Any
 * edit above changes both sides at once.
 */
export const POLAR_GROUND_GLSL = String.raw`
float polarGroundPadMask(vec2 worldXZ) {
  float nearest = 1.0e9;
${PAD_CENTERS.map(
  ([x, z]) =>
    `  nearest = min(nearest, distance(worldXZ, vec2(${glslNumber(x)}, ${glslNumber(z)})));`,
).join("\n")}
  return smoothstep(${glslNumber(POLAR_GROUND_PAD_RADIUS)}, ${glslNumber(
    POLAR_GROUND_PAD_RADIUS + POLAR_GROUND_PAD_FALLOFF,
  )}, nearest);
}

float polarGroundDrift(vec2 worldXZ) {
  float nearest = 1.0e9;
${PAD_CENTERS.map(
  ([x, z]) =>
    `  nearest = min(nearest, distance(worldXZ, vec2(${glslNumber(x)}, ${glslNumber(z)})));`,
).join("\n")}
  float t = (nearest - ${glslNumber(POLAR_GROUND_DRIFT_INNER_RADIUS)}) / ${glslNumber(
    POLAR_GROUND_DRIFT_OUTER_RADIUS - POLAR_GROUND_DRIFT_INNER_RADIUS,
  )};
  if (t <= 0.0 || t >= 1.0) return 0.0;
  float shape = sin(3.14159265 * t);
  return ${glslNumber(POLAR_GROUND_DRIFT_HEIGHT)} * shape * shape;
}

float polarGroundHeight(vec2 worldXZ) {
  float height = 0.0;
${DUNE_TERMS.map(
  (term) =>
    `  height += ${glslNumber(term.amplitude)} * sin(${glslNumber(term.ax)} * worldXZ.x + ${glslNumber(
      term.az,
    )} * worldXZ.y + ${glslNumber(term.phase)});`,
).join("\n")}
  return height * polarGroundPadMask(worldXZ) + polarGroundDrift(worldXZ);
}
`;

/**
 * Mirrors OBSERVATORY_MACRO_SCALE_PROFILE.worldScale in PolarObservatoryDome.jsx.
 * The component cannot be imported here — lib stays JSX-free so the gate scripts
 * can run it under plain node — so check-polar-ground parses the component and
 * fails if the two ever disagree.
 */
export const POLAR_DOME_WORLD_SCALE = 1.58;

const OBSERVATORY_CENTER = STATION_WORLD_SCHEMA.stations["observatory-plaque"].center;
const DOME_SHADOW_CASTER = Object.freeze({
  centerX: OBSERVATORY_CENTER.x,
  centerY:
    (POLAR_DOME_LATTICE_GEOMETRY.center[1] + POLAR_DOME_LATTICE_GEOMETRY.radii[1] * 0.5) *
    POLAR_DOME_WORLD_SCALE,
  centerZ: OBSERVATORY_CENTER.z,
  radiusX: POLAR_DOME_LATTICE_GEOMETRY.radii[0] * POLAR_DOME_WORLD_SCALE,
  radiusY: POLAR_DOME_LATTICE_GEOMETRY.radii[1] * 0.5 * POLAR_DOME_WORLD_SCALE,
  radiusZ: POLAR_DOME_LATTICE_GEOMETRY.radii[2] * POLAR_DOME_WORLD_SCALE,
});

/**
 * Facility cast shadows, solved analytically on the ground.
 *
 * The terrain is drawn by a hand-written ShaderMaterial that carries its own
 * lighting and no shadow-map chunks, so `receiveShadow` on it is a no-op and
 * nothing in the world could put a shadow on the snow — the dark patch under
 * each building was contact shading. Rather than retrofit three.js shadow maps
 * into that shader, every facility is solved in closed form: march the ground
 * point toward the light and intersect the station's own envelope ellipsoid.
 *
 * The envelopes come from MECHANISM_VERTICAL_ENVELOPES, the same measured table
 * the camera already frames and occludes against, so a facility that grows in
 * the render grows its shadow in one edit. The observatory keeps its footprint
 * from that table but takes its height from the dome lattice directly, because
 * the lattice is what the masonry is actually built from.
 *
 * Each caster is guarded by a cheap XZ reject before the ellipsoid math, so a
 * fragment out on the open field pays eight dot products rather than eight ray
 * solves.
 */
const SHADOW_CASTERS = Object.freeze(
  STATION_WORLD_SCHEMA.order.map((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    const envelope = MECHANISM_VERTICAL_ENVELOPES[id];
    const scale = envelope.footprintScale;
    const scaleX = typeof scale === "object" ? scale.x : scale;
    const scaleZ = typeof scale === "object" ? scale.z : scale;
    const radiusX = station.collider.radiusX * scaleX;
    const radiusZ = station.collider.radiusZ * scaleZ;
    const height =
      id === "observatory-plaque"
        ? (POLAR_DOME_LATTICE_GEOMETRY.center[1] + POLAR_DOME_LATTICE_GEOMETRY.radii[1]) *
          POLAR_DOME_WORLD_SCALE
        : envelope.height;
    return Object.freeze({
      id,
      centerX: station.center.x,
      centerY: height * 0.5,
      centerZ: station.center.z,
      radiusX,
      radiusY: height * 0.5,
      radiusZ,
      // Reject radius: the footprint plus how far the shadow can be thrown at
      // the shallowest authored key elevation.
      rejectRadius: Math.max(radiusX, radiusZ) + height * 3.4,
    });
  }),
);

export const POLAR_SHADOW_CASTER_COUNT = SHADOW_CASTERS.length;

export const POLAR_HERO_SHADOW_GLSL = String.raw`
float polarShadowFromEllipsoid(vec3 groundPosition, vec3 lightDirection, vec3 center, vec3 radii) {
  // Unit-sphere space: the ellipsoid becomes a sphere and the ray stays a ray.
  vec3 origin = (groundPosition - center) / radii;
  vec3 direction = lightDirection / radii;
  float a = dot(direction, direction);
  float b = 2.0 * dot(origin, direction);
  float c = dot(origin, origin) - 1.0;
  float discriminant = b * b - 4.0 * a * c;
  if (discriminant <= 0.0) return 0.0;
  // Only a hit in front of the surface shadows it; behind the light is daylight.
  float far = (-b + sqrt(discriminant)) / (2.0 * a);
  if (far <= 0.0) return 0.0;
  // The grazing rim fades instead of cutting a hard edge, which is what a soft
  // polar key does to a snow shadow.
  return smoothstep(0.0, 0.55, discriminant / (a * a));
}

float polarHeroShadow(vec3 groundPosition, vec3 lightDirection) {
  float shadow = 0.0;
  vec2 groundXZ = groundPosition.xz;
  vec2 delta;
${SHADOW_CASTERS.map(
  (caster) => `  delta = groundXZ - vec2(${glslNumber(caster.centerX)}, ${glslNumber(
    caster.centerZ,
  )});
  if (dot(delta, delta) < ${glslNumber(
    Number((caster.rejectRadius * caster.rejectRadius).toFixed(3)),
  )}) {
    shadow = max(shadow, polarShadowFromEllipsoid(
      groundPosition,
      lightDirection,
      vec3(${glslNumber(caster.centerX)}, ${glslNumber(caster.centerY)}, ${glslNumber(
        caster.centerZ,
      )}),
      vec3(${glslNumber(caster.radiusX)}, ${glslNumber(caster.radiusY)}, ${glslNumber(
        caster.radiusZ,
      )})
    ));
  }`,
).join("\n")}
  // The traveler casts too. It is the one body the player watches every frame,
  // and it was the last thing in the world still floating over its own contact
  // decal. Its centre rides the shared ground field exactly as the mascot does,
  // so the shadow tracks it over a dune instead of sliding off. Horizontal
  // radius is the geometric mean of the seal's axial and lateral extents: the
  // body's heading is not a terrain uniform, and a round shadow at the right
  // area reads truer than an elongated one pointing the wrong way.
  // The traveler casts too, in its own frame. It is the one body the player
  // watches every frame, and it was the last thing in the world still floating
  // over its own contact decal. Its centre rides the shared ground field exactly
  // as the mascot does, so the shadow tracks it over a dune instead of sliding
  // off. Rotating the sample into the seal's heading lets the shadow carry the
  // body's real 1.04-by-0.49 proportion rather than a circle of the same area,
  // which matters now that the character carves instead of sliding sideways.
  vec2 travelerDelta = groundXZ - uTravelerXZ;
  if (dot(travelerDelta, travelerDelta) < ${glslNumber(
    Number(((SEAL_ENVELOPE.worldY * 3.4 + 1.2) ** 2).toFixed(3)),
  )}) {
    vec2 sealForward = normalize(uTravelerDir);
    mat2 intoSealFrame = mat2(sealForward.x, -sealForward.y, sealForward.y, sealForward.x);
    vec2 sealLocalXZ = intoSealFrame * travelerDelta;
    vec2 sealLocalLight = intoSealFrame * lightDirection.xz;
    shadow = max(shadow, polarShadowFromEllipsoid(
      vec3(sealLocalXZ.x, groundPosition.y, sealLocalXZ.y),
      vec3(sealLocalLight.x, lightDirection.y, sealLocalLight.y),
      vec3(0.0, ${glslNumber(SEAL_ENVELOPE.worldY)} + polarGroundHeight(uTravelerXZ), 0.0),
      vec3(${glslNumber(SEAL_ENVELOPE.axialRadius)}, ${glslNumber(
        SEAL_ENVELOPE.verticalRadius,
      )}, ${glslNumber(SEAL_ENVELOPE.lateralRadius)})
    ));
  }
  return shadow;
}
`;


/**
 * Ground light pools.
 *
 * A lit building throws light as well as blocking it. Both reference sites read
 * that way — a lamp pooling on a path, an interior spilling out of a doorway
 * onto the snow — and this world had the shadow half and not the light half, so
 * every facility sat on ground that knew the building was there only by what it
 * subtracted.
 *
 * This is deliberately a tight pool, not a wash. The terrain shader already
 * neutralises station identity out of the far snow on purpose (a saturated
 * bottle-green drill-rig fog dyeing the whole field was the regression that
 * guard exists for); a pool that reaches ~1.6 footprints and falls off
 * quadratically reads as a light source rather than as tinted ground, and it is
 * applied after the cast shadow so snow in a building's own shadow still catches
 * the spill from its openings.
 */
const LIGHT_POOLS = Object.freeze(
  STATION_WORLD_SCHEMA.order.map((id) => {
    const station = STATION_WORLD_SCHEMA.stations[id];
    const envelope = MECHANISM_VERTICAL_ENVELOPES[id];
    const scale = envelope.footprintScale;
    const scaleX = typeof scale === "object" ? scale.x : scale;
    const scaleZ = typeof scale === "object" ? scale.z : scale;
    const footprint = Math.max(
      station.collider.radiusX * scaleX,
      station.collider.radiusZ * scaleZ,
    );
    const glow = STATION_PERSONALITY_PROFILES[id].palette.world.colors.glow;
    return Object.freeze({
      id,
      centerX: station.center.x,
      centerZ: station.center.z,
      radius: footprint * 1.6,
      glow,
    });
  }),
);

export const POLAR_LIGHT_POOL_COUNT = LIGHT_POOLS.length;

const hexToGlsl = (hex) => {
  const channel = (offset) => (parseInt(hex.slice(offset, offset + 2), 16) / 255).toFixed(4);
  // sRGB -> linear, matching the renderer's working space so a pool does not
  // read hotter than the emissive that motivates it.
  const linear = (value) =>
    (Number(value) <= 0.04045
      ? Number(value) / 12.92
      : ((Number(value) + 0.055) / 1.055) ** 2.4
    ).toFixed(4);
  return `vec3(${linear(channel(1))}, ${linear(channel(3))}, ${linear(channel(5))})`;
};

export const POLAR_LIGHT_POOL_GLSL = String.raw`
vec3 polarGroundLightPools(vec2 groundXZ) {
  vec3 pooled = vec3(0.0);
  vec2 poolDelta;
  float poolFalloff;
${LIGHT_POOLS.map(
  (pool) => `  poolDelta = groundXZ - vec2(${glslNumber(pool.centerX)}, ${glslNumber(
    pool.centerZ,
  )});
  poolFalloff = 1.0 - smoothstep(0.0, ${glslNumber(pool.radius)}, length(poolDelta));
  pooled += ${hexToGlsl(pool.glow)} * poolFalloff * poolFalloff;`,
).join("\n")}
  return pooled;
}
`;
