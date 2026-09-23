import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { followRevealScale } from "../lib/station-reveal-follow";
import {
  ASSEMBLY_WORKSHOP_GEOMETRY,
  SW_ASSEMBLY_RELIC_CAPACITY,
  SW_BASE_LANGUAGE,
  SW_MECHANISM_BUDGET,
  SW_MECHANISM_IDS,
  SW_MECHANISM_PROFILES,
  SW_MECHANISM_SCALE_CONTRACTS,
  advanceSouthwestMechanisms,
  createSouthwestMechanismSystem,
  resolveSouthwestMechanismInputs,
  resolveSouthwestStationReveal,
} from "../lib/polar-station-mechanisms-sw";
import {
  MAST_TELEMETRY,
  MAST_TELEMETRY_CYCLE_SECONDS,
  MERKLE_ARCHIVE_WALL,
} from "../lib/crypto-structures";
import {
  STATION_DIRECTIONAL_RELIEF_GLSL,
  STATION_RELIEF_SOFFIT_OCCLUSION,
} from "../lib/polar-art-direction";

export const SOUTHWEST_MECHANISM_RENDER_PROFILE =
  "three source-backed camp facilities; beveled and lathed high-poly illusion; eight instance pools plus one connected trace; three shared programs; zero textures";

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const POLAR_GROUND_Y = -0.22;
/**
 * Calibration knob, not a fudge. LAW 3 forbids lifting these buildings with
 * emissive, so the only honest lever left is albedo — and the camp's dusk rig
 * returns a limited fraction of albedo to a wall that faces the dock. Instance
 * colour is a multiplier, so the authored camp hues are scaled into the
 * response band and the 3-zone value ladder survives intact.
 * Measured against the NEUTRALISED rig (see RIG_NEUTRALITY in PolarBiomeWorld).
 *
 * 4.2 -> 3.0, and every per-zone multiplier below deleted with it. Those two
 * changes are one fix, and the reason is measurable rather than aesthetic.
 *
 * Sampling a 340x380 window on the body of all eight docked stations, the four
 * NE stations that read as buildings bottom out at luma p5 0.045-0.066 and sit
 * at p50 0.38-0.47. All three southwest stations bottomed out at p5 0.126-0.140
 * and sat at p50 0.504-0.548: no true darks anywhere and a body a third of a
 * stop too bright. That is the entire difference between the two families —
 * NOT saturation, which measured HIGHER on the working four (0.407-0.454) than
 * on the failing three (0.310-0.388).
 *
 * The cause was the per-zone multipliers, which had inverted the ladder they
 * were meant to enforce. Expressed as authored luma x net factor they were:
 *   structureShadow 0.126 x 10.92 = 1.38     ice core   0.842 x 1.68 = 1.42
 *   structureSteel  0.190 x  9.24 = 1.76     drift snow 0.895 x 1.76 = 1.58
 * Graphite steel was rendering BRIGHTER than the snow it stands in, and the
 * darkest structural member in the camp was the same value as an ice core.
 * Nothing could read as recessed because nothing was dark.
 *
 * SW_BASE_LANGUAGE already encodes the correct ladder (structure 0.13-0.19,
 * cladding 0.42-0.46, hardware 0.80, snow 0.90). Solving each zone's target
 * against the NE family's measured band gives a per-zone factor of 3.26 / 3.03 /
 * 2.79 / 2.85 — i.e. one flat number. So the body families now take the authored
 * hex unscaled and this single gain places the whole ladder, which is what the
 * comment above always claimed was happening.
 *
 * Identity and light colours (trim, worklight, accent seams, arc) are NOT body
 * zones and keep their previous rendered brightness: their multipliers were
 * rescaled by 4.2/3.0 = 1.4 so only the ladder moved.
 */
const SW_LIGHT_RESPONSE_GAIN = 3;
/**
 * The camp's dusk rig is strongly blue (ambient #8FA2CC, hemisphere #B6C8EC,
 * blue fill), so a neutral albedo renders with its blue channel clipped — which
 * is exactly how eight different materials collapse into one electric wash.
 * These are white-balance factors, applied to the body families only: they make
 * a grey-mauve panel actually render grey-mauve and restore the value ladder.
 * Warm identity colours (trim, worklight, accent seams) keep their own hue.
 */
function balanceForDusk(color) {
  // Recalibrated after the rig was neutralised (RIG_NEUTRALITY in
  // PolarBiomeWorld caps how far a docked station may tint key/fill/rim).
  // The old 1.5/1.4/0.8 corrected a ~40% blue excess that no longer exists;
  // residual imbalance measures ~8%, so these are near-identity now.
  color.r *= 1.05;
  color.g *= 1.1;
  return color;
}
/**
 * ICE-CORE SAMPLE STORE (topology-archive-wall).
 * The archive is the camp's cold store. Its twenty evidence-derived "strata"
 * are literal ice cores: capped tubes racked horizontally in four tiers behind
 * an open bay, logged by a rig that travels the rack line. Everything else is
 * the shared camp kit — seamed insulated panels on a skid deck, graphite racks,
 * a logging bench under a warm worklight, crates, drift, cable run.
 */
const TOPOLOGY_BAR_COUNT = SW_MECHANISM_PROFILES["topology-archive-wall"].barCount;
const TOPOLOGY_RACK_TIERS = 4;
const TOPOLOGY_RACK_COLUMNS = TOPOLOGY_BAR_COUNT / TOPOLOGY_RACK_TIERS;
const TOPOLOGY_SHED_COUNT = 38;
// THE MERKLE WALL. One block per node of the SHA-256 Merkle tree over this
// station's archived corpus, laid on the dock-facing gable end: course row IS
// tree level, so the bottom course is the corpus itself, every course above it
// is one round of hashing, and the single capstone is the archive's address.
// Twelve more instances in a pool that already exists costs no draw call and no
// program, which is the only reason a whole second facade is affordable here.
const TOPOLOGY_MERKLE_COUNT = MERKLE_ARCHIVE_WALL.nodeCount;
const TOPOLOGY_FOUNDATION_COUNT = TOPOLOGY_SHED_COUNT + TOPOLOGY_MERKLE_COUNT;
const TOPOLOGY_SURFACE_COUNT = TOPOLOGY_BAR_COUNT + TOPOLOGY_FOUNDATION_COUNT;
const TOPOLOGY_FOUNDATION_START = TOPOLOGY_BAR_COUNT;
const TOPOLOGY_RACK_Z = 0.18;
const TOPOLOGY_TIER_BASE = 0.12;
const TOPOLOGY_TIER_STEP = 0.2;
const TOPOLOGY_COLUMN_STEP = 0.55;
const TOPOLOGY_RIG_TRAVEL = 1.06;
const TOPOLOGY_ROOF_Y = 0.92;
const TOPOLOGY_BAY_Z = -0.68;
const TOPOLOGY_WALL_Z = 0.7;
// Named slots inside the single archive pool; every other slot is static shed.
const TOPOLOGY_BENCH_LIGHT_INDEX = TOPOLOGY_FOUNDATION_START + 24;
const TOPOLOGY_RIG_BEAM_INDEX = TOPOLOGY_FOUNDATION_START + 31;
const TOPOLOGY_RIG_LEG_FRONT_INDEX = TOPOLOGY_FOUNDATION_START + 32;
const TOPOLOGY_RIG_LEG_BACK_INDEX = TOPOLOGY_FOUNDATION_START + 33;
const TOPOLOGY_RIG_HEAD_INDEX = TOPOLOGY_FOUNDATION_START + 34;
const TOPOLOGY_WINDOW_END_INDEX = TOPOLOGY_FOUNDATION_START + 35;
const TOPOLOGY_WINDOW_BACK_INDEX = TOPOLOGY_FOUNDATION_START + 36;
const TOPOLOGY_DECK_NOSING_INDEX = TOPOLOGY_FOUNDATION_START + 37;
const TOPOLOGY_MERKLE_START = TOPOLOGY_FOUNDATION_START + TOPOLOGY_SHED_COUNT;
/**
 * Where the Merkle wall is laid, and why there.
 *
 * The gable end at local +X is the one large planar surface this building shows
 * the dock: the long back wall faces away, and the bay front is an opening with
 * a rack standing in it. Blocks sit PROUD of the existing end-wall slab rather
 * than replacing it, so the cold store stays sealed and the silhouette is
 * untouched — the courses are relief on a wall, not the wall itself.
 *
 * Course spans converge linearly from the full wall width to one capstone
 * width, which is what makes twelve blocks read as a tree rather than a grid.
 */
const TOPOLOGY_MERKLE_FACE_X = 1.49;
const TOPOLOGY_MERKLE_CENTER_Z = 0.22;
const TOPOLOGY_MERKLE_COURSE_BASE_Y = 0.155;
const TOPOLOGY_MERKLE_COURSE_STEP_Y = 0.22;
// The bottom course spans 0.86 of the wall's 1.08 depth, not the full width: at
// 1.00 the outermost leaf blocks broke the building's leading corner and read
// as crates hung off the end rather than as courses laid into it.
const TOPOLOGY_MERKLE_SPAN_BASE = 0.86;
const TOPOLOGY_MERKLE_SPAN_CAP = 0.28;
const TOPOLOGY_MERKLE_JOINT = 0.025;
/**
 * The laid wall, solved once at module load. Every number below is either the
 * authored course geometry or a byte of the node's own SHA-256 digest:
 * byte 0 is the block's value inside the cladding band, byte 1 how far it
 * stands proud, byte 2 its course height. Nothing here reads the clock.
 */
const TOPOLOGY_MERKLE_BLOCKS = Object.freeze(
  MERKLE_ARCHIVE_WALL.nodes.map((node) => {
    const rows = Math.max(1, MERKLE_ARCHIVE_WALL.levels - 1);
    const span =
      TOPOLOGY_MERKLE_SPAN_BASE +
      (TOPOLOGY_MERKLE_SPAN_CAP - TOPOLOGY_MERKLE_SPAN_BASE) * (node.courseRow / rows);
    const pitch = span / node.courseWidth;
    return Object.freeze({
      depth: 0.04 + node.depth * 0.04,
      height: 0.14 + node.rise * 0.05,
      width: pitch - TOPOLOGY_MERKLE_JOINT,
      y: TOPOLOGY_MERKLE_COURSE_BASE_Y + node.courseRow * TOPOLOGY_MERKLE_COURSE_STEP_Y,
      z:
        TOPOLOGY_MERKLE_CENTER_Z +
        (node.courseSlot + 0.5 - node.courseWidth / 2) * pitch,
    });
  }),
);
const UPSTREAM_MAST_BAND_COUNT = 6;
// Slots 0-27 are the harbour, the tower's legs and belts, the crown and the
// stays; 28 up is the diagonal web. Widening a pooled instanced mesh costs no
// draw call and no program, which is why the bracing could be afforded at all.
const UPSTREAM_BRACE_START = 28;
// KEYSTREAM TELEMETRY. Eight climbing lamps whose blink pattern is a real
// 32-bit maximal-length LFSR keystream seeded by SHA-256 of the upstream
// repositories this mast relays (lib/crypto-structures.js). They are lamps
// bolted to the legs, not structure: nothing about the tower's members, taper,
// web, whip or beacon crown moves for them.
const UPSTREAM_TELEMETRY_START = UPSTREAM_BRACE_START + UPSTREAM_MAST_BAND_COUNT * 4;
const UPSTREAM_TELEMETRY_COUNT = MAST_TELEMETRY.lampCount;
const UPSTREAM_STRUCTURE_COUNT = UPSTREAM_TELEMETRY_START + UPSTREAM_TELEMETRY_COUNT;
const UPSTREAM_RING_COUNT = SW_MECHANISM_PROFILES["upstream-radio-mast"].ringCount;
// The pulse pool carries the three signal rings plus one dedicated tip-beacon
// halo so the blinking aviation beacon costs zero extra draw calls.
const UPSTREAM_PULSE_POOL_COUNT = UPSTREAM_RING_COUNT + 1;
const UPSTREAM_TIP_BEACON_RING_INDEX = UPSTREAM_RING_COUNT;
const UPSTREAM_TIP_BEACON_MEMBER_INDEX = 19;
const UPSTREAM_DISH_ELEVATION = 0.3;
const UPSTREAM_DISH_FACE_ON = true;
// The dish hangs at working height on the mast's side pivot, not on its head.
// At the old 1.3 it sat at 0.92 of the mast and its bowl was the top of the
// outline, so the tower terminated in a disc; a mast has to terminate in a
// point. 0.98 puts it just under half height, which is also the only height a
// dish on a real mast can be serviced at.
const UPSTREAM_DISH_MOUNT_Y = 0.98;
const UPSTREAM_DISH_MOUNT_REACH = 0.54;
const UPSTREAM_DISH_SCALE = 0.64;
const UPSTREAM_TIP_BEACON_Y = 2.58;
const UPSTREAM_TIP_SPIRE_TOP_Y = 2.5;
const UPSTREAM_RADAR_RING_FACING = Math.PI / 2;
/**
 * MACHINE SHOP (assembly-tool-locker).
 * A workshop hut with the dock side open: deck on skids, seamed tool wall,
 * workbenches, vice, a welding bay whose arc is the signature mechanism, roof
 * trusses over an overhead hoist rail, compressor and pipe run, drift. The
 * user's real merged upstream contributions hang on the tool wall as relics.
 */
const ASSEMBLY_ARCH_SEGMENTS = 7;
const ASSEMBLY_TRUSS_START = 12;
const ASSEMBLY_SHOP_START = ASSEMBLY_TRUSS_START + ASSEMBLY_ARCH_SEGMENTS * 2;
const ASSEMBLY_SHOP_SLOTS = 26;
const ASSEMBLY_RELIC_START = ASSEMBLY_SHOP_START + ASSEMBLY_SHOP_SLOTS;
const ASSEMBLY_RELIC_PARTS = 2;
const ASSEMBLY_STRUCTURE_COUNT =
  ASSEMBLY_RELIC_START + SW_ASSEMBLY_RELIC_CAPACITY * ASSEMBLY_RELIC_PARTS;
const ASSEMBLY_TOOL_WALL_Z = ASSEMBLY_WORKSHOP_GEOMETRY.backplaneLocalZ;
const ASSEMBLY_BAY_Z = -0.86;
const ASSEMBLY_ROOF_Y = 0.9;
const ASSEMBLY_BENCH_Y = 0.06;
const ASSEMBLY_WELD_X = 0.6;
const ASSEMBLY_WELD_Z = 0.12;

const STATION_TRANSFORMS = Object.freeze(
  Object.fromEntries(
    SW_MECHANISM_IDS.map((id) => {
      const profile = SW_MECHANISM_PROFILES[id];
      return [
        id,
        Object.freeze({
          position: Object.freeze([profile.centerXZ[0], profile.y, profile.centerXZ[1]]),
          rotation: Object.freeze([
            0,
            Number.isFinite(profile.angleRadians)
              ? profile.angleRadians
              : profile.angleDegrees * DEG_TO_RAD,
            0,
          ]),
        }),
      ];
    }),
  ),
);

