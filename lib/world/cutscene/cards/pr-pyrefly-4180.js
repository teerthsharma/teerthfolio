// pyrefly: Naruto, the night of the Nine-Tails, chained and sealed. A monster is not killed and not hidden: it is
// chained down and sealed where everyone can see it, so it cannot get loose. That is should_panic. The dock is a
// chain of 208 two-module SCCs; the hero is a seal. KIRI-E PAPER THEATRE: a back-lit cut-paper shadow theatre.
// The dock builder owns this file and moves/pr-pyrefly-4180.jsx (parts in moves/pr-pyrefly-4180/); the fields are in
// cards/index.js. The land speaks (Kurama and the clearing); Kushina's one line is a bubble the move draws itself.
// A level lens, stood back: the fox over the pup, the pup above the bubbles. Round head, no ears.
export default {
  id: "pr-pyrefly-4180",
  homage: "Naruto: the Nine-Tails attack, Kushina's chains and the Fourth's seal",
  why: "A failure is not argued about: it is chained where everyone can see it and pinned with should_panic.",
  stage: { color: "#3a2a6a", stars: "none", halftone: 0, sfx: " " },
  length: 19.4,
  beats: { lineA: 2.3, move: [5.3, 6.0], lineB: 6.0, lineC: 10.5, credit: 15.5 },
  speaker: "land",
  landAt: { x: 79, y: 2, z: -33 }, // the clearing lies beyond the outflow: the rig turns toward it
  view: { wide: [[0.4, 1.2, -1.0], [-0.1, 0.0, 10.6]], tall: [[0.3, 1.5, -1.0], [-0.1, 0.1, 13.8]] },
  // the fox speaks from its jaws (a tail aimed in the rig's frame: x right, y up, z toward the lens)
  tail: { a: [-2.4, 3.6, -8.4] },
  a: { who: "land", text: "You can't hold me forever!", kind: "burst" },
  b: { who: "seal", text: "I don't need forever. I just need you pinned.", kind: "oval" },
  c: { who: "seal", text: "208 two-module SCCs chained in one Rust test. The failure is pinned at the end with should_panic.", kind: "burst" },
  credit: { title: "facebook/pyrefly #4180", sub: "208 SCCs pinned" },
  bold: ["forever", "pinned", "208 two-module SCCs chained in one Rust test."],
  move: { pose: "raise", note: "Kiri-e paper theatre: the pup throws 208 gold links round a cut-paper Kurama, a violet hoop shuts at link 100, a coral surge bursts at the pin and a kirigami rosette holds it, then a brass split-pin seals it. The paper stage folds away at the end." },
};
