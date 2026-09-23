// Every building and landmark on the island is one piece of Teerth's work.
// This file is the only place that says which work, where it stands, and what
// proves it. Numbers are copied from the source they cite (repo READMEs,
// merged diffs, teerthsharma.github.io); nothing here is estimated.
//
// Place shape:
//   id, name, kind, color (the one accent), x, z (metres; +z toward the
//   camera), radius (collision circle), tier ("building" 4-9 m tall or
//   "landmark" 2-5 m), area (neighbourhood), height (top of the model, m),
//   hook, proof[{value,label}], body, links[{label,url}], contributions?,
//   look (what the seal wears while it is at this place; null = plain seal).
//
// look: { hair, colors: [root, tip], wear }
//   hair: "flame" | "fringe" | "antenna" | "mop" | "ponytail" | "mane" | "crest"
//   wear: "cape" | "cloak" | "eyes" | "visor" | "horns" | "scarf" | "goggles" | "bow" | "halo"
// The eight building looks are the previous site's per-station wardrobe,
// carried over by station type; the landmarks reuse the same styles in their
// own accent.

const gh = (repo) => `https://github.com/teerthsharma/${repo}`;

export const PROFILE = {
  name: "Teerth Sharma",
  title: "Seal's Topology Land",
  line: "Twenty, and turning maths into code that lands in other people's codebases.",
  email: "teerths57@gmail.com",
  github: "https://github.com/teerthsharma",
  site: "https://teerthsharma.github.io/",
};

// Neighbourhoods, north to south. Paths and signposts on the island use these.
export const AREAS = {
  centre: "The Igloo",
  systems: "Systems Harbour",
  physics: "Physics Yard",
  proof: "Proof Quay",
  shape: "Shape Garden",
};

