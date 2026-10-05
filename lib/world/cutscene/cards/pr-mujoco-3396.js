// Mount MujoRush: Attack on Titan, the Walls were Titans, and the Rumbling, seal edition. ONE cinematic for the
// whole mountain: approaching any of its three docks (#3396, mujoco_warp #1541, #3450; their cards say
// `plays: "pr-mujoco-3396"`) plays this, once a session, and marks all three seen (Controller.jsx).
// The Wall that caged the solver was 1,282 copies of the one cube the forest needs; the seal eats the copies,
// the Wall opens on the sea, and the sea's colour washes the charcoal drawing off the real island.
// The dock builder owns this file and moves/pr-mujoco-3396.jsx (parts in moves/pr-mujoco-3396/); the fields are in cards/index.js.
export default {
  id: "pr-mujoco-3396",
  jokeSlot: "a",
  jokes: [
    "If the seal tears down every Wall…",
    "If the seal keeps moving forward…",
    "If the seal tramples everything beyond the sea…",
    "If the seal destroys its enemies…",
    "If the Rumbling reaches the end of the world…",
    "If the Walls were titans all along…",
    "If the seal marches past the horizon…",
    "If the seal crosses the sea it dreamed of…",
    "If the seal becomes the titan…",
    "If every Wall falls and nothing stands in the way…",
    "If the seal eats the Wall itself…",
    "If the seal sees what lies beyond the sea…",
    "If the seal fights, and keeps fighting…",
    "If the seal sets every titan marching…",
    "If the earth shakes beneath every titan…",
  ],
  homage: "Attack on Titan: the Walls were Titans, and the Rumbling",
  why: "84,033,568 bytes to 65,568: the Wall was 1,282 copies of one cube; the seal eats the copies and is free.",
  stage: { hue: 24, color: "#ff8a3a", stars: "none", halftone: 6, sfx: "DOOM" },
  // issue #9 camera grammar: zoom out from the real dock, switch, zoom into the seal from a bent degree (azimuth rad, positive west)
  pull: { far: 70, fov0: 28, fov1: 42 },
  into: { from: 0.436, elev: 1.1, fov: 58 },
  kill: { what: "the Wall dies as a cage", at: "move" },
  fog: { near: 600, far: 1400 },
  camFar: 1700,
  length: 20,
  // the drawing is up behind the impact frame; every bubble reads for 3.5 s or more, the credit 3.2 s
  beats: { bloom: [1.15, 1.3], lineA: 3.2, move: [6.6, 7.2], lineB: 7.2, lineC: 10.8, credit: 16.2, collapse: [19.2, 19.6] },
  speaker: "land",
  // every tail aims where the move says (live.pupAt): the crowned titan's mouth, then the pup's
  tail: { a: "pup", b: "pup", c: "pup" },
  a: { who: "land", text: "If the seal eats all the fish…" },
  b: { who: "land", text: "…will the seal ever be free?", kind: "burst" },
  c: { who: "seal", text: "Free. 84,033,568 bytes to 65,568 at ntree 4,096. 1,281.6x less. 1.513x faster. 15,361x fewer probes.", kind: "burst" },
  credit: {
    title: "google-deepmind/mujoco #3396 · mujoco_warp #1541 · mujoco #3450 · merged",
    sub: "#3396: 84,033,568 bytes to 65,568 at ntree 4,096. 1,281.6x less. · #1541: 156.738 us to 101.097 us. Scratch 7,929,856 bytes to 180,224. · #3450: 15,361x fewer probes at V=40,962.",
  },
  move: { pose: "sign", then: "mouth", note: "The faces split into wall-titans, the skin falls off a core of 1,282 coral cubes, seal-titans march on the horizon; lightning-struck, the pup swells to a titan and eats the block down to one blue cube; the Wall stands open on the sea, and the drawing burns off the island." },
  bold: ["fish", "free", "Free", "1,281.6x less", "1.513x faster", "15,361x fewer probes"],
};
