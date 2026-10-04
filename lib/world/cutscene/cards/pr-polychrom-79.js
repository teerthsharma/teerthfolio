// pr-polychrom-79: Gilgamesh, King of Heroes (Fate): the Gate of Babylon, the Key of the Heavens, Ea.
// The dock is the Fountain of Immortality; the flipped linking number is the treasure the King shows.
// The dock builder owns this file and moves/pr-polychrom-79.jsx (parts in moves/pr-polychrom-79/); the fields are in cards/index.js.
// Real seconds (an unpaced card): line A 5.5 s, B 5.7 s, the flex line 9.0 s (Ea draws, "Enuma Elish!" is lettered
// on the blast and the dimension breaks at 21.2 s), the credit 4.4 s. The return: Ea's blast shatters space into
// gold and red shards and the pup drops back on the island at the fountain.
export default {
  id: "pr-polychrom-79",
  homage: "Fate: Gilgamesh, the Gate of Babylon, the Key of the Heavens (Bab-ilu) and Ea, the Sword of Rupture",
  why: "The pup flips one of two linked DNA rings and its linking number turns from the wrong sign to the right one.",
  stage: { color: "#c3122e", stars: "none", halftone: 0, sfx: "ENUMA ELISH!" },
  length: 28.2,
  beats: { radius: 30, lineA: 2.3, move: [7.2, 8.3], lineB: 8.3, lineC: 14.0, credit: 23.0, collapse: [27.4, 27.8] },
  speaker: "land",
  landAt: { x: 30, y: 21.6, z: 57 }, // the basin on the Fountain Peak's summit
  view: { wide: [[0.45, 0.0, -1.0], [-0.1, 0.9, 10.2]], tall: [[0.4, 0.2, -1.0], [-0.1, 1.0, 13.0]] },
  a: { who: "seal", text: "Gate of Babylon. Kneel, mongrels." },
  b: { who: "seal", text: "Let me show you a treasure worthy of the King.", kind: "burst" },
  c: { who: "seal", text: "11/11 test pairs agree with the fix, 1/11 on master. Mismatched frees: 16 to 0.", kind: "burst" },
  credit: { title: "open2c/polychrom #79", sub: "11/11 pairs agree" },
  bold: ["Kneel, mongrels.", "King", "11/11 test pairs", "16 to 0"],
  move: { pose: "raise", note: "The pup is Gilgamesh with swept-back gold hair spikes on a round head, gold collar and pauldrons, red eyes. Golden portals ripple open behind it and dark silhouettes (Excalibur, Gae Bolg, Rho Aias, Saber's helm, Archer's bow, the Grail, Enkidu's chains) poke out. It holds up the Key of the Heavens, red circuits open the vault gate, then it draws Ea and cries Enuma Elish!; the red spiral tears space, which shatters into gold and red shards and drops the pup back on the island." },
};
