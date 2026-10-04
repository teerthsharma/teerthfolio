// Every place on the island, and where it stands.
//
// The words are NOT written here. They come verbatim from
// teerthsharma.github.io through data/showcase.json (see
// scripts/extract-showcase.mjs): the eleven landed upstream contributions and
// the eleven projects in the lab. This file only adds what the landing site
// has no need for: a colour, a position, a footprint, and the district (the
// area a place belongs to, and for a lab project the radioactive area round
// its building).
//
// The island's geology is in lib/world/river.js; the landforms' bulk in
// lib/world/land.js. North is -z, up the screen: the camera never rotates.

import showcase from "../../data/showcase.json" with { type: "json" };

export const PROFILE = {
  name: "Teerth Sharma",
  title: "Seal's Topology Land",
  line: showcase.intro.lead,
  email: "teerths57@gmail.com",
  github: "https://github.com/teerthsharma",
  site: "https://teerthsharma.github.io/",
  resume: "https://github.com/teerthsharma/teerthsharma/raw/main/Teerth_Sharma_Resume.pdf",
};

export const ISLAND_RADIUS = 84;
export const SPAWN = { x: 0, z: 9, heading: Math.PI };

// Org colours for the upstream landforms: the org's own brand hue, used as
// the one accent on its landform.
const ORG_COLOR = {
  "google-deepmind": "#4285f4",
  NVIDIA: "#76b900",
  "triton-lang": "#10a37f",
  tensorflow: "#ff8f00",
  "dsx-ai-factory": "#0ea5a4",
  google: "#ea4335",
  facebook: "#0866ff",
  openxla: "#f26b3a",
  open2c: "#2bb673",
};

// Areas of the island. Arriving in one puts its name on screen (the HUD's
// banner). Every area but the igloo is radioactive (the igloo is home, the
// neutral zone: `radiation` null, no motes, no mutation, no flood); `radiation` is its colour (the glow in
// its snow, its motes, and the look the seal mutates into inside it), and
// `hot` lists its hot spots [x, z] (world metres), where the glow, the
// shimmer and the Geiger crackle peak. { id, name, x, z, radius } is the
// area's circle; the circles never overlap, so the seal is in one area at a
// time. `color` is the org's accent, for the minimap. Names are districts
// and set pieces, never a project's name: a lab area is named by its
// project's own name from showcase.json. Neighbouring areas never share a
// hue, and every radiation colour reads on warm-white snow (npm run check).
const UPSTREAM_DISTRICTS = {
  home: { name: "The Igloo", x: 0, z: -8, radius: 9, color: "#7fc8f8", radiation: null, hot: [] }, // the neutral zone (the owner: "the igloo is a neutral zone, no effect")
  triton: {
    name: "Triton",
    x: 6,
    z: -68,
    radius: 13,
    color: ORG_COLOR["triton-lang"],
    radiation: "#1ec8f0", // Cherenkov blue in the glacier ice
    hot: [[-4, -73], [14, -75]], // the ice cave the river leaves by; the icefall above the viewpoint
  },
  // Each carved seal face wears its merged PR number on its neck: #3396,
  // #1541, #3450 (see lib/world/land.js).
  mujorush: {
    name: "Mount MujoRush",
    x: -35,
    z: -50,
    radius: 16,
    color: ORG_COLOR["google-deepmind"],
    radiation: "#4a5bff", // electric blue: the purple went to Aether-Lang, its neighbour
    hot: [[-46, -57], [-35, -57], [-24, -57]], // the three carved faces
  },
  highway: { name: "The Highway", x: -28, z: -24.4, radius: 7, color: ORG_COLOR.google, radiation: "#ff4d6a", hot: [[-28, -24.4]] }, // the roundabout on the road to MujoRush (lib/world/land.js HIGHWAY)
  xnnpack: { name: "XNNPACK Peak", x: 61, z: -50, radius: 10, color: ORG_COLOR.google, radiation: "#ffa51f", hot: [[63, -55]] }, // the cave at its foot
  dam: { name: "TensorFlow Dam", x: 5, z: -25, radius: 8, color: ORG_COLOR.tensorflow, radiation: "#ff8a1a", hot: [[0, -31]] }, // the ice front
  geyser: { name: "The XLA Geyser", x: -12, z: -25, radius: 8.5, color: ORG_COLOR.openxla, radiation: "#10d9a0", hot: [[-12, -24]] }, // the vent
  moat: {
    name: "The NVIDIA Moat",
    x: 46,
    z: -22,
    radius: 17,
    color: ORG_COLOR.NVIDIA,
    radiation: "#84cc16", // uranium-glass green
    hot: [[46, -30], [40, -19.6], [52, -19.6]], // the keep's top; the two ice islands
  },
  pyrefly: { name: "Pyrefly Floes", x: 74, z: -24, radius: 7, color: ORG_COLOR.facebook, radiation: "#2f7dff", hot: [[74, -33]] }, // the pinned end of the chain
  fountain: { name: "The Fountain of Immortality", x: -32, z: 60, radius: 6, color: ORG_COLOR.open2c, radiation: "#2bdc8a", hot: [[-32, 57]] }, // open2c/polychrom #79: the revival fluid's basin, the south shore
};
for (const [id, d] of Object.entries(UPSTREAM_DISTRICTS)) d.id = id;

