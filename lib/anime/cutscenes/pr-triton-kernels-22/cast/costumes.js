// CAST costumes for pr-triton-kernels-22 (Sukuna's Malevolent Shrine). Pure data for costumed-seal-kit, from bible section 4.
// Every victim is a SMALL SEAL (L6b), 0.45 of the hero scale. Hex values are the bible's.

// Jogo-dressed fire-curse victim: hide-tone wrap #8a3a1a with lava cracks #ff6a2a (sash trim), charcoal #2a2a30 skin,
// a single vertical-slit eye (style "slit", iris lava orange), volcano head cap: one tapered cone #5a2a1a with a 3-clump tuft.
export const JOGO = {
  name: "jogo-seal", scale: 0.45,
  coat: "#3a3a42", shade: "#2a2a30",
  layers: [
    { type: "uniform", col: "#8a3a1a", shade: "#4a1a0c", collar: false, stripe: "#ff6a2a" },
    { type: "sash", col: "#ff6a2a", shade: "#b0401a", knot: "#ff6a2a" },
  ],
  hair: { preset: "spiky", count: 3, layers: 1, band: [0.05, 0.55], length: [0.16, 0.3], width: 0.09, lift: 1, spike: 0.35, sweep: [0, 0, 0], seed: 22,
    color: { base: "#5a2a1a", shade: "#2e1409", hi: "#9a4a2a" }, cut: { at: [0.45, 0.8], slant: 0.12, rate: 1 } },
  eyes: { style: "slit", iris: "#ff6a2a", irisLo: "#a03a10", pupilCol: "#120c14" },
};

// Mahoraga-dressed shadow guards x3: white-grey cloak #d8d4c8, blank white mask #f4efe2, halo ring #f4efe2 (built in index.js).
export const MAHORAGA = {
  name: "mahoraga-seal", scale: 0.45,
  layers: [{ type: "cloak", col: "#d8d4c8", shade: "#9a968c", len: 1, collar: true, trim: "#b9b2a0" }],
  accessories: [{ kind: "mask", col: "#f4efe2" }],
  eyes: { style: "blank", iris: "#f4efe2", irisLo: "#cfc9ba", pupilCol: "#0e0b0d" },
};

// sorcerer students x8: navy jacket #1a2440, gold buttons #c9a02a, high collar, tufts of 3-5 clumps (brown #5a3a24 / black #0e0b0d),
// a small cursed blade #cfd5df. The black trousers are the dark fur tint (a seal has no legs).
const HAIRS = [
  { base: "#5a3a24", shade: "#2c1a10", hi: "#9a6a44" },
  { base: "#0e0b0d", shade: "#050406", hi: "#4a4458" },
];
export function student(i) {
  return {
    name: `student-${i}`, scale: 0.45,
    coat: i % 2 ? "#4a4a56" : "#5a5a66", shade: "#1a1a20",
    layers: [{ type: "uniform", col: "#1a2440", shade: "#0a1020", collar: "#1a2440", buttons: "#c9a02a" }],
    hair: { preset: "spiky", count: 3 + (i % 3), layers: 1, band: [0.1, 0.9], length: [0.1, 0.2], width: 0.07, lift: 0.7, spike: 0.7, seed: 100 + i * 7, color: HAIRS[i % 2], cut: { at: [0.5, 0.85], slant: 0.1, rate: 0.8 } },
    weapon: { kind: "sword", hand: i % 2 ? "l" : "r", col: "#cfd5df", tilt: [0, i % 2 ? 0.5 : -0.5] },
    eyes: { style: i % 3 ? "round" : "tareme", iris: i % 2 ? "#3a2a1a" : "#2a3a5a" },
  };
}
