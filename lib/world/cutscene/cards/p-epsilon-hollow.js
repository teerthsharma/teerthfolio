// epsilon-hollow: Tensura (That Time I Got Reincarnated as a Slime). The pup, still a seal, is reincarnated at a cave pool; the
// Great Sage announces Predator while Veldora hangs sealed in his sphere; the pup becomes Demon Lord Rimuru (black hair, golden
// eyes), MEGIDDO rains sunbeams, and he eats reality: a void maw devours sky, ground and the seal, which is the explained return.
// The dock builder owns this file and moves/p-epsilon-hollow.jsx (parts in moves/p-epsilon-hollow/); the fields are in cards/index.js.
export default {
  id: "p-epsilon-hollow",
  homage: "That Time I Got Reincarnated as a Slime (Rimuru, the Great Sage, Veldora, Megiddo, Predator)",
  why: "Predator eats the whole dimension: the pup swallows the sphere of memory, files and scheduler whole, with no POSIX and no libc.",
  stage: { color: "#1fb8ff", stars: "none", halftone: 0, sfx: "PLOP" },
  length: 30.0,
  beats: {
    sign: [0.2, 0.9],
    impact: 1.0,
    bloom: [1.0, 1.5],
    enter: 2.8,
    lineA: 3.4,
    move: [4.4, 8.6],
    lineB: 8.6,
    lineC: 13.8,
    credit: 22.6,
    collapse: [26.8, 29.3],
    frame: 0.4,
    radius: 45, // the stage hides the island from the first frame
  },
  speaker: "land",
  landAt: { x: 3.1, y: 2.4, z: -1.5 }, // Veldora, in his seal
  view: { wide: [[-0.3, 1.5, 1.5], [0.0, 2.4, 11.0]], tall: [[-0.3, 1.7, 1.5], [0.0, 3.0, 15.0]] },
  a: { who: "land", text: "Kwahaha! What does that one do?" },
  b: { who: "seal", text: "Oops. Wrong place.", kind: "whisper" },
  c: { who: "seal", text: "Bare metal x86_64. No POSIX. No libc. I never ran on your stone. Memory, files and scheduler, on one sphere.", kind: "burst" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "crouch", note: "Tensura: the pup is reincarnated at a cave pool, the Great Sage announces Predator, Veldora sits sealed, the pup becomes Demon Lord Rimuru, Megiddo rains, and a void maw eats reality: the explained return." },
  bold: ["Kwahaha!", "Oops.", "your stone", "Bare metal x86_64. No POSIX. No libc."],
};