export const PLACES = [
  {
    id: "home",
    name: "The Igloo",
    kind: "Home",
    tier: "building",
    area: "centre",
    color: "#7fc8f8",
    x: 0,
    z: -8,
    radius: 4.2,
    height: 5.8,
    hook: "Who built this island, and how to reach Teerth.",
    proof: [
      { value: "11", label: "contributions landed upstream" },
      { value: "13", label: "public research repos, each one a place on this island" },
    ],
    body:
      "Teerth writes systems code where the maths is the point: topology-derived kernels, memory planners, microkernels. The rest of the island is that work, one building or landmark per project.",
    links: [
      { label: "Email", url: "mailto:teerths57@gmail.com" },
      { label: "GitHub", url: "https://github.com/teerthsharma" },
      { label: "teerthsharma.github.io", url: "https://teerthsharma.github.io/" },
    ],
    look: null,
  },

  // Systems Harbour: the north shore.
  {
    id: "upstream",
    name: "Upstream Radio Mast",
    kind: "Upstream contributions",
    tier: "building",
    area: "systems",
    color: "#ff6b5b",
    x: 6,
    z: -36,
    radius: 3.2,
    height: 9,
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
      { repo: "openxla/xla", pr: 46539, what: "Deterministic GPU codegen in reduction grouping", result: "Five lines, one stable output; landed as a commit, not a merged PR", url: "https://github.com/openxla/xla/commit/3d5df1da699bfb63cbeedaa56f09885c7974b06e" },
      { repo: "google/XNNPACK", pr: 10801, what: "Reuse the leading gap in the memory planner", result: "MobileNet V1 peak 6.42% lower" },
      { repo: "google/highway", pr: 3244, what: "Prune collisions by slice structure", result: "65.5x fewer comparisons" },
      { repo: "dsx-ai-factory/topograph", pr: 432, what: "Gate cluster-wide RBAC to rules that apply", result: "+145/-96 across 4 files" },
      { repo: "facebook/pyrefly", pr: 4180, what: "Pin a recheck panic in a chain of 208 two-module cycles", result: "418 modules chained in one test; landed as a commit", url: "https://github.com/facebook/pyrefly/commit/3e90baa2a44754983666b1b33cd3bcfb1b0e4a94" },
    ],
    links: [{ label: "All of it, with receipts", url: "https://teerthsharma.github.io/" }],
    look: { hair: "ponytail", colors: ["#6d28d9", "#c4b5fd"], wear: "eyes" },
  },
  {
    id: "kernel",
    name: "Seal OS Hut",
    kind: "Rust microkernel",
    tier: "building",
    area: "systems",
    color: "#4f7cff",
    x: -17,
    z: -22,
    radius: 3.4,
    height: 5.4,
    hook: "An operating system written from bare metal, where memory, files and the scheduler live as points on a sphere.",
    proof: [
      { value: "488", label: "Rust source files, live tree 2026-09-23" },
      { value: "1,071", label: "tracked files, live tree 2026-09-23" },
    ],
    body:
      "Bare-metal Rust with no libc and no POSIX layer. Under QEMU it boots, mounts its own filesystem, draws a desktop and completes a TLS handshake.",
    links: [{ label: "Epsilon-Hollow", url: gh("Epsilon-Hollow") }],
    look: { hair: "flame", colors: ["#b5770f", "#ffe96b"], wear: "cape" },
  },
  {
    id: "aether",
    name: "Aether Reactor",
    kind: "Language runtime",
    tier: "building",
    area: "systems",
    color: "#f5b43c",
    x: 16,
    z: -24,
    radius: 3.4,
    height: 5.6,
    hook: "A programming language whose loops stop when the data stops changing shape, not when a counter runs out.",
    proof: [
      { value: "36,305", label: "lines of Rust in crates/" },
      { value: "48", label: "Lean 4 theorems, none left unproven, in a separate model" },
    ],
    body:
      "A Rust runtime whose loops exit when the measured shape of their state stops changing, not when a counter runs out. The Lean 4 model is separate: by the project's own README it does not verify the Rust and is not built by CI.",
    links: [{ label: "Aether-Lang", url: gh("Aether-Lang") }],
    look: { hair: "fringe", colors: ["#0a0e16", "#4c68b8"], wear: "cloak" },
  },

  // Physics Yard: the west.
  {
    id: "field",
    name: "Field Coils",
    kind: "Computational physics",
    tier: "building",
    area: "physics",
    color: "#ff8a3d",
    x: -26,
    z: -4,
    radius: 3.2,
    height: 4.4,
    hook: "Electric and magnetic fields solved until they settle, so their coupling is found rather than assumed.",
    proof: [
      { value: "E x H", label: "coupling found by the solver, not assumed" },
      { value: "Faraday tensor", label: "computed directly by fixed-point projection" },
    ],
    body:
      "Two fields at right angles, electric and magnetic, are pushed through a contraction until they settle onto one fixed point, whatever the starting guess. Only then does their coupling, E x H, rise where the fields meet: computed directly, never assumed.",
    links: [{ label: "Faraday", url: gh("faraday") }],
    look: { hair: "antenna", colors: ["#c8860b", "#ffe98a"], wear: "eyes" },
  },
  {
    id: "emfield",
    name: "Pulse Ring",
    kind: "Interactive physics",
    tier: "landmark",
    area: "physics",
    color: "#14b8a6",
    x: -33,
    z: -17,
    radius: 2,
    height: 3.6,
    hook: "Move a slider and watch an electromagnetic field reshape itself live in the browser.",
    proof: [
      { value: "3 scenarios", label: "Toroidal Pulse, Braided Pair and Boundary Sheaf" },
      { value: "Rust + Python + web", label: "the same field equations, implemented three times" },
    ],
    body:
      "The simulator computes electric and magnetic fields together as one Faraday tensor, animates them as a live heatmap, and counts the clusters and loops in the active region. Any scenario exports as JSON.",
    links: [
      { label: "Electromagnetic-Field-Data-Simulator", url: gh("Electromagnetic-Field-Data-Simulator") },
      { label: "Try it in the browser", url: "https://teerthsharma.github.io/Electromagnetic-Field-Data-Simulator/" },
    ],
    look: { hair: "flame", colors: ["#0f766e", "#99f6e4"], wear: "goggles" },
  },
  {
    id: "nerve",
    name: "Nerve Knot",
    kind: "Polymer topology",
    tier: "landmark",
    area: "physics",
    color: "#93cf3a",
    x: -30,
    z: 12,
    radius: 1.8,
    height: 3.2,
    hook: "Four ideas about knotted molecules, each tested against a control built to kill it.",
    proof: [
      { value: "224", label: "tests passing" },
      { value: "3 / 4", label: "of its own hypotheses withdrawn by the control" },
      { value: "15.2%", label: "of chains knotted at N=823, against a published 23.6% at N=1024" },
    ],
    body:
      "Eight Rust crates that measure how knotted and linked simulated polymer chains are. Three of its four hypotheses failed their controls; it reports that as the result, and keeps ten tests failing on purpose to record the predictions that were wrong.",
    links: [{ label: "nerve", url: gh("nerve") }],
    look: { hair: "antenna", colors: ["#3f6212", "#d9f99d"], wear: "bow" },
  },

  // Proof Quay: the east.
  {
    id: "qpu",
    name: "Proof Derrick",
    kind: "Verified mathematics",
    tier: "building",
    area: "proof",
    color: "#2fd08c",
    x: 24,
    z: -3,
    radius: 3.4,
    height: 7,
    hook: "Computer-checked proofs that language-model attention and Markov chains are one operator.",
    proof: [
      { value: "175", label: "Lean 4 theorems and lemmas, none left unproven" },
      { value: "Wheeler, 1937", label: "the S-matrix closed form it reduces to" },
    ],
    body:
      "resolvent proves that softmax attention and Markov path composition are two settings of the same operator. Read through a resolvent, that operator gives back the closed form Wheeler wrote for the S-matrix in 1937.",
    links: [{ label: "resolvent", url: gh("resolvent") }],
    look: { hair: "mop", colors: ["#1b5e38", "#8fe6b0"], wear: "visor" },
  },
  {
    id: "separatrix",
    name: "Separatrix Scales",
    kind: "Certified search",
    tier: "landmark",
    area: "proof",
    color: "#3aa8ff",
    x: 31,
    z: -19,
    radius: 2,
    height: 3.4,
    hook: "Checks that a top ten was decided by the data, not by rounding.",
    proof: [
      { value: "0 of 1,116", label: "certified sets moved across nine engines" },
      { value: "948 of 948", label: "certified SIFT1M top-10 sets match the published answers" },
      { value: "212", label: "tests passed" },
    ],
    body:
      "For every top-k, nearest match or threshold, separatrix bounds how far each score could drift from floating-point rounding. If the worst case inside beats the best case outside, the answer is certified; if two items are too close to call, it refuses and names both.",
    links: [{ label: "separatrix", url: gh("separatrix") }],
    look: { hair: "fringe", colors: ["#1e3a8a", "#93c5fd"], wear: "visor" },
  },
  {
    id: "sigmoid",
    name: "Sigmoid Drum",
    kind: "Model imagination",
    tier: "landmark",
    area: "proof",
    color: "#b06cff",
    x: 37,
    z: -6,
    radius: 2,
    height: 3.6,
    hook: "Lets a trained model imagine its next step about 880 times more cheaply than running it.",
    proof: [
      { value: "97 µs vs 86 ms", label: "one imagined step against one real forward pass" },
      { value: "322", label: "tests passing" },
      { value: "0.855 vs 0.469", label: "island partitions recovered, against a same-size linear method" },
    ],
    body:
      "sigmoid watches a trained model's internal activity and learns a small formula that predicts its next internal state without running the model again. It notices when its predictions drift somewhere untrustworthy, and a robot using it refuses to act on a plan it no longer trusts.",
    links: [{ label: "sigmoid", url: gh("sigmoid") }],
    look: { hair: "mane", colors: ["#3b0764", "#d8b4fe"], wear: "halo" },
  },
  {
    id: "caustic",
    name: "Caustic Lamps",
    kind: "Hallucination detection",
    tier: "landmark",
    area: "proof",
    color: "#ff4d7e",
    x: 32,
    z: 10,
    radius: 2.2,
    height: 3,
    hook: "Spots a language model giving different questions the same answer, with no answer key.",
    proof: [
      { value: "0.995", label: "AUROC on collapse-type errors, with no ground truth" },
      { value: "1.000 vs 0.000", label: "accuracy on 20 capitals: a coherent 128-token prefix against one token repeated" },
      { value: "163", label: "closed-form tests; 60 bound checks, 0 violations" },
    ],
    body:
      "When a model cannot reach a fact it knows, it gives many different questions one identical answer. caustic measures that collapse without knowing the right answers, and uses the same score to pick a repair: a better prompt, or a tuned dose of noise.",
    links: [{ label: "caustic", url: gh("caustic") }],
    look: { hair: "crest", colors: ["#881337", "#fda4af"], wear: "cloak" },
  },

  // Shape Garden: the south, either side of the playground.
  {
    id: "archive",
    name: "Topology Archive",
    kind: "Shape-based tooling",
    tier: "building",
    area: "shape",
    color: "#e0559b",
    x: -16,
    z: 18,
    radius: 3.4,
    height: 5.2,
    hook: "A Rust and Python library that turns the shape of data into features any ML model can use.",
    proof: [
      { value: "3, 2, 1", label: "clusters found at scales 0.1, 0.3 and 6.0, in its own quickstart" },
      { value: "8", label: "backends tracked, from safe Rust and AVX-512 to CUDA and TensorFlow" },
    ],
    body:
      "It measures how a cloud of points clusters, loops and merges as you zoom out, and hands that shape back as fixed-size features for sklearn, PyTorch or TensorFlow. A Rust core sits under a Python API.",
    links: [{ label: "topological-ml-toolkit", url: gh("topological-ml-toolkit") }],
    look: { hair: "mane", colors: ["#14101e", "#7c3aed"], wear: "horns" },
  },
  {
    id: "workshop",
    name: "Planimeter Workshop",
    kind: "Certified geometry",
    tier: "building",
    area: "shape",
    color: "#8a5cff",
    x: 16,
    z: 18,
    radius: 3.4,
    height: 4.6,
    hook: "Counts the rooms in a drawing exactly, or refuses and says where to look.",
    proof: [
      { value: "495 / 528", label: "answers exact, 33 refused, 0 wrong" },
      { value: "336", label: "wrong answers from shapely.polygonize_full on the same files" },
      { value: "79.4%", label: "of 13,681 real icon files answered" },
    ],
    body:
      "When a coding agent edits a floor plan or an icon, planimeter counts the enclosed rooms from the raw lines with exact graph maths. When two lines nearly touch, it refuses and names the coordinate to check.",
    links: [{ label: "planimeter", url: gh("planimeter") }],
    look: { hair: "crest", colors: ["#8e8377", "#ffffff"], wear: "cape" },
  },
  {
    id: "tangle",
    name: "Tangle Post",
    kind: "Linked-cable certificates",
    tier: "landmark",
    area: "shape",
    color: "#ffc62e",
    x: -8,
    z: 31,
    radius: 1.8,
    height: 3.2,
    hook: "Proves whether two tangled cables are linked, or refuses rather than guesses.",
    proof: [
      { value: "2,000+", label: "rendered diagrams, 80 scenes and 247 photographs, zero wrong certificates" },
      { value: "226", label: "tests passed, 2 skipped" },
      { value: "247 / 247", label: "real photographs it would not certify, each with a named reason" },
    ],
    body:
      "tangle traces two cables in a picture, finds every crossing, and computes their linking number: proof they cannot be pulled apart, or that they can. Where the image is unclear it names the crossing to re-photograph. No neural network, no training data.",
    links: [{ label: "tangle", url: gh("tangle") }],
    look: { hair: "mop", colors: ["#a16207", "#fde68a"], wear: "scarf" },
  },
  {
    id: "monodromy",
    name: "Monodromy Spiral",
    kind: "Invertibility checks",
    tier: "landmark",
    area: "shape",
    color: "#22b6e0",
    x: 8,
    z: 31,
    radius: 1.9,
    height: 3.8,
    hook: "Tells whether a transformation can be undone, without taking a single derivative.",
    proof: [
      { value: "8 out of 8", label: "known cases judged right; the standard derivative check gets 6" },
      { value: "116", label: "tests passed, 0 failed" },
      { value: "0 / 24", label: "false symmetry detections on shapes with none" },
    ],
    body:
      "monodromy samples pairs of points and tracks the smallest before-and-after distance ratio. If two inputs collapse onto one output, it hands back that pair as a witness anyone can check. Side tools detect symmetry, measure dimension and spot chaos.",
    links: [{ label: "monodromy", url: gh("monodromy") }],
    look: { hair: "ponytail", colors: ["#0e7490", "#a5f3fc"], wear: "goggles" },
  },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export const ISLAND_RADIUS = 44;
export const SPAWN = { x: 0, z: 9, heading: Math.PI };

// Where the seal parks to read a building: on the side facing the camera.
export function dockPoint(place) {
  return { x: place.x, z: place.z + place.radius + 1.6 };
}
