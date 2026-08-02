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
  sampleQpuManifoldHeight,
  sampleQpuManifoldPoint,
} from "../lib/polar-station-mechanisms";

export const NORTHEAST_MECHANISM_RENDER_PROFILE =
  "four authored northeast monuments; three bounded architectural instance pools each; shared wrapped-light program; zero textures";
export const S2_CRYOGENIC_LAB_PROFILE =
  "server and data hut of the CERN Penning-trap cryogenic laboratory lineage: insulated panel-clad container on graphite steel stilt legs, cooling louvre stack and two geared fan rotors on the dock wall, cable tray and conduit dropping a rear leg into the snow, a narrow machined pale metal rack window strip with cobalt indicator banks blinking behind it, external ladder and entry platform, windward drift, uplink whip, and a docked cyan diagnostics rack storm under the cobalt axial halo";
export const AETHER_ABYSS_PROFILE =
  "generator hall in abyss-blue: a long low machine hall on a graphite plinth with panel seams, day tanks on a bunded skid, a transformer cabinet, a tall exhaust stack whose abyss-blue condensate plume shimmers in world space, and one small contained living gold burner behind three rolling door slats";
export const FIELD_THERMAL_FORGE_PROFILE =
  "possessed polar plant heater: graphite steel skid chassis with panel-clad control housing and ember portholes, copper-amber helical heating elements at temperature over a reflector trough, one orange-white plasma firebox heart, a nano-particle symbiote flux crawling the elements, and a living heat shimmer";
export const QPU_ICE_CORE_DRILL_PROFILE =
  "ice-core drill rig standing on the snow: a braced graphite steel derrick with a crown block over a hazard-ringed borehole collar on a legged platform, a drawworks winch on a skid, a panel-clad drill shack with ember windows and a mint indicator panel, a cambered catwalk between them built from both ends, core crate stacks, a drill rod rack, cable trays, windward drift, and mint telemetry lights running the winch cable down the hole and back";

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
  aetherCladding: "#96A5C7",
  aetherCladdingAlt: "#9EADCD",
  drift: "#B3C2D2",
  // Only the field family moved, and only to the top of the band it is allowed.
  //
  // Measured at a pinned tier, every building reads 37 to 83 luma darker than
  // the snow it stands on, and three explanations were tested. The light rig is
  // not it: ambient +71% moved the eight measurements by 0.1 to 5 luma. The
  // station personality palettes are not it either: the reactor's
  // world.colors.base went from #274F73 to #6E93B5 and the rendered building
  // moved 0.1 luma. It is these cladding colours.
  //
  // LAW 3 in check-polar-station-mechanisms-ne keeps structure, panel and
  // hardware as three separated value zones, and it used to cap the panel zone
  // at 145 luma. Measured at tier medium, that put every one of the eight
  // buildings between 38 and 83 luma under the snow behind it, with the whole
  // cladding family already pressed against the ceiling at 130-140.
  //
  // The band was widened rather than the ladder abandoned: the panel zone now
  // reaches 172 and the hardware zone starts at 215 instead of 191, so the >=51
  // separation that makes the three zones legible is preserved while the whole
  // building moves up against the snow. Each colour below was lifted by scaling
  // its channels together, so every station keeps the hue that identifies it and
  // only its value changes.
  fieldCladding: "#96A6BC",
  fieldCladdingAlt: "#A1ADC2",
  qpuCladding: "#83ADAC",
  qpuCladdingAlt: "#8BB5B4",
  s2Cladding: "#94A6C4",
  s2CladdingAlt: "#9DAECA",
  // Unchanged. check-polar-station-mechanisms-ne holds the S2 hut's structure
  // zone graphite-dark, and lifting this to #3E4759 took it to 70.4 and failed
  // that contract. The frame is meant to read as frame against the panel.
  steel: "#2A3140",
  trim: "#E8705E",
  window: "#F2B96B",
});
// Bodies are lit, never lamps: every frame pool's emissive stays under this so
// the signature mechanism is always the brightest thing on the station.
const BODY_EMISSIVE_CEILING = 0.06;
// The only places S2 is allowed to be saturated cobalt: the rack indicator
// lights, the painted entry door, and one thin livery trim line under the eave.
const S2_IDENTITY_COBALT = "#5573E0";
// Server & data hut, authored in local space. The station yaw is 38 degrees and
// the visitor dock unrotates to local (-2.40, 1.44), so local -X is the wall the
// seal reads: door bay, louvre stack, fan bank, and rack window strip all live
// there. Local +X is windward and carries the drift and the cable drop.
const S2_HUT_HALF_WIDTH = 0.75;
const S2_HUT_HALF_LENGTH = 1.2;
const S2_HUT_FLOOR_Y = -0.2;
const S2_HUT_ROOF_Y = 0.58;
// Fan hubs stand off the cladding skin by this gap so the guards clear the wall.
const S2_KERNEL_SHELL_GAP = 0.09;
const S2_FAN_WALL_X = -S2_HUT_HALF_WIDTH - S2_KERNEL_SHELL_GAP;
const S2_FAN_Y = 0.06;
const S2_FAN_RADIUS = 0.24;
const S2_FAN_CENTERS_Z = Object.freeze([0.44, 0.96]);
// One turn of the shared rotor bearing spins the cooling fans nine times: the
// old citadel spin machinery survives, re-geared onto the running tell.
const S2_FAN_GEAR_RATIO = 9;
const S2_RACK_WINDOW_X = -S2_HUT_HALF_WIDTH - 0.015;
const S2_RACK_WINDOW_Y = 0.44;
const S2_RACK_WINDOW_Z = 0.42;
const S2_RACK_LIGHT_X = -S2_HUT_HALF_WIDTH - 0.05;
const S2_RACK_BANK_Z = Object.freeze([0.02, 0.88]);
// Half-length of the rack window strip the activity scan travels.
const S2_DIAGNOSTIC_HALF_SPAN = 0.66;
const S2_DOOR_Z = -0.78;
const S2_ROTOR_IDLE_RATE = 0.08;
const S2_ROTOR_DOCKED_RATE = 0.65;
const S2_ROTOR_SPIN_RESPONSE = 0.45;
const S2_ROTOR_REDUCED_ANGLE = 0.75;
// Generator hall, authored in local space. The station yaw is -27 degrees and
// the visitor dock unrotates to local (2.44, 1.37), so the roller door faces
// local +X and the seal reads the door wall plus the +Z long side with its day
// tanks. Local -X/-Z is windward: drift, stack, and pipe runs.
const AETHER_DOMINANT_SEED_RADIUS = 0.14;
const AETHER_SEED_CORE_RADIUS = 0.08;
const AETHER_HALL_X = -0.1;
const AETHER_HALL_HALF_WIDTH = 1.1;
const AETHER_HALL_HALF_DEPTH = 0.7;
const AETHER_HALL_FLOOR_Y = -0.46;
const AETHER_HALL_ROOF_Y = 0.16;
// The roller door sits on the +Z long wall, the one the docked camera reads
// broadside; the day tanks are pushed to the far end so nothing blocks it.
const AETHER_DOOR_X = 0.52;
const AETHER_DOOR_Z = AETHER_HALL_HALF_DEPTH + 0.02;
const AETHER_BURNER = Object.freeze([AETHER_DOOR_X, -0.22, AETHER_DOOR_Z + 0.06]);
// [closed local Y, retracted local Y] per roller-door slat, bottom slat first.
const AETHER_DOOR_SLATS = Object.freeze([
  Object.freeze([-0.365, 0.03]),
  Object.freeze([-0.195, 0.055]),
  Object.freeze([-0.025, 0.08]),
]);
// Six warm indicator lamps: switchgear cabinet, door jambs, day-tank skid.
const AETHER_INDICATOR_LAMPS = Object.freeze([
  Object.freeze([1.11, 0.02, -0.5]),
  Object.freeze([1.11, -0.12, -0.34]),
  Object.freeze([AETHER_DOOR_X - 0.52, -0.02, AETHER_DOOR_Z + 0.08]),
  Object.freeze([AETHER_DOOR_X + 0.52, -0.02, AETHER_DOOR_Z + 0.08]),
  Object.freeze([-0.34, -0.1, 1.06]),
  Object.freeze([-1.14, -0.1, 1.06]),
]);
const AETHER_STACK = Object.freeze([-0.95, -0.42]);
const AETHER_STACK_TOP_Y = 0.88;
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
// ICE-CORE DRILL RIG, authored in local space. The station yaw is -48 degrees
// and the visitor dock unrotates to local (0.82, -3.30), so local -Z is the
// wall the seal reads: shack door, warm window, mint indicator panel, winch
// skid and the borehole all face it. Local +Z is windward and carries the
// drift, the cable tray and the drill-rod rack. The rig SITS ON THE SNOW:
// every foot pad bottoms out at QPU_GROUND_Y, which is the station's entry in
// STATION_LOWEST_LOCAL_Y.
const QPU_BRIDGE_HALF_SPAN = QPU_MANIFOLD_LAYOUT.halfSpan;
const QPU_GROUND_Y = -0.62;
const QPU_DECK_Y = -0.26;
const QPU_SHACK_X = -1.52;
const QPU_BOREHOLE_X = 1.52;
const QPU_CROWN_Y = 0.9;
// The two slender end abutments the catwalk lands on between shack and platform.
const QPU_ABUTMENT_RADIUS = 0.075;
const QPU_ABUTMENT_HEIGHT = 0.42;
const QPU_MANIFOLD_SLICE_COUNT = QPU_MANIFOLD_LAYOUT.sliceCount;
// Catwalk plate level. The shared library samples the walkway camber; this is
// only the height the whole walkway hangs at, plus a small component-space
// crown so the two landings stay drained toward their decks.
const QPU_CATWALK_BASE_Y = -0.26;
const QPU_CREST_BOOST = 0.035;
// Winch cable polyline: drawworks drum -> crown block sheave -> down the hole.
// The telemetry lights ride exactly this path, so the cable a viewer sees and
// the path the light travels are the same three points.
const QPU_CABLE_DRUM = Object.freeze([-0.15, -0.06, -0.46]);
const QPU_CABLE_CROWN = Object.freeze([QPU_BOREHOLE_X, QPU_CROWN_Y, -0.07]);
// The run ends at the collar mouth: a light that reaches it has gone down the
// hole, so nothing is ever left dangling in the open under the platform deck.
const QPU_CABLE_HOLE = Object.freeze([QPU_BOREHOLE_X, QPU_DECK_Y + 0.02, 0]);
// Telemetry lights per direction pair, plus one wireline verification sonde.
const QPU_PULSE_COUNT = 10;
const QPU_SIGNAL_POOL_SIZE = QPU_PULSE_COUNT + 1;
const QPU_TRAFFIC_IDLE_RATE = 0.16;
const QPU_TRAFFIC_DOCKED_RATE = 0.34;
const QPU_TRAFFIC_RESPONSE = 0.6;
// The only places the QPU station is allowed to be saturated mint: the cable
// telemetry lights, the shack indicator panel, and one thin livery trim line.
const QPU_IDENTITY_MINT = "#55CE85";
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
 * the geometry builders (base part center y minus half height):
 * s2 hut stilt foot pads -0.66 - 0.03, aether generator-hall plinth -0.57 - 0.09,
 * field heater skid rails -0.59 - 0.05, qpu drill-rig foot pads and shack skid
 * runners flat on QPU_GROUND_Y. Every station's windward drift wedge
 * intentionally dips below its contact plane so it reads as buried snow load,
 * and must not move the contact value. The QPU station used to float on an
 * authored inverse-bridge lift and was intentionally absent here; that lift is
 * retired, because a drill rig stands on the snow, so it now takes part in
 * contact-plane scaling like every other grounded monument.
 */
