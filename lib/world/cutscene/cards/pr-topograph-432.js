// pr-topograph-432: Overlord, Ainz Ooal Gown in the Throne Room of Nazarick casting a Super-Tier magic circle, as a stop-motion miniature.
// The dock builder owns this file and moves/pr-topograph-432.jsx (parts in moves/pr-topograph-432/); the fields are in cards/index.js.
// The seal wears an Ainz cloak and matches him. Ainz stands on the bridge and calls the second line (the tail is
// aimed at his skull); the seal says the flex line, a board reading Ainz: You are dismissed calls the wrap as the
// circles close and the set is struck, then the credit card.
// Every number is in data/showcase.json (145 lines changed across 4 files, #432).
export default {
  id: "pr-topograph-432",
  homage: "Overlord: Ainz Ooal Gown and his Super-Tier magic circle in the Throne Room of Nazarick, in stop-motion",
  why: "Ainz unmakes one thing on one bridge: a ClusterRole's cluster wide reach, withdrawn.",
  stage: { color: "#a23cff", stars: "none", halftone: 6, sfx: "DOOM" },
  length: 29.4,
  // scene time runs slow-motion at the strike, the break and the return (WARP in the move), so these are real seconds: line A holds through the stand, line B (Ainz) through the break, the flex line through the wrap; each is up 6 s or more
  beats: { radius: 34, lineA: 2.3, move: [7.9, 8.5], lineB: 8.5, lineC: 15.3, credit: 24.2 },
  // the land speaks: the rig turns about the pup so the lens stands on the moat side, clear of the Planimeter (west of the dock)
  // the move draws Ainz, his circles and the floor guardians itself
  speaker: "land",
  landAt: { x: 44, y: 2, z: -21 },
  // a level lens, close enough that the whole upright pup fills the frame: Ainz and his circle over the pup, the pup above the bubbles
  view: { wide: [[1.0, 0.8, -0.3], [0.0, 1.0, 12.0]], tall: [[0.5, 1.6, -0.3], [0.0, 1.2, 18.0]] },
  tail: { b: [2.8, 2.6, -0.6] },
  a: { who: "seal", text: "Ainz Ooal Gown is legend." },
  b: { who: "land", text: "Rejoice!", kind: "burst" },
  c: { who: "seal", text: "145 lines changed across 4 files. pods, nodes and daemonsets access no longer granted cluster wide.", kind: "burst" },
  credit: { title: "dsx-ai-factory/topograph #432", sub: "145 lines gated" },
  bold: ["legend.", "Rejoice!", "145 lines changed across 4 files."],
  move: { pose: "raise", note: "The pup is an Ainz look-alike in plasticine on the bridge, in a black-and-purple cloak with a tiny gold seven-gem staff, a gold circle under its paws answering his giant purple and gold one; it slams the staff into the stone, two purple walls stand up, Ainz's three crimson lashes snap back off them, the span breaks under his side as he rises on Fly, and a board reading Ainz: You are dismissed calls the wrap as the circles close." },
};
