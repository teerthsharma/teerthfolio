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
};

// Areas of the island. Arriving in one puts its name on screen (the HUD's
// banner). EVERY area is radioactive: `radiation` is its colour (the glow in
// its snow, its motes, and the look the seal mutates into inside it), and
// `hot` lists its hot spots [x, z] (world metres), where the glow, the
// shimmer and the Geiger crackle peak. { id, name, x, z, radius } is the
// area's circle; the circles never overlap, so the seal is in one area at a
// time. `color` is the org's accent, for the minimap. Names are districts
// and set pieces, never a project's name: a lab area is named by its
// project's own name from showcase.json. Neighbouring areas never share a
// hue, and every radiation colour reads on warm-white snow (npm run check).
const UPSTREAM_DISTRICTS = {
  home: { name: "The Igloo", x: 0, z: -8, radius: 9, color: "#7fc8f8", radiation: "#e94bff", hot: [[0, -8]] },
  triton: {
    name: "Triton",
    x: 6,
    z: -68,
    radius: 13,
    color: ORG_COLOR["triton-lang"],
    radiation: "#1ec8f0", // Cherenkov blue in the glacier ice
    hot: [[-4, -73], [14, -75]], // the ice cave the river leaves by; the icefall above the viewpoint
  },
  mujorush: {
    name: "Mount MujoRush",
    x: -35,
    z: -50,
    radius: 16,
    color: ORG_COLOR["google-deepmind"],
    radiation: "#c72bee",
    hot: [[-46, -57], [-35, -57], [-24, -57]], // the three carved faces
  },
  highway: { name: "Highway Pass", x: 38, z: -64, radius: 10, color: ORG_COLOR.google, radiation: "#ff4d6a", hot: [[38, -71]] }, // the saddle
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
  "pr-highway-3244": [38, -63, 2.5, "highway"], // at the mouth of the pass, the saddle behind it
  "pr-xnnpack-10801": [60, -48, 2.5, "xnnpack"], // at the foot of XNNPACK's mountain
  "pr-tensorflow-124410": [4, -24, 3, "dam"], // below the ice dam's front, in the dry old riverbed
  "pr-openxla-46539": [-12, -24, 3, "geyser"], // the geyser's sinter mound (the vent), at the dam's foot
  "pr-nemo-relay-481": [40, -10.5, 2, "moat"], // the moat's south bank, facing its ice island
  "pr-topograph-432": [52, -10.5, 2, "moat"],
  "pr-pyrefly-4180": [74, -24, 2, "pyrefly"], // the outflow's south bank, the chained floes before it
};

// The science quarter: each lab building on open snow, in a radioactive
// area of its own. [x, z]; neighbours never share a hue.
const LAB_AT = {
  "p-aether-lang": [-44, -26],
  "p-resolvent": [-22, -3],
  "p-tangle": [-48, 2],
  "p-faraday": [-28, 22],
  "p-separatrix": [-50, 26],
  "p-topological-ml-toolkit": [-22, 48],
  "p-monodromy": [0, 48],
  "p-nerve": [21, 2],
  "p-epsilon-hollow": [18, 30],
  "p-planimeter": [52, 12],
  "p-caustic": [54, 38],
};
const LAB_COLOR = ["#8a5cff", "#4f7cff", "#f5b43c", "#e0559b", "#14b8a6", "#d946ef", "#ff8a3d", "#ef4444", "#06b6d4", "#f59e0b", "#22c55e"];
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
    radiation: color,
    x,
    z,
    radius: 3,
    district: { id: p.id, name: p.name, x, z, radius: RADIATION_RADIUS, radiation: color, color, hot: [[x, z]] },
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

export const PLACES = [home, ...upstream, ...lab];
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
