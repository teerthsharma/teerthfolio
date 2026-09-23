// TRITON, on the ground (lib/world/terrain.js shapes the mountain and its two
// glaciers; this is what stands ON that ice): the ice cave the river is born
// from, the ice shelf the "schedule" story (triton-lang/kernels #22) grows
// out of, and a few crevasse cracks on the glacier's face. Pure builders, no
// React: components/world/land/Triton.jsx turns these into meshes and runs
// the anomaly's animation.
//
// Both set pieces sit at the district's own hot spots (lib/world/places.js,
// UPSTREAM_DISTRICTS.triton.hot): the cave at the river's source, the shelf
// at the icefall above the reading point.

import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { heightAt } from "../../../../lib/world/terrain";

// Deterministic per-vertex jitter, so cylinders and boxes read as glacier ice
// instead of CAD primitives (the same trick Moat.jsx's floes use).
function rough(geo, amount, seed) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + z * 78.233 + y * 3.7 + seed) * 43758.5453;
    const k = 1 + amount * (h - Math.floor(h) - 0.5);
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---- the ice cave: the river's source (RIVER.points[0] is [-4, -72, 8]) ---

export const CAVE = { x: -4, z: -73 };
const CAVE_SPAN = 5; // half-span: the pillars stand just past the river's own 8 m width
const CAVE_H = 5.4;

// One mesh: two pillars and the lintel bridging them, all one material.
export function buildCaveArch() {
  const pillar = (side) => {
    const g = new CylinderGeometry(0.95, 1.35, CAVE_H, 7, 1);
    rough(g, 0.12, side * 4.1);
    g.translate(side * CAVE_SPAN, CAVE_H / 2, 0);
    return g;
  };
  const lintel = new BoxGeometry(CAVE_SPAN * 2 + 1.6, 1.7, 2.1, 3, 1, 1);
  rough(lintel, 0.08, 9.2);
  lintel.translate(0, CAVE_H - 0.15, 0);
  return mergeGeometries([pillar(-1), pillar(1), lintel]);
}

// The shadowed throat, recessed north of the pillars: a squashed sphere. Its
// own geometry (no merge — a second material, the cave's dark interior).
export function buildCaveThroat() {
  const g = new SphereGeometry(1, 14, 10);
  g.scale(3.1, 2.3, 1);
  g.translate(0, 2.5, -0.85);
  return g;
}

// ---- the schedule shelf: the icefall above the reading point --------------

export const SHELF = { x: 14, z: -72 };
export const SHELF_TOP = 0.35; // Schedule.jsx's own local origin sits here

// A low dais (the pyramid's footing) and a short ridge behind it climbing
// toward the real icefall (lib/world/terrain.js) a couple of metres north,
// so the sculpture reads as grown from the ice instead of parked on snow.
export function buildScheduleShelf() {
  const dais = new BoxGeometry(4.9, SHELF_TOP, 2.1, 3, 1, 2);
  rough(dais, 0.05, 2.3);
  dais.translate(0, SHELF_TOP / 2, -0.15);
  const ridge = new BoxGeometry(4.6, 2.4, 0.9, 3, 1, 1);
  rough(ridge, 0.09, 6.6);
  ridge.translate(0, SHELF_TOP + 1.2, -1.55);
  return mergeGeometries([dais, ridge]);
}

// ---- crevasse cracks: a few, on the glacier's face -------------------------

// [cx, cz, angleDeg, lengthM]: short jagged cracks on the icefall (east) and
// the cave-side outlet glacier (west), where the terrain is already relief
// (npm run check never walks there — every one sits inside a LAND_COLLIDERS
// "triton" circle).
const CREVASSE_SPOTS = [
  [11, -75, 25, 3.4],
  [18, -76, -20, 2.8],
  [-8, -78, 60, 3.2],
  [-2, -80, -35, 2.6],
];

const UNIT_X = new Vector3(1, 0, 0);

// A thin slab from a to b (3D points), so it lies flush along the true
// slope between them instead of a flat Y-rotated box guessing at it.
function segmentBox(a, b, width, thickness) {
  const dir = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = dir.length() || 0.01;
  dir.normalize();
  const quat = new Quaternion().setFromUnitVectors(UNIT_X, dir);
  const g = new BoxGeometry(len, thickness, width).translate(len / 2, 0, 0);
  g.applyMatrix4(new Matrix4().compose(new Vector3(a.x, a.y, a.z), quat, new Vector3(1, 1, 1)));
  return g;
}

// A jagged line of shared waypoints (each sampling the real ice height), so
// consecutive segments join instead of leaving gaps at a bend.
function crevasseGeo(cx, cz, angleDeg, length, seed) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const segs = 5;
  const way = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs - 0.5;
    const wobble = Math.sin(seed + i * 1.7) * 0.4;
    const x = cx + dx * t * length - dz * wobble;
    const z = cz + dz * t * length + dx * wobble;
    way.push({ x, y: heightAt(x, z) + 0.06, z });
  }
  const parts = [];
  for (let i = 0; i < segs; i++) parts.push(segmentBox(way[i], way[i + 1], 0.2, 0.14));
  return mergeGeometries(parts);
}

export function buildCrevasses() {
  return mergeGeometries(CREVASSE_SPOTS.map(([cx, cz, a, len], i) => crevasseGeo(cx, cz, a, len, i * 3.7)));
}

// ---- the anomaly: snow lifts off the glacier and falls upward -------------

// One vent at each hot spot (lib/world/places.js: "the ice cave the river
// leaves by; the icefall above the viewpoint"), a couple more along each
// glacier's face. Each vent's y is the real ice surface there (heightAt).
const VENT_XZ = [
  [-4, -74], // the cave's own roof
  [-9, -77],
  [14, -76], // the icefall over the schedule shelf
  [19, -77],
];
export const SNOW_VENTS = VENT_XZ.map(([x, z]) => ({ x, z, y: heightAt(x, z) }));
export const FLAKES_PER_VENT = 6;
