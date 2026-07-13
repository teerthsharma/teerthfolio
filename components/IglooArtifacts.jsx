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

export const STATION_INTERACTION_PROFILE =
  "s2-kernel-core interactive gyroscope; manifold-reactor phase beads; field-chamber-coils charge gates; qpu-ice-bridge qubit stepping stones; upstream-radio-mast live signal sweep";
export const UPLIFTING_STATION_COLOR_PROFILE =
  "uplifting station color tokens: S2 blue, Aether violet, Field amber, QPU mint, Upstream coral-green";
export const STATION_GRID_ELEVATION_PROFILE =
  "non-igloo stations sit on floating 3D grid pedestals above the polar ground";

export const MONUMENT_ART_DIRECTION = Object.freeze({
  "s2-kernel-core": Object.freeze({ silhouette: "split-kernel-proof-vault", footprint: Object.freeze([1, 1]), drawDelta: 0 }),
  "manifold-reactor": Object.freeze({ silhouette: "vertical-nerve-reactor", footprint: Object.freeze([0.82, 1.12]), drawDelta: -2 }),
  "field-chamber-coils": Object.freeze({ silhouette: "helmholtz-field-gate", footprint: Object.freeze([1.24, 0.78]), drawDelta: -6 }),
  "qpu-ice-bridge": Object.freeze({ silhouette: "segmented-qubit-span", footprint: Object.freeze([1.48, 0.8]), drawDelta: 2 }),
  "upstream-radio-mast": Object.freeze({ silhouette: "asymmetric-dish-spire", footprint: Object.freeze([0.82, 0.94]), drawDelta: 1 }),
  "topology-archive-wall": Object.freeze({ silhouette: "stepped-barcode-vault", footprint: Object.freeze([1.3, 0.62]), drawDelta: 0 }),
  "assembly-tool-locker": Object.freeze({ silhouette: "forked-tool-gantry", footprint: Object.freeze([1.08, 0.86]), drawDelta: 2 }),
});

export const MECHANISM_ACTIVE_BASE_SCALE = Object.freeze({
  "s2-kernel-core": 1.48,
  "manifold-reactor": 1.45,
  "field-chamber-coils": 1.28,
  "qpu-ice-bridge": 1.3,
  "upstream-radio-mast": 1.32,
  "topology-archive-wall": 1.18,
  "assembly-tool-locker": 1.24,
});

const FEATURED_STATION_IDS = new Set(Object.keys(MONUMENT_ART_DIRECTION));
const MECHANISM_STATION_IDS = new Set(
  MECHANISM_BASE_MOTION_CONFLICTS.stationIds,
);
const DEFAULT_STATION_FOOTPRINT = Object.freeze([1, 1]);
const ICE_HIGHLIGHT = POLAR_PALETTE.glacierWhite;
const GRID_GLASS = POLAR_PALETTE.dawnCyan;
const stationWorld = STATION_WORLD_SCHEMA.stations;

