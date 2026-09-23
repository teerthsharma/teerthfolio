// Pure geometry builders for the island: no React, no per-frame state. Every
// export is called once from Island.jsx (useMemo) and merged into the small
// number of meshes the draw-call budget allows. Colour comes in as vertex
// attributes where a mesh mixes hues (icebergs, signpost tips); a
// mesh that is one flat colour just gets one material and no colour buffer.

import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS, PATHS, SIGNPOSTS } from "../../../lib/world/land";
import { dockPoint, ISLAND_RADIUS, PLACE_BY_ID, PLACES, SPAWN } from "../../../lib/world/places";
import { RIVER, riverAt, waterGap } from "../../../lib/world/river";
import { groundAt, heightAt, SEA_Y } from "../../../lib/world/terrain";
import { mulberry32 } from "../life/spawn";
import { C } from "../palette";

const SEED = 20260923;
const R = ISLAND_RADIUS;

// Every sample point along every path (lib/world/land.js PATHS), the same
// curve buildRibbon draws.
export function pathSamples() {
  const out = [];
  for (const wp of PATHS) {
    const curve = new CatmullRomCurve3(wp.map(([x, z]) => new Vector3(x, 0, z)));
    for (const p of curve.getPoints(63)) out.push({ x: p.x, z: p.z });
  }
  return out;
}
let PATH_SAMPLES = null;

// Decor stays on open snow: clear of every place (+4 m), every dock (+3 m),
// spawn (+6 m), the letters, every landform's bulk (+2 m), the water (+2 m)
// and the paths (+2.2 m). `pad` (a decor piece's own radius) widens them all.
function offLimits(x, z, pad = 0) {
  for (const place of PLACES) {
    if (Math.hypot(x - place.x, z - place.z) < place.radius + 4 + pad) return true;
    const dock = dockPoint(place);
    if (Math.hypot(x - dock.x, z - dock.z) < 3 + pad) return true;
  }
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6 + pad) return true;
  if (x > -9 - pad && x < 9 + pad && z > 1.5 - pad && z < 4.5 + pad) return true;
  for (const c of LAND_COLLIDERS) if (Math.hypot(x - c.x, z - c.z) < c.radius + 2 + pad) return true;
  if (waterGap(x, z) < 2 + pad) return true;
  PATH_SAMPLES ??= pathSamples();
  for (const p of PATH_SAMPLES) if (Math.hypot(x - p.x, z - p.z) < 2.2 + pad) return true;
  return false;
}

// Seeded points in an annulus [rMin, rMax], clear of offLimits() (widened
// by `pad`) and of each other by `gap`. Used for decor that should scatter
// on open snow.
function annulusPoints(count, seed, rMin, rMax, gap, avoid = [], pad = 0) {
  const rand = mulberry32(seed);
  const taken = avoid.slice();
  const points = [];
  for (let i = 0; i < count; i++) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 400 && !ok; tries++) {
      const r = rMin + rand() * (rMax - rMin);
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      ok = !offLimits(x, z, pad) && taken.every((t) => Math.hypot(x - t.x, z - t.z) >= gap);
    }
    if (!ok) continue; // no room left: one piece fewer, never one in the water or on a path
    points.push({ x, z });
    taken.push({ x, z });
  }
  return points;
}

// mergeGeometries requires every input to carry the same attribute set. The
// hand-built strips (path ribbons) have no uv; drop it from any
// three.js primitive before it merges with one of those.
function bare(geometry) {
  geometry.deleteAttribute("uv");
  return geometry;
}

