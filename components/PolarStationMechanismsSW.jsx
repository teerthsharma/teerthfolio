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
const UPSTREAM_STRUCTURE_COUNT = 18;
const UPSTREAM_RING_COUNT = SW_MECHANISM_PROFILES["upstream-radio-mast"].ringCount;
const UPSTREAM_DISH_ELEVATION = 0.12;
const UPSTREAM_DISH_FACE_ON = true;
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
  return createBeveledExtrusion(shape, quality, 0.045);
}

function createLaunchPadGeometry(quality) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.42, 0.5);
  shape.lineTo(-0.42, 0.5);
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
  return createBeveledExtrusion(shape, quality, 0.035);
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
  return geometry;
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
    topologySurface: makeSurface({
      color: "#FFFFFF",
      emissive: topologyPalette.shadow,
      emissiveIntensity: 0.16,
      metalness: 0.28,
      opacity: 0.92,
      roughness: 0.24,
    }),
    topologyTrace: new THREE.LineBasicMaterial({
      color: "#FFFFFF",
      depthWrite: false,
      opacity: 0.96,
      toneMapped: false,
      transparent: true,
      vertexColors: true,
    }),
    upstreamSignal: makeGlow(upstreamPalette.signal, 0.9),
    upstreamSurface: makeSurface({
      color: "#FFFFFF",
      emissive: upstreamPalette.shadow,
      emissiveIntensity: 0.14,
      metalness: 0.72,
      opacity: 1,
      roughness: 0.26,
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
    topologyTrace: createDynamicLineGeometry(TOPOLOGY_BAR_COUNT - 1),
    torus,
  };
}

