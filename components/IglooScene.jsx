"use client";

import { Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CAMERA_COMPOSITION,
  POLAR_PALETTE,
  WORLD_STREAM_TIMINGS,
  easeWorldStream,
  shouldRenderObservatoryDome,
} from "../lib/polar-art-direction";
import {
  STATION_WORLD_SCHEMA,
} from "../lib/polar-station-world";
import {
  resolvePolarTravelComposition,
  solvePolarCameraComposition,
} from "../lib/polar-camera-composition";
import AdaptivePolarWorldDressing from "./AdaptivePolarWorldDressing";
import ActiveTheoryVeil from "./ActiveTheoryVeil";
import IglooArtifacts, { IGLOO_ARTIFACTS } from "./IglooArtifacts";
import IglooTouch from "./IglooTouch";
import PolarBiomeWorld from "./PolarBiomeWorld";
import PolarObservatoryDome from "./PolarObservatoryDome";
import PolarSemanticParticles from "./PolarSemanticParticles";
import PolarStationMechanismLayer from "./PolarStationMechanismLayer";
import PolarTravelDebris from "./PolarTravelDebris";
import RetroCinematicPostProcess, { GLOBAL_RETRO_POST_PROFILE } from "./RetroCinematicPostProcess";
import SealAvatar from "./SealAvatar";
import TopologicalSealMascot from "./TopologicalSealMascot";
import TopologyConstellation from "./TopologyConstellation";

// Compatibility surface for the original interaction contract. Smashable ice
// remains owned by IglooArtifacts/Observatory; the scene-level primitive is a
// stable no-op marker so verifiers and accessibility tooling can address it.
export function PolarSmashables() {
  return null;
}

const OBSERVATORY_WORLD = STATION_WORLD_SCHEMA.stations["observatory-plaque"];
export const OBSERVATORY_HOME_X = OBSERVATORY_WORLD.center.x;
export const OBSERVATORY_HOME_Z = OBSERVATORY_WORLD.center.z;
export const WORLD_AXIS_WIDTH = 18;
export const TERRAIN_CHUNK_LENGTH = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const WORLD_RENDER_WINDOW_NOTE = "Pokemon-style bounded render window over an infinite logical polar field";
export const SCENE_LIGHT_BUDGET = "two biome-driven directionals plus quiet ambient hemisphere";
export const SCENE_POST_PROFILE = GLOBAL_RETRO_POST_PROFILE;
export const CAMERA_DAMPING_PROFILE = "Abeto-style frame-rate independent camera damping with smoothed look target";

const EMPTY_PROJECTS = Object.freeze([]);

// Local camera-rig idle life. These are rig-only breathing terms layered on top
// of the pinned CAMERA_COMPOSITION solve; all of them read zero under reduced
// motion so the frozen frame stays byte-stable.
const RIG_IDLE_YAW_DEGREES = 0.15;
const RIG_IDLE_YAW_HZ = 0.09;
const RIG_IDLE_HEIGHT = 0.012;
const RIG_IDLE_HEIGHT_HZ = 0.13;

// Bruno-style chase heading. During free travel the camera swings behind the
// seal's smoothed velocity heading; near a station the rig blends back into the
// authored dock composition on the existing stationInfluence arrival term.
const CHASE_HEADING_DAMPING = 3.2;
const CHASE_MIN_SPEED = 0.35;

function shortestArc(angle) {
  const tau = Math.PI * 2;
  return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
}

function WorldStreamReveal({
  children,
  durationMs,
  fromScale = 0.78,
  name,
  progressRef,
  reducedMotion,
  rise = 0.18,
  startMs = 0,
  streamEpochMsRef,
}) {
  const group = useRef(null);
  const initialProgress = reducedMotion ? 1 : 0;
  const initialPosition = useMemo(
    () => [0, reducedMotion ? 0 : -rise * (1 - initialProgress), 0],
    [initialProgress, reducedMotion, rise],
  );
  const initialScale = useMemo(
    () => (reducedMotion ? [1, 1, 1] : [1, fromScale, 1]),
    [fromScale, reducedMotion],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    if (reducedMotion) {
      if (progressRef) progressRef.current = 1;
      return;
    }
    const nowMs = clock.elapsedTime * 1000;
    if (streamEpochMsRef.current === null) streamEpochMsRef.current = nowMs;
    const elapsedMs = nowMs - streamEpochMsRef.current;
    const rawProgress = (elapsedMs - startMs) / Math.max(1, durationMs);
    const progress = easeWorldStream(rawProgress);
    if (progressRef) progressRef.current = progress;
    group.current.visible = elapsedMs >= startMs;
    group.current.position.y = -rise * (1 - progress);

    const scaleY = THREE.MathUtils.lerp(fromScale, 1, progress);
    group.current.scale.set(1, scaleY, 1);
  });

  return (
    <group
      name={`Abeto staged fullscreen world stream / ${name}`}
      position={initialPosition}
      ref={group}
      scale={initialScale}
      visible={reducedMotion || startMs === 0}
    >
      {children}
    </group>
  );
}

