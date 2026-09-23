// THE TENSORFLOW DAM's bulk, pure geometry: tensorflow/tensorflow #124410
// fixed a transitive-reduction prune (the owner's read of the dam: a human,
// built thing, not a natural formation). Triton's western outlet glacier
// still runs down the valley's west bank (lib/world/land.js LAND_COLLIDERS,
// land "dam") -- that stays natural ice, an approach wall of glacier tongue
// -- but where it would have curled across the valley floor, a human-made
// concrete dam stands instead: a curved arch-gravity wall, wide at its base
// and tapering to a crest road, Hoover-Dam-sized against a 1.2 m seal.
// Iconic parts, stylised and chunky, never smooth or photoreal:
//   - the wedge: a concave downstream face, base to crest, per segment
//   - piers: chunky buttress blocks at every crest joint
//   - the crest road, with a parapet rail on each edge, and lamps along it
//   - two art-deco intake towers standing upstream, in the lake
//   - a powerhouse block hugging the downstream foot
//   - a pale "bathtub ring" along the rock at the reservoir's edge
//   - spillway chutes recessed into the downstream face (the anomaly lives
//     here: components/world/land/IceDam.jsx animates their glow climbing
//     UP the face instead of falling, the radiation's one crisp joke)
// Positions and static geometry only; IceDam.jsx supplies materials and
// animates the moving water and lamps.

import { BoxGeometry, BufferAttribute, ConeGeometry, ExtrudeGeometry, IcosahedronGeometry, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../../lib/world/land";
import { clamp, smoothstep } from "../../life/util";

const DAM_COLLIDERS = LAND_COLLIDERS.filter((c) => c.land === "dam");

// Crest height (m) at each ridge point, west (Triton's outlet glacier, low)
// to the tongue's rounded tip past the last real collider. The glacier
// approach stays modest (1.5-5 m: a bank, not a landmark); the concrete dam
// itself (from the shared elbow point on) stands 11-13 m, the owner's
// "12-18 m against a 1.2 m seal" -- ~10x the seal, tall enough to dominate
// its corner of the island, and kept off the low end of that range on
// purpose: the dock is only 15-19 m off the crest, so a taller peak here
// just runs off the top of the fixed follow camera instead of reading as
// bigger.
const HEIGHT = [1.5, 2, 2.5, 3.5, 5, 11, 13, 7];
export const RIDGE = [...DAM_COLLIDERS.map((c) => ({ x: c.x, z: c.z, half: c.radius * 0.72 })), { x: 5.6, z: -34.7, half: 1.7 * 0.72 }].map(
  (p, i) => ({ ...p, h: HEIGHT[i] }),
);

// The natural approach: Triton's glacier tongue down the valley's west
// bank, ending at the elbow where the built dam begins.
const ICE_RIDGE = RIDGE.slice(0, 5);
// The concrete dam itself: the elbow, the two crest segments that block the
// valley (river.js DAM.from -> DAM.to runs through here), and the tapered
// tip into the dry granite bench east of it.
export const CREST = RIDGE.slice(4, 8);

// ---- a jagged ice face for the glacier approach: every vertex nudged by
// where it is, so seams stay shut (the same trick as land/Moat.jsx's
// rough(), one seeded hash). Never applied to the concrete: cast, not eroded.
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

// One trapezoidal box per glacier segment, long axis along the segment,
// plus a chunky boulder at every joint so a bend never shows a seam: a
// single static mesh, the same technique the dam used to use for its whole
// length (now only the natural approach).
export function buildIceWall() {
  const parts = [];
  for (let i = 0; i < ICE_RIDGE.length - 1; i++) {
    const a = ICE_RIDGE[i];
    const b = ICE_RIDGE[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.7;
    const h = (a.h + b.h) / 2;
    const lenSegs = Math.max(2, Math.round(len / 2.2));
    const geo = new BoxGeometry(a.half + b.half, h, len, 2, 2, lenSegs).toNonIndexed();
    geo.translate(0, h / 2, 0);
    geo.rotateY(Math.atan2(dx, dz));
    geo.translate((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    parts.push(geo);
  }
  // boulders at every joint except the last: the elbow point becomes the
  // concrete dam's own western pier instead, so the two never overlap.
  for (const p of ICE_RIDGE.slice(0, -1)) {
    const radius = Math.max(p.half, p.h * 0.6 + 0.6) + 0.5;
    const geo = new IcosahedronGeometry(radius, 2);
    geo.translate(p.x, p.h * 0.42, p.z);
    parts.push(geo);
  }
  return rough(mergeGeometries(parts, false), 0.06);
}

// A point on the dam's crest at fraction t (0..1 by length): world (x, z),
// the crest height there, the outward (downstream, south-ish) unit normal,
// and `face` -- the segment's own half-width there, so callers can sit a
// mesh AT the wall's real skin instead of guessing a constant.
export function crestPoint(t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < CREST.length - 1; i++) {
    const a = CREST[i];
    const b = CREST[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    segs.push({ a, b, len, face: (a.half + b.half) / 2 });
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
        face: s.face,
      };
    }
    d -= s.len;
  }
  return { x: CREST[0].x, z: CREST[0].z, h: CREST[0].h, nx: 0, nz: 1, face: CREST[0].half };
}

// ---- the concrete dam: a wedge in cross-section, extruded along each crest
// segment. Shape space: X is the cross-wall axis (chunky flat facets, no
// smooth curve maths -- "stylised and chunky", the owner's words), Y is
// height. Verified against crestPoint's own (nx, nz): after this file's
// rotateY(atan2(dx, dz)) convention, local -X lands on the downstream
// (nx, nz) side, +X upstream -- so the wide, concave face below sits at -X.
// The crest's own two edges, as a fraction of `face`: markedly narrower
// than the base (0.42 * face wide total vs. 1.75 * face at the foot) so the
// batter reads as a curve at a glance, not a flat lean.
export const CREST_DOWN = 0.3;
export const CREST_UP = 0.28;
function wedgeShape(face, h) {
  const s = new Shape();
  s.moveTo(-face * 1.0, 0); // base, downstream (outer, concave) edge
  s.lineTo(-face * 0.9, h * 0.16);
  s.lineTo(-face * 0.76, h * 0.34);
  s.lineTo(-face * 0.58, h * 0.53); // the curve's shoulder: most of the batter happens low, so the taper reads at a glance
  s.lineTo(-face * 0.42, h * 0.7);
  s.lineTo(-face * 0.32, h * 0.86);
  s.lineTo(-face * CREST_DOWN, h); // crest, downstream edge
  s.lineTo(face * CREST_UP, h); // crest, upstream edge
  s.lineTo(face * 0.55, h * 0.5);
  s.lineTo(face * 0.75, 0); // base, upstream (near-vertical) edge
  s.lineTo(-face * 1.0, 0);
  return s;
}
function prism(shape, len, dx, dz, mx, mz) {
  const geo = new ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 }).toNonIndexed();
  geo.translate(0, 0, -len / 2);
  geo.rotateY(Math.atan2(dx, dz));
  geo.translate(mx, 0, mz);
  return geo;
}