const STATION_LOWEST_LOCAL_Y = Object.freeze({
  "field-chamber-coils": -0.64,
  "manifold-reactor": -0.66,
  "qpu-ice-bridge": QPU_GROUND_Y,
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

// A straight member between two authored points: derrick legs, cross braces,
// rod rack stringers and the winch cable are all this. Cheaper than a tube
// along a line curve and it keeps every strut a single low-segment cylinder.
const STRUT_UP = new THREE.Vector3(0, 1, 0);

function strutPart(policy, from, to, radius) {
  const start = new THREE.Vector3(...from);
  const direction = new THREE.Vector3(...to).sub(start);
  const length = direction.length();
  const orientation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(STRUT_UP, direction.clone().normalize()),
  );
  return bakeGeometry(
    new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      Math.max(5, Math.round(policy.round * 0.3)),
      1,
      false,
    ),
    {
      position: [start.x + direction.x / 2, start.y + direction.y / 2, start.z + direction.z / 2],
      rotation: [orientation.x, orientation.y, orientation.z],
    },
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

// SERVER & DATA HUT. An insulated equipment container raised on graphite steel
// stilt legs above the snow, exactly the box a polar camp drops its racks into.
// Body is desaturated blue-grey panel cladding with real corner posts and proud
// seams; structure, trays, guards, ladder and mast are the shared camp steel.
// The saturated cobalt survives only as the painted door and one livery trim
// line - the indicator lights live in the rack-light pool.
function createS2AntimatterCryostatGeometry(quality) {
  const policy = geometryPolicy(quality);
  const wallX = -S2_HUT_HALF_WIDTH;
  const bodyY = (S2_HUT_FLOOR_Y + S2_HUT_ROOF_Y) / 2;
  const bodyHeight = S2_HUT_ROOF_Y - S2_HUT_FLOOR_Y;
  const parts = [];
  const steelPart = (part) => paint(part, STATION_PALETTE.steel);

  // Stilt legs, foot pads and the under-frame that keeps the hut off the snow.
  for (const legX of [-0.54, 0.54]) {
    for (const legZ of [-0.92, 0.92]) {
      parts.push(steelPart(cylinderPart(policy, 0.05, 0.07, 0.46, [legX, -0.43, legZ])));
      parts.push(
        steelPart(roundedPart(policy, [0.2, 0.06, 0.2], [legX, -0.66, legZ], [0, 0, 0], 0.02)),
      );
    }
    parts.push(
      steelPart(roundedPart(policy, [0.08, 0.08, 1.94], [legX, -0.27, 0], [0, 0, 0], 0.02)),
    );
  }
  for (const braceZ of [-0.92, 0.92]) {
    parts.push(
      steelPart(roundedPart(policy, [1.2, 0.07, 0.07], [0, -0.31, braceZ], [0, 0, 0], 0.02)),
    );
  }

  // Insulated container box, roof cap and corner posts.
  parts.push(
    paint(
      roundedPart(
        policy,
        [S2_HUT_HALF_WIDTH * 2, bodyHeight, S2_HUT_HALF_LENGTH * 2],
        [0, bodyY, 0],
        [0, 0, 0],
        0.05,
      ),
      STATION_PALETTE.s2Cladding,
    ),
  );
  parts.push(
    paint(
      roundedPart(
        policy,
        [S2_HUT_HALF_WIDTH * 2 + 0.1, 0.07, S2_HUT_HALF_LENGTH * 2 + 0.1],
        [0, S2_HUT_ROOF_Y + 0.035, 0],
        [0, 0, 0],
        0.03,
      ),
      STATION_PALETTE.s2CladdingAlt,
    ),
  );
  for (const postX of [wallX, -wallX]) {
    for (const postZ of [-S2_HUT_HALF_LENGTH, S2_HUT_HALF_LENGTH]) {
      parts.push(
        steelPart(
          roundedPart(policy, [0.1, bodyHeight + 0.05, 0.1], [postX, bodyY, postZ], [0, 0, 0], 0.02),
        ),
      );
    }
  }
  // Proud vertical panel seams: real geometric steps, so panels stay panels at
  // dock distance. The dock wall only carries seams where equipment does not.
  for (const [seamX, seamZones] of [
    [-wallX + 0.02, [-0.86, -0.43, 0, 0.43, 0.86]],
    [wallX - 0.02, [-0.42, 0.18, 1.16]],
  ]) {
    for (const seamZ of seamZones) {
      const seam = roundedPart(
        policy,
        [0.045, bodyHeight - 0.05, 0.055],
        [seamX, bodyY, seamZ],
        [0, 0, 0],
        0.015,
      );
      seam.name = "s2-panel-seam";
      parts.push(steelPart(seam));
    }
  }
  for (const endZ of [-S2_HUT_HALF_LENGTH - 0.02, S2_HUT_HALF_LENGTH + 0.02]) {
    const endSeam = roundedPart(policy, [1.4, 0.045, 0.045], [0, 0.24, endZ], [0, 0, 0], 0.015);
    endSeam.name = "s2-panel-seam";
    parts.push(steelPart(endSeam));
  }

  // Cable tray along the lee eave, dropping the rear leg and running conduit
  // into the snow: the hut is fed from somewhere, like every real camp box.
  for (const tray of [
    roundedPart(policy, [0.15, 0.09, 2.2], [0.82, 0.42, 0], [0, 0, 0], 0.03),
    roundedPart(policy, [0.13, 0.94, 0.13], [0.74, -0.08, 0.9], [0, 0, 0], 0.03),
    cylinderPart(policy, 0.05, 0.05, 0.3, [0.74, -0.66, 0.9]),
  ]) {
    tray.name = "s2-machined-axial-rails";
    parts.push(steelPart(tray));
  }

  // Cooling louvre stack: recessed dark plenum behind five proud intake slats.
  parts.push(steelPart(roundedPart(policy, [0.05, 0.54, 0.5], [wallX + 0.02, 0.1, -0.11], [0, 0, 0], 0.02)));
  for (const slatY of [-0.1, 0, 0.1, 0.2, 0.3]) {
    const slat = roundedPart(policy, [0.06, 0.035, 0.46], [wallX - 0.035, slatY, -0.11], [0.34, 0, 0], 0.012);
    slat.name = "s2-cooling-louvre";
    parts.push(steelPart(slat));
  }

  // Fan bank: recessed plenum plus two guard collars the fan rotors turn inside.
  parts.push(
    steelPart(roundedPart(policy, [0.05, 0.58, 1.1], [wallX + 0.02, S2_FAN_Y, 0.7], [0, 0, 0], 0.02)),
  );
  for (const fanZ of S2_FAN_CENTERS_Z) {
    const collar = torusPart(
      policy,
      S2_FAN_RADIUS + 0.03,
      0.028,
      [wallX - 0.05, S2_FAN_Y, fanZ],
      [0, Math.PI / 2, 0],
    );
    collar.name = "s2-calibration-collars";
    parts.push(steelPart(collar));
    for (const guardRoll of [0, Math.PI / 2]) {
      const guardBar = roundedPart(
        policy,
        [0.03, 0.022, S2_FAN_RADIUS * 2],
        [wallX - 0.06, S2_FAN_Y, fanZ],
        [guardRoll, 0, 0],
        0.008,
      );
      guardBar.name = "s2-calibration-collars";
      parts.push(steelPart(guardBar));
    }
  }

  // Rack window strip: a narrow dark glass slot the indicator banks sit behind,
  // framed in steel with the cobalt livery line and a coral eave stripe above.
  const rackWindow = roundedPart(
    policy,
    [0.05, 0.13, 1.5],
    [S2_RACK_WINDOW_X, S2_RACK_WINDOW_Y, S2_RACK_WINDOW_Z],
    [0, 0, 0],
    0.015,
  );
  rackWindow.name = "s2-rack-window-strip";
  parts.push(paint(rackWindow, "#141A26"));
  for (const frameY of [S2_RACK_WINDOW_Y - 0.09, S2_RACK_WINDOW_Y + 0.09]) {
    parts.push(
      steelPart(
        roundedPart(policy, [0.06, 0.035, 1.54], [wallX - 0.03, frameY, S2_RACK_WINDOW_Z], [0, 0, 0], 0.012),
      ),
    );
  }
  parts.push(
    paint(
      roundedPart(policy, [0.035, 0.035, 2.28], [wallX - 0.03, 0.545, 0], [0, 0, 0], 0.012),
      S2_IDENTITY_COBALT,
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [0.05, 0.04, 2.36], [wallX - 0.025, 0.615, 0], [0, 0, 0], 0.014),
      STATION_PALETTE.trim,
    ),
  );

  // Entry bay: cobalt painted door in a coral frame, entry platform, ladder.
  parts.push(
    paint(
      roundedPart(policy, [0.05, 0.5, 0.44], [wallX - 0.025, 0.06, S2_DOOR_Z], [0, 0, 0], 0.015),
      S2_IDENTITY_COBALT,
    ),
  );
  for (const jambZ of [S2_DOOR_Z - 0.25, S2_DOOR_Z + 0.25]) {
    parts.push(
      steelPart(
        roundedPart(policy, [0.06, 0.56, 0.045], [wallX - 0.03, 0.06, jambZ], [0, 0, 0], 0.014),
      ),
    );
  }
  parts.push(
    steelPart(
      roundedPart(policy, [0.06, 0.045, 0.55], [wallX - 0.03, 0.335, S2_DOOR_Z], [0, 0, 0], 0.014),
    ),
  );
  // One disciplined coral threshold stripe under the door, hazard-marking width.
  parts.push(
    paint(
      roundedPart(policy, [0.07, 0.03, 0.5], [wallX - 0.035, -0.2, S2_DOOR_Z], [0, 0, 0], 0.01),
      STATION_PALETTE.trim,
    ),
  );
  const doorVisionPanel = roundedPart(
    policy,
    [0.05, 0.07, 0.12],
    [wallX - 0.045, 0.21, S2_DOOR_Z],
    [0, 0, 0],
    0.012,
  );
  doorVisionPanel.name = "s2-ember-window";
  parts.push(paint(doorVisionPanel, STATION_PALETTE.window));
  parts.push(
    steelPart(cylinderPart(policy, 0.018, 0.018, 0.16, [wallX - 0.06, 0.02, S2_DOOR_Z + 0.16])),
  );
  parts.push(
    steelPart(
      roundedPart(policy, [0.58, 0.06, 0.74], [wallX - 0.31, S2_HUT_FLOOR_Y - 0.02, S2_DOOR_Z], [0, 0, 0], 0.02),
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [0.6, 0.035, 0.05], [wallX - 0.31, S2_HUT_FLOOR_Y + 0.03, S2_DOOR_Z - 0.37], [0, 0, 0], 0.012),
      STATION_PALETTE.trim,
    ),
  );
  for (const stringerZ of [S2_DOOR_Z - 0.18, S2_DOOR_Z + 0.18]) {
    parts.push(
      steelPart(cylinderPart(policy, 0.022, 0.022, 0.52, [wallX - 0.55, -0.45, stringerZ], [0.16, 0, 0])),
    );
  }
  for (const rungY of [-0.64, -0.5, -0.36, -0.24]) {
    parts.push(
      steelPart(cylinderPart(policy, 0.016, 0.016, 0.34, [wallX - 0.55, rungY, S2_DOOR_Z], [Math.PI / 2, 0, 0])),
    );
  }

  // Warm windows: one beside the door and one in each gable end.
  for (const [windowSize, windowPosition] of [
    [[0.05, 0.12, 0.16], [wallX - 0.025, 0.3, -1.04]],
    [[0.34, 0.15, 0.05], [0.18, 0.34, -S2_HUT_HALF_LENGTH - 0.025]],
    [[0.34, 0.15, 0.05], [-0.14, 0.34, S2_HUT_HALF_LENGTH + 0.025]],
  ]) {
    const emberWindow = roundedPart(policy, windowSize, windowPosition, [0, 0, 0], 0.02);
    emberWindow.name = "s2-ember-window";
    parts.push(paint(emberWindow, STATION_PALETTE.window));
  }

  parts.push(
    steelPart(roundedPart(policy, [0.045, 0.16, 0.2], [wallX - 0.012, 0.3, -1.04], [0, 0, 0], 0.014)),
  );

  // Uplink whip on the roof, plus its base plate and one stay.
  parts.push(steelPart(roundedPart(policy, [0.2, 0.05, 0.2], [0.5, 0.64, -0.95], [0, 0, 0], 0.02)));
  parts.push(steelPart(cylinderPart(policy, 0.012, 0.026, 0.5, [0.5, 0.91, -0.95])));
  parts.push(steelPart(cylinderPart(policy, 0.008, 0.008, 0.36, [0.42, 0.8, -0.83], [0.5, 0, 0.28])));
  parts.push(steelPart(torusPart(policy, 0.055, 0.012, [0.5, 1.1, -0.95], [Math.PI / 2, 0, 0])));

  // Windward drift wedge banked against the lee legs.
  const drift = roundedPart(policy, [0.72, 0.3, 2.0], [0.86, -0.76, 0.06], [0, 0, -0.2], 0.05);
  drift.name = "s2-snow-drift";
  parts.push(paint(drift, STATION_PALETTE.drift));
  const gableDrift = roundedPart(policy, [1.1, 0.22, 0.46], [0.1, -0.78, -1.04], [-0.14, 0, 0], 0.04);
  gableDrift.name = "s2-snow-drift";
  parts.push(paint(gableDrift, STATION_PALETTE.drift));

  return mergeParts(parts, "s2-cern-antimatter-cryostat", STATION_PALETTE.s2Cladding);
}

