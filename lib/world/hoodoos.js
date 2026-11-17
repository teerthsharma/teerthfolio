// The hoodoo garden (DISTRICT-PLAN E15): nine candy-banded rock spires in the Shape Garden's north-west corner, 2 to 5 m tall.
// The four tallest are solid (COLLIDERS). Pure layout: components/world/land/Hoodoos.jsx draws them as one merged mesh.
export const GARDEN = { x: -46, z: 31, r: 6 };
export const BANDS = ["#ff9ec7", "#ffd166", "#c9a8ff"];
export const CAP = "#fff1f9";
export const BAND_STEP = 0.6;

export const SPIRES = [
  { x: -47, z: 30, h: 5, r: 1 },
  { x: -44, z: 33, h: 4.6, r: 1 },
  { x: -49, z: 34, h: 4.2, r: 1 },
  { x: -45, z: 28, h: 3.8, r: 1 },
  { x: -50, z: 29, h: 2.4, r: 0.8 },
  { x: -42, z: 30, h: 3, r: 0.8 },
  { x: -45, z: 36, h: 2, r: 0.8 },
  { x: -51, z: 33, h: 2.8, r: 0.8 },
  { x: -42, z: 27, h: 3.3, r: 0.8 },
];

export const COLLIDERS = SPIRES.slice(0, 4).map((s) => ({ x: s.x, z: s.z, radius: 1.2, land: "hoodoo" }));
