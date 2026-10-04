// Pyrefly: JoJo and the "To Be Continued" arrow that does not continue. A 208-module chain, pinned at the end.
// The dock builder owns this file and moves/pr-pyrefly-4180.jsx; the fields are in cards/index.js.
// The two-shot is the figure one (the pup fills about a third of the frame), not the land's pulled-back rig.
const WIDE = [[0.7, 0.6, -1.0], [-0.1, 0.85, 7.4]];
const TALL = [[0.55, 0.6, -1.0], [-0.1, 0.95, 8.8]];
export default {
  id: "pr-pyrefly-4180",
  homage: "JoJo's Bizarre Adventure",
  why: "A 208-module chain, pinned at the end.",
  stage: { stars: "streaks", halftone: 6, sfx: "SKRRT" },
  speaker: "land",
  a: { who: "land", text: "To be continued…" },
  b: { who: "seal", text: "208 SCCs. The panic is pinned." },
  bold: ["208 SCCs", "pinned"],
  get view() {
    return typeof window !== "undefined" && window.innerWidth < window.innerHeight ? TALL : WIDE;
  },
  move: { pose: "fist", note: "The pup strikes the JoJo pose with GOGOGO glyphs rising, slaps a flipper down on the arrow's last bead and a ring closes round it; the arrow jitters, cracks in two and falls." },
};
