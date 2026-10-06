// DATA ONLY: every costume of pr-nemo-relay-481 (Dragon Ball Super, Ultra Instinct). Hex from the bible sections 2 and 4.
// Fed to ctx.kit.costumedSeal(engine, spec). Layers are the kit's SDF cloth shells; hats and weapons are the kit's rigid props.
const silverHair = { base: "#e8f0ff", shade: "#5a6a98", hi: "#f4f8ff" }; // UI silver: lit #e8f0ff, deep #5a6a98 (never pure white)

export const HERO = {
  // the locked seal is never restyled; these ride its body: an obi decal, five silver tuft clumps, the silver eye decal
  obi: { col: "#f08a1f", shade: "#c85a10", tail: "#2a50c0", tailShade: "#1a3488" },
  tuft: { band: [0.0, 0.45], sector: [-Math.PI, Math.PI], count: 5, layers: 1, length: [0.1, 0.17], width: 0.07, lift: 1, sweep: [0, 0.1, 0],
    spike: 0.9, droop: 0, seed: 5, color: silverHair, cut: { at: [0.4, 0.8], slant: 0.1, rate: 1 } },
  eyes: { style: "round", iris: "#dfe8f8", irisLo: "#a8b8d8", pupilCol: "#c9d4e8", sclera: "#eaf0f8", lash: "#5a6a98" }, // silver, pupil-less read
};

export const WHIS = {
  scale: 0.74, name: "whis-seal",
  coat: "#b8c0e0", shade: "#8a92b8", // pale-blue skin
  layers: [
    { type: "cloak", col: "#8a1a3a", shade: "#5a0a22", lining: "#1a1020", trim: "#d8b030", len: 0.95, collar: "high" }, // maroon robe, black lining, gold hem
    { type: "sash", col: "#38a0d0", shade: "#1f6a90", knot: "#38a0d0" },                                                  // cyan sash
  ],
  hair: { band: [0.0, 0.5], sector: [-Math.PI, Math.PI], count: 5, layers: 1, length: [0.1, 0.2], width: 0.06, lift: 1, sweep: [0, 0.1, 0], spike: 0.95, seed: 9,
    color: { base: "#e8ecf8", shade: "#9aa0c8", hi: "#f6f8ff" }, cut: { at: [0.35, 0.8], slant: 0.1, rate: 1 } }, // 4-5 short; the 1 tall spire is a prop
  weapon: { kind: "staff", hand: "l", col: "#e8ecf8", trim: "#38c0e8", gem: "#14101a" }, // black orb in a thin cyan ring
  eyes: { style: "tareme", iris: "#3a2a4a", irisLo: "#1a1226" },
  spire: { col: "#e8ecf8", shade: "#9aa0c8" }, halo: { col: "#7ad0f0", shade: "#3a90b8" },
};

export const BEERUS = {
  scale: 0.68, name: "beerus-seal",
  coat: "#9a78b0", shade: "#6e5088", // lilac-purple fur
  layers: [
    { type: "coat", col: "#16121e", shade: "#08060c", trim: "#f4f4f0", open: 0.3 },       // white-edged black chest piece
    { type: "scarf", col: "#d8b030", shade: "#9a7818" },                                   // gold collar
  ],
  eyes: { style: "slit", iris: "#f0c030", irisLo: "#c89010", sclera: "#f2e8c0", lash: "#3a2050" }, // yellow slit
  ear: { col: "#8a6ab0", shade: "#5a4080" }, stud: "#f0c030", armlet: "#d8b030",
  pudding: { cup: "#f4f4f0", body: "#f0c868", caramel: "#7a3a1a", cherry: "#d02a3a" },
};

export const JIREN = {
  scale: 0.62, name: "jiren-seal",
  coat: "#a8a8b8", shade: "#7a7a90", // grey skin
  layers: [
    { type: "uniform", col: "#c82040", shade: "#7a1028", collar: "#f4f4f0", stripe: "#f4f4f0" }, // red-and-white tunic
    { type: "sash", col: "#15121c", shade: "#06050a" },                                          // black belt
  ],
  eyes: { style: "tsurime", iris: "#d02a3a", irisLo: "#7a1020", sclera: "#e8e4e4", lash: "#2a1018" }, // red eyes
  glove: "#f4f4f0", sleeve: "#c82040", sweat: "#9ad8ff",
};

export const TROOPER = {
  scale: 0.5,
  coat: "#8e8c91", shade: "#6d6b7d", // plain seal under the armour
  layers: [{ type: "armour", col: "#c82040", shade: "#7a1028", trim: "#1a1020" }],
  hat: { kind: "helmet", col: "#f4f4f0", shade: "#b8b8c0" }, // round white helmet
  weapon: { kind: "wand", hand: "r", col: "#1a1020", gem: "#c82040" }, // the baton
  visor: "#1a1020",
};

export const LEDGE = { top: "#e8d8c0", side: "#a86a48", edge: "#3a3a4a" }; // mosaic cream / terracotta / shadow