// One cooling fan rotor: machined pale-metal hub and five pitched blades that
// turn inside a guard collar on the dock wall. Two instances, counter-paired.
function createS2PenningTrapCoilGeometry(quality) {
  const policy = geometryPolicy(quality);
  const bladeCount = quality === "low" ? 4 : 5;
  const parts = [
    cylinderPart(policy, 0.075, 0.075, 0.11, [0, 0, 0], [0, 0, Math.PI / 2]),
    bakeGeometry(new THREE.SphereGeometry(0.06, policy.round, 8), { position: [-0.06, 0, 0] }),
  ];
  for (let index = 0; index < bladeCount; index += 1) {
    const sweep = (index / bladeCount) * TWO_PI;
    parts.push(
      roundedPart(
        policy,
        [0.022, S2_FAN_RADIUS * 0.94, 0.13],
        [0, Math.cos(sweep) * S2_FAN_RADIUS * 0.52, Math.sin(sweep) * S2_FAN_RADIUS * 0.52],
        [sweep, 0.42, 0],
        0.01,
      ),
    );
  }
  return mergeParts(parts, "s2-penning-trap-superconducting-coil-rings");
}

// One rack indicator bank: a slim lit bar plus its lens, sitting just behind
// the window strip. Three instances - two blinking banks and one activity scan.
function createS2DiagnosticBeamlineGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      roundedPart(policy, [0.022, 0.075, 0.34], [0, 0, 0], [0, 0, 0], 0.008),
      bakeGeometry(new THREE.IcosahedronGeometry(0.026, quality === "high" ? 2 : 1), {
        position: [-0.006, 0, 0.16],
      }),
      bakeGeometry(new THREE.IcosahedronGeometry(0.026, quality === "high" ? 2 : 1), {
        position: [-0.006, 0, -0.16],
      }),
    ],
    "s2-vacuum-throat diagnostic-beamline s2-proof-bit",
  );
}

