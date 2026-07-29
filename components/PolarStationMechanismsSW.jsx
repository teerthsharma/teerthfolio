import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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
 * Measured against the NEUTRALISED rig (see RIG_NEUTRALITY in
 * PolarBiomeWorld): that change lifted cladding response ~1.5-1.75x, so this
 * came 6 -> 3.5. At 6 the cladding overshot to luma ~183 and read salmon.
 * Re-measure with a docked screenshot if the world lighting rig changes again.
 */
const SW_LIGHT_RESPONSE_GAIN = 3.5;
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
const TOPOLOGY_FOUNDATION_COUNT = 38;
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
const UPSTREAM_STRUCTURE_COUNT = 28;
const UPSTREAM_RING_COUNT = SW_MECHANISM_PROFILES["upstream-radio-mast"].ringCount;
// The pulse pool carries the three signal rings plus one dedicated tip-beacon
// halo so the blinking aviation beacon costs zero extra draw calls.
const UPSTREAM_PULSE_POOL_COUNT = UPSTREAM_RING_COUNT + 1;
const UPSTREAM_TIP_BEACON_RING_INDEX = UPSTREAM_RING_COUNT;
const UPSTREAM_TIP_BEACON_MEMBER_INDEX = 19;
const UPSTREAM_DISH_ELEVATION = 0.3;
const UPSTREAM_DISH_FACE_ON = true;
// Compact broadcast profile: at the 1.9 docked hero scale the blinking tip
// beacon must stay inside the docked camera crop, so the whole crown lives
// below local y 1.9.
const UPSTREAM_DISH_MOUNT_Y = 1.3;
const UPSTREAM_DISH_MOUNT_REACH = 0.5;
const UPSTREAM_TIP_BEACON_Y = 1.84;
const UPSTREAM_MAST_BAND_COUNT = 6;
const UPSTREAM_MAST_BAND_HEIGHT = 0.27;
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
function bakeFaceShadingAttribute(geometry) {
  const normals = geometry.getAttribute("normal");
  const shades = new Float32Array(normals.count * 3);
  for (let index = 0; index < normals.count; index += 1) {
    const normalY = normals.getY(index);
    const normalZ = normals.getZ(index);
    const shade =
      0.96 + Math.abs(normalZ) * 0.22 + Math.max(0, normalY) * 0.3;
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
    // Warm white hardware read for the lathe dish, distinct from the banded
    // mast steel: low warm-ivory emissive floor keeps it legible at dusk.
    upstreamDish: makeSurface({
      color: "#FFFFFF",
      emissive: upstreamPalette.trim,
      emissiveIntensity: 0.52,
      metalness: 0.08,
      opacity: 1,
      roughness: 0.5,
    }),
    // Banded broadcast steel: hue lives in the per-instance aviation band
    // colors, so the shared emissive is only a dim warm-ivory dusk floor —
    // never the old full-strength coral wash that turned the tower monochrome.
    // Low metalness on purpose: with no environment map, metallic response
    // swallows diffuse and re-creates the monochrome silhouette.
    upstreamSurface: makeSurface({
      color: "#FFFFFF",
      emissive: upstreamPalette.trim,
      emissiveIntensity: 0.36,
      metalness: 0.14,
      opacity: 1,
      roughness: 0.36,
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

function applyStationRootReveal(root, stationId, alpha, familyAlpha, isPromise, dockedHeroScale = 1) {
  if (!root) return;
  root.visible = alpha > 0.005 && familyAlpha > 0.005;
  if (!root.visible) return;
  const revealScale = isPromise ? 0.88 : dockedHeroScale;
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
  const white = new THREE.Color("#FFFFFF");
  const coral = new THREE.Color(profile.accent).multiplyScalar(1.08);
  const ivory = new THREE.Color(palette.trim).lerp(white, 0.62).multiplyScalar(1.12);
  const graphite = new THREE.Color(palette.bearing)
    .lerp(new THREE.Color(palette.trim), 0.24);
  const brass = new THREE.Color(palette.trim).multiplyScalar(0.88);
  const mint = new THREE.Color(palette.packet).multiplyScalar(1.15);
  upstreamColorAuthority = {
    beaconHot: ivory.clone().multiplyScalar(1.5),
    beaconOff: coral.clone().multiplyScalar(0.42),
    brass,
    coral,
    dishFace: white.clone().lerp(new THREE.Color(palette.trim), 0.22),
    graphite,
    ivory,
    mint,
    scratch: new THREE.Color(),
    wire: graphite.clone().lerp(ivory, 0.45),
  };
  return upstreamColorAuthority;
}

/** Static band assignment for the 28 mast members; the tip beacon housing
 * (index 19) is re-lit every frame from state.beaconIntensity. */
function upstreamMemberColor(colors, index) {
  if (index <= 3) return colors.graphite; // plinth + three footings
  if (index <= 3 + UPSTREAM_MAST_BAND_COUNT) {
    return (index - 4) % 2 === 0 ? colors.coral : colors.ivory; // aviation bands
  }
  if (index <= 13) return colors.graphite; // lattice diagonals
  if (index <= 15) return colors.graphite; // crossarms
  if (index <= 17) return colors.brass; // dish pivot strut + counterweight
  if (index === 18) return colors.ivory; // tip spire
  if (index === UPSTREAM_TIP_BEACON_MEMBER_INDEX) return colors.beaconHot;
  if (index <= 22) return colors.graphite; // antenna farm masts + crossbar
  if (index <= 24) return colors.mint; // mint waveguide beacons
  return colors.wire; // guy-line stays
}

function applySouthwestIdentityColors(pools) {
  const upstreamPalette = SW_MECHANISM_PROFILES["upstream-radio-mast"].palette;
  const signalColors = upstreamColors();
  // The middle coral band weathers toward the lighter signature coral so the
  // paint stack reads as real layered enamel rather than one flat decal.
  const wornCoralBand = new THREE.Color(upstreamPalette.surface)
    .lerp(signalColors.ivory, 0.18);
  for (let index = 0; index < UPSTREAM_STRUCTURE_COUNT; index += 1) {
    setInstanceColor(
      pools.upstreamStructures,
      index,
      index === 6 ? wornCoralBand : upstreamMemberColor(signalColors, index),
    );
  }
  setInstanceColor(pools.upstreamDish, 0, signalColors.dishFace);
  for (let ring = 0; ring < UPSTREAM_RING_COUNT; ring += 1) {
    setInstanceColor(pools.upstreamPulses, ring, signalColors.mint);
  }
  setInstanceColor(pools.upstreamPulses, UPSTREAM_TIP_BEACON_RING_INDEX, signalColors.beaconHot);
  setInstanceColor(pools.upstreamPacket, 0, signalColors.mint);

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

  // Graphite base frame: harbor plinth plus three snow footings.
  setInstance(pools.structures, 0, scratch, 0, groundY + 0.09, 0, 0, 0, 0, 1.72, 0.18, 1.46);
  setInstance(pools.structures, 1, scratch, -0.72, groundY + 0.12, 0.5, 0, 0, 0, 0.5, 0.24, 0.5);
  setInstance(pools.structures, 2, scratch, 0.72, groundY + 0.12, 0.5, 0, 0, 0, 0.5, 0.24, 0.5);
  setInstance(pools.structures, 3, scratch, 0, groundY + 0.12, -0.7, 0, 0, 0, 0.54, 0.24, 0.54);
  // Tapering mast with alternating coral/ivory aviation paint bands (4-9).
  for (let band = 0; band < UPSTREAM_MAST_BAND_COUNT; band += 1) {
    const width = 0.5 - band * 0.052;
    setInstance(
      pools.structures,
      4 + band,
      scratch,
      0,
      groundY + 0.18 + UPSTREAM_MAST_BAND_HEIGHT * (band + 0.5),
      0,
      0,
      0,
      0,
      width,
      UPSTREAM_MAST_BAND_HEIGHT,
      width,
    );
  }
  // Graphite lattice diagonals bracing the lower and mid mast (10-13).
  setInstance(pools.structures, 10, scratch, -0.27, 0.22, 0, 0, 0, -0.56, 0.05, 0.62, 0.05);
  setInstance(pools.structures, 11, scratch, 0.27, 0.22, 0, 0, 0, 0.56, 0.05, 0.62, 0.05);
  setInstance(pools.structures, 12, scratch, -0.18, 0.86, 0, 0, 0, 0.52, 0.045, 0.56, 0.045);
  setInstance(pools.structures, 13, scratch, 0.18, 0.86, 0, 0, 0, -0.52, 0.045, 0.56, 0.045);
  // Horizontal crossarms — antenna standoffs (14-15).
  setInstance(pools.structures, 14, scratch, 0, 0.98, 0, 0, 0, Math.PI / 2, 0.1, 0.92, 0.1);
  setInstance(pools.structures, 15, scratch, 0, 1.24, 0, 0, 0, Math.PI / 2, 0.08, 0.72, 0.08);
  // Brass dish pivot: reach strut toward the bearing plus a counterweight (16-17).
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
    0.11,
    0.11,
    UPSTREAM_DISH_MOUNT_REACH + 0.14,
  );
  setInstance(
    pools.structures,
    17,
    scratch,
    -mountX * 0.34,
    UPSTREAM_DISH_MOUNT_Y,
    -mountZ * 0.34,
    0,
    localBearing,
    0,
    0.16,
    0.22,
    0.16,
  );
  // Ivory tip spire and the blinking beacon housing (18-19).
  setInstance(pools.structures, 18, scratch, 0, 1.6, 0, 0, 0, 0, 0.07, 0.42, 0.07);
  const beaconMemberScale = 0.1 + state.beaconIntensity * 0.03;
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
    0.12,
    beaconMemberScale,
  );
  // Polar antenna farm keeps the harbor skyline when the dish is edge-on (20-24).
  setInstance(pools.structures, 20, scratch, -1.04, 0.7, -0.42, 0, 0, 0, 0.1, 1.4, 0.1);
  setInstance(pools.structures, 21, scratch, -1.04, 1.36, -0.42, 0, 0, Math.PI / 2, 0.1, 0.5, 0.1);
  setInstance(pools.structures, 22, scratch, 1.02, 0.56, -0.24, 0, 0, 0, 0.1, 1.12, 0.1);
  setInstance(pools.structures, 23, scratch, -1.04, 1.5, -0.42, 0, localBearing, 0, 0.2, 0.2, 0.2);
  setInstance(pools.structures, 24, scratch, 1.02, 1.16, -0.24, 0, localBearing, 0, 0.2, 0.2, 0.2);
  // Guy-line stays: three slender members from the upper mast to the footings.
  // (The shared lineSegments pool lives inside the topology station root and
  // hides with it, so the mast carries its own stay hints instead.)
  setInstance(pools.structures, 25, scratch, 0, 0.62, -0.35, -0.41, 0, 0, 0.028, 1.85, 0.028);
  setInstance(pools.structures, 26, scratch, -0.36, 0.62, 0.25, 0.29, 0, 0.42, 0.028, 1.85, 0.028);
  setInstance(pools.structures, 27, scratch, 0.36, 0.62, 0.25, 0.29, 0, -0.42, 0.028, 1.85, 0.028);

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
    0.94,
    0.94,
    0.94,
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
      const scale = 0.46 + phase * 0.5;
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
  const beaconScale =
    0.2 + state.beaconIntensity * 0.32 + (receiving ? receiveNod * 0.14 : 0);
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
  colors.scratch.copy(colors.beaconOff).lerp(colors.beaconHot, state.beaconIntensity);
  setInstanceColor(pools.pulses, UPSTREAM_TIP_BEACON_RING_INDEX, colors.scratch);
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
  // Zone multipliers ride on top of the shared gain so the ladder lands on the
  // measured targets: structure ~0.15, cladding ~0.42, hardware ~0.75.
  const steel = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel).multiplyScalar(2.2),
  );
  const steelDeep = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureShadow).multiplyScalar(2.6),
  );
  const seam = new THREE.Color(SW_BASE_LANGUAGE.seamShadow);
  const cladding = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(new THREE.Color(archivePalette.layer), 0.14)
      .multiplyScalar(1.15),
  );
  const claddingAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.claddingAlt)
      .lerp(new THREE.Color(archivePalette.layer), 0.1)
      .multiplyScalar(1.3),
  );
  const roof = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding).lerp(seam, 0.24).multiplyScalar(1.35),
  );
  const iceCore = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware).lerp(white, 0.2).multiplyScalar(0.4),
  );
  const iceCoreAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(archivePalette.layer), 0.3)
      .multiplyScalar(0.44),
  );
  const drift = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.snow).multiplyScalar(0.42));
  // Safety trim is a thin hazard line, never a body colour: keep it well under
  // the clipping band so it cannot become the brightest thing in the frame.
  const trim = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim).multiplyScalar(0.42);
  const worklight = new THREE.Color(SW_BASE_LANGUAGE.emberWindow).multiplyScalar(0.7);
  const provenance = new THREE.Color(archivePalette.trace);
  // Held below the clipping band on purpose: the logger head must stay hot
  // magenta under the frame multiplier instead of blowing out to white.
  const rigHead = new THREE.Color(archivePalette.surface)
    .lerp(provenance, 0.3)
    .multiplyScalar(0.26);

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
  const steel = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureSteel).multiplyScalar(2.2),
  );
  const steelDeep = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.structureShadow).multiplyScalar(2.6),
  );
  const cladding = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding).multiplyScalar(1.5),
  );
  const claddingAlt = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.claddingAlt).multiplyScalar(1.7),
  );
  const roof = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.cladding)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.seamShadow), 0.24)
      .multiplyScalar(1.6),
  );
  const trim = new THREE.Color(SW_BASE_LANGUAGE.safetyTrim).multiplyScalar(0.42);
  const drift = balanceForDusk(new THREE.Color(SW_BASE_LANGUAGE.snow).multiplyScalar(0.95));
  const hardware = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware).multiplyScalar(0.78),
  );
  const worklight = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(new THREE.Color(toolingPalette.highlight), 0.12)
    .multiplyScalar(0.7);
  // The identity violet lives only here: accent seams and indicator lights.
  const accentSeam = new THREE.Color(toolingPalette.steel).multiplyScalar(0.8);
  const brass = new THREE.Color(SW_BASE_LANGUAGE.emberWindow)
    .lerp(new THREE.Color(SW_BASE_LANGUAGE.hardware), 0.4)
    .multiplyScalar(0.62);
  const relicSteel = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware)
      .lerp(new THREE.Color(SW_BASE_LANGUAGE.structureSteel), 0.3)
      .multiplyScalar(0.8),
  );
  const stock = balanceForDusk(
    new THREE.Color(SW_BASE_LANGUAGE.hardware).lerp(white, 0.1).multiplyScalar(0.66),
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
