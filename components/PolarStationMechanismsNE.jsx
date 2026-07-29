import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  NE_MECHANISM_BUDGET,
  NE_MECHANISM_IDS,
  NE_MECHANISM_PROFILES,
  NE_MONUMENT_CONTRACTS,
  QPU_MANIFOLD_LAYOUT,
  advanceNortheastMechanisms,
  createNortheastMechanismSystem,
  resolveQpuConstructionStep,
  resolveNortheastMechanismInputs,
  resolveNortheastStationReveal,
  sampleQpuManifoldPoint,
} from "../lib/polar-station-mechanisms";

export const NORTHEAST_MECHANISM_RENDER_PROFILE =
  "four authored northeast monuments; three bounded architectural instance pools each; shared wrapped-light program; zero textures";
export const S2_CRYOGENIC_LAB_PROFILE =
  "rotating kernel-citadel evolution of the CERN Penning-trap cryogenic laboratory: faceted cobalt shell rotor drum with six cache blades, machined pale metal plinth and tiered crown, bright cyan diagnostics gate with static coil pylons, calibration collars, and a slow ceremonial spin under the cobalt/cyan axial halo";
export const AETHER_ABYSS_PROFILE =
  "caged-star reliquary in abyss-blue: dark thick shield hemispheres eclipse one small blinding golden seed, golden deterministic motes ride violet orbital caustic arcs above a grounded plinth";
export const FIELD_THERMAL_FORGE_PROFILE =
  "possessed polar plant heater: graphite steel skid chassis with panel-clad control housing and ember portholes, copper-amber helical heating elements at temperature over a reflector trough, one orange-white plasma firebox heart, a nano-particle symbiote flux crawling the elements, and a living heat shimmer";
export const QPU_ALIEN_COHERENCE_PROFILE =
  "coherent crystal causeway evolution of the continuous sampled Riemann-manifold ice pavilion: alien jade dock band, catenary-crested translucent glass deck as the iridescent cyan contiguous floor shell and ribs in dark teal metal, clustered crystal pylons over both slender abutments, bidirectional interfering mint signal traffic, and a coherence verification beam";

const TWO_PI = Math.PI * 2;
// Antarctic boot-camp construction grammar. One contractor built this camp:
// every station shares the same graphite steel structure, the same thin coral
// safety trim, and the same ember window glass. Only the cladding family
// changes per station (two close values so panels read as panels), and the
// saturated identity color is reserved for that station's signature mechanism
// - the rotor beacon, the caged seed, the signal pulses, the heating elements.
// Painted per-vertex into the merged frame geometry, so a station shows four
// distinct material zones inside its single existing draw call.
const STATION_PALETTE = Object.freeze({
  aetherCladding: "#5F6B87",
  aetherCladdingAlt: "#6D7994",
  drift: "#DCE6EF",
  fieldCladding: "#59667A",
  fieldCladdingAlt: "#65718A",
  qpuCladding: "#5A7A79",
  qpuCladdingAlt: "#68898A",
  qpuGlass: "#2EC9B4",
  s2Cladding: "#63758C",
  s2CladdingAlt: "#71829B",
  steel: "#2A3140",
  trim: "#E8705E",
  window: "#F2B96B",
});
// Bodies are lit, never lamps: every frame pool's emissive stays under this so
// the signature mechanism is always the brightest thing on the station.
const BODY_EMISSIVE_CEILING = 0.06;
// The one place S2 is allowed to be saturated cobalt: the superconducting
// diagnostics ring that its proof bit threads through.
const S2_IDENTITY_COBALT = "#3E63D8";
const S2_KERNEL_SHELL_GAP = 0.25;
const S2_DIAGNOSTIC_HALF_SPAN = 1.72;
const S2_PORT_RAIL_Z = 1.08;
const S2_CROWN_BEACON_Y = 1.18;
const S2_CROWN_COUNTER_RATE = 0.62;
const S2_ROTOR_IDLE_RATE = 0.08;
const S2_ROTOR_DOCKED_RATE = 0.65;
const S2_ROTOR_SPIN_RESPONSE = 0.45;
const S2_ROTOR_REDUCED_ANGLE = 0.75;
const AETHER_DOMINANT_SEED_RADIUS = 0.22;
const AETHER_SEED_CORE_RADIUS = 0.13;
const AETHER_SEED_HEIGHT = 0.46;
const AETHER_SHIELD_RADIUS = 0.74;
// Local-space bearing of the visitor dock (world dock [9.55, 14.33] from
// station center [8, 12], unrotated by the authored -27 degree station yaw).
const AETHER_DOCK_YAW = 1.06;
const AETHER_ORBITAL_TILT = 0.34;
const AETHER_ORBITAL_RADIUS = 1.3;
// [radius, inclination, gapYaw, sweep, tube, planeYaw]
const AETHER_ORBITAL_ARCS = Object.freeze([
  Object.freeze([AETHER_ORBITAL_RADIUS, AETHER_ORBITAL_TILT, 0.5, 5.1, 0.016, 0]),
  Object.freeze([1.42, -0.24, 2.6, 4.6, 0.013, 1.15]),
  Object.freeze([1.16, 0.52, 4.3, 4.2, 0.013, 2.3]),
]);
const FIELD_HEATER_HALF_LENGTH = 0.92;
const FIELD_ELEMENT_AXIS_Y = 0.32;
const FIELD_ELEMENT_RADIUS = 0.3;
const FIELD_ELEMENT_TURNS = 4.25;
// Symbiote possession cadence: idle nano-flux crawl, roughly doubled at dock,
// with a spring response mirroring the S2 rotor pattern.
const FIELD_SYMBIOTE_IDLE_RATE = 0.11;
const FIELD_SYMBIOTE_DOCKED_RATE = 0.24;
const FIELD_SYMBIOTE_RESPONSE = 0.5;
const FIELD_SYMBIOTE_REDUCED_CRAWL = 0.37;
const FIELD_SYMBIOTE_REDUCED_PULSE = 1.35;
const FIELD_HEARTBEAT_IDLE_RATE = 2.1;
const FIELD_HEARTBEAT_DOCKED_RATE = 4;
// Two ember porthole windows on the dock-facing control-housing wall.
const FIELD_PORTHOLE_WINDOWS = Object.freeze([
  Object.freeze([1.13, 0, 0.34]),
  Object.freeze([1.39, 0, 0.34]),
]);
const QPU_BRIDGE_HALF_SPAN = QPU_MANIFOLD_LAYOUT.halfSpan;
const QPU_ABUTMENT_RADIUS = 0.09;
const QPU_ABUTMENT_HEIGHT = 0.52;
const QPU_MANIFOLD_SLICE_COUNT = QPU_MANIFOLD_LAYOUT.sliceCount;
const QPU_SIGNAL_BASE_LENGTH = 0.43;
const QPU_INVERSE_BRIDGE_LIFT = 0.58;
// Shared-library span arch coefficient mirrored for instance placement, plus a
// component-space catenary crest so the causeway reads as a true high arc.
const QPU_DECK_ARCH = 0.34;
const QPU_CREST_BOOST = 0.36;
const QPU_FRAME_SCALE = 1.08;
// Bidirectional signal traffic: pulses per lane pair, plus one verification beam.
const QPU_PULSE_COUNT = 10;
const QPU_SIGNAL_POOL_SIZE = QPU_PULSE_COUNT + 1;
const QPU_TRAFFIC_IDLE_RATE = 0.16;
const QPU_TRAFFIC_DOCKED_RATE = 0.34;
const QPU_TRAFFIC_RESPONSE = 0.6;
const REDUCED_MOTION_SHADER_TIME = 0.75;
const EMPTY_RENDER_RESOURCES = Object.freeze({
  geometries: Object.freeze({}),
  materialList: Object.freeze([]),
  materials: Object.freeze({}),
});

const STATION_TRANSFORMS = Object.freeze(
  Object.fromEntries(
    NE_MECHANISM_IDS.map((id) => {
      const profile = NE_MECHANISM_PROFILES[id];
      return [
        id,
        Object.freeze({
          position: Object.freeze([profile.centerXZ[0], profile.y, profile.centerXZ[1]]),
          rotation: Object.freeze([0, THREE.MathUtils.degToRad(profile.angleDegrees), 0]),
        }),
      ];
    }),
  ),
);

/**
 * Lowest authored local-space Y of each grounded monument base, measured from
 * the geometry builders (base cylinder center y minus half height):
 * s2 cryostat plinth -0.58 - 0.11, aether sanctuary plinth -0.57 - 0.09,
 * field heater skid rails -0.59 - 0.05 (its windward drift skirt intentionally
 * dips below the skid contact plane so it reads as buried snow load, and must
 * not move the contact value). qpu-ice-bridge floats by design
 * (QPU_INVERSE_BRIDGE_LIFT) and is intentionally absent so docking never
 * shifts its root Y.
 */
const STATION_LOWEST_LOCAL_Y = Object.freeze({
  "field-chamber-coils": -0.64,
  "manifold-reactor": -0.66,
  "s2-kernel-core": -0.69,
});

const QUALITY_GEOMETRY = Object.freeze({
  high: Object.freeze({ bevel: 3, cap: 8, curve: 96, radial: 10, round: 32 }),
  medium: Object.freeze({ bevel: 2, cap: 6, curve: 68, radial: 8, round: 24 }),
  low: Object.freeze({ bevel: 1, cap: 4, curve: 36, radial: 6, round: 14 }),
});

function geometryPolicy(quality) {
  return QUALITY_GEOMETRY[quality] || QUALITY_GEOMETRY.medium;
}

function bakeGeometry(
  geometry,
  {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  } = {},
) {
  let baked = geometry;
  if (geometry.index) {
    baked = geometry.toNonIndexed();
    geometry.dispose();
  }
  for (const attribute of Object.keys(baked.attributes)) {
    if (attribute !== "position" && attribute !== "normal") {
      baked.deleteAttribute(attribute);
    }
  }
  if (!baked.getAttribute("normal")) baked.computeVertexNormals();
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  baked.applyMatrix4(matrix);
  return baked;
}

// Paint one merged-geometry part with a construction-grammar color. The frame
// materials read this as vertex color, so steel, cladding, coral trim, and
// ember glass coexist inside one instanced draw call.
function paint(geometry, hex) {
  const color = new THREE.Color(hex);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function mergeParts(parts, name, defaultColor = "#FFFFFF") {
  for (const part of parts) {
    if (!part.getAttribute("color")) paint(part, defaultColor);
  }
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error(`Unable to merge northeast monument geometry: ${name}`);
  geometry.name = name;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function roundedPart(policy, size, position, rotation = [0, 0, 0], radius = 0.06) {
  return bakeGeometry(
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      policy.bevel,
      Math.min(radius, Math.min(...size) * 0.46),
    ),
    { position, rotation },
  );
}

function cylinderPart(
  policy,
  radiusTop,
  radiusBottom,
  height,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  return bakeGeometry(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      policy.round,
      1,
      false,
    ),
    { position, rotation, scale },
  );
}

function facetedPart(
  radiusTop,
  radiusBottom,
  height,
  facets,
  position,
  rotation = [0, 0, 0],
) {
  const geometry = bakeGeometry(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, facets, 1, false),
    { position, rotation },
  );
  // Flat per-face normals so the low-segment kernel drum reads as machined
  // facets instead of a smooth anonymous cylinder.
  geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  return geometry;
}

function torusPart(
  policy,
  radius,
  tube,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  arc = TWO_PI,
) {
  return bakeGeometry(
    new THREE.TorusGeometry(
      radius,
      tube,
      policy.radial,
      policy.curve,
      arc,
    ),
    { position, rotation, scale },
  );
}

function tubePart(policy, curve, radius, name, closed = false) {
  const geometry = bakeGeometry(
    new THREE.TubeGeometry(
      curve,
      policy.curve,
      radius,
      policy.radial,
      closed,
    ),
  );
  geometry.name = name;
  return geometry;
}