// GENERATOR HALL / POWER PLANT. A long low machine hall on a graphite plinth:
// panel walls with proud seams, day tanks on a bunded skid, a switchgear
// cabinet, pipe runs leaving for the neighbouring buildings, and a tall exhaust
// stack whose condensate plume the frame shader shimmers in world space. The
// bottom face stays at -0.66 so STATION_LOWEST_LOCAL_Y remains accurate.
function createAetherPrimordialSanctuaryGeometry(quality) {
  const policy = geometryPolicy(quality);
  const hallY = (AETHER_HALL_FLOOR_Y + AETHER_HALL_ROOF_Y) / 2;
  const hallHeight = AETHER_HALL_ROOF_Y - AETHER_HALL_FLOOR_Y;
  const parts = [];
  const steelPart = (part) => paint(part, STATION_PALETTE.steel);

  // Plinth with a coral deck-edge stripe on the two visitor-facing sides.
  parts.push(steelPart(roundedPart(policy, [2.9, 0.18, 1.82], [0, -0.57, 0], [0, 0, 0], 0.04)));
  // Hazard marking on the plinth deck edge: three disciplined dashes rather
  // than one continuous line that reads as neon.
  for (const stripeX of [-1.02, 0, 1.02]) {
    parts.push(
      paint(
        roundedPart(policy, [0.66, 0.03, 0.05], [stripeX, -0.47, 0.9], [0, 0, 0], 0.01),
        STATION_PALETTE.trim,
      ),
    );
  }

  // Machine hall body, roof cap, ridge and corner posts.
  parts.push(
    paint(
      roundedPart(
        policy,
        [AETHER_HALL_HALF_WIDTH * 2, hallHeight, AETHER_HALL_HALF_DEPTH * 2],
        [AETHER_HALL_X, hallY, 0],
        [0, 0, 0],
        0.045,
      ),
      STATION_PALETTE.aetherCladding,
    ),
  );
  parts.push(
    paint(
      roundedPart(
        policy,
        [AETHER_HALL_HALF_WIDTH * 2 + 0.1, 0.06, AETHER_HALL_HALF_DEPTH * 2 + 0.1],
        [AETHER_HALL_X, AETHER_HALL_ROOF_Y + 0.03, 0],
        [0, 0, 0],
        0.025,
      ),
      STATION_PALETTE.aetherCladdingAlt,
    ),
  );
  parts.push(
    steelPart(
      roundedPart(policy, [AETHER_HALL_HALF_WIDTH * 2, 0.05, 0.12], [AETHER_HALL_X, AETHER_HALL_ROOF_Y + 0.08, 0], [0, 0, 0], 0.02),
    ),
  );
  for (const postX of [AETHER_HALL_X - AETHER_HALL_HALF_WIDTH, AETHER_HALL_X + AETHER_HALL_HALF_WIDTH]) {
    for (const postZ of [-AETHER_HALL_HALF_DEPTH, AETHER_HALL_HALF_DEPTH]) {
      parts.push(
        steelPart(
          roundedPart(policy, [0.09, hallHeight + 0.04, 0.09], [postX, hallY, postZ], [0, 0, 0], 0.02),
        ),
      );
    }
  }
  // Proud vertical panel seams down both long walls.
  for (const seamZ of [-AETHER_HALL_HALF_DEPTH - 0.02, AETHER_HALL_HALF_DEPTH + 0.02]) {
    for (const seamX of [-0.98, -0.6, -0.22, 0.16, 0.54]) {
      const seam = roundedPart(policy, [0.05, hallHeight - 0.04, 0.045], [seamX, hallY, seamZ], [0, 0, 0], 0.015);
      seam.name = "aether-panel-seam";
      parts.push(steelPart(seam));
    }
  }

  // Roller door bay on the visitor-facing long wall: recessed dark opening,
  // coral-framed, with a lintel deep enough to swallow the slats when it rolls
  // up and reveals the burner behind.
  parts.push(
    paint(
      roundedPart(policy, [0.9, 0.54, 0.03], [AETHER_DOOR_X, -0.2, AETHER_DOOR_Z], [0, 0, 0], 0.01),
      "#2B2119",
    ),
  );
  for (const jambX of [AETHER_DOOR_X - 0.49, AETHER_DOOR_X + 0.49]) {
    parts.push(
      steelPart(
        roundedPart(policy, [0.07, 0.6, 0.08], [jambX, -0.19, AETHER_DOOR_Z + 0.06], [0, 0, 0], 0.02),
      ),
    );
  }
  const doorSpill = roundedPart(
    policy,
    [0.86, 0.06, 0.05],
    [AETHER_DOOR_X, -0.44, AETHER_DOOR_Z + 0.02],
    [0, 0, 0],
    0.014,
  );
  doorSpill.name = "aether-hall-window";
  parts.push(paint(doorSpill, STATION_PALETTE.window));
  parts.push(
    paint(
      roundedPart(policy, [1.02, 0.2, 0.14], [AETHER_DOOR_X, 0.16, AETHER_DOOR_Z + 0.04], [0, 0, 0], 0.02),
      STATION_PALETTE.aetherCladdingAlt,
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [1.02, 0.035, 0.08], [AETHER_DOOR_X, 0.09, AETHER_DOOR_Z + 0.08], [0, 0, 0], 0.012),
      STATION_PALETTE.trim,
    ),
  );
  // Apron lip the plant vehicles drive onto, outside the door.
  parts.push(
    steelPart(roundedPart(policy, [1.1, 0.05, 0.36], [AETHER_DOOR_X, -0.46, AETHER_DOOR_Z + 0.26], [0, 0, 0], 0.02)),
  );

  // Switchgear / transformer cabinet on the gable end, louvred and vented.
  parts.push(
    paint(
      roundedPart(policy, [0.42, 0.5, 0.44], [1.08, -0.16, -0.42], [0, 0, 0], 0.03),
      STATION_PALETTE.aetherCladdingAlt,
    ),
  );
  for (const cabinetSlatY of [-0.26, -0.19, -0.12]) {
    parts.push(
      steelPart(roundedPart(policy, [0.44, 0.03, 0.32], [1.08, cabinetSlatY, -0.42], [0, 0, 0], 0.01)),
    );
  }
  parts.push(steelPart(cylinderPart(policy, 0.035, 0.045, 0.28, [1.2, 0.2, -0.42])));

  // Day tanks on a bunded skid, pushed to the far end of the visitor wall so
  // they frame the roller door instead of blocking it.
  parts.push(steelPart(roundedPart(policy, [1.5, 0.06, 0.48], [-0.74, -0.45, 1.06], [0, 0, 0], 0.02)));
  parts.push(
    steelPart(roundedPart(policy, [1.54, 0.09, 0.05], [-0.74, -0.4, 1.29], [0, 0, 0], 0.014)),
  );
  for (const tankX of [-0.34, -1.14]) {
    parts.push(
      paint(
        cylinderPart(policy, 0.16, 0.16, 0.62, [tankX, -0.25, 1.06], [0, 0, Math.PI / 2]),
        STATION_PALETTE.aetherCladding,
      ),
    );
    for (const capX of [tankX - 0.32, tankX + 0.32]) {
      parts.push(
        steelPart(torusPart(policy, 0.155, 0.022, [capX, -0.25, 1.06], [0, Math.PI / 2, 0])),
      );
    }
    for (const saddleX of [tankX - 0.2, tankX + 0.2]) {
      parts.push(
        steelPart(roundedPart(policy, [0.06, 0.14, 0.3], [saddleX, -0.37, 1.06], [0, 0, 0], 0.02)),
      );
    }
    parts.push(steelPart(cylinderPart(policy, 0.022, 0.022, 0.3, [tankX, -0.02, 1.06])));
  }

  // Exhaust stack with rain cap and brackets, then three condensate plume
  // shells above it. The plume is authored above y = 0.94 so the frame shader's
  // aether branch can shimmer only those vertices.
  parts.push(
    steelPart(
      cylinderPart(policy, 0.08, 0.1, 0.72, [AETHER_STACK[0], AETHER_STACK_TOP_Y - 0.36, AETHER_STACK[1]]),
    ),
  );
  parts.push(
    steelPart(torusPart(policy, 0.11, 0.02, [AETHER_STACK[0], AETHER_STACK_TOP_Y - 0.02, AETHER_STACK[1]], [Math.PI / 2, 0, 0])),
  );
  const vent = cylinderPart(policy, 0.13, 0.1, 0.05, [AETHER_STACK[0], AETHER_STACK_TOP_Y + 0.03, AETHER_STACK[1]]);
  vent.name = "aether-vent-stack";
  parts.push(steelPart(vent));
  for (const bracketY of [0.34, 0.62]) {
    parts.push(
      steelPart(roundedPart(policy, [0.3, 0.035, 0.035], [AETHER_STACK[0] + 0.15, bracketY, AETHER_STACK[1]], [0, 0, 0], 0.012)),
    );
  }
  for (const [puffRadius, puffY, puffDrift, puffSquash] of [
    [0.16, 0.96, -0.06, 0.5],
    [0.21, 1.05, -0.24, 0.44],
    [0.25, 1.15, -0.48, 0.38],
  ]) {
    const plume = bakeGeometry(
      new THREE.SphereGeometry(puffRadius, policy.round, Math.max(8, Math.round(policy.round * 0.5))),
      {
        position: [AETHER_STACK[0] + puffDrift, puffY, AETHER_STACK[1] + puffDrift * 0.7],
        scale: [1.7, puffSquash, 1.25],
      },
    );
    plume.name = "aether-stack-condensate-plume";
    parts.push(paint(plume, STATION_PALETTE.drift));
  }

  // Warm windows: a run high on the visitor wall clear of the door, plus one on
  // the gable end so the hall reads as inhabited from either approach.
  for (const windowX of [-0.94, -0.5, -0.06]) {
    const hallWindow = roundedPart(
      policy,
      [0.28, 0.16, 0.05],
      [windowX, 0.0, AETHER_HALL_HALF_DEPTH + 0.02],
      [0, 0, 0],
      0.02,
    );
    hallWindow.name = "aether-hall-window";
    parts.push(paint(hallWindow, STATION_PALETTE.window));
  }
  const gableWindow = roundedPart(
    policy,
    [0.05, 0.16, 0.24],
    [AETHER_HALL_X + AETHER_HALL_HALF_WIDTH + 0.02, 0.0, 0.3],
    [0, 0, 0],
    0.018,
  );
  gableWindow.name = "aether-hall-window";
  parts.push(paint(gableWindow, STATION_PALETTE.window));

  // Pipe runs leaving the plinth toward the neighbouring buildings.
  for (const [pipeY, pipeZ] of [[-0.42, -0.5], [-0.5, -0.66]]) {
    parts.push(
      steelPart(cylinderPart(policy, 0.045, 0.045, 1.5, [-1.9, pipeY, pipeZ], [0, 0, Math.PI / 2])),
    );
  }
  for (const standX of [-1.5, -2.3]) {
    parts.push(steelPart(roundedPart(policy, [0.07, 0.2, 0.3], [standX, -0.56, -0.58], [0, 0, 0], 0.02)));
  }

  // Windward drift banked into the lee corner of the plinth.
  const drift = roundedPart(policy, [0.92, 0.3, 1.72], [-1.56, -0.76, -0.16], [0, 0, 0.18], 0.05);
  drift.name = "aether-snow-drift";
  parts.push(paint(drift, STATION_PALETTE.drift));
  const apronDrift = roundedPart(policy, [1.0, 0.2, 0.5], [-1.18, -0.78, 1.04], [0.12, 0, 0], 0.04);
  apronDrift.name = "aether-snow-drift";
  parts.push(paint(apronDrift, STATION_PALETTE.drift));

  return mergeParts(
    parts,
    "aether-primordial-first-energy-sanctuary",
    STATION_PALETTE.aetherCladding,
  );
}

// One roller-door slat: a ribbed steel panel. Three instances stack to close
// the door bay and nest up behind the lintel while the seal is docked.
function createAetherShieldHemisphereGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [roundedPart(policy, [0.86, 0.17, 0.055], [0, 0, 0], [0, 0, 0], 0.012)];
  for (const ribX of [-0.3, 0, 0.3]) {
    parts.push(roundedPart(policy, [0.06, 0.035, 0.075], [ribX, 0, 0], [0, 0, 0], 0.01));
  }
  parts.push(roundedPart(policy, [0.88, 0.02, 0.07], [0, -0.075, 0], [0, 0, 0], 0.008));
  return mergeParts(parts, "aether-two-separated-shield-hemispheres");
}

// Burner containment rings around the turbine mouth: the arcs that used to
// orbit the caged star now cage the flame where it actually belongs.
function createAetherCausticArcGeometry(quality) {
  const policy = geometryPolicy(quality);
  const arcs = [];
  for (const [radius, tube, offsetZ] of [
    [0.17, 0.014, -0.02],
    [0.15, 0.012, 0.06],
    [0.12, 0.011, 0.11],
  ]) {
    const arc = torusPart(policy, radius, tube, [0, 0, offsetZ]);
    arc.name = "aether-abyss-blue-caustic-arc";
    arcs.push(arc);
  }
  return mergeParts(arcs, "aether-abyss-blue-caustic-arc");
}

// The signature mechanism: one small contained burner/turbine visible through
// the roller-door mouth. Bright, tight, and the only saturated gold on the hall.
function createAetherFirstEnergySeedGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(
        new THREE.IcosahedronGeometry(AETHER_SEED_CORE_RADIUS, quality === "high" ? 2 : 1),
      ),
      bakeGeometry(
        new THREE.SphereGeometry(
          AETHER_DOMINANT_SEED_RADIUS,
          policy.round,
          Math.max(10, Math.round(policy.round * 0.6)),
        ),
        { scale: [1, 1, 1.35] },
      ),
      // Burner can and flame port the glow is contained inside.
      cylinderPart(policy, 0.13, 0.13, 0.2, [0, 0, 0.02], [Math.PI / 2, 0, 0]),
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

// Component-space crown layered over the shared library walkway camber. It
// depends only on the normalized span position, so adjacent endpoint-to-center
// construction bands still share identical boundary vertices and the reveal
// seams stay closed.
function qpuCrestLift(normalizedX) {
  return QPU_CREST_BOOST * (1 - normalizedX * normalizedX);
}

// One derrick corner, parameterised up the tower so legs, girts and cross
// braces all land on the same battered taper.
function qpuDerrickNode(signX, signZ, t) {
  return [
    QPU_BOREHOLE_X + signX * (0.36 - 0.24 * t),
    QPU_DECK_Y + (QPU_CROWN_Y - QPU_DECK_Y) * t,
    signZ * (0.38 - 0.26 * t),
  ];
}

// The four derrick faces, each as the pair of corner signs it spans.
const QPU_DERRICK_FACES = Object.freeze([
  Object.freeze([Object.freeze([-1, -1]), Object.freeze([1, -1])]),
  Object.freeze([Object.freeze([-1, 1]), Object.freeze([1, 1])]),
  Object.freeze([Object.freeze([-1, -1]), Object.freeze([-1, 1])]),
  Object.freeze([Object.freeze([1, -1]), Object.freeze([1, 1])]),
]);

