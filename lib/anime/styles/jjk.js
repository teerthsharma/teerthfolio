// Jujutsu Kaisen (MAPPA), world recipe. Targets: sealreferences/IMG_0428 (Malevolent Shrine domain:
// crimson storm #610816 over black #060307, teal stone #0a2527, cyan-lit pillars), sukuna.jpg
// (black ink, red/cyan duotone), the Gojo frame (red filaments). Pure data.
export default {
  id: "jjk", name: "Jujutsu Kaisen (MAPPA)", anime: "Jujutsu Kaisen", world: "shrine",
  homage: "Sukuna's Malevolent Shrine: black-and-crimson storm, red horizon glow, black-water mirror, heavy black ink on the architecture, cyan-lit stone, aberration, heavy grain and vignette, lightning on threes.",
  fill: { rim: 0.9, ring: 0, sat: 1.05 },
  lines: { set: 0.45, setW: 1.2, setMix: 1, setCol: "#000000", setDepth: 1.2 },
  post: { bloom: 0.7, diffuse: 0.1, sat: 1.08, gain: [1.05, 0.97, 0.97], grain: 0.08, vig: 0.75, ca: 1.5, haze: "#2a0208", hazeAmt: 0.25, hazeNear: 30, hazeFar: 120 },
  timing: { fps: 8 },
};
