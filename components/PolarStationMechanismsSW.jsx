import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ASSEMBLY_WORKSHOP_GEOMETRY,
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
  "three source-backed compound monuments; beveled and lathed high-poly illusion; eight instance pools plus one connected trace; three shared programs; zero textures";

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const POLAR_GROUND_Y = -0.22;
const TOPOLOGY_BAR_COUNT = SW_MECHANISM_PROFILES["topology-archive-wall"].barCount;
const TOPOLOGY_FOUNDATION_COUNT = 6;
const TOPOLOGY_SURFACE_COUNT = TOPOLOGY_BAR_COUNT + TOPOLOGY_FOUNDATION_COUNT;
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
const ASSEMBLY_ARCH_SEGMENTS = 12;
const ASSEMBLY_STRUCTURE_COUNT = 12 + ASSEMBLY_ARCH_SEGMENTS * 2;

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

const ASSEMBLY_STARTS = Object.freeze([
  Object.freeze([-1.15, 0.12, -0.52]),
  Object.freeze([-1.13, 0.12, 0.54]),
  Object.freeze([1.13, 0.12, -0.52]),
  Object.freeze([1.15, 0.12, 0.54]),
]);
const ASSEMBLY_TARGETS = Object.freeze([
  Object.freeze([-0.25, 0.04, -0.19]),
  Object.freeze([-0.25, 0.04, 0.19]),
  Object.freeze([0.25, 0.04, -0.19]),
  Object.freeze([0.25, 0.04, 0.19]),
]);
const ASSEMBLY_START_YAWS = Object.freeze([0.34, -0.4, -0.28, 0.47]);

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

