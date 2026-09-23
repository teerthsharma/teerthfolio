// Pure geometry builders for the island: no React, no per-frame state. Every
// export is called once from Island.jsx (useMemo) and merged into the small
// number of meshes the draw-call budget allows. Colour comes in as vertex
// attributes where a mesh mixes hues (cliff, icebergs, signpost tips); a
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
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { dockPoint, ISLAND_RADIUS, PLACE_BY_ID, PLACES, SPAWN } from "../../../lib/world/places";
import { mulberry32 } from "../life/spawn";
import { C } from "../palette";

const SEED = 20260923;
const R = ISLAND_RADIUS;

// Same off-limits rule life/spawn.js's forbidden() enforces for props: clear
// of every place (+4 m), every dock (+3 m), spawn (+6 m) and the letters.
function offLimits(x, z) {
  for (const place of PLACES) {
    if (Math.hypot(x - place.x, z - place.z) < place.radius + 4) return true;
    const dock = dockPoint(place);
    if (Math.hypot(x - dock.x, z - dock.z) < 3) return true;
  }
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6) return true;
  if (x > -9 && x < 9 && z > 1.5 && z < 4.5) return true;
  return false;
}

// Seeded points in an annulus [rMin, rMax], clear of offLimits() and of each
// other by `gap`. Used for decor that should scatter on open snow.
function annulusPoints(count, seed, rMin, rMax, gap, avoid = []) {
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
      ok = !offLimits(x, z) && taken.every((t) => Math.hypot(x - t.x, z - t.z) >= gap);
    }
    points.push({ x, z });
    taken.push({ x, z });
  }
  return points;
}

// mergeGeometries requires every input to carry the same attribute set. The
// hand-built strips (cliff bands, path ribbons) have no uv; drop it from any
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

// ---- ground: snow drifts + the snow lip torus (smooth, C.snow) -----------

function buildSnowSmooth() {
  const rand = mulberry32(SEED + 1);
  const drifts = [];
  // 5 in the rim band, 3 in the open gaps between neighbourhoods.
  for (const [n, rMin, rMax] of [[5, 34, 41], [3, 15, 30]]) {
    for (const { x, z } of annulusPoints(n, SEED + 1 + rMin, rMin, rMax, 7, drifts)) {
      const radius = 3 + rand() * 3;
      const geo = new SphereGeometry(radius, 14, 10).toNonIndexed();
      geo.scale(1, 0.1, 1);
      geo.translate(x, -0.2, z);
      drifts.push(geo);
    }
  }
  const lip = new TorusGeometry(R - 0.1, 0.25, 10, 96).toNonIndexed();
  lip.rotateX(-Math.PI / 2);
  lip.scale(1, 0.5, 1);
  lip.translate(0, 0.02, 0);
  return mergeGeometries([...drifts, lip], false);
}

// ---- edge: faceted cliff, two merged colour bands -------------------------

// One flat-shaded band between two rings (radii arrays, length segs+1), one
// solid colour. Outward-facing winding: (a, c, b) then (c, d, b).
function ringBand(radiiTop, yTop, radiiBottom, yBottom, segs, hex) {
  const positions = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const a = new Vector3(Math.cos(a0) * radiiTop[i], yTop, Math.sin(a0) * radiiTop[i]);
    const c = new Vector3(Math.cos(a1) * radiiTop[i + 1], yTop, Math.sin(a1) * radiiTop[i + 1]);
    const b = new Vector3(Math.cos(a0) * radiiBottom[i], yBottom, Math.sin(a0) * radiiBottom[i]);
    const d = new Vector3(Math.cos(a1) * radiiBottom[i + 1], yBottom, Math.sin(a1) * radiiBottom[i + 1]);
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    positions.push(c.x, c.y, c.z, d.x, d.y, d.z, b.x, b.y, b.z);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return paint(geo, hex);
}

