// the Highway: Fate/Zero, Iskandar's Gordius Wheel: a bronze-and-gold chariot drawn by two black divine bulls,
// lightning on hooves and wheels, the pup standing in it under a crimson cape. Same race, drift and physics as before;
// the war cry AAALALALALAI! is the burst; Via Expugnatio is the road the slice rides.
// The dock builder owns this file and moves/pr-highway-3244.jsx (parts in moves/pr-highway-3244/); the fields are in cards/index.js.
export default {
  id: "pr-highway-3244",
  homage: "Fate/Zero: Iskandar and the Gordius Wheel",
  why: "The slice already ruled the pairs out.",
  stage: { color: "#ff5a3c", stars: "none", halftone: 6, sfx: "AAALALALALAI" },
  length: 25.8,
  beats: { lineA: 2.4, move: [7.2, 7.8], lineB: 15.3, credit: 21.0, collapse: [25.0, 25.4], radius: 26 }, // paced: A up 5 s, the race held, B up 5.7 s, the card 4 s
  speaker: "land",
  landAt: { x: -28.25, y: 0.9, z: -20.96 }, // the dock (-28, -18.8) plus the guest's grid slot: the rig turns the car to the right
  // a level lens, stood back: the grid and the pup above the bubbles
  view: { wide: [[0.6, 1.5, -0.8], [0.4, 0.5, 11.5]], tall: [[0.6, 1.7, -0.8], [0.4, 0.6, 15]] },
  a: { who: "land", text: "Via Expugnatio! Ionioi Hetairoi, ride!" },
  b: { who: "seal", text: "AAALALALALAI! 65.5x fewer comparisons. The slice already knew.", kind: "burst" },
  credit: { title: "google/highway #3244 · 65.5x fewer comparisons", sub: "The slice already knew." },
  move: { pose: "crouch", then: "raise", note: "Iskandar's Gordius Wheel, two divine bulls wreathed in lightning, carries the pup (cape streaming) down the grid past the rivals via Via Expugnatio; the flag wraps the screen like a page and they roll back onto the roundabout." },
  bold: ["Via Expugnatio", "Ionioi Hetairoi", "AAALALALALAI", "65.5x fewer comparisons", "The slice already knew"],
};
