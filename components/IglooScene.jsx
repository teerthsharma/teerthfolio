"use client";

import { Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import ActiveTheoryVeil from "./ActiveTheoryVeil";
import IglooArtifacts, { IGLOO_ARTIFACTS } from "./IglooArtifacts";
import IglooTerrain from "./IglooTerrain";
import IglooTouch from "./IglooTouch";
import PolarObservatoryDome from "./PolarObservatoryDome";
import RetroCinematicPostProcess, { GLOBAL_RETRO_POST_PROFILE } from "./RetroCinematicPostProcess";
import SealAvatar from "./SealAvatar";
import SnowAtmosphere from "./SnowAtmosphere";
import TopologyConstellation from "./TopologyConstellation";

export const OBSERVATORY_HOME_X = 0;
export const OBSERVATORY_VISUAL_HOME_X = 2.65;
export const WORLD_AXIS_LENGTH = 128;
export const WORLD_AXIS_WIDTH = 18;
export const TERRAIN_CHUNK_LENGTH = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const WORLD_RENDER_WINDOW_NOTE = "Pokemon-style bounded render window over an infinite logical polar field";
export const SCENE_LIGHT_BUDGET = "uplifted-polar-pbr";
export const SCENE_POST_PROFILE = GLOBAL_RETRO_POST_PROFILE;
export const CAMERA_DAMPING_PROFILE = "Abeto-style frame-rate independent camera damping with smoothed look target";

function nearestLoopedX(baseX, axisX, loopLength = WORLD_AXIS_LENGTH) {
  return baseX + Math.round((axisX - baseX) / loopLength) * loopLength;
}

function CameraRig({ activeArtifact, axisX, depthZ, quality, renderEnabled, sealPosition }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.7, 0), []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const seal = sealPosition.current;
    // The observatory is offset from the logical axis; bias idle framing toward the physical object.
    const portrait = size.width < 900;
    const compact = size.width < 520;
    const sealHasDeparted = seal ? Math.abs(seal.position.x - OBSERVATORY_VISUAL_HOME_X) > 2.8 || Math.abs(seal.position.z) > 2.2 : false;
    const stationX = activeArtifact
      ? activeArtifact.position[0] + Math.round((axisX - activeArtifact.position[0]) / WORLD_AXIS_LENGTH) * WORLD_AXIS_LENGTH
      : OBSERVATORY_VISUAL_HOME_X;
    const stationZ = activeArtifact ? activeArtifact.position[2] * 2.4 : 0;
    const stationMode = Boolean(activeArtifact && activeArtifact.id !== "observatory-plaque");
    const worldFocusMode = stationMode || sealHasDeparted;
    const sealWeight = sealHasDeparted ? (compact ? 0.16 : portrait ? 0.24 : 0.36) : compact ? 0.08 : portrait ? 0.12 : 0.14;
    const depthWeight = sealHasDeparted ? (compact ? 0.26 : portrait ? 0.36 : 0.46) : compact ? 0.1 : portrait ? 0.16 : 0.2;
    const idleObjectAnchor = compact ? 1.82 : portrait ? 1.78 : 2.34;
    const fallbackSealX = axisX + 0.18;
    const fallbackSealZ = depthZ + 1.96;
    const sealX = seal?.position.x ?? fallbackSealX;
    const sealZ = seal?.position.z ?? fallbackSealZ;
    const stationBlend = compact ? 0.4 : portrait ? 0.46 : 0.52;
    const focusX = worldFocusMode
      ? THREE.MathUtils.lerp(sealX, stationX, stationBlend)
      : renderEnabled && seal
        ? THREE.MathUtils.lerp(idleObjectAnchor, seal.position.x, sealWeight)
        : idleObjectAnchor;
    const focusZ = worldFocusMode
      ? THREE.MathUtils.lerp(sealZ, stationZ, compact ? 0.34 : portrait ? 0.4 : 0.46)
      : renderEnabled && seal
        ? THREE.MathUtils.lerp(0, seal.position.z, depthWeight)
        : depthZ * 0.12;
    const homeFrameBias = worldFocusMode ? 0 : compact ? 0.04 : portrait ? 0.08 : 0.12;
    const targetY = worldFocusMode ? (compact ? 0.72 : portrait ? 0.68 : 0.74) : compact ? 0.78 : portrait ? 0.64 : 0.78;
    target.set(focusX + homeFrameBias, targetY, focusZ);
    const baseDistance = worldFocusMode
      ? portrait
        ? quality === "low"
          ? 7.7
          : quality === "medium"
            ? 6.95
            : 6.55
        : quality === "low"
          ? 5.55
          : quality === "medium"
            ? 5.05
            : 4.72
      : portrait
        ? quality === "low"
          ? 11.55
          : quality === "medium"
            ? 9.95
            : 9.35
        : quality === "low"
          ? 9.7
          : quality === "medium"
            ? 8.35
            : 7.85;
    const distance = baseDistance + (compact ? (worldFocusMode ? 2.2 : 3.25) : portrait ? (worldFocusMode ? 0.62 : 0.35) : 0);
    desired.set(
      target.x - (worldFocusMode ? (compact ? 0.1 : portrait ? 0.16 : 0.08) : compact ? 0.32 : portrait ? 0.44 : 0.18) + Math.sin(t * 0.1) * 0.08,
      target.y + distance * (portrait ? (worldFocusMode ? 0.3 : 0.245) : worldFocusMode ? 0.34 : 0.285),
      target.z + distance * (portrait ? (worldFocusMode ? 0.9 : 0.8) : worldFocusMode ? 0.9 : 0.84) + Math.cos(t * 0.09) * 0.12,
    );
    const cameraDamping = 1 - Math.exp(-delta * (worldFocusMode ? 5.8 : 4.3));
    const lookDamping = 1 - Math.exp(-delta * (worldFocusMode ? 7.2 : 5.2));
    camera.position.lerp(desired, cameraDamping);
    desiredLook.set(
      target.x + (compact ? 0.04 : portrait ? 0.08 : 0.02),
      target.y + (worldFocusMode ? (compact ? -0.18 : portrait ? -0.38 : -0.08) : compact ? -0.14 : portrait ? -1.36 : 0.04),
      target.z - 0.1,
    );
    lookTarget.lerp(desiredLook, lookDamping);
    camera.lookAt(lookTarget);
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

function SceneDiagnostics({ onGpuEvent, quality }) {
  const { gl } = useThree();
  const readyFrames = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const context = gl.getContext();
    onGpuEvent?.({
      detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
      message: `WebGL context listeners armed at ${quality} quality.`,
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
  }, [gl, onGpuEvent, quality]);

  useFrame(() => {
    if (readyFrames.current >= 2) return;
    readyFrames.current += 1;
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

function RendererFallback({ onGpuEvent }) {
  useEffect(() => {
    onGpuEvent?.({
      message: "Renderer is waiting for texture and geometry assets.",
      severity: "info",
      type: "asset-suspense",
    });
  }, [onGpuEvent]);

  return (
    <group name="RendererFallback">
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[1.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#dffdf7" transparent opacity={0.14} wireframe />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.01, 6, 72]} />
        <meshBasicMaterial color="#5ff8e7" transparent opacity={0.36} />
      </mesh>
    </group>
  );
}

function HorizontalParallaxSignalField({ activeArtifact, axisX, quality }) {
  const root = useRef(null);
  const accent = activeArtifact?.accent || "#5ff8e7";
  const pylonCount = quality === "low" ? 12 : quality === "medium" ? 18 : 24;
  const pylonOffsets = useMemo(
    () => Array.from({ length: pylonCount }, (_, index) => index - Math.floor(pylonCount / 2)),
    [pylonCount],
  );
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cyanMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#dffdf7", transparent: true, opacity: 0.055, depthWrite: false }),
    [],
  );
  const accentMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.24, depthWrite: false }),
    [accent],
  );
  const pylonBase = Math.round(axisX / 4);

  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.position.z = Math.sin(clock.elapsedTime * 0.16) * 0.05;
  });

  useEffect(
    () => () => {
      boxGeometry.dispose();
      cyanMaterial.dispose();
      accentMaterial.dispose();
    },
    [accentMaterial, boxGeometry, cyanMaterial],
  );

  return (
    <group ref={root} name="HorizontalParallaxSignalField">
      {pylonOffsets.map((offset, index) => {
        const x = (pylonBase + offset) * 4 + ((index % 3) - 1) * 0.18;
        const z = -7.2 + (index % 8) * 2.05;
        return (
          <group key={`pylon-${x}-${index}`} position={[x, 0.18, z]}>
            <mesh geometry={boxGeometry} material={cyanMaterial} scale={[0.016, 0.42 + (index % 4) * 0.05, 0.016]} />
            <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.34 + (index % 3) * 0.05, 0.004, 6, 52]} />
              <meshBasicMaterial color={index % 5 === 0 ? accent : "#dffdf7"} transparent opacity={index % 5 === 0 ? 0.22 : 0.07} />
            </mesh>
          </group>
        );
      })}
      {IGLOO_ARTIFACTS.map((artifact, index) => {
        const worldX = nearestLoopedX(artifact.position[0], axisX);
        const distance = Math.abs(worldX - axisX);
        const activeOpacity = Math.max(0.08, 0.36 - distance * 0.045);
        return (
          <group key={`world-gate-${artifact.id}`} position={[worldX, 0.08, artifact.position[2] * 2.72]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.72 + (index % 2) * 0.1, 0.006, 8, 76]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={activeOpacity} />
            </mesh>
            <mesh geometry={boxGeometry} material={accentMaterial} position={[0, 0.36, 0]} scale={[0.018, 0.42, 0.018]} />
          </group>
        );
      })}
    </group>
  );
}

