// p-epsilon-hollow CAST: the four chorus seals (the opponents Itachi faced), as DATA. Bible section 4.
// Every victim is a small costumed seal (L6b): locked pup body in fur #8c93a3 (dim shade #5d6378), cloth layers, hair clumps with the
// highlight cut, anime-eye decals with two highlights. Ink #2a1f1d (the Pierrot warm near-black, 1.5 px constant-pixel via lineMul).
// pos is seal-local metres (the hero at the origin facing +z); r is 3.5-6 m from the pup. y > 0 puts a seal on its block.
import { defineHair } from "../../../kit/hair-clump-kit.js";

const FUR = { coat: "#8c93a3", shade: "#5d6378", ink: "#2a1f1d", scale: 0.75 }; // 0.8 m x 0.75 = 0.6 m tall

export const CHORUS = [
  { // S1 Sasuke (Shippuden look): stands, blade hand low, glare
    id: "sasuke", pos: [-2.8, 0, 3.4],
    eyesExpr: "rage", eyesK: 0.6,
    spec: {
      ...FUR, name: "sasuke",
      layers: [
        { type: "uniform", col: "#d9d4e8", shade: "#9a93b8", collar: "#d9d4e8" }, // high-collar top
        { type: "sash", col: "#6b4f9e", knot: "#6b4f9e" },                          // rope belt
      ],
      hair: defineHair("spiky", { count: 7, layers: 1, length: [0.16, 0.28], sweep: [0.55, 0.02, -0.15], spike: 0.85,
        color: { base: "#14121c", shade: "#07060b", hi: "#3a3647" }, cut: { at: [0.5, 0.82], slant: 0.12, rate: 0.85 }, seed: 31 }),
      weapon: { kind: "sword", hand: "l", col: "#4a4a56", hilt: "#7a7a82", trim: "#7a7a82", tilt: [0.18, 2.95] }, // hilt at the hip, blade down
      eyes: { style: "tomoe", iris: "#d0161f", irisLo: "#8a0c14" }, // Sharingan: red iris, three black tomoe
    },
  },
  { // S2 Kakashi: legs crossed on a block, hand on knee (ref 06 throne pose; easter egg 2)
    id: "kakashi", pos: [0.9, 0.22, 5.6], block: true,
    eyesExpr: "calm", eyesK: 1,
    spec: {
      ...FUR, name: "kakashi",
      layers: [
        { type: "uniform", col: "#4a5d3c", shade: "#2f3d27", collar: false }, // flak vest
        { type: "sash", col: "#8a6a3d", knot: "#8a6a3d" },                      // kunai pouch belt
      ],
      hat: { kind: "headband", col: "#25306b", shade: "#141a40", trim: "#c4c8d0" }, // plate #c4c8d0
      accessories: [{ kind: "mask", col: "#1d2540" }, { kind: "eyepatch", col: "#25306b" }], // mask to the nose; band slanted over the left eye
      hair: defineHair("spiky", { count: 8, layers: 1, length: [0.18, 0.3], sweep: [0.65, 0.18, 0], spike: 0.9,
        color: { base: "#c9ccd6", shade: "#8d92a6", hi: "#e2e4ec" }, cut: { at: [0.45, 0.8], slant: 0.1, rate: 0.8 }, seed: 47 }), // gravity tuft
      eyes: { style: "tareme", iris: "#2a2630", irisLo: "#14121c" }, // the one open eye
    },
  },
  { // S3 Kurenai (UNVERIFIED role): arms crossed, wide eyes at 3.0, to her knees at 14.6
    id: "kurenai", pos: [3.0, 0, 4.0],
    eyesExpr: "neutral", eyesK: 1,
    spec: {
      ...FUR, name: "kurenai",
      layers: [
        { type: "uniform", col: "#c43a3a", shade: "#7a1f24", collar: false }, // red dress
        { type: "scarf", col: "#f2efe6", shade: "#bdb5a2" },                   // bandage wrap
        { type: "sash", col: "#f2efe6", knot: "#f2efe6" },
      ],
      hair: defineHair("long", { curl: 0.12, fringe: { n: 3, length: 0.3, at: [0.04, 0.74, 0.2], sweep: [0.25, -0.8, 0.4] },
        color: { base: "#14121c", shade: "#07060b", hi: "#3a3647" }, cut: { at: [0.4, 0.7], slant: 0.1, rate: 0.7 }, seed: 53 }),
      eyes: { style: "round", iris: "#8a2a30", irisLo: "#4a1216" },
    },
  },
  { // S4 Asuma (UNVERIFIED role): crouch, bites the stub, head lowers at 23.0
    id: "asuma", pos: [-4.4, 0, 2.3],
    eyesExpr: "calm", eyesK: 1,
    spec: {
      ...FUR, name: "asuma",
      layers: [
        { type: "uniform", col: "#3d4f33", shade: "#26331f", collar: false },             // flak
        { type: "coat", col: "#1c1c22", shade: "#09090c", open: 0.08, collar: "#1c1c22" }, // black jacket over it
        { type: "scarf", col: "#b84a2a", shade: "#7a2c14" },
      ],
      hat: { kind: "headband", col: "#25306b", shade: "#141a40", trim: "#c4c8d0" },
      hair: defineHair("slick", { count: 14, length: [0.08, 0.14], sweep: [0, 0.05, -0.4],
        color: { base: "#1a1820", shade: "#08070b", hi: "#3a3647" }, cut: { at: [0.5, 0.8], slant: 0.1, rate: 0.6 }, seed: 59 }),
      weapon: { kind: "sword", hand: "r", col: "#8a8a92", hilt: "#2a2a34", trim: "#8a8a92", tilt: [0.2, 2.9] }, // trench knife, reverse grip (scaled 0.5 in index)
      eyes: { style: "tsurime", iris: "#2a1f1d", irisLo: "#120c0a" },
    },
  },
];