// Stock parts wait in the bins on the left bench and travel to the welding jig.
const ASSEMBLY_STARTS = Object.freeze([
  Object.freeze([-0.86, 0.14, 0.3]),
  Object.freeze([-0.66, 0.14, 0.46]),
  Object.freeze([-0.94, 0.14, 0.02]),
  Object.freeze([-0.6, 0.14, -0.16]),
]);
const ASSEMBLY_TARGETS = Object.freeze([
  Object.freeze([ASSEMBLY_WELD_X - 0.14, 0.15, ASSEMBLY_WELD_Z - 0.08]),
  Object.freeze([ASSEMBLY_WELD_X + 0.12, 0.15, ASSEMBLY_WELD_Z - 0.02]),
  Object.freeze([ASSEMBLY_WELD_X - 0.1, 0.21, ASSEMBLY_WELD_Z + 0.06]),
  Object.freeze([ASSEMBLY_WELD_X + 0.14, 0.21, ASSEMBLY_WELD_Z + 0.1]),
]);
const ASSEMBLY_FOOTINGS = Object.freeze([
  Object.freeze([-0.96, -0.78]),
  Object.freeze([0.96, -0.78]),
  Object.freeze([-0.96, 0.78]),
  Object.freeze([0.96, 0.78]),
]);
const ASSEMBLY_START_YAWS = Object.freeze([0.34, -0.4, -0.28, 0.47]);
/**
 * One recognizable silhouette per merged upstream contribution, built from two
 * instances of the shared shop plate so the tool wall stays one draw call.
 * [bodyScale, bodyYawZ, headScale, headOffset, headYawZ]
 */
const ASSEMBLY_RELIC_SHAPES = Object.freeze({
  "kernel-block-stack": Object.freeze({
    body: Object.freeze([0.3, 0.2, 0.09]),
    bodyRoll: 0,
    head: Object.freeze([0.21, 0.15, 0.08]),
    headOffset: Object.freeze([0.03, 0.2, 0.01]),
    headRoll: 0,
  }),
  "flame-profile": Object.freeze({
    body: Object.freeze([0.08, 0.44, 0.05]),
    bodyRoll: 0.24,
    head: Object.freeze([0.15, 0.14, 0.08]),
    headOffset: Object.freeze([-0.08, -0.23, 0]),
    headRoll: 0.24,
  }),
  "relay-ring": Object.freeze({
    body: Object.freeze([0.34, 0.34, 0.05]),
    bodyRoll: Math.PI / 4,
    head: Object.freeze([0.07, 0.3, 0.06]),
    headOffset: Object.freeze([0, -0.27, 0.01]),
    headRoll: 0,
  }),
  "probe-fan": Object.freeze({
    body: Object.freeze([0.05, 0.42, 0.04]),
    bodyRoll: -0.32,
    head: Object.freeze([0.05, 0.42, 0.04]),
    headOffset: Object.freeze([0.11, 0.01, 0.01]),
    headRoll: 0.32,
  }),
});
const ASSEMBLY_RELIC_FALLBACK_SHAPE = ASSEMBLY_RELIC_SHAPES["kernel-block-stack"];
const ASSEMBLY_RELIC_WALL_X = Object.freeze([-0.8, -0.42, -0.04, 0.34]);

function localGroundY(stationId) {
  return POLAR_GROUND_Y - SW_MECHANISM_PROFILES[stationId].y;
}

/**
 * Lowest authored local-space Y of each southwest monument: every base slab is
 * placed at localGroundY(id) + halfHeight, so the footing plane IS the local
 * ground plane (upstream -0.34, topology -0.30, assembly -0.30). Frozen once
 * from the same profile anchors the JSX transforms use.
 */
const STATION_LOWEST_LOCAL_Y = Object.freeze(
  Object.fromEntries(SW_MECHANISM_IDS.map((id) => [id, localGroundY(id)])),
);

/**
 * BRACED LATTICE MAST.
 *
 * The mast used to be six solid boxes of decreasing width stacked on a plinth,
 * painted alternately coral and ivory. That is a child's stacking ring toy, and
 * no repaint fixes it, because the failure is that the volume is CLOSED: a real
 * broadcast mast is read as a mast entirely by seeing sky through an open truss.
 * The banding is not the problem — aviation obstruction marking is genuinely
 * alternating — the problem was banding a solid.
 *
 * Opening it was necessary and not sufficient. Thresholded to a black shape on
 * white — which is the only view in which "stack of boxes" and "braced tower"
 * are different objects — the open version still failed to name itself, for
 * three measurable reasons:
 *
 * 1. IT WAS NOT TALL. Silhouette aspect was 1.22:1, as wide as it was high. The
 *    camera already reserves 4.7 world units of height for this station
 *    (MECHANISM_VERTICAL_ENVELOPES) and SW_MECHANISM_SCALE_CONTRACTS asks for
 *    4.5 seal heights of mast; the geometry was delivering 2.30. It was framed
 *    like a tower and built like a hut, so half the docked frame was empty sky
 *    and the building read small and far away. Height goes to the envelope it
 *    was always framed against.
 * 2. IT HAD NO DIAGONALS. Belts and legs alone are a LADDER: in outline, the
 *    horizontals read as rungs. What identifies a lattice mast at any distance
 *    is the zigzag web between the legs, and there were zero web members. Six
 *    bays x four faces of alternating diagonal bracing is added below.
 * 3. THE DISH WAS THE CROWN. A 0.72 bowl mounted at 0.92 of the mast's height
 *    eclipsed the top of the tower, so the outline terminated in a disc — the
 *    blob primitive the object gate names explicitly. The dish drops to working
 *    height on its side pivot, which is also where a real dish is serviced
 *    from, and the crown becomes what a mast's crown is: taper, crossarms,
 *    whip, beacon.
 *
 * Cost: all of it lands in the ONE pooled instanced draw the mast already
 * issues, so the 9/4/0 draw budget is untouched at every tier. The bracing is
 * 24 more instances of the existing chamfered member — 24 x 24 verts of extra
 * geometry and no extra fill, since the members are thin and mostly against
 * sky. A lattice is the cheap direction to spend on in a fill-bound world.
 */
const UPSTREAM_GROUND_Y = localGroundY("upstream-radio-mast");
const UPSTREAM_MAST_BASE_Y = UPSTREAM_GROUND_Y + 0.12;
const UPSTREAM_MAST_TOP_Y = 2.06;
const UPSTREAM_MAST_HEIGHT = UPSTREAM_MAST_TOP_Y - UPSTREAM_MAST_BASE_Y;
const UPSTREAM_LEG_SPREAD_BASE = 0.2;
const UPSTREAM_LEG_SPREAD_TOP = 0.075;
const UPSTREAM_LEG_GAUGE = 0.05;
const UPSTREAM_BELT_GAUGE = 0.034;
const UPSTREAM_BRACE_GAUGE = 0.028;
/**
 * Real guys are thin, taut and anchored at both ends. The old ones were 0.028
 * square and placed by hand at eyeballed angles, so they read as brown sticks
 * stabbing through the tower and touching nothing. These are solved instead.
 */
const UPSTREAM_GUY_GAUGE = 0.013;
const UPSTREAM_GUY_TOP_Y = 1.44;
const UPSTREAM_FOOTINGS = Object.freeze([
  Object.freeze([-0.6, 0.44]),
  Object.freeze([0.6, 0.44]),
  Object.freeze([0, -0.58]),
]);

function upstreamSpreadAt(t) {
  return (
    UPSTREAM_LEG_SPREAD_BASE +
    (UPSTREAM_LEG_SPREAD_TOP - UPSTREAM_LEG_SPREAD_BASE) * t
  );
}

/**
 * Aim a Y-up member from one point to another, solved once at module load
 * rather than per frame. With THREE's default XYZ Euler and rotation
 * (0, yaw, roll) the local +Y axis maps to
 *   (-cos(yaw)sin(roll), cos(roll), sin(yaw)sin(roll))
 * so for a unit direction (dx, dy, dz) the exact solution is
 *   roll = acos(dy),  yaw = atan2(dz, -dx)
 * and the member length is the true end-to-end distance, which is what makes
 * both ends actually land on something. Both the guy stays and the lattice
 * bracing are this same problem, so they share the one solver.
 */
function solveMember(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return Object.freeze({
    length,
    position: Object.freeze([
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ]),
    roll: Math.acos(dy / length),
    yaw: Math.atan2(dz, -dx),
  });
}

const UPSTREAM_GUY_STAYS = Object.freeze(
  UPSTREAM_FOOTINGS.map(([footX, footZ]) =>
    solveMember([0, UPSTREAM_GUY_TOP_Y, 0], [footX, UPSTREAM_GROUND_Y + 0.2, footZ]),
  ),
);

/**
 * The web. One diagonal per bay per face, flipping direction every bay so the
 * four faces carry a continuous zigzag rather than a set of parallel slashes —
 * that alternation is what the eye reads as "braced" instead of "leaning".
 *
 * Corner order matches the leg loop below (0:-x-z, 1:+x-z, 2:+x+z, 3:-x+z), so
 * face f spans corners f and (f+1)%4 and the four faces close the tower.
 */
const UPSTREAM_BRACE_FACES = 4;
const UPSTREAM_CORNER_SIGNS = Object.freeze([
  Object.freeze([-1, -1]),
  Object.freeze([1, -1]),
  Object.freeze([1, 1]),
  Object.freeze([-1, 1]),
]);

function upstreamCorner(cornerIndex, t) {
  const spread = upstreamSpreadAt(t);
  const [signX, signZ] = UPSTREAM_CORNER_SIGNS[cornerIndex];
  return [
    signX * spread,
    UPSTREAM_MAST_BASE_Y + UPSTREAM_MAST_HEIGHT * t,
    signZ * spread,
  ];
}

const UPSTREAM_BRACES = Object.freeze(
  Array.from({ length: UPSTREAM_MAST_BAND_COUNT * UPSTREAM_BRACE_FACES }, (_, slot) => {
    const bay = Math.floor(slot / UPSTREAM_BRACE_FACES);
    const face = slot % UPSTREAM_BRACE_FACES;
    const lower = bay / UPSTREAM_MAST_BAND_COUNT;
    const upper = (bay + 1) / UPSTREAM_MAST_BAND_COUNT;
    const rising = (bay + face) % 2 === 0;
    const left = face;
    const right = (face + 1) % UPSTREAM_BRACE_FACES;
    return rising
      ? solveMember(upstreamCorner(left, lower), upstreamCorner(right, upper))
      : solveMember(upstreamCorner(right, lower), upstreamCorner(left, upper));
  }),
);

/**
 * Telemetry lamp mounts: alternating corners of the dock-facing truss face,
 * climbing the tower, pushed just clear of the leg they are bolted to. Solved
 * at module load off the same corner solver the web uses, so a lamp cannot
 * drift off the structure when the taper changes.
 */
const UPSTREAM_TELEMETRY_MOUNTS = Object.freeze(
  Array.from({ length: UPSTREAM_TELEMETRY_COUNT }, (_, lamp) => {
    const [x, y, z] = upstreamCorner(
      lamp % 2,
      (lamp + 0.6) / UPSTREAM_TELEMETRY_COUNT,
    );
    return Object.freeze([x * 1.2, y, z * 1.2]);
  }),
);

/**
 * One lamp's lit level for a given telemetry clock. Phase, duty and intensity
 * are keystream bytes fixed at module load, so this is a divide, a modulo and a
 * compare — the pattern is cryptographic, the per-frame arithmetic is not.
 *
 * `telemetryTime` does not advance under reduced motion, so the pattern then
 * holds at its seed state instead of freezing every lamp dark.
 */
function upstreamTelemetryLevel(lamp, telemetryTime) {
  const cycle =
    (telemetryTime / MAST_TELEMETRY_CYCLE_SECONDS + MAST_TELEMETRY.phase[lamp]) % 1;
  return cycle < MAST_TELEMETRY.duty[lamp] ? MAST_TELEMETRY.intensity[lamp] : 0;
}

function createDynamicLineGeometry(maximumSegments) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(
    new Float32Array(maximumSegments * 2 * 3),
    3,
  );
  const color = new THREE.BufferAttribute(
    new Float32Array(maximumSegments * 2 * 3),
    3,
  );
  position.setUsage(THREE.DynamicDrawUsage);
  color.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("color", color);
  geometry.setDrawRange(0, 0);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  return geometry;
}

