// LOOK sukuna for hero2/c: pink spiked hair, four red eyes, the forehead and cheek marks, a toothed grin, a dark high-collar jacket.
const INK = "#150a10";
export default {
  fur: { coat: "#8b8993", shade: "#5a576e", muzzle: "#a09da9", muzzleShade: "#65627c", nose: "#3a2f36" },
  eyes: { count: 4, iris: "#e3202c", glow: "#ff7a52", dark: "#3c0812" },
  teeth: { col: "#fbf7ee", shade: "#cfc6bc", upper: 11, lower: 9 },
  hair: { dark: "#8e4a66", mid: "#cf7f9b", hi: "#e9a3b8", seed: 3 },
  marks: [
    { pts: [[0, 0.232], [0, 0.17]], w: [0.013, 0], lens: true },
    { pts: [[0.012, 0.222], [0.034, 0.214], [0.05, 0.19]], w: [0.0065, 0.0016], mirror: true },
    { pts: [[0.096, 0.1], [0.108, 0.07], [0.114, 0.03]], w: [0.006, 0.0016], mirror: true, col: INK },
    { pts: [[0.118, 0.105], [0.127, 0.075], [0.128, 0.045]], w: [0.0045, 0.0014], mirror: true },
    { pts: [[0.073, 0.092], [0.085, 0.07], [0.097, 0.062]], w: [0.0038, 0.0012], mirror: true },
  ],
  whisker: { dot: "#3c3640", col: "#ddd9e2", tip: "#8f8a99" },
  outfit: { col: "#2a2046", shade: "#150f2a", trim: "#d9b34a", rim: "#54487c", band: "#15101c" },
  hands: { skin: "#b49c88", shade: "#76604f", nail: "#c3ab98" },
};