function applyStationRootReveal(root, alpha, familyAlpha, isPromise, dockedHeroScale = 1) {
  if (!root) return;
  root.visible = alpha > 0.005 && familyAlpha > 0.005;
  if (!root.visible) return;
  root.scale.setScalar(isPromise ? 0.88 : dockedHeroScale);
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

function applySouthwestIdentityColors(pools) {
  const upstreamPalette = SW_MECHANISM_PROFILES["upstream-radio-mast"].palette;
  const archivePalette = SW_MECHANISM_PROFILES["topology-archive-wall"].palette;
  const toolingPalette = SW_MECHANISM_PROFILES["assembly-tool-locker"].palette;
  const coral = new THREE.Color(upstreamPalette.surface);
  const coralShadow = new THREE.Color(upstreamPalette.bearing);
  const mint = new THREE.Color(upstreamPalette.signal);
  for (let index = 0; index < UPSTREAM_STRUCTURE_COUNT; index += 1) {
    const color = [8, 12, 13, 16, 17].includes(index)
      ? mint
      : [4, 5, 6, 9, 10, 11].includes(index)
        ? coralShadow
        : coral;
    setInstanceColor(pools.upstreamStructures, index, color);
  }
  setInstanceColor(pools.upstreamDish, 0, coral);

  const archiveWine = new THREE.Color(archivePalette.shadow);
  const archiveMagenta = new THREE.Color(archivePalette.surface);
  const archiveRose = new THREE.Color(archivePalette.layer);
  const provenanceCyan = new THREE.Color(archivePalette.trace);
  for (let index = 0; index < TOPOLOGY_SURFACE_COUNT; index += 1) {
    const lane = index % Math.max(1, TOPOLOGY_BAR_COUNT / 2);
    const color = index >= TOPOLOGY_BAR_COUNT
      ? archiveWine
      : lane === 4 || lane === 5
        ? provenanceCyan
        : lane % 3 === 0
          ? archiveRose
          : archiveMagenta;
    setInstanceColor(pools.topologySurfaces, index, color);
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
  commitInstanceColors(pools.topologySurfaces);
  commitInstanceColors(pools.assemblyStructures);
}

function applyUpstreamInstances(state, pools, scratch) {
  const groundY = localGroundY("upstream-radio-mast");
  const localBearing =
    (state.visualBearingRadians ?? state.dishBearingRadians) -
    SW_MECHANISM_PROFILES["upstream-radio-mast"].angleDegrees * DEG_TO_RAD;
  const beamHorizontal = Math.cos(UPSTREAM_DISH_ELEVATION);
  const beamX = Math.sin(localBearing) * beamHorizontal;
  const beamY = Math.sin(UPSTREAM_DISH_ELEVATION);
  const beamZ = Math.cos(localBearing) * beamHorizontal;
  const dishX = beamX * 0.08;
  const dishY = 1.73 + beamY * 0.08;
  const dishZ = beamZ * 0.08;

  setInstance(pools.structures, 0, scratch, 0, groundY + 0.09, 0, 0, 0, 0, 1.72, 0.18, 1.46);
  setInstance(pools.structures, 1, scratch, -0.72, groundY + 0.12, 0.5, 0, 0, 0, 0.5, 0.24, 0.5);
  setInstance(pools.structures, 2, scratch, 0.72, groundY + 0.12, 0.5, 0, 0, 0, 0.5, 0.24, 0.5);
  setInstance(pools.structures, 3, scratch, 0, groundY + 0.12, -0.7, 0, 0, 0, 0.54, 0.24, 0.54);
  setInstance(pools.structures, 4, scratch, -0.34, 0.34, 0.24, -0.2, 0, -0.32, 0.18, 1.3, 0.18);
  setInstance(pools.structures, 5, scratch, 0.34, 0.34, 0.24, -0.2, 0, 0.32, 0.18, 1.3, 0.18);
  setInstance(pools.structures, 6, scratch, 0, 0.34, -0.34, 0.3, 0, 0, 0.2, 1.32, 0.2);
  setInstance(pools.structures, 7, scratch, 0, 1.02, 0, 0, localBearing, 0, 0.56, 0.34, 0.56);
  setInstance(pools.structures, 8, scratch, 0, 1.24, 0, 0, localBearing, Math.PI / 2, 0.22, 1.16, 0.2);
  setInstance(pools.structures, 9, scratch, -0.38, 1.48, 0, 0, localBearing, -0.32, 0.16, 0.72, 0.16);
  setInstance(pools.structures, 10, scratch, 0.38, 1.48, 0, 0, localBearing, 0.32, 0.16, 0.72, 0.16);
  setInstance(pools.structures, 11, scratch, 0, 1.44, -0.28, -0.28, localBearing, 0, 0.16, 0.76, 0.16);
  setInstance(pools.structures, 12, scratch, 0, 1.65, 0, 0, localBearing, 0, 0.52, 0.18, 0.52);
  // A small polar antenna farm gives the harbor a skyline even when the dish is edge-on.
  setInstance(pools.structures, 13, scratch, -1.04, 0.7, -0.42, 0, 0, 0, 0.12, 1.4, 0.12);
  setInstance(pools.structures, 14, scratch, -1.04, 1.36, -0.42, 0, 0, Math.PI / 2, 0.12, 0.58, 0.12);
  setInstance(pools.structures, 15, scratch, 1.02, 0.56, -0.24, 0, 0, 0, 0.12, 1.12, 0.12);
  setInstance(pools.structures, 16, scratch, -1.04, 1.52, -0.42, 0, localBearing, 0, 0.22, 0.22, 0.22);
  setInstance(pools.structures, 17, scratch, 1.02, 1.18, -0.24, 0, localBearing, 0, 0.22, 0.22, 0.22);

  setInstance(
    pools.dish,
    0,
    scratch,
    dishX,
    dishY,
    dishZ,
    -UPSTREAM_DISH_ELEVATION,
    UPSTREAM_DISH_FACE_ON ? localBearing * 0.2 : localBearing,
    0,
    0.94,
    0.94,
    0.94,
  );

  for (let index = 0; index < state.pulsePhases.length; index += 1) {
    const phase = state.pulsePhases[index];
    const distance = 0.3 + phase * 2.45;
    const scale = state.pulsesActive ? 0.3 + phase * 1.25 : 0;
    setInstance(
      pools.pulses,
      index,
      scratch,
      dishX + beamX * distance,
      dishY + beamY * distance,
      dishZ + beamZ * distance,
      UPSTREAM_RADAR_RING_FACING - UPSTREAM_DISH_ELEVATION,
      localBearing,
      0,
      scale,
      scale,
      scale,
    );
  }
  const packetVisible = state.phase === "RECEIVE" ? 1 : 0;
  const packetDistance = 0.14 + state.packetProgress * 2.25;
  setInstance(
    pools.packet,
    0,
    scratch,
    dishX + beamX * packetDistance,
    dishY + beamY * packetDistance,
    dishZ + beamZ * packetDistance,
    state.packetProgress * Math.PI,
    state.packetProgress * Math.PI * 0.5,
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

function topologyPanelX(state, index) {
  const side = topologyPanelSide(index);
  const lane = topologyPanelLane(index);
  const laneDistance = Math.abs(lane - 4.5) / 4.5;
  return side * (
    0.7 + (1 - laneDistance) * 0.38 + state.aperture * 0.7 -
    state.barExtrusions[index] * 0.75
  );
}

function topologyPanelZ(index) {
  return (topologyPanelLane(index) - 4.5) * 0.34;
}

function applyTopologyInstances(state, surfaces, scratch) {
  const groundY = localGroundY("topology-archive-wall");
  const ignitionLift = state.ignition * 0.08;
  const countdownBreathe = state.countdown > 0
    ? Math.sin((state.phaseAge + state.countdown) * TWO_PI) * 0.018
    : 0;
  for (let index = 0; index < TOPOLOGY_BAR_COUNT; index += 1) {
    const height = state.barcode.heights[index];
    const extrusion = state.barExtrusions[index];
    const side = topologyPanelSide(index);
    const lane = topologyPanelLane(index);
    setInstance(
      surfaces,
      index,
      scratch,
      topologyPanelX(state, index),
      height * 0.5 + groundY + extrusion * 0.18 + countdownBreathe,
      topologyPanelZ(index),
      0,
      side * Math.PI / 2 + (lane - 4.5) * side * 0.05,
      0,
      0.34,
      height,
      0.18 + extrusion * 1.8,
    );
  }
  const foundationStart = TOPOLOGY_BAR_COUNT;
  setInstance(surfaces, foundationStart, scratch, -1.02, groundY + 0.09 + ignitionLift, 0, 0, 0, 0, 0.38, 0.18, 3.46);
  setInstance(surfaces, foundationStart + 1, scratch, 1.02, groundY + 0.09 + ignitionLift, 0, 0, 0, 0, 0.38, 0.18, 3.46);
  setInstance(surfaces, foundationStart + 2, scratch, -1.16, 0.52 + ignitionLift, 0, 0, 0, 0, 0.13, 0.16, 3.18);
  setInstance(surfaces, foundationStart + 3, scratch, 1.16, 0.52 + ignitionLift, 0, 0, 0, 0, 0.13, 0.16, 3.18);
  setInstance(surfaces, foundationStart + 4, scratch, 0, groundY + 0.05 + ignitionLift, -1.65, 0, 0, 0, 2.18, 0.16, 0.22 + state.ignition * 0.18);
  setInstance(surfaces, foundationStart + 5, scratch, 0, groundY + 0.05 + ignitionLift, 1.65, 0, 0, 0, 2.18 + state.ignition * 0.2, 0.16, 0.22 + state.ignition * 0.18);
  commitPool(surfaces);
}

function applyTopologyTrace(state, geometry, firstColor, secondColor) {
  const path = state.barcode.path;
  const availableSegments = Math.max(0, path.length - 1);
  const visibleSegments = Math.min(
    availableSegments,
    Math.ceil(availableSegments * state.traceProgress),
  );
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  for (let segment = 0; segment < visibleSegments; segment += 1) {
    const firstIndex = path[segment];
    const secondIndex = path[segment + 1];
    const offset = segment * 2;
    positions.setXYZ(
      offset,
      topologyPanelX(state, firstIndex) -
        topologyPanelSide(firstIndex) * (0.13 + state.barExtrusions[firstIndex]),
      state.barcode.heights[firstIndex] - 0.23,
      topologyPanelZ(firstIndex),
    );
    positions.setXYZ(
      offset + 1,
      topologyPanelX(state, secondIndex) -
        topologyPanelSide(secondIndex) * (0.13 + state.barExtrusions[secondIndex]),
      state.barcode.heights[secondIndex] - 0.23,
      topologyPanelZ(secondIndex),
    );
    colors.setXYZ(offset, firstColor.r, firstColor.g, firstColor.b);
    colors.setXYZ(offset + 1, secondColor.r, secondColor.g, secondColor.b);
  }
  geometry.setDrawRange(0, visibleSegments * 2);
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
    preparePool(upstreamPulses.current, UPSTREAM_RING_COUNT);
    preparePool(upstreamPacket.current, 1);
    preparePool(topologySurfaces.current, TOPOLOGY_SURFACE_COUNT);
    preparePool(assemblyStructures.current, ASSEMBLY_STRUCTURE_COUNT);
    preparePool(assemblyPins.current, 4);
    preparePool(assemblyProof.current, 1);
    applySouthwestIdentityColors({
      assemblyStructures: assemblyStructures.current,
      topologySurfaces: topologySurfaces.current,
      upstreamDish: upstreamDish.current,
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
          name="upstream-coral-signal-harbor-footing-and-bearing-cradle upstream-radio-harbor-antenna-farm upstream-mint-waveguide-beacons upstream-face-on-coral-mint-radar"
          receiveShadow={quality !== "low"}
          ref={upstreamStructures}
        />
        <instancedMesh
          args={[resources.dish, resources.materials.upstreamSurface, 1]}
          castShadow={quality === "high"}
          geometry={resources.dish}
          material={resources.materials.upstreamSurface}
          name="upstream-bearing-dish"
          receiveShadow={quality !== "low"}
          ref={upstreamDish}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[
                resources.torus,
                resources.materials.upstreamSignal,
                UPSTREAM_RING_COUNT,
              ]}
              geometry={resources.torus}
              material={resources.materials.upstreamSignal}
              name="upstream-verified-signal-rings upstream-concentric-amplitude-wave-rings"
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
          name="topology-thick-relational-archive-canyon-walls-and-plinths archive-luminous-provenance-apertures archive-index-strata-crowns archive-magenta-cyan-rocket-launch-pad archive-open-canyon-gantry archive-launch-aperture-countdown-ignition"
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