function paint(geometry, hex) {
  const c = hex instanceof Color ? hex : new Color(hex);
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

// ---- rock batch: icebergs + dark rim rocks, one flat vertex-coloured mesh

function buildIceberg(cx, cz, radius, height) {
  const body = new IcosahedronGeometry(radius, 0).toNonIndexed();
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > radius * 0.25) pos.setY(i, height);
  }
  pos.needsUpdate = true;
  body.computeVertexNormals();
  body.translate(cx, 0, cz);
  paint(body, C.ice);

  const cap = new IcosahedronGeometry(radius * 0.4, 0).toNonIndexed();
  cap.scale(1, 0.45, 1);
  cap.translate(cx, height * 0.78, cz);
  paint(cap, C.snow);

  return bare(mergeGeometries([body, cap], false));
}

function buildRockBatch() {
  // Out in the south and west sea, past the coast's headlands (the north
  // coast is Triton's and the Google range's, rising out of the water).
  const icebergs = [
    buildIceberg(-108, 26, 5, 7),
    buildIceberg(66, 88, 7, 10),
    buildIceberg(-50, 104, 6, 8),
  ];

  const rand = mulberry32(SEED + 3);
  const rockPts = annulusPoints(8, SEED + 3, 70, 79, 6, [], 1.6);
  const rocks = rockPts.map(({ x, z }) => {
    const radius = 0.8 + rand() * 0.8;
    const geo = new IcosahedronGeometry(radius, 0).toNonIndexed();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -radius * 0.3, z);
    return paint(bare(geo), C.charcoal);
  });

  return mergeGeometries([...icebergs, ...rocks], false);
}

// ---- sea: floes (instanced) and the shallows gradient ring ----------------

