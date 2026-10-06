// Frieren (Madhouse), world recipe. Target: style-refs/_owner/frieren-madhouse.webp (golden-hour
// hillside) with sealreferences/fierien.jpg. The plate is a procedural painting
// (paintings/frieren.js); this recipe is its finishing: generalized Kuwahara strokes, pastel
// bloom and diffusion, watercolour paper. Pure data.
export default {
  id: "frieren", name: "Frieren (Madhouse)", anime: "Frieren", world: "frieren",
  homage: "Madhouse's Frieren backgrounds: golden-hour backlight, values in a few big shapes, painted grass strokes, pale lavender rocks with thin warm line, mist, pastel bloom.",
  fill: { rim: 0, ring: 0 },
  lines: { set: 0 },
  post: { bloom: 0.55, diffuse: 0.3, sat: 1.0, grain: 0.012, vig: 0.1, kuwa: 4, kuwaMode: "general", paper: "#fbf4ea", paperAmt: 0.3, paperKind: 1, paperTex: 0.5 },
  timing: { fps: 12 },
};
