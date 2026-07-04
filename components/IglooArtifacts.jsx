import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const STATION_INTERACTION_PROFILE =
  "s2-kernel-core interactive gyroscope; manifold-reactor phase beads; field-chamber-coils charge gates; qpu-ice-bridge qubit stepping stones; upstream-radio-mast live signal sweep";
export const UPLIFTING_STATION_COLOR_PROFILE =
  "uplifting station color tokens: S2 blue, Aether violet, Field amber, QPU mint, Upstream coral-green";
export const STATION_GRID_ELEVATION_PROFILE =
  "non-igloo stations sit on floating 3D grid pedestals above the polar ground";

const FEATURED_STATION_IDS = new Set(["s2-kernel-core", "manifold-reactor", "field-chamber-coils", "qpu-ice-bridge", "upstream-radio-mast"]);
const ICE_HIGHLIGHT = "#f6fffb";
const GRID_GLASS = "#bdefff";

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
    position: [0, 0.34, 0.78],
    color: "#dffdf7",
    accent: "#8fb7c3",
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
    position: [16, 0.7, -0.82],
    color: "#6ee7ff",
    accent: "#3478ff",
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
    position: [32, 0.62, -0.94],
    color: "#c9a7ff",
    accent: "#7c5cff",
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
    position: [48, 0.54, 0.24],
    color: "#ffc857",
    accent: "#ff8f3d",
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
    position: [64, 0.42, 1.05],
    color: "#7dffcf",
    accent: "#36d8ff",
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
    position: [80, 0.82, 0.36],
    color: "#ff8da1",
    accent: "#7dff9a",
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
    position: [96, 0.52, 0.86],
    color: "#dffdf7",
    accent: "#5ff8e7",
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
    position: [112, 0.42, -0.72],
    color: "#e8f2f5",
    accent: "#8aa9ad",
    shape: "locker",
  },
];

const ARTIFACT_CLASS = "igloo-artifact";
const ARTIFACT_LOOP_LENGTH = 128;
const PHASE_BEADS = Array.from({ length: 9 }, (_, index) => {
  const angle = (index / 9) * Math.PI * 2;
  return {
    key: `phase-bead-${index}`,
    position: [Math.cos(angle) * 0.55, Math.sin(angle * 2.0) * 0.08, Math.sin(angle) * 0.34],
    scale: 0.028 + (index % 3) * 0.008,
  };
});
const CHARGE_GATE_OFFSETS = [-0.44, -0.22, 0, 0.22, 0.44];
const QUBIT_STEPS = [-0.42, -0.21, 0, 0.21, 0.42];
const SWEEP_RINGS = [0.26, 0.42, 0.6];

function nearestLoopedX(baseX, axisX, loopLength = ARTIFACT_LOOP_LENGTH) {
  return baseX + Math.round((axisX - baseX) / loopLength) * loopLength;
}

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
        <mesh ref={secondary} rotation={[0.2, 0.4, Math.PI / 2]}>
          <torusGeometry args={[0.38, 0.006, 8, 74]} />
          <meshBasicMaterial color={GRID_GLASS} transparent opacity={0.12 + intensity * 0.22} />
        </mesh>
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2;
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

function StationGridPedestal({ accent, active, featured }) {
  const ringOpacity = featured ? (active ? 0.72 : 0.36) : active ? 0.5 : 0.16;
  const beamOpacity = featured ? (active ? 0.54 : 0.24) : active ? 0.34 : 0.12;

  return (
    <group name="floating-grid-pedestal uplifting-station-grid">
      <mesh position={[0, -0.5, 0]} scale={[featured ? 0.92 : 0.78, 0.035, featured ? 0.92 : 0.78]}>
        <cylinderGeometry args={[1, 1, 1, 76]} />
        <meshStandardMaterial color={featured ? "#e9fff8" : "#b7d7df"} emissive={accent} emissiveIntensity={featured ? 0.14 : 0.04} transparent opacity={featured ? 0.34 : 0.24} roughness={0.42} />
      </mesh>
      {[-0.42, -0.22, 0.02].map((y, index) => (
        <mesh key={`grid-pedestal-ring-${y}`} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + index * 0.16, 0.62 + index * 0.08, 1]}>
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
        <mesh key={`grid-pedestal-beam-${x}-${z}`} position={[x, -0.21, z]} scale={[0.012, 0.5, 0.012]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <meshBasicMaterial color={accent} transparent opacity={beamOpacity} />
        </mesh>
      ))}
    </group>
  );
}

