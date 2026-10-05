// the Highway: Fate/Zero, Iskandar's Gordius Wheel: a bronze-and-gold chariot drawn by two black divine bulls,
// lightning on hooves and wheels. ISKANDAR, the giant red-bearded King of Conquerors in bronze and a crimson cloak,
// sits at its front with the reins, laughing; the seal rides on his shoulder. He speaks line A; his war cry
// AAALALALALAI! (lettered, at the move beat) releases the bulls; the seal's one line is the flex.
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
  // the law: out to a plate (420 m), the switch at the wide, then a LOW arc in from 25 deg west, eye 0.3 m under the
  // giant king (the low tracking shot by the wheels); the kill's third angle opens on the war cry (the hero push-in)
  pull: { far: 420, fov0: 28, fov1: 44 },
  into: { from: 0.436, elev: 0.3, fov: 50 },
  kill: { what: "the war cry: the bulls burst out and fling the rivals in lightning", at: 7.55 },
  fog: { near: 160, far: 520 },
  camFar: 900,
  length: 25.8,
  beats: { lineA: 2.4, move: [7.2, 7.8], lineB: 15.3, credit: 21.0, collapse: [25.0, 25.4], radius: 26 }, // paced: A up 5 s, the race held, B up 5.7 s, the card 4 s
  speaker: "land",
  landAt: { x: -28.25, y: 4.6, z: -20.96 }, // the dock (-28, -18.8) plus the guest's grid slot, at the king's head: he speaks
  // stood back on the king and the seal on his shoulder, the bulls and the grid round them
  view: { wide: [[0.6, 2.6, -0.8], [0.4, 0.5, 15]], tall: [[0.6, 2.8, -0.8], [0.4, 0.6, 19]] },
  a: { who: "land", text: "Via Expugnatio! Ionioi Hetairoi, ride!" },
  b: { who: "seal", text: "AAALALALALAI! 65.5x fewer comparisons. The slice already knew.", kind: "burst" },
  credit: { title: "google/highway #3244 · 65.5x fewer comparisons", sub: "The slice already knew." },
  move: { pose: "crouch", then: "raise", note: "Iskandar, seated at the front of the Gordius Wheel with the pup on his shoulder, raises his sword and cries AAALALALALAI!; the sky strikes the two divine bulls and they burst off the line, the wheel charging through the pack and flinging the rivals away in lightning (Via Expugnatio); the flag wraps the screen like a page and they roll back onto the roundabout." },
  bold: ["Via Expugnatio", "Ionioi Hetairoi", "AAALALALALAI", "65.5x fewer comparisons", "The slice already knew"],
};