// ICE-CORE DRILL RIG. Everything that stands on the snow lives here: the
// borehole platform and its hazard-ringed collar, the braced derrick and crown
// block, the drawworks winch and its cable run, the panel-clad drill shack, the
// core crates, the rod rack, the cable tray and the windward drift. The catwalk
// deck itself is the separately revealed construction geometry, so the two are
// merged in createQpuCausewayFrameGeometry.
function createQpuStableDockBandGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [];
  const steelPart = (part) => paint(part, STATION_PALETTE.steel);
  const strut = (from, to, radius) => steelPart(strutPart(policy, from, to, radius));

  // Borehole platform: a legged steel deck with a coral-striped working edge.
  parts.push(
    steelPart(roundedPart(policy, [1.04, 0.08, 1.08], [QPU_BOREHOLE_X, QPU_DECK_Y - 0.04, 0], [0, 0, 0], 0.025)),
  );
  for (const padX of [QPU_BOREHOLE_X - 0.44, QPU_BOREHOLE_X + 0.44]) {
    for (const padZ of [-0.46, 0.46]) {
      parts.push(steelPart(cylinderPart(policy, 0.05, 0.06, 0.28, [padX, QPU_GROUND_Y + 0.14, padZ])));
      parts.push(
        steelPart(roundedPart(policy, [0.18, 0.05, 0.18], [padX, QPU_GROUND_Y + 0.025, padZ], [0, 0, 0], 0.02)),
      );
    }
  }
  parts.push(
    paint(
      roundedPart(policy, [0.92, 0.03, 0.05], [QPU_BOREHOLE_X, QPU_DECK_Y + 0.02, -0.52], [0, 0, 0], 0.012),
      STATION_PALETTE.trim,
    ),
  );

  // Borehole collar: dark mouth, machined casing head, coral hazard ring.
  const boreMouth = cylinderPart(policy, 0.14, 0.14, 0.12, [QPU_BOREHOLE_X, QPU_DECK_Y + 0.02, 0]);
  boreMouth.name = "qpu-borehole-collar";
  parts.push(paint(boreMouth, "#141A26"));
  const casing = cylinderPart(
    policy,
    QPU_ABUTMENT_RADIUS * 2.4,
    QPU_ABUTMENT_RADIUS * 2.6,
    0.1,
    [QPU_BOREHOLE_X, QPU_DECK_Y + 0.01, 0],
  );
  casing.name = "qpu-borehole-collar";
  parts.push(steelPart(casing));
  const hazardRing = torusPart(policy, 0.2, 0.02, [QPU_BOREHOLE_X, QPU_DECK_Y + 0.015, 0], [Math.PI / 2, 0, 0]);
  hazardRing.name = "qpu-borehole-collar";
  parts.push(paint(hazardRing, STATION_PALETTE.trim));

  // Braced derrick: four battered legs, three girt tiers, cross braces on every
  // face, coral hazard sleeves at the working height, and the crown block.
  for (const [signX, signZ] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = strut(qpuDerrickNode(signX, signZ, 0), qpuDerrickNode(signX, signZ, 1), 0.036);
    leg.name = "qpu-derrick-leg";
    parts.push(leg);
    const sleeve = strutPart(
      policy,
      qpuDerrickNode(signX, signZ, 0.03),
      qpuDerrickNode(signX, signZ, 0.1),
      0.044,
    );
    sleeve.name = "qpu-derrick-hazard-sleeve";
    parts.push(paint(sleeve, STATION_PALETTE.trim));
  }
  for (const [[aX, aZ], [bX, bZ]] of QPU_DERRICK_FACES) {
    for (const girtT of [0.3, 0.6, 0.85]) {
      const girt = strut(qpuDerrickNode(aX, aZ, girtT), qpuDerrickNode(bX, bZ, girtT), 0.021);
      girt.name = "qpu-derrick-brace";
      parts.push(girt);
    }
    for (const [lowT, highT] of [[0, 0.3], [0.3, 0.6], [0.6, 0.85]]) {
      for (const brace of [
        strut(qpuDerrickNode(aX, aZ, lowT), qpuDerrickNode(bX, bZ, highT), 0.018),
        strut(qpuDerrickNode(bX, bZ, lowT), qpuDerrickNode(aX, aZ, highT), 0.018),
      ]) {
        brace.name = "qpu-derrick-brace";
        parts.push(brace);
      }
    }
  }
  parts.push(
    steelPart(roundedPart(policy, [0.36, 0.12, 0.32], [QPU_BOREHOLE_X, QPU_CROWN_Y + 0.08, 0], [0, 0, 0], 0.025)),
  );
  for (const sheaveZ of [-0.07, 0.07]) {
    const sheave = torusPart(policy, 0.085, 0.024, [QPU_BOREHOLE_X, QPU_CROWN_Y - 0.02, sheaveZ]);
    sheave.name = "qpu-crown-block";
    parts.push(steelPart(sheave));
  }
  parts.push(
    steelPart(roundedPart(policy, [0.3, 0.04, 0.05], [QPU_BOREHOLE_X, QPU_CROWN_Y + 0.16, 0], [0, 0, 0], 0.014)),
  );

  // Drawworks winch on a skid: bunded base, machinery cabinet, spooled drum.
  parts.push(steelPart(roundedPart(policy, [0.66, 0.08, 0.46], [-0.15, QPU_GROUND_Y + 0.04, -0.46], [0, 0, 0], 0.02)));
  parts.push(
    paint(
      roundedPart(policy, [0.5, 0.26, 0.38], [-0.15, -0.41, -0.46], [0, 0, 0], 0.03),
      STATION_PALETTE.qpuCladdingAlt,
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [0.52, 0.03, 0.05], [-0.15, -0.3, -0.66], [0, 0, 0], 0.012),
      STATION_PALETTE.trim,
    ),
  );
  // Machined facets so the drum reads as a spooled winch, not a smooth pipe.
  const drum = facetedPart(0.13, 0.13, 0.34, quality === "low" ? 8 : 12, [-0.15, -0.2, -0.46], [
    Math.PI / 2,
    0,
    0,
  ]);
  drum.name = "qpu-winch-drum";
  parts.push(steelPart(drum));
  for (const flangeZ of [-0.63, -0.29]) {
    const flange = torusPart(policy, 0.135, 0.024, [-0.15, -0.2, flangeZ]);
    flange.name = "qpu-winch-drum";
    parts.push(steelPart(flange));
  }
  for (const grooveZ of [-0.55, -0.46, -0.37]) {
    const groove = torusPart(policy, 0.132, 0.008, [-0.15, -0.2, grooveZ]);
    groove.name = "qpu-winch-drum";
    parts.push(steelPart(groove));
  }

  // Winch cable: the haul line up to the crown sheave, then the drill line down
  // into the collar. This is the same polyline the telemetry lights ride.
  const haulLine = strut(QPU_CABLE_DRUM, QPU_CABLE_CROWN, 0.012);
  haulLine.name = "qpu-winch-cable";
  parts.push(haulLine);
  const drillLine = strut(QPU_CABLE_CROWN, [QPU_BOREHOLE_X, QPU_DECK_Y + 0.04, 0], 0.012);
  drillLine.name = "qpu-winch-cable";
  parts.push(drillLine);

  // Slender catwalk abutments between the shack and the platform.
  for (const abutmentX of [-0.62, 0.62]) {
    parts.push(
      steelPart(
        cylinderPart(
          policy,
          QPU_ABUTMENT_RADIUS * 0.8,
          QPU_ABUTMENT_RADIUS,
          QPU_ABUTMENT_HEIGHT,
          [abutmentX, QPU_GROUND_Y + QPU_ABUTMENT_HEIGHT / 2, 0],
        ),
      ),
    );
  }

  // Drill shack: panel-clad hut on skid runners, corner posts, proud seams.
  for (const runnerZ of [-0.4, 0.4]) {
    parts.push(
      steelPart(roundedPart(policy, [1.18, 0.09, 0.13], [QPU_SHACK_X, QPU_GROUND_Y + 0.045, runnerZ], [0, 0, 0], 0.03)),
    );
  }
  for (const postX of [QPU_SHACK_X - 0.4, QPU_SHACK_X + 0.4]) {
    for (const postZ of [-0.4, 0.4]) {
      parts.push(steelPart(roundedPart(policy, [0.08, 0.29, 0.08], [postX, -0.43, postZ], [0, 0, 0], 0.02)));
    }
  }
  parts.push(
    paint(
      roundedPart(policy, [0.98, 0.62, 0.88], [QPU_SHACK_X, 0.03, 0], [0, 0, 0], 0.045),
      STATION_PALETTE.qpuCladding,
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [1.06, 0.06, 0.96], [QPU_SHACK_X, 0.37, 0], [0, 0, 0], 0.025),
      STATION_PALETTE.qpuCladdingAlt,
    ),
  );
  for (const postX of [QPU_SHACK_X - 0.49, QPU_SHACK_X + 0.49]) {
    for (const postZ of [-0.44, 0.44]) {
      parts.push(steelPart(roundedPart(policy, [0.09, 0.66, 0.09], [postX, 0.03, postZ], [0, 0, 0], 0.02)));
    }
  }
  // Proud vertical seams down the windward wall; the dock wall is full of
  // equipment, so it carries a horizontal panel base channel instead.
  for (const seamOffset of [-0.28, 0.02, 0.32]) {
    const seam = roundedPart(
      policy,
      [0.045, 0.58, 0.05],
      [QPU_SHACK_X + seamOffset, 0.03, 0.465],
      [0, 0, 0],
      0.015,
    );
    seam.name = "qpu-panel-seam";
    parts.push(steelPart(seam));
  }
  const baseChannel = roundedPart(policy, [1.0, 0.045, 0.05], [QPU_SHACK_X, -0.25, -0.47], [0, 0, 0], 0.015);
  baseChannel.name = "qpu-panel-seam";
  parts.push(steelPart(baseChannel));

  // Dock-facing wall: door in a coral frame, warm windows, the mint indicator
  // panel, one thin mint livery line and the coral eave stripe above it.
  parts.push(
    steelPart(roundedPart(policy, [0.34, 0.46, 0.04], [QPU_SHACK_X + 0.24, -0.02, -0.48], [0, 0, 0], 0.015)),
  );
  for (const jambOffset of [0.04, 0.44]) {
    parts.push(
      paint(
        roundedPart(policy, [0.04, 0.5, 0.05], [QPU_SHACK_X + jambOffset, -0.02, -0.485], [0, 0, 0], 0.012),
        STATION_PALETTE.trim,
      ),
    );
  }
  parts.push(
    paint(
      roundedPart(policy, [0.44, 0.03, 0.06], [QPU_SHACK_X + 0.24, -0.27, -0.49], [0, 0, 0], 0.01),
      STATION_PALETTE.trim,
    ),
  );
  const doorVisionPanel = roundedPart(
    policy,
    [0.13, 0.08, 0.045],
    [QPU_SHACK_X + 0.24, 0.14, -0.49],
    [0, 0, 0],
    0.012,
  );
  doorVisionPanel.name = "qpu-shack-window";
  parts.push(paint(doorVisionPanel, STATION_PALETTE.window));
  const indicatorPanel = roundedPart(
    policy,
    [0.2, 0.13, 0.045],
    [QPU_SHACK_X - 0.3, -0.13, -0.475],
    [0, 0, 0],
    0.014,
  );
  indicatorPanel.name = "qpu-indicator-panel";
  parts.push(paint(indicatorPanel, QPU_IDENTITY_MINT));
  parts.push(
    paint(
      roundedPart(policy, [1.0, 0.032, 0.045], [QPU_SHACK_X, 0.29, -0.47], [0, 0, 0], 0.012),
      QPU_IDENTITY_MINT,
    ),
  );
  parts.push(
    paint(
      roundedPart(policy, [1.06, 0.038, 0.05], [QPU_SHACK_X, 0.355, -0.475], [0, 0, 0], 0.014),
      STATION_PALETTE.trim,
    ),
  );
  for (const [windowSize, windowPosition] of [
    [[0.36, 0.2, 0.05], [QPU_SHACK_X - 0.3, 0.12, -0.465]],
    [[0.05, 0.17, 0.28], [QPU_SHACK_X - 0.52, 0.12, 0.1]],
    [[0.28, 0.15, 0.05], [QPU_SHACK_X + 0.06, 0.12, 0.465]],
  ]) {
    const shackWindow = roundedPart(policy, windowSize, windowPosition, [0, 0, 0], 0.02);
    shackWindow.name = "qpu-shack-window";
    parts.push(paint(shackWindow, STATION_PALETTE.window));
  }
  parts.push(
    steelPart(roundedPart(policy, [0.5, 0.05, 0.34], [QPU_SHACK_X + 0.22, -0.31, -0.66], [0, 0, 0], 0.02)),
  );
  for (const rungY of [-0.44, -0.55]) {
    parts.push(
      steelPart(cylinderPart(policy, 0.015, 0.015, 0.3, [QPU_SHACK_X + 0.22, rungY, -0.7], [0, 0, Math.PI / 2])),
    );
  }

  // Core crate stacks beside the shack: banded boxes of recovered ice core.
  for (const [crateX, crateY, crateZ] of [
    [-0.86, QPU_GROUND_Y + 0.1, -0.72],
    [-0.86, QPU_GROUND_Y + 0.31, -0.72],
    [-1.34, QPU_GROUND_Y + 0.1, -0.8],
  ]) {
    const crate = roundedPart(policy, [0.44, 0.2, 0.34], [crateX, crateY, crateZ], [0, 0, 0], 0.02);
    crate.name = "qpu-core-crate";
    parts.push(paint(crate, STATION_PALETTE.qpuCladdingAlt));
    parts.push(
      steelPart(roundedPart(policy, [0.46, 0.03, 0.36], [crateX, crateY + 0.06, crateZ], [0, 0, 0], 0.01)),
    );
  }

  // Drill rod rack on the windward side, plus the cable tray feeding the shack.
  for (const standX of [-0.5, 0.62]) {
    parts.push(steelPart(roundedPart(policy, [0.09, 0.3, 0.1], [standX, -0.47, 0.6], [0, 0, 0], 0.02)));
  }
  parts.push(steelPart(roundedPart(policy, [1.3, 0.06, 0.14], [0.06, -0.3, 0.6], [0, 0, 0], 0.02)));
  for (const [rodY, rodZ] of [
    [-0.235, 0.5],
    [-0.235, 0.6],
    [-0.235, 0.7],
    [-0.14, 0.55],
    [-0.14, 0.65],
  ]) {
    const rod = cylinderPart(policy, 0.043, 0.043, 1.24, [0.06, rodY, rodZ], [0, 0, Math.PI / 2]);
    rod.name = "qpu-drill-rod-rack";
    parts.push(steelPart(rod));
  }
  const tray = roundedPart(policy, [2.3, 0.08, 0.12], [-0.2, -0.34, 0.4], [0, 0, 0], 0.025);
  tray.name = "qpu-cable-tray";
  parts.push(steelPart(tray));
  for (const trayStandX of [-1.1, 0.7]) {
    parts.push(steelPart(roundedPart(policy, [0.07, 0.24, 0.07], [trayStandX, -0.5, 0.4], [0, 0, 0], 0.02)));
  }

  // Windward drift banked against the rod rack, a wedge at the shack gable, and
  // a low apron of blown snow the dock side of the rig sits in.
  // Each wedge is banked into the structure it collects against and dips below
  // the contact plane, so only its scoured shoulder stands proud of the snow.
  for (const [driftSize, driftPosition, driftRotation] of [
    [[2.5, 0.3, 0.66], [0.1, QPU_GROUND_Y - 0.14, 0.86], [-0.18, 0, 0.16]],
    [[0.62, 0.24, 1.0], [-2.14, QPU_GROUND_Y - 0.15, 0.02], [0, 0, -0.12]],
    [[1.6, 0.28, 0.56], [-1.42, QPU_GROUND_Y - 0.14, -0.5], [0, 0, 0.1]],
    [[1.06, 0.26, 0.46], [QPU_BOREHOLE_X, QPU_GROUND_Y - 0.13, -0.5], [0, 0, -0.09]],
  ]) {
    const drift = roundedPart(policy, driftSize, driftPosition, driftRotation, 0.05);
    drift.name = "qpu-snow-drift";
    parts.push(paint(drift, STATION_PALETTE.drift));
  }

  return mergeParts(
    parts,
    "qpu-ice-core-drill-rig qpu-stable-visitor-dock-band-and-slender-abutments",
    STATION_PALETTE.qpuCladding,
  );
}