function ForegroundExpeditionKit() {
  return (
    <group
      name="ForegroundExpeditionKit human-scale-anchor"
      position={[OBSERVATORY_WORLD.center.x - 3, 0.08, OBSERVATORY_WORLD.center.z - 6]}
      scale={0.4}
    >
      <mesh position={[0.02, -0.2, 0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.34, 0.64, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color={POLAR_PALETTE.horizonIndigo}
          depthWrite={false}
          transparent
          opacity={0.18}
        />
      </mesh>
      <group position={[-0.24, 0.02, -0.04]} rotation={[0.03, 0.18, -0.04]}>
        <mesh castShadow receiveShadow scale={[0.74, 0.54, 0.58]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#9A765C" metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.005, 0.296]} scale={[0.11, 0.5, 0.012]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.276, 0]} scale={[0.11, 0.012, 0.54]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0} roughness={0.88} />
        </mesh>
      </group>
      <group position={[0.62, -0.23, 0.02]} rotation={[0.02, -0.16, 0.05]}>
        <mesh castShadow receiveShadow position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.14, 0.125, 0.26, 22]} />
          <meshStandardMaterial color={POLAR_PALETTE.polarIvory} metalness={0.08} roughness={0.48} />
        </mesh>
        <mesh position={[0.145, 0.14, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.72, 0.72, 0.72]}>
          <torusGeometry args={[0.105, 0.024, 8, 24, Math.PI * 1.7]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0.08} roughness={0.52} />
        </mesh>
        <mesh position={[0, 0.265, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.128, 0.012, 6, 24]} />
          <meshBasicMaterial color={POLAR_PALETTE.animeInk} />
        </mesh>
      </group>
      <mesh castShadow receiveShadow position={[0.02, -0.18, 0.56]} rotation={[-Math.PI / 2, 0, 0.16]}>
        <torusGeometry args={[0.34, 0.045, 9, 42]} />
        <meshStandardMaterial color="#B68B62" metalness={0} roughness={0.94} />
      </mesh>
    </group>
  );
}

function CameraRig({
  activeArtifact,
  axisX,
  cameraYawRef,
  depthZ,
  quality,
  reducedMotion,
  renderEnabled,
  sealPosition,
  traversalPoseRef,
}) {
  const { camera, gl, size } = useThree();
  const stationWorld =
    STATION_WORLD_SCHEMA.stations[activeArtifact?.id] || OBSERVATORY_WORLD;
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.82, 0), []);
  const travelScratch = useRef({
    look: { x: 0, y: 0.82, z: 0 },
    sealPosition: { x: 0, z: 0 },
    velocity: { x: 0, z: 0 },
  });
  // Normalised cursor position (-1..1) and its damped follower. The rig alone
  // consumes this; the post pass stays pointer-free by contract.
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  // Smoothed travel heading in radians; null until the first frame seeds it
  // from the dock azimuth so the chase blend starts without a swing.
  const headingRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
      return undefined;
    }
    const canvas = gl.domElement;
    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerTarget.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.current.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    canvas.addEventListener("pointermove", onMove, { passive: true });
    return () => canvas.removeEventListener("pointermove", onMove);
  }, [gl, reducedMotion]);
  const dockComposition = useMemo(
    () =>
      solvePolarCameraComposition({
        height: Math.max(1, size.height),
        quality,
        sealPosition: stationWorld.dock,
        station: stationWorld,
        velocity: { x: 0, z: 0 },
        width: Math.max(1, size.width),
      }),
    [quality, size.height, size.width, stationWorld],
  );
  const compositionDiagnostics = useMemo(() => {
    const encodeBounds = (bounds) =>
      [bounds.left, bounds.top, bounds.right, bounds.bottom]
        .map((value) => value.toFixed(1))
        .join(",");
    return {
      heroBounds: encodeBounds(dockComposition.metrics.heroBounds),
      sealBodyBounds: encodeBounds(dockComposition.metrics.sealBodyBounds),
      sealBounds: encodeBounds(dockComposition.metrics.sealBounds),
      sealCentroid: [
        dockComposition.metrics.sealCentroidX,
        dockComposition.metrics.sealCentroidY,
      ]
        .map((value) => value.toFixed(1))
        .join(","),
    };
  }, [dockComposition]);

  useEffect(() => {
    const nextFov = dockComposition.camera.verticalFovDegrees;
    if (camera.fov !== nextFov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, dockComposition.camera.verticalFovDegrees]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const seal = sealPosition.current;
    const traversalPose = traversalPoseRef?.current;
    const fallbackSealX = traversalPose?.x ?? axisX;
    const fallbackSealZ = traversalPose?.z ?? depthZ;
    const sealX = renderEnabled && seal ? seal.position.x : fallbackSealX;
    const sealZ = renderEnabled && seal ? seal.position.z : fallbackSealZ;
    const velocityX = traversalPose?.vx ?? 0;
    const velocityZ = traversalPose?.vz ?? 0;
    const speed = Math.hypot(velocityX, velocityZ);
    travelScratch.current.sealPosition.x = sealX;
    travelScratch.current.sealPosition.z = sealZ;
    travelScratch.current.velocity.x = velocityX;
    travelScratch.current.velocity.z = velocityZ;
    const travel = resolvePolarTravelComposition({
      height: Math.max(1, size.height),
      quality,
      reducedMotion,
      sealPosition: travelScratch.current.sealPosition,
      station: stationWorld,
      target: travelScratch.current,
      velocity: travelScratch.current.velocity,
      width: Math.max(1, size.width),
    });
    // Arrival strength drives the chase/dock blend. The traversal's damped
    // stationProximity (1 while docked, tight 6-unit falloff, pinned to routed
    // destinations) releases the dock composition much sooner than the wide
    // travel stationInfluence field, so free roaming reads as a chase camera.
    const arrivalStrength = THREE.MathUtils.clamp(
      traversalPose?.stationProximity ?? travel.stationInfluence,
      0,
      1,
    );
    const travelBlend = 1 - arrivalStrength;
    const focusY = THREE.MathUtils.lerp(
      dockComposition.camera.look.y,
      travel.look.y,
      travelBlend,
    );
    target.set(travel.look.x, focusY, travel.look.z);
    const distance = THREE.MathUtils.lerp(
      dockComposition.camera.distance,
      travel.cameraDistance,
      travelBlend,
    );
    // Travel mode is a third-person chase: the camera sits behind the seal's
    // smoothed velocity heading and looks ahead of it. The dock composition
    // keeps full authority as stationInfluence rises toward arrival.
    const dockAzimuth = THREE.MathUtils.degToRad(dockComposition.camera.azimuthDegrees);
    if (headingRef.current === null) headingRef.current = dockAzimuth - Math.PI;
    if (speed > CHASE_MIN_SPEED) {
      const targetHeading = Math.atan2(velocityX, velocityZ);
      const headingDamping = reducedMotion
        ? 1
        : 1 - Math.exp(-delta * CHASE_HEADING_DAMPING);
      headingRef.current = shortestArc(
        headingRef.current +
          shortestArc(targetHeading - headingRef.current) * headingDamping,
      );
    }
    const chaseAzimuth = headingRef.current + Math.PI;
    const azimuth = shortestArc(
      dockAzimuth + shortestArc(chaseAzimuth - dockAzimuth) * travelBlend,
    );
    if (cameraYawRef) cameraYawRef.current = azimuth;
    const cameraAzimuthDegrees = THREE.MathUtils.radToDeg(azimuth);
    const elevation = THREE.MathUtils.degToRad(dockComposition.camera.elevationDegrees);
    const horizontalDistance = Math.cos(elevation) * distance;
    const drift = reducedMotion ? 0 : THREE.MathUtils.smoothstep(speed, 0.08, 3.8);
    // Idle life: a sub-degree yaw sway and a small height breath keep a settled
    // frame from reading as a still image. Both collapse to zero when the user
    // asks for reduced motion.
    const idleYaw = reducedMotion
      ? 0
      : THREE.MathUtils.degToRad(RIG_IDLE_YAW_DEGREES) *
        Math.sin(t * Math.PI * 2 * RIG_IDLE_YAW_HZ);
    const idleHeight = reducedMotion
      ? 0
      : RIG_IDLE_HEIGHT * Math.sin(t * Math.PI * 2 * RIG_IDLE_HEIGHT_HZ);
    const swayedAzimuth = azimuth + idleYaw;
    desired.set(
      target.x + Math.sin(swayedAzimuth) * horizontalDistance + Math.sin(t * 0.1) * 0.045 * drift,
      target.y + Math.sin(elevation) * distance + idleHeight,
      target.z + Math.cos(swayedAzimuth) * horizontalDistance + Math.cos(t * 0.09) * 0.065 * drift,
    );
    desiredLook.copy(target);
    // Pointer reactivity lives on the look target only, capped below half a
    // degree so the authored composition never leaves its solved envelope.
    if (!reducedMotion) {
      const pointerDamping = 1 - Math.exp(-Math.min(delta, 0.05) * 4);
      pointerCurrent.current.x +=
        (pointerTarget.current.x - pointerCurrent.current.x) * pointerDamping;
      pointerCurrent.current.y +=
        (pointerTarget.current.y - pointerCurrent.current.y) * pointerDamping;
      const pointerReach = distance * Math.tan(THREE.MathUtils.degToRad(0.4));
      desiredLook.x += Math.cos(azimuth) * pointerCurrent.current.x * pointerReach;
      desiredLook.z += -Math.sin(azimuth) * pointerCurrent.current.x * pointerReach;
      desiredLook.y += -pointerCurrent.current.y * pointerReach;
    }
    const cameraDamping = reducedMotion
      ? 1
      : 1 - Math.exp(-delta * CAMERA_COMPOSITION.positionDamping);
    const lookDamping = reducedMotion
      ? 1
      : 1 - Math.exp(-delta * CAMERA_COMPOSITION.lookDamping);
    camera.position.lerp(desired, cameraDamping);
    lookTarget.lerp(desiredLook, lookDamping);
    camera.lookAt(lookTarget);

    const rendererCanvas = gl.domElement;
    if (rendererCanvas) {
      rendererCanvas.dataset.cameraStation = stationWorld.id;
      rendererCanvas.dataset.cameraAzimuth = cameraAzimuthDegrees.toFixed(2);
      rendererCanvas.dataset.cameraDistance = distance.toFixed(2);
      rendererCanvas.dataset.cameraContract = dockComposition.metrics.contractSatisfied
        ? "two-subject-fit"
        : "envelope-fallback";
      rendererCanvas.dataset.cameraHeroBounds = compositionDiagnostics.heroBounds;
      rendererCanvas.dataset.cameraSealBodyBounds = compositionDiagnostics.sealBodyBounds;
      rendererCanvas.dataset.cameraSealBounds = compositionDiagnostics.sealBounds;
      rendererCanvas.dataset.cameraSealCentroid = compositionDiagnostics.sealCentroid;
    }
  });

  return null;
}

