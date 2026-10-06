// COSTUME DATA for p-separatrix (Golden Wind). Every figure is a SMALL SEAL with the locked proportions (L6b); colours from bible sections 2 and 4.
// All hex are the bible's. Each entry is a costumed-seal-kit spec; `extras` lists rigid props only this dock needs (built in seals.js).
import { defineHair } from "../../../kit/hair-clump-kit.js";

// Diavolo: waist-length pink hair, 14 clumps (7 x 2 layers), spotted; green tsurime eyes; mesh top with a black scalloped collar.
export const DIAVOLO = {
  name: "diavolo-seal", scale: 0.78,
  layers: [{ type: "uniform", col: "#e8b878", shade: "#a8784a", collar: "#1a1020" }],
  hair: defineHair("long", { count: 7, layers: 2, length: [0.46, 0.78], width: 0.085, droop: 0.7, seed: 5, cut: { at: [0.4, 0.62], slant: 0.1, rate: 0.85 },
    color: { base: "#e8559a", shade: "#a02a6a", hi: "#f070a8" } }),
  eyes: { style: "tsurime", iris: "#4fd08a", irisLo: "#1f7a5a", lash: "#1a1020", pupilCol: "#1a1020" },
  extras: { spots: 8, spotCol: "#1a1020", lips: "#b060c0", bracelet: "#3fa060", lattice: "#1a1020", scallops: "#1a1020" },
};

// witnesses (the three on the tiers) and the five extras who join the hero pose at 12.1
export const SEALS = {
  polnareff: { name: "polnareff-seal", scale: 0.5,
    layers: [{ type: "sash", col: "#4a6aa8", shade: "#243460" }],
    hair: defineHair("spiky", { count: 9, layers: 2, length: [0.2, 0.4], seed: 3, color: { base: "#cfd0e0", shade: "#7a7a98", hi: "#ffffff" } }),
    eyes: { style: "round", iris: "#4a78c8", irisLo: "#1f3a78" },
    extras: { turtle: "#4a8a4a", turtleShade: "#2a5a30", key: "#f2bd45" } },
  mista: { name: "mista-seal", scale: 0.5,
    layers: [{ type: "uniform", col: "#1d1d2c", shade: "#0c0c14", collar: false, stripe: "#e8c040" }],
    hat: { kind: "top", col: "#2a2a3a", shade: "#10101a", trim: "#e8c040" },
    weapon: { kind: "pistol", hand: "r", tilt: [1.1, 0] }, // revolver held low
    eyes: { style: "round", iris: "#5a3a2a" } },
  trish: { name: "trish-seal", scale: 0.5,
    layers: [{ type: "coat", col: "#e87aa8", shade: "#a8446e", open: 0.03 }, { type: "sash", col: "#f8d070", shade: "#b8883a" }],
    hair: defineHair("bob", { count: 11, layers: 2, length: [0.18, 0.3], seed: 8, color: { base: "#e8559a", shade: "#a02a6a", hi: "#f070a8" } }),
    eyes: { style: "tareme", iris: "#c84a8a", irisLo: "#7a2050" },
    extras: { hand: true } },
  // the five extras (strike poses 12.1-15.4)
  bucciarati: { name: "bucciarati-seal", scale: 0.52,
    layers: [{ type: "uniform", col: "#e8eef8", shade: "#7a8ab8", collar: "#c8d4ec", buttons: "#9aa8c8" }],
    hair: defineHair("bob", { count: 11, layers: 2, length: [0.14, 0.24], seed: 12, color: { base: "#1a1a28", shade: "#08080e", hi: "#4a5a88" } }),
    eyes: { style: "round", iris: "#3a5ac8", irisLo: "#1a2a78" }, lean: [-0.22, 0.25, 0] },
  abbacchio: { name: "abbacchio-seal", scale: 0.52,
    layers: [{ type: "coat", col: "#8a8a9a", shade: "#4a4a5a", open: 0.06, collar: true }],
    hair: defineHair("swept", { count: 12, layers: 2, seed: 14, color: { base: "#c8c8d8", shade: "#6a6a88", hi: "#f4f4ff" } }),
    eyes: { style: "tsurime", iris: "#8a6ac8", irisLo: "#40286a" }, lean: [0.2, 0.18, -0.1] },
  fugo: { name: "fugo-seal", scale: 0.5,
    layers: [{ type: "uniform", col: "#a8688a", shade: "#5a2a4a", buttons: "#f0e0a0" }],
    hair: defineHair("swept", { count: 12, layers: 2, seed: 16, color: { base: "#e8c868", shade: "#a8883a", hi: "#fff0a0" } }),
    accessories: [{ kind: "glasses", col: "#2a2a34" }],
    eyes: { style: "round", iris: "#6a8ac8", irisLo: "#2a3a78" }, lean: [-0.15, -0.28, 0.05] },
  narancia: { name: "narancia-seal", scale: 0.48,
    layers: [{ type: "uniform", col: "#2a3a6a", shade: "#10183a", buttons: "#e8e0d0" }],
    hat: { kind: "headband", col: "#1a1a28", trim: "#e8e0d0" },
    hair: defineHair("spiky", { count: 8, layers: 2, length: [0.12, 0.22], seed: 18, color: { base: "#1a1a22", shade: "#08080c", hi: "#4a4a6a" } }),
    eyes: { style: "round", iris: "#5a3a2a" }, lean: [-0.3, 0.2, 0.15] },
  risotto: { name: "risotto-seal", scale: 0.52,
    layers: [{ type: "coat", col: "#2a2a3a", shade: "#0c0c14", open: 0.05, trim: "#c02a4a" }],
    hair: defineHair("slick", { count: 12, layers: 1, seed: 20, color: { base: "#2a2a30", shade: "#101014", hi: "#6a6a88" } }),
    eyes: { style: "slit", iris: "#c02a4a", irisLo: "#601020" }, lean: [0.1, -0.2, -0.12],
    extras: { beret: "#c02a4a", beretShade: "#601020" } },
};

// Giorno on the hero seal: costume ADDITIVE to the locked pup (bible 4). Coat jacket pink, hem gold, three gold curls, braid with 5 beads.
export const GIORNO = {
  layers: [{ type: "coat", col: "#d985bd", shade: "#b8559a", open: 0.05, trim: "#f0c860", collar: "#d985bd" }],
  hair: defineHair("swept", { count: 10, layers: 1, length: [0.07, 0.13], width: 0.065, lift: 0.55, droop: 0.05, seed: 21, band: [0.05, 0.95], sector: [-Math.PI, Math.PI],
    color: { base: "#f5c518", shade: "#b8901c", hi: "#f8e08a" }, cut: { at: [0.35, 0.65], slant: 0.1, rate: 0.9 } }),
  curl: { base: "#f5c518", mid: "#e9c05a", hi: "#f8e08a", shade: "#a87a10" },
  ribbon: "#e3769f", brooch: "#f2bd45", spots: "#2a1a24",
  eyes: { style: "round", iris: "#3fbf8a", irisLo: "#1f7a5a", lash: "#1a1020", pupilCol: "#1a1020" },
};
export const SEAL_ORDER = ["polnareff", "mista", "trish", "bucciarati", "abbacchio", "fugo", "narancia", "risotto"]; // the eight
