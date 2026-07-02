"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import ActiveTheoryVeil from "./ActiveTheoryVeil";
import IglooArtifacts, { IGLOO_ARTIFACTS } from "./IglooArtifacts";
import IglooTerrain from "./IglooTerrain";
import IglooTouch from "./IglooTouch";
import PolarObservatoryDome from "./PolarObservatoryDome";
import SealAvatar from "./SealAvatar";
import SnowAtmosphere from "./SnowAtmosphere";
import TopologyConstellation from "./TopologyConstellation";

export const OBSERVATORY_HOME_X = 0;
export const OBSERVATORY_VISUAL_HOME_X = 1.85;
export const WORLD_AXIS_LENGTH = 128;
export const WORLD_AXIS_WIDTH = 18;
export const TERRAIN_CHUNK_LENGTH = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const WORLD_RENDER_WINDOW_NOTE = "Pokemon-style bounded render window over an infinite logical polar field";
export const SCENE_LIGHT_BUDGET = "dark-pbr-igloo";

function nearestLoopedX(baseX, axisX, loopLength = WORLD_AXIS_LENGTH) {
  return baseX + Math.round((axisX - baseX) / loopLength) * loopLength;
}

function CameraRig({ depthZ, quality, renderEnabled, sealPosition }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const seal = sealPosition.current;
    // The igloo at (0,0,0) is the centerpiece; keep it in frame when idle.
    const portrait = size.width < 900;
    const compact = size.width < 520;
    const sealHasDeparted = seal ? Math.abs(seal.position.x - OBSERVATORY_VISUAL_HOME_X) > 2.8 || Math.abs(seal.position.z) > 2.2 : false;
    const sealWeight = sealHasDeparted ? (compact ? 0.16 : portrait ? 0.24 : 0.36) : compact ? 0.08 : portrait ? 0.12 : 0.14;
    const depthWeight = sealHasDeparted ? (compact ? 0.26 : portrait ? 0.36 : 0.46) : compact ? 0.1 : portrait ? 0.16 : 0.2;
    const focusX = renderEnabled && seal ? THREE.MathUtils.lerp(OBSERVATORY_HOME_X, seal.position.x, sealWeight) : OBSERVATORY_HOME_X;
    const focusZ = renderEnabled && seal ? THREE.MathUtils.lerp(0, seal.position.z, depthWeight) : depthZ * 0.12;
    const homeFrameBias = sealHasDeparted ? 0 : compact ? 0.04 : portrait ? 0.08 : 0.12;
    target.set(focusX + homeFrameBias, 0.82, focusZ);
    const baseDistance = quality === "low" ? 13.1 : quality === "medium" ? 12.15 : 11.3;
    const distance = baseDistance + (compact ? 2.2 : portrait ? 1.55 : 0);
    desired.set(
      target.x - (compact ? 0.32 : portrait ? 0.44 : 0.18) + Math.sin(t * 0.1) * 0.08,
      target.y + distance * (portrait ? 0.29 : 0.285),
      target.z + distance * 0.88 + Math.cos(t * 0.09) * 0.12,
    );
    camera.position.lerp(desired, 0.05);
    camera.lookAt(target.x + (compact ? 0.06 : portrait ? 0.1 : 0.02), target.y + 0.02, target.z - 0.1);
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

  useEffect(() => {
    const canvas = gl.domElement;
    const context = gl.getContext();
    onGpuEvent?.({
      detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
      message: `WebGL renderer ready at ${quality} quality.`,
      severity: "info",
      type: "webgl-created",
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
  onTouchIgloo,
  onGpuEvent,
  quality = "high",
  renderEnabled = false,
  sealAwake = false,
}) {
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) || artifacts[0];
  const sealRef = useRef(null);
  const dpr = quality === "low" ? [0.55, 0.75] : quality === "medium" ? [0.65, 0.9] : [0.75, 1];

  return (
    <Canvas
      className="igloo-scene"
      data-seal-awake={sealAwake ? "true" : "false"}
      dpr={dpr}
      frameloop={renderEnabled ? "always" : "demand"}
      camera={{ position: [0, 3.45, 11.4], fov: 49, near: 0.1, far: 94 }}
      gl={{ antialias: false, alpha: true, failIfMajorPerformanceCaveat: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#061014"]} />
      <fog attach="fog" args={["#071316", 10, 42]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight color="#e8ffff" groundColor="#071316" intensity={0.58} />
      <directionalLight color="#ffffff" intensity={1.22} position={[3, 8, 5]} castShadow />
      <directionalLight color="#b8ffff" intensity={0.42} position={[-4, 4, -3]} />
      <pointLight color="#5ff8e7" intensity={1.2} position={[-3.8, 1.7, 2.2]} />
      <pointLight color="#ffffff" intensity={0.36} position={[0, 3.5, 6]} />
      <Suspense fallback={<RendererFallback onGpuEvent={onGpuEvent} />}>
        <SceneDiagnostics onGpuEvent={onGpuEvent} quality={quality} />
        <ForceCanvasResize />
        <CameraRig depthZ={depthZ} quality={quality} renderEnabled={renderEnabled} sealPosition={sealRef} />
        <IglooTouch onTouchIgloo={onTouchIgloo} />
        {!debugFlags.noVeil && <ActiveTheoryVeil accent={activeArtifact?.accent} quality={quality} />}
        {!debugFlags.noTerrain && <IglooTerrain axisX={axisX} depthZ={depthZ} quality={quality} />}
        {!debugFlags.noSnow && (
          <SnowAtmosphere axisX={axisX} depthZ={depthZ} quality={quality} windSpeed={1 + Math.abs(axisVelocity) + Math.abs(depthVelocity)} />
        )}
        {!debugFlags.noSignals && <HorizontalParallaxSignalField activeArtifact={activeArtifact} axisX={axisX} quality={quality} />}
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
        {!debugFlags.noArtifacts && <IglooArtifacts activeArtifactId={activeArtifactId} artifacts={artifacts} axisX={axisX} />}
      </Suspense>
    </Canvas>
  );
}