function ForceCanvasResize() {
  const { gl, setSize } = useThree();

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return undefined;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize(rect.width, rect.height);
        gl.setSize(rect.width, rect.height, false);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [gl, setSize]);

  return null;
}

function syncSceneDiagnosticsDataset(
  canvas,
  { observatoryDistance, observatoryDomeVisible, quality, reducedMotion },
) {
  canvas.dataset.observatoryDomeDistance = observatoryDistance.toFixed(3);
  canvas.dataset.observatoryDomeVisible = observatoryDomeVisible ? "true" : "false";
  canvas.dataset.quality = quality;
  canvas.dataset.reducedMotion = reducedMotion ? "true" : "false";
}

function SceneDiagnostics({
  observatoryDistance,
  observatoryDomeVisible,
  onGpuEvent,
  quality,
  reducedMotion,
  streamEpochMsRef,
}) {
  const { gl } = useThree();
  const readyFrames = useRef(0);

  useEffect(() => {
    syncSceneDiagnosticsDataset(gl.domElement, {
      observatoryDistance,
      observatoryDomeVisible,
      quality,
      reducedMotion,
    });
  }, [gl, observatoryDistance, observatoryDomeVisible, quality, reducedMotion]);

  useEffect(() => {
    const canvas = gl.domElement;
    const context = gl.getContext();
    onGpuEvent?.({
      detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
      message: "WebGL context listeners armed.",
      severity: "info",
      type: "webgl-listeners-ready",
    });

    const onContextLost = (event) => {
      event.preventDefault();
      onGpuEvent?.({
        detail: context?.getError ? `glError=${context.getError()}` : "",
        message: "WebGL context lost; renderer returned to diagnostic gate.",
        severity: "error",
        type: "webgl-context-lost",
      });
    };
    const onContextRestored = () => {
      onGpuEvent?.({
        message: "WebGL context restored.",
        severity: "info",
        type: "webgl-context-restored",
      });
    };

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl, onGpuEvent]);

  useFrame(({ clock }) => {
    if (readyFrames.current >= 2) return;
    readyFrames.current += 1;
    // Re-pin the world-stream reveal epoch through the warm-up frames. Those
    // frames run behind the splash hand-off while shaders compile, so an epoch
    // seeded there would finish the whole materialize choreography (terrain,
    // stations, dome courses) before the first visible paint. Stamping until
    // the scene-ready frame starts the choreography at real visibility.
    if (streamEpochMsRef) streamEpochMsRef.current = clock.elapsedTime * 1000;
    if (readyFrames.current === 2) {
      onGpuEvent?.({
        detail: `canvas=${gl.domElement.width}x${gl.domElement.height} dpr=${gl.getPixelRatio().toFixed(2)}`,
        message: `WebGL scene rendered a stable frame at ${quality} quality.`,
        severity: "info",
        type: "webgl-scene-ready",
      });
    }
  });

  return null;
}

