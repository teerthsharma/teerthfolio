// Jujutsu Kaisen (MAPPA), world recipe. Canonical target: style-refs/_owner/jjk-shrine-ANIME-FRAME.webp
// (MAPPA's Malevolent Shrine): painted anime compositing, crimson above and teal below, soft glow on
// the ember band, the light columns and the crest mouth, slightly soft focus, film grain. Pure data.
export default {
  id: "jjk", name: "Jujutsu Kaisen (MAPPA)", anime: "Jujutsu Kaisen", world: "shrine",
  homage: "MAPPA's Malevolent Shrine: black sky veined with red smoke, the shrine mirrored in its water, a teal tiled wall with blue light columns, soft compositing glow, film grain.",
  fill: { t: 0.5, soft: 0.18, rim: 0.7, ring: 0, sat: 1.05 },
  lines: { set: 0.35, setW: 1.0, setMix: 1, setCol: "#000000", setDepth: 1.2 },
  post: { bloom: 1.0, diffuse: 0.3, sat: 1.08, gain: [1.0, 0.98, 1.0], grain: 0.07, vig: 0.7, ca: 0.6 },
  timing: { fps: 8 },
};