function buildCliff() {
  const rand = mulberry32(SEED + 2);
  const segs = 72;
  const bottomExtra = 1.2;
  const bottomY = -1.6;
  const midT = 0.4; // upper 40% is ice, the rest deepIce
  const top = [];
  const mid = [];
  const bottom = [];
  for (let i = 0; i <= segs; i++) {
    const jitter = i === segs ? top[0] - R : (rand() * 2 - 1) * 0.5; // close the loop
    top.push(R + jitter);
    bottom.push(R + bottomExtra + jitter);
    mid.push(top[i] + (bottom[i] - top[i]) * midT);
  }
  const midY = bottomY * midT;
  return [
    ringBand(top, 0, mid, midY, segs, C.ice),
    ringBand(mid, midY, bottom, bottomY, segs, C.deepIce),
  ];
}

// ---- rock batch: cliff + icebergs + dark rim rocks, one flat vertex-coloured mesh

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
  const icebergs = [
    buildIceberg(-48, -72, 7, 10),
    buildIceberg(62, -66, 9, 12),
    buildIceberg(-82, -12, 5, 7),
  ];

  const rand = mulberry32(SEED + 3);
  const rockPts = annulusPoints(5, SEED + 3, 38, 42, 3.5);
  const rocks = rockPts.map(({ x, z }) => {
    const radius = 0.8 + rand() * 0.8;
    const geo = new IcosahedronGeometry(radius, 0).toNonIndexed();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -radius * 0.3, z);
    return paint(bare(geo), C.charcoal);
  });

  return mergeGeometries([...buildCliff(), ...icebergs, ...rocks], false);
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
  const points = annulusPoints(10, SEED + 4, R + 6, R + 30, 3);
  return points.map(({ x, z }) => ({
    x,
    z,
    radius: 0.8 + rand() * 1.8,
    phase: rand() * Math.PI * 2,
  }));
}

function buildShallows() {
  const inner = R + 1.8;
  const outer = R + 6;
  const geo = new RingGeometry(inner, outer, 72, 1).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.59, 0);
  const shallow = new Color(C.shallows);
  const sea = new Color(C.sea);
  const pos = geo.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const tmp = new Vector3();
  for (let i = 0; i < n; i++) {
    tmp.fromBufferAttribute(pos, i);
    const t = Math.min(1, Math.max(0, (Math.hypot(tmp.x, tmp.z) - inner) / (outer - inner)));
    arr[i * 3] = shallow.r + (sea.r - shallow.r) * t;
    arr[i * 3 + 1] = shallow.g + (sea.g - shallow.g) * t;
    arr[i * 3 + 2] = shallow.b + (sea.b - shallow.b) * t;
  }
  geo.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geo;
}

function buildFoam() {
  const geo = new RingGeometry(R + 1.0, R + 1.8, 72, 1).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.58, 0);
  return geo;
}

// ---- ice boulders: two InstancedMeshes, ice and deepIce --------------------

