// the Highway: Cars, Lightning McQueen at the speedway, in shape and colour only. The island's highway car is
// promoted: a red stock car with lightning bolts, #3244 on the doors and friendly windscreen eyes. It says
// "I am speed." on the grid; the pup climbs onto its roof; the rivals drag tangled comparison lines between
// every pair; the car checks only the slice ahead (one clean line) and blows past them all, drifting through
// tyre smoke with a Ka-chow glint. Crossing the line so fast that the chequered flag wraps the lens like a
// page turning, they roll back onto the island's own roundabout, where the pup says the flex line.
// The dock builder owns this file and moves/pr-highway-3244.jsx (parts in moves/pr-highway-3244/); the fields are in cards/index.js.
export default {
  id: "pr-highway-3244",
  homage: "Cars: Lightning McQueen at the speedway",
  why: "The slice already ruled the pairs out.",
  stage: { color: "#ff5a3c", stars: "none", halftone: 6, sfx: "KA-CHOW" },
  length: 25.8,
  beats: { lineA: 2.4, move: [7.2, 7.8], lineB: 15.3, credit: 21.0, collapse: [25.0, 25.4], radius: 26 }, // paced: A up 5 s, the race held, B up 5.7 s, the card 4 s
  speaker: "land",
  landAt: { x: -26.98, y: 0.9, z: -20.72 }, // the dock (-28, -18.8) plus the guest's grid slot: the rig turns the car to the right
  // a level lens, stood back: the grid and the pup above the bubbles
  view: { wide: [[0.2, 1.9, -1.2], [0.5, 0.35, 17.5]], tall: [[0.3, 2.1, -1.2], [0.5, 0.4, 17.5]] },
  a: { who: "land", text: "I am speed." },
  b: { who: "seal", text: "Ka-chow. 65.5x fewer comparisons. The slice already knew.", kind: "burst" },
  credit: { title: "google/highway #3244 · 65.5x fewer comparisons", sub: "The slice already knew." },
  move: { pose: "crouch", then: "raise", note: "The island's highway car is promoted to a red stock car at a sunset speedway; the pup rides its roof past a tangled grid of rivals; the chequered flag wraps the screen like a page and they roll back onto the roundabout." },
  bold: ["I am speed", "Ka-chow", "65.5x fewer comparisons", "The slice already knew"],
};
