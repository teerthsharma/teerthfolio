// The far skyline of Academy City: two painted ranks of towers beyond the live leaves, in the live haze inks, so the avenues end in towers,
// not in an empty gradient. A baked card per rank (bgCard, layer 0, baked per shot); no motion.
import { Group } from "three";
import { bgCard } from "../../../kit/bg/cards.js";
import { tone } from "../tone.js";

const RANKS = [
  { at: [0, 22, -170], size: [420, 44], density: 18, seed: 5, dark: "#b8c6e6", mid: "#cad5ee", lit: 0.15 },
  { at: [0, 16, -260], size: [620, 32], density: 24, seed: 9, dark: "#c9d3ea", mid: "#d6def0", lit: 0.05 },
];

export function buildFar(ctx) {
  const group = new Group(), made = [];
  for (const r of RANKS) {
    const card = bgCard(ctx, "skyline", { ...r, rim: "#f6fbff", glow: "#e8f1ff", billboard: false, id: 0.99 });
    tone(card.material);
    group.add(card);
    made.push(card.geometry, card.material);
  }
  return { group, update() {}, dispose() { for (const x of made) x.dispose(); } };
}
