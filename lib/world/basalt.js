// The basalt pavement (E3, the Giant's Causeway): three low patches of hexagonal prisms by faraday, under the Simulation Range.
// Walkable, no collider. Each prism's top stands h metres above heightAt, rising from 0.10 at the south edge to 0.28 at the north.

export const PATCHES = [
  { x: -62, z: -21.5 },
  { x: -55, z: -44 },
  { x: -48, z: -38 },
];
export const R = 0.45; // prism circumradius, m
const PITCH_X = 0.9;
const PITCH_Z = 0.78;
const HALF_X = 4.5;
const HALF_Z = 1.5;
const TOP_LOW = 0.1;
const TOP_HIGH = 0.28;

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function patch({ x, z }, index) {
  const out = [];
  for (let row = -1; row <= 1; row++) {
    const cz = z + row * PITCH_Z;
    const shift = Math.abs(row) % 2 ? PITCH_X / 2 : 0;
    for (let col = -6; col <= 6; col++) {
      const cx = x + col * PITCH_X + shift;
      if (Math.abs(cx - x) > HALF_X) continue;
      const north = (z + HALF_Z - cz) / (2 * HALF_Z);
      const jitter = 0.02 * (2 * hash(col + index * 31, row) - 1);
      const h = Math.min(TOP_HIGH, Math.max(TOP_LOW, TOP_LOW + (TOP_HIGH - TOP_LOW) * north + jitter));
      out.push({ x: cx, z: cz, h });
    }
  }
  return out;
}

const per = PATCHES.map(patch);
export const PRISMS = Array.from({ length: Math.max(...per.map((p) => p.length)) }, (_, k) => per.map((p) => p[k]))
  .flat()
  .filter(Boolean)
  .map(({ x, z, h }) => ({ x, z, h }));
