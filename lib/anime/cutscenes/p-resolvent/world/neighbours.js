// The neighbours of the lab island in the rig frame: the site's Highway with its roundabout and crowd, the signpost, the packed-snow trail
// (lib/world/land.js and places.js, read-only), the Tangle and Aether-Lang annexes, the XLA geyser mound and Mount MujoRush (buildStone).
import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute } from "three";
import { buildStone } from "../../../../../components/world/land/parts/mujorush-build.js";
import { GEYSER, HIGHWAY, PATHS, SIGNPOSTS } from "../../../../../lib/world/land.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { DOCK } from "../clock.js";
import { hash } from "../live/toon.js";
import { annexOf, labDecor, lift, tint } from "./labdecor.js";

const rig = ([x, z]) => [x - DOCK[0], z - DOCK[2]];
const soup = () => ({ p: [], c: [] });
const tri = (s, a, b, c, col) => {
  for (const v of [a, b, c]) {
    s.p.push(v[0], v[1], v[2]);
    s.c.push(col.r, col.g, col.b);
  }
};
const geoOf = (s) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(s.p, 3));
  g.setAttribute("color", new Float32BufferAttribute(s.c, 3));
  g.computeVertexNormals();
  return g;
};

function strip(s, pts, w, y, hex) {
  const col = new Color(hex);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const nx = (-dz / L) * (w / 2), nz = (dx / L) * (w / 2);
    const a0 = [ax + nx, y, az + nz], a1 = [ax - nx, y, az - nz], b0 = [bx + nx, y, bz + nz], b1 = [bx - nx, y, bz - nz];
    tri(s, a0, a1, b1, col);
    tri(s, a0, b1, b0, col);
  }
}

function dashes(s, pts, off, w, y, hex, on = 1.2, gap = 1.2) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const ux = dx / L, uz = dz / L, nx = -uz * off, nz = ux * off;
    for (let t = 0; t < L; t += on + gap) {
      const e = Math.min(L, t + on);
      strip(s, [[ax + ux * t + nx, az + uz * t + nz], [ax + ux * e + nx, az + uz * e + nz]], w, y, hex);
    }
  }
}

function disc(s, cx, cz, r0, r1, y, hex, n = 48) {
  const col = new Color(hex);
  const p = (r, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * 2 * Math.PI, a1 = ((k + 1) / n) * 2 * Math.PI;
    tri(s, p(r0, a0), p(r1, a0), p(r1, a1), col);
    tri(s, p(r0, a0), p(r1, a1), p(r0, a1), col);
  }
}

function along(pts, u) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = u * cum[cum.length - 1];
  let i = 1;
  while (i < pts.length - 1 && cum[i] < d) i++;
  const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
}

function spline(pts, step = 1) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const DOCKP = dockPoint(PLACE_BY_ID["p-resolvent"]);
const TRAIL = PATHS.find((p) => p.some(([x, z]) => Math.abs(x - DOCKP.x) < 0.05 && Math.abs(z - DOCKP.z) < 0.05));
const POST = SIGNPOSTS.find((p) => p.to.includes("p-resolvent"));
const ROUND = HIGHWAY.roundabout;
const [RX, RZ] = rig([ROUND.x, ROUND.z]);
const [GX, GZ] = rig([GEYSER.x, GEYSER.z]);
const [PX, PZ] = rig([POST.x, POST.z]);
const CROWD = [];
for (let i = 0; i < 36; i++) {
  const a = 2 * Math.PI * hash(i, 1), r = 4.2 * Math.sqrt(hash(i, 2));
  CROWD.push([RX + r * Math.cos(a), RZ + r * Math.sin(a), 0.3 + 0.15 * hash(i, 3)]);
}

const annexAt = (place) => {
  const [x, z, w, h] = annexOf(place);
  const [ox, oz] = rig([place.x, place.z]);
  return [ox + x, oz + z, w, h, 0, 0.5];
};

