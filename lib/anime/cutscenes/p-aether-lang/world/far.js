// The far ranks behind the island: two baked mountain cards in the live snow and sky inks, shown while the island shows (before the impact, after the return).
import { Group } from "three";
import { bgCard } from "../../../kit/bg/cards.js";
import { BACK, HIT } from "../clock.js";

export function buildFar(ctx) {
  const group = new Group();
  const cards = [
    bgCard(ctx, "mountains", { at: [0, 14, -150], size: [380, 30], dark: "#d9d3e8", mid: "#e8e2f0", rim: "#fbfaf7", glow: "#fbfaf7", lit: 0, seed: 4 }),
    bgCard(ctx, "mountains", { at: [0, 10, -230], size: [560, 24], dark: "#e3e0ee", mid: "#eeeaf4", rim: "#fbfaf7", glow: "#fbfaf7", lit: 0, seed: 8 }),
  ];
  group.add(...cards);
  return {
    group,
    update(t) {
      group.visible = t < HIT.impact || t >= BACK;
    },
    dispose() {
      for (const m of cards) {
        m.geometry?.dispose();
        m.material?.dispose();
      }
      group.removeFromParent();
    },
  };
}
