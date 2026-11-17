// The sea stacks and the natural arch off the TensorFlow Rig's coast (DISTRICT-PLAN E9): two stacks and an arch in the sea, banded
// teal over gold. No collider: they stand in the water. Pure layout: components/world/land/SeaStacks.jsx draws them as one mesh.
import { SEA_Y } from "./terrain.js";

export const STACKS = [
  { x: 115, z: -58, r: 3, top: SEA_Y + 6 },
  { x: 122, z: -60, r: 3, top: SEA_Y + 4.5 },
];
export const ARCH = { x: 119, z: -67, R: 2.5, tube: 1, top: SEA_Y + 5, toward: [108, -72] };
export const RIG_SIGHT = [[99.5, -47.4], [105, -68]];
export const BANDS = ["#ffd166", "#10d8ae"];
export const BAND_STEP = 1.2;
export const SITE = { STACKS, ARCH, RIG_SIGHT };
