// epsilon-hollow: the Akatsuki hideout's play (the owner, 2026-10-06: "the graveyard is a PLANET. You zoom out of that
// planet to see the SUN of that planet is an EYED BLACK HOLE, and inside that planet is just graves of dead eldritch
// things"). A custom DOMAIN EXPANSION, the GRAVEYARD OF EFFORTS: the pup stands on a small dead world of petrified
// horrors (the near ones carry the owner's 31 closed PRs); the camera law's pull leaves the surface, the planet shrinks
// to a sphere and its sun comes into frame, EPSILON-HOLLOW as a black hole with an eye; the into-arc dives back to the
// pup, which draws a shard from a sleeping horror and cuts the world: the cut is the return. The domain is already up at
// the open (the spec lets Epsilon skip the dock pull), so the law's pull is the zoom out of the planet.
// Move: components/world/cutscene/moves/p-epsilon-hollow.jsx.
export default {
  id: "p-epsilon-hollow",
  homage: "a custom domain expansion: a planet of dead eldritch gods in stone, orbiting a black hole that has an eye",
  why: "Every closed PR taught the next one: memory, files and scheduler on one sphere stand on all of them.",
  stage: { color: "#e8b54a", stars: "none", halftone: 0, sfx: "開" },
  length: 29.3,
  beats: {
    sign: [0.05, 0.2],
    impact: 0.25,
    bloom: [0.0, 3.0], // the domain is up at the open; the swell ends where the dive begins (camera.js: in0 = bloom[1]), so the wide holds 0.5 to 3.0 s
    radius: 6000, // the stage hides the island out to the wide and past it
    enter: 3.1,
    lineA: 3.8,
    move: [6.4, 9.0],
    lineB: 9.0,
    lineC: 14.6,
    credit: 23.0,
    collapse: [27.0, 28.5],
  },
  // the grammar: the pull is the zoom out of the planet (back and up 560 m at 12 deg, aimed 31 m under the pup's feet
  // so the planet sits low and its sun, the eye, high); hold the wide; the into-arc dives onto the pup low, turned so
  // the eye rises over the horizon behind it
  pull: { far: 560, fov0: 46, fov1: 58, rise: 12, look: [0, -31, 0], at: [0.5, 1.4, 1.9, 2.7] },
  frame: { off: [3, 4], allowSmall: [3, 4] }, // the wide is the money shot: the pup is a pixel in it, by design
  into: { from: -1.0, elev: 0.9, fov: 46 },
  kill: { what: "the drawn gravestone cuts the world: the domain splits and the island shows through the slash", at: "collapse" },
  fog: { near: 1500, far: 5000 }, camFar: 6000, // the planet is the drawing's own; the scene fog only closes past the wide
  speaker: "land",
  landAt: { x: 44, y: 2.4, z: 66 }, // the hideout's mouth
  a: { who: "seal", text: "Domain Expansion: Graveyard of Efforts.", kind: "box" },
  b: { who: "seal", text: "Every stone here is a PR that never landed.", kind: "whisper" },
  c: { who: "seal", text: "Effort never gets wasted.", kind: "box" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "raise", note: "Graveyard of Efforts: a planet of petrified horrors orbiting Epsilon-Hollow, an eyed black hole; the seal draws a shard from a sleeping horror and cuts the world open onto the island." },
  bold: ["Domain Expansion:", "Graveyard of Efforts.", "never landed.", "Effort never gets wasted."],
};