function buildBoulders() {
  const rand = mulberry32(SEED + 5);
  const points = annulusPoints(14, SEED + 5, 8, 40, 3);
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

// Every waypoint list below passed verification/W-path-check.mjs (every
// sample stays outside place.radius + 0.5 and off the letters). Where the
// spec's own waypoints cut a corner into a place, a waypoint was added
// (never a place moved) to swing the Catmull-Rom curve wide of it.
const CENTRE_PATH = [[0, 7.2], [-10, 7], [-10.5, 0.5], [0, -2.2]];
const PATHS = [
  CENTRE_PATH,
  [[-5, -2.5], [-9, -11], [-17, -17]], // systems west -> kernel
  [[5, -2.5], [9, -12], [16, -19], [12.28, -21.85], [11, -28], [6, -31.2]], // systems east -> aether -> upstream
  [[-6, 8], [-14, 6.5], [-22, 3], [-26, 0.8], [-30, -3], [-31, -8], [-33, -13.4]], // physics -> field -> emfield
  [[-22, 3], [-27, 11], [-27.85, 13.8], [-30, 15.4]], // physics branch -> nerve
  [[6, 8], [14, 6.5], [21, 3.5], [24, 2], [31, 0], [37, -2.4]], // proof -> qpu -> sigmoid
  [[31, 0], [30, -9], [31, -15.4]], // proof branch -> separatrix
  [[21, 3.5], [28, 11], [32, 13.8]], // proof branch -> caustic
  [[-3, 12], [-10, 20], [-16, 23], [-10, 29], [-10.8, 31], [-8, 34.4]], // shape west -> archive -> tangle
  [[3, 12], [10, 20], [16, 23], [10, 29], [12, 31], [8, 34.5]], // shape east -> workshop -> monodromy
];

// Every sample point along every path, for the clearance check.
export function pathSamples() {
  const out = [];
  for (const wp of PATHS) {
    const curve = new CatmullRomCurve3(wp.map(([x, z]) => new Vector3(x, 0, z)));
    for (const p of curve.getPoints(63)) out.push({ x: p.x, z: p.z });
  }
  return out;
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
  return mergeGeometries([strip, cap(points[0]), cap(points[points.length - 1])], false);
}

function buildPathsAndDocks() {
  const ribbons = PATHS.map((wp) => buildRibbon(wp));
  const docks = PLACES.map((p) => {
    const d = dockPoint(p);
    const geo = bare(new CircleGeometry(1.4, 16).toNonIndexed());
    geo.rotateX(-Math.PI / 2);
    geo.translate(d.x, 0.013, d.z);
    return geo;
  });
  return mergeGeometries([...ribbons, ...docks], false);
}

// ---- signposts + harbour jetty ---------------------------------------------

// An arm pointing from (x, z) toward a place, tipped with that place's accent.
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
  paint(tip, place.color);

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

// Each post names the first place reached down every path that forks there.
function buildSignposts() {
  const posts = [
    buildSignpost(-6.5, 9.5, ["field", "kernel"]), // physics yard / systems west
    buildSignpost(6.5, 9.5, ["qpu", "aether"]), // proof quay / systems east
    buildSignpost(0, -3.5, ["kernel", "aether"]), // systems harbour, both shores
    buildSignpost(0, 13.5, ["archive", "workshop"]), // shape garden, both sides
  ];
  return {
    wood: posts.flatMap((p) => p.wood),
    tips: posts.flatMap((p) => p.tips),
  };
}

function buildJetty() {
  const base = new Vector3(13, 0, -40);
  const tip = new Vector3(15.5, 0, -46);
  const dir = tip.clone().sub(base).normalize();
  const angle = Math.atan2(-dir.z, dir.x);
  const mid = base.clone().add(tip).multiplyScalar(0.5);
  const length = base.distanceTo(tip);

  const deck = new BoxGeometry(length, 0.25, 1.4).toNonIndexed();
  deck.rotateY(angle);
  deck.translate(mid.x, 0.025, mid.z);

  const piles = [];
  const bollards = [];
  for (let i = 0; i < 4; i++) {
    const t = 0.15 + (i / 3) * 0.7;
    const p = base.clone().lerp(tip, t);
    const pile = new BoxGeometry(0.3, 1.3, 0.3).toNonIndexed();
    pile.translate(p.x, -0.55, p.z);
    piles.push(paint(pile, C.charcoal));
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + (i / 2) * 0.55;
    const p = base.clone().lerp(tip, t);
    const bollard = new CylinderGeometry(0.18, 0.18, 0.45, 8).toNonIndexed();
    bollard.translate(p.x, 0.15 + 0.225, p.z);
    bollards.push(paint(bollard, C.charcoal));
  }
  return { deck, dark: [...piles, ...bollards] };
}

// ---- assembled result -------------------------------------------------------

export function buildIsland() {
  const signposts = buildSignposts();
  const jetty = buildJetty();
  const boulders = buildBoulders();
  const floeTemplate = buildFloeTemplate();

  return {
    snowSmoothGeo: buildSnowSmooth(),
    rockBatchGeo: buildRockBatch(),
    shallowsGeo: buildShallows(),
    foamGeo: buildFoam(),
    pathsDocksGeo: buildPathsAndDocks(),
    woodBatchGeo: mergeGeometries([...signposts.wood, jetty.deck], false),
    accentBatchGeo: mergeGeometries([...signposts.tips, ...jetty.dark], false),
    floeTemplateGeo: floeTemplate,
    floes: buildFloes(),
    boulderTemplateGeo: new IcosahedronGeometry(1, 0),
    boulders,
  };
}
