// the dam: JoJo's Bizarre Adventure, in Araki's psychedelic dimension. The pup's own Stand throws the MUDA
// barrage at the fourth control edge, time stops (the colours invert, a clock ticks, the spray hangs over the
// reservoir) and resumes; the edge falls and drowns, three remain, and the stopped second is over: the picture
// tears off like a poster and the pup is home. The dock builder owns this file and moves/pr-tensorflow-124410.jsx
// (parts in moves/pr-tensorflow-124410/); the fields are in cards/index.js. The rival speaks from the valve
// tower in the reservoir (the tail reaches it); the pup says the flex line on the real island, in the JoJo pose.
export default {
  id: "pr-tensorflow-124410",
  homage: "JoJo's Bizarre Adventure: the Stand's MUDA barrage and the stopped second, in Araki's psychedelic dimension",
  why: "The fourth control edge was already implied.",
  stage: { color: "#c026d3", stars: "none", halftone: 6, sfx: "MUDA" },
  length: 14.7,
  // the lens stands 21 m back, so the stage's sphere (16 m by default) must swell past it
  beats: { lineA: 3.0, move: [5.0, 6.2], lineB: 7.2, credit: 10.9, collapse: [13.9, 14.3], radius: 40 },
  speaker: "land",
  landAt: { x: -9, y: 2, z: -46 }, // turns the rig so the real island's dock barrier is not behind the pup's head
  // a low lens, stood back: the Stand over the pup, the gantry's four edges over the Stand, the rival on the tower
  // (the pup is shown at 1.2x and the dimension at 0.52x: the same picture as 1.7x and 0.74x, drawn from 0.706 of the distance)
  view: { wide: [[0.18, 1.34, -0.64], [-0.11, -0.35, 11.0]], tall: [[0.14, 2.4, -0.64], [-0.11, -1.34, 16.9]] },
  // the rival's torso: the move rewrites tail.a every frame to follow it (it stands right of the Stand, on the tower)
  tail: { a: [3.5, 4.5, -6.0], b: "pup" },
  a: { who: "land", text: "Oh? You're approaching me?" },
  b: { who: "seal", text: "Four edges. Three remain. +362/-26 across 4 files.", kind: "burst" },
  credit: { title: "tensorflow/tensorflow #124410 · 4 edges to 3", sub: "Four control edges emitted where the unique transitive reduction is three." },
  move: { pose: "sign", then: "fist", note: "The pup's Stand rises over the dam and throws the MUDA barrage at the fourth control edge; time stops, then runs; the edge falls and drowns, three remain, and the picture tears away." },
  bold: ["approaching me", "Four edges", "Three remain"],
};