// One merged, one-draw-call material needs the same attributes on every
// piece: every non-wedge part gets a flat white vertex colour (an unchanged
// multiplier), so only the wedge below needs to actually paint one.
function tintWhite(geo) {
  const n = geo.attributes.position.count;
  geo.setAttribute("color", new BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return geo;
}

// The wedge's own value curve, baked as vertex colour: dark at the shadowed
// toe where the concave curve tucks under itself, brightest across the
// sunlit bulge, easing back toward the crest -- "bright in the sun with
// strong shading down its curve" (the owner's words), without a second
// material or draw call.
function shadeWedge(geo, h) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = clamp(pos.getY(i) / h, 0, 1);
    const v = 0.4 + 0.68 * smoothstep(0, 0.5, t) - 0.24 * smoothstep(0.78, 1, t);
    arr[i * 3] = v;
    arr[i * 3 + 1] = v;
    arr[i * 3 + 2] = v;
  }
  geo.setAttribute("color", new BufferAttribute(arr, 3));
  return geo;
}

// Art-deco intake tower: a stepped stack of setback boxes and a pyramid
// cap, an iconic silhouette out of a handful of boxes.
function tower(cx, cz, baseY, h, r0) {
  const parts = [];
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const u = i / steps;
    const r = r0 * (1 - u * 0.52);
    const segH = h / steps;
    const box = new BoxGeometry(r * 2, segH, r * 2).toNonIndexed();
    box.translate(cx, baseY + segH * i + segH / 2, cz);
    parts.push(box);
  }
  const cap = new ConeGeometry(r0 * 0.34, h * 0.16, 4).toNonIndexed();
  cap.rotateY(Math.PI / 4);
  cap.translate(cx, baseY + h + (h * 0.16) / 2, cz);
  parts.push(cap);
  return parts;
}

// Two towers, upstream in the lake, close enough to read as part of the
// dam (real intake towers stand right off the face); one powerhouse block
// hugging the downstream foot, roughly under the crest's tallest run.
export const TOWERS = [0.28, 0.72].map((t) => ({ ...crestPoint(t), t }));
const POWERHOUSE_T = 0.48;
// The powerhouse's own anchor, exported so IceDam.jsx can hang a turning
// turbine wheel on its downstream face without redoing this offset maths.
export const POWERHOUSE = (() => {
  const p = crestPoint(POWERHOUSE_T);
  const dist = p.face * 1.0 + 0.8;
  return { x: p.x + p.nx * dist, z: p.z + p.nz * dist, h: p.h, angle: Math.atan2(p.nx, p.nz) };
})();

