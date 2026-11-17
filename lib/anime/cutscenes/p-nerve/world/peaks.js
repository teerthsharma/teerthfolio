// The snow peaks on the island's horizon (BOOST): three baked mountain rows (the kit's mountains card) in pink-white snow, the shade side
// blue, each pulled toward the sky colour by its distance. They stand upper right of the ISL lens, under 16 degrees of elevation.
import { Color, Group, Mesh } from "three";
import { bgCard } from "../../../kit/bg/cards.js";
import { BOOST } from "../clock.js";
import { toneMat } from "./island.js";

const SKY = "#a3d4e2";
const ROWS = [
  { Z: 120, S: 300, H: 61, x: 35, k: 0.35, density: 5, seed: 3 },
  { Z: 200, S: 480, H: 83, x: 30, k: 0.55, density: 7, seed: 5 },
  { Z: 320, S: 700, H: 112, x: 20, k: 0.75, density: 9, seed: 8 },
];
const mixHex = (a, b, k) => "#" + new Color(a).lerp(new Color(b), k).getHexString();

export function buildPeaks(ctx) {
  const group = new Group(), made = [];
  if (BOOST) {
    for (const r of ROWS) {
      const m = bgCard(ctx, "mountains", {
        w: 2048, h: 512, size: [r.S, r.H], at: [r.x, r.H / 2, -r.Z], density: r.density, seed: r.seed, lit: 0,
        dark: mixHex("#b4c3e6", SKY, r.k * 0.6), mid: mixHex("#f6e7f0", SKY, r.k * 0.25), rim: "#ffffff",
      });
      if (!m.material.userData.toned) toneMat(m.material);
      group.add(m);
      made.push(m.geometry, m.material);
    }
  }
  return {
    group,
    update() {},
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