function createBeveledExtrusion(shape, quality, bevelSize) {
  const high = quality === "high";
  const low = quality === "low";
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: high ? 4 : low ? 1 : 2,
    bevelSize,
    bevelThickness: bevelSize,
    curveSegments: high ? 10 : low ? 3 : 6,
    depth: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Any geometry drawn by a vertexColors material must carry a real color
 * attribute — a missing attribute samples black and unlights the whole pool
 * (the root cause of the old monochrome dark-red tower). Bake soft
 * normal-based face shading so band paint reads as lit steel, not decals.
 */
/**
 * Range was 0.96-1.48, against the 0.90-1.14 its panel counterpart uses on the
 * other two camp buildings. Both bakes feed the same per-instance colours and
 * the same shared gain, so the mast was silently running ~1.3x hotter than the
 * cold store and machine shop on every member it draws — which is why its pale
 * aviation bands clipped to snow-white and its dish, the largest bright surface
 * in the camp, blew out into a flat paper ellipse no matter what colour it was
 * given. Matched to the panel band so one gain means one thing camp-wide.
 */
function bakeFaceShadingAttribute(geometry) {
  const normals = geometry.getAttribute("normal");
  const shades = new Float32Array(normals.count * 3);
  for (let index = 0; index < normals.count; index += 1) {
    const normalY = normals.getY(index);
    const normalZ = normals.getZ(index);
    const shade =
      0.9 + Math.abs(normalZ) * 0.1 + Math.max(0, normalY) * 0.18;
    shades[index * 3] = shade;
    shades[index * 3 + 1] = shade;
    shades[index * 3 + 2] = shade;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
  return geometry;
}

function createHarborMemberGeometry(quality) {
  const chamfer = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5 + chamfer, -0.5);
  shape.lineTo(0.5 - chamfer, -0.5);
  shape.lineTo(0.5, -0.5 + chamfer);
  shape.lineTo(0.5, 0.5 - chamfer);
  shape.lineTo(0.5 - chamfer, 0.5);
  shape.lineTo(-0.5 + chamfer, 0.5);
  shape.lineTo(-0.5, 0.5 - chamfer);
  shape.lineTo(-0.5, -0.5 + chamfer);
  shape.closePath();
  return bakeFaceShadingAttribute(createBeveledExtrusion(shape, quality, 0.045));
}

/**
 * A gentle face-shading bake for the two camp facilities. LAW 3 wants lit
 * bodies, not glowing ones, so the range stays inside 0.90-1.14: it only
 * separates a panel's top face from its flank so seams and chamfers read,
 * and never brightens a surface into the emissive band.
 */
function bakePanelShadingAttribute(geometry) {
  const normals = geometry.getAttribute("normal");
  const shades = new Float32Array(normals.count * 3);
  for (let index = 0; index < normals.count; index += 1) {
    const normalY = normals.getY(index);
    const normalZ = normals.getZ(index);
    const shade =
      0.9 + Math.abs(normalZ) * 0.08 + Math.max(0, normalY) * 0.16;
    shades[index * 3] = shade;
    shades[index * 3 + 1] = shade;
    shades[index * 3 + 2] = shade;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
  return geometry;
}

function createLaunchPadGeometry(quality) {
  // Insulated camp panel section, extruded along its run. Recessed seam
  // grooves down both edges make panel-to-panel joints real at any scale, and
  // the bored aperture reads as a strip window in a wall and as the open bore
  // of a capped core tube when the section is squeezed to tube gauge.
  const chamfer = 0.09;
  const seam = 0.045;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5 + chamfer, -0.5);
  shape.lineTo(0.5 - chamfer, -0.5);
  shape.lineTo(0.5, -0.5 + chamfer);
  shape.lineTo(0.5, -0.18);
  shape.lineTo(0.5 - seam, -0.13);
  shape.lineTo(0.5 - seam, 0.13);
  shape.lineTo(0.5, 0.18);
  shape.lineTo(0.5, 0.5 - chamfer);
  shape.lineTo(0.5 - chamfer, 0.5);
  shape.lineTo(-0.5 + chamfer, 0.5);
  shape.lineTo(-0.5, 0.5 - chamfer);
  shape.lineTo(-0.5, 0.18);
  shape.lineTo(-0.5 + seam, 0.13);
  shape.lineTo(-0.5 + seam, -0.13);
  shape.lineTo(-0.5, -0.18);
  shape.lineTo(-0.5, -0.5 + chamfer);
  shape.closePath();
  const aperture = new THREE.Path();
  aperture.moveTo(-0.05, -0.05);
  aperture.lineTo(0.05, -0.05);
  aperture.quadraticCurveTo(0.08, -0.05, 0.08, -0.02);
  aperture.lineTo(0.08, 0.02);
  aperture.quadraticCurveTo(0.08, 0.05, 0.05, 0.05);
  aperture.lineTo(-0.05, 0.05);
  aperture.quadraticCurveTo(-0.08, 0.05, -0.08, 0.02);
  aperture.lineTo(-0.08, -0.02);
  aperture.quadraticCurveTo(-0.08, -0.05, -0.05, -0.05);
  aperture.closePath();
  shape.holes.push(aperture);
  // The topology material declares vertexColors, so the panel must carry a
  // real color attribute — a missing attribute samples black and unlights the
  // whole pool. Per-instance identity colors multiply on top of the bake.
  return bakePanelShadingAttribute(createBeveledExtrusion(shape, quality, 0.028));
}

// Semantic alias: the cold store's reusable insulated panel section, named
// explicitly because the shared station contract pins the builder name.
function createArchiveSlabGeometry(quality) {
  return createLaunchPadGeometry(quality);
}

function createAssemblyBlockGeometry(quality) {
  // Shop plate section: a rolled-edge steel plate with a tool notch cut out of
  // the top lip. Serves as deck, clad panel, bench top, bin and hung tool, so
  // the whole machine shop stays inside one pooled draw.
  const radius = 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5 + radius, -0.5);
  shape.lineTo(0.5 - radius, -0.5);
  shape.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + radius);
  shape.lineTo(0.5, 0.32);
  shape.lineTo(0.46, 0.36);
  shape.lineTo(0.5, 0.5 - radius);
  shape.quadraticCurveTo(0.5, 0.5, 0.5 - radius, 0.5);
  shape.lineTo(0.16, 0.5);
  shape.lineTo(0.1, 0.38);
  shape.lineTo(-0.1, 0.38);
  shape.lineTo(-0.16, 0.5);
  shape.lineTo(-0.5 + radius, 0.5);
  shape.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - radius);
  shape.lineTo(-0.5, 0.36);
  shape.lineTo(-0.46, 0.32);
  shape.lineTo(-0.5, -0.5 + radius);
  shape.quadraticCurveTo(-0.5, -0.5, -0.5 + radius, -0.5);
  shape.closePath();
  return bakePanelShadingAttribute(createBeveledExtrusion(shape, quality, 0.026));
}

function createBearingDishGeometry(quality) {
  const high = quality === "high";
  const low = quality === "low";
  const profile = [
    new THREE.Vector2(0, -0.25),
    new THREE.Vector2(0.14, -0.235),
    new THREE.Vector2(0.34, -0.15),
    new THREE.Vector2(0.54, 0.02),
    new THREE.Vector2(0.65, 0.18),
    new THREE.Vector2(0.63, 0.23),
    new THREE.Vector2(0.55, 0.12),
    new THREE.Vector2(0.33, -0.04),
    new THREE.Vector2(0.12, -0.12),
    new THREE.Vector2(0, -0.13),
  ];
  const geometry = new THREE.LatheGeometry(
    profile,
    high ? 40 : low ? 16 : 28,
  );
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return bakeFaceShadingAttribute(geometry);
}

function createRenderResources(quality) {
  const high = quality === "high";
  const low = quality === "low";
  const locatorPin = new THREE.CylinderGeometry(
    0.09,
    0.11,
    1,
    high ? 14 : low ? 6 : 10,
    1,
  );
  const harborMember = createHarborMemberGeometry(quality);
  const dish = createBearingDishGeometry(quality);
  const archiveSlab = createArchiveSlabGeometry(quality);
  const assemblyBlock = createAssemblyBlockGeometry(quality);
  const torus = new THREE.TorusGeometry(
    0.36,
    low ? 0.032 : 0.04,
    low ? 6 : 8,
    high ? 64 : low ? 24 : 44,
  );
  const packet = new THREE.IcosahedronGeometry(0.11, high ? 1 : 0);
  const upstreamPalette = SW_MECHANISM_PROFILES["upstream-radio-mast"].palette;
  const topologyPalette = SW_MECHANISM_PROFILES["topology-archive-wall"].palette;
  const assemblyPalette = SW_MECHANISM_PROFILES["assembly-tool-locker"].palette;
  const makeSurface = ({ color, emissive, emissiveIntensity, metalness, opacity, roughness }) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      metalness,
      opacity,
      roughness,
      side: THREE.DoubleSide,
      transparent: true,
      vertexColors: true,
    });
    // DIRECTIONAL RELIEF. The vertex bakes below can only be an approximation:
    // they are computed in the part's LOCAL space, and the camp instances every
    // part at a rotation (crossarms at PI/2, mast legs leaned inward), so a
    // local-Y term is not world up for every draw and a local-space soffit would
    // have darkened the wrong faces. The world-space pass belongs in the shader,
    // where it is correct for every instance of every pool at once. Same block,
    // same constants as the northeast family: one soffit means one thing.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