function PolarRouteNetwork({ activeArtifact, artifacts, axisX, quality }) {
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  const visibleRange = quality === "low" ? 34 : quality === "medium" ? 46 : 58;
  const visibleStations = useMemo(
    () =>
      artifacts
        .map((artifact, index) => ({
          artifact,
          index,
          worldX: nearestLoopedX(artifact.position[0], axisX),
          worldZ: artifact.position[2] * 2.72,
        }))
        .filter((station) => Math.abs(station.worldX - axisX) <= visibleRange)
        .sort((a, b) => a.worldX - b.worldX),
    [artifacts, axisX, visibleRange],
  );
  const routePoints = useMemo(
    () => visibleStations.map((station) => [station.worldX, 0.035, station.worldZ]),
    [visibleStations],
  );
  const accent = activeArtifact?.accent || "#5ff8e7";

  return (
    <group name="BrunoOpenWorldNavigation seal-docking-route station-docks">
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
        const distance = Math.abs(worldX - axisX);
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

const SMASHABLE_FIELD_OBJECTS = ["fish", "ice-proof-crate", "homology-shard", "frozen-byte"];

function SmashableObject({ item, axisX, depthZ, axisVelocity, depthVelocity, accent }) {
  const root = useRef(null);
  const hit = useRef(0);
  const spin = useRef(0);
  const movement = Math.min(1, Math.abs(axisVelocity) + Math.abs(depthVelocity));

  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const dx = item.position[0] - axisX;
    const dz = item.position[2] - depthZ;
    const distance = Math.hypot(dx, dz);
    if (distance < item.radius && movement > 0.08) {
      hit.current = Math.min(1, hit.current + 0.13 + movement * 0.05);
      spin.current += 0.22 + movement * 0.24;
    } else {
      hit.current = Math.max(0, hit.current - 0.018);
      spin.current *= 0.986;
    }

    const smash = hit.current;
    root.current.position.set(
      item.position[0] + Math.sign(dx || 1) * smash * 0.4,
      item.position[1] + Math.sin(t * 1.3 + item.seed) * 0.035 + smash * 0.42,
      item.position[2] + Math.sign(dz || 1) * smash * 0.34,
    );
    root.current.rotation.x = item.rotation[0] + smash * 0.7 + spin.current * 0.14;
    root.current.rotation.y = item.rotation[1] + spin.current;
    root.current.rotation.z = item.rotation[2] + smash * 0.42;
    root.current.scale.setScalar(1 + smash * 0.14);
  });

  const hot = hit.current > 0.02;
  const color = item.type === "fish" ? "#eafef8" : item.type === "ice-proof-crate" ? "#8fb7c3" : "#c8d5df";

  return (
    <group ref={root} name={`smashable-${item.type}`} position={item.position} rotation={item.rotation}>
      {item.type === "fish" && (
        <group name="topology fish obstacle">
          <mesh scale={[0.2, 0.055, 0.085]}>
            <sphereGeometry args={[1, 18, 10]} />
            <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={hot ? 0.36 : 0.08} metalness={0.04} roughness={0.38} transparent opacity={0.86} />
          </mesh>
          <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.12, 0.08, 0.06]}>
            <coneGeometry args={[1, 1, 3]} />
            <meshStandardMaterial color="#c8d5df" emissive={accent} emissiveIntensity={0.08} roughness={0.44} />
          </mesh>
          <mesh position={[0.13, 0.026, 0.05]} scale={[0.014, 0.014, 0.008]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#010304" />
          </mesh>
        </group>
      )}
      {item.type === "ice-proof-crate" && (
        <mesh scale={[0.18, 0.18, 0.18]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={hot ? 0.28 : 0.06} metalness={0.06} roughness={0.72} transparent opacity={0.74} />
        </mesh>
      )}
      {item.type !== "fish" && item.type !== "ice-proof-crate" && (
        <mesh scale={[0.14, 0.22, 0.09]} rotation={[0.4, 0.2, 0.14]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={hot ? 0.34 : 0.08} metalness={0.08} roughness={0.5} transparent opacity={0.78} />
        </mesh>
      )}
    </group>
  );
}

function PolarSmashables({ accent, axisX, depthZ, axisVelocity, depthVelocity, quality }) {
  const density = quality === "low" ? 8 : quality === "medium" ? 12 : 18;
  const baseChunk = Math.round(axisX / 4);
  const objects = useMemo(
    () =>
      Array.from({ length: density }, (_, index) => {
        const offset = index - Math.floor(density / 2);
        const seed = index * 11.73;
        const type = SMASHABLE_FIELD_OBJECTS[index % SMASHABLE_FIELD_OBJECTS.length];
        const x = (baseChunk + offset) * 4 + Math.sin(seed) * 0.92;
        const z = -5.4 + ((index * 1.91) % 10.8) + Math.cos(seed * 0.4) * 0.26;
        return {
          type,
          seed,
          radius: type === "fish" ? 0.74 : 0.62,
          position: [x, 0.18 + (index % 3) * 0.035, z],
          rotation: [Math.sin(seed) * 0.18, seed * 0.2, Math.cos(seed) * 0.12],
        };
      }),
    [baseChunk, density],
  );

  return (
    <group name="PolarSmashables">
      {objects.map((item, index) => (
        <SmashableObject
          accent={accent}
          axisVelocity={axisVelocity}
          axisX={axisX}
          depthVelocity={depthVelocity}
          depthZ={depthZ}
          item={item}
          key={`polar-smashable-${baseChunk}-${index}`}
        />
      ))}
    </group>
  );
}

export default function IglooScene({
  activeArtifactId,
  axisVelocity = 0,
  axisX = 0,
  debugFlags = {},
  depthVelocity = 0,
  depthZ = 0,
  artifacts = IGLOO_ARTIFACTS,
  iglooPulse = 0,
  moving = false,
  onSelectArtifact,
  onTouchIgloo,
  onGpuEvent,
  quality = "high",
  reducedMotion = false,
  renderEnabled = false,
  sealAwake = false,
}) {
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) || artifacts[0];
  const sealRef = useRef(null);
  const dpr = quality === "low" ? [0.55, 0.75] : quality === "medium" ? [0.65, 0.9] : [0.75, 1];
  const preserveDrawingBuffer =
    typeof window !== "undefined" &&
    (window.location.search.includes("qa=") ||
      window.location.search.includes("qa-sdf") ||
      window.location.search.includes("qa-low") ||
      window.location.search.includes("safe=1"));
  const onCanvasCreated = useCallback(
    ({ gl }) => {
      gl.domElement.classList.add("igloo-scene-canvas");
      gl.domElement.dataset.renderer = "webgl";
      gl.domElement.dataset.quality = quality;
      gl.domElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.08;
      onGpuEvent?.({
        detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
        message: `WebGL renderer ready at ${quality} quality.`,
        severity: "info",
        type: "webgl-created",
      });
    },
    [onGpuEvent, quality, reducedMotion],
  );

  return (
    <Canvas
      className="igloo-scene"
      data-seal-awake={sealAwake ? "true" : "false"}
      dpr={dpr}
      frameloop={renderEnabled && !reducedMotion ? "always" : "demand"}
      camera={{ position: [0, 4.35, 14.2], fov: 47, near: 0.1, far: 94 }}
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
      <color attach="background" args={["#1d5870"]} />
      <fog attach="fog" args={["#c8f6ff", 14, 62]} />
      <ambientLight intensity={0.24} />
      <hemisphereLight color="#f6fffb" groundColor="#38507a" intensity={0.42} />
      <directionalLight
        castShadow
        color="#ffffff"
        intensity={2.05}
        position={[4.2, 7.4, 5.6]}
        shadow-bias={-0.00018}
        shadow-camera-bottom={-5.5}
        shadow-camera-far={18}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={5.5}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight color="#c9a7ff" intensity={0.38} position={[-5.6, 3.4, -3.8]} />
      <pointLight color={activeArtifact?.accent || "#6ee7ff"} distance={8.5} intensity={0.58} position={[-3.8, 2.1, 2.2]} />
      <pointLight color="#fff0b0" distance={9.2} intensity={0.36} position={[1.4, 4.1, 5.8]} />
      <Suspense fallback={<RendererFallback onGpuEvent={onGpuEvent} />}>
        <SceneDiagnostics onGpuEvent={onGpuEvent} quality={quality} />
        <ForceCanvasResize />
        <CameraRig
          activeArtifact={activeArtifact}
          axisX={axisX}
          depthZ={depthZ}
          quality={quality}
          renderEnabled={renderEnabled}
          sealPosition={sealRef}
        />
        <IglooTouch onTouchIgloo={onTouchIgloo} />
        {!reducedMotion && !debugFlags.noVeil && <ActiveTheoryVeil accent={activeArtifact?.accent} quality={quality} />}
        {!debugFlags.noTerrain && <IglooTerrain axisX={axisX} depthZ={depthZ} quality={quality} />}
        {!reducedMotion && !debugFlags.noSnow && (
          <SnowAtmosphere axisX={axisX} depthZ={depthZ} quality={quality} windSpeed={1 + Math.abs(axisVelocity) + Math.abs(depthVelocity)} />
        )}
        {!debugFlags.noSignals && <HorizontalParallaxSignalField activeArtifact={activeArtifact} axisX={axisX} quality={quality} />}
        {!debugFlags.noSignals && (
          <PolarRouteNetwork
            activeArtifact={activeArtifact}
            artifacts={artifacts}
            axisX={axisX}
            quality={quality}
          />
        )}
        {renderEnabled && moving && !debugFlags.noSmashables && (
          <PolarSmashables
            accent={activeArtifact?.accent}
            axisVelocity={axisVelocity}
            axisX={axisX}
            depthVelocity={depthVelocity}
            depthZ={depthZ}
            quality={quality}
          />
        )}
        {!debugFlags.noTopology && (
          <TopologyConstellation
            activeArtifact={activeArtifact}
            artifacts={artifacts}
            axisX={axisX}
            quality={quality}
            showLabels={renderEnabled}
          />
        )}
        {renderEnabled && sealAwake && !debugFlags.noSeal && (
          <SealAvatar
            ref={sealRef}
            accent={activeArtifact?.accent}
            activeArtifact={activeArtifact}
            axisVelocity={axisVelocity}
            axisX={axisX}
            depthVelocity={depthVelocity}
            depthZ={depthZ}
            iglooPosition={[OBSERVATORY_VISUAL_HOME_X, 0, 0]}
            moving={moving}
            onTouchIgloo={onTouchIgloo}
          />
        )}
        {!debugFlags.noDome && (
          <PolarObservatoryDome
            activeArtifact={activeArtifact}
            axisVelocity={axisVelocity}
            axisX={axisX}
            homeX={OBSERVATORY_VISUAL_HOME_X}
            impactPulse={iglooPulse}
            quality={quality}
          />
        )}
        {!debugFlags.noArtifacts && (
          <IglooArtifacts
            activeArtifactId={activeArtifactId}
            artifacts={artifacts}
            axisX={axisX}
            onSelectArtifact={onSelectArtifact}
          />
        )}
        <RetroCinematicPostProcess quality={quality} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
