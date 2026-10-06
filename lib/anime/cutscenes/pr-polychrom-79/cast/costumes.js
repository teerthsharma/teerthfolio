// CAST costume data for pr-polychrom-79 (Fate/Zero, Gilgamesh). Pure data: every hex comes from bible section 4.
// Victims are SMALL SEALS in the opponent's costume (costumed-seal-kit spec objects). Hair uses the hair-clump-kit
// highlight cut ({ at, slant, rate }). Eyes are anime-eye-decal styles. No silhouettes anywhere (L6b).
import { defineHair } from "../../../kit/hair-clump-kit.js";

const hair = (base, o) => defineHair(base, o);

// ---- hero: Gilgamesh. Gold armour (collar + pauldrons + breastplate), separate red cloak card, 7 spiked clumps.
export const GILGAMESH = {
  armour: { type: "armour", col: "#ffb020", shade: "#c98a12", trim: "#ffe27a" },   // collar/pauldrons #ffb020 mid, #c98a12 shadow, #ffe27a lit edge
  cloak: { type: "cloak", col: "#d3122e", shade: "#8a0c1e", lining: "#8a0c1e", trim: "#ffe27a", len: 1, collar: true, spread: 1.05 },
  hair: hair("spiky", { count: 7, layers: 1, length: [0.15, 0.27], width: 0.075, sweep: [0, 0.35, -0.85], spike: 0.9, seed: 7,
    color: { base: "#ffe27a", shade: "#e6b43a", hi: "#fff2a0" }, cut: { at: [0.3, 0.82], slant: 0.16, rate: 0.9 } }),
  eyes: { style: "tsurime", iris: "#d3122e", irisLo: "#8a0c1e", lash: "#3a0a10" },
};

// ---- the four servants
export const SABER = {
  scale: 0.56, name: "saber-seal",
  layers: [{ type: "coat", col: "#2f5fb0", shade: "#173468", trim: "#f4f4f0", collar: "#f4f4f0", open: 0.03 }, { type: "armour", col: "#c8d0e0", shade: "#6a7088", trim: "#f4f4f0" }],
  hat: { kind: "headband", col: "#2f5fb0", shade: "#173468", trim: "#f4f4f0" },  // the ribbon bow at the crown
  // 4 blond clumps + the ahoge: a fringe lock standing UP from the crown
  hair: hair("bob", { count: 4, layers: 1, length: [0.13, 0.2], width: 0.08, seed: 3, color: { base: "#f0d878", shade: "#c8a850", hi: "#fff4b0" },
    cut: { at: [0.3, 0.8], slant: 0.12, rate: 1 }, fringe: { n: 1, length: 0.17, at: [0, 0.8, 0.04], sweep: [0, 0.95, 0.25] } }),
  eyes: { style: "tsurime", iris: "#3a8a5a", irisLo: "#1a4a30", lash: "#3a0a10" },
};
export const LANCER = {
  scale: 0.56, name: "lancer-seal",
  layers: [{ type: "uniform", col: "#2a50c0", shade: "#12286a", collar: false, stripe: "#0e1a48" }],
  hair: hair("ponytail", { count: 3, layers: 1, length: [0.12, 0.2], width: 0.07, seed: 5, color: { base: "#2a50c0", shade: "#12286a", hi: "#7a9af0" },
    cut: { at: [0.3, 0.8], slant: 0.1, rate: 1 }, tail: { n: 3, length: 0.46, width: 0.045, at: [0, 0.74, -0.2] } }),
  weapon: { kind: "spear", hand: "r", col: "#3a8a5a", trim: "#c82040", tilt: [0, -0.25] },  // Gae Bolg: green shaft, red barbed head
  eyes: { style: "tsurime", iris: "#c82040", irisLo: "#7a0c20", lash: "#12286a" },
};
export const RIDER = {
  scale: 0.62, name: "rider-seal",
  layers: [{ type: "armour", col: "#b87a22", shade: "#5a3a0a", trim: "#e0a840" }],   // the red cape is its own tearable piece (index.js)
  hair: hair("swept", { count: 3, layers: 1, length: [0.13, 0.2], width: 0.075, seed: 11, color: { base: "#6a2a1a", shade: "#3a140c", hi: "#a85a38" },
    cut: { at: [0.3, 0.8], slant: 0.1, rate: 1 }, fringe: { n: 4, length: 0.13, at: [0, 0.37, 0.2], sweep: [0, -0.9, 0.35] } }), // 4 dark beard clumps at the chin
  weapon: { kind: "sword", hand: "r", col: "#cdd4e0", trim: "#b87a22", tilt: [0, -0.4] },
  eyes: { style: "round", iris: "#6a2a1a", irisLo: "#3a140c", lash: "#3a140c" },
};
export const BERSERKER = {
  scale: 0.6, name: "berserker-seal",
  layers: [{ type: "armour", col: "#1a1420", shade: "#07060a", trim: "#d3122e" }],   // red glow seams = the trim band + gem
  hat: { kind: "helmet", col: "#1a1420", shade: "#07060a", trim: "#d3122e" },
  weapon: { kind: "sword", hand: "r", col: "#2a2430", trim: "#d3122e", hilt: "#07060a", tilt: [0, -0.3] },
  eyes: { style: "blank", iris: "#ff2a3a", irisLo: "#d3122e", pupilCol: "#ff2a3a", lash: "#07060a" }, // glow eyes
};

// ---- mongrels: peasant tunic, rope belt, brown hair tufts, eyes shut when kneeling
export const mongrel = (i, rng) => ({
  scale: 0.5 + rng() * 0.08, name: `mongrel-${i}`,
  layers: [{ type: "uniform", col: i % 2 ? "#8a7a60" : "#7e6e56", shade: "#4a3f2e", collar: false }, { type: "sash", col: "#c8b078", shade: "#6a5a36" }], // rope belt
  hair: hair(i % 3 === 0 ? "spiky" : "bob", { count: 5, layers: 1, length: [0.07, 0.13], width: 0.07, seed: 20 + i,
    color: { base: ["#5a3a24", "#6a4a2c", "#4a2e1c"][i % 3], shade: "#2a1810", hi: "#9a7048" }, cut: { at: [0.4, 0.8], slant: 0.1, rate: 0.7 } }),
  eyes: { style: "round", iris: "#4a2e1c" },
});
