// The cutscene's clock (real s and picture tt), the beat table, the live palette and text, all from the live capture.
export const DOCK = [40, 0, -6.9];
export const WARP = [[0, 0], [3.5, 3.5], [18.6, 9.2], [25, 12.4], [25.8, 13.2]]; // [real s, picture tt]
const through = (x, a, b) => { for (let i = 1; i < WARP.length; i++) if (x < WARP[i][a]) return WARP[i - 1][b] + ((x - WARP[i - 1][a]) * (WARP[i][b] - WARP[i - 1][b])) / (WARP[i][a] - WARP[i - 1][a]); const e = WARP.at(-1); return e[b] + x - e[a]; };
export const warp = (r) => through(r, 0, 1);
export const unwarp = (tt) => through(tt, 1, 0);
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;

export const T = {
  calm: 1.9, ignite: [2.7, 3.15], silver: [2.85, 3.5], eyes: [3.45, 9.6], gut: [9.2, 10.0], spent: [9.8, 10.3],
  tap: 9.45, crack: 10.3, drain: [9.5, 10.9], reveal: 11.0, out: [11.2, 12.2],
};
export const R = {
  sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, ignite: [2.7, 3.15], flash: 2.95, surge: 3.0,
  tap: unwarp(T.tap), crack: unwarp(T.crack), reveal: unwarp(T.reveal), out: [unwarp(T.out[0]), unwarp(T.out[1])], end: 25.8,
};
export const LINE = { A: 2.3, B: 8.1, C: 13.5, credit: 18.8, collapse: [25.0, 25.4] };
export const BACK = 18.85; // the swap back to the pale seal (the form's gutter is 18.6 to 18.85)
export const STAGE_R = 54;
export const SEAL = { scale: 2.0, pup: 0.9, yaw: 0 }; // character scale (wides need 0.18 height); pale pup matches the live dock size
export const ORB = { n: 9, launch: 3.55, gap: 0.45, fly: 0.55, colors: ["#ff3b3b", "#ffd23a", "#3aa0ff", "#ff4fc8", "#ff8a1f", "#39e08a"] };
export const passAt = (i) => ORB.launch + ORB.gap * i + ORB.fly;
export const passReal = (i) => unwarp(passAt(i));
export const passSide = (i) => (i % 2 ? 1 : -1);
export const PASSY = [1.0, 0.28, 1.35, 0.25, 0.8, 0.3, 1.2, 0.26, 0.95];
export const PASSZ = [-0.95, 1.4, -1.1, 1.6, -0.8, 1.35, -1.0, 1.5, -0.9];

export const PAL = {
  ink: "#0a0a1e", hull: "#d6e6ff",
  sky: ["#a46bff", "#7a3fe0", "#5a24b8", "#3d1788", "#250a5c"],
  below: ["#4b1fa0", "#2e1070", "#1a0646"],
  nebula: { cyan: "#38d4f0", magenta: "#e04099", orange: "#ffb03b", cream: "#fff0a8", violet: "#9e57eb", cyan2: "#57e6ff" },
  speed: ["#f7f5ff", "#b3d1ff"],
  tile: { a: "#e1d6bd", b: "#cbbfa4", edge: "#b9ab92" },
  rock: ["#bfa285", "#ad9078", "#cbb08f", "#9f8670"],
  ledge: "#c3a98c",
  whis: { skin: "#a9cdee", robe: "#7a1f3a", cuirass: "#14121e", crest: "#f2f4ff", bead: "#7fe3ff", halo: "#c9f8ff" },
  beerus: { skin: "#8e63c4", pants: "#14121e", ears: "#c9a2e8", gold: "#ffd23a" },
  aura: ["#6a2fd0", "#a58cf0", "#e6ecff"],
  spark: "#d8e0ff", ring: "#cfe6ff", orbHeart: "#fffff2", ghost: "#cfe2ff", flash: "#dbe7ff",
  krrrk: "#e5363a", hitRed: "#ff3b3b", hitGold: "#ffd23a", accent: "#6f7fe0", deep: "#121640", dots: "#babdff", cream: "#fbfaf7",
  shade: [0.58, 0.52, 0.8], light: [-0.42, 0.74, 0.52],
};

export const TEXT = {
  a: { kind: "oval", text: "Ultra Instinct… the body moves on its own.", bold: "Ultra Instinct" },
  b: { kind: "burst", text: "23 files. One scaffold. I didn't even think.", bold: "23 files|One scaffold" },
  c: { kind: "burst", text: "That's the power of the gods.", bold: "power of the gods" },
  credit: { title: "NVIDIA/NeMo-Relay #481 · merged · 23 files", sub: "One unchanging scaffold now keys to one profile instead of one per task." },
  sfx: "SHHN", crack: "KRRRK!",
};