export const IGLOO_ARTIFACTS = [
  {
    id: "observatory-plaque",
    label: "Observatory Plaque",
    shortLabel: "Plaque",
    handle: "@seal.land/plaque",
    topology: "Cech nerve entry / S2 atlas",
    betti: "Betti 1/0/0",
    homology: "H0 merges the public repo corpus into one inspectable station.",
    stationProfile: { index: "CO_01", orbit: "entry", manifold: "S2 atlas" },
    signal: "75 repos / 25 systems / 11 topology ML",
    description:
      "Entry station for the mined public corpus: physics, compilers, AI systems, and topology projects arranged as inspectable polar work.",
    position: [-15, 0.34, 7],
    world: stationWorld["observatory-plaque"],
    color: STATION_PALETTE["observatory-plaque"].surface,
    accent: STATION_PALETTE["observatory-plaque"].accent,
    shape: "plate",
  },
  {
    id: "s2-kernel-core",
    label: "S2 Kernel Core",
    shortLabel: "S2 Core",
    handle: "@seal.land/s2-core",
    topology: "S2 state manifold",
    betti: "Betti 1/0/1",
    homology: "H2 keeps boot state closed while kernel edges stay inspectable.",
    stationProfile: { index: "CO_02", orbit: "kernel", manifold: "S2" },
    signal: "Seal OS, Epsilon-Hollow, ISO boot proof",
    description:
      "Rust microkernel work framed as S2 state topology: Epsilon-Hollow, boot proof, runtime discipline, and inspectable kernel edges.",
    position: [-5, 0.7, 13],
    world: stationWorld["s2-kernel-core"],
    color: STATION_PALETTE["s2-kernel-core"].surface,
    accent: STATION_PALETTE["s2-kernel-core"].accent,
    shape: "sphere",
  },
  {
    id: "manifold-reactor",
    label: "Manifold Reactor",
    shortLabel: "Aether",
    handle: "@seal.land/aether",
    topology: "persistent homology reactor",
    betti: "Betti 1/3/0",
    homology: "H1 tracks neighborhoods, loops, and verified language kernels.",
    stationProfile: { index: "CO_03", orbit: "runtime", manifold: "nerve complex" },
    signal: "Aether-Lang, persistent homology, Lean kernel",
    description:
      "Language-runtime station for Aether-Lang: neighborhoods, manifold embeddings, persistent homology, and verified kernel structure.",
    position: [8, 0.62, 12],
    world: stationWorld["manifold-reactor"],
    color: STATION_PALETTE["manifold-reactor"].surface,
    accent: STATION_PALETTE["manifold-reactor"].accent,
    shape: "torus",
  },
  {
    id: "field-chamber-coils",
    label: "Field Chamber Coils",
    shortLabel: "Field",
    handle: "@seal.land/field",
    topology: "fixed-point gauge field",
    betti: "Betti 1/2/0",
    homology: "H1 records closed electromagnetic loops and N-body field paths.",
    stationProfile: { index: "CO_04", orbit: "physics", manifold: "field lattice" },
    signal: "Faraday, Hamilton, fixed-point gauge fields",
    description:
      "Field-physics station for Faraday and Hamilton: fixed-point EM coupling, gauge notation, and N-body topological fingerprints.",
    position: [17, 0.54, 4],
    world: stationWorld["field-chamber-coils"],
    color: STATION_PALETTE["field-chamber-coils"].surface,
    accent: STATION_PALETTE["field-chamber-coils"].accent,
    shape: "coil",
  },
  {
    id: "qpu-ice-bridge",
    label: "QPU Ice Bridge",
    shortLabel: "QPU",
    handle: "@seal.land/qpu",
    topology: "homology verification bridge",
    betti: "Betti 2/1/0",
    homology: "H0/H1 split classical evidence from quantum verification paths.",
    stationProfile: { index: "CO_05", orbit: "verification", manifold: "bridge complex" },
    signal: "TopoBridge-Q, homology, IBM QPU evidence",
    description:
      "Quantum verification station where TopoBridge-Q, homology paths, IBM QPU evidence, and high-performance I/O meet.",
    position: [15, 0.42, -8],
    world: stationWorld["qpu-ice-bridge"],
    color: STATION_PALETTE["qpu-ice-bridge"].surface,
    accent: STATION_PALETTE["qpu-ice-bridge"].accent,
    shape: "bridge",
  },
  {
    id: "upstream-radio-mast",
    label: "Upstream Radio Mast",
    shortLabel: "Upstream",
    handle: "@seal.land/upstream",
    topology: "open-source signal sheaf",
    betti: "Betti 4/0/0",
    homology: "H0 keeps Triton, PyTorch, and NeMo evidence as separate live signals.",
    stationProfile: { index: "CO_06", orbit: "upstream", manifold: "signal sheaf" },
    signal: "Triton, PyTorch, NeMo Relay",
    description:
      "Upstream station for live external work: Triton sparse attention, PyTorch topology modules, and NeMo ACG cache reuse.",
    position: [3, 0.82, -14],
    world: stationWorld["upstream-radio-mast"],
    color: STATION_PALETTE["upstream-radio-mast"].surface,
    accent: STATION_PALETTE["upstream-radio-mast"].accent,
    shape: "mast",
  },
  {
    id: "topology-archive-wall",
    label: "Topology Archive Wall",
    shortLabel: "Archive",
    handle: "@seal.land/archive",
    topology: "persistent archive wall",
    betti: "Betti 1/5/0",
    homology: "H1 loops index lambda-topo, topoflow, topoml, and phase memory.",
    stationProfile: { index: "CO_07", orbit: "archive", manifold: "barcode wall" },
    signal: "lambda-topo, topoflow, topoml, phi-mem",
    description:
      "Archive station for topology engines: lambda-topo, topoflow, topoml, phi-mem, visualization, memory, and phase-space traces.",
    position: [-11, 0.52, -11],
    world: stationWorld["topology-archive-wall"],
    color: STATION_PALETTE["topology-archive-wall"].surface,
    accent: STATION_PALETTE["topology-archive-wall"].accent,
    shape: "archive",
  },
  {
    id: "assembly-tool-locker",
    label: "Assembly Tool Locker",
    shortLabel: "Tooling",
    handle: "@seal.land/tooling",
    topology: "SIMD assembly complex",
    betti: "Betti 3/1/0",
    homology: "H0 partitions AVX, page-table, no_std, and bare-metal toolchains.",
    stationProfile: { index: "CO_08", orbit: "tooling", manifold: "assembly complex" },
    signal: "AVX-512, page tables, no_std kernels, SIMD homology",
    description:
      "Tooling station for bare-metal work: AVX-512, page tables, no_std kernels, assembly stencils, and SIMD topology maps.",
    position: [-18, 0.42, -2],
    world: stationWorld["assembly-tool-locker"],
    color: STATION_PALETTE["assembly-tool-locker"].surface,
    accent: STATION_PALETTE["assembly-tool-locker"].accent,
    shape: "locker",
  },
];

