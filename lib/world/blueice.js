// The blue ice of the West Ice (plan 2.3): snow snakes, cryoconite holes, a meteorite and a route flag on the blue ellipse
// of regions.js. Pure layout; components/world/land/BlueIce.jsx draws it. mulberry32 is copied from life/spawn.js.
import { regionWeights } from "./regions.js";
import { heightAt } from "./terrain.js";

export const WIND = [0.8, 0.6];
const ACROSS = [-0.6, 0.8];
const BLUE = { x: -88, z: -34, a: 19, b: 11.5 };
export const METEORITE = { x: -83.5, z: -30.2, cup: 0.6 };
export const FLAG = { x: -82.9, z: -29.6, pole: 1.6 };
export const COLLIDERS = [];

export const decal = (x, z, lift = 0.04) => heightAt(x, z) + lift;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = { blue: 0, bend: 0, sast: 0, delta: 0, lake: 0, lakeCore: 0, guano: 0, rock: 0 };
function inCore(rnd) {
  for (;;) {
    const u = (rnd() * 2 - 1) * BLUE.a;
    const v = (rnd() * 2 - 1) * BLUE.b;
    const x = BLUE.x + u * WIND[0] + v * ACROSS[0];
    const z = BLUE.z + u * WIND[1] + v * ACROSS[1];
    if (regionWeights(x, z, W).blue > 0.5) return [x, z];
  }
}

const snakeRnd = mulberry32(88034);
export const SNAKES = Array.from({ length: 26 }, () => {
  const [x, z] = inCore(snakeRnd);
  const turn = Math.atan2(WIND[1], WIND[0]) + (snakeRnd() - 0.5) * 0.14;
  return { x, z, dir: [Math.cos(turn), Math.sin(turn)], len: 5 + 6 * snakeRnd(), wide: 0.35 + 0.45 * snakeRnd() };
});

const holeRnd = mulberry32(88035);
export const HOLES = [];
while (HOLES.length < 24) {
  const [x, z] = inCore(holeRnd);
  const r = 0.07 + 0.05 * holeRnd();
  if (Math.hypot(x - METEORITE.x, z - METEORITE.z) > 1.4 && Math.hypot(x - FLAG.x, z - FLAG.z) > 1.2) HOLES.push({ x, z, r });
}

const snakePts = SNAKES.flatMap(({ x, z, dir, len }) => [-0.5, 0, 0.5].map((t) => [x + dir[0] * len * t, z + dir[1] * len * t]));
export const GROUND_VERTS = [...snakePts, ...HOLES.map(({ x, z }) => [x, z])].map(([x, z]) => [x, decal(x, z), z]);
