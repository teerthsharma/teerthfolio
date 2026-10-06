// CAST costumes for spawn-seal: data only (hex from bible sections 2 and 4). Falmuth knights and Rimuru, all costumed SEALS (L6b).
import { defineHair } from "../../../kit/hair-clump-kit.js";

// Rimuru (bible 4.2): 14 tapered light-blue clumps (long preset: fringe + side locks + back), white shirt under a black
// fur-collar coat lined royal blue, gold slit-pupil eyes, flipper-grey mittens come free from the locked flipper tint.
// Hair colour ramp: highlight #ffffff cuts, lit #a9def2, mid #86c7e8, shadow #4d9ccf (bible table).
export const RIMURU_HAIR = defineHair("long", {
  color: { base: "#86c7e8", shade: "#4d9ccf", hi: "#ffffff" },
  count: 14, layers: 2, length: [0.3, 0.55], width: 0.07, spike: 0.55, droop: 0.5,
  cut: { at: [0.4, 0.7], slant: 0.1, rate: 0.9 }, // 4-6 hard white highlight cuts per fringe side
  seed: 31,
});
export const RIMURU = {
  scale: 1.0, // grown to ~1.9 by the morph (0.8 m pup -> 1.55 m figure)
  coat: "#8e8c91", shade: "#5f6278", // the locked fur, so the seal cue (flipper-grey mittens) survives
  layers: [
    { type: "uniform", col: "#f6f8fb", shade: "#b9c4d9", collar: "#f6f8fb" }, // white shirt (the belly cream becomes it)
    { type: "coat", col: "#14111c", shade: "#07060b", open: 0.07, collar: "#0d0b14", trim: "#2b57d6" }, // black coat, blue trim, fur collar
  ],
  hair: RIMURU_HAIR,
  eyes: { style: "slit", iris: "#e3d34f", irisLo: "#8a8a2a", pupil: "#2d2a14", lash: "#1f3350" }, // ref 03 three-layer iris
  ink: "#2f3a5a",
};

// Falmuth Western Holy Empire knight (bible 4.4): plate #cfd8e8/#9aa8c4/#5a688a with gold trim, white tabard (gold cross added as a prop), kettle helm, spear.
export const KNIGHT = {
  scale: 0.56,
  layers: [
    { type: "armour", col: "#cfd8e8", shade: "#5a688a", trim: "#ffd23a" },
    { type: "uniform", col: "#f6f8fb", shade: "#b9c4d9", collar: false },
  ],
  hat: { kind: "helmet", col: "#9aa8c4", shade: "#5a688a", trim: "#ffd23a" },
  weapon: { kind: "spear", hand: "r", col: "#6a4a2a", trim: "#cfd8e8" },
  eyes: { style: "round", iris: "#2a2230", irisLo: "#150f1a" }, // the round black eyes stay visible under the helm
};
// 10 stations on an arc behind the pool, in "left to right" reaction order. a = angle off -z (rad); r = metres from the seal.
export const KNIGHT_RANKS = Array.from({ length: 10 }, (_, i) => ({
  a: -1.15 + (2.3 * i) / 9, r: 4.6 + (i % 2) * 1.1, commander: i === 5,
}));
