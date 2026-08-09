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
//
// Amplitudes are weighted toward the two SHORT terms, which is not how the
// field was first balanced and is worth the note. What the camera can resolve as
// ground form is bounded on both sides: the fog and the 18-25.5 horizon fade
// erase everything past ~25 units, and the traveler occupies the nearest ~2, so
// the readable band is one 15-unit wavelength wide. The 34-unit swell spends its
// whole amplitude below that band -- it tilts the entire visible sheet at once,
// which reads as no form at all -- while the 15 and 10-unit terms are the only
// ones that put a crest and a trough in frame together.
//
// What matters to the eye here is SLOPE, not height, because the surface is lit
// by grazing light: the quantity that shades a dune is amplitude * wavenumber,
// summing to 0.252 against the 0.162 this field carried when its relief was
// invisible anyway. DEPTH is what it costs, and the two can be traded against
// each other. An earlier balance reached the same 0.252 of slope at a peak of
// 0.86 -- near the 0.9 ceiling the ground contract holds -- and the extra depth
// bought nothing the light could show while it darkened every trough: the
// station with the least snow in frame sits at a mean luma of 103, right on the
// 100-luma line that separates a snow anchor pixel from a dark one, and it lost
// 5.9 points of anchor ratio. Same slope, 0.74 of peak, the trough floor comes
// back up.
const DUNE_TERMS = Object.freeze([
  Object.freeze({ amplitude: 0.22, ax: 0.163, az: 0.091, phase: 0 }),
  Object.freeze({ amplitude: 0.18, ax: -0.071, az: 0.207, phase: 1.7 }),
  Object.freeze({ amplitude: 0.2, ax: 0.331, az: 0.238, phase: 3.9 }),
  Object.freeze({ amplitude: 0.14, ax: -0.517, az: 0.383, phase: 5.2 }),
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
 *
 * The bank is also the only relief the camera frames at a docked station. The
 * graded pad zeroes the dune field out to PAD_RADIUS and eases it in over the
 * falloff, so the near ground a docked view is mostly made of has, by design, no
 * slope at all -- which is what left the foreground reading as an empty sheet
 * even after the surface gained a normal to light. The bank is the one piece of
 * form that lives in exactly that band, so it carries the near field.
 */
export const POLAR_GROUND_DRIFT_INNER_RADIUS = 3.3;
export const POLAR_GROUND_DRIFT_OUTER_RADIUS = 8.5;
export const POLAR_GROUND_DRIFT_HEIGHT = 0.38;

export const POLAR_GROUND_PEAK = DUNE_TERMS.reduce(
  (sum, term) => sum + term.amplitude,
  0,
);

/** Sampling step for the emitted surface normal; see polarGroundNormal below. */
export const POLAR_GROUND_NORMAL_EPSILON = 0.75;

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

/**
 * The surface normal of that same field.
 *
 * The terrain plane shipped PlaneGeometry's constant up normal, so the one
 * lighting term the ground had -- dot(normal, light) -- was the same number at
 * every point on a 58-unit sheet. Every drift band, every trough, the whole
 * drift bank against each facility: all of it displaced the geometry and none of
 * it changed a single pixel's value, because nothing on the ground was ever lit.
 * That, not a shortage of texture, is why the field read as a flat lavender
 * expanse; adding noise to an unlit surface only makes an unlit surface dirty.
 *
 * Sampled from polarGroundHeight rather than differentiated in closed form, for
 * the reason the module exists: a hand-derived gradient is a second copy of the
 * constants, and it would drift the first time a dune term is retuned. This
 * cannot disagree with the surface because it only asks the surface.
 *
 * ${POLAR_GROUND_NORMAL_EPSILON} world units is a little over one terrain quad at the 96-segment
 * tiers (0.60) and well under the shortest dune wavelength (9.8), so the normal
 * describes the form the geometry actually carries rather than a slope between
 * two points of the same crest. It is a CONSTANT, not a per-tier value: shading
 * that changed with segment count would make the low tier a different picture
 * from high for reasons the viewer cannot attribute to anything.
 *
 * Vertex-stage only. Two extra field evaluations per terrain vertex -- 1,089 at
 * low, 9,409 at the 96-segment tiers -- against zero per-fragment cost, which is
 * the trade this world's fill budget wants.
 */
/**
 * Surface height mapped to 0 in the deepest trough and 1 on the highest crest.
 *
 * Emitted from the same table as the height for the reason the rest of this
 * module is: the shading that reads relief has to be normalised by the relief
 * that actually exists. It was written as (worldY + 0.42) / 0.42, which encodes
 * a peak of 0.61 as two magic numbers, so raising the dune amplitudes drove the
 * ramp well past both ends -- parking a large area of every trough at the floor
 * of the hollow-shadow mix, dark enough and blue enough to fall out of the snow
 * anchor check-polar-color-continuity counts. Derived from POLAR_GROUND_PEAK it
 * follows any future retune on its own.
 */
float polarGroundRelief(float surfaceHeight) {
  return clamp((surfaceHeight + ${glslNumber(POLAR_GROUND_PEAK)}) / ${glslNumber(
    Number((POLAR_GROUND_PEAK * 2).toFixed(6)),
  )}, 0.0, 1.0);
}

vec3 polarGroundNormal(vec2 worldXZ) {
  float here = polarGroundHeight(worldXZ);
  float alongX = polarGroundHeight(worldXZ + vec2(${glslNumber(POLAR_GROUND_NORMAL_EPSILON)}, 0.0)) - here;
  float alongZ = polarGroundHeight(worldXZ + vec2(0.0, ${glslNumber(POLAR_GROUND_NORMAL_EPSILON)})) - here;
  return normalize(vec3(-alongX, ${glslNumber(POLAR_GROUND_NORMAL_EPSILON)}, -alongZ));
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

/**
 * CONTACT OCCLUSION, and why the thrown shadow above is not enough.
 *
 * The ellipsoid solve is a SUN shadow: it throws along the docked station's
 * authored key bearing, and where that throw lands is decided by the station's
 * light azimuth against its solved camera bearing. Measured at 1440x900 over the
 * eight docked framings, the throw is between 22 and 74 degrees off the view
 * axis and 3.0 to 11.9 world units long, so it lands inside the framed
 * foreground at observatory-plaque (throw centre 8.5 units along a view axis
 * 15.9 units deep) and outside it at qpu-ice-bridge (11.9 units thrown 52
 * degrees off a 13.8-unit axis). Rendered captures agree: the dome sits in its
 * own shadow while the ice bridge and the archive wall sit on an unbroken plate.
 *
 * Shadow maps would not change that. A depth map is thrown along the same key
 * direction; a shadow that leaves the frame leaves it either way.
 *
 * What is missing at those bearings is not the sun term but the SKY term. A
 * polar key is one weak low source against a bright hemisphere, and most of the
 * light a patch of snow receives arrives from that hemisphere -- so a body
 * standing on the snow darkens the ground around its base by blocking sky,
 * whichever way the sun happens to be. That is the darkening the eye reads as
 * contact, and it is view- and sun-independent by construction, which is exactly
 * why it survives every framing.
 *
 * Deliberately shallow and compactly supported: it reaches
 * POLAR_CONTACT_RADIUS_SCALE footprints and is exactly zero past that, so it is
 * a skirt against a building rather than a wash over the shelf. The peak is the
 * one number that is a budget rather than a judgement -- the terrain applies the
 * combined shadow at 0.62 toward vec3(0.74, 0.78, 0.88), so a full-strength
 * shadow is a 13.7% luma drop and this peak lands the contact skirt at 8.5%,
 * inside the 10-18% band the snow can afford without losing anchor pixels to the
 * colour contract's luma-100 threshold.
 */
export const POLAR_CONTACT_RADIUS_SCALE = 1.35;
export const POLAR_CONTACT_OCCLUSION_PEAK = 0.62;
// The traveler is a small body in bright snow, so its skirt reaches further in
// footprints and lands softer: at the station peak a 1.04-unit seal wears a
// dark ring that reads as a decal rather than as contact.
const POLAR_TRAVELER_CONTACT_RADIUS = SEAL_ENVELOPE.axialRadius * 1.55;
const POLAR_TRAVELER_CONTACT_PEAK = 0.5;
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
      // Contact skirt radius; see POLAR_CONTACT_OCCLUSION_PEAK.
      contactRadius: Math.max(radiusX, radiusZ) * POLAR_CONTACT_RADIUS_SCALE,
    });
  }),
);

