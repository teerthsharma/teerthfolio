// the Resolvent: Frieren, Aura the Guillotine and the Scale of Obedience, at the ruined castle courtyard outside Graz.
// Softmax attention and a Markov path composition, weighed on one scale, are one operator.
// The dock builder owns this file and moves/p-resolvent.jsx (parts in moves/p-resolvent/); the fields are in cards/index.js.
// Aura is drawn by the move (a modelled silhouette); the card's figure is only where her bubble's tail points,
// so it is built too small to see and the move never mounts it. The pup says the reply and the flex line.
export default {
  id: "p-resolvent",
  jokeSlot: "a",
  jokes: [
    "Your mana is so small. The scale will decide. Obey me.",
    "Such small mana. Kneel, and spare yourself.",
    "The Scale of Obedience never lies. Obey me.",
    "I am Aura the Guillotine. You will obey.",
    "Weigh your mana against mine, little seal.",
    "A seal, against the Guillotine? How amusing.",
    "Your mana is a candle. Mine is a sun.",
    "My scale has never tipped the other way. Obey.",
    "Everything on my scale becomes my soldier.",
    "You hide nothing from my scale. Kneel.",
    "Such feeble mana. I'm almost disappointed.",
    "Place your soul on the scale. Mine outweighs it.",
    "Demons never lose a contest of mana. Obey me.",
    "Centuries of mana stand against you. Obey.",
    "The scale is ready. Your little mana is not.",
  ],
  homage: "Frieren: Aura's judgement on the Scale of Obedience",
  why: "Softmax attention and a Markov path composition, weighed on one scale, are one operator.",
  stage: { color: "#e0a043", stars: "none", halftone: 6, sfx: "ZUUUN" },
  // dossier (#9): zoom out from the real dock, switch at the wide, push onto the seal from a bent azimuth, then the kill
  pull: { far: 26, fov0: 42, fov1: 56 },
  into: { from: -0.7, elev: 0.8, fov: 46 },
  kill: { what: "the scale and the limiters", at: "move" },
  fog: { near: 140, far: 520 },
  camFar: 900,
  length: 20,
  beats: { lineA: 2.6, lineB: 7.0, move: [6.4, 7.0], lineC: 11.0, credit: 16.6, collapse: [19.6, 19.601], radius: 34 },
  speaker: { build: "tall", hair: "none", prop: "none", pose: "side", at: [2.3, 0, -5.0], scale: 0.001 },
  tail: { a: [2.3, 3.3, -4.85] },
  // a side-on two-shot from the pup's right: the pup whole at the left in profile facing Aura, Aura on her dais at the right with the scale held up between them, the army and the walls behind
  view: { wide: [[1.6, 1.2, -2.6], [2.8, 0.9, 12.5]], tall: [[1.4, 1.4, -2.5], [3.2, 1.0, 16]] },
  a: { who: "sil", kind: "oval", text: "Your mana is so small. The scale will decide. Obey me." },
  b: { who: "seal", kind: "burst", text: "Okay. Let me pull away my limiters too." },
  c: { who: "sil", kind: "burst", text: "Softmax and a Markov path. Two weights on my scale. One operator. 175 declarations, zero sorry." },
  credit: { title: "teerthsharma/resolvent · 175 declarations · zero sorry", sub: "Lean 4: softmax attention and Markov path composition are one operator." },
  bold: ["so small", "Obey me", "limiters", "One operator", "175 declarations", "zero sorry"],
  move: { pose: "sign", then: "raise", note: "The pup is weighed on Aura's golden scale; it lets go its suppressed mana, the scale swings to its side and shatters; the soldiers kneel; the cracks run gold through the picture and the courtyard unmakes itself back into the island." },
};