// Where each contribution is read: [x, z, radius, district]. The point is on
// dry land at the foot of its landform (the landform rises behind it, to the
// north), and the dock is in front of it (see dockPoint).
const UPSTREAM_AT = {
  "pr-triton-kernels-22": [14, -66, 3, "triton"], // below the icefall on Triton's glacier snout
  "pr-mujoco-3396": [-46, -50, 2.5, "mujorush"], // the three terraces below the three carved faces,
  "pr-mujoco-warp-1541": [-35, -50, 2.5, "mujorush"], //   west to east in the landing site's order
  "pr-mujoco-3450": [-24, -50, 2.5, "mujorush"],
  "pr-highway-3244": [-28, -24.4, 4, "highway"], // the roundabout's island; its dock on the ring
  "pr-xnnpack-10801": [60, -48, 2.5, "xnnpack"], // at the foot of XNNPACK's mountain
  "pr-tensorflow-124410": [4, -24, 3, "dam"], // below the ice dam's front, in the dry old riverbed
  "pr-openxla-46539": [-12, -24, 3, "geyser"], // the geyser's sinter mound (the vent), at the dam's foot
  "pr-nemo-relay-481": [40, -10.5, 2, "moat"], // the moat's south bank, facing its ice island
  "pr-topograph-432": [52, -10.5, 2, "moat"],
  "pr-pyrefly-4180": [74, -24, 2, "pyrefly"], // the outflow's south bank, the chained floes before it
  "pr-polychrom-79": [-32, 57, 2.5, "fountain"], // the basin's north lip, the fountain rising behind it
};

// The science quarter: each lab building on open snow, in a radioactive
// area of its own. [x, z]; neighbours never share a hue.
const LAB_AT = {
  "p-aether-lang": [-44, -26],
  "p-resolvent": [-22, -3],
  "p-tangle": [-48, 2],
  "p-faraday": [-28, 22],
  "p-separatrix": [-50, 26],
  "p-topological-ml-toolkit": [-27, 42],
  "p-monodromy": [0, 48],
  "p-nerve": [21, 2],
  "p-epsilon-hollow": [18, 30],
  "p-planimeter": [52, 12],
  "p-caustic": [54, 38],
};
const LAB_COLOR = ["#8a5cff", "#4f7cff", "#f5b43c", "#e0559b", "#14b8a6", "#d946ef", "#ff8a3d", "#ef4444", "#06b6d4", "#f59e0b", "#22c55e"];
// A lab area whose radiation differs from its building's accent (the owner:
// "purple goes to Aether-Lang", the colour the igloo gave up).
const LAB_RADIATION = { "p-aether-lang": "#e94bff" };
export const LAB_RADIUS = 5; // 1.7x the old 3 m footprint (Scene.jsx LAB_SCALE)
export const RADIATION_RADIUS = 9; // m round a lab building: inside it, the seal mutates

const upstream = showcase.upstream.map((u) => {
  const [value, ...rest] = u.headline.split(" ");
  const [x, z, radius, district] = UPSTREAM_AT[u.id];
  return {
    id: u.id,
    section: "upstream",
    tier: "building",
    name: u.headline,
    kind: `${u.repo} #${u.pr}`,
    color: ORG_COLOR[u.org] ?? "#4f7cff",
    x,
    z,
    radius,
    district: UPSTREAM_DISTRICTS[district],
    radiation: UPSTREAM_DISTRICTS[district].radiation,
    hook: u.result,
    proof: [
      { value, label: rest.join(" ") },
      { value: u.tags[0] ?? "", label: u.tags.slice(1).join(", ") },
    ],
    body: u.body,
    links: [{ label: `${u.repo} #${u.pr}`, url: u.url }],
    // the landing site's card, whole: the panel and the landform read these
    org: u.org,
    repo: u.repo,
    pr: u.pr,
    verb: u.verb,
    logo: u.logo ? `/org/${u.logo}` : null,
    title: u.title,
    result: u.result,
    tags: u.tags,
    checks: u.checks,
    figure: u.figure,
    headline: u.headline,
  };
});