export const POLAR_SHADOW_CASTER_COUNT = SHADOW_CASTERS.length;

/**
 * The local geography props cast too, and why they cannot be baked like the rest.
 *
 * Every caster above is emitted as unrolled GLSL because a station never moves.
 * The props do: the biome world draws ONE instanced mesh of up to 32 bodies
 * belonging to whichever station is nearest, re-laid-out on each biome change,
 * so which 32 bodies exist is not known when the shader is built. They arrive as
 * a uniform array instead — xy is the prop's world XZ, z its squared skirt
 * radius — and the ground walks it.
 *
 * A per-fragment LOOP on the largest surface in frame is exactly the thing this
 * machine cannot afford on faith, so it was measured before it was written
 * (scripts/probe-prop-contact-fill.mjs, 16 full-screen quads at 1440x900,
 * median of 30 timed frames, null control 1.5 us/Mpx):
 *
 *   32 props, branchless                807 us/Mpx
 *   32 props, per-prop reject           464 us/Mpx
 *   32 props, field gate closed          32 us/Mpx
 *
 * So the shape below is the one the numbers chose. The whole loop sits behind a
 * SINGLE reject against the prop field's own bounding circle, which the CPU
 * sizes from the layout it just placed: a fragment out on the open snow — every
 * fragment at all eight stations the player is not docked at, and every fragment
 * at the low tier, which draws no props at all — pays one subtract, one dot and
 * one compare, 32 us/Mpx, 0.04 ms over a 1.30 Mpx ground. Inside the field each
 * prop keeps its own reject, which the measurement shows is worth 43% against
 * evaluating the skirt unconditionally, because a prop's skirt is under a metre
 * wide and almost every fragment is outside almost every one of them. Worst case
 * — the whole frame inside the field — is 464 us/Mpx against a terrain shader
 * that costs ~13.9 ms/Mpx on this GPU, so 3.3%, and the real figure is a
 * fraction of that.
 *
 * WHERE THE SKIRT PEAKS, which is the whole difference between this and the
 * casters above. polarContactOcclusion ramps from the caster's CENTRE, so its
 * maximum lands under the body and only what is left at the silhouette is ever
 * seen: at the 1.35-footprint radius every caster uses, that is
 * 1 - smoothstep(0, 1, 1/1.35^2) = 0.19 of the peak. A building is wide enough
 * and its thrown ellipsoid dark enough that this goes unnoticed. A boulder is
 * not: shipped that way, a 0.44 peak arrived at the stone's edge as 0.08, a 1.1%
 * luma drop spread over a 250-pixel blob, and the rendered apron was
 * indistinguishable from no skirt at all — which is exactly what the first
 * capture showed.
 *
 * So the props feed the same falloff the distance BEYOND their own body rather
 * than from their centre. The skirt is then full at the silhouette, where a real
 * contact shadow is darkest, and gone by the same 1.35 footprints. Both shares
 * below are that one radius scale, so there is still one number deciding how far
 * a body's contact reaches; a prop just spends all of it where it can be seen.
 * Two ALU: one multiply-subtract and one max.
 *
 * The peak is under the stations' 0.62 even though it is now measured at a
 * harsher place, because a body blocks sky in proportion to how much of the
 * hemisphere it covers and a half-metre boulder covers less of it than a
 * 4.5-unit building.
 *
 * KNOWN CEILING: the skirt is a circle sized by the body's WIDER horizontal
 * reach, so an elongated prop — the observatory's ice ribbons are 4:1 — wears a
 * hollow much wider than itself across the short axis. It reads as wind-packed
 * drift, which is what banks against a body in this world anyway (see
 * POLAR_GROUND_DRIFT above), so it is left alone. Making it elliptical needs the
 * two radii and a bounding radius, five floats per prop against three, which
 * doubles the uniform array and costs the cheap circular reject that the
 * measurement above says is worth 43% of the loop.
 */