function buildFloeTemplate() {
  const geo = new CylinderGeometry(1, 1, 1, 7, 1).toNonIndexed();
  const pos = geo.attributes.position;
  const c = geo.attributes.position.count;
  const arr = new Float32Array(c * 3);
  const snow = new Color(C.snow);
  const ice = new Color(C.ice);
  for (let i = 0; i < c; i++) {
    const col = pos.getY(i) > 0.3 ? snow : ice;
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geo;
}

function buildFloes() {
  const rand = mulberry32(SEED + 4);
  const points = annulusPoints(14, SEED + 4, R + 10, R + 32, 3).filter(({ x, z }) => heightAt(x, z) < SEA_Y - 1.5);
  return points.map(({ x, z }) => ({
    x,
    z,
    radius: 0.8 + rand() * 1.8,
    phase: rand() * Math.PI * 2,
  }));
}

// Where the land meets the sea, round the island: for each of SEA_SEGS
// angles, the first radius past the rim where the ground drops under the
// sea, or null where there is none (the mountains in the north run on out
// of view). `river` marks the river's mouth.
const SEA_SEGS = 240;
let WATERLINE = null;
function waterline() {
  if (WATERLINE) return WATERLINE;
  const o = {};
  WATERLINE = [];
  for (let i = 0; i <= SEA_SEGS; i++) {
    const a = (i / SEA_SEGS) * Math.PI * 2;
    let found = null;
    for (let r = R; r < R + 36 && !found; r += 0.25) {
      groundAt(Math.cos(a) * r, Math.sin(a) * r, o);
      if (o.h < SEA_Y) found = { r, river: o.gap < 0 };
    }
    WATERLINE.push(found);
  }
  return WATERLINE;
}

// A flat band on the sea from `from` to `to` metres past the waterline, at
// height y, coloured by colorAt(t) (t 0 inner, 1 outer) when given.
function coastBand(from, to, y, colorAt, skipRiver) {
  const line = waterline();
  const positions = [];
  const colors = [];
  const at = (i, d) => {
    const a = (i / SEA_SEGS) * Math.PI * 2;
    return [Math.cos(a) * (line[i].r + d), y, Math.sin(a) * (line[i].r + d)];
  };
  for (let i = 0; i < SEA_SEGS; i++) {
    const w0 = line[i];
    const w1 = line[i + 1];
    if (!w0 || !w1 || (skipRiver && (w0.river || w1.river))) continue;
    const quad = [[at(i, from), 0], [at(i + 1, from), 0], [at(i, to), 1], [at(i + 1, to), 0 + 1], [at(i, to), 1], [at(i + 1, from), 0]];
    for (const [p, t] of quad) {
      positions.push(...p);
      if (colorAt) colors.push(...colorAt(t));
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  if (colorAt) geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildShallows() {
  const shallow = new Color(C.shallows);
  const sea = new Color(C.sea);
  const c = new Color();
  return coastBand(-2, 7, SEA_Y + 0.01, (t) => c.copy(shallow).lerp(sea, t).toArray(), false);
}

function buildFoam() {
  return coastBand(-0.2, 1, SEA_Y + 0.02, null, true);
}

// ---- ice boulders: two InstancedMeshes, ice and deepIce --------------------

function buildBoulders() {
  const rand = mulberry32(SEED + 5);
  const points = annulusPoints(24, SEED + 5, 10, 78, 5, [], 1.4);
  const ice = [];
  const deepIce = [];
  points.forEach(({ x, z }, i) => {
    const radius = 0.6 + rand() * 0.8;
    const item = { x, z, radius, rotY: rand() * Math.PI * 2 };
    // a third go deepIce, spread out rather than clustered at the end
    if (i % 3 === 2) deepIce.push(item);
    else ice.push(item);
  });
  return { ice, deepIce };
}

// ---- paths and dock pads, one flat C.path mesh -----------------------------
// The waypoints are lib/world/land.js PATHS (npm run check holds them dry,
// or on a bridge, and clear of every place and landform).

// Lay a flat piece on the land: each vertex `lift` above the ground, or
// above the plain's level where it crosses water (under a bridge deck).
function drape(geometry, lift = 0.045) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const h = heightAt(pos.getX(i), pos.getZ(i));
    pos.setY(i, (h > -0.25 ? h : 0) + lift);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function buildRibbon(waypoints, width = 2.2, y = 0.012) {
  const curve = new CatmullRomCurve3(waypoints.map(([x, z]) => new Vector3(x, y, z)));
  const divisions = 63;
  const points = curve.getPoints(divisions);
  // Curve has getTangent(t), not a batch form; sample it at the same t
  // values getPoints(divisions) used.
  const tangents = points.map((_, i) => curve.getTangent(i / divisions));
  const half = width / 2;
  const positions = [];
  for (let i = 0; i < points.length - 1; i++) {
    const t0 = tangents[i];
    const t1 = tangents[i + 1];
    const n0 = new Vector3(-t0.z, 0, t0.x).normalize().multiplyScalar(half);
    const n1 = new Vector3(-t1.z, 0, t1.x).normalize().multiplyScalar(half);
    const a = points[i].clone().add(n0);
    const b = points[i].clone().sub(n0);
    const c = points[i + 1].clone().add(n1);
    const d = points[i + 1].clone().sub(n1);
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    positions.push(c.x, c.y, c.z, d.x, d.y, d.z, b.x, b.y, b.z);
  }
  const strip = new BufferGeometry();
  strip.setAttribute("position", new Float32BufferAttribute(positions, 3));
  strip.computeVertexNormals();

  const cap = (p) => bare(new CircleGeometry(half, 12).toNonIndexed()).rotateX(-Math.PI / 2).translate(p.x, y, p.z);
  return drape(mergeGeometries([strip, cap(points[0]), cap(points[points.length - 1])], false));
}

function buildPathsAndDocks() {
  const ribbons = PATHS.map((wp) => buildRibbon(wp));
  const docks = PLACES.map((p) => {
    const d = dockPoint(p);
    const geo = bare(new CircleGeometry(1.4, 16).toNonIndexed());
    geo.rotateX(-Math.PI / 2);
    geo.translate(d.x, 0, d.z);
    return drape(geo, 0.05);
  });
  return mergeGeometries([...ribbons, ...docks], false);
}

// ---- signposts + bridges ----------------------------------------------------

// An arm pointing from (x, z) toward a place, tipped with its area's
// radiation colour.
function signArm(x, z, y, placeId) {
  const place = PLACE_BY_ID[placeId];
  const dx = place.x - x;
  const dz = place.z - z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const angle = Math.atan2(-uz, ux);

  const arm = new BoxGeometry(1.0, 0.28, 0.12).toNonIndexed();
  arm.rotateY(angle);
  arm.translate(x + ux * 0.6, y, z + uz * 0.6);

  const tip = new BoxGeometry(0.28, 0.28, 0.28).toNonIndexed();
  tip.translate(x + ux * 1.24, y, z + uz * 1.24);
  paint(tip, place.radiation ?? place.color);

  return { arm, tip };
}

function buildSignpost(x, z, placeIds) {
  const post = new BoxGeometry(0.2, 2.2, 0.2).toNonIndexed();
  post.translate(x, 1.1, z);
  const wood = [post];
  const tips = [];
  placeIds.forEach((id, i) => {
    const { arm, tip } = signArm(x, z, 1.9 - i * 0.34, id);
    wood.push(arm);
    tips.push(tip);
  });
  return { wood, tips };
}

// Each post (lib/world/land.js SIGNPOSTS) points down every path that forks
// there, at the first reading point or building that way.
function buildSignposts() {
  const posts = SIGNPOSTS.map((s) => buildSignpost(s.x, s.z, s.to));
  return {
    wood: posts.flatMap((p) => p.wood),
    tips: posts.flatMap((p) => p.tips),
  };
}

// A plank deck across the water at each of RIVER.bridges, square to the
// flow, bank to bank plus 1.2 m of landing each side, with charcoal kerbs
// along both edges and a pier under each end.
function buildBridges() {
  const decks = [];
  const dark = [];
  const here = {};
  for (const b of RIVER.bridges) {
    riverAt(b.x, b.z, here);
    const flow = Math.hypot(here.flowX, here.flowZ) || 1;
    // local X runs across the water, local Z along the flow
    const angle = Math.atan2(here.flowX / flow, here.flowZ / flow);
    const span = here.half * 2 + 2.4;
    const piece = (w, h, d, x, y, z) => {
      const g = new BoxGeometry(w, h, d).toNonIndexed();
      g.translate(x, y, z);
      g.rotateY(angle);
      g.translate(b.x, 0, b.z);
      return g;
    };
    // The deck's top sits at y = 0.02, flush with the banks the seal walks
    // on (TERRAIN CONTRACT): higher, and the planks buried the seal's body.
    decks.push(piece(span, 0.3, b.width, 0, -0.13, 0));
    for (const side of [-1, 1]) {
      dark.push(paint(piece(span, 0.34, 0.22, 0, 0.19, side * (b.width / 2 - 0.11)), C.charcoal));
      dark.push(paint(piece(0.5, 1.2, b.width + 0.3, side * (span / 2 - 0.5), -0.73, 0), C.charcoal));
    }
  }
  return { decks, dark };
}

// ---- assembled result -------------------------------------------------------

// The water ring, built separately so Sea.jsx owns it.
export function buildSea() {
  return {
    shallowsGeo: buildShallows(),
    foamGeo: buildFoam(),
    floeTemplateGeo: buildFloeTemplate(),
    floes: buildFloes(),
  };
}

export function buildIsland() {
  const signposts = buildSignposts();
  const bridges = buildBridges();
  const boulders = buildBoulders();

  return {
    rockBatchGeo: buildRockBatch(),
    pathsDocksGeo: buildPathsAndDocks(),
    woodBatchGeo: mergeGeometries([...signposts.wood, ...bridges.decks], false),
    accentBatchGeo: mergeGeometries([...signposts.tips, ...bridges.dark], false),
    boulderTemplateGeo: new IcosahedronGeometry(1, 0),
    boulders,
  };
}
