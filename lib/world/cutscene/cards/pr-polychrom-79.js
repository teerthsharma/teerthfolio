// pr-polychrom-79: Dr. Stone, Senku Ishigami at the Kingdom of Science, in its bright stone-world palette.
// The dock is the Fountain of Immortality: its revival fluid turns a flipped linking number green.
// The dock builder owns this file and moves/pr-polychrom-79.jsx (parts in moves/pr-polychrom-79/); the fields are in cards/index.js.
// Both lines are the pup's; the flex line is the showcase result, verbatim. The return is the petrification
// crack spreading over the frame and crumbling: "Revival fluid: back to the island."
export default {
  id: "pr-polychrom-79",
  homage: "Dr. Stone: Senku Ishigami and the Kingdom of Science, revival fluid and petrification cracks",
  why: "The pup flips one of two linked DNA rings and its linking number turns from the wrong sign to the right one.",
  stage: { color: "#2bdc8a", stars: "none", halftone: 0, sfx: "SCIENCE!" },
  length: 28.4,
  // real seconds (unpaced): line A holds through the flip, B and the flex line 5.9 s and 6.8 s, the credit 4.6 s
  beats: { radius: 30, lineA: 2.3, move: [7.6, 10.1], lineB: 10.1, lineC: 16.0, credit: 22.8, collapse: [27.4, 28.0] },
  speaker: "land",
  landAt: { x: -32, y: 1.3, z: 57 },
  view: { wide: [[0.45, 0.0, -1.0], [-0.1, 0.9, 10.2]], tall: [[0.4, 0.2, -1.0], [-0.1, 1.0, 13.0]] },
  a: { who: "seal", text: "Get excited! This is ten billion percent science." },
  b: { who: "seal", text: "The sign was flipped. Now 11 of 11 linking numbers are right.", kind: "burst" },
  c: { who: "seal", text: "11/11 test pairs agree with the fix, 1/11 on master. Mismatched frees: 16 to 0.", kind: "burst" },
  credit: { title: "open2c/polychrom #79", sub: "11/11 pairs agree" },
  bold: ["Get excited!", "ten billion percent", "11 of 11", "11/11 test pairs", "16 to 0"],
  move: { pose: "raise", note: "The pup is Senku with spiky green-tipped hair on a round head; it holds two linked DNA rings that glow red with the wrong sign, flips one and they turn green; eleven pairs light up green in a row; the petrification crack spreads and crumbles back to the island." },
};
