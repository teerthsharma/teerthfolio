// Station identity data, lifted out of components/IglooArtifacts.jsx.
//
// IglooWorld needs IGLOO_ARTIFACTS to build its HUD and its routing, and
// nothing else from that file. While the constant lived beside the R3F
// components, importing it pulled three.js (703 KB raw, 33.9% of first load)
// into the initial bundle for every visitor - including the ones who never
// press "Enter the world" and the ones on mobile who cannot afford to. This
// module holds plain data and imports nothing that touches the GPU.
//
// components/IglooArtifacts.jsx re-exports every name below, so existing
// importers and the gate suite resolve them from either path.

import { POLAR_PALETTE, STATION_PALETTE } from "./polar-art-direction";
import { MECHANISM_BASE_MOTION_CONFLICTS } from "./polar-station-mechanism-layer";
import { STATION_WORLD_SCHEMA } from "./polar-station-world";

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

export const FEATURED_STATION_IDS = new Set(Object.keys(MONUMENT_ART_DIRECTION));
// The home plaque is the only station whose visible body IglooArtifacts still
// owns; every other station returns the transparent mechanism proxy.
export const HOME_STATION_ID = "observatory-plaque";
export const MECHANISM_STATION_IDS = new Set(
  MECHANISM_BASE_MOTION_CONFLICTS.stationIds,
);
export const DEFAULT_STATION_FOOTPRINT = Object.freeze([1, 1]);
export const ICE_HIGHLIGHT = POLAR_PALETTE.glacierWhite;
export const stationWorld = STATION_WORLD_SCHEMA.stations;

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
