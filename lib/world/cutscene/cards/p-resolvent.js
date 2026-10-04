// the Resolvent: Frieren, Aura the Guillotine and the Scale of Obedience, at the ruined castle courtyard outside Graz.
// Softmax attention and a Markov path composition, weighed on one scale, are one operator.
// The dock builder owns this file and moves/p-resolvent.jsx (parts in moves/p-resolvent/); the fields are in cards/index.js.
// Aura is drawn by the move (a modelled silhouette); the card's figure is only where her bubble's tail points,
// so it is built too small to see and the move never mounts it. The pup says the reply and the flex line.
export default {
  id: "p-resolvent",
  homage: "Frieren: Aura's judgement on the Scale of Obedience",
  why: "Softmax attention and a Markov path composition, weighed on one scale, are one operator.",
  stage: { color: "#e0a043", stars: "none", halftone: 6, sfx: "ZUUUN" },
  length: 20,
  beats: { lineA: 2.6, lineB: 7.0, move: [6.4, 7.0], lineC: 11.0, credit: 16.6, collapse: [19.6, 19.601], radius: 34 },
  speaker: { build: "tall", hair: "none", prop: "none", pose: "side", at: [2.3, 0, -5.0], scale: 0.001 },
  tail: { a: [2.3, 3.3, -4.85] },
  // a side-on two-shot from the pup's right: the pup whole at the left in profile facing Aura, Aura on her dais at the right with the scale held up between them, the army and the walls behind
  view: { wide: [[1.6, 1.2, -2.6], [2.8, 0.9, 12.5]], tall: [[1.4, 1.4, -2.5], [3.2, 1.0, 16]] },
  a: { who: "sil", kind: "oval", text: "Your mana is so small. The scale will decide. Obey me." },
  b: { who: "seal", kind: "burst", text: "Okay. Let me pull away my limiters too." },
  c: { who: "seal", kind: "burst", text: "Softmax and a Markov path. Two weights on your scale. One operator. 175 declarations, zero sorry." },
  credit: { title: "teerthsharma/resolvent · 175 declarations · zero sorry", sub: "Lean 4: softmax attention and Markov path composition are one operator." },
  bold: ["so small", "Obey me", "limiters", "One operator", "175 declarations", "zero sorry"],
  move: { pose: "sign", then: "raise", note: "The pup is weighed on Aura's golden scale; it lets go its suppressed mana, the scale swings to its side and shatters; the soldiers kneel; the cracks run gold through the picture and the courtyard unmakes itself back into the island." },
};
