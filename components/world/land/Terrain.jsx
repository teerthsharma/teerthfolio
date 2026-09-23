"use client";

// The land itself: lib/world/terrain.js's height field as one mesh, one draw
// call, on a 1 m grid. Two kinds of cell:
//   - the plain (snow, banks, the beds under the water): shared vertices,
//     smooth normals, colour blended per vertex (wind streaks, wet banks, a
//     bed that darkens with depth);
//   - relief (mountains, glaciers, the keep, the coast bank and cliffs):
//     each triangle its own three vertices, flat normal and ONE colour chosen
//     from its own slope (snow where snow can lie, dark rock / Triton's blue
//     ice / MujoRush's granite where it cannot), so every facet is crisp.
//     Relief vertices are jittered so the facets never show the grid, and
//     each quad is split along its ridge.
// Cells wholly under the sea (which hides them) are dropped. Click or tap
// anywhere on it and the seal slides there.

import { useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from "three";
import { ISLAND_RADIUS } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { fbm, groundAt, KEEP_TOP } from "../../../lib/world/terrain";
import { C } from "../palette";

const STEP = 1;
const X0 = -108;
const X1 = 108;
const Z0 = -152;
const Z1 = 108;
const CULL_Y = -1; // a cell whose four corners are all deeper than this, out at sea (under the opaque sea), is not drawn

// Directions from the land up to the camera, over every view it ever takes
// (the azimuth never turns: follow at 42 degrees, overview at 52, a 35
// degree field of view either side, the overview's sway): a facet facing
// away from all of them is never seen, so it is not built.
const VIEWS = [];
for (const el of [0.35, 0.75, 1.15]) for (const az of [-0.75, 0, 0.75]) VIEWS.push([Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]);
const seen = (nx, ny, nz) => VIEWS.some(([x, y, z]) => nx * x + ny * y + nz * z > -0.05);

const col = (hex) => new Color(hex);
const K = {
  snow: col(C.snow),
  snowCool: col("#e9eef7"), // wind-packed streaks on the plain
  rock: col("#474853"), // the Google range and the headlands: the one dark
  rockLit: col("#62636f"),
  granite: col("#b9aea8"), // Mount MujoRush
  graniteDark: col("#978a84"),
  iceFace: col("#9fcfeb"), // Triton's steep ice
  iceDeep: col("#62abd9"),
  glacier: col("#d3e9f6"),
  wet: col("#bccad8"),
  oldIce: col("#d3e3f0"), // the river's old dry bed
  bed: col("#7aa0b3"),
  bedDeep: col("#2b5a72"),
  cliff: col(C.ice),
  cliffLow: col(C.deepIce),
};

const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const rnd = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

// One colour for a relief facet, from its slope (ny: its normal's y), its
// height and what the ground is there (the corners' groundAt, averaged).
function faceColor(out, ny, h, g, seed) {
  const steep = s01(0.8, 0.62, ny); // 0 below ~37 degrees, 1 past ~52
  if (g.gap < 0 && h < -0.25 && !g.coast) {
    out.copy(K.bed).lerp(K.bedDeep, s01(-0.9, -2.6, h));
  } else if (g.keep > 0.5) {
    // the mesa: snow on its flat top, bare rock all the way down its sides
    out.copy(steep < 0.5 && h > KEEP_TOP - 0.9 ? K.snow : K.rock).lerp(K.rockLit, rnd(seed, 5.3) * 0.5);
  } else if (g.mount > 0.2) {
    const wobble = rnd(seed, 1.7);
    if (g.stuff === 1) {
      // Triton: blue ice on its faces, the glaciers' pale ice between them
      out.copy(steep > 0.45 ? K.iceFace : K.snow).lerp(K.iceDeep, steep > 0.45 ? s01(0.55, 0.2, ny) : 0);
      if (g.glacier > 0.5) out.copy(steep > 0.7 ? K.iceFace : K.glacier);
    } else if (g.stuff === 2) {
      out.copy(steep > 0.5 ? K.granite : K.snow).lerp(K.graniteDark, steep > 0.5 ? 0.6 * wobble : 0);
    } else {
      // the Google range: snow wherever it can hold, dark rock ribs where not
      out.copy(ny < 0.52 ? K.rockLit : K.snow).lerp(K.rock, ny < 0.52 ? 0.4 + 0.6 * wobble : 0);
    }
  } else if (g.coast) {
    if (g.cliff > 0.05) out.copy(K.cliff).lerp(K.cliffLow, s01(0, -1.2, h));
    else if (g.rock > 0.3 && steep > 0.5) out.copy(K.rock).lerp(K.rockLit, rnd(seed, 3.1));
    else out.copy(K.snow);
  } else {
    out.copy(K.snow);
  }
  return out;
}

// Smooth colour for a plain vertex.
function plainColor(out, x, z, h, g) {
  if (g.gap < 0 && !g.coast) return out.copy(K.wet).lerp(K.bed, s01(-0.3, -0.8, h)).lerp(K.bedDeep, s01(-0.8, -2.6, h));
  const streak = s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5));
  out.copy(K.snow).lerp(K.snowCool, 0.65 * streak).lerp(K.oldIce, 0.6 * g.oldBed);
  if (g.gap < 1.8) out.lerp(K.wet, s01(1.8, 0, g.gap) * 0.85);
  return out;
}

