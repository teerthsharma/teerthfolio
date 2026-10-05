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
  // issue #9 camera grammar: zoom out from the real dock, switch, zoom into the seal from a bent degree (azimuth rad, positive west)
  pull: { far: 44, fov0: 28, fov1: 42 },
  into: { from: 0.785, elev: 0.55, fov: 56 },
  kill: { what: "the fox is chained and the paper stage folds", at: "lineC" },
  fog: { near: 140, far: 520 },
  camFar: 900,
  // the owner's pacing law: a bubble is up 5 s (the flex, 17 words, 7.7 s), the credit card 4 s or more, a 0.8 s breath between
  // beats. A 28.4 s play: A 2.3, B 8.3, the flex 14.3, the credit 22.8, the island's return from 26.0, the collapse 27.6.
  length: 28.4,
  beats: { lineA: 2.3, move: [7.2, 7.9], lineB: 7.9, lineC: 14.3, credit: 22.8, collapse: [27.6, 28.0] },
  speaker: "land",
  landAt: { x: 79, y: 2, z: -33 }, // the clearing lies beyond the outflow: the rig turns toward it
  view: { wide: [[0.4, 0.55, -1.0], [-0.1, 0.5, 11.5]], tall: [[0.3, 0.8, -1.0], [-0.1, 0.6, 15.0]] },
  // the fox speaks from its jaws (a tail aimed in the rig's frame: x right, y up, z toward the lens)
  tail: { a: [-2.4, 3.6, -8.4], b: "pup", c: "pup" },
  a: { who: "land", text: "You can't hold me forever!", kind: "burst" },
  b: { who: "seal", text: "Flying Thunder God.", kind: "oval" },
  c: { who: "seal", text: "208 two-module SCCs chained in one Rust test. The failure is pinned at the end with should_panic.", kind: "burst" },
  credit: { title: "facebook/pyrefly #4180", sub: "208 SCCs pinned · the paper stage folds and the island is behind it" },
  bold: ["Flying Thunder God", "pinned", "208 two-module SCCs chained in one Rust test."],
  move: { pose: "raise", note: "Kiri-e paper theatre: the pup throws three yellow kunai round Kurama and flashes to each in turn (Flying Thunder God, yellow streaks), then 208 gold links chain the fox from the third kunai, a violet hoop shuts at link 100, a coral surge bursts at the pin and a kirigami rosette holds it, then a brass split-pin seals it. The paper stage folds away at the end." },
};
