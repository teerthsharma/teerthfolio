import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  POLAR_PALETTE,
  STATION_PALETTE,
  WORLD_STREAM_TIMINGS,
  easeWorldStream,
} from "../lib/polar-art-direction";
import { MECHANISM_BASE_MOTION_CONFLICTS } from "../lib/polar-station-mechanism-layer";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";
import StationSurfaceMaterial from "./StationSurfaceMaterial";

// Station data now lives in lib/igloo-artifacts.js so that importing it does
// not pull three.js into the first-load bundle. Re-exported here so every
// existing importer and every gate keeps resolving these from this path.
export {
  UPLIFTING_STATION_COLOR_PROFILE,
  STATION_GRID_ELEVATION_PROFILE,
  MONUMENT_ART_DIRECTION,
  MECHANISM_ACTIVE_BASE_SCALE,
  IGLOO_ARTIFACTS,
  FEATURED_STATION_IDS,
  HOME_STATION_ID,
  MECHANISM_STATION_IDS,
  DEFAULT_STATION_FOOTPRINT,
  ICE_HIGHLIGHT,
  stationWorld,
} from "../lib/igloo-artifacts";
import {
  UPLIFTING_STATION_COLOR_PROFILE,
  STATION_GRID_ELEVATION_PROFILE,
  MONUMENT_ART_DIRECTION,
  MECHANISM_ACTIVE_BASE_SCALE,
  IGLOO_ARTIFACTS,
  FEATURED_STATION_IDS,
  HOME_STATION_ID,
  MECHANISM_STATION_IDS,
  DEFAULT_STATION_FOOTPRINT,
  ICE_HIGHLIGHT,
} from "../lib/igloo-artifacts";

