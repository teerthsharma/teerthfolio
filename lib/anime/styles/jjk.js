// Jujutsu Kaisen (MAPPA), world recipe. Composition and motifs: sealreferences/IMG_0428 (Malevolent
// Shrine). Rendering: style-refs/_owner/jjk-gojo-poster-violet.png and jjk-mappa-faces-grid.png:
// one dominant hue per shot (here black and crimson) with ONE saturated accent kept (the cyan slit
// glow), hard cel shapes with razor shadow edges, thick black ink on silhouettes, glow only on the
// accent, light grain. Pure data.
export default {
  id: "jjk", name: "Jujutsu Kaisen (MAPPA)", anime: "Jujutsu Kaisen", world: "shrine",
  homage: "MAPPA's Malevolent Shrine: a black-and-crimson frame with one cyan accent, hard cel shapes, thick black ink, glow only on the accent, lightning on threes.",
  fill: { t: 0.5, soft: 0, rim: 0.9, ring: 0, sat: 1.05 },
  lines: { set: 1, setW: 1.7, setMix: 1, setCol: "#000000", setDepth: 1.3 },
  post: { bloom: 0.8, diffuse: 0.05, sat: 1.05, gain: [1.02, 0.97, 0.98], grain: 0.05, vig: 0.8, ca: 0.8,
    kuwa: 3, kuwaMode: "general", haze: "#12040a", hazeAmt: 0.15, hazeNear: 30, hazeFar: 140,
    hue: { amount: 0.35, dark: "#030106", mid: "#7a0a22", light: "#ffc4cc", accent: 0.52, width: 0.12 } },
  timing: { fps: 8 },
};