const ARTIFACT_CLASS = "igloo-artifact";
const PHASE_BEADS = Array.from({ length: 7 }, (_, index) => {
  const angle = (index / 7) * Math.PI * 2;
  return {
    key: `phase-bead-${index}`,
    position: [Math.cos(angle) * 0.55, Math.sin(angle * 2.0) * 0.08, Math.sin(angle) * 0.34],
    scale: 0.028 + (index % 3) * 0.008,
  };
});
const CHARGE_GATE_OFFSETS = [-0.42, 0, 0.42];
const QUBIT_STEPS = [-0.42, -0.21, 0, 0.21, 0.42];
const SWEEP_RINGS = [0.26, 0.42, 0.6];

function StationInteractionRig({ accent, active, artifact, hovered }) {
  const root = useRef(null);
  const primary = useRef(null);
  const secondary = useRef(null);
  const intensity = active ? 1 : hovered ? 0.68 : 0.22;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y += active ? 0.014 : hovered ? 0.008 : 0.003;
      root.current.position.y = Math.sin(t * 1.4 + artifact.position[0]) * (active ? 0.028 : 0.01);
    }
    if (primary.current) {
      primary.current.rotation.x = t * (active ? 0.9 : 0.32);
      primary.current.rotation.z = Math.sin(t * 0.7) * 0.2;
    }
    if (secondary.current) {
      secondary.current.rotation.y = -t * (active ? 1.1 : 0.38);
    }
  });

  if (artifact.id === "s2-kernel-core") {
    return (
      <group ref={root} name="s2-kernel-core interactive gyroscope" position={[0, 0.08, 0]}>
        <mesh ref={primary} rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[0.7, 0.009, 8, 96]} />
          <meshBasicMaterial color={accent} transparent opacity={0.22 + intensity * 0.34} />
        </mesh>
        <mesh rotation={[0.4, Math.PI / 2, 0.28]}>
          <torusGeometry args={[0.54, 0.007, 8, 86]} />
          <meshBasicMaterial color={ICE_HIGHLIGHT} transparent opacity={0.14 + intensity * 0.26} />
        </mesh>
        {[0, 1].map((index) => {
          const angle = index * Math.PI;
          return (
            <mesh key={`s2-orbit-bit-${index}`} position={[Math.cos(angle) * 0.66, 0.04, Math.sin(angle) * 0.46]} scale={[0.055, 0.055, 0.055]}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={ICE_HIGHLIGHT} emissive={artifact.accent} emissiveIntensity={0.1 + intensity * 0.24} roughness={0.34} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (artifact.id === "manifold-reactor") {
    return (
      <group ref={root} name="manifold-reactor phase beads" position={[0, 0.08, 0]}>
        <mesh ref={primary} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.006, 8, 116]} />
          <meshBasicMaterial color={accent} transparent opacity={0.2 + intensity * 0.3} />
        </mesh>
        {PHASE_BEADS.map((bead, index) => (
          <mesh key={bead.key} position={bead.position} scale={[bead.scale, bead.scale, bead.scale]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? ICE_HIGHLIGHT : artifact.color}
              emissive={artifact.accent}
              emissiveIntensity={0.12 + intensity * 0.26}
              roughness={0.36}
            />
          </mesh>
        ))}
        <mesh ref={secondary} scale={[0.18, 0.18, 0.18]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={accent} transparent opacity={0.14 + intensity * 0.2} wireframe />
        </mesh>
      </group>
    );
  }

  if (artifact.id === "field-chamber-coils") {
    return (
      <group ref={root} name="field-chamber-coils charge gates" position={[0, 0.08, 0]}>
        {CHARGE_GATE_OFFSETS.map((x, index) => (
          <group key={`field-charge-gate-${x}`} position={[x, 0, 0]} rotation={[0, 0, index % 2 === 0 ? 0.16 : -0.16]}>
            <mesh scale={[0.018, 0.54, 0.018]}>
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshStandardMaterial color="#385d68" emissive={artifact.accent} emissiveIntensity={0.08 + intensity * 0.14} roughness={0.58} />
            </mesh>
            <mesh position={[0, -0.22 + ((index % 3) * 0.18), 0]} scale={[0.044, 0.044, 0.044]}>
              <sphereGeometry args={[1, 14, 8]} />
              <meshBasicMaterial color={index % 2 === 0 ? artifact.accent : ICE_HIGHLIGHT} transparent opacity={0.2 + intensity * 0.54} />
            </mesh>
          </group>
        ))}
        <mesh ref={primary} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68, 0.008, 8, 120]} />
          <meshBasicMaterial color="#fff0b0" transparent opacity={0.16 + intensity * 0.34} />
        </mesh>
      </group>
    );
  }

  if (artifact.id === "qpu-ice-bridge") {
    return (
      <group ref={root} name="qpu-ice-bridge qubit stepping stones" position={[0, 0.04, 0]}>
        {QUBIT_STEPS.map((x, index) => (
          <mesh key={`qpu-step-${index}`} position={[x, Math.sin(index * 1.7) * 0.035, index % 2 === 0 ? -0.16 : 0.16]} scale={[0.12, 0.035 + intensity * 0.018, 0.22]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? artifact.color : ICE_HIGHLIGHT}
              emissive={artifact.accent}
              emissiveIntensity={0.08 + intensity * (index % 2 === 0 ? 0.3 : 0.18)}
              roughness={0.38}
              transparent
              opacity={0.46 + intensity * 0.34}
            />
          </mesh>
        ))}
        <mesh ref={primary} rotation={[0, 0, -0.24]} scale={[1.02, 0.012, 0.012]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={accent} transparent opacity={0.16 + intensity * 0.28} />
        </mesh>
      </group>
    );
  }

  if (artifact.id === "upstream-radio-mast") {
    return (
      <group ref={root} name="upstream-radio-mast live signal sweep" position={[0, 0.08, 0]}>
        {SWEEP_RINGS.map((radius, index) => (
          <mesh key={`upstream-sweep-${radius}`} ref={index === 0 ? primary : undefined} rotation={[0.6 + index * 0.24, 0.4, Math.PI / 4]}>
            <torusGeometry args={[radius, 0.006, 8, 72]} />
            <meshBasicMaterial color={index === 1 ? ICE_HIGHLIGHT : accent} transparent opacity={0.12 + intensity * (0.16 + index * 0.05)} />
          </mesh>
        ))}
        <mesh ref={secondary} position={[0, 0.46, 0]} scale={[0.08, 0.08, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={ICE_HIGHLIGHT} transparent opacity={0.2 + intensity * 0.46} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`upstream-antenna-${side}`} position={[side * 0.24, 0.34, 0]} rotation={[0, 0, side * 0.8]} scale={[0.012, 0.3, 0.012]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial color={ICE_HIGHLIGHT} emissive={artifact.accent} emissiveIntensity={0.08 + intensity * 0.12} roughness={0.46} />
          </mesh>
        ))}
      </group>
    );
  }

  return null;
}

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
  const stationLight = useRef(null);
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
  const subjectLift = featured ? 0.2 : 0;
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
  const stationLightIntensity = active
    ? 2.25
    : heroProtected
      ? featured
        ? 0.24
        : 0.16
      : featured
        ? 0.55
        : 0.32;
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
    if (stationLight.current) {
      stationLight.current.intensity = stationLightIntensity * revealProgress;
    }
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
      {artifact.shape === "sphere" && (
        <group name="physical-station-subject s2-kernel-core split-kernel-proof-vault" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow scale={[0.24, 0.46, 0.24]}>
            <icosahedronGeometry args={[0.44, 3]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.98 : 0.76}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          <mesh
            castShadow
            name="split-kernel-state-plane"
            position={[0, 0.02, 0]}
            receiveShadow
            rotation={[0.06, 0.32, 0.05]}
            scale={[0.78, 0.04, 0.5]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.94 : 0.68}
              profileId={artifact.id}
              quality={quality}
              tone="surface"
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              key={`s2-polar-crown-${side}`}
              name={`split-kernel-interrupt-proof-${side}`}
              position={[0, side * 0.52, 0]}
              receiveShadow
              rotation={[0, side * 0.45, side < 0 ? Math.PI : 0]}
              scale={[1.12, 1.12, 0.78]}
            >
              <coneGeometry args={[0.16, 0.28, 5]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={0.92}
                profileId={artifact.id}
                quality={quality}
                tone="surface"
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          {!mechanismMotionOwned && (
            <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
          )}
        </group>
      )}
      {artifact.shape === "torus" && (
        <group name="physical-station-subject manifold-reactor vertical-nerve-reactor" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow rotation={[0.12, 0.28, 0.08]} scale={[0.82, 1.18, 0.82]}>
            <torusGeometry args={[0.4, 0.058, 12, 88]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.98 : 0.76}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          <mesh castShadow receiveShadow rotation={[0.22, Math.PI / 2, 0.48]} scale={[0.86, 1.08, 0.86]}>
            <torusGeometry args={[0.34, 0.034, 10, 72]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.78 : 0.48}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          <mesh castShadow receiveShadow rotation={[0, 0.22, 0]} scale={[0.14, 0.28, 0.14]}>
            <icosahedronGeometry args={[1, 2]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={0.92}
              profileId={artifact.id}
              quality={quality}
              tone="ink"
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {!mechanismMotionOwned && (
            <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
          )}
        </group>
      )}
      {artifact.shape === "coil" && (
        <group name="physical-station-subject field-chamber-coils helmholtz-field-gate" position={[0, subjectLift, 0]}>
          <mesh
            castShadow
            name="field-chamber-ink-foundation"
            position={[0, -0.34, 0]}
            receiveShadow
            scale={[0.64, 0.055, 0.42]}
          >
            <cylinderGeometry args={[1, 1, 1, 36]} />
            <meshStandardMaterial color="#D7E7E7" emissive="#F29C46" emissiveIntensity={0.06} metalness={0.06} roughness={0.62} />
          </mesh>
          <mesh name="field-chamber-glass-housing" position={[0, 0.03, 0]} scale={[0.88, 0.72, 0.5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
              clearcoat={0.32}
              clearcoatRoughness={0.42}
              color={POLAR_PALETTE.dawnCyan}
              depthWrite={false}
              opacity={active ? 0.2 : 0.1}
              roughness={0.28}
              side={THREE.DoubleSide}
              transparent
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              receiveShadow
              key={`helmholtz-coil-${side}`}
              position={[side * 0.3, 0.03, 0]}
              rotation={[0, Math.PI / 2, side * 0.08]}
              scale={[0.9, 1.08, 0.9]}
            >
              <torusGeometry args={[0.34, 0.034, 10, 72]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={active ? 0.98 : 0.78}
                profileId={artifact.id}
                quality={quality}
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          <mesh castShadow receiveShadow position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.9, 0.04]}>
            <cylinderGeometry args={[1, 1, 1, 10]} />
            <meshStandardMaterial color="#D7E7E7" emissive="#F29C46" emissiveIntensity={0.06} metalness={0.08} roughness={0.58} />
          </mesh>
          {[
            [-0.4, -0.28],
            [0.4, -0.28],
            [-0.4, 0.28],
            [0.4, 0.28],
          ].map(([x, z]) => (
            <mesh
              castShadow
              receiveShadow
              key={`field-post-${x}-${z}`}
              position={[x, 0.02, z]}
              scale={[0.045, 0.72, 0.045]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshStandardMaterial color="#D7E7E7" emissive="#F29C46" emissiveIntensity={0.06} metalness={0.08} roughness={0.58} />
            </mesh>
          ))}
          <mesh position={[0, 0.04, 0]} scale={[0.16, 0.16, 0.16]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.5 : 0.18} />
          </mesh>
          {!mechanismMotionOwned && (
            <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
          )}
        </group>
      )}
      {artifact.shape === "bridge" && (
        <group name="physical-station-subject qpu-ice-bridge segmented-qubit-span qpu-coherence-bridge-pylons" position={[0, subjectLift, 0]}>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              receiveShadow
              key={`bridge-pylon-${side}`}
              position={[side * 0.62, 0.04, 0]}
              rotation={[0, 0, side * -0.1]}
              scale={[0.13, 0.72, 0.22]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={0.94}
                profileId={artifact.id}
                quality={quality}
                tone="surface"
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          <mesh castShadow receiveShadow position={[0, -0.12, 0]} rotation={[0, 0, -0.05]} scale={[1.62, 0.12, 0.36]}>
            <boxGeometry args={[1, 1, 1]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.98 : 0.8}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              key={`qpu-catenary-gate-${side}`}
              position={[side * 0.34, 0.26, 0]}
              receiveShadow
              rotation={[0, 0, side * 0.7]}
              scale={[0.065, 0.86, 0.065]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={0.9}
                profileId={artifact.id}
                quality={quality}
                tone="surface"
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          {!mechanismMotionOwned && (
            <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
          )}
        </group>
      )}
      {artifact.shape === "mast" && (
        <group name="physical-station-subject upstream-radio-mast asymmetric-dish-spire" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.08, 0]} scale={[0.055, 1.12, 0.055]}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.98 : 0.8}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              receiveShadow
              key={`mast-tripod-${side}`}
              position={[side * 0.2, -0.18, 0]}
              rotation={[0, 0, side * -0.46]}
              scale={[0.045, 0.68, 0.045]}
            >
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={active ? 0.96 : 0.74}
                profileId={artifact.id}
                quality={quality}
                tone="surface"
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          <mesh castShadow receiveShadow position={[0.3, 0.48, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 0.72, 1]}>
            <coneGeometry args={[0.32, 0.13, 24, 1, true]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.96 : 0.76}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {!mechanismMotionOwned && (
            <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
          )}
        </group>
      )}
      {artifact.shape === "archive" && (
        <group name="physical-station-subject topology-archive-wall stepped-barcode-vault" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow position={[0, 0, -0.12]} rotation={[0, -0.08, -0.05]} scale={[0.72, 0.64, 0.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.96 : 0.72}
              profileId={artifact.id}
              quality={quality}
              tone="surface"
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {[
            [-0.22, -0.18, 0.62],
            [0.08, 0.02, 0.5],
            [-0.13, 0.23, 0.7],
          ].map(([x, y, width], index) => (
            <mesh castShadow receiveShadow key={`archive-barcode-${index}`} position={[x, y, 0.02]} scale={[width, 0.09, 0.18]}>
              <boxGeometry args={[1, 1, 1]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={active ? 0.98 : 0.74}
                profileId={artifact.id}
                quality={quality}
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          <mesh position={[0.08, 0.02, 0.14]} rotation={[0, 0, -0.18]}>
            <torusGeometry args={[0.31, 0.026, 8, 48, Math.PI * 1.48]} />
            <meshBasicMaterial color={accent} transparent opacity={active ? 0.5 : 0.18} />
          </mesh>
        </group>
      )}
      {artifact.shape === "locker" && (
        <group name="physical-station-subject assembly-tool-locker forked-tool-gantry assembly-locker-mass-backplane" position={[0, subjectLift, 0]}>
          {[-1, 1].map((side) => (
            <mesh
              castShadow
              key={`assembly-cheek-${side}`}
              position={[side * 0.36, 0.04, 0]}
              receiveShadow
              rotation={[0, side * 0.05, side * -0.07]}
              scale={[0.18, 0.82, 0.28]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <StationSurfaceMaterial
                active={active}
                hovered={hovered}
                opacity={active ? 0.98 : 0.8}
                profileId={artifact.id}
                quality={quality}
                zoneOrigin={stationZoneOrigin}
              />
            </mesh>
          ))}
          <mesh castShadow receiveShadow position={[0, 0.42, 0]} scale={[0.86, 0.16, 0.28]}>
            <boxGeometry args={[1, 1, 1]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={active ? 0.98 : 0.8}
              profileId={artifact.id}
              quality={quality}
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.16, 0.11]} rotation={[Math.PI / 2, 0, 0]} scale={[0.24, 0.2, 0.24]}>
            <cylinderGeometry args={[1, 1, 1, 12]} />
            <StationSurfaceMaterial
              active={active}
              hovered={hovered}
              opacity={0.94}
              profileId={artifact.id}
              quality={quality}
              tone="surface"
              zoneOrigin={stationZoneOrigin}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`assembly-tool-${side}`} position={[side * 0.18, -0.05, 0.29]} rotation={[0, 0, side * 0.18]} scale={[0.03, 0.44, 0.03]}>
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshBasicMaterial color={side < 0 ? accent : POLAR_PALETTE.animeInk} />
            </mesh>
          ))}
        </group>
      )}
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
      <pointLight
        color={artifact.accent}
        distance={active ? 5.2 : 2.9}
        intensity={reducedMotion ? stationLightIntensity : 0}
        ref={stationLight}
      />
    </group>
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

  return (
    <group name="IglooArtifacts / 200ms station groups / 120ms stagger">
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