const lab = showcase.lab.map((p, i) => {
  const [x, z] = LAB_AT[p.id];
  const color = LAB_COLOR[i % LAB_COLOR.length];
  return {
    id: p.id,
    section: "lab",
    tier: "landmark",
    name: p.name,
    kind: p.tagline,
    color,
    radiation: LAB_RADIATION[p.id] ?? color,
    x,
    z,
    radius: LAB_RADIUS,
    district: { id: p.id, name: p.name, x, z, radius: RADIATION_RADIUS, radiation: LAB_RADIATION[p.id] ?? color, color, hot: [[x, z]] },
    hook: p.tagline,
    proof: p.specs.map((s) => (s.text ? { value: s.text, label: "" } : { value: s.value, label: s.label })),
    body: p.claim,
    links: [
      { label: "View on GitHub", url: p.url },
      ...(p.more ? [{ label: "Read how it works", url: p.more }] : []),
    ],
    tagline: p.tagline,
    language: p.language,
    tags: p.tags,
    specs: p.specs,
    figure: p.figure,
  };
});

const home = {
  id: "home",
  section: "home",
  tier: "building",
  name: "The Igloo",
  kind: showcase.intro.heading,
  color: "#7fc8f8",
  x: 0,
  z: -8,
  radius: 4.2,
  district: UPSTREAM_DISTRICTS.home,
  radiation: UPSTREAM_DISTRICTS.home.radiation,
  hook: showcase.intro.lead,
  proof: [
    { value: String(upstream.length), label: "landed contributions" },
    { value: String(lab.length), label: "projects in the lab" },
  ],
  body: showcase.intro.upstreamLead,
  links: [
    { label: "Email me", url: `mailto:${PROFILE.email}` },
    { label: "Resume (PDF)", url: PROFILE.resume },
    { label: "GitHub", url: PROFILE.github },
    { label: "teerthsharma.github.io", url: PROFILE.site },
  ],
};

// Where the docked camera looks (see CameraRig DOCKED): the landform, not the
// snow at the dock. Default is the place's middle, 2.2 m up. The tall ones are
// aimed by hand (zoom: a per-place multiplier on NEAR_ZOOM, small labs only), tuned from HUD-off stills (scripts/still-gate.mjs).
const LOOK_AT = {
  "pr-mujoco-3396": { x: -46, y: 5, z: -55 },
  "pr-triton-kernels-22": { x: 14, y: 6, z: -68 },
  "pr-tensorflow-124410": { x: 4, y: 2, z: -46, elev: 50, zoom: 1.6 }, // steep and wide enough to see the lake over the 13 m wall
  "pr-pyrefly-4180": { x: 74, y: 5, z: -30 },
  home: { x: 0, y: 3, z: -8 },
  // Band D upstream
  "pr-mujoco-warp-1541": { x: -35, y: 5, z: -55 },
  "pr-mujoco-3450": { x: -24, y: 5, z: -55 },
  "pr-highway-3244": { x: -28, y: 3, z: -32 },
  "pr-xnnpack-10801": { x: 61, y: 6, z: -52 },
  "pr-openxla-46539": { x: -17, y: 4, z: -25 },
  "pr-nemo-relay-481": { x: 40, y: 6, z: -17 },
  "pr-topograph-432": { x: 52, y: 6, z: -17 },
  "pr-polychrom-79": { x: -32, y: 3, z: 61 },
  // Band D labs 2
  "p-monodromy": { x: 0, y: 2.5, z: 47, zoom: 0.95 },
  "p-nerve": { x: 21, y: 2.5, z: 1, zoom: 0.95 },
  "p-epsilon-hollow": { x: 18, y: 2.5, z: 29, zoom: 0.95 },
  "p-planimeter": { x: 52, y: 2.5, z: 11, zoom: 0.95 },
  "p-caustic": { x: 54, y: 2.5, z: 37, zoom: 0.95 },
  // Band D labs 1
  "p-aether-lang": { x: -44, y: 2.5, z: -26, zoom: 0.95 },
  "p-resolvent": { x: -22, y: 2.5, z: -3, zoom: 0.95 },
  "p-tangle": { x: -48, y: 2.5, z: 2, zoom: 0.95 },
  "p-faraday": { x: -28, y: 2.5, z: 22, zoom: 0.95 },
  "p-separatrix": { x: -50, y: 2.5, z: 26, zoom: 0.95 },
  "p-topological-ml-toolkit": { x: -27, y: 2.5, z: 42, zoom: 0.95 },
};

export const PLACES = [home, ...upstream, ...lab];
for (const p of PLACES) p.look = LOOK_AT[p.id] ?? { x: p.x, y: 2.2, z: p.z };
export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

// Every area once: the igloo's and the landforms' districts, then each lab
// building's radioactive area.
export const DISTRICTS = [...Object.values(UPSTREAM_DISTRICTS), ...lab.map((p) => p.district)];

// The area (x, z) is in, or null: where circles overlap, the one whose
// centre is nearest relative to its size.
export function districtAt(x, z) {
  let best = null;
  let bestT = 1;
  for (const d of DISTRICTS) {
    const t = Math.hypot(x - d.x, z - d.z) / d.radius;
    if (t < bestT) {
      bestT = t;
      best = d;
    }
  }
  return best;
}

// Where the seal parks to read a place: on the side facing the camera.
export function dockPoint(place) {
  return { x: place.x, z: place.z + place.radius + 1.6 };
}