// The catwalk/gantry plate between the drill shack and the borehole platform:
// one continuously sampled cambered deck, triangles ordered in symmetric
// endpoint-to-center bands so the construction reveal lays it from both
// landings toward midspan.
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
          QPU_CATWALK_BASE_Y + point.y + crest - surface * QPU_MANIFOLD_LAYOUT.floorThickness,
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
  geometry.name = "qpu-one-piece-continuously-sampled-catwalk-deck-plate";
  const baked = bakeGeometry(geometry);
  baked.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return baked;
}

// One catwalk hoop guard: the inverted-U frame a walkway bay hangs its rails
// from. Thirteen bays ride the deck and rise with the construction envelope.
function createQpuManifoldRibGeometry(quality) {
  const policy = geometryPolicy(quality);
  return tubePart(
    policy,
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, -QPU_MANIFOLD_LAYOUT.halfDepth),
      new THREE.Vector3(0, 0.46, 0),
      new THREE.Vector3(0, 0, QPU_MANIFOLD_LAYOUT.halfDepth),
    ),
    0.017,
    "qpu-endpoint-to-center-catwalk-hoop",
  );
}

// The one-draw rig body: the grounded drill rig merged with the progressively
// revealed catwalk deck, keeping the stable/construction vertex ranges the
// draw-range reveal depends on.
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
    "qpu-ice-core-drill-rig qpu-continuous-catwalk-deck qpu-contiguous-catwalk-plate-and-hoops",
    STATION_PALETTE.qpuCladding,
  );
  geometry.userData.stableVertexCount = stableVertexCount;
  geometry.userData.constructionVertexCount = constructionVertexCount;
  geometry.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return geometry;
}

// One catwalk handrail bay: hoop guard, its deck foot, and the two longitudinal
// rail bars that meet the neighbouring bays into a continuous run.
function createQpuCoherencePlateGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    createQpuManifoldRibGeometry(quality),
    tubePart(
      policy,
      new THREE.LineCurve3(
        new THREE.Vector3(-0.06, 0, 0),
        new THREE.Vector3(0.06, 0, 0),
      ),
      0.016,
      "qpu-catwalk-hoop-foot",
    ),
  ];
  for (const railZ of [-QPU_MANIFOLD_LAYOUT.halfDepth * 0.92, QPU_MANIFOLD_LAYOUT.halfDepth * 0.92]) {
    const rail = roundedPart(policy, [0.23, 0.03, 0.03], [0, 0.2, railZ], [0, 0, 0], 0.01);
    rail.name = "qpu-catwalk-handrail-bay";
    parts.push(rail);
  }
  return mergeParts(parts, "qpu-catwalk-handrail-bays qpu-endpoint-to-center-build-field");
}

// One telemetry light: a lozenge bead that rides the winch cable. The wireline
// verification sonde is the same shape scaled up.
function createQpuSignalGeometry(quality) {
  const policy = geometryPolicy(quality);
  return bakeGeometry(
    new THREE.CapsuleGeometry(0.026, 0.07, policy.cap, policy.radial),
    { rotation: [0, 0, Math.PI / 2] },
  );
}

// The winch cable as a two-segment polyline with its orientation baked once.
// Both the static cable members and the travelling telemetry lights read this,
// so the light always sits exactly on the wire a viewer can see.
const QPU_CABLE_SEGMENTS = Object.freeze(
  [
    [QPU_CABLE_DRUM, QPU_CABLE_CROWN],
    [QPU_CABLE_CROWN, QPU_CABLE_HOLE],
  ].map(([from, to]) => {
    const deltaX = to[0] - from[0];
    const deltaY = to[1] - from[1];
    const deltaZ = to[2] - from[2];
    return Object.freeze({
      from,
      length: Math.hypot(deltaX, deltaY, deltaZ),
      pitch: Math.atan2(deltaY, Math.hypot(deltaX, deltaZ)),
      to,
      yaw: Math.atan2(-deltaZ, deltaX),
    });
  }),
);
const QPU_CABLE_TOTAL_LENGTH = QPU_CABLE_SEGMENTS[0].length + QPU_CABLE_SEGMENTS[1].length;
const QPU_CABLE_CROWN_T = QPU_CABLE_SEGMENTS[0].length / QPU_CABLE_TOTAL_LENGTH;
const qpuCablePose = { pitch: 0, x: 0, y: 0, yaw: 0, z: 0 };

function sampleQpuCable(travel) {
  const distance = THREE.MathUtils.clamp(travel, 0, 1) * QPU_CABLE_TOTAL_LENGTH;
  const onHaulLine = distance <= QPU_CABLE_SEGMENTS[0].length;
  const segment = onHaulLine ? QPU_CABLE_SEGMENTS[0] : QPU_CABLE_SEGMENTS[1];
  const ratio =
    (onHaulLine ? distance : distance - QPU_CABLE_SEGMENTS[0].length) / segment.length;
  qpuCablePose.x = segment.from[0] + (segment.to[0] - segment.from[0]) * ratio;
  qpuCablePose.y = segment.from[1] + (segment.to[1] - segment.from[1]) * ratio;
  qpuCablePose.z = segment.from[2] + (segment.to[2] - segment.from[2]) * ratio;
  qpuCablePose.pitch = segment.pitch;
  qpuCablePose.yaw = segment.yaw;
  return qpuCablePose;
}

