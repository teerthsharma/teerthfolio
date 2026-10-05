// the Highway: Fate/Zero, Iskandar's Gordius Wheel: a bronze-and-gold chariot drawn by two black divine bulls,
// lightning on hooves and wheels, the pup standing in it under a crimson cape. Same race, drift and physics as before;
// the war cry AAALALALALAI! is the burst; Via Expugnatio is the road the slice rides.
// The dock builder owns this file and moves/pr-highway-3244.jsx (parts in moves/pr-highway-3244/); the fields are in cards/index.js.
export default {
  id: "pr-highway-3244",
  jokeSlot: "a",
  jokes: [
    "Via Expugnatio! Ionioi Hetairoi, ride!",
    "Gordius Wheel, charge! The King of Conquerors rides!",
    "Conquest is the dream! Ride beside me, little king!",
    "The road ahead is ours! Trample it!",
    "A king who rides alone is no king. Ride with me!",
    "Thunder on the hooves! Show them who rules this road!",
    "Raise the cape! The King of Conquerors has a rival!",
    "Beyond the horizon lies Oceanus! Forward!",
    "Ride, little seal! Show them a king's charge!",
    "Heroes of my army, behold the seal who leads!",
    "The divine bulls answer only to a conqueror. Ride!",
    "No road too long, no rival too fast! Charge!",
    "This is the Army of the King! Stampede!",
    "Ionioi Hetairoi! Every rider for the seal!",
    "Let the world hear our war cry!",
  ],
  homage: "Fate/Zero: Iskandar and the Gordius Wheel",
  why: "The slice already ruled the pairs out.",
  stage: { color: "#ff5a3c", stars: "none", halftone: 6, sfx: "AAALALALALAI" },
  // issue #9 camera grammar: zoom out from the real dock, switch, zoom into the seal from a bent degree (azimuth rad, positive west)
  pull: { far: 44, fov0: 28, fov1: 42 },
  into: { from: 0.436, elev: 0.3, fov: 52 },
  kill: { what: "rivals roll back onto the roundabout", at: "lineB" },
  fog: { near: 160, far: 520 },
  camFar: 900,
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
