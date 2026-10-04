// openxla/xla #46539: My Hero Academia, All Might's United States of SMASH, in the American golden-age comic
// dimension (Ben-Day dots, off-register four-colour print, thick ink, panel borders on the impacts).
// A Nomu throws two different answers for one program; the seal's punch blasts the storm into a vortex and
// smashes the two answers into one; the shockwave is so big it tears the page and drops us back on the island.
// The dock builder owns this file and moves/pr-openxla-46539.jsx (parts in moves/pr-openxla-46539/); the fields
// are in cards/index.js. The Nomu is drawn by the move (no kit figure); `speaker` only tells the bubble where
// the Nomu's beak is.
export default {
  id: "pr-openxla-46539",
  homage: "My Hero Academia: All Might's United States of SMASH against a Nomu, in a golden-age comic",
  why: "Same program, two answers before, one after: deterministic.",
  stage: { color: "#ec2a8a", stars: "none", halftone: 6, sfx: "KA-BOOM" },
  length: 24.9,
  beats: { lineA: 2.6, move: [8.6, 9.4], lineB: 9.4, lineC: 14.4, credit: 19.4 }, // "I am here!" 5 s (the 2 s Detroit Smash dash, then the wind-up), "UNITED STATES OF SMASH!" 5 s (the screen punch), the credit 4.7 s
  speaker: { build: "broad", hair: "none", prop: "none", pose: "side", at: [3.3, 0, -11] },
  tail: { a: [3.3, 4.6, -9.9] }, // the beak, in metres from the pup
  // a low lens, stood back and tipped up ten degrees: the pup against the sky, the street running away, the storm filling the top of the frame
  // the whole pup stands lower-left and uncropped (feet to raised fist), the street and the storm fill the rest; the seal's bubbles sit to its right
  view: { wide: [[1.2, 1.3, -2.5], [-2.0, 0.9, 13.0]], tall: [[0.8, 1.5, -2.5], [-1.6, 1.0, 20.0]] },
  bubbleAt: { b: [0.5, 0.5], c: [0.5, 0.5] }, // left edge of the seal's bubbles, as a share of the width: [landscape, portrait]
  a: { who: "sil", text: "Two runs. Two answers. Prove which one is real, little seal." },
  b: { who: "seal", text: "I am here!", kind: "burst" },
  c: { who: "seal", text: "UNITED STATES OF SMASH!", kind: "burst" },
  credit: { title: "openxla/xla #46539 · 5 lines, deterministic", sub: "Same program, two outputs before, one stable output after." },
  move: { pose: "fist", then: "raise", note: "A Nomu rises from a ruined Kamino street and throws two different glowing answers; the pup raises a fist, V of light on its brow, and punches the storm open; the two answers smash into one; the shockwave tears the comic page back to the island." },
  bold: ["5 lines, deterministic", "Two runs", "Two answers", "I am here!", "UNITED STATES OF SMASH!", "deterministic"],
};