function createLaunchPadGeometry(quality) {
  // Strata barcode monolith: a notched geological profile whose stepped
  // ledges catch dusk rim light, with a reader-slit aperture through the crown.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.47, -0.24);
  shape.lineTo(0.5, -0.18);
  shape.lineTo(0.45, 0.06);
  shape.lineTo(0.48, 0.12);
  shape.lineTo(0.42, 0.5);
  shape.lineTo(-0.42, 0.5);
  shape.lineTo(-0.48, 0.14);
  shape.lineTo(-0.45, 0.08);
  shape.lineTo(-0.5, -0.16);
  shape.lineTo(-0.47, -0.22);
  shape.closePath();
  const aperture = new THREE.Path();
  aperture.moveTo(-0.22, -0.18);
  aperture.lineTo(-0.22, 0.16);
  aperture.quadraticCurveTo(-0.22, 0.25, -0.1, 0.25);
  aperture.lineTo(0.1, 0.25);
  aperture.quadraticCurveTo(0.22, 0.25, 0.22, 0.16);
  aperture.lineTo(0.22, -0.18);
  aperture.closePath();
  shape.holes.push(aperture);
  const geometry = createBeveledExtrusion(shape, quality, 0.035);
  // The topology material declares vertexColors, so the slab must carry a real
  // color attribute (a missing attribute samples black and unlights the whole
  // pool). Bake strata face shading into it: lit crowns, mid reading faces,
  // shadowed flanks — per-instance identity colors multiply on top.
  const normals = geometry.getAttribute("normal");
  const shades = new Float32Array(normals.count * 3);
  for (let index = 0; index < normals.count; index += 1) {
    const normalY = normals.getY(index);
    const normalZ = normals.getZ(index);
    const shade =
      0.98 + Math.abs(normalZ) * 0.26 + Math.max(0, normalY) * 0.36;
    shades[index * 3] = shade;
    shades[index * 3 + 1] = shade;
    shades[index * 3 + 2] = shade;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
  return geometry;
}

// Semantic alias: the archive monument is a launch pad, but the shared
// station contract names its reusable slab resource explicitly.
function createArchiveSlabGeometry(quality) {
  return createLaunchPadGeometry(quality);
}

function createAssemblyBlockGeometry(quality) {
  const radius = 0.11;
  const shape = new THREE.Shape();
  shape.moveTo(-0.5 + radius, -0.5);
  shape.lineTo(0.5 - radius, -0.5);
  shape.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + radius);
  shape.lineTo(0.5, 0.5 - radius);
  shape.quadraticCurveTo(0.5, 0.5, 0.5 - radius, 0.5);
  shape.lineTo(0.16, 0.5);
  shape.lineTo(0.1, 0.38);
  shape.lineTo(-0.1, 0.38);
  shape.lineTo(-0.16, 0.5);
  shape.lineTo(-0.5 + radius, 0.5);
  shape.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - radius);
  shape.lineTo(-0.5, -0.5 + radius);
  shape.quadraticCurveTo(-0.5, -0.5, -0.5 + radius, -0.5);
  shape.closePath();
  return createBeveledExtrusion(shape, quality, 0.055);
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
    assemblySurface: makeSurface({
      color: "#FFFFFF",
      emissive: assemblyPalette.highlight,
      emissiveIntensity: 0.62,
      metalness: 0.62,
      opacity: 1,
      roughness: 0.3,
    }),
    // Lit strata, not an emissive wash: dusk key/rim lights model the notched
    // graphite faces while a low aether-violet floor keeps the canyon from
    // going black, so magenta only appears where data seams and the scan live.
    topologySurface: makeSurface({
      color: "#FFFFFF",
      emissive: topologyPalette.glow,
      emissiveIntensity: 0.54,
      metalness: 0.12,
      opacity: 1,
      roughness: 0.34,
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

function commitInstanceColors(mesh) {
  if (!mesh?.instanceColor) return;
  mesh.instanceColor.needsUpdate = true;
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
  const toolingPalette = SW_MECHANISM_PROFILES["assembly-tool-locker"].palette;
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

  const basalt = new THREE.Color(toolingPalette.surface);
  const deepPurple = new THREE.Color(toolingPalette.surface);
  const purple = new THREE.Color(toolingPalette.steel);
  const lavender = new THREE.Color(toolingPalette.highlight);
  for (let index = 0; index < ASSEMBLY_STRUCTURE_COUNT; index += 1) {
    const color = index >= 12
      ? index % 3 === 0 ? lavender : purple
      : index >= 2 && index <= 5
        ? lavender
        : index === 10 || index === 11
          ? lavender
          : index === 0
            ? basalt
            : deepPurple;
    setInstanceColor(pools.assemblyStructures, index, color);
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

function topologyPanelSide(index) {
  return index < TOPOLOGY_BAR_COUNT / 2 ? -1 : 1;
}

function topologyPanelLane(index) {
  return index % (TOPOLOGY_BAR_COUNT / 2);
}

/**
 * Authored strata-barcode skyline: each lane is a tall spine, mid stratum, or
 * low footing shelf so the canyon reads as a stepped geological data cliff in
 * thumbnail, never a flat slab. The far wall runs the rhythm phase-shifted so
 * the two crest lines stagger instead of mirroring.
 */
const TOPOLOGY_LANE_RHYTHM = Object.freeze([
  Object.freeze({ rise: 1.28, setback: 0.2, thick: 0.32, width: 0.3 }),
  Object.freeze({ rise: 0.74, setback: -0.02, thick: 0.2, width: 0.42 }),
  Object.freeze({ rise: 1.04, setback: 0.1, thick: 0.26, width: 0.3 }),
  Object.freeze({ rise: 0.52, setback: -0.1, thick: 0.17, width: 0.46 }),
  Object.freeze({ rise: 1.35, setback: 0.26, thick: 0.36, width: 0.27 }),
  Object.freeze({ rise: 0.9, setback: 0.05, thick: 0.24, width: 0.36 }),
  Object.freeze({ rise: 0.58, setback: -0.08, thick: 0.18, width: 0.44 }),
  Object.freeze({ rise: 1.2, setback: 0.16, thick: 0.3, width: 0.3 }),
  Object.freeze({ rise: 0.8, setback: 0.02, thick: 0.22, width: 0.4 }),
  Object.freeze({ rise: 0.5, setback: -0.12, thick: 0.16, width: 0.34 }),
]);
const TOPOLOGY_SCAN_TRAVEL = 1.9;
const TOPOLOGY_CROWN_LIMIT = 2.16;

function topologyBarRhythm(index) {
  const lane = topologyPanelLane(index);
  return TOPOLOGY_LANE_RHYTHM[
    topologyPanelSide(index) < 0 ? lane : (lane + 3) % TOPOLOGY_LANE_RHYTHM.length
  ];
}

function topologyBarHeight(state, index) {
  return Math.min(
    TOPOLOGY_CROWN_LIMIT,
    Math.max(0.42, state.barcode.heights[index] * topologyBarRhythm(index).rise),
  );
}

function topologyPanelX(state, index) {
  const side = topologyPanelSide(index);
  const rhythm = topologyBarRhythm(index);
  return side * (
    0.78 + rhythm.setback + state.aperture * 0.7 -
    state.barExtrusions[index] * 0.6
  );
}

function topologyPanelZ(index) {
  return (topologyPanelLane(index) - 4.5) * 0.34;
}

function topologyScanZ(state) {
  return -TOPOLOGY_SCAN_TRAVEL + state.scanPhase * TOPOLOGY_SCAN_TRAVEL * 2;
}

function topologyScanGlow(state, z) {
  const falloff = Math.max(0, 1 - Math.abs(z - topologyScanZ(state)) / 0.62);
  return falloff * falloff * state.scanIntensity;
}

function topologyCrownY(state) {
  let crown = 0;
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    crown = Math.max(crown, topologyBarHeight(state, index));
  }
  return crown + localGroundY("topology-archive-wall");
}

/**
 * Three value families on one pooled draw: dark graphite strata faces, magenta
 * data seams on the tallest spines, and pale mauve footing shelves. The scan
 * pass lifts whichever bars the read line is crossing.
 */
let topologyColorAuthority = null;

function topologyColors() {
  if (topologyColorAuthority) return topologyColorAuthority;
  const archivePalette = SW_MECHANISM_PROFILES["topology-archive-wall"].palette;
  const mauveShelf = new THREE.Color(archivePalette.layer).multiplyScalar(1.45);
  const graphite = new THREE.Color(archivePalette.shadow)
    .lerp(new THREE.Color(archivePalette.layer), 0.72);
  const graphiteDeep = new THREE.Color(archivePalette.shadow)
    .lerp(new THREE.Color(archivePalette.layer), 0.58);
  const magentaSeam = new THREE.Color(archivePalette.surface)
    .lerp(new THREE.Color("#FFFFFF"), 0.25);
  const provenance = new THREE.Color(archivePalette.trace);
  const base = [];
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    const rhythm = topologyBarRhythm(index);
    base.push(
      rhythm.rise >= 1.3
        ? magentaSeam
        : rhythm.rise <= 0.6
          ? mauveShelf
          : rhythm.rise >= 1
            ? graphiteDeep
            : graphite,
    );
  }
  // Foundations: twin plinths, reader crossbeam, center track, gantry legs.
  const reader = new THREE.Color(archivePalette.layer)
    .lerp(provenance, 0.55)
    .multiplyScalar(1.25);
  const plinth = graphite.clone().multiplyScalar(1.14);
  base.push(plinth, plinth);
  base.push(reader);
  base.push(graphiteDeep);
  base.push(reader.clone().multiplyScalar(0.9), reader.clone().multiplyScalar(0.9));
  topologyColorAuthority = {
    base,
    hot: new THREE.Color(archivePalette.surface).lerp(new THREE.Color("#FFFFFF"), 0.18),
    scratch: new THREE.Color(),
  };
  return topologyColorAuthority;
}

function applyTopologyInstances(state, surfaces, scratch) {
  const groundY = localGroundY("topology-archive-wall");
  const colors = topologyColors();
  const scanZ = topologyScanZ(state);
  const countdownBreathe = state.countdown > 0
    ? Math.sin((state.phaseAge + state.countdown) * TWO_PI) * 0.016
    : 0;
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    const rhythm = topologyBarRhythm(index);
    const height = topologyBarHeight(state, index);
    const side = topologyPanelSide(index);
    const z = topologyPanelZ(index);
    setInstance(
      surfaces,
      index,
      scratch,
      topologyPanelX(state, index),
      height * 0.5 + groundY,
      z,
      0,
      side * Math.PI / 2,
      0,
      rhythm.width,
      height,
      rhythm.thick + state.barExtrusions[index] * 1.4,
    );
    const glow = topologyScanGlow(state, z);
    colors.scratch
      .copy(colors.base[index])
      .lerp(colors.hot, Math.min(1, glow))
      .multiplyScalar(1 + glow * 2);
    setInstanceColor(surfaces, index, colors.scratch);
  }
  const foundationStart = TOPOLOGY_BAR_COUNT;
  // Twin continuous plinth rails seat both strata walls into the snow.
  setInstance(surfaces, foundationStart, scratch, -0.96, groundY + 0.1, 0, 0, 0, 0, 0.86, 0.2, 3.62);
  setInstance(surfaces, foundationStart + 1, scratch, 0.96, groundY + 0.1, 0, 0, 0, 0, 0.86, 0.2, 3.62);
  // The scan reader is a grounded portal gantry — two legs and a crowned
  // crossbeam — that physically sweeps the canyon at the live read Z.
  const crownY = topologyCrownY(state);
  const legHeight = crownY + 0.1 - groundY;
  setInstance(surfaces, foundationStart + 2, scratch, 0, crownY + 0.12 + countdownBreathe, scanZ, 0, 0, 0, 2.5, 0.13, 0.2);
  setInstance(surfaces, foundationStart + 4, scratch, -1.16, legHeight * 0.5 + groundY, scanZ, 0, 0, 0, 0.16, legHeight, 0.16);
  setInstance(surfaces, foundationStart + 5, scratch, 1.16, legHeight * 0.5 + groundY, scanZ, 0, 0, 0, 0.16, legHeight, 0.16);
  // Grounded center track the reader sweeps along.
  setInstance(surfaces, foundationStart + 3, scratch, 0, groundY + 0.05, 0, 0, 0, 0, 0.24, 0.1, 3.9);
  const beamGlow = state.scanIntensity * (0.5 + state.ignition * 0.5);
  for (let index = foundationStart; index < TOPOLOGY_SURFACE_COUNT; index += 1) {
    colors.scratch.copy(colors.base[index]);
    if (index >= foundationStart + 2 && index !== foundationStart + 3) {
      colors.scratch.multiplyScalar(1 + beamGlow * 0.9);
    }
    setInstanceColor(surfaces, index, colors.scratch);
  }
  commitPool(surfaces);
  commitInstanceColors(surfaces);
}

const TOPOLOGY_SCAN_LINE_COLOR = new THREE.Color();
const TOPOLOGY_SCAN_TIP_COLOR = new THREE.Color();

function topologyInnerFaceX(state, index) {
  const side = topologyPanelSide(index);
  return topologyPanelX(state, index) -
    side * (topologyBarRhythm(index).thick * 0.5 + 0.06 + state.barExtrusions[index]);
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

  // Persistent provenance trace: the connected barcode path across the crowns.
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
      topologyBarHeight(state, firstIndex) + groundY - 0.14,
      topologyPanelZ(firstIndex),
      topologyInnerFaceX(state, secondIndex),
      topologyBarHeight(state, secondIndex) + groundY - 0.14,
      topologyPanelZ(secondIndex),
      firstColor,
      secondColor,
    );
  }

  // The live read line: a bright magenta scan sweeping the whole barcode
  // cross-section — down one wall, across the aisle floor, up the other wall,
  // with a reader drop from the gantry crossbeam.
  const scanZ = topologyScanZ(state);
  const lane = Math.min(
    TOPOLOGY_BAR_COUNT / 2 - 1,
    Math.max(0, Math.round(scanZ / 0.34 + 4.5)),
  );
  const leftIndex = lane;
  const rightIndex = lane + TOPOLOGY_BAR_COUNT / 2;
  const leftX = topologyInnerFaceX(state, leftIndex);
  const rightX = topologyInnerFaceX(state, rightIndex);
  const leftTop = topologyBarHeight(state, leftIndex) + groundY + 0.04;
  const rightTop = topologyBarHeight(state, rightIndex) + groundY + 0.04;
  const floorY = groundY + 0.02;
  TOPOLOGY_SCAN_LINE_COLOR
    .copy(firstColor)
    .multiplyScalar(0.85 + 0.95 * state.scanIntensity);
  TOPOLOGY_SCAN_TIP_COLOR
    .copy(secondColor)
    .lerp(firstColor, 0.4)
    .multiplyScalar(0.7 + 0.6 * state.scanIntensity);
  for (const ghost of [0, 0.035]) {
    const z = scanZ + ghost;
    writeSegment(leftX, leftTop, z, leftX, floorY, z, TOPOLOGY_SCAN_TIP_COLOR, TOPOLOGY_SCAN_LINE_COLOR);
    writeSegment(leftX, floorY, z, rightX, floorY, z, TOPOLOGY_SCAN_LINE_COLOR, TOPOLOGY_SCAN_LINE_COLOR);
    writeSegment(rightX, floorY, z, rightX, rightTop, z, TOPOLOGY_SCAN_LINE_COLOR, TOPOLOGY_SCAN_TIP_COLOR);
  }
  writeSegment(0, topologyCrownY(state) + 0.08, scanZ, 0, floorY, scanZ, TOPOLOGY_SCAN_TIP_COLOR, TOPOLOGY_SCAN_LINE_COLOR);

  geometry.setDrawRange(0, segment * 2);
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