function createS2AntimatterCryostatGeometry(quality) {
  const policy = geometryPolicy(quality);
  const facets = quality === "low" ? 6 : 7;
  const parts = [
    // Kernel-citadel rotor. Every non-bladed part below is a surface of
    // revolution, so spinning the single merged frame instance about Y reads
    // as the citadel turning on a stationary circular plinth. Structure is
    // shared graphite steel; only the drum and blade cladding carries the
    // station's own (desaturated) blue-grey family.
    paint(cylinderPart(policy, 1.42, 1.58, 0.22, [0, -0.58, 0]), STATION_PALETTE.steel),
    paint(cylinderPart(policy, 1.06, 1.24, 0.16, [0, -0.42, 0]), STATION_PALETTE.steel),
    // deck-edge safety trim ring
    paint(
      torusPart(policy, 1.14, 0.05, [0, -0.34, 0], [Math.PI / 2, 0, 0]),
      STATION_PALETTE.trim,
    ),
    paint(cylinderPart(policy, 0.54, 0.68, 0.2, [0, -0.26, 0]), STATION_PALETTE.steel),
    // faceted kernel core drum
    paint(facetedPart(0.72, 0.84, 0.66, facets, [0, 0.17, 0]), STATION_PALETTE.s2Cladding),
    paint(cylinderPart(policy, 0.56, 0.66, 0.12, [0, 0.54, 0]), STATION_PALETTE.steel),
    // tiered crown drums and finial mast
    paint(
      facetedPart(0.4, 0.5, 0.28, facets, [0, 0.73, 0], [0, Math.PI / facets, 0]),
      STATION_PALETTE.s2CladdingAlt,
    ),
    paint(facetedPart(0.16, 0.28, 0.18, facets, [0, 0.96, 0]), STATION_PALETTE.s2Cladding),
    paint(cylinderPart(policy, 0.05, 0.1, 0.1, [0, 1.08, 0]), STATION_PALETTE.steel),
  ];
  // Proud horizontal seam band splitting the drum into two panel courses: a
  // real geometric step, not a shader stripe, so the seam survives distance.
  const drumSeam = torusPart(policy, 0.79, 0.022, [0, 0.06, 0], [Math.PI / 2, 0, 0]);
  drumSeam.name = "s2-panel-seam";
  parts.push(paint(drumSeam, STATION_PALETTE.steel));
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TWO_PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    parts.push(
      paint(
        roundedPart(
          policy,
          [0.84, 0.52, 0.1],
          [cos * 0.92, 0.18, sin * 0.92],
          [0, -angle, 0],
          0.04,
        ),
        STATION_PALETTE.s2CladdingAlt,
      ),
    );
    const rail = roundedPart(
      policy,
      [0.06, 0.62, 0.07],
      [cos * 1.3, 0.18, sin * 1.3],
      [0, -angle, 0],
      0.02,
    );
    rail.name = "s2-machined-axial-rails";
    parts.push(paint(rail, STATION_PALETTE.steel));
    const crownAngle = angle + Math.PI / 6;
    parts.push(
      paint(
        roundedPart(
          policy,
          [0.36, 0.2, 0.07],
          [Math.cos(crownAngle) * 0.54, 0.72, Math.sin(crownAngle) * 0.54],
          [0, -crownAngle, 0],
          0.025,
        ),
        STATION_PALETTE.steel,
      ),
    );
  }
  // Three ember windows and three proud steel panel seams alternate around the
  // drum between the cache blades: life inside the cold, and panels that read
  // as panels while the citadel turns.
  for (let index = 0; index < 3; index += 1) {
    const windowAngle = (index / 3) * TWO_PI + Math.PI / 6;
    const emberWindow = roundedPart(
      policy,
      [0.05, 0.15, 0.24],
      [Math.cos(windowAngle) * 0.8, 0.3, Math.sin(windowAngle) * 0.8],
      [0, -windowAngle, 0],
      0.02,
    );
    emberWindow.name = "s2-ember-window";
    parts.push(paint(emberWindow, STATION_PALETTE.window));
    const seamAngle = windowAngle + Math.PI / 3;
    const seam = roundedPart(
      policy,
      [0.05, 0.6, 0.05],
      [Math.cos(seamAngle) * 0.79, 0.17, Math.sin(seamAngle) * 0.79],
      [0, -seamAngle, 0],
      0.015,
    );
    seam.name = "s2-panel-seam";
    parts.push(paint(seam, STATION_PALETTE.steel));
  }
  for (const [ringRadius, ringY] of [
    [0.7, 0.6],
    [0.42, 0.89],
  ]) {
    const collar = torusPart(policy, ringRadius, 0.035, [0, ringY, 0], [Math.PI / 2, 0, 0]);
    collar.name = "s2-calibration-collars";
    parts.push(paint(collar, STATION_PALETTE.trim));
  }
  return mergeParts(parts, "s2-cern-antimatter-cryostat", STATION_PALETTE.s2Cladding);
}

function createS2PenningTrapCoilGeometry(quality) {
  const policy = geometryPolicy(quality);
  // Static port-side diagnostic-gate pylon: a grounded pedestal carrying one
  // vertical superconducting coil ring the proof bit threads through.
  // Shared graphite steel pedestal and mast; the saturated cobalt is spent
  // only on the superconducting ring itself, with one coral collar of trim.
  const parts = [
    paint(cylinderPart(policy, 0.11, 0.16, 0.3, [0, -0.54, 0]), STATION_PALETTE.steel),
    paint(torusPart(policy, 0.14, 0.02, [0, -0.4, 0], [Math.PI / 2, 0, 0]), STATION_PALETTE.trim),
    paint(cylinderPart(policy, 0.07, 0.09, 0.34, [0, -0.24, 0]), STATION_PALETTE.steel),
    paint(
      torusPart(policy, 0.3, 0.05, [0, 0.05, 0], [0, Math.PI / 2, 0], [1, 1.06, 1]),
      S2_IDENTITY_COBALT,
    ),
    paint(cylinderPart(policy, 0.045, 0.06, 0.14, [0, 0.42, 0]), STATION_PALETTE.steel),
  ];
  return mergeParts(parts, "s2-penning-trap-superconducting-coil-rings", STATION_PALETTE.steel);
}

function createS2DiagnosticBeamlineGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(new THREE.CapsuleGeometry(0.038, 0.4, policy.cap, policy.radial), {
        rotation: [0, 0, Math.PI / 2],
      }),
      bakeGeometry(new THREE.IcosahedronGeometry(0.085, quality === "high" ? 2 : 1)),
      torusPart(policy, 0.13, 0.012, [0, 0, 0], [Math.PI / 2, 0, 0]),
    ],
    "s2-vacuum-throat diagnostic-beamline s2-proof-bit",
  );
}

function createAetherPrimordialSanctuaryGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    // Grounded reliquary dais: wide stepped rings with one rim-lit lip. The
    // bottom face stays at -0.66 so STATION_LOWEST_LOCAL_Y remains accurate.
    // Riser and stem are the shared graphite steel, the walkable step is the
    // station's own desaturated indigo-slate cladding, and the lip is trim.
    paint(cylinderPart(policy, 1.24, 1.38, 0.18, [0, -0.57, 0]), STATION_PALETTE.steel),
    paint(
      cylinderPart(policy, 0.94, 1.08, 0.12, [0, -0.43, 0]),
      STATION_PALETTE.aetherCladding,
    ),
    paint(
      torusPart(policy, 1.12, 0.045, [0, -0.36, 0], [Math.PI / 2, 0, 0]),
      STATION_PALETTE.trim,
    ),
    // Pedestal stem and collar presenting the suspended seed cradle.
    paint(cylinderPart(policy, 0.15, 0.3, 0.32, [0, -0.22, 0]), STATION_PALETTE.steel),
    paint(
      torusPart(policy, 0.19, 0.03, [0, -0.05, 0], [Math.PI / 2, 0, 0]),
      STATION_PALETTE.aetherCladdingAlt,
    ),
  ];
  // Two ember portholes on the dock-facing riser, each between proud steel
  // panel seams, so the dais reads as an inhabited plinth rather than a slab.
  for (const [index, offset] of [[0, -0.62], [1, 0.62]]) {
    const angle = AETHER_DOCK_YAW + offset;
    const porthole = roundedPart(
      policy,
      [0.05, 0.11, 0.2],
      [Math.sin(angle) * 1.26, -0.55, Math.cos(angle) * 1.26],
      [0, angle - Math.PI / 2, 0],
      0.02,
    );
    porthole.name = "aether-dais-porthole";
    parts.push(paint(porthole, STATION_PALETTE.window));
    const seamAngle = angle + (index === 0 ? -0.3 : 0.3);
    const seam = roundedPart(
      policy,
      [0.05, 0.2, 0.05],
      [Math.sin(seamAngle) * 1.28, -0.56, Math.cos(seamAngle) * 1.28],
      [0, seamAngle - Math.PI / 2, 0],
      0.015,
    );
    seam.name = "aether-panel-seam";
    parts.push(paint(seam, STATION_PALETTE.aetherCladdingAlt));
  }
  // Vent-stack greeble on the back of the dais, away from the visitor line.
  const vent = cylinderPart(
    policy,
    0.045,
    0.06,
    0.34,
    [Math.sin(AETHER_DOCK_YAW + Math.PI) * 0.8, -0.2, Math.cos(AETHER_DOCK_YAW + Math.PI) * 0.8],
  );
  vent.name = "aether-vent-stack";
  parts.push(paint(vent, STATION_PALETTE.steel));
  // Three precise cradle prongs lean inward under the suspended seed.
  for (let index = 0; index < 3; index += 1) {
    const angle = AETHER_DOCK_YAW + Math.PI / 6 + (index / 3) * TWO_PI;
    const lean = 0.32;
    parts.push(
      paint(
        cylinderPart(
          policy,
          0.022,
          0.05,
          0.44,
          [Math.sin(angle) * 0.24, 0.13, Math.cos(angle) * 0.24],
          [-Math.cos(angle) * lean, 0, Math.sin(angle) * lean],
        ),
        STATION_PALETTE.steel,
      ),
    );
  }
  return mergeParts(
    parts,
    "aether-primordial-first-energy-sanctuary",
    STATION_PALETTE.aetherCladding,
  );
}

function createAetherShieldHemisphereGeometry(quality) {
  const policy = geometryPolicy(quality);
  const verticalSegments = Math.max(10, Math.round(policy.round * 0.55));
  // Thick dark containment cup: an outer and an inner partial shell so the
  // shield reads as massive machined plate, opening toward local +X.
  const shell = (radius) =>
    bakeGeometry(
      new THREE.SphereGeometry(
        radius,
        policy.round,
        verticalSegments,
        -Math.PI / 2 + 0.1,
        Math.PI - 0.2,
        0.16,
        Math.PI - 0.32,
      ),
      { scale: [0.82, 1, 1] },
    );
  return mergeParts(
    [
      shell(AETHER_SHIELD_RADIUS),
      shell(AETHER_SHIELD_RADIUS * 0.9),
      // Accent-lit aperture rim ring in the x = 0 mouth plane.
      torusPart(policy, 0.71, 0.03, [0, 0, 0], [0, Math.PI / 2, 0]),
      // Proud meridian spine rib over the dark back of the cup.
      torusPart(
        policy,
        0.75,
        0.032,
        [0, 0, 0],
        [0, 0, Math.PI / 2 + 0.1],
        [1, 0.84, 1],
        Math.PI - 0.2,
      ),
    ],
    "aether-two-separated-shield-hemispheres",
  );
}

