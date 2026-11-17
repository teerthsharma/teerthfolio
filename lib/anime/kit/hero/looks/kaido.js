// LOOK kaido: long teal hair, golden horns and earrings, teal armour with a gold necklace.
export default {
  fur: { coat: "#6a6970", shade: "#383842", belly: "#c9a98a", bellyShade: "#8e6e5c", nose: "#24222a", ink: "#25222a", blush: null },
  eyes: { style: "tsurime", iris: "#f6cf48", iris2: "#b06a12", size: 0.9, lash: "#1a181e" },
  brows: { col: "#24242c", thick: 1.3 },
  mouth: { rest: "smile", sharp: 0.8, fangs: true },
  hair: { preset: "long", col: "#2b8a94", shade: "#134450", hi: "#62c0c6", cap: { front: 0.55, back: 1.9, zig: 0.12, n: 9, crown: 0.03 }, width: 0.13, spike: 0.3, curl: 0.05, seed: 5,
    parts: [
      { band: [0.3, 1.7], sector: [0.95, 5.33], count: 30, layers: 2, length: [0.26, 0.42], lift: 0.12, droop: 2.0, sweep: [0, -0.1, -0.7] },
      { band: [0, 0.6], count: 10, layers: 1, length: [0.16, 0.24], lift: 0.35, droop: 0.4, sweep: [0, 0.3, -0.9], spike: 0.5 },
    ] },
  acc: [{ kind: "horns", col: "#e6bd48", shade: "#8a6418" }, { kind: "earrings", col: "#e3bf55", shade: "#8a6418" }],
  outfit: [{ kind: "armour", col: "#2e7480", shade: "#123842", trim: "#d9b34a" }, { kind: "necklace", col: "#d9b34a", shade: "#7a5612", pendant: true }],
  hands: { kind: "human", skin: "#a88f78" },
};
