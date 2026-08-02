import { STATION_WORLD_SCHEMA } from "./polar-station-world.js";
import { POLAR_DOME_LATTICE_GEOMETRY } from "./polar-dome-lattice.js";

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
  let nearest = Infinity;
  for (let index = 0; index < PAD_CENTERS.length; index += 1) {
    const distance = Math.hypot(x - PAD_CENTERS[index][0], z - PAD_CENTERS[index][1]);
    if (distance < nearest) nearest = distance;
  }
  return smoothstep(
    POLAR_GROUND_PAD_RADIUS,
    POLAR_GROUND_PAD_RADIUS + POLAR_GROUND_PAD_FALLOFF,
    nearest,
  );
}

/** World-space surface height at (x, z). Exactly 0 on every station shelf. */
export function polarGroundHeight(x, z) {
  let height = 0;
  for (let index = 0; index < DUNE_TERMS.length; index += 1) {
    const term = DUNE_TERMS[index];
    height += term.amplitude * Math.sin(term.ax * x + term.az * z + term.phase);
  }
  return height * polarGroundPadMask(x, z);
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

float polarGroundHeight(vec2 worldXZ) {
  float height = 0.0;
${DUNE_TERMS.map(
  (term) =>
    `  height += ${glslNumber(term.amplitude)} * sin(${glslNumber(term.ax)} * worldXZ.x + ${glslNumber(
      term.az,
    )} * worldXZ.y + ${glslNumber(term.phase)});`,
).join("\n")}
  return height * polarGroundPadMask(worldXZ);
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
 * The hero building's cast shadow, solved analytically on the ground.
 *
 * The terrain is drawn by a hand-written ShaderMaterial that carries its own
 * lighting and no shadow-map chunks, so `receiveShadow` on it is a no-op and
 * nothing in the world could put a shadow on the snow — the dark patch under
 * the igloo was contact shading. Rather than retrofit three.js shadow maps into
 * that shader, the one object that has to cast is solved in closed form: march
 * the ground point toward the light and test the dome's own ellipsoid, taken
 * from the same lattice the masonry is built from. Exact shape, exact offset,
 * no sampler, no second program.
 */
export const POLAR_HERO_SHADOW_GLSL = String.raw`
float polarHeroShadow(vec3 groundPosition, vec3 lightDirection) {
  vec3 center = vec3(${glslNumber(DOME_SHADOW_CASTER.centerX)}, ${glslNumber(
  DOME_SHADOW_CASTER.centerY,
)}, ${glslNumber(DOME_SHADOW_CASTER.centerZ)});
  vec3 radii = vec3(${glslNumber(DOME_SHADOW_CASTER.radiusX)}, ${glslNumber(
  DOME_SHADOW_CASTER.radiusY,
)}, ${glslNumber(DOME_SHADOW_CASTER.radiusZ)});
  // Unit-sphere space: the ellipsoid becomes a sphere and the ray stays a ray.
  vec3 origin = (groundPosition - center) / radii;
  vec3 direction = lightDirection / radii;
  float a = dot(direction, direction);
  float b = 2.0 * dot(origin, direction);
  float c = dot(origin, origin) - 1.0;
  float discriminant = b * b - 4.0 * a * c;
  if (discriminant <= 0.0) return 0.0;
  // Only a hit in front of the surface shadows it; behind the light is daylight.
  float root = sqrt(discriminant);
  float far = (-b + root) / (2.0 * a);
  if (far <= 0.0) return 0.0;
  // The grazing rim fades instead of cutting a hard edge, which is what a soft
  // polar key does to a snow shadow.
  return smoothstep(0.0, 0.55, discriminant / (a * a)) * step(0.0, far);
}
`;
