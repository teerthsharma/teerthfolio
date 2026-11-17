// The cenotes (DISTRICT-PLAN E14): three round sinkholes in the Shape Garden, each a candy collar on the rim and a turquoise
// water disc at the ground. Pure layout: components/world/land/Cenotes.jsx draws them; COLLIDERS keep the pup off the rims.
import { heightAt } from "./terrain.js";

export const CENOTES = [
  { x: -18, z: 50, r: 2.2 },
  { x: -12, z: 56, r: 1.6 },
  { x: -24, z: 57, r: 1.3 },
];
export const COLLAR = { tube: 0.18, lift: 0.12, segs: 24, bands: 12, colours: ["#ff5cc0", "#8a5cff"] };
export const WATER = "#7de3ff";
export const COLLIDERS = CENOTES.map((c) => ({ x: c.x, z: c.z, radius: c.r + 0.3, land: "cenote" }));

const SEG = 24;
export const GROUND_VERTS = [];
for (const c of CENOTES) {
  const rw = c.r - 0.45;
  const at = (x, z) => [x, heightAt(x, z) + 0.05, z];
  for (let k = 0; k < SEG; k++) {
    const a0 = (2 * Math.PI * k) / SEG;
    const a1 = (2 * Math.PI * (k + 1)) / SEG;
    GROUND_VERTS.push(at(c.x, c.z), at(c.x + rw * Math.cos(a0), c.z + rw * Math.sin(a0)), at(c.x + rw * Math.cos(a1), c.z + rw * Math.sin(a1)));
  }
}
