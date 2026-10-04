// Aether-Lang: Jujutsu Kaisen, Gojo's Domain Expansion: Infinite Void. The koan is a loop that never ends:
// strongest because Gojeal Satarou, Gojeal Fishtarou because strongest. The domain is an infinite flood of
// information, and it ends the way an Aether-Lang loop ends: the shape stops changing. The flood freezes, the
// ring closes, the whole void collapses into its core and the pup is on the real island, where it says why.
// The dock builder owns this file and moves/p-aether-lang.jsx (parts in moves/p-aether-lang/); the fields are in cards/index.js.
export default {
  id: "p-aether-lang",
  homage: "Jujutsu Kaisen: Gojo, Domain Expansion: Infinite Void",
  why: "The loop's identity is its strength: it stops because the shape stopped.",
  stage: { hue: 256, stars: "none", halftone: 6, sfx: "VOID" },
  length: 20.0, // line A 2.3 to 6.6 (10 words), line B 6.6 to 10.8 (10 words), the flex 10.8 to 17.0 (19 words), the credit 17.0 to 19.2
  beats: { lineB: 6.6, move: [6.0, 6.6], lineC: 10.8, credit: 17.0, collapse: [19.2, 19.6] }, // line C (the flex) lands on the real island at 10.8, the credit at 17.0
  speaker: { build: "tall", hair: "spiky", prop: "band", pose: "pockets", at: [2.2, 0, -3.6], scale: 1.4 },
  // a level lens, stood back: the core behind the pup, the silhouette beside it, the glass floor under both
  view: { wide: [[0.4, 1.15, -1.0], [-0.1, 0.0, 10.6]], tall: [[0.3, 1.4, -1.0], [-0.1, 0.0, 13.4]] },
  a: { who: "sil", text: "Are you the strongest because you are Gojeal Satarou?" },
  b: { who: "sil", text: "Or are you Gojeal Fishtarou because you are the strongest?" },
  c: { who: "seal", text: "This is the power of a seal. My loop stops because its shape stopped changing, not because a counter ran out.", kind: "burst" },
  credit: { title: "teerthsharma/Aether-Lang · persistent homology as a language primitive", sub: "Loops stop when their shape stops changing.", ret: "The void closes when its shape stops changing; the seal steps out." },
  move: { pose: "sign", note: "The pup signs and the Infinite Void opens: a white-violet core, a flood of information, a glass floor. The silhouette asks both lines; the flood freezes, a ring closes round the core, the void collapses into it and the pup is home." },
  bold: ["strongest", "Gojeal Satarou", "Gojeal Fishtarou", "power of a seal", "shape stopped changing"],
};
