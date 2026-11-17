// THE GRAVEYARD (components/world/land/Bergs.jsx): tabular bergs in the open sea past the rims. Four are grounded on the
// shoal north of the west headland, two are in transit. Pure data, metres (x east, z south); no colliders, nothing walks here.

const DEG = Math.PI / 180;

// x, z: centre; w, d: footprint; free: freeboard above the water; turn: yaw; tilt: lean about the long axis
export const BERGS = [
  { x: -134, z: -8, w: 16, d: 10, free: 3.2, turn: 0.2 },
  { x: -129, z: -27, w: 11, d: 8, free: 2.6, turn: -0.3 },
  { x: -131, z: -46, w: 9, d: 6, free: 2.4, turn: 0.5 },
  { x: -125, z: -2, w: 7, d: 5, free: 2, turn: 0.1, tilt: -12 * DEG },
  { x: 132, z: 6, w: 14, d: 9, free: 3, turn: 0.4 },
  { x: 118, z: 62, w: 10, d: 7, free: 2.6, turn: -0.2 },
];

export const GROUNDED = 4;
export const PINNACLE = { x: -140, z: -20, r: 3, top: 5.5 };
export const BITS_BASE = 14;

const rnd = mulberry32(88031);
export const BITS = Array.from({ length: 18 }, (_, i) => {
  const b = BERGS[i % GROUNDED];
  const out = Math.atan2(b.z, b.x) + (2 * rnd() - 1) * 75 * DEG;
  const R = Math.hypot(b.w, b.d) / 2 + 0.8 + 3.2 * rnd();
  return { x: b.x + R * Math.cos(out), z: b.z + R * Math.sin(out), r: 0.8 + 1.4 * rnd(), h: 0.2 + 0.15 * rnd(), yaw: Math.PI * rnd() };
});

export const COLLIDERS = [];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