const INFO_KEYS = ["gap", "mount", "stuff", "glacier", "coast", "cliff", "rock", "keep", "oldBed"];

function buildTerrain() {
  const nx = Math.round((X1 - X0) / STEP) + 1;
  const nz = Math.round((Z1 - Z0) / STEP) + 1;
  const n = nx * nz;
  const pos = new Float32Array(n * 3);
  const info = new Float32Array(n * INFO_KEYS.length);
  const relief = new Uint8Array(n);
  const o = {};
  const put = (i) => INFO_KEYS.forEach((k, j) => (info[i * INFO_KEYS.length + j] = o[k]));
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix;
      let x = X0 + ix * STEP;
      let z = Z0 + iz * STEP;
      groundAt(x, z, o);
      const rough = o.mount > 0.02 || o.keep || (o.coast && o.h > CULL_Y);
      if (rough && ix > 0 && iz > 0 && ix < nx - 1 && iz < nz - 1) {
        x += (rnd(ix, iz) - 0.5) * 0.62 * STEP;
        z += (rnd(iz + 0.5, ix) - 0.5) * 0.62 * STEP;
        groundAt(x, z, o);
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = o.h;
      pos[i * 3 + 2] = z;
      relief[i] = rough ? 1 : 0;
      put(i);
    }
  }
  const y = (i) => pos[i * 3 + 1];

  // smooth normals on the shared grid (the plain keeps these)
  const all = [];
  const cells = [];
  for (let iz = nz - 2; iz >= 0; iz--) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      if (y(a) < CULL_Y && y(b) < CULL_Y && y(c) < CULL_Y && y(d) < CULL_Y && Math.hypot(pos[a * 3], pos[a * 3 + 2]) > ISLAND_RADIUS + 3) continue;
      // split along the diagonal whose ends are closer in height: edges
      // follow ridges and contours instead of cutting across them
      const tris = Math.abs(y(a) - y(d)) < Math.abs(y(b) - y(c)) ? [a, c, d, a, d, b] : [a, c, b, b, c, d];
      all.push(...tris);
      cells.push(tris, relief[a] | relief[b] | relief[c] | relief[d]);
    }
  }
  const grid = new BufferGeometry();
  grid.setAttribute("position", new Float32BufferAttribute(pos, 3));
  grid.setIndex(all);
  grid.computeVertexNormals();
  const gridNormal = grid.attributes.normal.array;
  grid.dispose();

  // the shared vertices first, then one vertex per relief triangle corner
  const P = Array.from(pos);
  const N = Array.from(gridNormal);
  const COL = new Array(n * 3);
  const c = new Color();
  const g = {};
  const at = (i) => INFO_KEYS.forEach((k, j) => (g[k] = info[i * INFO_KEYS.length + j]));
  for (let i = 0; i < n; i++) {
    at(i);
    plainColor(c, pos[i * 3], pos[i * 3 + 2], pos[i * 3 + 1], g);
    COL[i * 3] = c.r;
    COL[i * 3 + 1] = c.g;
    COL[i * 3 + 2] = c.b;
  }
  const index = [];
  const avg = {};
  for (let k = 0; k < cells.length; k += 2) {
    const tris = cells[k];
    if (!cells[k + 1]) {
      index.push(...tris);
      continue;
    }
    for (let t = 0; t < 6; t += 3) {
      const [i0, i1, i2] = [tris[t], tris[t + 1], tris[t + 2]];
      // the facet's normal
      const ux = pos[i1 * 3] - pos[i0 * 3];
      const uy = y(i1) - y(i0);
      const uz = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
      const vx = pos[i2 * 3] - pos[i0 * 3];
      const vy = y(i2) - y(i0);
      const vz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
      let fx = uy * vz - uz * vy;
      let fy = uz * vx - ux * vz;
      let fz = ux * vy - uy * vx;
      const fl = Math.hypot(fx, fy, fz) || 1;
      fx /= fl;
      fy /= fl;
      fz /= fl;
      if (!seen(fx, fy, fz)) continue;
      // what the ground is there: the corners averaged (stuff: the most)
      for (const key of INFO_KEYS) avg[key] = 0;
      for (const i of [i0, i1, i2]) {
        at(i);
        for (const key of INFO_KEYS) avg[key] += g[key] / 3;
      }
      at(i0);
      avg.stuff = g.stuff;
      const sy = (gridNormal[i0 * 3 + 1] + gridNormal[i1 * 3 + 1] + gridNormal[i2 * 3 + 1]) / 3;
      faceColor(c, 0.5 * (fy + sy), (y(i0) + y(i1) + y(i2)) / 3, avg, i0 + t);
      for (const i of [i0, i1, i2]) {
        index.push(P.length / 3);
        P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        N.push(fx, fy, fz);
        COL.push(c.r, c.g, c.b);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(P, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(N, 3));
  geo.setAttribute("color", new Float32BufferAttribute(COL, 3));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

// Click or tap on the land: the seal slides there.
function walkHere(event) {
  if (event.delta > 8) return;
  live.target = { x: event.point.x, z: event.point.z };
  live.pendingOpen = null;
}

export default function Terrain() {
  const geometry = useMemo(buildTerrain, []);
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  return <mesh geometry={geometry} material={material} receiveShadow onClick={walkHere} />;
}
