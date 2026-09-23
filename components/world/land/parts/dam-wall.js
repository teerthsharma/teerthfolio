// THE TENSORFLOW ICE DAM's bulk, pure geometry: a glacier tongue down the
// valley's west bank (lib/world/land.js LAND_COLLIDERS, land "dam"), turning
// east into the crest that blocks the valley (lib/world/river.js DAM), one
// chunky ridge, never a jagged grey wall (the owner's words, first sight).
//
// The crest also carries the story: tensorflow/tensorflow #124410 fixed a
// transitive-reduction prune, four control edges surviving where the unique
// reduction is three. Here that is four real meltwater channels cut into the
// crest's front face -- three run; the fourth (the redundant bypass) stands
// frozen shut, capped with an ice plug. Positions only; components/world/land/
// IceDam.jsx draws and animates them.

import { BoxGeometry, IcosahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../../lib/world/land";

const DAM_COLLIDERS = LAND_COLLIDERS.filter((c) => c.land === "dam");

// Crest height (m) at each ridge point, north (the outlet glacier's bank,
// low) to the tongue's tip (a rounded taper past the last collider, land.js:
// "the tongue's tip stops at x = 5.5"). Kept modest: the crest stands only
// ~10 m from the reading point, so a taller wall than this blows past the
// top of frame instead of reading as a dam.
const HEIGHT = [1.5, 1.9, 2.4, 2.9, 3.4, 4, 3.6, 2.3];
export const RIDGE = [...DAM_COLLIDERS.map((c) => ({ x: c.x, z: c.z, half: c.radius * 0.72 })), { x: 5.6, z: -34.7, half: 1.7 }].map(
  (p, i) => ({ ...p, h: HEIGHT[i] }),
);

// The two crest segments (river.js DAM.from -> DAM.to runs through here):
// where the four channels stand, on the ridge's tallest run.
const CREST = RIDGE.slice(4, 7); // (-12,-38) -> (-5,-34) -> (2,-35)

// ---- a jagged ice face: every vertex nudged by where it is, so seams stay
// shut (the same trick as land/Moat.jsx's rough(), one seeded hash). -------
function hash(x, y, z) {
  const h = Math.sin(x * 12.9898 + y * 63.7264 + z * 37.719) * 43758.5453;
  return h - Math.floor(h);
}
function rough(geo, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + amount * (hash(x, y, z) - 0.5);
    p.setY(i, y * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// One trapezoidal box per ridge segment, long axis along the segment
// (Closure.jsx's EDGES_GEO merges cylinders the same way), plus a chunky
// boulder at every joint so a bend in the ridge never shows a seam: a single
// static wall mesh.
export function buildWall() {
  const parts = [];
  for (let i = 0; i < RIDGE.length - 1; i++) {
    const a = RIDGE[i];
    const b = RIDGE[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.7; // small overlap so corners stay shut
    const h = (a.h + b.h) / 2;
    // non-indexed to match IcosahedronGeometry below: mergeGeometries needs
    // every part either indexed or not, never a mix.
    const geo = new BoxGeometry(a.half + b.half, h, len, 1, 1, 1).toNonIndexed();
    geo.translate(0, h / 2, 0);
    geo.rotateY(Math.atan2(dx, dz));
    geo.translate((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    parts.push(geo);
  }
  for (const p of RIDGE) {
    // detail 2: at this close a range (~10 m) a detail-1 icosahedron's few,
    // large flat facets read as sharp shards, not a rounded ice boulder.
    const geo = new IcosahedronGeometry(Math.min(p.half, p.h * 0.6 + 0.6), 2);
    geo.translate(p.x, p.h * 0.42, p.z);
    parts.push(geo);
  }
  return rough(mergeGeometries(parts, false), 0.06);
}

// A point on the crest's two segments at fraction t (0..1 by length): world
// (x, z), the crest height there, and the outward (front, south-ish) normal.
function crestPoint(t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < CREST.length - 1; i++) {
    const a = CREST[i];
    const b = CREST[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    segs.push({ a, b, len });
    total += len;
  }
  let d = t * total;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (d <= s.len || i === segs.length - 1) {
      const u = s.len ? d / s.len : 0;
      const dx = s.b.x - s.a.x;
      const dz = s.b.z - s.a.z;
      const len = Math.hypot(dx, dz) || 1;
      return {
        x: s.a.x + dx * u,
        z: s.a.z + dz * u,
        h: s.a.h + (s.b.h - s.a.h) * u,
        nx: -dz / len,
        nz: dx / len,
      };
    }
    d -= s.len;
  }
  return { x: CREST[0].x, z: CREST[0].z, h: CREST[0].h, nx: 0, nz: 1 };
}

// The four channels, west to east: index 0 is the redundant bypass (c4 ->
// c1), frozen; 1..3 are the real chain's three edges, and run.
export const CHANNELS = [0.1, 0.4, 0.65, 0.9].map((t, i) => ({ ...crestPoint(t), flowing: i !== 0 }));