function applyAssemblyInstances(state, pools, scratch) {
  const groundY = localGroundY("assembly-tool-locker");
  const assemblyCycleTime =
    state.assemblyTime % SW_MECHANISM_PROFILES["assembly-tool-locker"].assemblyCycleSeconds;
  const cycleProgress =
    assemblyCycleTime / SW_MECHANISM_PROFILES["assembly-tool-locker"].assemblyCycleSeconds;
  setInstance(pools.structures, 0, scratch, 0, groundY + 0.11, 0, 0, 0, 0, 2.82, 0.22, 1.56);
  setInstance(
    pools.structures,
    1,
    scratch,
    0,
    0.32,
    ASSEMBLY_WORKSHOP_GEOMETRY.backplaneLocalZ,
    0,
    0,
    0,
    2.08,
    0.56,
    0.18,
  );
  for (let index = 0; index < 4; index += 1) {
    const progress = state.partProgress[index];
    const start = ASSEMBLY_STARTS[index];
    const target = ASSEMBLY_TARGETS[index];
    const positionX = start[0] + (target[0] - start[0]) * progress;
    const positionY = start[1] + (target[1] - start[1]) * progress +
      Math.sin(progress * Math.PI) * 0.34;
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
      0.52,
      0.17 + (index % 2) * 0.03,
      0.36,
    );
  }

  for (let index = 0; index < ASSEMBLY_STARTS.length; index += 1) {
    const footing = ASSEMBLY_STARTS[index];
    setInstance(
      pools.structures,
      index + 6,
      scratch,
      footing[0],
      groundY + 0.13,
      footing[2],
      0,
      0,
      0,
      0.46,
      0.26,
      0.46,
    );
  }
  // Gold-edged suspended assembly rails keep the workshop readable as a tool bay.
  setInstance(pools.structures, 10, scratch, 0, 1.42, -0.52, 0, 0, 0, 1.82, 0.16, 0.14);
  setInstance(pools.structures, 11, scratch, 0, 1.42, 0.52, 0, 0, 0, 1.82, 0.16, 0.14);

  const gantryCompression = (state.armProgress[0] + state.armProgress[1]) * 0.5;
  const gantrySpan = 1.48 - gantryCompression * 0.08;
  const gantryRise = 1.92 - gantryCompression * 0.16;
  for (let rib = 0; rib < 2; rib += 1) {
    const ribZ = ASSEMBLY_WORKSHOP_GEOMETRY.ribPlanesLocalZ[rib];
    for (let segment = 0; segment < ASSEMBLY_ARCH_SEGMENTS; segment += 1) {
      const progress = segment / (ASSEMBLY_ARCH_SEGMENTS - 1);
      const theta = Math.PI * (1 - progress);
      const positionX = gantrySpan * Math.cos(theta);
      const positionY = -0.08 + gantryRise * Math.sin(theta);
      const tangentX = -gantrySpan * Math.sin(theta);
      const tangentY = gantryRise * Math.cos(theta);
      const tangentAngle = Math.atan2(tangentY, tangentX);
      const instanceIndex = 12 + rib * ASSEMBLY_ARCH_SEGMENTS + segment;
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
        0.2,
        0.42,
        0.24,
      );
    }
  }

  for (let index = 0; index < state.locatorPinLifts.length; index += 1) {
    const start = ASSEMBLY_STARTS[index];
    const lift = state.locatorPinLifts[index];
    const glyphProgress = (cycleProgress + index * 0.22) % 1;
    const glyphArc = Math.sin(glyphProgress * Math.PI);
    setInstance(
      pools.pins,
      index,
      scratch,
      start[0] * (1 - glyphProgress * 0.42),
      -0.04 + lift * 0.22 + glyphArc * lift * 0.72,
      start[2] + Math.sin(glyphProgress * TWO_PI) * lift * 0.18,
      0,
      glyphProgress * TWO_PI,
      0,
      0.42,
      0.24 + lift * 0.18,
      0.42,
    );
  }
  const proofScale = state.phase === "PROVE" ? 1 + state.ritual.haloBounce * 2 : 0;
  setInstance(
    pools.proof,
    0,
    scratch,
    0,
    0.08,
    0,
    Math.PI / 2,
    assemblyCycleTime * 0.82,
    0,
    proofScale,
    proofScale,
    proofScale,
  );
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
          name="topology-thick-relational-archive-canyon-walls-and-plinths archive-luminous-provenance-apertures archive-index-strata-crowns archive-magenta-strata-barcode-scan archive-open-canyon-gantry archive-launch-aperture-countdown-ignition"
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
          name="assembly-visitor-facing-open-workshop assembly-heavy-curved-gantry-inspection-backplane-and-proof-tool-mass assembly-basalt-ochre-computational-archaeology circuit-hieroglyph-etching assembly-purple-lit-archaeology-gantry assembly-ochre-circuit-hieroglyphs assembly-purple-gold-lit-workshop assembly-suspended-assembly-rails assembly-lit-edge-rails"
          receiveShadow={quality !== "low"}
          ref={assemblyStructures}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.locatorPin, resources.materials.assemblyProof, 4]}
              geometry={resources.locatorPin}
              material={resources.materials.assemblyProof}
              name="assembly-locator-pins"
              ref={assemblyPins}
            />
            <instancedMesh
              args={[resources.torus, resources.materials.assemblyProof, 1]}
              frustumCulled={false}
              geometry={resources.torus}
              material={resources.materials.assemblyProof}
              name="assembly-proof-tolerance-ring"
              ref={assemblyProof}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}