export const POLAR_PROP_CONTACT_COUNT = 32;
export const POLAR_PROP_CONTACT_PEAK = 0.5;
// Squared shares of a prop's skirt radius: everything inside the body, and the
// band outside it the falloff actually runs over.
const PROP_BODY_SHARE = Number((1 / POLAR_CONTACT_RADIUS_SCALE ** 2).toFixed(6));
const PROP_SKIRT_SHARE = Number((1 - PROP_BODY_SHARE).toFixed(6));

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

// Sky occlusion against a standing body; see the note above the caster table.
// Reads the squared distance the caller already needed for its reject, so a
// caster costs one smoothstep and one multiply more than it did -- no sqrt, no
// second ray solve, and nothing that depends on the light bearing.
float polarContactOcclusion(float deltaSquared, float radiusSquared, float peak) {
  return peak * (1.0 - smoothstep(0.0, radiusSquared, deltaSquared));
}

// Local geography props; see the note above POLAR_PROP_CONTACT_COUNT for the
// fill measurement that chose this shape. uPropField.xy is the field centre and
// .z its squared bounding radius, set to 0 whenever no props are drawn.
float polarPropContact(vec2 groundXZ) {
  vec2 fieldDelta = groundXZ - uPropField.xy;
  if (dot(fieldDelta, fieldDelta) >= uPropField.z) return 0.0;
  float propShadow = 0.0;
  for (int propIndex = 0; propIndex < ${POLAR_PROP_CONTACT_COUNT}; propIndex += 1) {
    vec3 prop = uPropContacts[propIndex];
    vec2 propDelta = groundXZ - prop.xy;
    float propDistanceSquared = dot(propDelta, propDelta);
    if (propDistanceSquared < prop.z) {
      propShadow = max(
        propShadow,
        polarContactOcclusion(
          max(0.0, propDistanceSquared - prop.z * ${glslNumber(PROP_BODY_SHARE)}),
          prop.z * ${glslNumber(PROP_SKIRT_SHARE)},
          ${glslNumber(POLAR_PROP_CONTACT_PEAK)}
        )
      );
    }
  }
  return propShadow;
}

