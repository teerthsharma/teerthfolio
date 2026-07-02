import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

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
    color: "#bdefff",
    accent: "#5ff8e7",
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
    color: "#c8ffd4",
    accent: "#91ff9d",
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
    color: "#ffd79b",
    accent: "#f4b45f",
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
    color: "#ddd9ff",
    accent: "#a996ff",
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
    color: "#f3fffb",
    accent: "#c8d5df",
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

function nearestLoopedX(baseX, axisX, loopLength = ARTIFACT_LOOP_LENGTH) {
  return baseX + Math.round((axisX - baseX) / loopLength) * loopLength;
}

function ArtifactMesh({ artifact, active, axisX }) {
  const group = useRef(null);
  const accent = useMemo(() => new THREE.Color(artifact.accent), [artifact.accent]);
  const worldPosition = useMemo(
    () => [nearestLoopedX(artifact.position[0], axisX), artifact.position[1], artifact.position[2] * 2.4],
    [artifact.position, axisX],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.position.y = worldPosition[1] + Math.sin(t * 0.8 + worldPosition[0]) * 0.035;
    group.current.rotation.y += active ? 0.006 : 0.002;
  });

  const materialProps = {
    color: artifact.color,
    emissive: artifact.accent,
    emissiveIntensity: active ? 0.55 : 0.14,
    metalness: 0.18,
    roughness: 0.36,
    transparent: true,
    opacity: active ? 0.92 : 0.62,
  };

  return (
    <group
      ref={group}
      userData={{ className: ARTIFACT_CLASS }}
      position={worldPosition}
    >
      {artifact.shape === "sphere" && (
        <mesh>
          <icosahedronGeometry args={[0.38, 3]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      {artifact.shape === "torus" && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.36, 0.045, 12, 72]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      {artifact.shape === "coil" && (
        <group>
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[0, index * 0.15 - 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.26 + index * 0.04, 0.018, 8, 48]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
        </group>
      )}
      {artifact.shape === "bridge" && (
        <mesh rotation={[0, 0, -0.16]} scale={[0.86, 0.08, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      {artifact.shape === "mast" && (
        <group>
          <mesh scale={[0.04, 0.72, 0.04]}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0, 0.44, 0]} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.22, 0.01, 8, 48]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      )}
      {artifact.shape === "archive" && (
        <group>
          {[-0.22, 0, 0.22].map((y, index) => (
            <mesh key={index} position={[0, y, 0]} scale={[0.62, 0.12, 0.08]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
        </group>
      )}
      {artifact.shape === "locker" && (
        <mesh scale={[0.28, 0.55, 0.16]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      {artifact.shape === "plate" && (
        <mesh rotation={[-0.26, 0.18, 0]} scale={[0.68, 0.28, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.48, 52]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.7 : 0.26} />
      </mesh>
      <pointLight color={artifact.accent} intensity={active ? 1.6 : 0.45} distance={3.4} />
    </group>
  );
}

export default function IglooArtifacts({ activeArtifactId, artifacts = IGLOO_ARTIFACTS, axisX = 0 }) {
  return (
    <group name="IglooArtifacts">
      {artifacts.map((artifact) => (
        <ArtifactMesh
          active={artifact.id === activeArtifactId}
          artifact={artifact}
          axisX={axisX}
          key={artifact.id}
        />
      ))}
    </group>
  );
}