export function buildConcreteWall() {
  const body = [];
  const road = [];
  const accent = [];
  const lamps = [];
  const bathtub = [];
  const windows = [];

  for (let i = 0; i < CREST.length - 1; i++) {
    const a = CREST[i];
    const b = CREST[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.6;
    const face = (a.half + b.half) / 2;
    const h = (a.h + b.h) / 2;
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const angle = Math.atan2(dx, dz);

    body.push(shadeWedge(prism(wedgeShape(face, h), len, dx, dz, mx, mz), h));

    // the crest road: a flat slab spanning the wedge's own crest width,
    // plus a low parapet rail on each edge -- the seal never climbs up
    // here, but the road reads from the dock below.
    const roadW = face * (CREST_DOWN + CREST_UP) - 0.1;
    road.push(new BoxGeometry(roadW, 0.22, len).rotateY(angle).translate(mx, h + 0.11, mz));
    // low enough that the charcoal road it guards still peeks past it from
    // the dock's own elevated, fairly frontal viewing angle -- a taller
    // rail reads fine up close but hides the road entirely from there.
    const railH = 0.26;
    for (const side of [-1, 1]) {
      const off = side * (roadW / 2 - 0.08);
      const rail = new BoxGeometry(0.16, railH, len);
      rail.translate(off, h + 0.22 + railH / 2, 0);
      rail.rotateY(angle);
      rail.translate(mx, 0, mz);
      body.push(tintWhite(rail.toNonIndexed()));
    }
    // a painted stripe along the downstream parapet's outer face: TensorFlow
    // orange, a bold, funky pop against all that pale concrete.
    const stripe = new BoxGeometry(0.03, railH * 0.5, len);
    stripe.translate(-roadW / 2 - 0.1, h + 0.22 + railH * 0.5, 0);
    stripe.rotateY(angle);
    stripe.translate(mx, 0, mz);
    accent.push(stripe.toNonIndexed());
  }

  // piers: chunky buttress blocks at every crest joint, tall enough to
  // bridge whatever the adjoining wedges don't already cover, and to give
  // the dam a properly man-made, faceted silhouette rather than a smooth
  // ribbon.
  for (const p of CREST) {
    const half = p.half * 1.08 + 0.35;
    const pier = new BoxGeometry(half * 2, p.h, half * 2).toNonIndexed();
    pier.translate(p.x, p.h / 2, p.z);
    body.push(tintWhite(pier));
  }

  // the two intake towers, upstream, standing in the reservoir, their feet
  // below the waterline.
  for (const p of TOWERS) {
    const h = p.h + 3;
    for (const g of tower(p.x - p.nx * (p.face * 0.95), p.z - p.nz * (p.face * 0.95), -1, h, p.face * 0.62)) body.push(tintWhite(g));
    // an art-deco chevron band, TensorFlow orange, near each tower's cap
    const band = new BoxGeometry(p.face * 0.62 * 2 * 0.72, 0.35, p.face * 0.62 * 2 * 0.72 + 0.02).toNonIndexed();
    band.translate(p.x - p.nx * (p.face * 0.95), -1 + h * 0.78, p.z - p.nz * (p.face * 0.95));
    accent.push(band);
  }

  // the powerhouse: a chunky block hugging the downstream foot, well below
  // the crest, a stepped roof and a row of window-glow slits (IceDam.jsx
  // lights them).
  {
    const p = crestPoint(POWERHOUSE_T);
    // hugging the foot, well inside the real "dam" land collider there (the
    // seal never reaches it to clip through): further out reads nicer but
    // stands on ground the seal could actually walk into.
    const dist = p.face * 1.0 + 0.8;
    const cx = p.x + p.nx * dist;
    const cz = p.z + p.nz * dist;
    const angle = Math.atan2(p.nx, p.nz);
    const w = 4.6;
    const d = 2.6;
    const hh = 3.6;
    const box = new BoxGeometry(w, hh, d).rotateY(angle).translate(cx, hh / 2, cz);
    body.push(tintWhite(box.toNonIndexed()));
    const roof = new BoxGeometry(w * 0.86, 0.5, d * 0.86).rotateY(angle).translate(cx, hh + 0.25, cz);
    body.push(tintWhite(roof.toNonIndexed()));
    const stripe = new BoxGeometry(w * 0.9, 0.4, 0.03).rotateY(angle).translate(cx + Math.sin(angle) * (d / 2 + 0.02), hh * 0.62, cz + Math.cos(angle) * (d / 2 + 0.02));
    accent.push(stripe.toNonIndexed());
    // a row of window slits on the downstream face, IceDam.jsx lights them
    for (let i = 0; i < 5; i++) {
      const wx = cx + Math.cos(angle) * (i / 4 - 0.5) * (w * 0.78);
      const wz = cz - Math.sin(angle) * (i / 4 - 0.5) * (w * 0.78);
      windows.push(new BoxGeometry(0.5, 0.7, 0.04).rotateY(angle).translate(wx + Math.sin(angle) * (d / 2 + 0.03), hh * 0.6, wz + Math.cos(angle) * (d / 2 + 0.03)));
    }
  }

  // lamps along the downstream parapet: posts merged into the body, glass
  // heads exported separately for IceDam.jsx's pulsing radiation material.
  for (let i = 0; i < 6; i++) {
    const t = 0.06 + (i / 5) * 0.88;
    const p = crestPoint(t);
    const roadHalf = (p.face * (CREST_DOWN + CREST_UP)) / 2 - 0.1;
    const dist = roadHalf - 0.08;
    // +nx/+nz is downstream (verified in wedgeShape's own comment): lamps
    // sit on the parapet edge that actually faces the dock.
    const px = p.x + p.nx * dist;
    const pz = p.z + p.nz * dist;
    const postH = 1.1;
    const post = new BoxGeometry(0.12, postH, 0.12).toNonIndexed();
    post.translate(px, p.h + 0.22 + 0.5 + postH / 2, pz);
    body.push(tintWhite(post));
    lamps.push(new IcosahedronGeometry(0.18, 1).translate(px, p.h + 0.22 + 0.5 + postH + 0.05, pz));
  }

  // the bathtub ring: a pale band along the rock at the reservoir's edge,
  // upstream of the crest, right at the waterline -- the mineral tide-mark
  // a real reservoir leaves.
  for (let i = 0; i < CREST.length - 1; i++) {
    const a = CREST[i];
    const b = CREST[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.6;
    const face = (a.half + b.half) / 2;
    const dist = face * 0.85;
    const mx = (a.x + b.x) / 2 - (-dz / (Math.hypot(dx, dz) || 1)) * dist;
    const mz = (a.z + b.z) / 2 - (dx / (Math.hypot(dx, dz) || 1)) * dist;
    bathtub.push(new BoxGeometry(0.5, 0.18, len).rotateY(Math.atan2(dx, dz)).translate(mx, 0, mz));
  }

  const clean = (gs) => gs.map((g) => (g.attributes.uv ? (g.deleteAttribute("uv"), g) : g));
  return {
    body: mergeGeometries(clean(body), false),
    road: mergeGeometries(clean(road), false),
    accent: mergeGeometries(clean(accent), false),
    lamps: mergeGeometries(clean(lamps), false),
    bathtub: mergeGeometries(clean(bathtub), false),
    windows: mergeGeometries(clean(windows), false),
  };
}

// ---- the spillway chutes: recessed into the downstream face, three of
// them, the crest's tallest run. THE ANOMALY lives here: IceDam.jsx glows
// them and climbs the water UP the face instead of down -- normal life,
// visibly wrong, the radiation's one crisp joke.
export const SPILLWAY_W = 1.3;
export const SPILLWAYS = [0.18, 0.48, 0.8].map((t) => ({ ...crestPoint(t), t }));

// ---- the base outlets: two openings low on the downstream face, roaring
// normally -- outward and down into the river below, the dam working as
// built. Their glow is the OTHER TensorFlow colour, never the anomaly's.
export const OUTLETS = [0.34, 0.66].map((t) => {
  const p = crestPoint(t);
  return { x: p.x + p.nx * (p.face * 1.02), z: p.z + p.nz * (p.face * 1.02), nx: p.nx, nz: p.nz, h: p.h };
});

// A static foam burst at each outlet's mouth: always there, not animation-
// phase-dependent, so "white water roaring out at the foot" reads in a
// single still frame -- IceDam.jsx's animated beads (Outlets, above) add the
// motion on top of this one merged, one-draw-call mesh.
export function buildSpray() {
  const parts = [];
  for (const o of OUTLETS) {
    for (let i = 0; i < 7; i++) {
      const dist = 0.9 + i * 0.42;
      const jitter = ((i * 0.61) % 1) - 0.5;
      const r = 0.32 + 0.22 * ((i * 0.37) % 1);
      const blob = new IcosahedronGeometry(r, 0);
      blob.translate(
        o.x + o.nx * dist + -o.nz * jitter * dist * 0.5,
        0.15 + 0.22 * ((i * 0.53) % 1),
        o.z + o.nz * dist + o.nx * jitter * dist * 0.5,
      );
      parts.push(blob);
    }
  }
  return mergeGeometries(parts, false);
}
