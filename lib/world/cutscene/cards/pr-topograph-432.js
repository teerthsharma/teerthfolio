// pr-topograph-432: The Lord of the Rings, Gandalf on the Bridge of Khazad-dum, as a stop-motion miniature.
// The dock builder owns this file and moves/pr-topograph-432.jsx (parts in moves/pr-topograph-432/); the fields are in cards/index.js.
// The seal is Gandalf on the bridge. Frodo stands at the far doorway and cries the second line (the tail is
// aimed at him); the seal says the flex line, a clapperboard calls the wrap and the set is struck, then the credit card.
// Every number is in data/showcase.json (145 lines changed across 4 files, #432).
export default {
  id: "pr-topograph-432",
  homage: "The Lord of the Rings: Gandalf on the Bridge of Khazad-dum, in stop-motion",
  why: "Gandalf stops one thing on one bridge: a ClusterRole's cluster wide reach, withdrawn.",
  stage: { color: "#e8864a", stars: "none", halftone: 6, sfx: "THOOM" },
  length: 29.4,
  // scene time runs slow-motion at the strike, the break and the return (WARP in the move), so these are real seconds: line A holds through the stand, line B (Frodo) through the break, the flex line through the wrap; each is up 6 s or more
  beats: { radius: 34, lineA: 2.3, move: [7.9, 8.5], lineB: 8.5, lineC: 15.3, credit: 24.2 },
  // the land speaks: the rig turns about the pup so the lens stands on the moat side, clear of the Planimeter (west of the dock)
  // the move draws Frodo and the Fellowship itself
  speaker: "land",
  landAt: { x: 44, y: 2, z: -21 },
  // a level lens, stood back: the bridge and the Balrog over the pup, the pup above the bubbles
  view: { wide: [[0.4, 1.5, -0.3], [0.0, 0.9, 11.5]], tall: [[-1.3, 2.4, -0.3], [0.0, 1.0, 19.0]] },
  tail: { b: [-4.1, 0.1, -0.35] },
  a: { who: "seal", text: "You shall not list!" },
  b: { who: "land", text: "Gandeal!!", kind: "burst" },
  c: { who: "seal", text: "145 lines changed across 4 files. pods, nodes and daemonsets access no longer granted cluster wide.", kind: "burst" },
  credit: { title: "dsx-ai-factory/topograph #432", sub: "145 lines gated" },
  bold: ["list!", "Gandeal!!", "145 lines changed across 4 files."],
  move: { pose: "raise", note: "The pup is Gandalf in plasticine on the Bridge of Khazad-dum; it slams its mint-crystal staff into the stone, two mint walls stand up, the Balrog's three coral lashes snap back off them, the bridge breaks under the Balrog's side only, and a clapperboard calls the wrap." },
};