export const NEIGHBOUR_CASTERS = [
  [PX, PZ, 0.12, 2.6, 0, 0.35],
  [RX, RZ, 8.4, 0.45, 0, 0.35],
  [GX, GZ, 10.4, 4.9, 0, 0.5],
  annexAt(PLACE_BY_ID["p-tangle"]),
  annexAt(PLACE_BY_ID["p-aether-lang"]),
];

function decor(place) {
  const d = labDecor(place);
  const [ox, oz] = rig([place.x, place.z]);
  return [d.lit, d.metal, lift(d.glow, 1.12)].map((g) => g.translate(ox, 0, oz));
}

let STONE = null;
export function neighbourStone() {
  if (STONE) return STONE;
  const g = buildStone();
  const stone = g.stone.translate(-DOCK[0], 0, -DOCK[2]);
  const inlay = g.inlay.translate(-DOCK[0], 0, -DOCK[2]);
  const c = new Color("#e08a2e"), n = inlay.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  inlay.setAttribute("color", new Float32BufferAttribute(col, 3));
  STONE = { stone, inlay };
  return STONE;
}

export function neighbourGeos() {
  const s = soup(), out = [];
  for (const leg of HIGHWAY.legs) {
    const pts = leg.map(rig);
    strip(s, pts, HIGHWAY.width, 0.03, "#3d3b4a");
    strip(s, pts, 0.12, 0.04, "#ffc933");
    dashes(s, pts, 3.2, 0.12, 0.04, "#fbfaf7");
    dashes(s, pts, -3.2, 0.12, 0.04, "#fbfaf7");
  }
  disc(s, RX, RZ, 4.75, 8.75, 0.03, "#3d3b4a");
  disc(s, RX, RZ, 0, 4.75, 0.05, "#7ed957", 32);
  for (let k = 0; k < 24; k++) {
    const a0 = (k / 24) * 2 * Math.PI, a1 = a0 + (0.5 * 2 * Math.PI) / 24, r = ROUND.radius;
    strip(s, [[RX + r * Math.cos(a0), RZ + r * Math.sin(a0)], [RX + r * Math.cos(a1), RZ + r * Math.sin(a1)]], 0.12, 0.04, "#fbfaf7");
  }
  strip(s, spline(TRAIL).map(rig), 2.2, 0.015, "#e6dfe9");
  out.push(geoOf(s));

  const COL = ["#4285f4", "#ea4335", "#fbbc05", "#34a853"];
  CROWD.forEach(([x, z, sz], i) => out.push(tint(new BoxGeometry(sz, sz, sz).translate(x, sz / 2 + 0.05, z), COL[i % 4])));
  const leg = HIGHWAY.legs[0].map(rig);
  for (let k = 0; k < 8; k++) {
    const [x, z] = along(leg, k / 7);
    out.push(tint(new ConeGeometry(0.12, 0.28, 6).translate(x + 1.8, 0.14, z), "#ff7a2a"));
  }
  out.push(tint(new BoxGeometry(0.08, 2.6, 0.08).translate(PX, 1.3, PZ), "#222222"));
  [2.4, 2.05, 1.7].forEach((y, i) => out.push(tint(new BoxGeometry(1.1, 0.3, 0.06).rotateY(0.35).translate(PX, y, PZ), PLACE_BY_ID[POST.to[i]].color)));
  out.push(tint(new CylinderGeometry(3.2, 5.2, 1.6, 10).translate(GX, 0.8, GZ), "#f26b3a"));
  out.push(tint(new CylinderGeometry(2.0, 3.6, 1.6, 10).translate(GX, 2.4, GZ), "#f58a55"));
  out.push(tint(new CylinderGeometry(0.9, 2.0, 1.6, 10).translate(GX, 4.0, GZ), "#f7a876"));
  out.push(tint(new CylinderGeometry(1.3, 1.3, 0.12, 12).translate(GX, 4.86, GZ), "#5bd18a"));
  out.push(...decor(PLACE_BY_ID["p-tangle"]), ...decor(PLACE_BY_ID["p-aether-lang"]));
  return out;
}
