// The pink dunes (DISTRICT-PLAN E13): a barchan field in the Shape Garden, 28 x 20 m, its north edge at z 48. Pure layout:
// components/world/land/Dunes.jsx draws the crescents as one InstancedMesh and the lagoons as one decal.
import { mulberry32 } from "../../components/world/life/spawn.js";
import { heightAt } from "./terrain.js";

export const CENTRE = { x: -72, z: 38, a: 14, b: 10 };
export const LAGOONS = [{ x: -79, z: 33, r: 2.4 }, { x: -64, z: 36, r: 1.6 }, { x: -74, z: 44, r: 2 }];
const WIND = [0.8, 0.6];
const SIDE = [-WIND[1], WIND[0]];
const SPAN = 1.9;
const STATIONS = 11;
const RHO = { outer: 1.25, crest: 1, inner: 0.7 };
const CREST = "#fff1f9";
const LEE = "#f08fc9";

const point = (phi, rho, y) => [
  rho * (-Math.cos(phi) * WIND[0] + Math.sin(phi) * SIDE[0]),
  y,
  rho * (-Math.cos(phi) * WIND[1] + Math.sin(phi) * SIDE[1]),
];

const crest = (k) => {
  const phi = -SPAN + (2 * SPAN * k) / (STATIONS - 1);
  return { o: point(phi, RHO.outer, 0), c: point(phi, RHO.crest, Math.sqrt(1 - (phi / SPAN) ** 2)), i: point(phi, RHO.inner, 0) };
};

export const CRESCENT = [];
for (let k = 0; k < STATIONS - 1; k++) {
  const a = crest(k);
  const b = crest(k + 1);
  CRESCENT.push({ p: [a.o, a.c, b.c], c: CREST }, { p: [a.o, b.c, b.o], c: CREST });
  CRESCENT.push({ p: [a.c, a.i, b.i], c: LEE }, { p: [a.c, b.i, b.c], c: LEE });
}

const rand = mulberry32(72038);
export const RIDGES = [];
for (let tries = 0; RIDGES.length < 26 && tries < 20000; tries++) {
  const r = Math.sqrt(rand());
  const th = 2 * Math.PI * rand();
  const x = CENTRE.x + CENTRE.a * 0.95 * r * Math.cos(th);
  const z = CENTRE.z + CENTRE.b * 0.95 * r * Math.sin(th);
  if (z > 46) continue;
  if (RIDGES.some((q) => Math.hypot(q.x - x, q.z - z) < 3)) continue;
  if (LAGOONS.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + 2.5)) continue;
  RIDGES.push({ x, z, size: 1.8 + 1 * rand(), h: 0.2 + 0.1 * rand() });
}

const SEG = 12;
export const GROUND_VERTS = [];
for (const l of LAGOONS) {
  const at = (x, z) => [x, heightAt(x, z) + 0.06, z];
  for (let k = 0; k < SEG; k++) {
    const a0 = (2 * Math.PI * k) / SEG;
    const a1 = (2 * Math.PI * (k + 1)) / SEG;
    GROUND_VERTS.push(at(l.x, l.z), at(l.x + l.r * Math.cos(a0), l.z + l.r * Math.sin(a0)), at(l.x + l.r * Math.cos(a1), l.z + l.r * Math.sin(a1)));
  }
}
