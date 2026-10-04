// the NeMo moat: Dragon Ball Super, the Tournament of Power and Goku's Ultra Instinct. One scaffold across 23 files:
// every request lands in the same profile without a thought.
// The dock builder owns this file and moves/pr-nemo-relay-481.jsx (parts in moves/pr-nemo-relay-481/); the fields are in cards/index.js.
// Two ink gods watch from a floating ledge (Whis, then Beerus; the move draws them, the tails reach up to them
// through `tail`); the pup is the performer; the lines are the owner's, in this order. The return: Ultra Instinct
// runs out, the aura gutters, the arena breaks up outside-in and the island was under it all along.
export default {
  id: "pr-nemo-relay-481",
  homage: "Dragon Ball Super: the Tournament of Power, Ultra Instinct, Beerus and Whis",
  why: "One scaffold across 23 files: every request lands in the same profile without a thought.",
  stage: { hue: 236, color: "#6f7fe0", stars: "none", halftone: 6, sfx: "SHHN" },
  length: 25.8,
  // paced for reading: A 5.8 s, B 5.4 s, C 5.3 s, the credit 6.2 s; the dodges slow, the break at half speed
  beats: { move: [7.5, 8.1], lineB: 8.1, lineC: 13.5, credit: 18.8 },
  speaker: [
    { build: "tall", hair: "crest", prop: "staff", pose: "cane", at: [1.7, 0, -3.4] },
    { build: "tall", hair: "catears", prop: "pudding", pose: "handout", at: [3.3, 0, -2.4], scale: 0.92 },
  ],
  // the gods' mouths on the ledge, in the pup's frame (the move places them; `view` keeps this exact)
  tail: { a: [2.5, 4.2, -8.3], c: [5.6, 3.2, -7.9] },
  view: { wide: [[1.9, 2.0, -8.0], [-1.1, -0.8, 15.5]], tall: [[1.9, 2.2, -8.0], [-1.1, -0.6, 19.0]] },
  a: { who: "sil", text: "Ultra Instinct… the body moves on its own." },
  b: { who: "seal", text: "23 files. One scaffold. I didn't even think.", kind: "burst" },
  c: { who: "sil2", text: "That's the power of the gods." },
  credit: { title: "NVIDIA/NeMo-Relay #481 · merged · 23 files", sub: "One unchanging scaffold now keys to one profile instead of one per task." },
  move: { pose: "crouch", then: "raise", note: "The Tournament of Power arena floats in a pale void in 90s cel; the pup calms, ignites silver Ultra Instinct and dodges the orbs with its eyes shut as silver afterimages flicker; then the form runs out and the arena crumbles back to the island." },
  bold: ["Ultra Instinct", "23 files", "One scaffold", "power of the gods"],
  num: "23",
};