function createAetherCausticArcGeometry(quality) {
  const policy = geometryPolicy(quality);
  const arcs = [];
  // Three thin orbital ribbons on distinct tilted planes, outside the cage,
  // tracing the containment field around the caged star.
  for (const [radius, inclination, gapYaw, sweep, tube, planeYaw] of AETHER_ORBITAL_ARCS) {
    const arc = bakeGeometry(
      new THREE.TorusGeometry(radius, tube, policy.radial, policy.curve, sweep),
      { rotation: [Math.PI / 2 - inclination, 0, gapYaw] },
    );
    arc.rotateY(planeYaw);
    arc.name = "aether-abyss-blue-caustic-arc";
    arcs.push(arc);
  }
  return mergeParts(arcs, "aether-abyss-blue-caustic-arc");
}

function createAetherFirstEnergySeedGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      // Small and blinding: a white-hot faceted core inside one tight amber
      // corona shell. Point-source drama instead of a dominant emissive ball.
      bakeGeometry(
        new THREE.IcosahedronGeometry(AETHER_SEED_CORE_RADIUS, quality === "high" ? 2 : 1),
      ),
      bakeGeometry(
        new THREE.SphereGeometry(
          AETHER_DOMINANT_SEED_RADIUS,
          policy.round,
          Math.max(12, Math.round(policy.round * 0.65)),
        ),
        { scale: [1, 1.05, 1] },
      ),
      // One restrained slender upward ray keeps the reliquary read without wash.
      cylinderPart(policy, 0.006, 0.02, 0.46, [0, 0.42, 0]),
      createAetherCausticArcGeometry(quality),
    ],
    "aether-one-golden-energy-seed holy-upward-rays persistent-cycle aether-abyss-blue-caustic-arc",
  );
}

function createFieldContainmentFrameGeometry(quality) {
  const policy = geometryPolicy(quality);
  // Antarctic plant-equipment heater chassis in shared graphite steel: skid
  // frame legs, reflector trough under the exposed heating elements, guard
  // bars, panel-clad control housing with seams, vent-stack greeble, and a
  // windward snow-drift skirt. The glowing elements and firebox live in the
  // coil/packet pools so the steel stays dark at the bottom of the gradient.
  const parts = [];
  for (const side of [-1, 1]) {
    const skid = roundedPart(policy, [2.4, 0.1, 0.15], [0, -0.59, side * 0.48], [0, 0, 0], 0.03);
    skid.name = "field-steel-skid-frame";
    parts.push(paint(skid, STATION_PALETTE.steel));
    parts.push(
      paint(
        roundedPart(policy, [0.14, 0.09, 1.02], [side * 0.9, -0.56, 0], [0, 0, 0], 0.03),
        STATION_PALETTE.steel,
      ),
    );
    for (const legX of [-0.88, 0.88]) {
      parts.push(
        paint(
          cylinderPart(policy, 0.04, 0.05, 0.42, [legX, -0.35, side * 0.34]),
          STATION_PALETTE.steel,
        ),
      );
    }
    // Reflector trough wings angled up around the element bank.
    parts.push(
      paint(
        roundedPart(policy, [1.82, 0.05, 0.36], [0, 0.12, side * 0.38], [side * -0.55, 0, 0], 0.02),
        STATION_PALETTE.steel,
      ),
    );
    // Heater end plates and rim collars closing the element run.
    parts.push(
      paint(
        cylinderPart(policy, 0.48, 0.48, 0.13, [side * 0.97, FIELD_ELEMENT_AXIS_Y, 0], [0, 0, Math.PI / 2]),
        STATION_PALETTE.fieldCladding,
      ),
    );
    parts.push(
      paint(
        torusPart(policy, 0.44, 0.03, [side * 0.99, FIELD_ELEMENT_AXIS_Y, 0], [0, Math.PI / 2, 0]),
        STATION_PALETTE.trim,
      ),
    );
  }
  parts.push(
    paint(
      roundedPart(policy, [1.82, 0.06, 0.72], [0, -0.03, 0], [0, 0, 0], 0.03),
      STATION_PALETTE.fieldCladdingAlt,
    ),
  );
  // Safety guard bars across the open element face (three on the dock side).
  for (const [barY, barZ] of [
    [0.16, 0.4],
    [FIELD_ELEMENT_AXIS_Y, 0.44],
    [0.48, 0.4],
    [FIELD_ELEMENT_AXIS_Y, -0.44],
  ]) {
    parts.push(
      paint(
        cylinderPart(policy, 0.014, 0.014, 1.86, [0, barY, barZ], [0, 0, Math.PI / 2]),
        STATION_PALETTE.trim,
      ),
    );
  }
  // Panel-clad control housing with proud seam strips and an access door.
  parts.push(
    paint(
      roundedPart(policy, [0.6, 0.68, 0.66], [1.26, 0, 0], [0, 0, 0], 0.05),
      STATION_PALETTE.fieldCladding,
    ),
  );
  for (const seamY of [-0.2, 0.18]) {
    const seam = roundedPart(policy, [0.62, 0.022, 0.675], [1.26, seamY, 0], [0, 0, 0], 0.01);
    seam.name = "field-panel-seam";
    parts.push(paint(seam, STATION_PALETTE.steel));
  }
  parts.push(
    paint(
      roundedPart(policy, [0.03, 0.4, 0.34], [1.565, -0.02, 0], [0, 0, 0], 0.012),
      STATION_PALETTE.trim,
    ),
  );
  const vent = cylinderPart(policy, 0.055, 0.07, 0.5, [1.36, 0.58, -0.14]);
  vent.name = "field-vent-stack";
  parts.push(paint(vent, STATION_PALETTE.steel));
  parts.push(
    paint(
      torusPart(policy, 0.07, 0.018, [1.36, 0.76, -0.14], [Math.PI / 2, 0, 0]),
      STATION_PALETTE.steel,
    ),
  );
  parts.push(
    paint(cylinderPart(policy, 0.095, 0.02, 0.08, [1.36, 0.87, -0.14]), STATION_PALETTE.steel),
  );
  // Windward drift skirt, intentionally buried below the skid contact plane.
  const skirt = roundedPart(policy, [2.2, 0.16, 0.5], [0, -0.56, -0.66], [0.35, 0, 0], 0.05);
  skirt.name = "field-snow-drift-skirt";
  parts.push(paint(skirt, STATION_PALETTE.drift));
  return mergeParts(
    parts,
    "field-graphite-copper-contained-thermal-chamber",
    STATION_PALETTE.fieldCladding,
  );
}

class FieldHelixCurve extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * TWO_PI * FIELD_ELEMENT_TURNS;
    return target.set(
      (t - 0.5) * FIELD_HEATER_HALF_LENGTH * 2,
      Math.cos(angle) * FIELD_ELEMENT_RADIUS,
      Math.sin(angle) * FIELD_ELEMENT_RADIUS,
    );
  }
}

function createFieldHelixGeometry(quality) {
  const policy = geometryPolicy(quality);
  // The helix reads as a heating element at temperature: one longitudinal
  // amber element run with three support collars ringing the element axis.
  const helix = bakeGeometry(
    new THREE.TubeGeometry(
      new FieldHelixCurve(),
      Math.max(48, policy.curve),
      quality === "low" ? 0.03 : 0.038,
      policy.radial,
      false,
    ),
  );
  const parts = [helix];
  for (const collarX of [-0.55, 0, 0.55]) {
    parts.push(torusPart(policy, 0.33, 0.02, [collarX, 0, 0], [0, Math.PI / 2, 0]));
  }
  return mergeParts(parts, "field-compressing-helical-coils");
}

function createFieldFluxPacketGeometry(quality) {
  const policy = geometryPolicy(quality);
  // Symbiote nano-flux blob: an elongated head lobe, a trailing tendril
  // capsule, and one satellite droplet so the mass reads as living substance
  // rather than a machined bead. The merged plasma core carries the white-hot
  // firebox read when instance zero scales up at the heater heart.
  return mergeParts(
    [
      bakeGeometry(new THREE.IcosahedronGeometry(0.07, quality === "high" ? 2 : 1), {
        scale: [1.25, 0.82, 0.82],
      }),
      bakeGeometry(
        new THREE.CapsuleGeometry(0.022, 0.11, policy.cap, policy.radial),
        { position: [-0.1, 0, 0], rotation: [0, 0, Math.PI / 2] },
      ),
      bakeGeometry(new THREE.IcosahedronGeometry(0.045, quality === "high" ? 2 : 1), {
        position: [0.09, 0.028, 0.012],
      }),
      createFieldPlasmaCoreGeometry(quality),
    ],
    "field-charge-packets flux-skin field-graphite-copper-orange-white-plasma",
  );
}

function createFieldPlasmaCoreGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(new THREE.IcosahedronGeometry(0.19, quality === "high" ? 3 : 2), {
        scale: [0.78, 1.32, 0.78],
      }),
      torusPart(policy, 0.25, 0.022, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]),
      torusPart(policy, 0.21, 0.014, [0, 0, 0], [0.32, 0.18, Math.PI / 2], [1, 0.86, 1]),
    ],
    "field-graphite-copper-orange-white-plasma",
  );
}

// Component-space catenary crest layered over the shared library manifold
// sample. It depends only on the normalized span position, so adjacent
// endpoint-to-center construction bands still share identical boundary
// vertices and the reveal seams stay closed.
function qpuCrestLift(normalizedX) {
  return QPU_CREST_BOOST * (1 - normalizedX * normalizedX);
}

function createQpuStableDockBandGeometry(quality) {
  const policy = geometryPolicy(quality);
  const shardFacets = quality === "low" ? 5 : 6;
  const parts = [
    // Visitor dock walk strip plus two end landings. The old full-width plank
    // under the deck is gone so the glass span reads as a floating arc. Deck
    // structure is the shared graphite steel; only the crystal and the glass
    // span carry the station's saturated jade.
    paint(
      roundedPart(policy, [2.9, 0.08, 0.3], [0, -0.45, -0.55], [0, 0, 0], 0.035),
      STATION_PALETTE.steel,
    ),
    paint(
      roundedPart(policy, [0.66, 0.09, 0.78], [-1.52, -0.44, 0], [0, 0, 0], 0.04),
      STATION_PALETTE.qpuCladding,
    ),
    paint(
      roundedPart(policy, [0.66, 0.09, 0.78], [1.52, -0.44, 0], [0, 0, 0], 0.04),
      STATION_PALETTE.qpuCladdingAlt,
    ),
  ];
  // Coral edge striping along both landings and one ember marker lamp each:
  // the causeway reads as a maintained crossing, not an abstract ramp.
  for (const side of [-1, 1]) {
    for (const edgeZ of [-0.42, 0.42]) {
      const trim = roundedPart(
        policy,
        [0.68, 0.035, 0.05],
        [side * 1.52, -0.4, edgeZ],
        [0, 0, 0],
        0.014,
      );
      trim.name = "qpu-landing-trim";
      parts.push(paint(trim, STATION_PALETTE.trim));
    }
    const marker = roundedPart(
      policy,
      [0.09, 0.1, 0.09],
      [side * 1.78, -0.36, -0.28],
      [0, 0, 0],
      0.025,
    );
    marker.name = "qpu-landing-marker-lamp";
    parts.push(paint(marker, STATION_PALETTE.window));
  }
  for (const x of [-1.58, 1.58]) {
    parts.push(
      paint(
        cylinderPart(
          policy,
          QPU_ABUTMENT_RADIUS * 0.78,
          QPU_ABUTMENT_RADIUS,
          QPU_ABUTMENT_HEIGHT,
          [x, -0.18, 0],
        ),
        STATION_PALETTE.steel,
      ),
    );
  }
  // Clustered angular crystal pylons at each abutment: one faceted root spike
  // reaching down toward the ice, one tall mast shard, two leaning fore/aft
  // shards, and a landing collar. Faceted normals keep them reading as cut
  // crystal instead of smooth posts.
  for (const side of [-1, 1]) {
    const x = side * 1.52;
    const shard = (part) => {
      part.name = "qpu-crystal-pylon-cluster";
      parts.push(paint(part, STATION_PALETTE.qpuGlass));
    };
    shard(facetedPart(0.15, 0.05, 1.15, shardFacets, [x, -0.55, 0]));
    shard(
      facetedPart(0.035, 0.145, 1.55, shardFacets, [x, 0.55, 0], [0, side * 0.4, side * 0.07]),
    );
    shard(
      facetedPart(0.028, 0.105, 0.95, shardFacets, [x * 0.96, 0.16, 0.31], [0.12, 0, -side * 0.1]),
    );
    shard(
      facetedPart(0.024, 0.09, 0.78, shardFacets, [x * 0.96, 0.08, -0.31], [-0.12, 0, -side * 0.06]),
    );
    const collar = torusPart(policy, 0.24, 0.028, [x, 0.15, 0], [Math.PI / 2, 0, 0]);
    collar.name = "qpu-crystal-pylon-cluster";
    parts.push(paint(collar, STATION_PALETTE.steel));
  }
  return mergeParts(
    parts,
    "qpu-jade-cyan-coherence-causeway qpu-stable-visitor-dock-band-and-slender-abutments",
    STATION_PALETTE.qpuCladding,
  );
}

