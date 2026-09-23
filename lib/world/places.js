// Every building on the island is one piece of Teerth's work. This file is the
// only place that says which work, where it stands, and what proves it.
// Numbers are copied from the source they cite (repo READMEs, merged diffs,
// teerthsharma.github.io); nothing here is estimated.

const gh = (repo) => `https://github.com/teerthsharma/${repo}`;

export const PROFILE = {
  name: "Teerth Sharma",
  title: "Seal's Topology Land",
  line: "Twenty, and turning maths into code that lands in other people's codebases.",
  email: "teerths57@gmail.com",
  github: "https://github.com/teerthsharma",
  site: "https://teerthsharma.github.io/",
};

// x/z in metres on the island. +z is toward the camera, so smaller z reads as
// "further up the screen". radius is the collision footprint.
export const PLACES = [
  {
    id: "home",
    name: "The Igloo",
    kind: "Home",
    color: "#7fc8f8",
    x: 0,
    z: -8,
    radius: 4.2,
    hook: "Who built this island, and how to reach Teerth.",
    proof: [
      { value: "11", label: "contributions landed upstream" },
      { value: "14", label: "public research repos" },
    ],
    body:
      "Teerth writes systems code where the maths is the point: topology-derived kernels, memory planners, microkernels. The rest of the island is that work, one building each.",
    links: [
      { label: "Email", url: "mailto:teerths57@gmail.com" },
      { label: "GitHub", url: "https://github.com/teerthsharma" },
      { label: "teerthsharma.github.io", url: "https://teerthsharma.github.io/" },
    ],
  },
  {
    id: "upstream",
    name: "Upstream Lighthouse",
    kind: "Upstream contributions",
    color: "#ff6b5b",
    x: 4,
    z: -30,
    radius: 3.2,
    hook: "Eleven contributions landed in Google DeepMind, NVIDIA, TensorFlow, XLA, Triton and more.",
    proof: [
      { value: "1,281.6x", label: "less scratch memory, mujoco #3396" },
      { value: "15,361x", label: "fewer probes, mujoco #3450" },
      { value: "65.5x", label: "fewer comparisons, highway #3244" },
    ],
    body:
      "Every number was measured on a named machine against a control, and every one sits in a merged diff or on the default branch it targets.",
    contributions: [
      { repo: "google-deepmind/mujoco", pr: 3396, what: "Linear scratch in island discovery", result: "84,033,568 B to 65,568 B at ntree 4,096" },
      { repo: "google-deepmind/mujoco_warp", pr: 1541, what: "Linear-memory GPU disjoint-set union", result: "1.513x faster, scratch 7.9 MB to 180 KB" },
      { repo: "google-deepmind/mujoco", pr: 3450, what: "Inverted point-id table for convex hulls", result: "15,361x fewer probes at V=40,962" },
      { repo: "NVIDIA/NeMo-Relay", pr: 481, what: "One scaffold, not one profile per task", result: "+1,370/-86 across 23 files" },
      { repo: "triton-lang/kernels", pr: 22, what: "Topology-derived sparse attention kernel", result: "804 lines, 17 tests passing" },
      { repo: "tensorflow/tensorflow", pr: 124410, what: "Back-propagation in transitive reduction", result: "4 control edges pruned to the unique 3" },
      { repo: "openxla/xla", pr: 46539, what: "Deterministic GPU codegen in reduction grouping", result: "Five lines, one stable output" },
      { repo: "google/XNNPACK", pr: 10801, what: "Reuse the leading gap in the memory planner", result: "MobileNet V1 peak 6.42% lower" },
      { repo: "google/highway", pr: 3244, what: "Prune collisions by slice structure", result: "65.5x fewer comparisons" },
      { repo: "dsx-ai-factory/topograph", pr: 432, what: "Gate cluster-wide RBAC to rules that apply", result: "145 lines across 4 files" },
      { repo: "facebook/pyrefly", pr: 4180, what: "Pin a 208-module recheck panic", result: "208 SCCs chained in one test" },
    ],
    links: [{ label: "All of it, with receipts", url: "https://teerthsharma.github.io/" }],
  },
  {
    id: "kernel",
    name: "Seal OS Vault",
    kind: "Rust microkernel",
    color: "#4f7cff",
    x: -17,
    z: -19,
    radius: 3.4,
    hook: "Epsilon-Hollow: a no_std Rust microkernel where OS state lives on a sphere.",
    proof: [
      { value: "397", label: "Rust source files" },
      { value: "1,013", label: "tracked files" },
    ],
    body:
      "Bare-metal Rust with no libc and no POSIX layer. Kernel state is modelled as topology on S2, and the boot image is built and proven from the repo.",
    links: [{ label: "Epsilon-Hollow", url: gh("Epsilon-Hollow") }],
  },
  {
    id: "aether",
    name: "Aether Reactor",
    kind: "Language runtime",
    color: "#f5b43c",
    x: 17,
    z: -19,
    radius: 3.4,
    hook: "Aether-Lang: a Rust runtime for topological machine learning.",
    proof: [
      { value: "Lean 4", label: "verified kernel" },
      { value: "Rust", label: "manifold embeddings, persistent homology" },
    ],
    body:
      "A language runtime whose primitives are neighbourhoods and manifolds. Persistent homology is built in, and the core kernel is checked in Lean 4.",
    links: [{ label: "Aether-Lang", url: gh("Aether-Lang") }],
  },
  {
    id: "field",
    name: "Field Coils",
    kind: "Computational physics",
    color: "#ff8a3d",
    x: -25,
    z: 0,
    radius: 3,
    hook: "Faraday and Hamilton: electromagnetic coupling found by topological fixed points.",
    proof: [
      { value: "E x H", label: "coupling discovered, not assumed" },
      { value: "SU(2)/SU(3)", label: "gauge fields in the N-body case" },
    ],
    body:
      "Faraday recovers the electromagnetic coupling tensor by projecting onto a topological fixed point. Hamilton extends it to N bodies under SU(2) and SU(3) gauge symmetry.",
    links: [
      { label: "Faraday", url: gh("faraday") },
      { label: "Hamilton", url: gh("hamliton") },
    ],
  },
  {
    id: "qpu",
    name: "Quantum Derrick",
    kind: "Quantum verification",
    color: "#2fd08c",
    x: 25,
    z: 0,
    radius: 3.4,
    hook: "TopoBridge-Q: homologically protected information transfer on real quantum hardware.",
    proof: [
      { value: "IBM QPU", label: "evidence from quantum hardware" },
      { value: "H0/H1", label: "homology classes carry the signal" },
    ],
    body:
      "Information is encoded in homology classes so that local noise cannot flip it, then carried through IBM quantum hardware and checked at the far end.",
    links: [{ label: "TopoBridge-Q", url: gh("topobridge-q") }],
  },
  {
    id: "archive",
    name: "Topology Archive",
    kind: "Topological data systems",
    color: "#e0559b",
    x: -18,
    z: 17,
    radius: 3.4,
    hook: "lambda-topo, topoflow, topoml and phi-mem: memory and ML built on persistent homology.",
    proof: [
      { value: "4", label: "libraries, one idea" },
      { value: "ripser + FAISS", label: "topological memory retrieval" },
    ],
    body:
      "A family of libraries that store, retrieve and learn from the shape of data: barcode signatures for memory, homology features for ML pipelines, dataflow you can see.",
    links: [
      { label: "lambda-topo", url: gh("lambda-topo") },
      { label: "topoflow", url: gh("topoflow") },
      { label: "topoml", url: gh("topoml") },
      { label: "phi-mem", url: gh("phi-mem") },
    ],
  },
  {
    id: "workshop",
    name: "Assembly Workshop",
    kind: "Bare-metal tooling",
    color: "#8a5cff",
    x: 18,
    z: 17,
    radius: 3.4,
    hook: "Hand-written x86-64: AVX-512 maths, page tables, persistent homology in SIMD.",
    proof: [
      { value: "AVX-512", label: "matmul, FFT, Mandelbrot by hand" },
      { value: "NASM", label: "long-mode paging, KPTI, PCID" },
    ],
    body:
      "Three repos written straight in assembly: a SIMD maths library, a page-table manipulator for long mode, and persistent homology vectorised to AVX-512.",
    links: [
      { label: "vec-simd", url: gh("vec-simd") },
      { label: "pgtable-asm", url: gh("pgtable-asm") },
      { label: "topo-asm", url: gh("topo-asm") },
    ],
  },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export const ISLAND_RADIUS = 40;
export const SPAWN = { x: 0, z: 9, heading: Math.PI };

// Where the seal parks to read a building: on the side facing the camera.
export function dockPoint(place) {
  return { x: place.x, z: place.z + place.radius + 1.6 };
}
