// caustic: Naruto Shippuden, Madara at the Fourth Shinobi War. The war is a dream inside the Infinite
// Tsukuyomi: a model's confident collapse. The seal breaks it, and caustic measures it with no ground truth.
// The dock builder owns this file and moves/p-caustic.jsx (parts in moves/p-caustic/); the fields are in cards/index.js.
// The alliance speaks from the ridge (land: the tail reaches past the lighthouse to them); after the
// second meteor shatters the war, the pup says the flex line in the real island. Round head, no ears.
const now = () => (typeof window !== "undefined" ? window.__ccT ?? -1 : -1);
const ss = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
// the wide lens (the sky, the moon, the war), and the LOW lens for line A: down by the pup's flank, looking UP past it at the titan
const WIDE = { wide: [[0.4, 1.15, -1.0], [-0.1, 0.0, 10.6]], tall: [[0.3, 1.45, -1.0], [-0.1, 0.05, 13.5]] };
const LOW = { wide: [[-1.5, 3.8, -6], [7.5, -3.4, 14]], tall: [[-1.5, 4.2, -6], [9, -3.7, 16]] };
const OUT = { wide: [[0, 0, 0], [0, 0, 0]], tall: [[0, 0, 0], [0, 0, 0]] };
function lens(t) {
  const k = t < 0 ? 0 : ss(2.3, 3.0, t) * (1 - ss(4.5, 5.3, t)); // wide -> low as the titan rises, back to wide for the moon and the meteors
  for (const a of ["wide", "tall"]) for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) OUT[a][r][i] = WIDE[a][r][i] + (LOW[a][r][i] - WIDE[a][r][i]) * k;
  return OUT;
}
export default {
  id: "p-caustic",
  homage: "Naruto Shippuden: Madara, the Perfect Susanoo and Tengai Shinsei",
  why: "A model's confident collapse is an illusion; caustic measures it with no ground truth.",
  stage: { color: "#e0559b", stars: "none", halftone: 6, sfx: "GOGOGO" },
  length: 11.6,
  beats: { lineA: 3.0, move: [6.0, 6.6], lineB: 6.6 },
  speaker: "land",
  landAt: { x: 54, y: 1.3, z: 38 }, // the lighthouse's foot: the rig turns it (and the alliance far beyond) to the right
  // a level lens, stood back: the sky, the moon and the Susanoo over the pup, the pup above the bubbles
  get view() {
    return lens(now());
  },
  a: { who: "land", text: "Is this… the power of a god?" },
  b: { who: "seal", text: "This is the power of a seal. 0.995 AUROC, with no ground truth.", kind: "burst" },
  credit: { title: "teerthsharma/caustic · 0.995 AUROC · five proved bounds", sub: "Hallucination, measurable with no ground truth.", ret: "Limbo closes. The seal walks out of Madara's moon." },
  move: { pose: "sign", then: "raise", note: "The pup becomes Madara; a Perfect Susanoo rises over the war under the Tsukuyomi moon; two meteors fall and the second shatters the illusion back to the island." },
  bold: ["power of a god", "power of a seal", "no ground truth", "0.995 AUROC"],
};
