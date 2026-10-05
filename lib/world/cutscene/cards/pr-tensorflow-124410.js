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
  // issue #9 camera grammar: zoom out from the real dock, switch, zoom into the seal from a bent degree (azimuth rad, positive west)
  pull: { far: 48, fov0: 28, fov1: 42 },
  into: { from: -0.349, elev: 1.9, fov: 56 },
  kill: { what: "the fourth edge drowns", at: "lineB" },
  fog: { near: 140, far: 520 },
  camFar: 900,
  length: 17.4,
  // the lens stands 21 m back, so the stage's sphere (16 m by default) must swell past it
  beats: { lineA: 3.0, move: [5.0, 6.2], lineB: 8.2, credit: 13.0, collapse: [16.6, 17.0], radius: 40 },
  speaker: "land",
  landAt: { x: -9, y: 2, z: -46 }, // turns the rig so the real island's dock barrier is not behind the pup's head
  // a low lens, stood back: the Stand over the pup, the gantry's four edges over the Stand, the rival on the tower
  view: { wide: [[0.25, 1.9, -0.9], [-0.15, -0.5, 15.6]], tall: [[0.2, 3.4, -0.9], [-0.15, -1.9, 24]] },
  tail: { a: [2.9, 8.4, -10.0], b: "pup" },
  a: { who: "land", text: "Oh? You're approaching me?" },
  b: { who: "seal", text: "Four edges. Three remain. +362/-26 across 4 files.", kind: "burst" },
  credit: { title: "tensorflow/tensorflow #124410 · 4 edges to 3", sub: "Four control edges emitted where the unique transitive reduction is three.", ret: "The world resumes: the seal steps out of the stopped second." },
  move: { pose: "sign", then: "fist", note: "The pup's Stand rises over the dam and throws the MUDA barrage at the fourth control edge; time stops, then runs; the edge falls and drowns, three remain, and the picture tears away." },
  bold: ["approaching me", "Four edges", "Three remain"],
};
