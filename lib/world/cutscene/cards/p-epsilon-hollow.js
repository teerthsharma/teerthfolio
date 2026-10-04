// epsilon-hollow: Fullmetal Alchemist: Brotherhood, the Promised Day, as a Victorian pop-up alchemy book.
// Father cuts every circle in the land (every one of them drew on his stone, the way a program leans on libc);
// the pup's clap still works, because it never ran on him: bare metal x86_64, no POSIX, no libc. The dock builder
// owns this file and moves/p-epsilon-hollow.jsx (parts in moves/p-epsilon-hollow/); the fields are in cards/index.js.
// The return home: the eclipse ends, the pop-ups fold flat and the book closes on the Promised Day. The beats keep
// the owner's pacing: every bubble up at least 3.5 s (the flex, 13 words, 4.7 s), the credit card up 3.5 s.
export default {
  id: "p-epsilon-hollow",
  homage: "Fullmetal Alchemist: Brotherhood, the Promised Day (Father cuts every circle; the clap still works)",
  why: "Father is libc: every circle drew on his stone. The pup never linked it, and its power comes up through the bare metal.",
  stage: { color: "#c8352b", stars: "none", halftone: 0, sfx: "CLAP" },
  length: 17.4,
  beats: {
    sign: [0.005, 0.01],
    impact: 0.02,
    bloom: [0.02, 0.2],
    enter: 0.21,
    lineA: 0.9,
    move: [3.9, 4.4],
    lineB: 4.4,
    lineC: 7.9,
    credit: 12.7,
    collapse: [16.2, 16.6],
    frame: 1.6,
    radius: 45, // the book stands wider than the lens is far, so the island is hidden from the first frame
  },
  speaker: { build: "tall", hair: "none", prop: "cane", pose: "side" },
  // a level lens, stood back: the sphere over the plaza, the pup above the bubbles, Father on the steps behind
  view: { wide: [[0.3, 2.2, -1.0], [0.0, 2.4, 27.0]], tall: [[0.2, 3.5, -1.0], [0.0, 2.6, 28.0]] },
  tail: { a: [-5.0, 5.8, -16.6] }, // Father's mouth, on the Central Command steps
  a: { who: "sil", text: "Every circle in this land runs on my stone." },
  b: { who: "seal", text: "I never ran on your stone.", kind: "burst" },
  c: { who: "seal", text: "Bare metal x86_64. No POSIX. No libc. Memory, files and scheduler, on one sphere.", kind: "burst" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "raise", note: "A pop-up book of Central City on the Promised Day: Father cuts every circle, the pup claps anyway, gold rises from the bedrock and folds the page into the Epsilon-Hollow sphere. The book closes on the day." },
  bold: ["my", "your stone", "Bare metal x86_64. No POSIX. No libc."],
};
