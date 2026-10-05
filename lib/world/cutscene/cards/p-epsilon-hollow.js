// epsilon-hollow: the Akatsuki hideout's play (issue 10 W3, the owner's spec): a custom DOMAIN EXPANSION, the GRAVEYARD OF
// EFFORTS. After Yuta Okkotsu's True Mutual Love (countless swords in a field under a dark sky): gravestones to the
// horizon, each a PR that never landed; EPSILON-HOLLOW hangs over them as a black hole (memory, files and scheduler
// spiral in); the seal draws one stone like a sword and cuts the world, and the island shows through the slash (the
// explained return). The Tensura play (Rimuru, Veldora, Predator, "Kwahaha", into.from 0.611) left with the seal for the
// spawn statue; none of it is here. Move: components/world/cutscene/moves/p-epsilon-hollow.jsx.
export default {
  id: "p-epsilon-hollow",
  homage: "a custom domain expansion after Yuta Okkotsu's True Mutual Love: a field to the horizon under a dark sky, gravestones for swords",
  why: "Every closed PR taught the next one: memory, files and scheduler on one sphere stand on all of them.",
  stage: { color: "#e8b54a", stars: "none", halftone: 0, sfx: "開" },
  length: 29.2,
  beats: {
    sign: [0.2, 0.9],
    impact: 1.0,
    bloom: [1.0, 1.6],
    enter: 2.8,
    lineA: 3.2,
    move: [6.0, 8.6],
    lineB: 8.6,
    lineC: 14.0,
    credit: 22.7,
    collapse: [26.7, 28.2],
  },
  // the grammar: back off the dock, switch on the bloom, come onto the seal from its west flank, low; the kill is the cut
  pull: { far: 60, fov0: 46, fov1: 58 }, // the establishing wide: the obelisk field to the horizon, the black sea, the maw
  into: { from: -0.45, elev: 1.0, fov: 46 },
  kill: { what: "the drawn gravestone cuts the world: the domain splits and the island shows through the slash", at: "collapse" },
  fog: { near: 200, far: 600 }, camFar: 600,
  speaker: "land",
  landAt: { x: 44, y: 2.4, z: 66 }, // the hideout's mouth
  a: { who: "seal", text: "Domain Expansion: Graveyard of Efforts.", kind: "box" },
  b: { who: "seal", text: "Every stone here is a PR that never landed.", kind: "whisper" },
  c: { who: "seal", text: "Effort never gets wasted.", kind: "box" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "raise", note: "Graveyard of Efforts: gravestones to the horizon, Epsilon-Hollow as a black hole, the seal draws a stone like a sword and cuts the world open onto the island." },
  bold: ["Domain Expansion:", "Graveyard of Efforts.", "never landed.", "Effort never gets wasted."],
};