function ArtifactMesh({ artifact, active, axisX, onSelectArtifact }) {
  const group = useRef(null);
  const pulse = useRef(0);
  const [hovered, setHovered] = useState(false);
  const accent = useMemo(() => new THREE.Color(artifact.accent), [artifact.accent]);
  const featured = FEATURED_STATION_IDS.has(artifact.id);
  const stationScale = active ? (artifact.id === "observatory-plaque" ? 1.18 : featured ? 2.05 : 3.08) : featured ? 1.04 : 0.92;
  const gridLift = featured ? (active ? 0.58 : 0.36) : 0;
  const subjectLift = featured ? 0.2 : 0;
  const worldPosition = useMemo(
    () => [nearestLoopedX(artifact.position[0], axisX), artifact.position[1], artifact.position[2] * 2.4],
    [artifact.position, axisX],
  );
  const displayPosition = [worldPosition[0], worldPosition[1] + gridLift, worldPosition[2]];

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    pulse.current = Math.max(0, pulse.current - 0.025);
    group.current.position.y = displayPosition[1] + Math.sin(t * 0.8 + worldPosition[0]) * (featured ? 0.052 : 0.035) + pulse.current * 0.06;
    group.current.rotation.y += active ? 0.006 : 0.002;
    group.current.scale.setScalar(stationScale * (1 + pulse.current * 0.08 + (hovered ? 0.035 : 0)));
  });

  const materialProps = {
    color: artifact.color,
    emissive: artifact.accent,
    emissiveIntensity: active ? 0.42 : featured ? 0.16 : 0.08,
    metalness: 0.12,
    roughness: featured ? 0.38 : 0.48,
    transparent: true,
    opacity: active ? 0.98 : featured ? 0.68 : 0.5,
  };
  const darkMaterialProps = {
    color: featured ? "#58798a" : "#253e47",
    emissive: artifact.accent,
    emissiveIntensity: active ? 0.12 : featured ? 0.05 : 0.01,
    metalness: 0.16,
    roughness: featured ? 0.58 : 0.78,
  };

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
      scale={[stationScale, stationScale, stationScale]}
    >
      <StationGridPedestal accent={accent} active={active} featured={featured} />
      <mesh receiveShadow position={[0, featured ? -0.42 : -0.31, 0]} scale={[featured ? 0.86 : 0.78, featured ? 0.05 : 0.07, featured ? 0.86 : 0.78]}>
        <cylinderGeometry args={[1, 1, 1, 72]} />
        <meshStandardMaterial {...darkMaterialProps} transparent opacity={active ? 0.48 : featured ? 0.24 : 0.44} />
      </mesh>
      <mesh position={[0, featured ? -0.16 : -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.59, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.64 : 0.2} />
      </mesh>
      {artifact.shape === "sphere" && (
        <group name="physical-station-subject s2-kernel-core" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[0.42, 3]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0.3, 0]}>
            <torusGeometry args={[0.56, 0.009, 8, 96]} />
            <meshBasicMaterial color={accent} transparent opacity={active ? 0.48 : 0.14} />
          </mesh>
          <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
        </group>
      )}
      {artifact.shape === "torus" && (
        <group name="physical-station-subject manifold-reactor" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.052, 12, 88]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh castShadow receiveShadow rotation={[0.2, Math.PI / 2, 0.35]}>
            <torusGeometry args={[0.31, 0.025, 10, 72]} />
            <meshStandardMaterial {...materialProps} opacity={active ? 0.72 : 0.38} />
          </mesh>
          <mesh castShadow receiveShadow scale={[0.16, 0.16, 0.16]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial {...darkMaterialProps} />
          </mesh>
          <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
        </group>
      )}
      {artifact.shape === "coil" && (
        <group name="physical-station-subject field-chamber-coils" position={[0, subjectLift, 0]}>
          {[-0.24, -0.06, 0.12, 0.3].map((y, index) => (
            <mesh castShadow receiveShadow key={index} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.34 + index * 0.032, 0.022, 10, 72]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
          <mesh castShadow receiveShadow position={[0, 0.04, 0]} scale={[0.04, 0.78, 0.04]}>
            <cylinderGeometry args={[1, 1, 1, 10]} />
            <meshStandardMaterial {...darkMaterialProps} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh castShadow receiveShadow key={`field-post-${side}`} position={[side * 0.43, 0.02, 0]} scale={[0.032, 0.72, 0.032]}>
              <cylinderGeometry args={[1, 1, 1, 8]} />
              <meshStandardMaterial {...darkMaterialProps} />
            </mesh>
          ))}
          <mesh position={[0, 0.04, 0]} scale={[0.16, 0.16, 0.16]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.5 : 0.18} />
          </mesh>
          <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
        </group>
      )}
      {artifact.shape === "bridge" && (
        <group name="physical-station-subject qpu-ice-bridge" position={[0, subjectLift, 0]}>
          {[-1, 1].map((side) => (
            <mesh castShadow receiveShadow key={`bridge-pylon-${side}`} position={[side * 0.32, 0.02, 0]} scale={[0.08, 0.52, 0.12]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial {...darkMaterialProps} />
            </mesh>
          ))}
          <mesh castShadow receiveShadow rotation={[0, 0, -0.16]} scale={[0.92, 0.08, 0.22]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
        </group>
      )}
      {artifact.shape === "mast" && (
        <group name="physical-station-subject upstream-radio-mast" position={[0, subjectLift, 0]}>
          <mesh castShadow receiveShadow scale={[0.045, 0.88, 0.045]}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          {[0.26, 0.45].map((y, index) => (
            <mesh castShadow receiveShadow key={`mast-ring-${y}`} position={[0, y, 0]} rotation={[0.72, 0.2 + index * 0.8, Math.PI / 4]}>
              <torusGeometry args={[0.25 + index * 0.1, 0.01, 8, 58]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
          <StationInteractionRig accent={accent} active={active} artifact={artifact} hovered={hovered} />
        </group>
      )}
      {artifact.shape === "archive" && (
        <group name="physical-station-subject topology-archive-wall">
          {[-0.28, -0.1, 0.08, 0.26].map((y, index) => (
            <mesh castShadow receiveShadow key={index} position={[0, y, 0]} scale={[0.66 - index * 0.035, 0.105, 0.1]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
          <mesh position={[0, 0.02, -0.08]} scale={[0.74, 0.52, 0.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={accent} transparent opacity={active ? 0.16 : 0.05} />
          </mesh>
        </group>
      )}
      {artifact.shape === "locker" && (
        <group name="physical-station-subject assembly-tool-locker">
          <mesh castShadow receiveShadow scale={[0.36, 0.62, 0.2]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          {[-0.14, 0.02, 0.18].map((y) => (
            <mesh key={`locker-line-${y}`} position={[0.01, y, 0.106]} scale={[0.26, 0.01, 0.01]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#020607" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      )}
      {artifact.shape === "plate" && (
        <mesh castShadow receiveShadow name="physical-station-subject observatory-plaque" rotation={[-0.26, 0.18, 0]} scale={[0.68, 0.28, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.48, 52]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.52 : 0.18} />
      </mesh>
      <pointLight color={artifact.accent} intensity={active ? 2.25 : featured ? 0.55 : 0.32} distance={active ? 5.2 : 2.9} />
    </group>
  );
}

export default function IglooArtifacts({ activeArtifactId, artifacts = IGLOO_ARTIFACTS, axisX = 0, onSelectArtifact }) {
  return (
    <group name="IglooArtifacts">
      {artifacts.map((artifact) => (
        <ArtifactMesh
          active={artifact.id === activeArtifactId}
          artifact={artifact}
          axisX={axisX}
          key={artifact.id}
          onSelectArtifact={onSelectArtifact}
        />
      ))}
    </group>
  );
}
