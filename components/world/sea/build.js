// Pure geometry for the island's fresh water (the river, the lake behind the
// ice dam, the NVIDIA moat), its one radiation anomaly, and the whale. No
// React, no per-frame state; Sea.jsx and sea/*.jsx build these once.

import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RIVER, WATERS, riverAt, waterGap } from "../../../lib/world/river";
import { coastRadius, heightAt, SEA_Y, WATER_Y } from "../../../lib/world/terrain";

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---- the water surface --------------------------------------------------------

// The fresh water's surface height at (x, z): WATER_Y, easing down over the
// last few metres of the river's course onto the sea (the rapids at the
// mouth), where it ends.
export function surfaceY(x, z) {
  const past = Math.hypot(x, z) - coastRadius(Math.atan2(z, x));
  return WATER_Y + (SEA_Y + 0.01 - WATER_Y) * smooth(-9, 0.5, past);
}

// One flat sheet over every basin the terrain cuts for the water, on the
// terrain's own 1 m lattice and split along the same diagonals, so its
// per-vertex depth interpolates exactly as the ground under it does: the
// foam line (depth ~0.16 m) hugs the bank the terrain actually draws.
// Colour by depth: glacial turquoise over the shelves, deep blue-teal in the
// channel. aDepth feeds the foam in the shader.
export function buildWaterSurface() {
  const shallow = new Color("#74d8d4");
  const mid = new Color("#2aa9c2");
  const deep = new Color("#12769a");
  const c = new Color();
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const line of WATERS) {
    for (const [x, z, w = RIVER.width] of line.points) {
      x0 = Math.min(x0, Math.floor(x - w));
      x1 = Math.max(x1, Math.ceil(x + w));
      z0 = Math.min(z0, Math.floor(z - w));
      z1 = Math.max(z1, Math.ceil(z + w));
    }
  }
  const nx = x1 - x0 + 1;
  const nz = z1 - z0 + 1;
  const vert = new Int32Array(nx * nz).fill(-1);
  const pos = [];
  const col = [];
  const depth = [];
  const heights = new Float32Array(nx * nz);
  const near = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = x0 + ix;
      const z = z0 + iz;
      const k = iz * nx + ix;
      if (waterGap(x, z) > 2.2 || Math.hypot(x, z) > coastRadius(Math.atan2(z, x)) + 1.5) continue;
      near[k] = 1;
      heights[k] = heightAt(x, z);
    }
  }
  const vertex = (ix, iz) => {
    const k = iz * nx + ix;
    if (vert[k] >= 0) return vert[k];
    const x = x0 + ix;
    const z = z0 + iz;
    const y = surfaceY(x, z);
    const d = y - heights[k];
    c.copy(shallow).lerp(mid, smooth(0.15, 0.9, d)).lerp(deep, smooth(0.9, 2.1, d));
    vert[k] = pos.length / 3;
    pos.push(x, y, z);
    col.push(c.r, c.g, c.b);
    depth.push(d);
    return vert[k];
  };
  const index = [];
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const cc = a + nx;
      const d = cc + 1;
      if (!(near[a] && near[b] && near[cc] && near[d])) continue;
      const lowest = Math.min(heights[a], heights[b], heights[cc], heights[d]);
      if (lowest > surfaceY(x0 + ix + 0.5, z0 + iz + 0.5) + 0.02) continue; // all bank: the ground hides it
      const [va, vb, vc, vd] = [vertex(ix, iz), vertex(ix + 1, iz), vertex(ix, iz + 1), vertex(ix + 1, iz + 1)];
      // the terrain's diagonal rule: split along the pair closer in height
      if (Math.abs(heights[a] - heights[d]) < Math.abs(heights[b] - heights[cc])) index.push(va, vc, vd, va, vd, vb);
      else index.push(va, vc, vb, vb, vc, vd);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  geo.setAttribute("aDepth", new Float32BufferAttribute(depth, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

// The current's streaks are born on the water, anywhere along its course:
// segments weighted by length, a lateral offset inside the banks.
const SEGMENTS = [];
let SEG_TOTAL = 0;
for (const line of WATERS) {
  const w = line.width ?? RIVER.width;
  for (let i = 0; i < line.points.length - 1; i++) {
    const [ax, az, aw = w] = line.points[i];
    const [bx, bz, bw = w] = line.points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    SEG_TOTAL += len;
    SEGMENTS.push({ ax, az, bx, bz, aw, bw, len, upTo: SEG_TOTAL });
  }
}
const HERE = {};
// A point on the water where a streak can start: into out.x / out.z.
export function streakSpawn(out, rand = Math.random) {
  for (let tries = 0; tries < 8; tries++) {
    const pick = rand() * SEG_TOTAL;
    const s = SEGMENTS.find((g) => g.upTo >= pick) ?? SEGMENTS[SEGMENTS.length - 1];
    const t = rand();
    const len = s.len || 1;
    const half = (s.aw + (s.bw - s.aw) * t) / 2;
    const f = (rand() * 2 - 1) * 0.72;
    out.x = s.ax + (s.bx - s.ax) * t + (-(s.bz - s.az) / len) * half * f;
    out.z = s.az + (s.bz - s.az) * t + ((s.bx - s.ax) / len) * half * f;
    if (riverAt(out.x, out.z, HERE).depth > 0.2 && Math.hypot(out.x, out.z) < coastRadius(Math.atan2(out.z, out.x)) - 1) return out;
  }
  return out;
}

// ---- THE ANOMALY: the river loops the loop ----------------------------------------
//
// Meltwater from Triton's glacier carries its Cherenkov blue down the river.
// Where the lake spills east through the col, part of the current peels off
// the surface, runs UPHILL into the air, loops the loop over itself and
// plunges back in downstream: water doing what water never does. It flows
// east with the spill; the ribbon's inner face is the water's surface.

export const LOOP = {
  x: 24.2, // where the ribbon peels off the surface (it rejoins 2 PI c downstream)
  z: -42,
  radius: 3.3, // the loop's height is twice this
  c: 0.72, // metres of advance per radian: the loop's lean
  shift: 3.8, // lateral shift from entry (north) to exit (south), so it never crosses itself
  width: 2.5,
  thick: 0.34,
  color: "#1ec8f0", // Triton's Cherenkov blue: the water's radiation, carried down from the glacier
  lead: 2.2, // m of ribbon lying on the surface before it lifts and after it lands
};

// The loop's centre line at parameter u (0..1 over lead-in, loop, lead-out):
// a trochoid, x = c theta + R sin theta, y = R (1 - cos theta), so it lifts
// off the surface and lands on it tangentially.
export function loopPoint(u, out) {
  const { x, z, radius: R, c, shift, lead } = LOOP;
  const loopLen = 2 * Math.PI;
  const total = lead / (c + R) + loopLen + lead / (c + R); // theta-equivalent span
  let th = u * total - lead / (c + R);
  let y = 0;
  let px;
  if (th < 0) {
    px = x + th * (c + R);
  } else if (th > loopLen) {
    px = x + c * loopLen + (th - loopLen) * (c + R);
  } else {
    px = x + c * th + R * Math.sin(th);
    y = R * (1 - Math.cos(th));
  }
  th = Math.min(loopLen, Math.max(0, th));
  out.set(px, WATER_Y + 0.04 + y, z - shift / 2 + shift * smooth(0.35, loopLen - 0.35, th));
  return out;
}

// The ribbon: a flat band of water with thickness, its inner (upper, at the
// ends) face the water's surface. aStreak: x = metres along, y = 0..1 across,
// z = 1 on the flowing face. Top face turquoise-cyan, underside deeper.
export function buildLoopRibbon(samples = 120) {
  const { width, thick } = LOOP;
  const P = [];
  const lengths = [0];
  const p = new Vector3();
  for (let i = 0; i <= samples; i++) {
    P.push(loopPoint(i / samples, new Vector3()));
    if (i) lengths.push(lengths[i - 1] + P[i].distanceTo(P[i - 1]));
  }
  const side = new Vector3(0, 0, 1);
  const frames = P.map((pt, i) => {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(samples, i + 1)];
    const T = b.clone().sub(a).normalize();
    const N = new Vector3().crossVectors(side, T).normalize(); // the water surface's "up": into the loop
    const B = new Vector3().crossVectors(T, N).normalize();
    const u = i / samples;
    const ends = Math.min(u, 1 - u);
    const w = width * (0.5 + 0.5 * smooth(0.02, 0.2, ends));
    return { N, B, w };
  });
  const pos = [];
  const nor = [];
  const col = [];
  const st = [];
  const top = new Color("#8cf0fa");
  const face = new Color("#3fc8e2");
  const under = new Color("#1690b8");
  // one band of quads between two edge offsets (in the N, B frame)
  const band = (e0, e1, normalOf, color, flowing) => {
    for (let i = 0; i < samples; i++) {
      const quad = [
        [i, e0],
        [i + 1, e0],
        [i + 1, e1],
        [i, e0],
        [i + 1, e1],
        [i, e1],
      ];
      for (const [j, e] of quad) {
        const f = frames[j];
        p.copy(P[j]).addScaledVector(f.B, e[0] * f.w * 0.5).addScaledVector(f.N, e[1] * thick * 0.5);
        pos.push(p.x, p.y, p.z);
        const n = normalOf(f);
        nor.push(n.x, n.y, n.z);
        col.push(color.r, color.g, color.b);
        st.push(lengths[j], (e[0] + 1) / 2, flowing);
      }
    }
  };
  const negN = new Vector3();
  const negB = new Vector3();
  band([1, 1], [-1, 1], (f) => f.N, top, 1); // the flowing face
  band([-1, -1], [1, -1], (f) => negN.copy(f.N).negate(), under, 0);
  band([-1, 1], [-1, -1], (f) => negB.copy(f.B).negate(), face, 0);
  band([1, -1], [1, 1], (f) => f.B, face, 0);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  geo.setAttribute("aStreak", new Float32BufferAttribute(st, 3));
  geo.computeBoundingSphere();
  return { geometry: geo, length: lengths[samples] };
}

// ---- the whale -----------------------------------------------------------------------

// A humpback, 9 m nose to fluke, local +z its head, low-poly and flat
// shaded: charcoal back, white belly, long white flippers. The flukes are
// their own piece (hinged at the tail stock, local origin) so they can lift
// for the dive; their underside is white, the humpback's signature.
function paintBy(geometry, pick) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const out = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const ny = (nor.getY(i) + nor.getY(i + 1) + nor.getY(i + 2)) / 3;
    c.set(pick(cy, ny));
    for (let k = 0; k < 3; k++) out.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(out, 3));
  return g;
}