function patchAwardSurface(
  material,
  {
    ambientGain = 0.045,
    effectMode = 0,
    effectStrength = 0,
    macroStrength,
    phaseColor,
    rimColor,
    rimStrength,
    windowGain = 0,
  },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAwardAmbientGain = { value: ambientGain };
    shader.uniforms.uAwardWindowGain = { value: windowGain };
    shader.uniforms.uAwardMacroStrength = { value: macroStrength };
    shader.uniforms.uAwardRimColor = { value: new THREE.Color(rimColor) };
    shader.uniforms.uAwardRimStrength = { value: rimStrength };
    shader.uniforms.uAwardEffectMode = { value: effectMode };
    shader.uniforms.uAwardEffectStrength = { value: effectStrength };
    shader.uniforms.uAwardActivity = { value: 0 };
    shader.uniforms.uAwardPhaseColor = { value: new THREE.Color(phaseColor || rimColor) };
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
float awardAetherMask = step(1.5, uAwardEffectMode) * (1.0 - step(2.5, uAwardEffectMode));
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

// Generator-hall stack plume: a world-space heat shimmer confined to the
// condensate shells authored above the stack cap, thickening while docked.
// It never touches the hall itself, and it is not a fullscreen pass.
float awardPlumeGate = smoothstep(0.94, 1.06, position.y);
float awardPlumeSwell = sin(position.y * 9.0 + position.x * 5.0 - uAwardTime * 1.4)
  * cos(position.z * 7.0 + uAwardTime * 0.9);
const float AETHER_PLUME_DISPLACEMENT_LIMIT = 0.06;
float awardPlumeOffset = clamp(
  awardPlumeSwell * awardPlumeGate * (0.016 + awardMotionActivity * 0.044),
  -AETHER_PLUME_DISPLACEMENT_LIMIT,
  AETHER_PLUME_DISPLACEMENT_LIMIT
);
transformed += objectNormal * awardPlumeOffset * awardAetherMask;

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
uniform float uAwardRimStrength;
uniform float uAwardMacroStrength;
uniform float uAwardEffectMode;
uniform float uAwardEffectStrength;
uniform float uAwardTime;
uniform float uAwardAmbientGain;
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
// Sky-dome wrap fill. Antarctic light is overwhelmingly bounced off snow and
// cloud, so a station lit only by the key light collapses into a black
// silhouette whenever the camera lands on its shaded side. This gain is what
// keeps the LAW 3 value ladder (structure / cladding / hardware) readable.
reflectedLight.indirectDiffuse +=
  diffuseColor.rgb * uAwardAmbientGain * (1.0 + awardWrappedDiffuse * 1.7);
reflectedLight.indirectDiffuse *= 1.0 + awardMacro * uAwardMacroStrength;
reflectedLight.indirectDiffuse += uAwardPhaseColor * awardStationSignal * uAwardEffectStrength;
reflectedLight.indirectSpecular += uAwardRimColor * awardFresnel * uAwardRimStrength;
// Shared ember windows: the painted amber vertices of the boot-camp palette
// (warm and mid-value) light from inside. Coral safety trim is warm but far
// darker in green, so it stays a painted stripe instead of becoming a lamp.
float awardWindowWarmth = clamp(diffuseColor.r - diffuseColor.b, 0.0, 1.0);
float awardWindowMask =
  smoothstep(0.16, 0.34, awardWindowWarmth) * smoothstep(0.30, 0.46, diffuseColor.g);
totalEmissiveRadiance += diffuseColor.rgb * awardWindowMask * uAwardWindowGain;`,
      );
  };
  material.customProgramCacheKey = () => "polar-ne-award-surface-v6";
  material.userData.surfaceMath =
    "gain 0.35 low-pass macro / wrapped diffuse / Fresnel containment / authored station field";
  return material;
}

function makeArchitecturalSurface({
  ambientGain,
  color,
  effectMode = 0,
  effectStrength = 0,
  emissive,
  emissiveIntensity,
  macroStrength = 0.022,
  metalness,
  opacity = 0.96,
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
      ambientGain,
      effectMode,
      effectStrength,
      macroStrength,
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
    // Burner core and the hall's warm indicator lamps: the only saturated gold
    // on the generator hall, and the brightest thing on the whole station.
    aetherBead: makeArchitecturalSurface({
      ambientGain: 0.3,
      color: "#FFF6E2",
      effectMode: 2,
      effectStrength: 0.1,
      emissive: "#FFAB33",
      emissiveIntensity: 0.95,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.92,
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
      ambientGain: 0.42,
      color: "#FFFFFF",
      effectMode: 2,
      effectStrength: 0.03,
      emissive: "#1B2C46",
      emissiveIntensity: 0.05,
      metalness: 0.1,
      opacity: 0.98,
      phaseColor: "#2D6FA3",
      rimColor: "#2D6FA3",
      rimStrength: 0.6,
      roughness: 0.48,
      vertexColors: true,
      windowGain: 1.15,
    }),
    // Roller-door slats: ribbed steel, a touch above the graphite structure so
    // the door reads as a moving part rather than a hole in the wall.
    aetherRibbon: makeArchitecturalSurface({
      ambientGain: 0.42,
      color: "#4A5464",
      effectMode: 2,
      effectStrength: 0.02,
      emissive: "#16202E",
      emissiveIntensity: 0.04,
      macroStrength: 0.012,
      metalness: 0.24,
      opacity: 0.99,
      phaseColor: "#2D6FA3",
      rimColor: "#8FA6BD",
      rimStrength: 0.32,
      roughness: 0.44,
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
    // Drill-rig body: white base multiplied by the per-vertex camp palette
    // (graphite steel derrick and cable, desaturated panel cladding on the
    // shack and crates, coral hazard trim, ember windows, one mint indicator
    // panel and livery line). Lit by the scene, never a lamp.
    qpuFrame: makeArchitecturalSurface({
      ambientGain: 0.42,
      color: "#FFFFFF",
      effectMode: 4,
      effectStrength: 0.03,
      emissive: "#16302C",
      emissiveIntensity: 0.05,
      metalness: 0.12,
      opacity: 0.98,
      phaseColor: "#3FBF8E",
      rimColor: "#9FE6C6",
      rimStrength: 0.46,
      roughness: 0.46,
      vertexColors: true,
      windowGain: 1.15,
    }),
    // Catwalk handrail bays: steel hardware a touch above the structure zone so
    // the walkway reads as a fitted run rather than a hole in the deck.
    qpuPlate: makeArchitecturalSurface({
      ambientGain: 0.4,
      color: "#4A5464",
      effectMode: 0,
      effectStrength: 0,
      emissive: "#161F2B",
      emissiveIntensity: 0.04,
      macroStrength: 0.012,
      metalness: 0.28,
      opacity: 0.99,
      phaseColor: "#8FA6BD",
      rimColor: "#C4D3E2",
      rimStrength: 0.36,
      roughness: 0.42,
    }),
    // Cable telemetry lights and the wireline sonde: the rig's signature
    // mechanism and the one place its mint identity is a light source.
    qpuSignal: makeArchitecturalSurface({
      ambientGain: 0.24,
      color: "#A8F5C8",
      effectMode: 4,
      effectStrength: 0.24,
      emissive: "#55CE85",
      emissiveIntensity: 1.15,
      macroStrength: 0.006,
      metalness: 0,
      opacity: 0.98,
      phaseColor: "#B6FFD6",
      rimColor: "#FFFFFF",
      rimStrength: 0.3,
      roughness: 0.08,
    }),
    // Server-hut body: white base multiplied by the per-vertex boot-camp
    // palette, lit rather than luminous, with the ember windows carried by the
    // shared warm-vertex window gain.
    s2Frame: makeArchitecturalSurface({
      ambientGain: 0.42,
      color: "#FFFFFF",
      effectMode: 1,
      effectStrength: 0.03,
      emissive: "#1D2740",
      emissiveIntensity: 0.05,
      metalness: 0.1,
      opacity: 0.98,
      phaseColor: "#56D7FF",
      rimColor: "#9FDFFF",
      rimStrength: 0.44,
      roughness: 0.44,
      vertexColors: true,
      windowGain: 1.15,
    }),
    // Cooling fan rotors: machined pale metal hardware, never a lamp.
    s2Shell: makeArchitecturalSurface({
      ambientGain: 0.4,
      color: "#C6D0DD",
      effectMode: 1,
      effectStrength: 0.02,
      emissive: "#2A3140",
      emissiveIntensity: 0.05,
      metalness: 0.3,
      opacity: 0.99,
      phaseColor: "#55CFFF",
      rimColor: "#EAF1FF",
      rimStrength: 0.4,
      roughness: 0.28,
    }),
    // Rack indicator banks: the hut's signature mechanism and the one place its
    // cobalt identity is allowed to be a light source.
    s2Signal: makeArchitecturalSurface({
      ambientGain: 0.24,
      color: "#CFDCFF",
      effectMode: 1,
      effectStrength: 0.16,
      emissive: "#5573E0",
      emissiveIntensity: 1.15,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.98,
      phaseColor: "#7C9BFF",
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

function bodyEmissive(base, activity) {
  return Math.min(BODY_EMISSIVE_CEILING, base + activity * 0.03);
}

function applyS2Instances(state, pools, scratch, rotorAngle) {
  const brownian = state.brownianCoordinates;
  const brownianBlend = state.brownianBlend || 0;
  // The hut is plant on stilts: only a wind-load micro-sway moves the box.
  // The "running" tell lives entirely in the fans and the rack lights.
  const swayX = (brownian?.[4] || 0) * brownianBlend * 0.06;
  const swayZ = (brownian?.[5] || 0) * brownianBlend * 0.06;
  const closure = state.shellClosure || 0;
  setInstance(pools.frame, 0, scratch, swayX, 0, swayZ, 0, 0, 0, 1, 1, 1);
  // Cooling fans, geared nine to one off the same deterministic rotor bearing
  // that used to drive the citadel spin: a lazy idle turn that springs up to a
  // hard extract while the seal is docked. Counter-paired so the bank reads as
  // two independent units, and pinned by reduced motion exactly as before.
  const fanAngle = rotorAngle * S2_FAN_GEAR_RATIO;
  for (let index = 0; index < S2_FAN_CENTERS_Z.length; index += 1) {
    setInstance(
      pools.shells,
      index,
      scratch,
      S2_FAN_WALL_X,
      S2_FAN_Y,
      S2_FAN_CENTERS_Z[index],
      index % 2 === 0 ? fanAngle : 0.7 - fanAngle,
      0,
      0,
      1,
      1,
      1,
    );
  }
  // Rack indicator banks behind the window strip. Each bank's lit run blinks on
  // its own incommensurate multiple of the deterministic proof-bit phase, so
  // the compute signature never marches, and docking storms both banks.
  const bitPhase = state.proofBitPhase;
  for (let index = 0; index < S2_RACK_BANK_Z.length; index += 1) {
    const blink = 0.5 + 0.5 * Math.sin(bitPhase * (3 + index * 2) + index * 2.17);
    const lit = 0.5 + blink * (0.5 + closure * 0.7);
    setInstance(
      pools.signals,
      index,
      scratch,
      S2_RACK_LIGHT_X,
      S2_RACK_WINDOW_Y,
      S2_RACK_BANK_Z[index],
      0,
      0,
      0,
      1,
      1,
      lit,
    );
  }
  // One activity scan travelling the length of the strip.
  const s2AxialTravel = (bitPhase + Math.PI) / TWO_PI;
  const scanScale = state.capExchange ? 0.9 : 0.5;
  setInstance(
    pools.signals,
    2,
    scratch,
    S2_RACK_LIGHT_X,
    S2_RACK_WINDOW_Y,
    S2_RACK_WINDOW_Z - S2_DIAGNOSTIC_HALF_SPAN + s2AxialTravel * S2_DIAGNOSTIC_HALF_SPAN * 2,
    0,
    0,
    0,
    scanScale,
    scanScale,
    scanScale * 0.45,
  );
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = bodyEmissive(0.03, closure);
  }
  if (pools.signals?.material) {
    pools.signals.material.emissiveIntensity = 1.05 + closure * 0.95;
  }
  setAwardSurfaceActivity(pools.frame?.material, closure * 0.3);
  setAwardSurfaceActivity(pools.shells?.material, closure * 0.2);
  setAwardSurfaceActivity(pools.signals?.material, state.capExchange ? 1 : closure * 0.5);
  commitPool(pools.frame);
  commitPool(pools.shells);
  commitPool(pools.signals);
}

function applyAetherInstances(state, pools, scratch, reducedMotion) {
  setIdentityInstance(pools.frame, scratch);
  const bloom = state.sanctuaryBloom || 0;
  // Roller-door ritual: idle leaves the door mostly down over the burner;
  // docking rolls all three slats up and nests them behind the lintel.
  // Reduced motion pins the door half open.
  const aperture = reducedMotion ? 0.5 : bloom;
  for (let index = 0; index < AETHER_DOOR_SLATS.length; index += 1) {
    const [closedY, openY] = AETHER_DOOR_SLATS[index];
    setInstance(
      pools.ribbons,
      index,
      scratch,
      AETHER_DOOR_X,
      closedY + (openY - closedY) * aperture,
      AETHER_DOOR_Z + 0.13,
      0,
      0,
      0,
      1,
      1,
      1,
    );
  }

  // Burner and lamp brightness both derive from the fixed-step circulation
  // phase, which the mechanism authority already freezes under reduced motion
  // and accelerates with proximity/docking.
  const cycle = state.circulationPhase;
  const burn = 0.5 + 0.5 * Math.sin(cycle * 4);
  // Small, bright and contained: the burner is a mechanism seen through a door,
  // never a glowing ball parked in front of the building.
  const burnerScale = 0.5 + burn * 0.05 + bloom * 0.1;
  setInstance(
    pools.beads,
    0,
    scratch,
    AETHER_BURNER[0],
    AETHER_BURNER[1],
    AETHER_BURNER[2],
    0,
    0,
    0,
    burnerScale,
    burnerScale,
    burnerScale,
  );
  for (let index = 1; index < state.beadVisibility.length; index += 1) {
    const lamp = AETHER_INDICATOR_LAMPS[index - 1];
    const flicker = 0.88 + 0.12 * Math.sin(cycle * 2.3 + index * 1.9);
    const lampScale = 0.17 * flicker * (0.66 + state.beadVisibility[index] * 0.34);
    setInstance(
      pools.beads,
      index,
      scratch,
      lamp[0],
      lamp[1],
      lamp[2],
      0,
      0,
      0,
      lampScale,
      lampScale,
      lampScale,
    );
  }
  if (pools.ribbons?.material) {
    pools.ribbons.material.emissiveIntensity = bodyEmissive(0.02, aperture);
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = bodyEmissive(0.03, bloom);
  }
  if (pools.beads?.material) {
    pools.beads.material.emissiveIntensity = 0.82 + burn * 0.24 + bloom * 0.4;
  }
  // Frame activity drives the world-space stack plume shimmer only.
  setAwardSurfaceActivity(pools.frame?.material, bloom);
  setAwardSurfaceActivity(pools.ribbons?.material, 0);
  setAwardSurfaceActivity(pools.beads?.material, Math.max(bloom, burn * 0.6));
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
  // The rig stands on the snow: the frame pool is an identity instance and its
  // lowest authored point is the station's STATION_LOWEST_LOCAL_Y contact.
  setIdentityInstance(pools.frame, scratch);
  const trafficBlend = reducedMotion ? 1 : traffic.blend;
  const lastSlice = state.manifoldSliceBuild.length - 1;
  const sliceSpacing = (QPU_BRIDGE_HALF_SPAN * 2) / lastSlice;
  for (let index = 0; index < state.manifoldSliceBuild.length; index += 1) {
    const build = state.manifoldSliceBuild[index];
    const normalizedX = (index / lastSlice) * 2 - 1;
    const x = -QPU_BRIDGE_HALF_SPAN + index * sliceSpacing;
    // Handrail bays sit on the same sampled camber the deck plate is built
    // from, so bay feet never float above or sink through the walkway.
    const deckY = QPU_CATWALK_BASE_Y + sampleQpuManifoldHeight(x, 0) + qpuCrestLift(normalizedX);
    const reweave = Math.sin(state.reweavePhase + index * 0.42) * 0.005 * state.manifoldBuild;
    // Deterministic wind sway rides the same fixed-step reweave phase; reduced
    // motion holds every bay perfectly still.
    const bob = reducedMotion
      ? 0
      : Math.sin(state.reweavePhase * 0.8 + index * 1.7) * 0.006 * state.manifoldBuild;
    setInstance(
      pools.plates,
      index,
      scratch,
      x,
      deckY + reweave + bob,
      0,
      0,
      0,
      normalizedX * -0.16 + reweave * 0.8,
      1,
      0.045 + build * 0.955,
      1,
    );
  }
  // Telemetry ritual: logging lights ride the winch cable, half of them running
  // down the hole and half coming back up, all on the deterministic fixed-step
  // traffic phase. Idle keeps a sparse carrier set on the wire; docking spins
  // the winch up, fills every lane and roughly doubles the cadence, brightest
  // as each light rounds the crown sheave. Reduced motion pins a static node
  // pattern along the cable instead of travel.
  for (let index = 0; index < QPU_PULSE_COUNT; index += 1) {
    const direction = index % 2 === 0 ? 1 : -1;
    const offset = index / QPU_PULSE_COUNT;
    const travel = reducedMotion
      ? (index + 0.5) / QPU_PULSE_COUNT
      : (((traffic.phase * direction + offset) % 1) + 1) % 1;
    const pose = sampleQpuCable(travel);
    const idleCarrier = index % 3 === 0 ? 1 : 0.22;
    const presence = idleCarrier + (1 - idleCarrier) * trafficBlend;
    // Lights swell out of the drum and shrink into the borehole, so nothing
    // pops when the travel phase wraps at either end of the run.
    const emergence = Math.pow(Math.sin(Math.PI * travel), 0.45);
    const interference = reducedMotion
      ? 0.5 + 0.5 * Math.cos((travel * 2 - 1) * Math.PI * 5)
      : (1 - Math.abs(travel * 2 - 1)) * trafficBlend;
    const pulseScale =
      (0.42 + trafficBlend * 0.2 + interference * 0.24) *
      presence *
      emergence *
      (0.35 + state.manifoldBuild * 0.65);
    setInstance(
      pools.signals,
      index,
      scratch,
      pose.x,
      pose.y,
      pose.z,
      0,
      pose.yaw,
      pose.pitch,
      pulseScale * 1.25,
      pulseScale,
      pulseScale,
    );
  }
  // Wireline verification sonde: the logging tool the coherent dock actually
  // runs, descending the drill line from the crown sheave into the hole.
  const progress = state.verificationBeamProgress;
  const depth = Math.max(state.coherence, progress);
  const sonde = sampleQpuCable(QPU_CABLE_CROWN_T + (0.985 - QPU_CABLE_CROWN_T) * depth);
  const sondeScale = 0.95 + progress * 0.4;
  setInstance(
    pools.signals,
    QPU_PULSE_COUNT,
    scratch,
    sonde.x,
    sonde.y,
    sonde.z,
    0,
    sonde.yaw,
    sonde.pitch,
    sondeScale * 0.75,
    sondeScale,
    sondeScale,
  );
  if (pools.plates?.material) {
    pools.plates.material.emissiveIntensity = bodyEmissive(0.02, trafficBlend);
  }
  if (pools.signals?.material) {
    pools.signals.material.emissiveIntensity = 0.82 + trafficBlend * 0.46 + depth * 0.38;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = bodyEmissive(0.03, trafficBlend);
    // The shack window warms as the winch spins up: somebody is working inside.
    const windowGain = pools.frame.material.userData.awardUniforms?.uAwardWindowGain;
    if (windowGain) windowGain.value = 1.15 + trafficBlend * 0.6;
  }
  // A drill rig is rigid plant, so the bounded spatial fold stays off the
  // structure entirely and only jitters the lights riding the cable.
  setAwardSurfaceActivity(pools.frame?.material, 0);
  setAwardSurfaceActivity(pools.plates?.material, 0);
  setAwardSurfaceActivity(pools.signals?.material, Math.min(0.3, Math.max(depth, trafficBlend) * 0.3));
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
    // Drill-rig winch: like the S2 rotor, the cable telemetry phase integrates
    // only against the fixed-step simulation clock, easing toward roughly
    // double cadence and full lane occupancy as the winch spins up on dock.
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
        name="qpu-ice-core-drill-rig"
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
          name="qpu-ice-core-drill-rig-borehole-derrick-and-shack"
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
              name="qpu-catwalk-handrail-bays qpu-endpoint-to-center-build-field"
              receiveShadow
              ref={qpuPlates}
            />
            <instancedMesh
              args={[resources.geometries.qpuSignal, resources.materials.qpuSignal, QPU_SIGNAL_POOL_SIZE]}
              frustumCulled={false}
              geometry={resources.geometries.qpuSignal}
              material={resources.materials.qpuSignal}
              name="qpu-winch-cable-telemetry qpu-wireline-verification-sonde verification-beam"
              ref={qpuSignals}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}