function createQpuContinuousManifoldGeometry(quality) {
  const uSegments = quality === "high" ? 48 : quality === "medium" ? 32 : 20;
  const vSegments = quality === "high" ? 16 : quality === "medium" ? 12 : 8;
  const positions = [];
  const bandIndices = Array.from({ length: uSegments }, () => []);
  const rowLength = vSegments + 1;

  for (let surface = 0; surface < 2; surface += 1) {
    for (let uIndex = 0; uIndex <= uSegments; uIndex += 1) {
      const x = -QPU_MANIFOLD_LAYOUT.halfSpan +
        (uIndex / uSegments) * QPU_MANIFOLD_LAYOUT.halfSpan * 2;
      for (let vIndex = 0; vIndex <= vSegments; vIndex += 1) {
        const z = -QPU_MANIFOLD_LAYOUT.halfDepth +
          (vIndex / vSegments) * QPU_MANIFOLD_LAYOUT.halfDepth * 2;
        const point = sampleQpuManifoldPoint(x, z);
        const crest = qpuCrestLift(x / QPU_MANIFOLD_LAYOUT.halfSpan);
        positions.push(
          point.x,
          point.y + crest - surface * QPU_MANIFOLD_LAYOUT.floorThickness,
          point.z,
        );
      }
    }
  }

  const surfaceStride = (uSegments + 1) * rowLength;
  for (let uIndex = 0; uIndex < uSegments; uIndex += 1) {
    const indices = bandIndices[uIndex];
    for (let surface = 0; surface < 2; surface += 1) {
      const offset = surface * surfaceStride;
      for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
        const a = offset + uIndex * rowLength + vIndex;
        const b = a + rowLength;
        if (surface === 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
        else indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    for (const vIndex of [0, vSegments]) {
      const topA = uIndex * rowLength + vIndex;
      const topB = (uIndex + 1) * rowLength + vIndex;
      const floorA = surfaceStride + topA;
      const floorB = surfaceStride + topB;
      indices.push(topA, floorA, topB, topB, floorA, floorB);
    }
    if (uIndex === 0 || uIndex === uSegments - 1) {
      const endpointU = uIndex === 0 ? 0 : uSegments;
      for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
        const topA = endpointU * rowLength + vIndex;
        const topB = topA + 1;
        const floorA = surfaceStride + topA;
        const floorB = surfaceStride + topB;
        indices.push(topA, topB, floorA, topB, floorB, floorA);
      }
    }
  }

  const orderedIndices = [];
  const constructionStepEndVertexCounts = [];
  for (let step = 0; step < Math.ceil(uSegments / 2); step += 1) {
    const leftBand = step;
    const rightBand = uSegments - 1 - step;
    orderedIndices.push(...bandIndices[leftBand]);
    if (rightBand !== leftBand) orderedIndices.push(...bandIndices[rightBand]);
    constructionStepEndVertexCounts.push(orderedIndices.length);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(orderedIndices);
  geometry.computeVertexNormals();
  geometry.name = "qpu-one-piece-global-sampled-double-curved-riemann-floor-and-shell";
  const baked = bakeGeometry(geometry);
  baked.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return baked;
}

function createQpuManifoldRibGeometry(quality) {
  const policy = geometryPolicy(quality);
  return tubePart(
    policy,
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.02, -QPU_MANIFOLD_LAYOUT.halfDepth),
      new THREE.Vector3(0, 0.26, 0),
      new THREE.Vector3(0, 0.02, QPU_MANIFOLD_LAYOUT.halfDepth),
    ),
    0.03,
    "qpu-endpoint-to-center-reconstruction-rib",
  );
}

function createQpuCausewayFrameGeometry(quality) {
  const stableGeometry = createQpuStableDockBandGeometry(quality);
  const constructionGeometry = createQpuContinuousManifoldGeometry(quality);
  const stableVertexCount = stableGeometry.getAttribute("position").count;
  const constructionVertexCount = constructionGeometry.getAttribute("position").count;
  const constructionStepEndVertexCounts = [
    ...constructionGeometry.userData.constructionStepEndVertexCounts,
  ];
  const geometry = mergeParts(
    [stableGeometry, constructionGeometry],
    "qpu-jade-cyan-coherence-causeway qpu-continuous-global-riemann-manifold qpu-contiguous-floor-shell-and-ribs",
    STATION_PALETTE.qpuGlass,
  );
  geometry.userData.stableVertexCount = stableVertexCount;
  geometry.userData.constructionVertexCount = constructionVertexCount;
  geometry.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return geometry;
}

function createQpuCoherencePlateGeometry(quality) {
  const policy = geometryPolicy(quality);
  // Floating coherence stabilizer ring hovering beside the span; alternate
  // plate instances yaw half a turn so the rings flank both deck edges.
  const ring = torusPart(
    policy,
    0.15,
    0.02,
    [0, 0.3, QPU_MANIFOLD_LAYOUT.halfDepth + 0.26],
    [0, Math.PI / 2, 0],
  );
  ring.name = "qpu-floating-coherence-stabilizer-ring";
  return mergeParts(
    [
      createQpuManifoldRibGeometry(quality),
      tubePart(
        policy,
        new THREE.LineCurve3(
          new THREE.Vector3(-0.08, 0, 0),
          new THREE.Vector3(0.08, 0, 0),
        ),
        0.018,
        "qpu-rib-edge-lock",
      ),
      ring,
    ],
    "qpu-manifold-reconstruction-ribs qpu-alien-iridescent-interference-fins",
  );
}

function createQpuSignalGeometry(quality) {
  const policy = geometryPolicy(quality);
  return bakeGeometry(
    new THREE.CapsuleGeometry(0.045, 0.34, policy.cap, policy.radial),
    { rotation: [0, 0, Math.PI / 2] },
  );
}

