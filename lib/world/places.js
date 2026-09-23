// Every monument on the island, and where it stands.
//
// The words are NOT written here. They come verbatim from
// teerthsharma.github.io through data/showcase.json (see
// scripts/extract-showcase.mjs): the eleven landed upstream contributions and
// the eleven projects in the lab. This file only adds what the landing site
// has no need for: a colour, a position, and a footprint.

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

export const ISLAND_RADIUS = 70;
export const SPAWN = { x: 0, z: 9, heading: Math.PI };

// Org colours for the upstream monuments: the org's own brand hue, used as
// the one accent on its monument.
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

// The upstream district, north of the igloo, in the landing site's ranking:
// the first two stand either side of the avenue's mouth, nearest the seal.
const UPSTREAM_SLOTS = [
  [-14, -26], [14, -26], [-28, -26], [28, -26],
  [-14, -40], [14, -40], [-28, -40], [28, -40],
  [-14, -54], [14, -54], [-28, -54],
];

// The lab, in two wings either side of the spawn plaza.
const LAB_SLOTS = [
  [-26, 2], [26, 2], [-40, 2], [40, 2],
  [-26, 16], [26, 16], [-40, 16], [40, 16],
  [-26, 30], [26, 30], [-40, 30],
];
const LAB_COLOR = ["#8a5cff", "#4f7cff", "#f5b43c", "#e0559b", "#14b8a6", "#d946ef", "#ff8a3d", "#ef4444", "#06b6d4", "#f59e0b", "#22c55e"];

const upstream = showcase.upstream.map((u, i) => {
  const [value, ...rest] = u.headline.split(" ");
  return {
    id: u.id,
    section: "upstream",
    tier: "building",
    name: u.headline,
    kind: `${u.repo} #${u.pr}`,
    color: ORG_COLOR[u.org] ?? "#4f7cff",
    x: UPSTREAM_SLOTS[i][0],
    z: UPSTREAM_SLOTS[i][1],
    radius: 4,
    hook: u.result,
    proof: [
      { value, label: rest.join(" ") },
      { value: u.tags[0] ?? "", label: u.tags.slice(1).join(", ") },
    ],
    body: u.body,
    links: [{ label: `${u.repo} #${u.pr}`, url: u.url }],
    // the landing site's card, whole: the panel and the monument read these
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

const lab = showcase.lab.map((p, i) => ({
  id: p.id,
  section: "lab",
  tier: "landmark",
  name: p.name,
  kind: p.tagline,
  color: LAB_COLOR[i % LAB_COLOR.length],
  x: LAB_SLOTS[i][0],
  z: LAB_SLOTS[i][1],
  radius: 3,
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
}));

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

// Where the seal parks to read a monument: on the side facing the camera.
export function dockPoint(place) {
  return { x: place.x, z: place.z + place.radius + 1.6 };
}