const ARTIFACT_CLASS = "igloo-artifact";
function StationGridPedestal({ accent, active, featured, footprint = [1, 1] }) {
  const ringOpacity = featured ? (active ? 0.72 : 0.36) : active ? 0.5 : 0.16;
  const beamOpacity = featured ? (active ? 0.54 : 0.24) : active ? 0.34 : 0.12;

  return (
    <group name="floating-grid-pedestal uplifting-station-grid">
      <mesh
        position={[0, -0.5, 0]}
        scale={[
          (featured ? 0.92 : 0.78) * footprint[0],
          0.035,
          (featured ? 0.92 : 0.78) * footprint[1],
        ]}
      >
        <cylinderGeometry args={[1, 1, 1, 76]} />
        <meshStandardMaterial color={featured ? "#e9fff8" : "#b7d7df"} emissive={accent} emissiveIntensity={featured ? 0.14 : 0.04} transparent opacity={featured ? 0.34 : 0.24} roughness={0.42} />
      </mesh>
      {[-0.42, -0.22, 0.02].map((y, index) => (
        <mesh
          key={`grid-pedestal-ring-${y}`}
          position={[0, y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[
            footprint[0] * (1 + index * 0.16),
            footprint[1] * (0.62 + index * 0.08),
            1,
          ]}
        >
          <ringGeometry args={[0.54, 0.555, 80]} />
          <meshBasicMaterial color={index === 1 ? ICE_HIGHLIGHT : accent} transparent opacity={ringOpacity * (0.68 - index * 0.12)} />
        </mesh>
      ))}
      {[
        [0.52, 0.52],
        [-0.52, 0.52],
        [0.52, -0.52],
        [-0.52, -0.52],
      ].map(([x, z]) => (
        <mesh
          key={`grid-pedestal-beam-${x}-${z}`}
          position={[x * footprint[0], -0.21, z * footprint[1]]}
          scale={[0.012, 0.5, 0.012]}
        >
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <meshBasicMaterial color={accent} transparent opacity={beamOpacity} />
        </mesh>
      ))}
    </group>
  );
}

function ArtifactMesh({
  artifact,
  active,
  heroProtected,
  onSelectArtifact,
  quality,
  reducedMotion,
  revealIndex,
  streamEpochMsRef,
}) {
  const group = useRef(null);
  const pulse = useRef(0);
  const [hovered, setHovered] = useState(false);
  const stationPalette = STATION_PALETTE[artifact.id];
  const stationAccent = stationPalette?.accent || artifact.accent;
  const accent = useMemo(() => new THREE.Color(stationAccent), [stationAccent]);
  const featured = FEATURED_STATION_IDS.has(artifact.id);
  const mechanismMotionOwned = MECHANISM_STATION_IDS.has(artifact.id);
  const homeNeighbor =
    artifact.id === "s2-kernel-core" || artifact.id === "assembly-tool-locker";
  const homeSuppressed =
    heroProtected && !active && artifact.id !== "observatory-plaque" && !homeNeighbor;
  const footprint = MONUMENT_ART_DIRECTION[artifact.id]?.footprint || DEFAULT_STATION_FOOTPRINT;
  const stationScale = active
    ? artifact.id === "observatory-plaque"
      ? 1.18
      : featured
        ? MECHANISM_ACTIVE_BASE_SCALE[artifact.id] || 1.28
        : 3.08
    : heroProtected
      ? featured
        ? 0.72
        : 0.6
      : featured
        ? 1.04
        : 0.92;
  const gridLift = featured ? (active ? 0.58 : 0.36) : 0;
  const worldPosition = useMemo(
    () => [artifact.world.center.x, artifact.position[1], artifact.world.center.z],
    [artifact.position, artifact.world],
  );
  const displayPosition = [worldPosition[0], worldPosition[1] + gridLift, worldPosition[2]];
  const initialArtifactScale = useMemo(
    () => (reducedMotion ? [1, 1, 1] : [0.001, 0.001, 0.001]),
    [reducedMotion],
  );
  const revealStartMs =
    WORLD_STREAM_TIMINGS.stationStartMs +
    revealIndex * WORLD_STREAM_TIMINGS.stationStaggerMs;
  const stationZoneOrigin = useMemo(
    () => [worldPosition[0], worldPosition[2]],
    [worldPosition],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const nowMs = t * 1000;
    if (streamEpochMsRef.current === null) streamEpochMsRef.current = nowMs;
    const streamElapsedMs = nowMs - streamEpochMsRef.current;
    const revealProgress = reducedMotion
      ? 1
      : easeWorldStream(
          (streamElapsedMs - revealStartMs) / WORLD_STREAM_TIMINGS.stationRevealMs,
        );
    pulse.current = Math.max(0, pulse.current - 0.025);
    group.current.visible =
      !homeSuppressed && (reducedMotion || streamElapsedMs >= revealStartMs);
    const idleBob = mechanismMotionOwned ? 0 : Math.sin(t * 0.8 + worldPosition[0]) * 0.035;
    group.current.position.y = displayPosition[1] + idleBob + pulse.current * 0.06;
    if (mechanismMotionOwned) group.current.rotation.y = 0;
    else group.current.rotation.y += active ? 0.006 : 0.002;
    group.current.scale.setScalar(
      stationScale *
        (1 + pulse.current * 0.08 + (hovered ? 0.035 : 0)) *
        Math.max(0.001, revealProgress),
    );
  });

  const darkMaterialProps = {
    color: featured ? POLAR_PALETTE.animeShadow : POLAR_PALETTE.horizonIndigo,
    emissive: artifact.accent,
    emissiveIntensity: active ? 0.12 : featured ? 0.05 : 0.01,
    metalness: 0.16,
    roughness: featured ? 0.58 : 0.78,
  };

  if (mechanismMotionOwned) {
    return (
      <group
        ref={group}
        name={`mechanism-navigation-proxy ${artifact.id}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          pulse.current = 1;
          onSelectArtifact?.(artifact.id);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        position={displayPosition}
        scale={initialArtifactScale}
        userData={{
          className: `${ARTIFACT_CLASS} mechanism-navigation-proxy`,
          stationId: artifact.id,
          visualOwner: "PolarStationMechanismLayer",
        }}
        visible={reducedMotion}
      >
        <mesh
          name={`${artifact.id}-transparent-navigation-volume`}
          position={[0, 0.42, 0]}
          scale={[footprint[0] * 0.82, 0.72, footprint[1] * 0.82]}
        >
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshBasicMaterial
            colorWrite={false}
            depthTest={false}
            depthWrite={false}
            opacity={0}
            transparent
          />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={group}
      onPointerDown={(event) => {
        event.stopPropagation();
        pulse.current = 1;
        onSelectArtifact?.(artifact.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      userData={{ className: `${ARTIFACT_CLASS} interactive-station-object`, stationId: artifact.id }}
      position={displayPosition}
      scale={initialArtifactScale}
      visible={reducedMotion}
    >
      <StationGridPedestal accent={accent} active={active} featured={featured} footprint={footprint} />
      <mesh
        receiveShadow
        position={[0, featured ? -0.42 : -0.31, 0]}
        scale={[
          (featured ? 0.86 : 0.78) * footprint[0],
          featured ? 0.05 : 0.07,
          (featured ? 0.86 : 0.78) * footprint[1],
        ]}
      >
        <cylinderGeometry args={[1, 1, 1, 72]} />
        <meshStandardMaterial {...darkMaterialProps} transparent opacity={active ? 0.48 : featured ? 0.24 : 0.44} />
      </mesh>
      <mesh
        position={[0, featured ? -0.16 : -0.24, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[footprint[0], footprint[1], 1]}
      >
        <ringGeometry args={[0.56, 0.59, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.64 : 0.2} />
      </mesh>
      {artifact.shape === "plate" && (
        <mesh castShadow receiveShadow name="physical-station-subject observatory-plaque" rotation={[-0.26, 0.18, 0]} scale={[0.68, 0.28, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <StationSurfaceMaterial
            active={active}
            hovered={hovered}
            opacity={active ? 0.98 : 0.84}
            profileId={artifact.id}
            quality={quality}
            zoneOrigin={stationZoneOrigin}
          />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[footprint[0], footprint[1], 1]}>
        <ringGeometry args={[0.46, 0.48, 52]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.52 : 0.18} />
      </mesh>
    </group>
  );
}

/**
 * Home plaque accent light, deliberately hoisted out of ArtifactMesh.
 *
 * Point-light count is a shader program define, so three.js relinks every lit
 * material in the scene whenever it changes. Inside ArtifactMesh this light both
 * unmounted with the exclusive-station filter and dropped out of the lights
 * array every time the station group's staged-reveal `visible` flag toggled, so
 * NUM_POINT_LIGHTS oscillated 4 -> 5 -> 4 and paid a full relink storm (measured
 * ~40 late links about a second after webgl-scene-ready). It now lives in the
 * always-mounted, always-visible artifacts root and is driven to intensity zero
 * when the plaque is unrevealed or not rendered at all: same light, invariant
 * program topology.
 */
function HomePlaqueAccentLight({
  active,
  heroProtected,
  homeArtifact,
  homeRendered,
  reducedMotion,
  streamEpochMsRef,
}) {
  const light = useRef(null);
  const peakIntensity = active ? 2.25 : heroProtected ? 0.16 : 0.32;

  useFrame(({ clock }) => {
    if (!light.current) return;
    const nowMs = clock.elapsedTime * 1000;
    if (streamEpochMsRef.current === null) streamEpochMsRef.current = nowMs;
    const revealProgress = reducedMotion
      ? 1
      : easeWorldStream(
          (nowMs - streamEpochMsRef.current - WORLD_STREAM_TIMINGS.stationStartMs) /
            WORLD_STREAM_TIMINGS.stationRevealMs,
        );
    light.current.intensity = homeRendered ? peakIntensity * revealProgress : 0;
  });

  return (
    <pointLight
      color={homeArtifact.accent}
      distance={active ? 5.2 : 2.9}
      intensity={reducedMotion && homeRendered ? peakIntensity : 0}
      name="home-plaque-accent-light session-invariant-light-topology"
      position={[
        homeArtifact.world.center.x,
        homeArtifact.position[1],
        homeArtifact.world.center.z,
      ]}
      ref={light}
    />
  );
}

export default function IglooArtifacts({
  activeArtifactId,
  artifacts = IGLOO_ARTIFACTS,
  exclusiveStationId = null,
  heroProtected = false,
  onSelectArtifact,
  quality = "medium",
  reducedMotion = false,
  streamEpochMsRef,
}) {
  const localStreamEpochMsRef = useRef(null);
  const resolvedStreamEpochMsRef = streamEpochMsRef || localStreamEpochMsRef;
  const artifactsToRender = useMemo(
    () =>
      exclusiveStationId
        ? artifacts.filter((artifact) => artifact.id === exclusiveStationId)
        : artifacts,
    [artifacts, exclusiveStationId],
  );
  const homeArtifact = useMemo(
    () =>
      artifacts.find((artifact) => artifact.id === HOME_STATION_ID) ||
      IGLOO_ARTIFACTS.find((artifact) => artifact.id === HOME_STATION_ID),
    [artifacts],
  );

  return (
    <group name="IglooArtifacts / 200ms station groups / 120ms stagger">
      {/* Mounted for the whole session so the scene's point-light count — and
          therefore every lit material's shader program — never changes. */}
      <HomePlaqueAccentLight
        active={activeArtifactId === HOME_STATION_ID}
        heroProtected={heroProtected}
        homeArtifact={homeArtifact}
        homeRendered={!exclusiveStationId || exclusiveStationId === HOME_STATION_ID}
        reducedMotion={reducedMotion}
        streamEpochMsRef={resolvedStreamEpochMsRef}
      />
      {artifactsToRender.map((artifact, index) => (
        <ArtifactMesh
          active={artifact.id === activeArtifactId}
          artifact={artifact}
          heroProtected={heroProtected}
          key={artifact.id}
          onSelectArtifact={onSelectArtifact}
          quality={quality}
          reducedMotion={reducedMotion}
          revealIndex={index}
          streamEpochMsRef={resolvedStreamEpochMsRef}
        />
      ))}
    </group>
  );
}