function patchAwardSurface(
  material,
  {
    effectMode = 0,
    effectStrength = 0,
    macroStrength,
    orbitalColor,
    orbitalStrength = 0,
    phaseColor,
    rimColor,
    rimStrength,
    windowGain = 0,
  },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAwardWindowGain = { value: windowGain };
    shader.uniforms.uAwardMacroStrength = { value: macroStrength };
    shader.uniforms.uAwardRimColor = { value: new THREE.Color(rimColor) };
    shader.uniforms.uAwardRimStrength = { value: rimStrength };
    shader.uniforms.uAwardEffectMode = { value: effectMode };
    shader.uniforms.uAwardEffectStrength = { value: effectStrength };
    shader.uniforms.uAwardActivity = { value: 0 };
    shader.uniforms.uAwardPhaseColor = { value: new THREE.Color(phaseColor || rimColor) };
    shader.uniforms.uAwardOrbitalColor = { value: new THREE.Color(orbitalColor || rimColor) };
    shader.uniforms.uAwardOrbitalStrength = { value: orbitalStrength };
    shader.uniforms.uAwardTime = { value: 0 };
    material.userData.awardUniforms = shader.uniforms;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vAwardWorldPosition;
varying vec3 vAwardLocalPosition;
uniform float uAwardActivity;
uniform float uAwardEffectMode;
uniform float uAwardTime;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vAwardLocalPosition = position;
float awardFieldMask = step(2.5, uAwardEffectMode) * (1.0 - step(3.5, uAwardEffectMode));
float awardQpuMask = step(3.5, uAwardEffectMode);
float awardThermalBand = sin(position.y * 17.0 + position.x * 3.0 - uAwardTime * 3.2);
float awardNormalFacing = dot(objectNormal, vec3(0.0, 1.0, 0.0));
float awardMotionActivity = uAwardActivity;
const float FIELD_VERTEX_DISPLACEMENT_LIMIT = 0.042;
float awardFieldOffset = clamp(
  awardThermalBand * (0.72 + abs(awardNormalFacing) * 0.28) * awardMotionActivity * 0.042,
  -FIELD_VERTEX_DISPLACEMENT_LIMIT,
  FIELD_VERTEX_DISPLACEMENT_LIMIT
);
transformed += objectNormal * awardFieldOffset * awardFieldMask;

float awardQpuFold = sin(position.y * 8.0 + position.z * 13.0 + uAwardTime * 1.25)
  * cos(position.x * 9.0 - uAwardTime * 0.85)
  * awardMotionActivity;
transformed.x += awardQpuFold * 0.032 * awardQpuMask;
transformed.z -= awardQpuFold * 0.024 * awardQpuMask;
const float QPU_VERTEX_FOLD_LIMIT = 0.036;
transformed.x = position.x + clamp(
  transformed.x - position.x,
  -QPU_VERTEX_FOLD_LIMIT,
  QPU_VERTEX_FOLD_LIMIT
);
transformed.z = position.z + clamp(
  transformed.z - position.z,
  -QPU_VERTEX_FOLD_LIMIT,
  QPU_VERTEX_FOLD_LIMIT
);`,
      )
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>\nvAwardWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vAwardWorldPosition;
varying vec3 vAwardLocalPosition;
uniform vec3 uAwardRimColor;
uniform vec3 uAwardPhaseColor;
uniform vec3 uAwardOrbitalColor;
uniform float uAwardOrbitalStrength;
uniform float uAwardRimStrength;
uniform float uAwardMacroStrength;
uniform float uAwardEffectMode;
uniform float uAwardEffectStrength;
uniform float uAwardTime;
uniform float uAwardWindowGain;

float awardSignal(vec3 p) {
  return sin(p.x + sin(p.z * 1.37)) * cos(p.y * 0.83 + p.z * 0.41);
}

float awardLowPass(vec3 p) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * awardSignal(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.35;
  }
  return value;
}

float awardStationField(vec3 p) {
  float axial = 0.5 + 0.5 * sin(p.x * 11.0 - uAwardTime * 1.7);
  float caustic = pow(0.5 + 0.5 * sin((p.x + p.z) * 8.0 + sin(p.y * 5.0) - uAwardTime), 4.0);
  float thermal = pow(0.5 + 0.5 * sin(p.y * 13.0 - uAwardTime * 3.2 + p.x * 2.0), 3.0);
  float interference = 0.5 + 0.5 * cos(length(p.xz) * 18.0 - p.y * 7.0 + uAwardTime * 1.3);
  float s2Mask = 1.0 - step(1.5, uAwardEffectMode);
  float aetherMask = step(1.5, uAwardEffectMode) * (1.0 - step(2.5, uAwardEffectMode));
  float fieldMask = step(2.5, uAwardEffectMode) * (1.0 - step(3.5, uAwardEffectMode));
  float qpuMask = step(3.5, uAwardEffectMode);
  return axial * s2Mask + caustic * aetherMask + thermal * fieldMask + interference * qpuMask;
}`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
// Donor-inspired low-pass macro structure, wrapped diffuse, and Fresnel containment.
float awardMacro = awardLowPass(vAwardWorldPosition * 0.72);
float awardFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
float awardFresnel = pow(1.0 - awardFacing, 3.0);
float awardWrappedDiffuse = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
float awardStationSignal = awardStationField(vAwardWorldPosition);
reflectedLight.indirectDiffuse += diffuseColor.rgb * (0.045 + awardWrappedDiffuse * 0.075);
reflectedLight.indirectDiffuse *= 1.0 + awardMacro * uAwardMacroStrength;
reflectedLight.indirectDiffuse += uAwardPhaseColor * awardStationSignal * uAwardEffectStrength;
reflectedLight.indirectSpecular += uAwardRimColor * awardFresnel * uAwardRimStrength;
// Shared ember windows: the painted amber vertices of the boot-camp palette
// (warm and mid-value) light from inside. Coral safety trim is warm but far
// darker in green, so it stays a painted stripe instead of becoming a lamp.
float awardWindowWarmth = clamp(diffuseColor.r - diffuseColor.b, 0.0, 1.0);
float awardWindowMask =
  smoothstep(0.16, 0.34, awardWindowWarmth) * smoothstep(0.30, 0.46, diffuseColor.g);
totalEmissiveRadiance += diffuseColor.rgb * awardWindowMask * uAwardWindowGain;
// Orbital caustic recolor: material-gated, keyed on authored local radius so
// the golden seed core stays golden while its orbital ribbons turn violet.
float awardOrbitalMask = uAwardOrbitalStrength * smoothstep(0.5, 0.72, length(vAwardLocalPosition.xz));
totalEmissiveRadiance = mix(totalEmissiveRadiance, uAwardOrbitalColor * (0.5 + awardStationSignal * 0.5), awardOrbitalMask);
reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, uAwardOrbitalColor * 0.32, awardOrbitalMask);`,
      );
  };
  material.customProgramCacheKey = () => "polar-ne-award-surface-v5";
  material.userData.surfaceMath =
    "gain 0.35 low-pass macro / wrapped diffuse / Fresnel containment / authored station field";
  return material;
}

function makeArchitecturalSurface({
  color,
  effectMode = 0,
  effectStrength = 0,
  emissive,
  emissiveIntensity,
  macroStrength = 0.022,
  metalness,
  opacity = 0.96,
  orbitalColor,
  orbitalStrength = 0,
  phaseColor,
  rimColor,
  rimStrength = 0.18,
  roughness,
  vertexColors = false,
  windowGain = 0,
}) {
  const material = patchAwardSurface(
    new THREE.MeshStandardMaterial({
      color,
      dithering: true,
      emissive,
      emissiveIntensity,
      metalness,
      opacity,
      roughness,
      transparent: true,
      vertexColors,
    }),
    {
      effectMode,
      effectStrength,
      macroStrength,
      orbitalColor,
      orbitalStrength,
      phaseColor,
      rimColor,
      rimStrength,
      windowGain,
    },
  );
  material.userData.stationBaseOpacity = opacity;
  return material;
}

function createRenderResources(quality, detailed) {
  const geometries = {
    aetherFrame: createAetherPrimordialSanctuaryGeometry(quality),
    fieldFrame: createFieldContainmentFrameGeometry(quality),
    qpuFrame: createQpuCausewayFrameGeometry(quality),
    s2Frame: createS2AntimatterCryostatGeometry(quality),
  };
  if (detailed) {
    Object.assign(geometries, {
      aetherBead: createAetherFirstEnergySeedGeometry(quality),
      aetherRibbon: createAetherShieldHemisphereGeometry(quality),
      fieldCoil: createFieldHelixGeometry(quality),
      fieldPacket: createFieldFluxPacketGeometry(quality),
      qpuPlate: createQpuCoherencePlateGeometry(quality),
      qpuSignal: createQpuSignalGeometry(quality),
      s2Shell: createS2PenningTrapCoilGeometry(quality),
      s2Signal: createS2DiagnosticBeamlineGeometry(quality),
    });
  }
  const materials = {
    aetherBead: makeArchitecturalSurface({
      color: "#FFF6E2",
      effectMode: 2,
      effectStrength: 0.12,
      emissive: "#FFAB33",
      emissiveIntensity: 1.3,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.55,
      orbitalColor: "#8D69D6",
      orbitalStrength: 1,
      phaseColor: "#FFE9B8",
      rimColor: "#FFFFFF",
      rimStrength: 0.12,
      roughness: 0.12,
    }),
    // The four frame bodies share one construction material read: a white base
    // multiplied by the per-vertex boot-camp palette (graphite steel structure,
    // that station's two desaturated cladding values, coral trim, ember glass).
    // They are lit, not luminous - the identity emissive belongs to the
    // signature mechanism pools.
    aetherFrame: makeArchitecturalSurface({
      color: "#FFFFFF",
      effectMode: 2,
      effectStrength: 0.03,
      emissive: "#1B2C46",
      emissiveIntensity: 0.05,
      metalness: 0.34,
      opacity: 0.98,
      phaseColor: "#2D6FA3",
      rimColor: "#2D6FA3",
      rimStrength: 0.6,
      roughness: 0.48,
      vertexColors: true,
      windowGain: 1.15,
    }),
    aetherRibbon: makeArchitecturalSurface({
      color: "#0B2A56",
      effectMode: 2,
      effectStrength: 0.05,
      emissive: "#122F5E",
      emissiveIntensity: 0.2,
      macroStrength: 0.014,
      metalness: 0.28,
      opacity: 0.985,
      phaseColor: "#2D6FA3",
      rimColor: "#2D6FA3",
      rimStrength: 0.82,
      roughness: 0.52,
    }),
    fieldCoil: makeArchitecturalSurface({
      color: "#B85D2A",
      effectMode: 3,
      effectStrength: 0.17,
      emissive: "#EE9440",
      emissiveIntensity: 0.85,
      metalness: 0.5,
      phaseColor: "#EFC15C",
      rimColor: "#FFE9B8",
      rimStrength: 0.3,
      roughness: 0.24,
    }),
    fieldFrame: makeArchitecturalSurface({
      color: "#FFFFFF",
      effectMode: 3,
      effectStrength: 0.04,
      emissive: "#3A2416",
      emissiveIntensity: 0.05,
      metalness: 0.55,
      opacity: 0.98,
      phaseColor: "#F29C46",
      rimColor: "#E8705E",
      rimStrength: 0.5,
      roughness: 0.46,
      vertexColors: true,
      windowGain: 1.15,
    }),
    fieldPacket: makeArchitecturalSurface({
      color: "#FFF6E6",
      effectMode: 3,
      effectStrength: 0.26,
      emissive: "#FF7A24",
      emissiveIntensity: 1.42,
      macroStrength: 0.01,
      metalness: 0.02,
      phaseColor: "#FFF8E7",
      rimColor: "#FFFFFF",
      rimStrength: 0.24,
      roughness: 0.12,
    }),
    qpuFrame: makeArchitecturalSurface({
      color: "#2EC9B4",
      effectMode: 4,
      effectStrength: 0.16,
      emissive: "#0E8F84",
      emissiveIntensity: 0.62,
      macroStrength: 0.014,
      metalness: 0.3,
      opacity: 0.8,
      phaseColor: "#36D8FF",
      rimColor: "#C9FFEC",
      rimStrength: 0.85,
      roughness: 0.14,
    }),
    qpuPlate: makeArchitecturalSurface({
      color: "#1E6157",
      effectMode: 0,
      effectStrength: 0,
      emissive: "#1FAE93",
      emissiveIntensity: 0.5,
      metalness: 0.78,
      opacity: 0.97,
      phaseColor: "#65D6FF",
      rimColor: "#7DF0B4",
      rimStrength: 0.85,
      roughness: 0.28,
    }),
    qpuSignal: makeArchitecturalSurface({
      color: "#F2FFF7",
      effectMode: 4,
      effectStrength: 0.3,
      emissive: "#4BFFAF",
      emissiveIntensity: 1.45,
      macroStrength: 0.006,
      metalness: 0,
      opacity: 0.98,
      phaseColor: "#B9FFE2",
      rimColor: "#FFFFFF",
      rimStrength: 0.3,
      roughness: 0.08,
    }),
    s2Frame: makeArchitecturalSurface({
      color: "#7FB9DE",
      effectMode: 1,
      effectStrength: 0.1,
      emissive: "#2B4FC9",
      emissiveIntensity: 0.62,
      metalness: 0.48,
      opacity: 0.97,
      phaseColor: "#56D7FF",
      rimColor: "#9FDFFF",
      rimStrength: 0.34,
      roughness: 0.3,
    }),
    s2Shell: makeArchitecturalSurface({
      color: "#5573E0",
      effectMode: 1,
      effectStrength: 0.1,
      emissive: "#3550C8",
      emissiveIntensity: 0.55,
      metalness: 0.6,
      opacity: 0.96,
      phaseColor: "#55CFFF",
      rimColor: "#BFD8FF",
      rimStrength: 0.42,
      roughness: 0.2,
    }),
    s2Signal: makeArchitecturalSurface({
      color: "#E5FAFF",
      effectMode: 1,
      effectStrength: 0.18,
      emissive: "#56D7FF",
      emissiveIntensity: 1.12,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.97,
      phaseColor: "#36D8FF",
      rimColor: "#FFFFFF",
      rimStrength: 0.24,
      roughness: 0.1,
    }),
  };
  return { geometries, materialList: Object.values(materials), materials };
}

function disposeRenderResources(resources) {
  for (const geometry of Object.values(resources.geometries)) geometry.dispose();
  for (const material of resources.materialList) material.dispose();
}

function updateAwardSurfaceTime(resources, elapsed, reducedMotion) {
  const authoredTime = reducedMotion ? REDUCED_MOTION_SHADER_TIME : elapsed;
  for (const material of resources.materialList) {
    const uniforms = material.userData.awardUniforms;
    if (uniforms?.uAwardTime) uniforms.uAwardTime.value = authoredTime;
  }
}

function setAwardSurfaceActivity(material, activity) {
  const uniform = material?.userData.awardUniforms?.uAwardActivity;
  if (uniform) uniform.value = THREE.MathUtils.clamp(activity, 0, 1);
}

function preparePool(mesh, count) {
  if (!mesh) return;
  mesh.count = count;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
}

function setInstance(
  mesh,
  index,
  scratch,
  positionX,
  positionY,
  positionZ,
  rotationX,
  rotationY,
  rotationZ,
  scaleX,
  scaleY,
  scaleZ,
) {
  if (!mesh) return;
  scratch.position.set(positionX, positionY, positionZ);
  scratch.rotation.set(rotationX, rotationY, rotationZ);
  scratch.scale.set(scaleX, scaleY, scaleZ);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function setIdentityInstance(mesh, scratch) {
  setInstance(mesh, 0, scratch, 0, 0, 0, 0, 0, 0, 1, 1, 1);
}

function commitPool(mesh) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function updateQpuFrameDrawRange(frame, buildProgress) {
  const geometry = frame?.geometry;
  const stableVertexCount = geometry?.userData?.stableVertexCount;
  const constructionStepEndVertexCounts = geometry?.userData?.constructionStepEndVertexCounts;
  if (!geometry || !Number.isFinite(stableVertexCount) || !constructionStepEndVertexCounts?.length) return;
  const constructionStep = resolveQpuConstructionStep(
    buildProgress,
    constructionStepEndVertexCounts.length,
  );
  const constructionVertexCount = constructionStep > 0
    ? constructionStepEndVertexCounts[constructionStep - 1]
    : 0;
  const visibleVertexCount = stableVertexCount + constructionVertexCount;
  geometry.setDrawRange(0, visibleVertexCount);
}

function applyS2Instances(state, pools, scratch, rotorAngle) {
  const brownian = state.brownianCoordinates;
  const brownianBlend = state.brownianBlend || 0;
  const swayX = (brownian?.[4] || 0) * brownianBlend;
  const swayZ = (brownian?.[5] || 0) * brownianBlend;
  const closure = state.shellClosure || 0;
  // The merged citadel rotor (faceted kernel drum, six cache blades, tiered
  // crown) spins about its Y bearing via this one instance matrix; the
  // circular plinth inside the same merge is rotation-invariant so it reads
  // as a stationary base. Rotation is independent of the reveal scale and of
  // the contact-plane Y compensation in applyStationRootReveal.
  setInstance(pools.frame, 0, scratch, swayX * 0.4, 0, swayZ * 0.4, 0, rotorAngle, 0, 1, 1, 1);
  // Static diagnostic-gate coil pylons flank the port beamline and tighten
  // toward the citadel as the kernel closes; they never inherit rotor spin.
  const pylonReach = S2_DIAGNOSTIC_HALF_SPAN - S2_KERNEL_SHELL_GAP + (1 - closure) * 0.12;
  const pylonLean = 0.04 + closure * 0.03;
  setInstance(pools.shells, 0, scratch, -pylonReach, 0, S2_PORT_RAIL_Z, 0, 0, pylonLean, 1, 1, 1);
  setInstance(pools.shells, 1, scratch, pylonReach, 0, S2_PORT_RAIL_Z, 0, Math.PI, pylonLean, 1, 1, 1);
  // Crown light arms: co- and counter-rotating sweeps that prove the spin
  // even at thumbnail scale.
  setInstance(
    pools.signals,
    0,
    scratch,
    swayX * 0.4,
    S2_CROWN_BEACON_Y,
    swayZ * 0.4,
    0,
    rotorAngle,
    0,
    1.5,
    1.05,
    1.5,
  );
  setInstance(
    pools.signals,
    1,
    scratch,
    swayX * 0.4,
    S2_CROWN_BEACON_Y - 0.28,
    swayZ * 0.4,
    0,
    -rotorAngle * S2_CROWN_COUNTER_RATE + 1.25,
    0,
    2,
    0.9,
    2,
  );
  const bitPhase = state.proofBitPhase;
  const s2AxialTravel = (bitPhase + Math.PI) / TWO_PI;
  const bitScale = state.capExchange ? 1.18 : 0.6;
  setInstance(
    pools.signals,
    2,
    scratch,
    -S2_DIAGNOSTIC_HALF_SPAN + s2AxialTravel * S2_DIAGNOSTIC_HALF_SPAN * 2,
    0.05 + Math.sin(bitPhase * 2) * 0.05,
    S2_PORT_RAIL_Z + Math.sin(bitPhase) * 0.04,
    bitPhase,
    0,
    0,
    bitScale,
    bitScale,
    bitScale,
  );
  if (pools.shells?.material) {
    pools.shells.material.emissiveIntensity = 0.42 + closure * 0.46;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.2 + closure * 0.22;
  }
  setAwardSurfaceActivity(pools.frame?.material, closure);
  setAwardSurfaceActivity(pools.shells?.material, closure);
  setAwardSurfaceActivity(pools.signals?.material, state.capExchange ? 1 : closure * 0.5);
  commitPool(pools.frame);
  commitPool(pools.shells);
  commitPool(pools.signals);
}

function aetherShieldYaw(bearing) {
  // Orient the cup geometry (opens toward local +X) so its mouth faces the
  // seed from a placement bearing measured off local +Z.
  return Math.atan2(Math.cos(bearing), -Math.sin(bearing));
}

function applyAetherInstances(state, pools, scratch, reducedMotion) {
  setIdentityInstance(pools.frame, scratch);
  const bloom = state.sanctuaryBloom || 0;
  // Eclipse aperture ritual: idle keeps the cups biased toward the dock line;
  // docking parts and swings them open toward the visitor, revealing more of
  // the seed. Reduced motion pins the aperture mid-open.
  const aperture = reducedMotion ? 0.5 : bloom;
  const shieldReach = 0.58 + aperture * 0.16;
  const shieldSwing = 1.2 + aperture * 0.37;
  for (const [index, side, shieldScale, roll] of [
    [0, 1, 1, -0.05],
    [1, -1, 0.9, 0.05],
  ]) {
    const bearing = AETHER_DOCK_YAW + side * shieldSwing;
    setInstance(
      pools.ribbons,
      index,
      scratch,
      Math.sin(bearing) * shieldReach,
      AETHER_SEED_HEIGHT,
      Math.cos(bearing) * shieldReach,
      0,
      aetherShieldYaw(bearing),
      roll,
      shieldScale,
      shieldScale,
      shieldScale,
    );
  }
  // Backdrop shield: the dark eclipse disc behind the seed on the dock axis.
  const backBearing = AETHER_DOCK_YAW + Math.PI;
  setInstance(
    pools.ribbons,
    2,
    scratch,
    Math.sin(backBearing) * 0.74,
    AETHER_SEED_HEIGHT + 0.05,
    Math.cos(backBearing) * 0.74,
    0,
    aetherShieldYaw(backBearing),
    0,
    1.16,
    1.16,
    1.16,
  );

  // Deterministic orbit and seed pulse both derive from the fixed-step
  // circulation phase, which the mechanism authority already freezes under
  // reduced motion and accelerates with proximity/docking.
  const orbit = state.circulationPhase;
  const pulse = 0.5 + 0.5 * Math.sin(orbit * 4);
  const seedScale = 0.95 + pulse * 0.05 + bloom * 0.05;
  setInstance(
    pools.beads,
    0,
    scratch,
    0,
    AETHER_SEED_HEIGHT,
    0,
    0,
    orbit,
    0,
    seedScale,
    seedScale,
    seedScale,
  );
  const cosOrbit = Math.cos(orbit);
  const sinOrbit = Math.sin(orbit);
  const sinTilt = Math.sin(AETHER_ORBITAL_TILT);
  const cosTilt = Math.cos(AETHER_ORBITAL_TILT);
  for (let index = 1; index < state.beadVisibility.length; index += 1) {
    const pathPhase = orbit * 1.6 + ((index - 1) / 6) * TWO_PI;
    const x0 = Math.cos(pathPhase) * AETHER_ORBITAL_RADIUS;
    const y0 = Math.sin(pathPhase) * AETHER_ORBITAL_RADIUS * sinTilt;
    const z0 = Math.sin(pathPhase) * AETHER_ORBITAL_RADIUS * cosTilt;
    const visibility = 0.35 + state.beadVisibility[index] * 0.65;
    const moteScale = (0.055 + bloom * 0.02) * visibility;
    setInstance(
      pools.beads,
      index,
      scratch,
      cosOrbit * x0 + sinOrbit * z0,
      AETHER_SEED_HEIGHT + y0,
      -sinOrbit * x0 + cosOrbit * z0,
      0,
      pathPhase,
      0,
      moteScale,
      moteScale,
      moteScale,
    );
  }
  if (pools.ribbons?.material) {
    pools.ribbons.material.emissiveIntensity = 0.16 + bloom * 0.12;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.5 + bloom * 0.25;
  }
  if (pools.beads?.material) {
    pools.beads.material.emissiveIntensity = 1.15 + pulse * 0.4 + bloom * 0.45;
  }
  setAwardSurfaceActivity(pools.frame?.material, bloom);
  setAwardSurfaceActivity(pools.ribbons?.material, bloom * 0.5);
  setAwardSurfaceActivity(pools.beads?.material, Math.max(bloom, pulse * 0.6));
  commitPool(pools.frame);
  commitPool(pools.ribbons);
  commitPool(pools.beads);
}

function applyFieldInstances(state, pools, scratch, symbiote) {
  setIdentityInstance(pools.frame, scratch);
  const compression = state.compression || 0;
  const excitement = symbiote.excite;
  const livingTime = symbiote.organicTime;
  // The heating-element banks flex with the lib-authored bounded coil tilt and
  // undulate on stacked incommensurate sinusoids so the element run reads as
  // living substance without ever losing its longitudinal heater axis.
  const flex = THREE.MathUtils.degToRad(state.coilTiltsDegrees[0]);
  const swellA =
    Math.sin(livingTime * 0.93) * 0.5 + Math.sin(livingTime * 1.51 + 1.7) * 0.5;
  const swellB =
    Math.sin(livingTime * 1.17 + 3.4) * 0.5 + Math.sin(livingTime * 0.73 + 0.9) * 0.5;
  const undulation = 0.045 + excitement * 0.05;
  setInstance(
    pools.coils,
    0,
    scratch,
    0,
    FIELD_ELEMENT_AXIS_Y + swellA * 0.014,
    0,
    swellA * undulation,
    0,
    flex + swellB * 0.03,
    1,
    1 + swellB * 0.02,
    1 + swellA * 0.02,
  );
  setInstance(
    pools.coils,
    1,
    scratch,
    0,
    FIELD_ELEMENT_AXIS_Y + swellB * 0.012,
    0,
    Math.PI + swellB * undulation * 0.8,
    0,
    -flex + swellA * 0.03,
    0.99,
    0.62 + swellA * 0.015,
    0.62 + swellB * 0.015,
  );
  // Firebox heart: a double-thump pulse whose cadence quickens while docked.
  const beat =
    Math.pow(Math.max(0, Math.sin(symbiote.pulse)), 3) +
    0.55 * Math.pow(Math.max(0, Math.sin(symbiote.pulse - 0.42)), 3);
  const coreScale = 0.78 + compression * 0.3 + beat * (0.1 + excitement * 0.08);
  setInstance(
    pools.packets,
    0,
    scratch,
    0,
    FIELD_ELEMENT_AXIS_Y,
    0,
    0,
    symbiote.crawl * TWO_PI,
    0,
    coreScale,
    coreScale * (1.05 + beat * 0.06),
    coreScale,
  );
  // Symbiote nano-flux packets crawl the element helix. Their travel stacks
  // the deterministic lib packet phase, the shared crawl phase, and two
  // incommensurate sinusoids so no packet ever marches linear-mechanically.
  for (let index = 1; index < state.packetPhases.length; index += 1) {
    const wander =
      Math.sin(livingTime * 0.83 + index * 2.39) * 0.045 +
      Math.sin(livingTime * 1.71 + index * 1.13) * 0.028;
    const travel = (((state.packetPhases[index] + symbiote.crawl + wander) % 1) + 1) % 1;
    const angle = travel * TWO_PI * FIELD_ELEMENT_TURNS;
    const hug = FIELD_ELEMENT_RADIUS + 0.02 * Math.sin(livingTime * 1.9 + index * 2.7);
    const tangentX = FIELD_HEATER_HALF_LENGTH * 2;
    const tangentY = -Math.sin(angle) * hug * TWO_PI * FIELD_ELEMENT_TURNS;
    const tangentZ = Math.cos(angle) * hug * TWO_PI * FIELD_ELEMENT_TURNS;
    const packetScale =
      0.3 + excitement * 0.13 + 0.045 * Math.sin(livingTime * 2.3 + index * 3.1);
    setInstance(
      pools.packets,
      index,
      scratch,
      (travel - 0.5) * FIELD_HEATER_HALF_LENGTH * 2,
      FIELD_ELEMENT_AXIS_Y + Math.cos(angle) * hug,
      Math.sin(angle) * hug,
      -angle,
      Math.atan2(-tangentZ, tangentX),
      Math.atan2(tangentY, Math.hypot(tangentX, tangentZ)),
      packetScale,
      packetScale * 0.9,
      packetScale * 0.9,
    );
  }
  // Static warm porthole windows on the dock-facing control-housing wall.
  for (let index = 0; index < FIELD_PORTHOLE_WINDOWS.length; index += 1) {
    const [windowX, windowY, windowZ] = FIELD_PORTHOLE_WINDOWS[index];
    setInstance(
      pools.packets,
      state.packetPhases.length + index,
      scratch,
      windowX,
      windowY,
      windowZ,
      Math.PI / 2,
      0,
      0,
      0.4,
      0.14,
      0.4,
    );
  }
  if (pools.coils?.material) {
    pools.coils.material.emissiveIntensity = 0.55 + compression * 0.35 + excitement * 0.45;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.34 + state.fluxSkin * 0.22 + excitement * 0.2;
  }
  if (pools.packets?.material) {
    pools.packets.material.emissiveIntensity =
      1.18 + compression * 0.4 + excitement * 0.5 + beat * 0.25;
  }
  // Chassis skin stays subtle: enough shimmer that the panels feel possessed,
  // never enough that the machined end plates read as melting silhouettes.
  setAwardSurfaceActivity(
    pools.frame?.material,
    Math.min(0.4, Math.max(state.fluxSkin, excitement) * 0.4),
  );
  // The element tube is thin, so full shader activity would shred the helix
  // into flame petals; cap the displacement low enough that the run always
  // reads as glowing heater elements with a living skin, never open fire.
  setAwardSurfaceActivity(
    pools.coils?.material,
    0.16 + Math.max(compression, excitement) * 0.26,
  );
  setAwardSurfaceActivity(
    pools.packets?.material,
    Math.max(compression, state.fluxSkin, excitement),
  );
  commitPool(pools.frame);
  commitPool(pools.coils);
  commitPool(pools.packets);
}

function applyQpuInstances(state, pools, scratch, traffic, reducedMotion) {
  updateQpuFrameDrawRange(pools.frame, state.manifoldBuild);
  setInstance(
    pools.frame,
    0,
    scratch,
    0,
    QPU_INVERSE_BRIDGE_LIFT,
    0,
    0,
    0,
    0,
    QPU_FRAME_SCALE,
    QPU_FRAME_SCALE,
    QPU_FRAME_SCALE,
  );
  const trafficBlend = reducedMotion ? 1 : traffic.blend;
  const lastSlice = state.manifoldSliceBuild.length - 1;
  const sliceSpacing = (QPU_BRIDGE_HALF_SPAN * 2) / lastSlice;
  for (let index = 0; index < state.manifoldSliceBuild.length; index += 1) {
    const build = state.manifoldSliceBuild[index];
    const normalizedX = index / lastSlice * 2 - 1;
    const x = -QPU_BRIDGE_HALF_SPAN + index * sliceSpacing;
    const arch = QPU_DECK_ARCH * (1 - normalizedX * normalizedX) + qpuCrestLift(normalizedX);
    const reweave = Math.sin(state.reweavePhase + index * 0.42) * 0.012 * state.manifoldBuild;
    // Deterministic stabilizer bob rides the same fixed-step reweave phase;
    // reduced motion holds the ribs and rings perfectly still.
    const bob = reducedMotion
      ? 0
      : Math.sin(state.reweavePhase * 0.8 + index * 1.7) * 0.02 * state.manifoldBuild;
    setInstance(
      pools.plates,
      index,
      scratch,
      x,
      QPU_INVERSE_BRIDGE_LIFT + arch + reweave + bob,
      0,
      0,
      index % 2 === 0 ? 0 : Math.PI,
      normalizedX * -0.21 + reweave * 0.8,
      1.04,
      0.045 + build * 0.955,
      1,
    );
  }
  // Signal traffic ritual: light pulses travel the deck in both directions
  // with phase offsets. Idle keeps sparse slow carriers; docking multiplies
  // the traffic and roughly doubles its cadence, with interference brightening
  // toward midspan. Reduced motion pins a static standing-wave pattern of
  // bright nodes along the deck instead of travel.
  const deckSlope = 2 * (QPU_DECK_ARCH + QPU_CREST_BOOST) * QPU_FRAME_SCALE / QPU_BRIDGE_HALF_SPAN;
  for (let index = 0; index < QPU_PULSE_COUNT; index += 1) {
    const direction = index % 2 === 0 ? 1 : -1;
    const offset = index / QPU_PULSE_COUNT;
    const travel = reducedMotion
      ? (index + 0.5) / QPU_PULSE_COUNT
      : (((traffic.phase * direction + offset) % 1) + 1) % 1;
    const normalizedX = travel * 2 - 1;
    const x = normalizedX * QPU_BRIDGE_HALF_SPAN;
    const deckLocalY = 0.14 + (QPU_DECK_ARCH + QPU_CREST_BOOST) * (1 - normalizedX * normalizedX);
    const idleCarrier = index % 3 === 0 ? 1 : 0.22;
    const presence = idleCarrier + (1 - idleCarrier) * trafficBlend;
    const interference = reducedMotion
      ? 0.5 + 0.5 * Math.cos(normalizedX * Math.PI * 5)
      : (1 - Math.abs(normalizedX)) * trafficBlend;
    const pulseScale =
      (0.26 + trafficBlend * 0.16 + interference * 0.24) *
      presence *
      (0.35 + state.manifoldBuild * 0.65);
    setInstance(
      pools.signals,
      index,
      scratch,
      x,
      QPU_INVERSE_BRIDGE_LIFT + QPU_FRAME_SCALE * deckLocalY + 0.075,
      direction * 0.17,
      0,
      0,
      Math.atan(-deckSlope * normalizedX),
      pulseScale * 1.3,
      pulseScale,
      pulseScale,
    );
  }
  const progress = state.verificationBeamProgress;
  const coherenceSpan = 0.2 + Math.max(state.coherence, progress) * 0.8;
  const beamLength = QPU_BRIDGE_HALF_SPAN * 2 * coherenceSpan;
  setInstance(
    pools.signals,
    QPU_PULSE_COUNT,
    scratch,
    -QPU_BRIDGE_HALF_SPAN + beamLength * 0.5,
    QPU_INVERSE_BRIDGE_LIFT + QPU_FRAME_SCALE * (0.14 + QPU_DECK_ARCH + QPU_CREST_BOOST) + 0.24,
    0,
    0,
    0,
    0,
    Math.max(0.05, beamLength / QPU_SIGNAL_BASE_LENGTH),
    0.6 + progress * 0.5,
    0.6 + progress * 0.5,
  );
  if (pools.plates?.material) {
    pools.plates.material.emissiveIntensity =
      0.24 + state.sanctumPulse * 0.3 + trafficBlend * 0.22;
  }
  if (pools.signals?.material) {
    pools.signals.material.emissiveIntensity =
      1.05 + trafficBlend * 0.7 + Math.max(state.coherence, progress) * 0.6;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity =
      0.5 + state.sanctumPulse * 0.34 + trafficBlend * 0.4;
  }
  const qpuActivity = Math.max(state.coherence, progress, state.sanctumPulse, trafficBlend);
  setAwardSurfaceActivity(pools.frame?.material, qpuActivity);
  setAwardSurfaceActivity(pools.plates?.material, qpuActivity);
  setAwardSurfaceActivity(pools.signals?.material, qpuActivity);
  commitPool(pools.frame);
  commitPool(pools.plates);
  commitPool(pools.signals);
}

function applyStationRootReveal(root, stationId, alpha, familyAlpha, isPromise, isDocked) {
  if (!root) return;
  root.visible = alpha > 0.005 && familyAlpha > 0.005;
  if (!root.visible) return;
  const heroScale = NE_MONUMENT_CONTRACTS[stationId]?.heroScale ?? 1;
  const revealScale = isPromise ? 0.88 : isDocked ? heroScale : 1;
  root.scale.setScalar(revealScale);
  const lowestLocalY = STATION_LOWEST_LOCAL_Y[stationId];
  if (lowestLocalY !== undefined) {
    // Scale about the ground-contact plane, not the root origin: lift the root
    // so the monument's lowest authored point stays at its idle contact height
    // for whatever scale value this frame applies (hero, promise, or idle).
    root.position.y =
      STATION_TRANSFORMS[stationId].position[1] + (revealScale - 1) * -lowestLocalY;
  }
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const baseOpacity = material.userData.stationBaseOpacity ?? 1;
      material.opacity = baseOpacity * familyAlpha * (isPromise ? alpha : 1);
    }
  });
}

export default function PolarStationMechanismsNE({
  exclusiveStationId = null,
  familyVisibilityRef,
  mechanismStateRef,
  onEvidenceReady,
  quality = "medium",
  reducedMotion = false,
  ritualStateRef,
  safeMode = false,
  traversalPoseRef,
  visible = true,
}) {
  const systemRef = useRef(createNortheastMechanismSystem());
  const s2RotorRef = useRef({ angle: 0, rate: S2_ROTOR_IDLE_RATE, simTime: 0 });
  const fieldSymbioteRef = useRef({
    crawl: 0,
    excite: 0,
    organicTime: 0,
    pulse: 0,
    simTime: 0,
  });
  const qpuTrafficRef = useRef({ blend: 0, phase: 0, simTime: 0 });
  const inputsRef = useRef({});
  const ritualOutputRef = useRef({
    evidenceReady: false,
    phase: null,
    ritual: null,
    stationId: null,
  });
  const evidenceLatchRef = useRef({
    "field-chamber-coils": false,
    "manifold-reactor": false,
    "qpu-ice-bridge": false,
    "s2-kernel-core": false,
  });
  const optionsRef = useRef({ reducedMotion, safeMode });
  const stationRootRefs = useRef({});
  const poolsRef = useRef({
    aether: { beads: null, frame: null, ribbons: null },
    field: { coils: null, frame: null, packets: null },
    qpu: { frame: null, plates: null, signals: null },
    s2: { frame: null, shells: null, signals: null },
  });
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const detailed = quality !== "low";
  const resources = useMemo(() => {
    if (safeMode || !visible) return EMPTY_RENDER_RESOURCES;
    return createRenderResources(quality, detailed);
  }, [detailed, quality, safeMode, visible]);
  const budget = safeMode
    ? NE_MECHANISM_BUDGET.safe
    : NE_MECHANISM_BUDGET[quality] || NE_MECHANISM_BUDGET.medium;

  const s2Frame = useRef(null);
  const s2Shells = useRef(null);
  const s2Signals = useRef(null);
  const aetherFrame = useRef(null);
  const aetherRibbons = useRef(null);
  const aetherBeads = useRef(null);
  const fieldFrame = useRef(null);
  const fieldCoils = useRef(null);
  const fieldPackets = useRef(null);
  const qpuFrame = useRef(null);
  const qpuPlates = useRef(null);
  const qpuSignals = useRef(null);

  useLayoutEffect(() => {
    preparePool(s2Frame.current, 1);
    preparePool(s2Shells.current, 2);
    preparePool(s2Signals.current, 3);
    preparePool(aetherFrame.current, 1);
    preparePool(aetherRibbons.current, 3);
    preparePool(aetherBeads.current, 7);
    preparePool(fieldFrame.current, 1);
    preparePool(fieldCoils.current, 2);
    // Four lib packet slots (firebox heart plus three crawling nano-flux
    // packets) plus the two static ember porthole windows.
    preparePool(fieldPackets.current, 4 + FIELD_PORTHOLE_WINDOWS.length);
    preparePool(qpuFrame.current, 1);
    updateQpuFrameDrawRange(
      qpuFrame.current,
      systemRef.current.states["qpu-ice-bridge"].manifoldBuild,
    );
    preparePool(qpuPlates.current, QPU_MANIFOLD_SLICE_COUNT);
    preparePool(qpuSignals.current, QPU_SIGNAL_POOL_SIZE);
  }, [resources]);

  useEffect(() => () => disposeRenderResources(resources), [resources]);

  useFrame((frameState, delta) => {
    if (!visible) return;
    updateAwardSurfaceTime(resources, frameState.clock.elapsedTime, reducedMotion);
    const pose = traversalPoseRef?.current;
    const reveal = resolveNortheastStationReveal(pose, exclusiveStationId);
    const promiseId = reveal.promiseId;
    const familyAlpha = familyVisibilityRef?.current?.alpha ?? 1;
    for (const id of NE_MECHANISM_IDS) {
      applyStationRootReveal(
        stationRootRefs.current[id],
        id,
        reveal.alphas[id],
        familyAlpha,
        promiseId === id,
        exclusiveStationId === id || pose?.dockedId === id,
      );
    }
    resolveNortheastMechanismInputs(pose, inputsRef.current);
    optionsRef.current.reducedMotion = reducedMotion;
    optionsRef.current.safeMode = safeMode;
    const system = advanceNortheastMechanisms(
      systemRef.current,
      inputsRef.current,
      delta,
      optionsRef.current,
    );
    if (mechanismStateRef) mechanismStateRef.current = system;

    const selectedId = NE_MECHANISM_IDS.includes(exclusiveStationId)
      ? exclusiveStationId
      : NE_MECHANISM_IDS.includes(pose?.dockedId)
        ? pose.dockedId
        : NE_MECHANISM_IDS.includes(pose?.proximityStationId)
          ? pose.proximityStationId
          : null;
    const selectedState = selectedId ? system.states[selectedId] : null;
    const ritualOutput = ritualOutputRef.current;
    ritualOutput.stationId = selectedId;
    ritualOutput.phase = selectedState?.phase || null;
    ritualOutput.evidenceReady = Boolean(selectedState?.evidenceReady);
    ritualOutput.ritual = selectedState?.ritual || null;
    if (ritualStateRef) ritualStateRef.current = ritualOutput;

    for (const id of NE_MECHANISM_IDS) {
      const state = system.states[id];
      if (state.evidenceReady && !evidenceLatchRef.current[id]) {
        evidenceLatchRef.current[id] = true;
        onEvidenceReady?.(id, state);
      } else if (!state.evidenceReady) {
        evidenceLatchRef.current[id] = false;
      }
    }

    if (safeMode) return;
    const pools = poolsRef.current;
    pools.s2.frame = s2Frame.current;
    pools.s2.shells = s2Shells.current;
    pools.s2.signals = s2Signals.current;
    pools.aether.frame = aetherFrame.current;
    pools.aether.ribbons = aetherRibbons.current;
    pools.aether.beads = aetherBeads.current;
    pools.field.frame = fieldFrame.current;
    pools.field.coils = fieldCoils.current;
    pools.field.packets = fieldPackets.current;
    pools.qpu.frame = qpuFrame.current;
    pools.qpu.plates = qpuPlates.current;
    pools.qpu.signals = qpuSignals.current;
    // Kernel-citadel rotor: idle ambient spin that springs up to the docked
    // ceremonial rate and decays back on undock. Driven only by the fixed-step
    // simulation clock (never the wall clock); reduced motion pins the rotor
    // at one authored deterministic angle.
    const rotor = s2RotorRef.current;
    const s2Docked =
      exclusiveStationId === "s2-kernel-core" || pose?.dockedId === "s2-kernel-core";
    const rotorTargetRate = s2Docked ? S2_ROTOR_DOCKED_RATE : S2_ROTOR_IDLE_RATE;
    const rotorSimDelta = Math.max(0, system.simulationTime - rotor.simTime);
    rotor.simTime = system.simulationTime;
    if (reducedMotion) {
      rotor.rate = 0;
      rotor.angle = S2_ROTOR_REDUCED_ANGLE;
    } else if (rotorSimDelta > 0) {
      rotor.rate +=
        (rotorTargetRate - rotor.rate) *
        (1 - Math.exp(-rotorSimDelta / S2_ROTOR_SPIN_RESPONSE));
      rotor.angle = (rotor.angle + rotor.rate * rotorSimDelta) % TWO_PI;
    }
    applyS2Instances(system.states["s2-kernel-core"], pools.s2, scratch, rotor.angle);
    applyAetherInstances(
      system.states["manifold-reactor"],
      pools.aether,
      scratch,
      reducedMotion,
    );
    // Possessed-heater symbiote: crawl phase, excitement, and firebox pulse
    // all integrate against the fixed-step simulation clock exactly like the
    // S2 rotor spring. Docking roughly doubles the nano-flux crawl cadence
    // and quickens the heartbeat; reduced motion pins one authored pose that
    // stays fully incandescent so the heat gradient never disappears.
    const symbiote = fieldSymbioteRef.current;
    const fieldDocked =
      exclusiveStationId === "field-chamber-coils" ||
      pose?.dockedId === "field-chamber-coils";
    const symbioteSimDelta = Math.max(0, system.simulationTime - symbiote.simTime);
    symbiote.simTime = system.simulationTime;
    if (reducedMotion) {
      symbiote.excite = 1;
      symbiote.crawl = FIELD_SYMBIOTE_REDUCED_CRAWL;
      symbiote.pulse = FIELD_SYMBIOTE_REDUCED_PULSE;
      symbiote.organicTime = 0;
    } else if (symbioteSimDelta > 0) {
      symbiote.excite +=
        ((fieldDocked ? 1 : 0) - symbiote.excite) *
        (1 - Math.exp(-symbioteSimDelta / FIELD_SYMBIOTE_RESPONSE));
      const crawlRate =
        FIELD_SYMBIOTE_IDLE_RATE +
        (FIELD_SYMBIOTE_DOCKED_RATE - FIELD_SYMBIOTE_IDLE_RATE) * symbiote.excite;
      symbiote.crawl = (symbiote.crawl + crawlRate * symbioteSimDelta) % 1;
      symbiote.pulse =
        (symbiote.pulse +
          (FIELD_HEARTBEAT_IDLE_RATE +
            (FIELD_HEARTBEAT_DOCKED_RATE - FIELD_HEARTBEAT_IDLE_RATE) *
              symbiote.excite) *
            symbioteSimDelta) %
        TWO_PI;
      symbiote.organicTime += symbioteSimDelta;
    }
    applyFieldInstances(
      system.states["field-chamber-coils"],
      pools.field,
      scratch,
      symbiote,
    );
    // Coherent-causeway signal traffic: like the S2 rotor, the pulse phase
    // integrates only against the fixed-step simulation clock, easing toward
    // roughly double cadence and full lane occupancy while the seal is docked.
    const traffic = qpuTrafficRef.current;
    const qpuDocked =
      exclusiveStationId === "qpu-ice-bridge" || pose?.dockedId === "qpu-ice-bridge";
    const trafficSimDelta = Math.max(0, system.simulationTime - traffic.simTime);
    traffic.simTime = system.simulationTime;
    if (trafficSimDelta > 0 && !reducedMotion) {
      traffic.blend +=
        ((qpuDocked ? 1 : 0) - traffic.blend) *
        (1 - Math.exp(-trafficSimDelta / QPU_TRAFFIC_RESPONSE));
      const trafficRate =
        QPU_TRAFFIC_IDLE_RATE +
        (QPU_TRAFFIC_DOCKED_RATE - QPU_TRAFFIC_IDLE_RATE) * traffic.blend;
      traffic.phase = (traffic.phase + trafficRate * trafficSimDelta) % 1;
    }
    applyQpuInstances(
      system.states["qpu-ice-bridge"],
      pools.qpu,
      scratch,
      traffic,
      reducedMotion,
    );
  });

  if (safeMode || !visible) return null;

  const s2Transform = STATION_TRANSFORMS["s2-kernel-core"];
  const aetherTransform = STATION_TRANSFORMS["manifold-reactor"];
  const fieldTransform = STATION_TRANSFORMS["field-chamber-coils"];
  const qpuTransform = STATION_TRANSFORMS["qpu-ice-bridge"];
  const castsShadow = quality !== "low";

  return (
    <group
      dispose={null}
      name={NORTHEAST_MECHANISM_RENDER_PROFILE}
      userData={{
        drawCalls: budget.drawCalls,
        programs: budget.programs,
        textures: budget.textures,
      }}
    >
      <group
        name="s2-cern-antimatter-cryostat"
        position={s2Transform.position}
        ref={(node) => {
          stationRootRefs.current["s2-kernel-core"] = node;
        }}
        rotation={s2Transform.rotation}
        userData={NE_MONUMENT_CONTRACTS["s2-kernel-core"]}
      >
        <instancedMesh
          args={[resources.geometries.s2Frame, resources.materials.s2Frame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.s2Frame}
          material={resources.materials.s2Frame}
          name="s2-cern-antimatter-cryostat-frame"
          receiveShadow
          ref={s2Frame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.s2Shell, resources.materials.s2Shell, 2]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.s2Shell}
              material={resources.materials.s2Shell}
              name="s2-penning-trap-superconducting-coil-rings"
              receiveShadow
              ref={s2Shells}
            />
            <instancedMesh
              args={[resources.geometries.s2Signal, resources.materials.s2Signal, 3]}
              frustumCulled
              geometry={resources.geometries.s2Signal}
              material={resources.materials.s2Signal}
              name="s2-vacuum-throat diagnostic-beamline s2-proof-bit"
              ref={s2Signals}
            />
          </>
        ) : null}
      </group>

      <group
        name="aether-primordial-first-energy-sanctuary"
        position={aetherTransform.position}
        ref={(node) => {
          stationRootRefs.current["manifold-reactor"] = node;
        }}
        rotation={aetherTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["manifold-reactor"]}
      >
        <instancedMesh
          args={[resources.geometries.aetherFrame, resources.materials.aetherFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.aetherFrame}
          material={resources.materials.aetherFrame}
          name="aether-primordial-first-energy-sanctuary-frame"
          receiveShadow
          ref={aetherFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.aetherRibbon, resources.materials.aetherRibbon, 3]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.aetherRibbon}
              material={resources.materials.aetherRibbon}
              name="aether-two-separated-shield-hemispheres"
              ref={aetherRibbons}
            />
            <instancedMesh
              args={[resources.geometries.aetherBead, resources.materials.aetherBead, 7]}
              frustumCulled
              geometry={resources.geometries.aetherBead}
              material={resources.materials.aetherBead}
              name="aether-one-golden-energy-seed holy-upward-rays persistent-cycle"
              ref={aetherBeads}
            />
          </>
        ) : null}
      </group>

      <group
        name="field-graphite-copper-contained-thermal-chamber"
        position={fieldTransform.position}
        ref={(node) => {
          stationRootRefs.current["field-chamber-coils"] = node;
        }}
        rotation={fieldTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["field-chamber-coils"]}
      >
        <instancedMesh
          args={[resources.geometries.fieldFrame, resources.materials.fieldFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.fieldFrame}
          material={resources.materials.fieldFrame}
          name="field-graphite-copper-contained-thermal-chamber-frame"
          receiveShadow
          ref={fieldFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.fieldCoil, resources.materials.fieldCoil, 2]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.fieldCoil}
              material={resources.materials.fieldCoil}
              name="field-compressing-helical-coils"
              ref={fieldCoils}
            />
            <instancedMesh
              args={[resources.geometries.fieldPacket, resources.materials.fieldPacket, 6]}
              frustumCulled
              geometry={resources.geometries.fieldPacket}
              material={resources.materials.fieldPacket}
              name="field-charge-packets flux-skin"
              ref={fieldPackets}
            />
          </>
        ) : null}
      </group>

      <group
        name="qpu-continuous-riemann-manifold-pavilion"
        position={qpuTransform.position}
        ref={(node) => {
          stationRootRefs.current["qpu-ice-bridge"] = node;
        }}
        rotation={qpuTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["qpu-ice-bridge"]}
      >
        <instancedMesh
          args={[resources.geometries.qpuFrame, resources.materials.qpuFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.qpuFrame}
          material={resources.materials.qpuFrame}
          name="qpu-stable-visitor-dock-band-and-slender-abutments"
          receiveShadow
          ref={qpuFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.qpuPlate, resources.materials.qpuPlate, QPU_MANIFOLD_SLICE_COUNT]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.qpuPlate}
              material={resources.materials.qpuPlate}
              name="qpu-manifold-reconstruction-ribs qpu-endpoint-to-center-build-field"
              receiveShadow
              ref={qpuPlates}
            />
            <instancedMesh
              args={[resources.geometries.qpuSignal, resources.materials.qpuSignal, QPU_SIGNAL_POOL_SIZE]}
              frustumCulled={false}
              geometry={resources.geometries.qpuSignal}
              material={resources.materials.qpuSignal}
              name="qpu-manifold-verification-beam qpu-coherence-beam-path verification-beam"
              ref={qpuSignals}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}