const BACK = "#34363f";
const BELLY = "#eef2f6";

export function buildWhale() {
  const profile = [
    [0.02, -4.1],
    [0.34, -3.8],
    [0.62, -3.0],
    [0.98, -1.7],
    [1.18, -0.3],
    [1.2, 0.9],
    [1.1, 2.0],
    [0.88, 3.0],
    [0.52, 3.8],
    [0.02, 4.15],
  ].map(([r, y]) => new Vector2(r, y));
  const body = new LatheGeometry(profile, 9);
  body.rotateX(Math.PI / 2); // lathe axis y -> z: the head (+y) looks down +z
  body.scale(1, 0.84, 1);
  const hull = paintBy(body, (y) => (y > -0.28 ? BACK : BELLY));

  const hump = new ConeGeometry(0.3, 0.5, 4);
  hump.rotateX(-0.5);
  hump.translate(0, 1.0, -1.9);
  const fins = [-1, 1].map((s) => {
    const fin = new BoxGeometry(2.8, 0.12, 0.6);
    fin.translate(s * 1.4, 0, 0);
    fin.rotateZ(s * -0.42);
    fin.rotateY(s * 0.55);
    fin.translate(s * 0.8, -0.5, 1.7);
    return paintBy(fin, () => BELLY);
  });
  const whale = mergeGeometries([hull, paintBy(hump, () => BACK), ...fins], false);

  // the flukes: two swept lobes with a notch, flat, 3.8 m tip to tip
  const shape = new Shape();
  const lobe = [
    [0, 0],
    [0.45, 0.3],
    [1.3, 0.5],
    [1.95, 0.95],
    [1.35, 1.1],
    [0.6, 1.05],
    [0.12, 1.3],
  ];
  shape.moveTo(0, 0);
  for (const [x, y] of lobe) shape.lineTo(x, y);
  shape.lineTo(0, 1.12);
  for (const [x, y] of lobe.slice().reverse()) shape.lineTo(-x, y);
  const fluke = new ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  fluke.translate(0, 0, -0.08);
  fluke.rotateX(-Math.PI / 2); // shape y -> world -z: the lobes trail behind the tail stock
  const flukes = paintBy(fluke, (y, ny) => (ny < -0.2 ? BELLY : BACK));
  return { whale, flukes, tail: -3.95 };
}
