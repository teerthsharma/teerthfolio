// epsilon-hollow: Tensura (That Time I Got Reincarnated as a Slime). The pup, still a seal, is reincarnated at a cave pool; the
// Great Sage announces Predator while Veldora hangs sealed in his sphere; the pup becomes Demon Lord Rimuru (black hair, golden
// eyes), MEGIDDO rains sunbeams, and he eats reality: a void maw devours sky, ground and the seal, which is the explained return.
// The dock builder owns this file and moves/p-epsilon-hollow.jsx (parts in moves/p-epsilon-hollow/); the fields are in cards/index.js.
export default {
  id: "p-epsilon-hollow",
  homage: "That Time I Got Reincarnated as a Slime (Rimuru, the Great Sage, Veldora, Megiddo, Predator)",
  why: "Predator eats the whole dimension: the pup swallows the sphere of memory, files and scheduler whole, with no POSIX and no libc.",
  stage: { color: "#1fb8ff", stars: "none", halftone: 0, sfx: "PLOP" },
  length: 27.0,
  beats: {
    sign: [0.2, 0.9],
    impact: 1.0,
    bloom: [1.0, 1.5],
    enter: 2.8,
    lineA: 3.4,
    move: [4.4, 8.6],
    lineB: 8.6,
    lineC: 13.8,
    credit: 20.2,
    collapse: [24.4, 25.6],
    frame: 0.4,
    radius: 45, // the stage hides the island from the first frame
  },
  speaker: "land",
  view: { wide: [[-0.3, 1.5, 1.5], [0.0, 2.4, 11.0]], tall: [[-0.3, 1.7, 1.5], [0.0, 3.0, 15.0]] },
  a: { who: "seal", text: "That time I got reincarnated as a seal... slime?" },
  b: { who: "seal", text: "Bare metal x86_64. No POSIX. No libc.", kind: "burst" },
  c: { who: "seal", text: "I never ran on your stone. Memory, files and scheduler, on one sphere.", kind: "burst" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "crouch", note: "Tensura: the pup is reincarnated at a cave pool, the Great Sage announces Predator, Veldora sits sealed, the pup becomes Demon Lord Rimuru, Megiddo rains, and a void maw eats reality: the explained return." },
  bold: ["reincarnated", "your stone", "Bare metal x86_64. No POSIX. No libc."],
};