float polarHeroShadow(vec3 groundPosition, vec3 lightDirection) {
  vec2 groundXZ = groundPosition.xz;
  float shadow = polarPropContact(groundXZ);
  vec2 delta;
  float deltaSquared;
${SHADOW_CASTERS.map(
  (caster) => `  delta = groundXZ - vec2(${glslNumber(caster.centerX)}, ${glslNumber(
    caster.centerZ,
  )});
  deltaSquared = dot(delta, delta);
  if (deltaSquared < ${glslNumber(
    Number((caster.rejectRadius * caster.rejectRadius).toFixed(3)),
  )}) {
    shadow = max(shadow, polarContactOcclusion(deltaSquared, ${glslNumber(
      Number((caster.contactRadius * caster.contactRadius).toFixed(3)),
    )}, ${glslNumber(POLAR_CONTACT_OCCLUSION_PEAK)}));
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
  deltaSquared = dot(travelerDelta, travelerDelta);
  if (deltaSquared < ${glslNumber(
    Number(((SEAL_ENVELOPE.worldY * 3.4 + 1.2) ** 2).toFixed(3)),
  )}) {
    shadow = max(shadow, polarContactOcclusion(
      deltaSquared,
      ${glslNumber(Number((POLAR_TRAVELER_CONTACT_RADIUS ** 2).toFixed(3)))},
      ${glslNumber(POLAR_TRAVELER_CONTACT_PEAK)}
    ));
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
