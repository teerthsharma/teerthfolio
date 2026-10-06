// COSTUME SPECS (data) for p-monodromy: Ja'far (bible 3.9 / 4), the Al-Thamen victim set (3.10), the Sindria crowd (3.8).
// Every field is a costumed-seal-kit spec; hex values from the bible's style law. Coat tint stays the locked grey.
const SILVER = { base: "#e8e6ea", shade: "#a8a4b4", hi: "#ffffff" };
// Ja'far: white robe #f6f2ea (shadow #b4aacb), teal sash #14757d, silver hair 5 short up-left clumps, black eyes with one hard highlight.
export const JAFAR = {
  scale: 0.74,
  layers: [{ type: "coat", col: "#f6f2ea", shade: "#b4aacb", trim: "#14757d", open: 0.02 }, { type: "sash", col: "#14757d", shade: "#0a4a52", knot: "#c0262e" }],
  hair: { preset: "spiky", count: 5, layers: 1, band: [0.5, 1.1], sector: [-0.9, 0.9], length: [0.07, 0.12], width: 0.055, sweep: [-0.5, 0.2, 0], seed: 7, color: SILVER, cut: { at: [0.35, 0.7], slant: 0.1, rate: 1 } },
  eyes: { style: "round", iris: "#1a0f0a", irisLo: "#000000", pupilCol: "#000000" },
};
// Al-Thamen: robe #1c1830 / lit #3a3358 / shadow #0c0a1c, trim #b8860b, mask #f6f2ea with two red lines #b3123a, staff #5a3a22 with a gold ring. No hair.
export const ALTHAMEN = {
  scale: 0.62,
  layers: [{ type: "cloak", col: "#1c1830", shade: "#0c0a1c", lining: "#3a3358", trim: "#b8860b", len: 1, collar: "high", spread: 1.05 }],
  accessories: [{ kind: "mask", col: "#f6f2ea" }],
  weapon: { kind: "staff", hand: "r", col: "#5a3a22", trim: "#b8860b", gem: "#b3123a" },
  eyes: { style: "slit", iris: "#b3123a", irisLo: "#3a0a18" },
};
// Sindria crowd: cream tunic #f7f1e3, sash in one of 6 ROBES colours, black hood band with the gold forehead plate on 1 in 3.
export const ROBES = ["#fff3d6", "#1fbdb4", "#e4566a", "#f2b52e", "#ffffff", "#7d4fc4"];
export const crowdSpec = (i) => ({
  scale: 0.5 + (i % 4) * 0.02,
  layers: [{ type: "uniform", col: "#f7f1e3", shade: "#b4aacb", collar: false }, { type: "sash", col: ROBES[i % 6], shade: "#4a3a6a" }],
  hat: i % 3 === 0 ? { kind: "headband", col: "#231a14", trim: "#e9c040" } : { kind: "headband", col: "#231a14", trim: "#231a14" },
});