${STATION_DIRECTIONAL_RELIEF_GLSL}
// The camp bodies carry no ambient-gain uniform — they are read by the scene's
// key/fill/hemisphere rig — so the deck lift is taken off the surface's own
// albedo. Held well under the northeast lift because these three are white-base
// materials tinted per instance, and a proportional lift on white clips.
reflectedLight.indirectDiffuse += diffuseColor.rgb * stationDeckLight * 0.085;
reflectedLight.indirectDiffuse += diffuseColor.rgb * stationWallTurn * 0.035;
reflectedLight.indirectDiffuse *= 1.0 - stationSoffitShade * ${STATION_RELIEF_SOFFIT_OCCLUSION};`,
      );
    };
    // One key for every camp body keeps the family at its budgeted three
    // programs: these materials already differed only by uniform values.
    material.customProgramCacheKey = () => "polar-sw-camp-surface-v1";
    material.userData.stationBaseOpacity = opacity;
    return material;
  };
  const makeGlow = (color, opacity = 0.92) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity,
      toneMapped: false,
      transparent: true,
    });
    material.userData.stationBaseOpacity = opacity;
    return material;
  };
  const materials = {
    assemblyProof: makeGlow(assemblyPalette.proof, 0.92),
    // LAW 3: the shop body is lit, not glowing. The camp key/fill/hemisphere
    // rig models the panels; the emissive floor is only enough to keep the
    // deep side of a graphite frame from crushing to black.
    assemblySurface: makeSurface({
      color: "#FFFFFF",
      emissive: assemblyPalette.highlight,
      emissiveIntensity: 0.05,
      metalness: 0.24,
      opacity: 1,
      roughness: 0.52,
    }),
    // Same law for the cold store: insulated panels and steel racks are read by
    // scene light, so magenta only ever appears on the logger scan line and
    // the rack index labels it crosses.
    topologySurface: makeSurface({
      color: "#FFFFFF",
      emissive: topologyPalette.glow,
      emissiveIntensity: 0.05,
      metalness: 0.16,
      opacity: 1,
      roughness: 0.56,
    }),
    topologyTrace: new THREE.LineBasicMaterial({
      color: "#FFFFFF",
      depthWrite: false,
      opacity: 0.96,
      toneMapped: false,
      transparent: true,
      vertexColors: true,
    }),
    // White glow base: the rings, packet, and tip beacon each pick their own
    // instance color (mint packets, warm white-coral beacon) instead of one
    // shared teal wash.
    upstreamSignal: makeGlow("#FFFFFF", 0.9),
    // LAW 3 applies to the mast too, and this is where it was being broken
    // hardest: at 0.52 the dish emitted half its own light, so the lathe bowl's
    // curvature never shaded and a genuinely dished reflector rendered as a flat
    // white ellipse — the "paper dish" read. At 0.06 the camp key models the
    // bowl and the concave face darkens away from the light, which is the only
    // thing that makes a parabolic reflector look like one.
    upstreamDish: makeSurface({
      color: "#FFFFFF",
      emissive: upstreamPalette.trim,
      emissiveIntensity: 0.06,
      metalness: 0.18,
      opacity: 1,
      roughness: 0.42,
    }),
    // Banded broadcast steel: hue lives in the per-instance aviation band
    // colors, so the shared emissive is only a dim warm-ivory dusk floor.
    // 0.36 -> 0.05 brings the mast inside the same LAW 3 band the cold store
    // and machine shop have always been held to. At 0.36 a warm emissive sat on
    // top of near-black graphite and turned every structural member, guy stay
    // and antenna pole mid-brown, and it flattened the whole tower by drowning
    // the key light's gradient — which is most of why it read as a toy.
    // Roughness up 0.36 -> 0.55: painted structural steel, not enamel.
    upstreamSurface: makeSurface({
      color: "#FFFFFF",
      emissive: upstreamPalette.trim,
      emissiveIntensity: 0.05,
      metalness: 0.22,
      opacity: 1,
      roughness: 0.55,
    }),
  };
  materials.topologyTrace.userData.stationBaseOpacity = 0.96;
  return {
    archiveSlab,
    assemblyBlock,
    dish,
    harborMember,
    locatorPin,
    materials,
    packet,
    topologyTrace: createDynamicLineGeometry(TOPOLOGY_BAR_COUNT + 4),
    torus,
  };
}

function applyStationRootReveal(
  root,
  stationId,
  alpha,
  familyAlpha,
  isPromise,
  dockedHeroScale = 1,
  delta = 0,
  reducedMotion = false,
) {
  if (!root) return;
  root.visible = alpha > 0.005 && familyAlpha > 0.005;
  if (!root.visible) return;
  const targetScale = isPromise ? 0.88 : dockedHeroScale;
  const revealScale = followRevealScale(root, targetScale, delta, reducedMotion);
  root.scale.setScalar(revealScale);
  // Scale about the ground-contact plane, not the root origin: lift the root
  // so the footing plane stays pinned at POLAR_GROUND_Y for whatever scale
  // value this frame applies (hero, promise, or idle).
  root.position.y =
    SW_MECHANISM_PROFILES[stationId].y +
    (revealScale - 1) * -STATION_LOWEST_LOCAL_Y[stationId];
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const baseOpacity = material.userData.stationBaseOpacity ?? 1;
      material.opacity = baseOpacity * familyAlpha * (isPromise ? alpha : 1);
    }
  });
}

function disposeRenderResources(resources) {
  resources.archiveSlab.dispose();
  resources.assemblyBlock.dispose();
  resources.dish.dispose();
  resources.harborMember.dispose();
  resources.locatorPin.dispose();
  for (const material of Object.values(resources.materials)) material.dispose();
  resources.packet.dispose();
  resources.topologyTrace.dispose();
  resources.torus.dispose();
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

function commitPool(mesh) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function setInstanceColor(mesh, index, color) {
  if (!mesh) return;
  mesh.setColorAt(index, color);
}

/**
 * The material only has to be re-derived the first time a pool grows an
 * instanceColor attribute — flagging it every frame re-keys the program on the
 * frame loop for no benefit, which is exactly the kind of stall LAW 4 forbids.
 */
function commitInstanceColors(mesh) {
  if (!mesh?.instanceColor) return;
  mesh.instanceColor.needsUpdate = true;
  if (mesh.userData.instanceColorReady) return;
  mesh.userData.instanceColorReady = true;
  mesh.material.needsUpdate = true;
}

/**
 * Radio-tower color language, four distinct reads on two pooled draws:
 * coral/ivory alternating aviation paint bands, graphite base steel and
 * lattice, warm white dish hardware on a brass pivot, and mint signal lights.
 * All values derive from the station palette — no foreign color literals.
 */
let upstreamColorAuthority = null;

function upstreamColors() {
  if (upstreamColorAuthority) return upstreamColorAuthority;
  const profile = SW_MECHANISM_PROFILES["upstream-radio-mast"];
  const palette = profile.palette;
  const upstreamPalette = palette;
  const white = new THREE.Color("#FFFFFF");
  const gain = SW_LIGHT_RESPONSE_GAIN;
  // THIS STATION WAS THE OUTLIER OF THE OUTLIERS, in two ways that compounded.
  //
  // 1. It was the only southwest station that never applied the shared light
  //    response gain, so it could not use the camp's authored value ladder at
  //    all and instead carried raw near-full-albedo palette hexes: coral at
  //    0.71 red and an ivory clipped to white. A stack of those two alternating
  //    is a candy stripe by construction, whatever the hues are.
  // 2. Its body material ran emissiveIntensity 0.36 and its dish 0.52, against
  //    the <= 0.06 LAW 3 band the cold store and machine shop are held to and
  //    the check script now enforces here too. A body that emits a third of its
  //    own light barely responds to the key, so it had almost no gradient
  //    across any face — the single clearest tell between a prop and a toy —
  //    and the warm emissive floor over a near-black graphite is what turned
  //    every structural member, guy and pole mid-BROWN rather than steel.
  //
  // Both are now fixed the same way the other two stations already worked:
  // authored SW_BASE_LANGUAGE hexes, unscaled, times the shared gain, lit by
  // the camp rig. Coral survives where a real aviation-marked mast wears it —
  // alternating obstruction bands and the tip beacon — but as paint on a
  // graphite lattice rather than as half of the building's mass.
  // The mast is the one camp building whose STRUCTURE is its body rather than
  // its frame: legs, belts, poles and stays are most of its pixels, where the
  // cold store and machine shop spend the same graphite on thin members against
  // a large clad wall. At the camp's bare structural value that made the whole
  // tower a black silhouette with no form in it. Galvanised lattice is honestly
  // lighter than painted structural steel, so the legs take the camp graphite
  // pulled a quarter of the way to hardware — same kit, correct finish.
  const graphite = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.hardware), 0.24),
  ).multiplyScalar(gain);
  const graphiteDeep = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel),
  ).multiplyScalar(gain);
  // The harbour deck is the largest single surface the mast has and it sits in
  // snow. At bare structure value it rendered as a black rectangle punched out
  // of the drift — the heaviest shape in the frame, and pure void. It is also
  // the one HORIZONTAL surface here, so it takes the key almost head-on and
  // returns far more than the vertical walls the gain was calibrated against:
  // at 0.42 toward snow it came back brighter than the drift around it. 0.16
  // lands it just under the snow, which is where a swept steel deck belongs.
  const deck = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.snow), 0.16),
  ).multiplyScalar(gain);
  const hardware = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware),
  ).multiplyScalar(gain);
  // The pale aviation band is PAINT, not hardware, and that distinction is what
  // took three passes to get right. The shared gain is calibrated so the
  // cladding zone lands mid on a vertical wall; the hardware zone is nearly
  // twice cladding's luma, so anything large and key-facing given hardware
  // value clips straight to white. On the facilities that is harmless because
  // their hardware surfaces are small ice cores and bench tops. On the mast the
  // pale bands and the dish are among the biggest surfaces in the frame, so at
  // hardware value they read as snow stuck to the tower and as paper. Weathered
  // aviation white at polar dusk is a light grey — that is what this is.
  const ivory = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.structureSteel), 0.3),
  ).multiplyScalar(gain);
  // Identity coral, deliberately NOT dusk-balanced (warm identity keeps its own
  // hue) and held at 0.62 so a band reads as enamel over steel and still sits
  // below the ivory band it alternates with.
  const coral = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim)
    .multiplyScalar(0.62 * gain);
  // One weathered band so the paint stack reads as maintained rather than
  // printed. upstreamPalette.surface is this station's own lighter coral.
  const coralWorn = new THREE.Color(upstreamPalette.surface)
    .multiplyScalar(0.5 * gain);
  const brass = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(new THREE.Color(SW_BASE_LANGUAGE.hardware), 0.45)
    .multiplyScalar(0.72 * gain);
  // Guy stays are thin galvanised cable: structure steel pulled toward hardware
  // so they catch the rim light along their length instead of reading as poles.
  const wire = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.hardware), 0.35),
  ).multiplyScalar(gain);
  // Mint stays on the two waveguide lamps only, at indicator scale and
  // indicator strength — never again as a pair of saturated green blocks.
  const mintLamp = new THREE.Color(palette.packet).multiplyScalar(0.4 * gain);
  // Keystream telemetry lamps. Dark is a cold unlit lens rather than a hole, and
  // full-on stays under the tip beacon: the beacon is the brightest lamp on the
  // tower and the telemetry run must not compete with it.
  const telemetryOff = new THREE.Color(palette.packet).multiplyScalar(0.12 * gain);
  const telemetryOn = new THREE.Color(palette.packet)
    .lerp(white, 0.3)
    .multiplyScalar(0.4 * gain);
  const beaconLampOn = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(white, 0.25)
    .multiplyScalar(gain);
  const beaconLampOff = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim)
    .multiplyScalar(0.35 * gain);
  // A reflector is a metal bowl, not a sheet of paper. The old face was pure
  // white lerped toward the warm trim and sat on a 0.52 emissive, so the lathe
  // bowl's curvature could not shade and it rendered as a flat ellipse. Plain
  // camp hardware value lets the key light find the dish across its own width.
  const dishFace = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.structureSteel), 0.42),
  ).multiplyScalar(gain);
  // Glow-pool colours stay UNGAINED: the ring/beacon halo pool is an unlit
  // MeshBasicMaterial with toneMapped false, so the gain (a lighting-response
  // compensation for lit surfaces) has no meaning there and would only clip.
  // Pulled toward white so the rings read as emitted signal rather than as
  // lime-green paint hanging in the air beside the tower.
  const mintSignal = new THREE.Color(palette.packet).lerp(white, 0.32);
  upstreamColorAuthority = {
    beaconHaloHot: new THREE.Color(SW_BASE_LANGUAGE.emberWindow).lerp(white, 0.4),
    beaconHaloOff: new THREE.Color(SW_BASE_LANGUAGE.safetyTrim).multiplyScalar(0.3),
    beaconLampOff,
    beaconLampOn,
    brass,
    coral,
    coralWorn,
    deck,
    dishFace,
    graphite,
    graphiteDeep,
    hardware,
    ivory,
    mintLamp,
    mintSignal,
    haloScratch: new THREE.Color(),
    scratch: new THREE.Color(),
    telemetryOff,
    telemetryOn,
    telemetryScratch: new THREE.Color(),
    wire,
  };
  return upstreamColorAuthority;
}

/**
 * Static band assignment for the mast members; the tip beacon housing
 * (index 19) is re-lit every frame from state.beaconIntensity.
 *
 *   0      harbour plinth            10-13  four tapered corner legs
 *   1-3    three snow footings       14-15  antenna standoff crossarms
 *   4-9    six aviation belt bands   16-17  dish reach strut + feed horn
 *   18     tip whip                  20-22  antenna farm masts + crossbar
 *   19     tip beacon housing        23-24  mint waveguide lamps
 *   28-51  diagonal lattice web      25-27  three guy stays
 *   52+    keystream telemetry lamps
 *
 * The web is deliberately NOT painted. Aviation obstruction marking goes on the
 * belts, which is where a real mast wears it; banding the diagonals as well
 * would put coral on most of the tower's members and take the station straight
 * back to being a candy stripe.
 */
function upstreamMemberColor(colors, index) {
  if (index >= UPSTREAM_TELEMETRY_START) return colors.telemetryOff; // keystream lamps
  if (index >= UPSTREAM_BRACE_START) return colors.graphiteDeep; // lattice web
  if (index === 0) return colors.deck; // harbour plinth
  if (index <= 3) return colors.graphite; // three snow footings
  if (index <= 3 + UPSTREAM_MAST_BAND_COUNT) {
    // Aviation obstruction marking: alternating coral and pale bands, with the
    // third band weathered so the stack is paint rather than a printed decal.
    if (index === 6) return colors.coralWorn;
    return (index - 4) % 2 === 0 ? colors.coral : colors.ivory;
  }
  if (index <= 13) return colors.graphite; // four tapered corner legs
  if (index <= 15) return colors.graphite; // antenna standoff crossarms
  if (index === 16) return colors.brass; // dish reach strut
  if (index === 17) return colors.hardware; // feed horn at the dish focus
  if (index === 18) return colors.hardware; // tip spire
  if (index === UPSTREAM_TIP_BEACON_MEMBER_INDEX) return colors.beaconLampOn;
  if (index <= 22) return colors.graphite; // antenna farm masts + crossbar
  if (index <= 24) return colors.mintLamp; // mint waveguide lamps
  return colors.wire; // guy-line stays
}

function applySouthwestIdentityColors(pools) {
  const signalColors = upstreamColors();
  for (let index = 0; index < UPSTREAM_STRUCTURE_COUNT; index += 1) {
    setInstanceColor(
      pools.upstreamStructures,
      index,
      upstreamMemberColor(signalColors, index),
    );
  }
  setInstanceColor(pools.upstreamDish, 0, signalColors.dishFace);
  for (let ring = 0; ring < UPSTREAM_RING_COUNT; ring += 1) {
    setInstanceColor(pools.upstreamPulses, ring, signalColors.mintSignal);
  }
  setInstanceColor(
    pools.upstreamPulses,
    UPSTREAM_TIP_BEACON_RING_INDEX,
    signalColors.beaconHaloHot,
  );
  setInstanceColor(pools.upstreamPacket, 0, signalColors.mintSignal);

  const archiveColors = topologyColors();
  for (let index = 0; index < TOPOLOGY_SURFACE_COUNT; index += 1) {
    setInstanceColor(pools.topologySurfaces, index, archiveColors.base[index]);
  }

  const shopColors = assemblyColors();
  for (let index = 0; index < ASSEMBLY_STRUCTURE_COUNT; index += 1) {
    setInstanceColor(pools.assemblyStructures, index, shopColors.base[index]);
  }

  commitInstanceColors(pools.upstreamStructures);
  commitInstanceColors(pools.upstreamDish);
  commitInstanceColors(pools.upstreamPulses);
  commitInstanceColors(pools.upstreamPacket);
  commitInstanceColors(pools.topologySurfaces);
  commitInstanceColors(pools.assemblyStructures);
}

function applyUpstreamInstances(state, pools, scratch) {
  const groundY = localGroundY("upstream-radio-mast");
  const colors = upstreamColors();
  const receiving = state.phase === "RECEIVE";
  const localBearing =
    (state.visualBearingRadians ?? state.dishBearingRadians) -
    SW_MECHANISM_PROFILES["upstream-radio-mast"].angleDegrees * DEG_TO_RAD;
  // Receive gesture: while a packet lands, the dish nods a little further
  // skyward and settles back — deterministic, driven only by packetProgress.
  const receiveNod = receiving ? Math.sin(state.packetProgress * Math.PI) : 0;
  const dishElevation = UPSTREAM_DISH_ELEVATION + receiveNod * 0.09;
  const beamHorizontal = Math.cos(dishElevation);
  const beamX = Math.sin(localBearing) * beamHorizontal;
  const beamY = Math.sin(dishElevation);
  const beamZ = Math.cos(localBearing) * beamHorizontal;
  // The dish is real side-pivot hardware: a brass strut reaches off the upper
  // mast along the bearing and the lathe bowl hangs from that pivot.
  const mountX = Math.sin(localBearing) * UPSTREAM_DISH_MOUNT_REACH;
  const mountZ = Math.cos(localBearing) * UPSTREAM_DISH_MOUNT_REACH;
  const dishX = mountX + beamX * 0.06;
  const dishY = UPSTREAM_DISH_MOUNT_Y + beamY * 0.06;
  const dishZ = mountZ + beamZ * 0.06;

  // Harbor plinth, sunk to a low deck so the mast sits IN the drift rather than
  // on a slab, plus three snow footings the guy stays actually terminate on.
  // 1.62 x 1.38 made the deck the widest thing in the outline and the tower an
  // ornament standing on it; a mast's footprint is small by definition, so the
  // deck is now narrower than the guy spread it carries.
  setInstance(pools.structures, 0, scratch, 0, groundY + 0.05, 0, 0, 0, 0, 1.02, 0.09, 0.88);
  for (let footing = 0; footing < UPSTREAM_FOOTINGS.length; footing += 1) {
    const [footX, footZ] = UPSTREAM_FOOTINGS[footing];
    setInstance(
      pools.structures,
      1 + footing,
      scratch,
      footX,
      groundY + 0.12,
      footZ,
      0,
      0,
      0,
      0.24,
      0.22,
      0.24,
    );
  }
  // Six aviation obstruction bands (4-9) as thin belt plates on an OPEN truss.
  const bandStep = UPSTREAM_MAST_HEIGHT / UPSTREAM_MAST_BAND_COUNT;
  for (let band = 0; band < UPSTREAM_MAST_BAND_COUNT; band += 1) {
    const width =
      2 * upstreamSpreadAt((band + 0.5) / UPSTREAM_MAST_BAND_COUNT) +
      UPSTREAM_LEG_GAUGE;
    setInstance(
      pools.structures,
      4 + band,
      scratch,
      0,
      UPSTREAM_MAST_BASE_Y + bandStep * (band + 0.5),
      0,
      0,
      0,
      0,
      width,
      UPSTREAM_BELT_GAUGE,
      width,
    );
  }
  // Four corner legs (10-13), leaned inward so the truss tapers to the crown.
  const legLean = Math.atan2(
    UPSTREAM_LEG_SPREAD_BASE - UPSTREAM_LEG_SPREAD_TOP,
    UPSTREAM_MAST_HEIGHT,
  );
  const legOffset = (UPSTREAM_LEG_SPREAD_BASE + UPSTREAM_LEG_SPREAD_TOP) / 2;
  for (let leg = 0; leg < 4; leg += 1) {
    const signX = leg === 0 || leg === 3 ? -1 : 1;
    const signZ = leg < 2 ? -1 : 1;
    setInstance(
      pools.structures,
      10 + leg,
      scratch,
      signX * legOffset,
      (UPSTREAM_MAST_BASE_Y + UPSTREAM_MAST_TOP_Y) / 2,
      signZ * legOffset,
      -signZ * legLean,
      0,
      signX * legLean,
      UPSTREAM_LEG_GAUGE,
      UPSTREAM_MAST_HEIGHT / Math.cos(legLean),
      UPSTREAM_LEG_GAUGE,
    );
  }
  // Horizontal crossarms — antenna standoffs (14-15). Moved from 0.92/1.19 up
  // into the crown and narrowed from 0.86/0.62: near mid-height and nearly as
  // wide as the tower's own base they read as a second, competing structure,
  // and the profile a mast is recognised by puts its crossarms high and short.
  setInstance(pools.structures, 14, scratch, 0, 1.72, 0, 0, 0, Math.PI / 2, 0.05, 0.58, 0.05);
  setInstance(pools.structures, 15, scratch, 0, 1.97, 0, 0, 0, Math.PI / 2, 0.042, 0.38, 0.042);
  // Brass dish reach strut (16) and the feed horn at the reflector focus (17).
  setInstance(
    pools.structures,
    16,
    scratch,
    mountX * 0.5,
    UPSTREAM_DISH_MOUNT_Y,
    mountZ * 0.5,
    0,
    localBearing,
    0,
    0.072,
    0.072,
    UPSTREAM_DISH_MOUNT_REACH + 0.14,
  );
  // This slot used to be a counterweight tucked BEHIND the dish, where nothing
  // could see it. Spent instead on the one part that makes a bowl read as a
  // reflector rather than a disc: a feed horn standing off the concave face at
  // the focus, so the dish has something to be pointed at.
  const feedReach = 0.33;
  setInstance(
    pools.structures,
    17,
    scratch,
    dishX + beamX * feedReach,
    dishY + beamY * feedReach,
    dishZ + beamZ * feedReach,
    dishElevation,
    localBearing,
    0,
    0.062,
    0.062,
    0.19,
  );
  // Tip whip and the blinking beacon housing (18-19). The whip runs from the
  // top belt to just under the beacon, so the outline tapers legs -> crossarms
  // -> whip -> lamp and ends on a point.
  const whipBase = UPSTREAM_MAST_TOP_Y - 0.06;
  setInstance(
    pools.structures,
    18,
    scratch,
    0,
    (whipBase + UPSTREAM_TIP_SPIRE_TOP_Y) / 2,
    0,
    0,
    0,
    0,
    0.036,
    UPSTREAM_TIP_SPIRE_TOP_Y - whipBase,
    0.036,
  );
  const beaconMemberScale = 0.07 + state.beaconIntensity * 0.022;
  setInstance(
    pools.structures,
    UPSTREAM_TIP_BEACON_MEMBER_INDEX,
    scratch,
    0,
    UPSTREAM_TIP_BEACON_Y,
    0,
    0,
    0,
    0,
    beaconMemberScale,
    0.09,
    beaconMemberScale,
  );
  // Polar antenna farm keeps the harbor skyline when the dish is edge-on
  // (20-22). Both whips now stand on the SAME side of the tower. Split one to
  // each side they bracketed the mast symmetrically, and a lone vertical bar
  // out at +0.64 with nothing near it read in silhouette as a separate object
  // planted beside the station — a sword, not an antenna farm. Clustered, and
  // kept under the tower's shoulder, they read as a farm the mast owns.
  setInstance(pools.structures, 20, scratch, -0.5, 0.32, -0.3, 0, 0, 0, 0.046, 0.96, 0.046);
  setInstance(pools.structures, 21, scratch, -0.5, 0.72, -0.3, 0, 0, Math.PI / 2, 0.038, 0.26, 0.038);
  setInstance(pools.structures, 22, scratch, -0.38, 0.26, -0.44, 0, 0, 0, 0.04, 0.84, 0.04);
  // Mint waveguide beacons (23-24), at indicator scale. These were 0.2-cube
  // saturated green blocks sitting on brown poles with no relationship to
  // anything; at 0.05 on the pole heads they are lamps, which is what a
  // waveguide beacon is.
  setInstance(pools.structures, 23, scratch, -0.5, 0.82, -0.3, 0, localBearing, 0, 0.05, 0.05, 0.05);
  setInstance(pools.structures, 24, scratch, -0.38, 0.7, -0.44, 0, localBearing, 0, 0.044, 0.044, 0.044);
  // Guy-line stays (25-27): thin, taut, and terminating on the three footings.
  // (The shared lineSegments pool lives inside the topology station root and
  // hides with it, so the mast carries its own stay hints instead.)
  for (let stay = 0; stay < UPSTREAM_GUY_STAYS.length; stay += 1) {
    const guy = UPSTREAM_GUY_STAYS[stay];
    setInstance(
      pools.structures,
      25 + stay,
      scratch,
      guy.position[0],
      guy.position[1],
      guy.position[2],
      0,
      guy.yaw,
      guy.roll,
      UPSTREAM_GUY_GAUGE,
      guy.length,
      UPSTREAM_GUY_GAUGE,
    );
  }
  // The diagonal web (28+). This is the member that makes the outline a mast
  // rather than a ladder, and it is the only one of the mast's parts whose
  // whole job is the silhouette.
  for (let brace = 0; brace < UPSTREAM_BRACES.length; brace += 1) {
    const member = UPSTREAM_BRACES[brace];
    setInstance(
      pools.structures,
      UPSTREAM_BRACE_START + brace,
      scratch,
      member.position[0],
      member.position[1],
      member.position[2],
      0,
      member.yaw,
      member.roll,
      UPSTREAM_BRACE_GAUGE,
      member.length,
      UPSTREAM_BRACE_GAUGE,
    );
  }
  // Keystream telemetry (52+). Each lamp holds its own phase, duty and lit level
  // straight out of the LFSR stream, so the run reads as an aperiodic relay
  // pattern climbing the tower rather than as a chase light.
  for (let lamp = 0; lamp < UPSTREAM_TELEMETRY_COUNT; lamp += 1) {
    const mount = UPSTREAM_TELEMETRY_MOUNTS[lamp];
    const level = upstreamTelemetryLevel(lamp, state.telemetryTime);
    const gauge = 0.03 + level * 0.012;
    setInstance(
      pools.structures,
      UPSTREAM_TELEMETRY_START + lamp,
      scratch,
      mount[0],
      mount[1],
      mount[2],
      0,
      0,
      0,
      gauge,
      gauge,
      gauge,
    );
    colors.telemetryScratch
      .copy(colors.telemetryOff)
      .lerp(colors.telemetryOn, level);
    setInstanceColor(pools.structures, UPSTREAM_TELEMETRY_START + lamp, colors.telemetryScratch);
  }

  setInstance(
    pools.dish,
    0,
    scratch,
    dishX,
    dishY,
    dishZ,
    // The lathe bowl opens toward local +Z; flip it half a turn so the
    // concave face reads toward the dock approach instead of its back, and
    // pitch positive so the flipped bowl still aims slightly skyward.
    dishElevation,
    Math.PI + (UPSTREAM_DISH_FACE_ON ? localBearing * 0.2 : localBearing),
    0,
    // 0.94 -> 0.72 -> 0.64. Against a mast whose leg spread halved, the old
    // bowl was wider than the tower was deep and read as a moon parked behind
    // it; against a mast that is now twice as tall it can afford to be plain
    // hardware hanging off one face.
    UPSTREAM_DISH_SCALE,
    UPSTREAM_DISH_SCALE,
    UPSTREAM_DISH_SCALE,
  );

  // Receive ritual: while docked-receiving, the three rings become mint
  // signal packets sliding down the mast from the tip beacon to the base.
  // With a live locked signal en route, they stay concentric amplitude rings
  // leaving the dish along the beam.
  const packetBaseY = groundY + 0.28;
  for (let index = 0; index < UPSTREAM_RING_COUNT; index += 1) {
    const phase = state.pulsePhases[index];
    if (receiving) {
      const y = UPSTREAM_TIP_BEACON_Y + (packetBaseY - UPSTREAM_TIP_BEACON_Y) * phase;
      // Halved. At 0.46-0.96 the descending packet rings were wider than the
      // mast they descend, so they read as green discs parked in front of the
      // tower rather than as signal travelling down it.
      const scale = 0.23 + phase * 0.25;
      setInstance(
        pools.pulses,
        index,
        scratch,
        0,
        y,
        0,
        UPSTREAM_RADAR_RING_FACING,
        0,
        0,
        scale,
        scale,
        scale,
      );
    } else {
      const distance = 0.3 + phase * 2.45;
      const scale = state.pulsesActive ? 0.3 + phase * 1.25 : 0;
      setInstance(
        pools.pulses,
        index,
        scratch,
        dishX + beamX * distance,
        dishY + beamY * distance,
        dishZ + beamZ * distance,
        UPSTREAM_RADAR_RING_FACING - dishElevation,
        localBearing,
        0,
        scale,
        scale,
        scale,
      );
    }
  }
  // Tip beacon halo: blinks warm white-coral on the deterministic duty cycle,
  // and rings outward a little on each packet landing.
  //
  // 0.2+0.32 -> 0.09+0.15. Seen nearly edge-on this torus is a flat lens, and
  // at half a unit across on top of a 0.036 whip it was a saucer sitting on a
  // stick — the mast's outline ended in a mushroom cap. A beacon is a lamp:
  // it should be the brightest thing on the tower and one of the smallest.
  const beaconScale =
    0.09 + state.beaconIntensity * 0.15 + (receiving ? receiveNod * 0.07 : 0);
  setInstance(
    pools.pulses,
    UPSTREAM_TIP_BEACON_RING_INDEX,
    scratch,
    0,
    UPSTREAM_TIP_BEACON_Y,
    0,
    UPSTREAM_RADAR_RING_FACING,
    0,
    0,
    beaconScale,
    beaconScale,
    beaconScale,
  );
  // Two lerps, not one: the halo rides an unlit basic material and the housing
  // rides the lit standard material, so they need different brightness bands.
  // Feeding one colour to both is what made the beacon either blow out on the
  // halo or stay dead on the housing.
  colors.haloScratch
    .copy(colors.beaconHaloOff)
    .lerp(colors.beaconHaloHot, state.beaconIntensity);
  setInstanceColor(pools.pulses, UPSTREAM_TIP_BEACON_RING_INDEX, colors.haloScratch);
  colors.scratch
    .copy(colors.beaconLampOff)
    .lerp(colors.beaconLampOn, state.beaconIntensity);
  setInstanceColor(pools.structures, UPSTREAM_TIP_BEACON_MEMBER_INDEX, colors.scratch);
  commitInstanceColors(pools.pulses);
  commitInstanceColors(pools.structures);

  // The received source packet drops from the dish mouth down the mast line
  // to the base plinth — the station visibly takes delivery.
  const packetVisible = receiving ? 1 : 0;
  const drop = state.packetProgress;
  const packetSway = Math.sin(drop * TWO_PI) * 0.08;
  setInstance(
    pools.packet,
    0,
    scratch,
    dishX + (0 - dishX) * drop + packetSway,
    dishY + (packetBaseY - dishY) * drop,
    dishZ + (0 - dishZ) * drop,
    drop * Math.PI,
    drop * Math.PI * 0.5,
    0,
    packetVisible,
    packetVisible,
    packetVisible,
  );
  commitPool(pools.structures);
  commitPool(pools.dish);
  commitPool(pools.pulses);
  commitPool(pools.packet);
}

function topologyRackTier(index) {
  return Math.floor(index / TOPOLOGY_RACK_COLUMNS);
}

function topologyRackColumn(index) {
  return index % TOPOLOGY_RACK_COLUMNS;
}

/**
 * Core length comes straight from the evidence barcode, so a longer archived
 * source is a physically longer core in the rack. Nothing here reads the clock.
 */
function topologyCoreLength(state, index) {
  return 0.44 + Math.min(1.7, state.barcode.heights[index]) * 0.24;
}

/** Rack column position: the gated horizontal authority for the archive pool. */
function topologyPanelX(index) {
  return (topologyRackColumn(index) - (TOPOLOGY_RACK_COLUMNS - 1) / 2) *
    TOPOLOGY_COLUMN_STEP;
}

function topologyTierY(index) {
  return TOPOLOGY_TIER_BASE + topologyRackTier(index) * TOPOLOGY_TIER_STEP;
}

/**
 * barExtrusions is the drawer pull: a core the logger has indexed slides out of
 * its cradle toward the open bay, which is what LIFT_STRATA physically means in
 * a cold store.
 */
function topologyCoreZ(state, index) {
  return TOPOLOGY_RACK_Z - state.barExtrusions[index] * 3.2;
}

/** The core-logging rig travels the rack line; scanPhase is its carriage. */
function topologyRigX(state) {
  return -TOPOLOGY_RIG_TRAVEL + state.scanPhase * TOPOLOGY_RIG_TRAVEL * 2;
}

function topologyScanGlow(state, x) {
  const falloff = Math.max(0, 1 - Math.abs(x - topologyRigX(state)) / 0.46);
  return falloff * falloff * state.scanIntensity;
}

function topologyCrownY(state) {
  return TOPOLOGY_ROOF_Y + 0.16 + state.ignition * 0.02;
}

/**
 * One camp, one contractor. Three value zones with >= 0.2 luma between
 * neighbours: graphite steel structure ~0.15, desaturated grey-mauve insulated
 * cladding ~0.42, ice cores / drift / worklight ~0.78+. The archive magenta is
 * spent only on the rig head and the index labels its scan line crosses.
 */
let topologyColorAuthority = null;

function topologyColors() {
  if (topologyColorAuthority) return topologyColorAuthority;
  const archivePalette = SW_MECHANISM_PROFILES["topology-archive-wall"].palette;
  const white = new THREE.Color("#FFFFFF");
  // Body zones take the authored SW_BASE_LANGUAGE hex unscaled; the shared gain
  // places the whole ladder at once. See SW_LIGHT_RESPONSE_GAIN for why the old
  // per-zone multipliers (2.2 / 2.6 / 1.15 / 1.3 / 0.4) had to go: they inverted
  // the very ladder they were named after, rendering graphite steel brighter
  // than snow.
  const steel = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.structureSteel));
  const steelDeep = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.structureShadow));
  const seam = new THREE.Color(SW_BASE_LANGUAGE.seamShadow);
  // Identity lerps survive — hue diversity across the eight stations was won
  // honestly and repainting is not what was wrong here. They are eased 0.34/0.26
  // -> 0.28/0.22 only because the mauve target (#C9A3BF, luma 0.68) sits well
  // above the cladding it tints (0.42), so every point of lerp also spends value
  // the ladder now needs back.
  const cladding = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(new THREE.Color(archivePalette.layer), 0.28),
  );
  const claddingAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.claddingAlt)
      .lerp(new THREE.Color(archivePalette.layer), 0.22),
  );
  const roof = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(seam, 0.24)
      .lerp(new THREE.Color(archivePalette.layer), 0.14),
  );
  const iceCore = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware).lerp(white, 0.2),
  );
  const iceCoreAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(archivePalette.layer), 0.3),
  );
  const drift = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.snow));
  // Safety trim is a thin hazard line, never a body colour: keep it well under
  // the clipping band so it cannot become the brightest thing in the frame.
  // Identity/light multipliers below are rescaled by 4.2/3.0 so the gain change
  // moved the body ladder and left these exactly where they rendered before.
  const trim = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim).multiplyScalar(0.59);
  const worklight = new THREE.Color(SW_BASE_LANGUAGE.emberWindow).multiplyScalar(0.98);
  const provenance = new THREE.Color(archivePalette.trace);
  // Held below the clipping band on purpose: the logger head must stay hot
  // magenta under the frame multiplier instead of blowing out to white.
  const rigHead = new THREE.Color(archivePalette.surface)
    .lerp(provenance, 0.3)
    .multiplyScalar(0.36);

  const base = [];
  // Racked cores: alternate two ice values per tier so a rack of twenty tubes
  // still reads as individual objects rather than one pale mass.
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    base.push((topologyRackTier(index) + topologyRackColumn(index)) % 2 === 0
      ? iceCore
      : iceCoreAlt);
  }
  base.push(cladding); // deck plinth
  base.push(steel, steel); // skid runners
  base.push(steelDeep, steelDeep); // cross footings
  base.push(cladding, claddingAlt, cladding); // seamed back wall courses
  base.push(claddingAlt, claddingAlt); // end walls
  base.push(roof, roof); // roof panels
  base.push(steel); // open-bay lintel
  base.push(claddingAlt); // rolled door leaf
  base.push(steel, steel); // bay corner posts
  base.push(steelDeep, steelDeep, steelDeep); // rack uprights
  base.push(steel, steel, steel, steel); // four tier rails
  base.push(steel); // core-logging bench
  base.push(worklight); // bench task light
  base.push(claddingAlt, iceCoreAlt); // crate stack
  base.push(drift, drift); // drift wedges
  base.push(steelDeep, steelDeep); // cable run and conduit drop
  base.push(steel, steel, steel); // rig crossbeam and legs
  base.push(rigHead); // rig scanner head
  base.push(worklight, worklight); // warm clerestory windows over the bay
  base.push(trim); // one thin coral nosing along the deck edge

  // THE MERKLE COURSES. Byte 0 of each node's digest picks the block's value,
  // and value is ALL it picks: the two authored cladding hexes are scaled, never
  // re-hued and never re-saturated, so a wall with twelve more objects in it
  // cannot become a louder wall. This station carries the tightest colour-anchor
  // margin in the world and a hash is exactly the kind of input that would blow
  // it if it were allowed to reach hue.
  for (const node of MERKLE_ARCHIVE_WALL.nodes) {
    if (node.isRoot) {
      // The root is the address of the whole archive, so it is the one block
      // that takes the station's accent. 0.26 was the first try and it was a
      // VALUE mistake, the same one this repo keeps re-learning: the accent hex
      // is darker than the cladding it sits in, so a small multiplier did not
      // make a restrained accent, it made a hole in the wall. 0.86 puts the
      // capstone just ABOVE the cladding — read as a lit stone — while the
      // logging rig, which is the signature mechanism, still peaks 2.4x above it
      // when docked. Same 0.3 pull toward the cyan trace the rig head takes, so
      // one accent block cannot drag the station's aggregate saturation.
      base.push(new THREE.Color(archivePalette.surface).lerp(provenance, 0.3).multiplyScalar(0.86));
      continue;
    }
    // The band is 1.00-1.22 of the wall's own cladding, never below 1.0, so a
    // block cannot be darker than the flat wall it stands on.
    //
    // ATTRIBUTION, because this cost three passes: the gable's measured average
    // saturation rose 0.336 -> 0.398 across this change and it was NOT the
    // masonry. Ablating the twelve blocks on ONE build (same server, same
    // frame, courses scaled to nothing) put the gable at 0.3964 against 0.3979
    // with them, and the whole frame at 0.2957 against 0.2960 — the Merkle wall
    // costs +0.0003 of frame saturation and slightly IMPROVES the snow anchor
    // (0.3993 -> 0.4002 at low). The 0.06 belonged to a sibling agent's work
    // that landed in the same rebuild. Two albedo passes were spent chasing it
    // before the ablation was run, which is the cheap experiment that should
    // have come first: a before/after across a rebuild is not a controlled
    // comparison in a tree three agents are writing.
    const stone = node.tint < 0.5 ? cladding : claddingAlt;
    base.push(stone.clone().multiplyScalar(1 + node.tint * 0.22));
  }

  topologyColorAuthority = {
    base: base.map((color) => color.clone().multiplyScalar(SW_LIGHT_RESPONSE_GAIN)),
    hot: new THREE.Color(archivePalette.surface)
      .lerp(white, 0.2)
      .multiplyScalar(SW_LIGHT_RESPONSE_GAIN),
    scratch: new THREE.Color(),
  };
  return topologyColorAuthority;
}

function applyTopologyInstances(state, surfaces, scratch) {
  const groundY = localGroundY("topology-archive-wall");
  const colors = topologyColors();
  const rigX = topologyRigX(state);
  const countdownBreathe = state.countdown > 0
    ? Math.sin((state.phaseAge + state.countdown) * TWO_PI) * 0.012
    : 0;

  // Racked cores. Length is evidence, the pull-out is the ritual, and only the
  // core the logger is over takes the magenta index-label lift.
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    const x = topologyPanelX(index);
    const length = topologyCoreLength(state, index);
    setInstance(
      surfaces,
      index,
      scratch,
      x,
      topologyTierY(index),
      topologyCoreZ(state, index),
      0,
      0,
      0,
      0.15,
      0.15,
      length,
    );
    const glow = topologyScanGlow(state, x);
    colors.scratch
      .copy(colors.base[index])
      .lerp(colors.hot, Math.min(1, glow * 0.85))
      .multiplyScalar(1 + glow * 0.6);
    setInstanceColor(surfaces, index, colors.scratch);
  }

  const start = TOPOLOGY_FOUNDATION_START;
  // Raised plinth deck on two steel skid runners and two cross footings.
  setInstance(surfaces, start, scratch, 0, groundY + 0.2, 0.02, 0, 0, 0, 2.98, 0.2, 1.52);
  setInstance(surfaces, start + 1, scratch, 0, groundY + 0.05, -0.56, 0, 0, 0, 2.72, 0.1, 0.22);
  setInstance(surfaces, start + 2, scratch, 0, groundY + 0.05, 0.58, 0, 0, 0, 2.72, 0.1, 0.22);
  setInstance(surfaces, start + 3, scratch, -1.34, groundY + 0.08, 0.02, 0, 0, 0, 0.2, 0.16, 1.36);
  setInstance(surfaces, start + 4, scratch, 1.34, groundY + 0.08, 0.02, 0, 0, 0, 0.2, 0.16, 1.36);
  // Three courses of insulated panel with real seam gaps between them.
  setInstance(surfaces, start + 5, scratch, 0, 0.16, TOPOLOGY_WALL_Z, 0, 0, 0, 2.96, 0.3, 0.1);
  setInstance(surfaces, start + 6, scratch, 0, 0.48, TOPOLOGY_WALL_Z, 0, 0, 0, 2.96, 0.3, 0.1);
  setInstance(surfaces, start + 7, scratch, 0, 0.79, TOPOLOGY_WALL_Z, 0, 0, 0, 2.96, 0.28, 0.1);
  setInstance(surfaces, start + 8, scratch, -1.44, 0.46, 0.2, 0, 0, 0, 0.1, 0.92, 1.08);
  setInstance(surfaces, start + 9, scratch, 1.44, 0.46, 0.2, 0, 0, 0, 0.1, 0.92, 1.08);
  setInstance(surfaces, start + 10, scratch, 0, TOPOLOGY_ROOF_Y + 0.05, -0.24, -0.05, 0, 0, 3.06, 0.09, 0.98);
  setInstance(surfaces, start + 11, scratch, 0, TOPOLOGY_ROOF_Y + 0.08, 0.44, 0.05, 0, 0, 3.06, 0.09, 0.72);
  // Open bay: lintel, the roll-up door rolled under the eave, corner posts.
  setInstance(surfaces, start + 12, scratch, 0, 0.86, TOPOLOGY_BAY_Z, 0, 0, 0, 3.0, 0.16, 0.14);
  setInstance(
    surfaces,
    start + 13,
    scratch,
    0,
    0.68 + state.aperture * 0.5,
    TOPOLOGY_BAY_Z + 0.06,
    0,
    0,
    0,
    2.72,
    0.14,
    0.17,
  );
  setInstance(surfaces, start + 14, scratch, -1.44, 0.44, TOPOLOGY_BAY_Z, 0, 0, 0, 0.12, 0.88, 0.12);
  setInstance(surfaces, start + 15, scratch, 1.44, 0.44, TOPOLOGY_BAY_Z, 0, 0, 0, 0.12, 0.88, 0.12);
  // Graphite rack: three uprights carrying four tier rails.
  for (let post = 0; post < 3; post += 1) {
    setInstance(
      surfaces,
      start + 16 + post,
      scratch,
      (post - 1) * 1.05,
      0.42,
      0.46,
      0,
      0,
      0,
      0.09,
      0.84,
      0.09,
    );
  }
  for (let tier = 0; tier < TOPOLOGY_RACK_TIERS; tier += 1) {
    setInstance(
      surfaces,
      start + 19 + tier,
      scratch,
      0,
      TOPOLOGY_TIER_BASE + tier * TOPOLOGY_TIER_STEP - 0.09,
      0.46,
      0,
      0,
      0,
      2.5,
      0.045,
      0.12,
    );
  }
  // Core-logging bench under its task light, crate stack, drift, services.
  setInstance(surfaces, start + 23, scratch, -0.95, 0.09, -0.4, 0, 0, 0, 0.9, 0.18, 0.34);
  setInstance(surfaces, start + 24, scratch, -0.95, 0.44, -0.36, 0, 0, 0, 0.5, 0.05, 0.1);
  setInstance(surfaces, start + 25, scratch, 1.06, 0.11, -0.42, 0, 0.24, 0, 0.4, 0.22, 0.34);
  setInstance(surfaces, start + 26, scratch, 1.03, 0.3, -0.4, 0, -0.16, 0, 0.32, 0.16, 0.28);
  setInstance(surfaces, start + 27, scratch, 0, groundY + 0.06, 0.94, 0, 0, 0, 3.3, 0.12, 0.4);
  setInstance(surfaces, start + 28, scratch, -1.68, groundY + 0.05, 0.1, 0, 0, 0, 0.34, 0.1, 1.5);
  setInstance(surfaces, start + 29, scratch, 0, 0.88, 0.76, 0, 0, 0, 2.9, 0.05, 0.05);
  setInstance(surfaces, start + 30, scratch, 1.24, 0.44, 0.76, 0, 0, 0, 0.05, 0.84, 0.05);
  // The core-logging rig: a portal that physically travels the rack line.
  setInstance(
    surfaces,
    TOPOLOGY_RIG_BEAM_INDEX,
    scratch,
    rigX,
    0.84 + countdownBreathe,
    0.05,
    0,
    0,
    0,
    0.16,
    0.1,
    1.6,
  );
  setInstance(surfaces, TOPOLOGY_RIG_LEG_FRONT_INDEX, scratch, rigX, 0.41, -0.6, 0, 0, 0, 0.1, 0.82, 0.1);
  setInstance(surfaces, TOPOLOGY_RIG_LEG_BACK_INDEX, scratch, rigX, 0.41, 0.62, 0, 0, 0, 0.1, 0.82, 0.1);
  setInstance(surfaces, TOPOLOGY_RIG_HEAD_INDEX, scratch, rigX, 0.62, -0.32, 0, 0, 0, 0.26, 0.3, 0.3);
  // Warm clerestory windows over the bay: life inside the cold, seen face-on
  // from the dock. A thin coral nosing runs the open deck edge below them.
  setInstance(surfaces, TOPOLOGY_WINDOW_BACK_INDEX, scratch, -0.82, 0.86, TOPOLOGY_BAY_Z - 0.06, 0, 0, 0, 0.44, 0.09, 0.04);
  setInstance(surfaces, TOPOLOGY_WINDOW_END_INDEX, scratch, 0.82, 0.86, TOPOLOGY_BAY_Z - 0.06, 0, 0, 0, 0.44, 0.09, 0.04);
  setInstance(surfaces, TOPOLOGY_DECK_NOSING_INDEX, scratch, 0, 0.03, TOPOLOGY_BAY_Z + 0.02, 0, 0, 0, 2.9, 0.05, 0.06);
  // The Merkle courses, laid proud of the gable end. Fixed geometry: the tree
  // was hashed at module load and masonry does not animate.
  for (let node = 0; node < TOPOLOGY_MERKLE_COUNT; node += 1) {
    const block = TOPOLOGY_MERKLE_BLOCKS[node];
    setInstance(
      surfaces,
      TOPOLOGY_MERKLE_START + node,
      scratch,
      TOPOLOGY_MERKLE_FACE_X + block.depth * 0.5,
      block.y,
      block.z,
      0,
      0,
      0,
      block.depth,
      block.height,
      block.width,
    );
  }

  const rigHeat = state.scanIntensity * (0.55 + state.ignition * 0.45);
  for (let index = start; index < TOPOLOGY_SURFACE_COUNT; index += 1) {
    colors.scratch.copy(colors.base[index]);
    if (index === TOPOLOGY_RIG_HEAD_INDEX) {
      // The logger head is the signature mechanism, so it owns the top of the
      // value ladder — nothing on the body is allowed to out-shine it.
      colors.scratch.multiplyScalar(1.4 + rigHeat * 3.4);
    } else if (index === TOPOLOGY_BENCH_LIGHT_INDEX) {
      colors.scratch.multiplyScalar(1.4 + state.ignition * 0.7);
    } else if (
      index === TOPOLOGY_WINDOW_BACK_INDEX ||
      index === TOPOLOGY_WINDOW_END_INDEX
    ) {
      colors.scratch.multiplyScalar(1.35);
    }
    setInstanceColor(surfaces, index, colors.scratch);
  }
  commitPool(surfaces);
  commitInstanceColors(surfaces);
}

const TOPOLOGY_SCAN_LINE_COLOR = new THREE.Color();
const TOPOLOGY_SCAN_TIP_COLOR = new THREE.Color();

/** The bay-facing end cap of a racked core — where its index label is read. */
function topologyInnerFaceX(state, index) {
  void state;
  return topologyPanelX(index);
}

function topologyCoreCapZ(state, index) {
  return topologyCoreZ(state, index) - topologyCoreLength(state, index) * 0.5 - 0.02;
}

function applyTopologyTrace(state, geometry, firstColor, secondColor) {
  const groundY = localGroundY("topology-archive-wall");
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  let segment = 0;
  const writeSegment = (ax, ay, az, bx, by, bz, colorA, colorB) => {
    const offset = segment * 2;
    positions.setXYZ(offset, ax, ay, az);
    positions.setXYZ(offset + 1, bx, by, bz);
    colors.setXYZ(offset, colorA.r, colorA.g, colorA.b);
    colors.setXYZ(offset + 1, colorB.r, colorB.g, colorB.b);
    segment += 1;
  };

  // Persistent provenance trace: the connected index-label path hopping across
  // the racked core end caps, so a source's place in the archive stays legible
  // after the logger has moved on.
  const path = state.barcode.path;
  const availableSegments = Math.max(0, path.length - 1);
  const visibleSegments = Math.min(
    availableSegments,
    Math.ceil(availableSegments * state.traceProgress),
  );
  for (let step = 0; step < visibleSegments; step += 1) {
    const firstIndex = path[step];
    const secondIndex = path[step + 1];
    writeSegment(
      topologyInnerFaceX(state, firstIndex),
      topologyTierY(firstIndex),
      topologyCoreCapZ(state, firstIndex),
      topologyInnerFaceX(state, secondIndex),
      topologyTierY(secondIndex),
      topologyCoreCapZ(state, secondIndex),
      firstColor,
      secondColor,
    );
  }

  // The logger's scan: a magenta read line dropping from the rig head down the
  // rack face to the deck, plus a short cross beam at each tier it is passing.
  const rigX = topologyRigX(state);
  const deckY = groundY + 0.3;
  const headY = topologyCrownY(state) - 0.24;
  TOPOLOGY_SCAN_LINE_COLOR
    .copy(firstColor)
    .multiplyScalar(0.85 + 0.95 * state.scanIntensity);
  TOPOLOGY_SCAN_TIP_COLOR
    .copy(secondColor)
    .lerp(firstColor, 0.4)
    .multiplyScalar(0.7 + 0.6 * state.scanIntensity);
  for (const ghost of [-0.03, 0, 0.03]) {
    writeSegment(
      rigX + ghost,
      headY,
      TOPOLOGY_BAY_Z + 0.5,
      rigX + ghost,
      deckY,
      TOPOLOGY_BAY_Z + 0.5,
      TOPOLOGY_SCAN_TIP_COLOR,
      TOPOLOGY_SCAN_LINE_COLOR,
    );
  }
  for (let tier = 0; tier < TOPOLOGY_RACK_TIERS; tier += 1) {
    const tierY = TOPOLOGY_TIER_BASE + tier * TOPOLOGY_TIER_STEP;
    writeSegment(
      rigX,
      tierY,
      TOPOLOGY_BAY_Z + 0.5,
      rigX,
      tierY,
      TOPOLOGY_RACK_Z + 0.28,
      TOPOLOGY_SCAN_LINE_COLOR,
      TOPOLOGY_SCAN_TIP_COLOR,
    );
  }

  geometry.setDrawRange(0, segment * 2);
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

/**
 * Machine-shop colour authority. Body is graphite steel plus desaturated
 * insulated panel; the identity violet is spent only on accent seams and
 * indicator lights; light in the shop is warm amber worklight and the welding
 * arc. Same three-zone ladder as the cold store, same shared camp kit.
 */
let assemblyColorAuthority = null;

function assemblyColors() {
  if (assemblyColorAuthority) return assemblyColorAuthority;
  const toolingPalette = SW_MECHANISM_PROFILES["assembly-tool-locker"].palette;
  const white = new THREE.Color("#FFFFFF");
  const steel = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.structureSteel));
  const steelDeep = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.structureShadow));
  // The shop took SW_BASE_LANGUAGE.cladding raw — no identity lerp at all,
  // where the cold store at least lerped 0.14 toward its own hue. That shared
  // grey-mauve is why the docked capture reads as a white box in a purple-lit
  // basalt station: measured over the station region it came back sat 0.296 on
  // the widest value spread of all eight (0.738), i.e. its structure was fine
  // and its colour was absent. This station passes the greyscale gate, so the
  // cheap fix is the correct one — repaint only, no geometry or value work.
  //
  // The lerp target is toolingPalette.highlight (#A78BFA, luma 153), NOT the
  // identity violet toolingPalette.steel (#6D4BE8, luma 94).
  //
  // That distinction is the whole trick, and the cold store next door is what
  // proved it. Tinting toward a hue DARKER than the zone it tints buys chroma
  // out of the value ladder; tinting toward a BRIGHTER one raises both at once.
  // The cold store gained saturation and spread together because its target
  // (#C9A3BF, luma 173) sits above its base cladding (luma 108). A first draft
  // here aimed at #6D4BE8, which sits below 108, and so pushed all three body
  // zones down about 4% while adding colour. Same station, same intent, and the
  // only difference that matters is which side of the base value the target is.
  //
  // Both are authored identity colours for this station, so this is not a new
  // literal — it is the light end of its own violet rather than the dark end.
  // Graded 0.42 / 0.34 / 0.22 across the three body zones so the wall courses
  // still differ from each other and do not flatten into one violet wash.
  const cladding = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(new THREE.Color(toolingPalette.highlight), 0.2),
  );
  const claddingAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.claddingAlt)
      .lerp(new THREE.Color(toolingPalette.highlight), 0.15),
  );
  // Roof tint held to 0.10 while the walls take 0.42/0.34. The roof is this
  // station's p95 anchor — it is the brightest surface on the widest value
  // ladder of the eight — and tinting it at the same rate as the walls cost
  // 0.021 of p95 at medium and 0.030 of spread at low, measured against a
  // +-0.006 run-to-run floor. That is the value rule's exact failure case:
  // saturation bought out of the highlights. The walls are the large area and
  // carry the identity perfectly well on their own, so the roof keeps its job.
  const roof = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.seamShadow), 0.24)
      .lerp(new THREE.Color(toolingPalette.highlight), 0.1),
  );
  const trim = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim).multiplyScalar(0.59);
  const drift = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.snow));
  const hardware = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.hardware));
  const worklight = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(new THREE.Color(toolingPalette.highlight), 0.12)
    .multiplyScalar(0.98);
  // The identity violet lives only here: accent seams and indicator lights.
  const accentSeam = new THREE.Color(toolingPalette.steel).multiplyScalar(1.12);
  const brass = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(new THREE.Color(SW_BASE_LANGUAGE.hardware), 0.4)
    .multiplyScalar(0.87);
  const relicSteel = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.structureSteel), 0.3),
  );
  const stock = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware).lerp(white, 0.1),
  );

  const base = new Array(ASSEMBLY_STRUCTURE_COUNT).fill(steel);
  base[0] = cladding; // shop deck
  base[1] = claddingAlt; // tool wall main course
  for (let index = 0; index < 4; index += 1) base[index + 2] = stock; // stock parts
  for (let index = 0; index < 4; index += 1) base[index + 6] = steelDeep; // footings
  base[10] = steel;
  base[11] = accentSeam; // the one lit hoist-rail indicator strip
  for (let index = 0; index < ASSEMBLY_ARCH_SEGMENTS * 2; index += 1) {
    base[ASSEMBLY_TRUSS_START + index] = steelDeep; // roof trusses
  }
  const shop = ASSEMBLY_SHOP_START;
  base[shop] = cladding; // tool wall upper course
  base[shop + 1] = claddingAlt; // tool wall lower course
  base[shop + 2] = cladding; // side wall left
  base[shop + 3] = claddingAlt; // side wall right
  base[shop + 4] = roof;
  base[shop + 5] = roof;
  base[shop + 6] = steel; // roller-door lintel
  base[shop + 7] = claddingAlt; // rolled door leaf
  base[shop + 8] = steel; // bay corner post left
  base[shop + 9] = steel; // bay corner post right
  base[shop + 10] = hardware; // left workbench top
  base[shop + 11] = hardware; // welding bench top
  base[shop + 12] = steelDeep; // bench apron left
  base[shop + 13] = steelDeep; // bench apron right
  base[shop + 14] = brass; // vice
  base[shop + 15] = steel; // welding shield screen
  base[shop + 16] = trim; // gas bottle
  base[shop + 17] = steel; // compressor
  base[shop + 18] = steelDeep; // pipe run
  base[shop + 19] = steelDeep; // pipe drop
  base[shop + 20] = claddingAlt; // parts bin
  base[shop + 21] = accentSeam; // swarf bin indicator light
  base[shop + 22] = drift;
  base[shop + 23] = drift;
  base[shop + 24] = worklight; // overhead task light bar
  base[shop + 25] = trim; // one thin coral nosing along the open deck edge
  for (let index = 0; index < SW_ASSEMBLY_RELIC_CAPACITY; index += 1) {
    const slot = ASSEMBLY_RELIC_START + index * ASSEMBLY_RELIC_PARTS;
    base[slot] = relicSteel;
    base[slot + 1] = brass;
  }

  assemblyColorAuthority = {
    arc: worklight.clone().lerp(white, 0.55).multiplyScalar(SW_LIGHT_RESPONSE_GAIN),
    base: base.map((color) => color.clone().multiplyScalar(SW_LIGHT_RESPONSE_GAIN)),
    scratch: new THREE.Color(),
    worklight: worklight.clone().multiplyScalar(SW_LIGHT_RESPONSE_GAIN),
  };
  return assemblyColorAuthority;
}

/**
 * Deterministic welding arc. Two incommensurate fixed-step sines beat against
 * each other so the strike reads as a real intermittent arc rather than a
 * metronome, and the whole thing is a pure function of the fixed-step clock.
 */
function assemblyArcIntensity(state, cycleTime) {
  if (state.phase !== "ASSEMBLE" && state.phase !== "PROVE") return 0;
  const beat = Math.sin(cycleTime * 11.3) * Math.sin(cycleTime * 4.7 + 0.7);
  const strike = Math.max(0, beat);
  return strike * strike * (state.phase === "PROVE" ? 1 : 0.82);
}

function applyAssemblyInstances(state, pools, scratch) {
  const groundY = localGroundY("assembly-tool-locker");
  const colors = assemblyColors();
  const assemblyCycleTime =
    state.assemblyTime % SW_MECHANISM_PROFILES["assembly-tool-locker"].assemblyCycleSeconds;
  const cycleProgress =
    assemblyCycleTime / SW_MECHANISM_PROFILES["assembly-tool-locker"].assemblyCycleSeconds;
  const arc = assemblyArcIntensity(state, assemblyCycleTime);

  // Deck on skids, and the tool wall the merged upstream relics hang on.
  setInstance(pools.structures, 0, scratch, 0, groundY + 0.2, 0, 0, 0, 0, 2.44, 0.2, 1.94);
  setInstance(
    pools.structures,
    1,
    scratch,
    0,
    0.4,
    ASSEMBLY_TOOL_WALL_Z + 0.32,
    0,
    0,
    0,
    2.42,
    0.3,
    0.1,
  );
  for (let index = 0; index < 4; index += 1) {
    const progress = state.partProgress[index];
    const start = ASSEMBLY_STARTS[index];
    const target = ASSEMBLY_TARGETS[index];
    const positionX = start[0] + (target[0] - start[0]) * progress;
    const positionY = start[1] + (target[1] - start[1]) * progress +
      Math.sin(progress * Math.PI) * 0.24;
    const positionZ = start[2] + (target[2] - start[2]) * progress;
    const yaw = ASSEMBLY_START_YAWS[index] * (1 - progress);
    setInstance(
      pools.structures,
      index + 2,
      scratch,
      positionX,
      positionY,
      positionZ,
      0,
      yaw,
      0,
      0.16 + (index % 2) * 0.03,
      0.07,
      0.13,
    );
  }
  for (let index = 0; index < ASSEMBLY_FOOTINGS.length; index += 1) {
    const footing = ASSEMBLY_FOOTINGS[index];
    setInstance(
      pools.structures,
      index + 6,
      scratch,
      footing[0],
      groundY + 0.06,
      footing[1],
      0,
      0,
      0,
      0.26,
      0.12,
      0.26,
    );
  }
  // Overhead hoist rail under the trusses, plus its lit indicator strip.
  setInstance(pools.structures, 10, scratch, 0, 0.74, -0.1, 0, 0, 0, 2.2, 0.09, 0.1);
  setInstance(pools.structures, 11, scratch, 0, 0.67, -0.1, 0, 0, 0, 2.06, 0.02, 0.05);

  // Two panel-clad roof trusses spanning the shop; the hoist load sags them a
  // little as the bench fills up.
  const gantryCompression = (state.armProgress[0] + state.armProgress[1]) * 0.5;
  const gantrySpan = 1.16;
  const gantryRise = 0.42 - gantryCompression * 0.03;
  for (let rib = 0; rib < 2; rib += 1) {
    const ribZ = ASSEMBLY_WORKSHOP_GEOMETRY.ribPlanesLocalZ[rib];
    for (let segment = 0; segment < ASSEMBLY_ARCH_SEGMENTS; segment += 1) {
      const progress = segment / (ASSEMBLY_ARCH_SEGMENTS - 1);
      const theta = Math.PI * (1 - progress);
      const positionX = gantrySpan * Math.cos(theta);
      const positionY = ASSEMBLY_ROOF_Y - 0.34 + gantryRise * Math.sin(theta);
      const tangentX = -gantrySpan * Math.sin(theta);
      const tangentY = gantryRise * Math.cos(theta);
      const tangentAngle = Math.atan2(tangentY, tangentX);
      const instanceIndex = ASSEMBLY_TRUSS_START + rib * ASSEMBLY_ARCH_SEGMENTS + segment;
      setInstance(
        pools.structures,
        instanceIndex,
        scratch,
        positionX,
        positionY,
        ribZ,
        0,
        0,
        tangentAngle - Math.PI / 2,
        0.06,
        0.36,
        0.09,
      );
    }
  }

  const shop = ASSEMBLY_SHOP_START;
  setInstance(pools.structures, shop, scratch, 0, 0.73, ASSEMBLY_TOOL_WALL_Z + 0.32, 0, 0, 0, 2.42, 0.28, 0.1);
  setInstance(pools.structures, shop + 1, scratch, 0, 0.08, ASSEMBLY_TOOL_WALL_Z + 0.32, 0, 0, 0, 2.42, 0.28, 0.1);
  setInstance(pools.structures, shop + 2, scratch, -1.18, 0.42, 0.1, 0, 0, 0, 0.1, 0.84, 1.62);
  setInstance(pools.structures, shop + 3, scratch, 1.18, 0.42, 0.1, 0, 0, 0, 0.1, 0.84, 1.62);
  setInstance(pools.structures, shop + 4, scratch, 0, ASSEMBLY_ROOF_Y + 0.04, -0.34, -0.05, 0, 0, 2.52, 0.09, 1.1);
  setInstance(pools.structures, shop + 5, scratch, 0, ASSEMBLY_ROOF_Y + 0.07, 0.5, 0.05, 0, 0, 2.52, 0.09, 0.82);
  setInstance(pools.structures, shop + 6, scratch, 0, 0.82, ASSEMBLY_BAY_Z, 0, 0, 0, 2.5, 0.14, 0.14);
  setInstance(
    pools.structures,
    shop + 7,
    scratch,
    0,
    0.66 + state.locatorPinLifts[0] * 0.06,
    ASSEMBLY_BAY_Z + 0.06,
    0,
    0,
    0,
    2.24,
    0.12,
    0.16,
  );
  setInstance(pools.structures, shop + 8, scratch, -1.18, 0.42, ASSEMBLY_BAY_Z, 0, 0, 0, 0.12, 0.84, 0.12);
  setInstance(pools.structures, shop + 9, scratch, 1.18, 0.42, ASSEMBLY_BAY_Z, 0, 0, 0, 0.12, 0.84, 0.12);
  // Benches: a left fitting bench and the welding bench with its jig.
  setInstance(pools.structures, shop + 10, scratch, -0.76, ASSEMBLY_BENCH_Y + 0.04, 0.34, 0, 0, 0, 0.94, 0.06, 0.44);
  setInstance(pools.structures, shop + 11, scratch, ASSEMBLY_WELD_X, ASSEMBLY_BENCH_Y + 0.04, ASSEMBLY_WELD_Z, 0, 0, 0, 0.82, 0.06, 0.48);
  setInstance(pools.structures, shop + 12, scratch, -0.76, groundY + 0.32, 0.34, 0, 0, 0, 0.84, 0.24, 0.34);
  setInstance(pools.structures, shop + 13, scratch, ASSEMBLY_WELD_X, groundY + 0.32, ASSEMBLY_WELD_Z, 0, 0, 0, 0.72, 0.24, 0.38);
  setInstance(pools.structures, shop + 14, scratch, -1.02, 0.16, 0.34, 0, 0.3, 0, 0.16, 0.14, 0.16);
  setInstance(pools.structures, shop + 15, scratch, ASSEMBLY_WELD_X + 0.02, 0.26, ASSEMBLY_WELD_Z + 0.3, 0, 0, 0, 0.78, 0.3, 0.05);
  setInstance(pools.structures, shop + 16, scratch, 1.02, 0.24, 0.62, 0, 0, 0, 0.13, 0.42, 0.13);
  setInstance(pools.structures, shop + 17, scratch, -1.02, 0.14, -0.5, 0, 0, 0, 0.26, 0.26, 0.34);
  setInstance(pools.structures, shop + 18, scratch, 0, 0.78, ASSEMBLY_TOOL_WALL_Z + 0.24, 0, 0, 0, 2.2, 0.05, 0.05);
  setInstance(pools.structures, shop + 19, scratch, -1.02, 0.46, ASSEMBLY_TOOL_WALL_Z + 0.24, 0, 0, 0, 0.05, 0.62, 0.05);
  setInstance(pools.structures, shop + 20, scratch, 0.9, 0.12, -0.5, 0, -0.2, 0, 0.3, 0.2, 0.26);
  setInstance(pools.structures, shop + 21, scratch, 0.9, 0.24, -0.5, 0, -0.2, 0, 0.16, 0.03, 0.14);
  setInstance(pools.structures, shop + 22, scratch, 0, groundY + 0.06, 1.02, 0, 0, 0, 2.7, 0.12, 0.36);
  setInstance(pools.structures, shop + 23, scratch, -1.42, groundY + 0.05, 0.1, 0, 0, 0, 0.32, 0.1, 1.6);
  setInstance(pools.structures, shop + 24, scratch, 0, 0.8, 0.2, 0, 0, 0, 1.9, 0.04, 0.08);
  setInstance(pools.structures, shop + 25, scratch, 0, groundY + 0.31, ASSEMBLY_BAY_Z + 0.04, 0, 0, 0, 2.4, 0.05, 0.06);

  // The tool wall: one relic per real merged upstream contribution. The dock
  // ritual walks the worklight across them, one contribution at a time.
  const relics = state.relics;
  const spotIndex = Math.min(
    SW_ASSEMBLY_RELIC_CAPACITY - 1,
    Math.floor(cycleProgress * SW_ASSEMBLY_RELIC_CAPACITY),
  );
  for (let slot = 0; slot < SW_ASSEMBLY_RELIC_CAPACITY; slot += 1) {
    const relic = relics[slot];
    const instance = ASSEMBLY_RELIC_START + slot * ASSEMBLY_RELIC_PARTS;
    if (!relic) {
      setInstance(pools.structures, instance, scratch, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      setInstance(pools.structures, instance + 1, scratch, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      continue;
    }
    const shape = ASSEMBLY_RELIC_SHAPES[relic.form] || ASSEMBLY_RELIC_FALLBACK_SHAPE;
    const wallX = ASSEMBLY_RELIC_WALL_X[slot];
    // Above the welding screen so every contribution stays unobstructed.
    const wallY = 0.5;
    // Hung just proud of the tool wall face, not floating in the bay.
    const wallZ = ASSEMBLY_TOOL_WALL_Z + 0.24;
    setInstance(
      pools.structures,
      instance,
      scratch,
      wallX,
      wallY,
      wallZ,
      0,
      0,
      shape.bodyRoll,
      shape.body[0],
      shape.body[1],
      shape.body[2],
    );
    setInstance(
      pools.structures,
      instance + 1,
      scratch,
      wallX + shape.headOffset[0],
      wallY + shape.headOffset[1],
      wallZ + shape.headOffset[2],
      0,
      0,
      shape.headRoll,
      shape.head[0],
      shape.head[1],
      shape.head[2],
    );
  }

  for (let index = 0; index < ASSEMBLY_STRUCTURE_COUNT; index += 1) {
    colors.scratch.copy(colors.base[index]);
    if (index === shop + 24) {
      colors.scratch.multiplyScalar(1.6);
    } else if (index === 11 || index === shop + 21) {
      colors.scratch.multiplyScalar(1.7);
    } else if (index === shop + 15) {
      // The welding screen catches the arc flash rather than emitting it.
      colors.scratch.multiplyScalar(1 + arc * 1.6);
    } else if (index >= ASSEMBLY_RELIC_START) {
      const slot = Math.floor((index - ASSEMBLY_RELIC_START) / ASSEMBLY_RELIC_PARTS);
      colors.scratch.multiplyScalar(slot === spotIndex ? 2.4 : 1.05);
    }
    setInstanceColor(pools.structures, index, colors.scratch);
  }
  commitInstanceColors(pools.structures);

  // Four hooded worklights over the tool wall; the ritual walks the bright one
  // across the relics while the rest hold a dim standby.
  for (let index = 0; index < state.locatorPinLifts.length; index += 1) {
    const lift = state.locatorPinLifts[index];
    const spot = index === spotIndex ? 1 : 0.34;
    const width = (0.15 + spot * 0.09) * lift;
    setInstance(
      pools.pins,
      index,
      scratch,
      ASSEMBLY_RELIC_WALL_X[index],
      0.78,
      ASSEMBLY_TOOL_WALL_Z + 0.14,
      Math.PI,
      0,
      0,
      width,
      0.16 + spot * 0.06,
      width,
    );
    colors.scratch.copy(colors.worklight).multiplyScalar(0.12 + spot * 0.34);
    setInstanceColor(pools.pins, index, colors.scratch);
  }
  commitInstanceColors(pools.pins);

  // The welding arc is the shop's signature mechanism: a hot torus striking at
  // the jig, deterministic and short-lived.
  const arcScale = 0.2 + arc * 0.72;
  setInstance(
    pools.proof,
    0,
    scratch,
    ASSEMBLY_WELD_X,
    ASSEMBLY_BENCH_Y + 0.2,
    ASSEMBLY_WELD_Z,
    Math.PI / 2,
    assemblyCycleTime * 0.82,
    0,
    arcScale,
    arcScale,
    arcScale,
  );
  colors.scratch.copy(colors.arc).multiplyScalar(0.35 + arc * 2.8);
  setInstanceColor(pools.proof, 0, colors.scratch);
  commitInstanceColors(pools.proof);

  commitPool(pools.structures);
  commitPool(pools.pins);
  commitPool(pools.proof);
}

export default function PolarStationMechanismsSW({
  assemblyInspectionRef = null,
  exclusiveStationId = null,
  familyVisibilityRef = null,
  mechanismStateRef = null,
  onEvidenceReady = null,
  quality = "medium",
  reducedMotion = false,
  ritualStateRef = null,
  safeMode = false,
  topologyCategoryRef = null,
  topologyEvidenceRef = null,
  traversalPoseRef = null,
  upstreamMetadataRef = null,
  visible = true,
}) {
  const systemRef = useRef(createSouthwestMechanismSystem());
  const inputsRef = useRef({});
  const sourceContextRef = useRef({
    assemblyInspection: null,
    topologyCategory: "all",
    topologySources: null,
    upstreamMetadata: null,
  });
  const ritualOutputRef = useRef({
    evidenceReady: false,
    phase: null,
    ritual: null,
    stationId: null,
  });
  const evidenceLatchRef = useRef({
    "assembly-tool-locker": false,
    "topology-archive-wall": false,
    "upstream-radio-mast": false,
  });
  const optionsRef = useRef({ reducedMotion, safeMode });
  const stationRootRefs = useRef({});
  const poolsRef = useRef({
    assembly: { pins: null, proof: null, structures: null },
    topology: { surfaces: null, trace: null },
    upstream: { dish: null, packet: null, pulses: null, structures: null },
  });
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const traceStartColor = useMemo(
    () => new THREE.Color(SW_MECHANISM_PROFILES["topology-archive-wall"].accent),
    [],
  );
  const traceEndColor = useMemo(
    () => new THREE.Color(SW_MECHANISM_PROFILES["topology-archive-wall"].palette.trace),
    [],
  );
  const resources = useMemo(() => createRenderResources(quality), [quality]);
  const detailed = quality !== "low";
  const budget = safeMode
    ? SW_MECHANISM_BUDGET.safe
    : SW_MECHANISM_BUDGET[quality] || SW_MECHANISM_BUDGET.medium;

  const upstreamStructures = useRef(null);
  const upstreamDish = useRef(null);
  const upstreamPulses = useRef(null);
  const upstreamPacket = useRef(null);
  const topologySurfaces = useRef(null);
  const topologyTrace = useRef(null);
  const assemblyStructures = useRef(null);
  const assemblyPins = useRef(null);
  const assemblyProof = useRef(null);

  useLayoutEffect(() => {
    preparePool(upstreamStructures.current, UPSTREAM_STRUCTURE_COUNT);
    preparePool(upstreamDish.current, 1);
    preparePool(upstreamPulses.current, UPSTREAM_PULSE_POOL_COUNT);
    preparePool(upstreamPacket.current, 1);
    preparePool(topologySurfaces.current, TOPOLOGY_SURFACE_COUNT);
    preparePool(assemblyStructures.current, ASSEMBLY_STRUCTURE_COUNT);
    preparePool(assemblyPins.current, 4);
    preparePool(assemblyProof.current, 1);
    applySouthwestIdentityColors({
      assemblyStructures: assemblyStructures.current,
      topologySurfaces: topologySurfaces.current,
      upstreamDish: upstreamDish.current,
      upstreamPacket: upstreamPacket.current,
      upstreamPulses: upstreamPulses.current,
      upstreamStructures: upstreamStructures.current,
    });
  }, [resources]);

  useEffect(() => () => disposeRenderResources(resources), [resources]);

  useFrame((_, delta) => {
    if (!visible) return;
    const pose = traversalPoseRef?.current;
    const reveal = resolveSouthwestStationReveal(pose, exclusiveStationId);
    const promiseId = reveal.promiseId;
    const familyAlpha = familyVisibilityRef?.current?.alpha ?? 1;
    for (const id of SW_MECHANISM_IDS) {
      const isDockedHero = exclusiveStationId === id || pose?.dockedId === id;
      const dockedHeroScale = isDockedHero
        ? SW_MECHANISM_SCALE_CONTRACTS[id].dockedHeroScale
        : 1;
      applyStationRootReveal(
        stationRootRefs.current[id],
        id,
        reveal.alphas[id],
        familyAlpha,
        promiseId === id,
        dockedHeroScale,
        delta,
        reducedMotion,
      );
    }
    const topologyPayload = topologyEvidenceRef?.current;
    const sourceContext = sourceContextRef.current;
    sourceContext.assemblyInspection = assemblyInspectionRef?.current || null;
    sourceContext.topologyCategory =
      topologyCategoryRef?.current || topologyPayload?.category || "all";
    sourceContext.topologySources = Array.isArray(topologyPayload)
      ? topologyPayload
      : topologyPayload?.sources || null;
    sourceContext.upstreamMetadata = upstreamMetadataRef?.current || null;
    resolveSouthwestMechanismInputs(pose, inputsRef.current, sourceContext);
    optionsRef.current.reducedMotion = reducedMotion;
    optionsRef.current.safeMode = safeMode;
    const system = advanceSouthwestMechanisms(
      systemRef.current,
      inputsRef.current,
      delta,
      optionsRef.current,
    );
    if (mechanismStateRef) mechanismStateRef.current = system;

    const selectedId = SW_MECHANISM_IDS.includes(exclusiveStationId)
      ? exclusiveStationId
      : SW_MECHANISM_IDS.includes(pose?.dockedId)
        ? pose.dockedId
        : SW_MECHANISM_IDS.includes(pose?.proximityStationId)
          ? pose.proximityStationId
          : null;
    const selectedState = selectedId ? system.states[selectedId] : null;
    const ritualOutput = ritualOutputRef.current;
    ritualOutput.stationId = selectedId;
    ritualOutput.phase = selectedState?.phase || null;
    ritualOutput.evidenceReady = Boolean(selectedState?.evidenceReady);
    ritualOutput.ritual = selectedState?.ritual || null;
    if (ritualStateRef) ritualStateRef.current = ritualOutput;

    for (const id of SW_MECHANISM_IDS) {
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
    pools.upstream.structures = upstreamStructures.current;
    pools.upstream.dish = upstreamDish.current;
    pools.upstream.pulses = upstreamPulses.current;
    pools.upstream.packet = upstreamPacket.current;
    pools.topology.surfaces = topologySurfaces.current;
    pools.topology.trace = topologyTrace.current;
    pools.assembly.structures = assemblyStructures.current;
    pools.assembly.pins = assemblyPins.current;
    pools.assembly.proof = assemblyProof.current;
    applyUpstreamInstances(system.states["upstream-radio-mast"], pools.upstream, scratch);
    applyTopologyInstances(
      system.states["topology-archive-wall"],
      pools.topology.surfaces,
      scratch,
    );
    if (pools.topology.trace) {
      applyTopologyTrace(
        system.states["topology-archive-wall"],
        resources.topologyTrace,
        traceStartColor,
        traceEndColor,
      );
    }
    applyAssemblyInstances(system.states["assembly-tool-locker"], pools.assembly, scratch);
  });

  if (safeMode || !visible) return null;

  const upstreamTransform = STATION_TRANSFORMS["upstream-radio-mast"];
  const topologyTransform = STATION_TRANSFORMS["topology-archive-wall"];
  const assemblyTransform = STATION_TRANSFORMS["assembly-tool-locker"];

  return (
    <group
      dispose={null}
      name={SOUTHWEST_MECHANISM_RENDER_PROFILE}
      userData={{
        drawCalls: budget.drawCalls,
        programs: budget.programs,
        textures: budget.textures,
      }}
    >
      <group
        position={upstreamTransform.position}
        ref={(node) => {
          stationRootRefs.current["upstream-radio-mast"] = node;
        }}
        rotation={upstreamTransform.rotation}
      >
        <instancedMesh
          args={[
            resources.harborMember,
            resources.materials.upstreamSurface,
            UPSTREAM_STRUCTURE_COUNT,
          ]}
          castShadow={quality === "high"}
          geometry={resources.harborMember}
          material={resources.materials.upstreamSurface}
          name="upstream-coral-signal-harbor-footing-and-bearing-cradle upstream-aviation-banded-lattice-mast upstream-tip-beacon upstream-guy-line-stays upstream-radio-harbor-antenna-farm upstream-mint-waveguide-beacons upstream-face-on-coral-mint-radar"
          receiveShadow={quality !== "low"}
          ref={upstreamStructures}
        />
        <instancedMesh
          args={[resources.dish, resources.materials.upstreamDish, 1]}
          castShadow={quality === "high"}
          geometry={resources.dish}
          material={resources.materials.upstreamDish}
          name="upstream-bearing-dish upstream-warm-white-dish-hardware"
          receiveShadow={quality !== "low"}
          ref={upstreamDish}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[
                resources.torus,
                resources.materials.upstreamSignal,
                UPSTREAM_PULSE_POOL_COUNT,
              ]}
              frustumCulled={false}
              geometry={resources.torus}
              material={resources.materials.upstreamSignal}
              name="upstream-verified-signal-rings upstream-concentric-amplitude-wave-rings upstream-descending-mast-packets upstream-blinking-tip-beacon-halo"
              ref={upstreamPulses}
            />
            <instancedMesh
              args={[resources.packet, resources.materials.upstreamSignal, 1]}
              frustumCulled={false}
              geometry={resources.packet}
              material={resources.materials.upstreamSignal}
              name="upstream-received-source-packet upstream-directional-source-packet"
              ref={upstreamPacket}
            />
          </>
        ) : null}
      </group>

      <group
        position={topologyTransform.position}
        ref={(node) => {
          stationRootRefs.current["topology-archive-wall"] = node;
        }}
        rotation={topologyTransform.rotation}
      >
        <instancedMesh
          args={[
            resources.archiveSlab,
            resources.materials.topologySurface,
            TOPOLOGY_SURFACE_COUNT,
          ]}
          castShadow={quality === "high"}
          geometry={resources.archiveSlab}
          material={resources.materials.topologySurface}
          // The trailing legacy identity token is pinned by the shared
          // cross-family layer gate; the facility names in front of it are the
          // live description of what this pool actually builds.
          name="archive-ice-core-cold-store-panels-and-skid-deck archive-racked-core-tubes archive-rack-index-labels archive-magenta-logger-scan archive-travelling-core-logging-rig archive-open-bay-roll-up-door archive-bench-worklight-crates-and-drift topology-thick-relational-archive-canyon-walls-and-plinths"
          receiveShadow={quality !== "low"}
          ref={topologySurfaces}
        />
        {detailed ? (
          <lineSegments
            frustumCulled={false}
            geometry={resources.topologyTrace}
            material={resources.materials.topologyTrace}
            name="topology-connected-trace"
            ref={topologyTrace}
          />
        ) : null}
      </group>

      <group
        position={assemblyTransform.position}
        ref={(node) => {
          stationRootRefs.current["assembly-tool-locker"] = node;
        }}
        rotation={assemblyTransform.rotation}
      >
        <instancedMesh
          args={[
            resources.assemblyBlock,
            resources.materials.assemblySurface,
            ASSEMBLY_STRUCTURE_COUNT,
          ]}
          castShadow={quality === "high"}
          geometry={resources.assemblyBlock}
          material={resources.materials.assemblySurface}
          // Same rule here: the trailing token is the shared layer gate's pin.
          name="assembly-machine-shop-open-bay assembly-tool-wall-of-merged-upstream-relics assembly-welding-bay-and-jig assembly-panel-clad-roof-trusses assembly-overhead-hoist-rail assembly-workbenches-vice-and-compressor assembly-graphite-panel-cladding-and-drift assembly-heavy-curved-gantry-inspection-backplane-and-proof-tool-mass"
          receiveShadow={quality !== "low"}
          ref={assemblyStructures}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.locatorPin, resources.materials.assemblyProof, 4]}
              geometry={resources.locatorPin}
              material={resources.materials.assemblyProof}
              name="assembly-relic-worklights"
              ref={assemblyPins}
            />
            <instancedMesh
              args={[resources.torus, resources.materials.assemblyProof, 1]}
              frustumCulled={false}
              geometry={resources.torus}
              material={resources.materials.assemblyProof}
              name="assembly-welding-arc"
              ref={assemblyProof}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}
