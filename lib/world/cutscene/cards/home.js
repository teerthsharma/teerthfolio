// the Igloo: Vinland Saga, "You have no enemies" (Thors's teaching, which Thorfinn finally lives on his own
// farm). Home is the neutral zone, the one place with no radiation: the end of fighting. A NORDIC WATERCOLOUR
// dimension (moves/home.jsx, parts in moves/home/): Thors's Icelandic fjord at a low dawn, the pup on the
// jetty's end, Thors a broad ink silhouette behind it, an orca that circles once and sinks in peace, Vinland
// rising golden on the horizon, eleven beacons lit one by one on the flex line. The way home is the rain:
// the first drops fall as the eleventh beacon catches, the wash runs off the paper, and the island is under it.
// The dock builder owns this file and moves/home.jsx; the fields are in cards/index.js.
export default {
  id: "home",
  jokeSlot: "b",
  jokes: [
    "A true warrior needs no sword. Neither does a seal.",
    "You came home without a single enemy. That is strength.",
    "Put down the sword. The fjord already knows you.",
    "The strongest warrior is the one who comes home.",
    "You fought nowhere and won everywhere. Well done.",
    "No orca will hunt you here. You have no enemies.",
    "Vinland was never across the sea. It was here.",
    "Rest now, little warrior. The war is over.",
    "A seal with no enemies. I could never become that.",
    "Even the orca bows to one who holds no grudge.",
    "Lay down your weight. Nobody here will raise a hand.",
    "This is a true warrior. Gentle, and unafraid.",
    "The sea is calm because you are.",
    "You understood it faster than my son did.",
    "Look, the beacons. They are lighting your way home.",
  ],
  homage: "Vinland Saga: Thors's \"You have no enemies\"",
  why: "Neutral zone, no radiation: nothing here is an enemy.",
  // calm: no stars, no halftone; the move hides the comic layer's impact frames and onomatopoeia
  stage: { color: "#7fc8f8", stars: "none", halftone: 0, sfx: "bloop" },
  length: 30.2,
  // paced to read (owner): A 6.5 s, B 6 s, flex 6.2 s, credit 4.4 s; the orca and the beacons breathe between
  beats: { lineA: 2.3, lineB: 12.8, lineC: 18.8, credit: 25.0, move: [12.2, 12.8], collapse: [29.4, 29.8] },
  // Thors: broad, long hair, empty open hands; the kit's ink figure shows only with reduced motion (the move draws him itself)
  speaker: { build: "broad", hair: "mane", prop: "none", pose: "handout", at: [-2.4, 0, -0.5] },
  // a level lens down the fjord: the pup on the jetty's end, Thors behind it, the igloo and the farmstead left, the fjord mouth and Vinland ahead
  view: { wide: [[-3.0, 1.7, -3.0], [0.9, 0.0, 11.0]], tall: [[-1.7, 2.0, -2.0], [0.9, 0.0, 15.0]] },
  a: { who: "sil", text: "You have no enemies." },
  b: { who: "sil", text: "A true warrior needs no sword. Neither does a seal.", kind: "burst" },
  c: { who: "sil", text: "Eleven landed contributions. Welcome home.", kind: "oval" },
  credit: { title: "Teerth Sharma · Seal's Topology Land", sub: "Eleven landed contributions." },
  move: { pose: "sit", note: "The pup plops onto the jetty and sits; an orca circles it once and sinks; eleven beacons light along the fjord; the rain runs the painting off the paper." },
  bold: ["orcas", "enemies", "Eleven landed contributions"],
};