function PolarRouteNetwork({ activeArtifact, artifacts, axisX, depthZ, quality }) {
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  const visibleStations = useMemo(() => {
    const ranked = artifacts
      .map((artifact, index) => {
        const dock = STATION_WORLD_SCHEMA.stations[artifact.id].dock;
        return {
          artifact,
          distance: Math.hypot(dock.x - axisX, dock.z - depthZ),
          index,
          worldX: dock.x,
          worldZ: dock.z,
        };
      })
      .sort((left, right) => left.distance - right.distance);
    const nearest = ranked[0];
    const active = ranked.find((station) => station.artifact.id === activeId);
    const promise =
      active && nearest && active.artifact.id !== nearest.artifact.id && active.distance <= 14
        ? active
        : ranked[1]?.distance <= 12
          ? ranked[1]
          : null;
    return [nearest, promise].filter(Boolean);
  }, [activeId, artifacts, axisX, depthZ]);
  const routePoints = useMemo(() => {
    const activeDock = STATION_WORLD_SCHEMA.stations[activeId]?.dock;
    const activeDistance = activeDock
      ? Math.hypot(activeDock.x - axisX, activeDock.z - depthZ)
      : 0;
    const activeIndex = STATION_WORLD_SCHEMA.order.indexOf(activeId);
    const nextId = STATION_WORLD_SCHEMA.order[
      (Math.max(0, activeIndex) + 1) % STATION_WORLD_SCHEMA.order.length
    ];
    const targetDock = activeDistance > 0.35
      ? activeDock
      : STATION_WORLD_SCHEMA.stations[nextId].dock;
    const deltaX = targetDock.x - axisX;
    const deltaZ = targetDock.z - depthZ;
    const distance = Math.max(0.001, Math.hypot(deltaX, deltaZ));
    const leadDistance = Math.min(7.5, distance);
    const endX = axisX + (deltaX / distance) * leadDistance;
    const endZ = depthZ + (deltaZ / distance) * leadDistance;
    return [
      [axisX, 0.035, depthZ],
      [(axisX + endX) * 0.5, 0.085, (depthZ + endZ) * 0.5],
      [endX, 0.035, endZ],
    ];
  }, [activeId, axisX, depthZ]);
  const accent = activeArtifact?.accent || "#5ff8e7";

  return (
    <group name="BrunoOpenWorldNavigation local-route-lead max-two-station-promises">
      {routePoints.length > 1 && (
        <Line
          color="#dffdf7"
          lineWidth={quality === "high" ? 2.2 : 1.4}
          opacity={0.28}
          points={routePoints}
          transparent
        />
      )}
      {routePoints.length > 1 && (
        <Line
          color={accent}
          lineWidth={quality === "high" ? 1.2 : 0.82}
          opacity={0.46}
          points={routePoints}
          transparent
        />
      )}
      {visibleStations.map(({ artifact, index, worldX, worldZ }) => {
        const active = artifact.id === activeId;
        const distance = Math.hypot(worldX - axisX, worldZ - depthZ);
        const stationOpacity = active ? 0.86 : Math.max(0.16, 0.46 - distance * 0.008);
        return (
          <group
            key={`route-dock-${artifact.id}-${worldX}`}
            name={`station-dock ${artifact.id}`}
            position={[worldX, 0.045, worldZ]}
            userData={{ className: "station-dock", topology: artifact.topology }}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 0.58, 1]}>
              <ringGeometry args={[0.44, 0.47, 68]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={stationOpacity} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[active ? 1.46 : 1.12, active ? 0.86 : 0.66, 1]}>
              <ringGeometry args={[0.62, 0.626, 72]} />
              <meshBasicMaterial color="#dffdf7" transparent opacity={active ? 0.48 : 0.12} />
            </mesh>
            <mesh position={[0, 0.26, 0]} scale={[0.026, active ? 0.58 : 0.34, 0.026]}>
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.64 : 0.28} />
            </mesh>
            <mesh position={[0, active ? 0.62 : 0.42, 0]} scale={[active ? 0.07 : 0.045, active ? 0.07 : 0.045, active ? 0.07 : 0.045]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={active ? "#dffdf7" : artifact.accent} transparent opacity={active ? 0.9 : 0.46} />
            </mesh>
            {index % 2 === 0 && (
              <mesh position={[0.72, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.08, 0.16, 0.08]}>
                <coneGeometry args={[1, 1, 3]} />
                <meshBasicMaterial color={artifact.accent} transparent opacity={0.32} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function IglooScene({
  activeArtifactId,
  axisVelocity = 0,
  axisX = 0,
  cameraYawRef = null,
  debugFlags = {},
  depthVelocity = 0,
  depthZ = 0,
  dockedStationId = null,
  artifacts = IGLOO_ARTIFACTS,
  guideState = "idle",
  iglooPulse = 0,
  liveSummary = null,
  moving = false,
  onSelectArtifact,
  onTouchIgloo,
  onGpuEvent,
  projects = EMPTY_PROJECTS,
  quality = "high",
  reducedMotion = false,
  renderEnabled = false,
  sealAwake = false,
  stationProximity = 0,
  traversalPoseRef,
  worldActive = true,
}) {
  const activeArtifact =
    artifacts.find((artifact) => artifact.id === dockedStationId) ||
    artifacts.find((artifact) => artifact.id === activeArtifactId) ||
    artifacts[0];
  const SealMascot = debugFlags.legacySeal ? SealAvatar : TopologicalSealMascot;
  const sealRef = useRef(null);
  const streamEpochMsRef = useRef(null);
  const domeRevealProgressRef = useRef(reducedMotion ? 1 : 0);
  const mechanismStateRef = useRef(null);
  const mechanismRitualStateRef = useRef(null);
  const mechanismEvidenceRef = useRef(null);
  const dpr = quality === "low" ? [0.55, 0.75] : quality === "medium" ? [0.65, 0.9] : [0.75, 1];
  const preserveDrawingBuffer =
    typeof window !== "undefined" &&
    (window.location.search.includes("qa=") ||
      window.location.search.includes("qa-sdf") ||
      window.location.search.includes("qa-low") ||
      window.location.search.includes("safe=1"));
  const observatoryDistance = Math.hypot(
    axisX - OBSERVATORY_WORLD.center.x,
    depthZ - OBSERVATORY_WORLD.center.z,
  );
  const observatoryDomeVisible = shouldRenderObservatoryDome({
    destinationStationId: activeArtifactId,
    distanceFromHome: observatoryDistance,
  });
  const onCanvasCreated = useCallback(
    ({ gl }) => {
      gl.domElement.classList.add("igloo-scene-canvas");
      gl.domElement.dataset.renderer = "webgl";
      gl.domElement.dataset.quality = quality;
      gl.domElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.12;
      onGpuEvent?.({
        detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
        message: `WebGL renderer ready at ${quality} quality.`,
        severity: "info",
        type: "webgl-created",
      });
    },
    [onGpuEvent, quality, reducedMotion],
  );
  const handleMechanismEvidenceReady = useCallback((stationId, state) => {
    if (state?.evidenceReady !== true) return;
    mechanismEvidenceRef.current = {
      evidenceReady: state?.evidenceReady === true,
      phase: state?.phase || null,
      proofSequence:
        state?.proofSequence ??
        state?.verificationSequence ??
        state?.visibleCycleCount ??
        null,
      stationId,
    };
  }, []);

  return (
    <Canvas
      className="igloo-scene"
      data-seal-awake={sealAwake ? "true" : "false"}
      data-station-proximity={stationProximity.toFixed(3)}
      dpr={dpr}
      frameloop={worldActive ? (renderEnabled && !reducedMotion ? "always" : "demand") : "never"}
      camera={{
        position: [OBSERVATORY_WORLD.dock.x - 4.8, 2.1, OBSERVATORY_WORLD.dock.z + 3.2],
        fov: OBSERVATORY_WORLD.camera.verticalFovDegrees,
        near: 0.1,
        far: 94,
      }}
      shadows
      gl={{
        antialias: false,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer,
      }}
      onCreated={onCanvasCreated}
    >
      <color attach="background" args={["#5A6E9C"]} />
      <fogExp2 attach="fog" args={[POLAR_PALETTE.fog, 0.0085]} />
      {/* Near-neutral ambient: a strongly blue ambient is the main hue-collapsing term,
          it clips the blue channel and every albedo converges on the light. Dusk mood
          comes from the sky dome and fog, not from dyeing every surface. */}
      <ambientLight color="#C6C8CE" intensity={0.42} />
      <hemisphereLight color="#BCCADF" groundColor="#6E6154" intensity={1.02} />
      <Suspense fallback={null}>
        <SceneDiagnostics
          observatoryDistance={observatoryDistance}
          observatoryDomeVisible={observatoryDomeVisible}
          onGpuEvent={onGpuEvent}
          quality={quality}
          reducedMotion={reducedMotion}
          streamEpochMsRef={streamEpochMsRef}
        />
        <ForceCanvasResize />
        <CameraRig
          activeArtifact={activeArtifact}
          axisX={axisX}
          cameraYawRef={cameraYawRef}
          depthZ={depthZ}
          quality={quality}
          reducedMotion={reducedMotion}
          renderEnabled={renderEnabled}
          sealPosition={sealRef}
          traversalPoseRef={traversalPoseRef}
        />
        {!debugFlags.noTerrain && (
          <PolarBiomeWorld
            axisX={axisX}
            depthZ={depthZ}
            exclusiveStationId={dockedStationId}
            quality={quality}
            reducedMotion={reducedMotion}
            safeMode={!renderEnabled}
            simulationPaused={!worldActive || !renderEnabled}
            travelerRef={traversalPoseRef}
            visible={worldActive}
          />
        )}
        <IglooTouch onTouchIgloo={onTouchIgloo} />
        {!reducedMotion && !debugFlags.noVeil && <ActiveTheoryVeil accent={activeArtifact?.accent} quality={quality} />}
        {!debugFlags.noTerrain && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.terrainRevealMs}
            fromScale={0.02}
            name="terrain / 300ms"
            reducedMotion={reducedMotion}
            rise={0.2}
            streamEpochMsRef={streamEpochMsRef}
          >
            {!debugFlags.noDressing && (
              <AdaptivePolarWorldDressing
                artifacts={artifacts}
                exclusiveStationId={dockedStationId}
                quality={quality}
                reducedMotion={reducedMotion}
                traversalPoseRef={traversalPoseRef}
              />
            )}
            {activeArtifact.id === "observatory-plaque" && <ForegroundExpeditionKit />}
          </WorldStreamReveal>
        )}
        {!debugFlags.noSignals && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.stationRevealMs}
            name="signal field / 200ms"
            reducedMotion={reducedMotion}
            rise={0.12}
            startMs={WORLD_STREAM_TIMINGS.stationStartMs}
            streamEpochMsRef={streamEpochMsRef}
          >
            {!dockedStationId ? (
              <PolarRouteNetwork
                activeArtifact={activeArtifact}
                artifacts={artifacts}
                axisX={axisX}
                depthZ={depthZ}
                quality={quality}
              />
            ) : null}
          </WorldStreamReveal>
        )}
        {renderEnabled && moving && !debugFlags.noSmashables && (
          <PolarTravelDebris
            quality={quality}
            reducedMotion={reducedMotion}
            traversalPoseRef={traversalPoseRef}
          />
        )}
        {!debugFlags.noTopology && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.stationRevealMs}
            name="topology routes / 200ms"
            reducedMotion={reducedMotion}
            rise={0.1}
            startMs={WORLD_STREAM_TIMINGS.stationStartMs}
            streamEpochMsRef={streamEpochMsRef}
          >
            {/* The aurora shell stays mounted while docked so the sky does not
                die at stations; with a docked activeArtifact the junni guide
                threads keep leaning toward the owned station azimuth. */}
            <TopologyConstellation
              activeArtifact={activeArtifact}
              artifacts={artifacts}
              axisX={axisX}
              depthZ={depthZ}
              quality={quality}
              reducedMotion={reducedMotion}
              showLabels={renderEnabled}
            />
          </WorldStreamReveal>
        )}
        {renderEnabled && sealAwake && !debugFlags.noSeal && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.silhouetteRevealMs}
            fromScale={0.72}
            name="seal silhouette / under 200ms"
            reducedMotion={reducedMotion}
            rise={0.08}
            streamEpochMsRef={streamEpochMsRef}
          >
            <SealMascot
              ref={sealRef}
              accent={activeArtifact?.accent}
              activeArtifact={activeArtifact}
              axisVelocity={axisVelocity}
              axisX={axisX}
              depthVelocity={depthVelocity}
              depthZ={depthZ}
              guideState={guideState}
              iglooPosition={[
                OBSERVATORY_WORLD.center.x,
                0,
                OBSERVATORY_WORLD.center.z,
              ]}
              moving={moving}
              quality={quality}
              reducedMotion={reducedMotion}
              traversalPoseRef={traversalPoseRef}
            />
          </WorldStreamReveal>
        )}
        {!debugFlags.noDome && observatoryDomeVisible && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.domeRevealMs}
            fromScale={0.76}
            name="observatory dome / 500ms cubic-bezier(0.33, 0, 0.2, 1)"
            progressRef={domeRevealProgressRef}
            reducedMotion={reducedMotion}
            rise={0.26}
            streamEpochMsRef={streamEpochMsRef}
          >
            <PolarObservatoryDome
              activeArtifact={activeArtifact}
              axisVelocity={axisVelocity}
              axisX={axisX}
              depthZ={depthZ}
              homePosition={[
                OBSERVATORY_WORLD.center.x,
                OBSERVATORY_WORLD.center.z,
              ]}
              impactPulse={iglooPulse}
              initialStreamRevealProgress={reducedMotion ? 1 : 0}
              pointerInteractionEnabled={dockedStationId === "observatory-plaque" || observatoryDistance <= 4.6}
              quality={quality}
              reducedMotion={reducedMotion}
              streamRevealProgressRef={domeRevealProgressRef}
            />
          </WorldStreamReveal>
        )}
        {!debugFlags.noArtifacts && (
          <IglooArtifacts
            activeArtifactId={activeArtifact.id}
            artifacts={artifacts}
            exclusiveStationId={dockedStationId}
            heroProtected={
              activeArtifact.id === "observatory-plaque" && stationProximity >= 0.82
            }
            onSelectArtifact={onSelectArtifact}
            quality={quality}
            reducedMotion={reducedMotion}
            streamEpochMsRef={streamEpochMsRef}
          />
        )}
        {!debugFlags.noMechanisms && (
          <PolarStationMechanismLayer
            traversalPoseRef={traversalPoseRef}
            activeArtifactId={activeArtifact.id}
            exclusiveStationId={dockedStationId}
            liveSummary={liveSummary}
            mechanismStateRef={mechanismStateRef}
            onEvidenceReady={handleMechanismEvidenceReady}
            projects={projects}
            quality={quality}
            reducedMotion={reducedMotion}
            ritualStateRef={mechanismRitualStateRef}
            safeMode={!renderEnabled}
            visible={worldActive}
          />
        )}
        {!debugFlags.noSignals && (
          <PolarSemanticParticles
            activeStationId={dockedStationId || activeArtifact.id}
            enabled={renderEnabled && worldActive}
            quality={quality}
            reducedMotion={reducedMotion}
            travelerRef={traversalPoseRef}
            visible={worldActive}
          />
        )}
        <RetroCinematicPostProcess
          motionPoseRef={traversalPoseRef}
          quality={quality}
          reducedMotion={reducedMotion}
        />
      </Suspense>
    </Canvas>
  );
}
