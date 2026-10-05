// the NeMo moat: Dragon Ball Super, the Tournament of Power and Goku's Ultra Instinct. One scaffold across 23 files:
// every request lands in the same profile without a thought.
// The dock builder owns this file and moves/pr-nemo-relay-481.jsx (parts in moves/pr-nemo-relay-481/); the fields are in cards/index.js.
// Two ink gods watch from a floating ledge (Whis, then Beerus; the move draws them, the tails reach up to them
// through `tail`); the pup is the performer; the lines are the owner's, in this order. The return: Ultra Instinct
// runs out, the aura gutters, the arena breaks up outside-in and the island was under it all along.
export default {
  id: "pr-nemo-relay-481",
  jokeSlot: "a",
  jokes: [
    "Ultra Instinct… the body moves on its own.",
    "Oh my. It's moving without thinking.",
    "Lord Beerus, look. The seal has reached it.",
    "Even gods train for eons to reach that form.",
    "The mind is silent. Only the body answers.",
    "Silver eyes. Do you see it, Lord Beerus?",
    "Not a single wasted motion. Remarkable.",
    "A mortal seal, touching the realm of the gods?",
    "It dodges before the attack even exists.",
    "Hmph. That seal has no right to be this calm.",
    "The form even angels struggle to master… on a seal.",
    "Don't think. Just move. Oh, it's already moving.",
    "The secret of Ultra Instinct… a seal found it first.",
    "Instinct, not thought. The body knows the way.",
    "Ho ho. How fascinating. It isn't thinking at all.",
  ],
  homage: "Dragon Ball Super: the Tournament of Power, Ultra Instinct, Beerus and Whis",
  why: "One scaffold across 23 files: every request lands in the same profile without a thought.",
  stage: { hue: 236, color: "#6f7fe0", stars: "none", halftone: 6, sfx: "SHHN" },
  // issue #9 camera grammar: zoom out from the real dock, switch, zoom into the seal from a bent degree (azimuth rad, positive west)
  pull: { far: 46, fov0: 28, fov1: 42 },
  into: { from: -0.524, elev: 4.2, fov: 48 },
  kill: { what: "the form runs out and the arena crumbles", at: "move" },
  fog: { near: 140, far: 520 },
  camFar: 900,
  length: 25.8,
  // paced for reading: A 5.8 s, B 5.4 s, C 5.3 s, the credit 6.2 s; the dodges slow, the break at half speed
  beats: { move: [7.5, 8.1], lineB: 8.1, lineC: 13.5, credit: 18.8 },
  speaker: [
    { build: "tall", hair: "crest", prop: "staff", pose: "cane", at: [1.7, 0, -3.4] },
    { build: "tall", hair: "catears", prop: "pudding", pose: "handout", at: [3.3, 0, -2.4], scale: 0.92 },
  ],
  // the gods' mouths on the ledge, in the pup's frame (the move places them; `view` keeps this exact)
  tail: { a: [2.5, 4.2, -8.3], c: [5.6, 3.2, -7.9] },
  view: { wide: [[1.2, 1.8, -6.0], [-1.8, -0.2, 19.0]], tall: [[1.0, 2.0, -6.0], [-1.6, 0, 23.0]] },
  a: { who: "sil", text: "Ultra Instinct… the body moves on its own." },
  b: { who: "seal", text: "23 files. One scaffold. I didn't even think.", kind: "burst" },
  c: { who: "sil2", text: "That's the power of the gods." },
  credit: { title: "NVIDIA/NeMo-Relay #481 · merged · 23 files", sub: "One unchanging scaffold now keys to one profile instead of one per task." },
  move: { pose: "crouch", then: "raise", note: "The Tournament of Power arena floats in a pale void in 90s cel; the pup calms, ignites silver Ultra Instinct and dodges the orbs with its eyes shut as silver afterimages flicker; then the form runs out and the arena crumbles back to the island." },
  bold: ["Ultra Instinct", "23 files", "One scaffold", "power of the gods"],
  num: "23",
};
