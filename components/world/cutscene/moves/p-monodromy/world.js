// SINDRIA, as meshes: the palace on its cliff (white marble, gold onion domes, turquoise towers, arched windows,
// a gold-and-teal frieze, banners), the star-tiled terrace with its patterned border and two fountains, the
// sandstone cliff and two harbour headlands, palms, dhows with lateen sails, and the sky and the sea.
// Everything solid is one merged geometry on the shared cel material (look.js), kinds by vertex.
// Frame: the move's rig (the pup at the origin on the terrace, the lens out along +z, the palace far at -z).

import { BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, LatheGeometry, OctahedronGeometry, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { C, COMMON, U, hash, merge, part } from "./look";

const PODIUM = 3.2;

const box = (w, h, d, x, y0, z, hex, k = 1, ry = 0) => part(new BoxGeometry(w, h, d), hex, k, [x, y0 + h / 2, z, 0, ry, 0]);
const cyl = (rt, rb, h, x, y0, z, hex, k = 1, seg = 14) => part(new CylinderGeometry(rt, rb, h, seg), hex, k, [x, y0 + h / 2, z]);
const ball = (r, x, y, z, hex, k = 2, sy = 1) => part(new SphereGeometry(r, 12, 8), hex, k, [x, y, z, 0, 0, 0, 1, sy, 1]);
const onion = (R, H) => [[R * 0.98, 0], [R * 1.12, H * 0.1], [R * 1.22, H * 0.28], [R * 1.1, H * 0.48], [R * 0.72, H * 0.68], [R * 0.32, H * 0.85], [R * 0.09, H * 0.96], [0, H]].map(([r, y]) => new Vector2(r, y));
const dome = (R, H, x, y0, z, hex, k, seg = 20) => part(new LatheGeometry(onion(R, H), seg), hex, k, [x, y0, z]);
const spire = (x, y0, z, h = 2.6) => [cyl(0.07, 0.14, h, x, y0, z, C.gold, 2, 8), ball(0.22, x, y0 + h * 0.45, z, C.gold, 2), part(new TorusGeometry(0.42, 0.06, 6, 14, Math.PI * 1.45), C.gold, 2, [x, y0 + h + 0.2, z, 0, 0, 0.9])];
// a pointed arch window: dark glass in a gold frame
function arch(x, y0, z, w, h, out = []) {
  out.push(box(w + 0.4, h + 0.2, 0.1, x, y0 - 0.1, z - 0.04, C.gold, 2), part(new CylinderGeometry(w / 2 + 0.2, w / 2 + 0.2, 0.1, 14).rotateX(Math.PI / 2), C.gold, 2, [x, y0 + h, z - 0.04]));
  out.push(box(w, h, 0.12, x, y0, z + 0.02, "#17415d", 0), part(new CylinderGeometry(w / 2, w / 2, 0.12, 14).rotateX(Math.PI / 2), "#17415d", 0, [x, y0 + h, z + 0.02]));
  out.push(box(0.1, h + w / 2, 0.14, x, y0, z + 0.04, C.gold, 2)); // the mullion
  return out;
}

// the palace stands across the bay on a sandstone promontory, its base at y 6; the quay the pup stands on is at y 0
const PZ = -96; // the palace's front face
const PY = 6;
function palace() {
  const P = [];
  const FZ = PZ;
  // the grand stairs: four marble steps with gold nosings up to the podium
  for (let i = 0; i < 4; i++) {
    const z = FZ + 18 - 4.5 * (i + 0.5);
    P.push(box(26 - i * 1.2, PODIUM * ((i + 1) / 4), 4.5, 0, 0, z, C.marble, 1));
    P.push(box(26.2 - i * 1.2, 0.12, 0.3, 0, PODIUM * ((i + 1) / 4) - 0.1, z + 2.2, C.gold, 2));
  }
  // the podium and the hall
  P.push(box(36, 0.8, 16, 0, PODIUM - 0.8, FZ - 6, C.marble, 1));
  P.push(box(24, 8.4, 12, 0, PODIUM, FZ - 6, C.marble, 1));
  P.push(box(25.4, 0.8, 13.4, 0, PODIUM + 8.4, FZ - 6, C.marble, 1)); // the cornice
  P.push(box(25.8, 0.2, 13.8, 0, PODIUM + 8.2, FZ - 6, C.gold, 2));
  P.push(box(24.2, 0.9, 0.3, 0, PODIUM + 7.2, FZ + 0.1, C.teal, 12)); // the frieze
  P.push(box(24.2, 0.9, 0.3, 0, PODIUM + 1.1, FZ + 0.1, C.teal, 12));
  // arched windows along the front, a grand door in the middle
  for (const x of [-10, -7.2, -4.4, 4.4, 7.2, 10]) arch(x, PODIUM + 2.4, FZ + 0.06, 1.3, 3.0, P);
  arch(0, PODIUM + 0.2, FZ + 0.06, 3.0, 4.6, P);
  // the colonnade: gold-capped columns before the hall
  for (let i = 0; i < 9; i++) {
    const x = -12 + i * 3;
    P.push(cyl(0.42, 0.48, 7.0, x, PODIUM + 0.4, FZ + 1.8, C.marble, 1, 12));
    P.push(box(1.2, 0.4, 1.2, x, PODIUM, FZ + 1.8, C.gold, 2), box(1.1, 0.5, 1.1, x, PODIUM + 7.3, FZ + 1.8, C.gold, 2));
  }
  P.push(box(25, 0.8, 1.6, 0, PODIUM + 7.8, FZ + 1.8, C.marble, 1), box(25.2, 0.12, 1.7, 0, PODIUM + 7.78, FZ + 1.8, C.gold, 2));
  // the great dome: a drum with arched lights, an onion dome of gold, a spire and a crescent
  const DY = PODIUM + 9.2;
  P.push(cyl(5.0, 5.2, 2.4, 0, DY, FZ - 6, C.marble, 1, 22));
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.42;
    arch(Math.sin(a) * 5.15, DY + 0.35, FZ - 6 + Math.cos(a) * 5.15, 0.8, 1.2, P);
  }
  P.push(cyl(5.3, 5.3, 0.3, 0, DY + 2.3, FZ - 6, C.gold, 2, 22));
  P.push(dome(5.1, 8.2, 0, DY + 2.5, FZ - 6, C.gold, 2, 24));
  P.push(...spire(0, DY + 10.5, FZ - 6, 2.4));
  // four corner domes on the roof, turquoise tile
  for (const [x, z] of [[-9.5, FZ - 2.5], [9.5, FZ - 2.5], [-9.5, FZ - 9.5], [9.5, FZ - 9.5]]) {
    P.push(cyl(1.6, 1.7, 1.4, x, PODIUM + 8.9, z, C.marble, 1, 12), dome(1.7, 3.6, x, PODIUM + 10.3, z, C.turq, 3, 16), ...spire(x, PODIUM + 13.8, z, 1.2));
  }
  // two slim towers: banded gold, a balcony ring, turquoise onion domes
  for (const s of [-1, 1]) {
    const x = s * 14.6;
    const z = FZ - 1;
    P.push(cyl(1.7, 1.9, 9.6, x, PODIUM - 0.4, z, C.marble, 1, 14));
    P.push(cyl(1.76, 1.76, 0.7, x, PODIUM + 2.6, z, C.teal, 12, 14), cyl(1.76, 1.76, 0.7, x, PODIUM + 6.2, z, C.teal, 12, 14));
    P.push(cyl(2.6, 2.4, 0.45, x, PODIUM + 8.6, z, C.gold, 2, 14));
    P.push(cyl(1.9, 1.9, 1.6, x, PODIUM + 9.0, z, C.marble, 1, 14));
    P.push(dome(2.2, 4.6, x, PODIUM + 10.5, z, C.turq, 3, 16), ...spire(x, PODIUM + 15.0, z, 1.8));
    arch(x, PODIUM + 3.6, z + 1.75, 0.7, 1.5, P);
    arch(x, PODIUM + 7.1, z + 1.8, 0.7, 1.1, P);
  }
  // low wings with small gold domes
  for (const s of [-1, 1]) {
    P.push(box(5.6, 5.2, 9, s * 18.2, PODIUM, FZ - 4.5, C.marble, 1), box(5.9, 0.35, 9.3, s * 18.2, PODIUM + 5.1, FZ - 4.5, C.gold, 2));
    P.push(dome(1.6, 3, s * 18.2, PODIUM + 5.4, FZ - 3, C.gold, 2, 14), ...spire(s * 18.2, PODIUM + 8.3, FZ - 3, 1));
    arch(s * 18.2, PODIUM + 1.6, FZ + 0.06, 1.1, 2.2, P);
  }
  // banners: long cloth hung between the columns
  [[-7.5, C.crimson], [-3.0, C.teal], [3.0, C.teal], [7.5, C.crimson]].forEach(([x, hex]) => {
    P.push(box(1.1, 5.4, 0.08, x, PODIUM + 1.8, FZ + 1.95, hex, 4), box(1.3, 0.14, 0.14, x, PODIUM + 7.2, FZ + 1.95, C.gold, 2), box(1.1, 0.3, 0.1, x, PODIUM + 1.5, FZ + 1.95, C.gold, 2));
  });
  // sit it on its promontory
  const g = merge(P);
  g.translate(0, PY, 0);
  return [g];
}

// THE QUAY the pup stands on: a marble-and-sandstone pier a metre over the water, its top the patterned floor, a
// balustrade with gold finials, two fountains, bollards. x +-11, z -10 .. 14.
export const QUAY = { x: 11, z0: -10, z1: 14 };
function quay() {
  const P = [];
  const w = QUAY.x * 2;
  const d = QUAY.z1 - QUAY.z0;
  const zc = (QUAY.z0 + QUAY.z1) / 2;
  const ex = QUAY.x - 0.2;
  P.push(box(w, 4.6, d, 0, -4.6, zc, C.sandDeep, 10)); // the stone below the water line
  P.push(box(w + 0.5, 1.0, d + 0.5, 0, -1.0, zc, C.marble, 1)); // the marble facing
  P.push(box(w + 0.7, 0.16, d + 0.7, 0, -0.22, zc, C.gold, 2));
  P.push(part(new PlaneGeometry(w, d).rotateX(-Math.PI / 2), "#ffffff", 11, [0, 0.002, zc]));
  for (const s of [-1, 1]) {
    P.push(box(0.4, 0.28, d - 0.6, s * ex, 1.0, zc, C.marble, 1));
    for (let z = QUAY.z0 + 0.6; z <= QUAY.z1 - 0.3; z += 1.9) P.push(cyl(0.12, 0.17, 1.0, s * ex, 0, z, C.marble, 1, 6));
    for (const z of [QUAY.z0 + 0.3, 2, QUAY.z1 - 0.3]) P.push(box(0.6, 1.5, 0.6, s * ex, 0, z, C.marble, 1), ball(0.28, s * ex, 1.75, z, C.gold, 2));
  }
  // the seaward edge: a balustrade with an opening for the steps down to the water
  for (const s of [-1, 1]) P.push(box(w * 0.36, 0.28, 0.4, s * w * 0.32, 1.0, QUAY.z0 + 0.2, C.marble, 1));
  for (let x = -QUAY.x + 0.5; x <= QUAY.x - 0.4; x += 1.5) if (Math.abs(x) > 2.1) P.push(cyl(0.12, 0.17, 1.0, x, 0, QUAY.z0 + 0.2, C.marble, 1, 6));
  for (const x of [-2.4, 2.4]) P.push(box(0.6, 1.5, 0.6, x, 0, QUAY.z0 + 0.2, C.marble, 1), ball(0.28, x, 1.75, QUAY.z0 + 0.2, C.gold, 2));
  for (let i = 0; i < 4; i++) P.push(box(4.4, 0.3, 0.9, 0, -0.3 - i * 0.3, QUAY.z0 - 0.45 - i * 0.9, C.marble, 1)); // the water steps
  // two fountains with turquoise water
  for (const s of [-1, 1]) {
    const x = s * 6.6;
    const z = -4.6;
    P.push(cyl(1.7, 1.8, 0.6, x, 0, z, C.marble, 1, 18), cyl(1.45, 1.45, 0.08, x, 0.52, z, C.turq, 3, 18), cyl(0.2, 0.3, 1.5, x, 0.5, z, C.marble, 1, 10), cyl(0.8, 0.4, 0.32, x, 1.6, z, C.gold, 2, 12), ball(0.24, x, 2.2, z, C.gold, 2));
  }
  // bollards along the sea edge
  for (const x of [-8.5, -5, 5, 8.5]) P.push(cyl(0.2, 0.26, 0.5, x, 0, QUAY.z0 + 0.8, C.goldDeep, 2, 8));
  return P;
}

// the rock: a lumpy sandstone mass, jittered by its own vertex positions so the seams stay shut
function rock(rx, h, rz, x, y, z, seed, rBot = 1.25, seg = 18) {
  const g = new CylinderGeometry(1, rBot, 1, seg, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const k = px * 13.1 + py * 7.7 + pz * 3.3 + seed;
    const side = Math.abs(py) < 0.499 ? 1 : 0;
    const j = 1 + side * (hash(k, 1) - 0.5) * 0.28;
    p.setXYZ(i, px * j, py + side * (hash(k, 2) - 0.5) * 0.08, pz * j);
  }
  g.computeVertexNormals();
  return part(g, C.sandDeep, 10, [x, y, z, 0, 0, 0, rx, h, rz]);
}

// white houses stacked over a flat-topped rock: cubes with flat coral or teal roofs, a few gold and turquoise domes
function houses(R, cx, cz, rx, rz, top, n, seed, clear = 0) {
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed + 3) * Math.PI * 2;
    const rr = Math.sqrt(hash(i, seed + 4)) * 0.86;
    const hx = cx + Math.cos(a) * rx * rr;
    const hz = cz + Math.sin(a) * rz * rr;
    if (Math.abs(hx) < clear) continue;
    const w = 2.2 + 2.2 * hash(i, seed + 5);
    const hh = 2.2 + 3.2 * hash(i, seed + 6);
    R.push(box(w, hh, w, hx, top, hz, C.marble, 1, hash(i, seed + 7) * 1.2));
    if (i % 3 === 0) R.push(dome(w * 0.5, 1.9, hx, top + hh, hz, i % 2 ? C.gold : C.turq, i % 2 ? 2 : 3, 10));
    else R.push(box(w + 0.3, 0.2, w + 0.3, hx, top + hh, hz, i % 2 ? C.coral : C.teal, 0, hash(i, seed + 7) * 1.2));
    if (i % 2 === 0) arch(hx, top + 0.3, hz + w / 2 + 0.02, 0.5, 0.9, R);
  }
}

function rocks() {
  const R = [];
  // the far shore: a long sandstone promontory with the palace on its flat top (y 6), the city beside it
  R.push(rock(70, 24, 26, 0, -6, -112, 1, 1.15, 24));
  R.push(part(new CircleGeometry(1, 48).rotateX(-Math.PI / 2), "#d9b57a", 10, [0, PY, -112, 0, 0, 0, 70, 1, 26]));
  houses(R, 0, -112, 70, 24, PY, 54, 5, 24);
  // the town cascading down the cliff face to the water: cubes on ledges, flat coral and teal roofs, gold domes
  for (let i = 0; i < 70; i++) {
    const x = -66 + 132 * hash(i, 21);
    const zf = -112 + 26.5 * Math.sqrt(Math.max(0.04, 1 - (x / 72) ** 2));
    const yb = -1.0 + 6.4 * hash(i, 22) ** 0.8;
    if (Math.abs(x) < 20 && yb > 3.4) continue;
    const w = 2.4 + 2.6 * hash(i, 23);
    const hh = 2.0 + 2.6 * hash(i, 24);
    R.push(box(w, hh, w, x, yb, zf + 0.6, C.marble, 1, (hash(i, 25) - 0.5) * 0.3));
    if (i % 4 === 0) R.push(dome(w * 0.5, 1.8, x, yb + hh, zf + 0.6, i % 8 ? C.gold : C.turq, i % 8 ? 2 : 3, 10));
    else R.push(box(w + 0.3, 0.2, w + 0.3, x, yb + hh, zf + 0.6, i % 2 ? C.coral : C.teal, 0));
    if (i % 2 === 0) arch(x, yb + 0.3, zf + 0.6 + w / 2 + 0.02, 0.6, 1.1, R);
  }
  // a seawall along the far waterline, with a gold lip
  R.push(box(140, 1.6, 2, 0, -2.2, -84.5, C.sand, 10), box(140.4, 0.14, 2.4, 0, -0.62, -84.5, C.gold, 2));
  // two headlands that hold the bay, with houses of their own
  for (const [x, z, rx, rz, seed] of [[-52, -42, 16, 24, 8], [58, -54, 18, 26, 12]]) {
    R.push(rock(rx, 9, rz, x, -5.5, z, seed, 1.3, 14));
    R.push(part(new CircleGeometry(1, 28).rotateX(-Math.PI / 2), "#d9b57a", 10, [x, -1.0, z, 0, 0, 0, rx, 1, rz]));
    houses(R, x, z, rx, rz, -1.0, 16, seed);
  }
  // small far islets
  for (const [x, z, r, seed] of [[-110, -150, 12, 2], [120, -160, 14, 3], [30, -210, 22, 4]]) R.push(rock(r, 7, r * 0.8, x, -2, z, seed, 1.4, 10));
  return R;
}

// A PALM: a bent trunk of ringed segments, a knot of coconuts, ten drooping fronds.
function frond(yaw, pitch, len, top) {
  const n = 7;
  const pos = [];
  const col = [];
  const lo = new Color(C.palm);
  const hi = new Color(C.palmLight);
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const d = Math.cos(pitch) * len * s;
    const y = Math.sin(pitch) * len * s - len * 0.55 * s * s;
    const w = 0.62 * Math.sin(Math.PI * Math.min(1, s * 0.9 + 0.1)) * (1 - 0.35 * s) + 0.03;
    for (const side of [-1, 1]) {
      const lat = side * w;
      const px = Math.sin(yaw) * d + Math.cos(yaw) * lat;
      const pz = Math.cos(yaw) * d - Math.sin(yaw) * lat;
      pos.push(top[0] + px, top[1] + y - Math.abs(lat) * 0.45, top[2] + pz);
      const c = lo.clone().lerp(hi, s);
      col.push(c.r, c.g, c.b);
    }
  }
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  const m = ng.attributes.position.count;
  const colors = new Float32Array(m * 3);
  const index = idx;
  index.forEach((v, j) => colors.set([col[v * 3], col[v * 3 + 1], col[v * 3 + 2]], j * 3));
  ng.setAttribute("color", new BufferAttribute(colors, 3));
  ng.setAttribute("aK", new BufferAttribute(new Float32Array(m).fill(6), 1));
  return ng;
}
export function palmGeometry() {
  const P = [];
  const seg = 7;
  const at = (t) => new Vector3(0.9 * t * t * 1.6, t * 6.6, 0);
  for (let i = 0; i < seg; i++) {
    const a = at(i / seg);
    const b = at((i + 1) / seg);
    const d = b.clone().sub(a);
    const g = new CylinderGeometry(0.17 - 0.05 * ((i + 1) / seg), 0.2 - 0.06 * (i / seg), d.length() * 1.04, 7);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
    g.applyQuaternion(q).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    P.push(part(g, i % 2 ? "#8a6540" : "#9d7649", 0));
  }
  const top = at(1).toArray();
  for (let i = 0; i < 3; i++) P.push(ball(0.2, top[0] + Math.sin(i * 2.1) * 0.22, top[1] - 0.2, top[2] + Math.cos(i * 2.1) * 0.22, "#6b4a2b", 0));
  for (let i = 0; i < 10; i++) P.push(frond((i / 10) * Math.PI * 2 + 0.3 * hash(i, 1), 0.5 + 0.35 * hash(i, 2) * (i % 2 ? 1 : -0.4), 3.4 + 0.9 * hash(i, 3), top));
  return merge(P);
}
export const PALM_AT = [[-6.4, -8.2, 0], [6.8, -8.6, 0], [-8.6, -3.2, 0], [8.8, -3.6, 0], [-9.6, 4.5, 0], [9.5, 4, 0], [-10.2, 11, 0], [10.2, 11.5, 0], [-2.9, -9.1, 0], [3.3, -9.3, 0], [-38, -38, -1], [-47, -50, -1], [52, -52, -1], [62, -58, -1], [-30, -90, 6], [30, -90, 6], [-52, -100, 6], [52, -100, 6], [-14, -92, 6], [14, -92, 6]];

// A DHOW: a bowl of a hull with a raised prow and stern, a deck, a mast and one big lateen sail (tinted per ship).
export function shipGeometry() {
  const P = [];
  const hull = new SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  P.push(part(hull, "#7a5233", 0, [0, 0.55, 0, 0, 0, 0, 3.3, 1.0, 1.1]));
  P.push(part(new BoxGeometry(6.2, 0.18, 1.7), C.gold, 2, [0, 0.58, 0]));
  P.push(part(new BoxGeometry(5.6, 0.1, 1.5), "#b9895a", 0, [0, 0.52, 0]));
  P.push(part(new ConeGeometry(0.34, 2.0, 6), "#7a5233", 0, [3.15, 1.2, 0, 0, 0, -0.55]));
  P.push(part(new ConeGeometry(0.3, 1.5, 6), "#7a5233", 0, [-3.05, 1.05, 0, 0, 0, 0.45]));
  P.push(part(new SphereGeometry(0.2, 8, 6), C.gold, 2, [3.65, 2.1, 0]));
  P.push(part(new CylinderGeometry(0.1, 0.13, 6.4, 6), "#5d3d24", 0, [0.2, 3.7, 0]));
  P.push(part(new CylinderGeometry(0.05, 0.05, 5.8, 5), "#5d3d24", 0, [0.4, 5.4, 0, 0, 0, 1.28]));
  // the lateen sail: a long triangle, tinted per instance
  const s = new BufferGeometry();
  s.setAttribute("position", new BufferAttribute(new Float32Array([-1.5, 1.0, 0, 3.2, 6.1, 0, 2.7, 1.0, 0, -1.5, 1.0, 0.0, 0.3, 6.3, 0, 3.2, 6.1, 0]), 3));
  s.setAttribute("normal", new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  const sail = part(s, "#ffffff", 9, [0, 0, 0.05]);
  P.push(sail);
  return merge(P);
}

// A PERSON of the festival: a robe (tinted per instance), shoulders, a round head with a turban, both arms up.
export function personGeometry() {
  const P = [];
  P.push(part(new CylinderGeometry(0.19, 0.4, 1.2, 8), "#ffffff", 9, [0, 0.6, 0]));
  P.push(part(new SphereGeometry(0.27, 7, 4), "#ffffff", 9, [0, 1.25, 0, 0, 0, 0, 1.15, 0.8, 0.85]));
  P.push(part(new SphereGeometry(0.15, 7, 5), C.skin, 0, [0, 1.58, 0]));
  P.push(part(new SphereGeometry(0.19, 7, 4), "#ffffff", 9, [0, 1.68, 0, 0, 0, 0, 1, 0.7, 1]));
  for (const s of [-1, 1]) {
    const a = new CylinderGeometry(0.05, 0.065, 0.62, 4);
    a.rotateZ(-s * 0.35).translate(s * 0.34, 1.52, 0.02);
    P.push(part(a, "#ffffff", 9));
    P.push(part(new SphereGeometry(0.065, 4, 3), C.skin, 0, [s * 0.46, 1.84, 0.02]));
  }
  return merge(P);
}
export const ROBES = ["#f2b52e", "#1fbdb4", "#f7f1e3", "#e4566a", "#7d4fc4", "#ff8f4a", "#2f8fd8", "#f4d57a"];

// THE LANTERN STRINGS: catenaries of thin rope across the terrace, and the lantern positions on them.
export function strings() {
  const rope = [];
  const lamps = [];
  const lines = [
    [[-10.8, 5.6, -8], [10.8, 5.6, -8], 1.3],
    [[-10.8, 6.2, -1.5], [10.8, 6.2, -1.5], 1.5],
    [[-10.8, 6.2, 6], [10.8, 6.2, 6], 1.5],
  ];
  lines.forEach(([a, b, sag], li) => {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t));
    }
    for (let i = 0; i < n; i++) {
      const d = pts[i + 1].clone().sub(pts[i]);
      const g = new CylinderGeometry(0.03, 0.03, d.length(), 4);
      g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize()));
      g.translate((pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2, (pts[i].z + pts[i + 1].z) / 2);
      rope.push(part(g, "#4a3524", 0));
    }
    for (let i = 1; i < n; i += 2) lamps.push({ p: pts[i], ph: hash(li * 31 + i, 1) * 6, hue: (li + i) % 3 });
  });
  // the posts the strings hang from, and the pennant poles
  for (const x of [-10.8, 10.8]) for (const [y, z] of [[5.6, -8], [6.2, -1.5], [6.2, 6]]) rope.push(cyl(0.1, 0.14, y, x, 0, z, C.marble, 1, 6), ball(0.2, x, y + 0.1, z, C.gold, 2));
  return { rope: merge(rope), lamps };
}
export const LANTERN_COLORS = ["#ffb347", "#ff6a5a", "#4fe3d6"];
export const lanternGeometry = () => merge([part(new OctahedronGeometry(0.26, 0).scale(0.8, 1.25, 0.8), "#ffffff", 5), part(new CylinderGeometry(0.1, 0.1, 0.07, 6), C.gold, 2, [0, 0.36, 0]), part(new CylinderGeometry(0.1, 0.1, 0.07, 6), C.gold, 2, [0, -0.36, 0])]);

export function landscape() {
  return merge([...palace(), ...quay(), ...rocks()]);
}

// ---------------------------------------------------------------------------------------------------------
// THE SKY (a shell round the pup, the same one the bloom swells out of) and THE SEA (one wide plane).
const u = (v) => ({ value: v });
export function skyShell() {
  const g = new SphereGeometry(1, 40, 24);
  const m = new ShaderMaterial({
    uniforms: { ...U, uInside: u(0), uBolt: u(0) },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${COMMON}
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xyz;
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * vec4(foldW(w.xyz), 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uInside, uBolt;
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        vec3 v = normalize(vP - cameraPosition);
        float h = v.y;
        float st = uStorm;
        vec3 zen = mix(vec3(0.07, 0.47, 0.82), vec3(0.07, 0.09, 0.26), st);
        vec3 mid = mix(vec3(0.24, 0.76, 0.92), vec3(0.18, 0.2, 0.42), st);
        vec3 hor = mix(vec3(1.0, 0.88, 0.64), vec3(0.66, 0.5, 0.52), st * 0.8);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, h));
        c = mix(c, zen, smoothstep(0.18, 0.7, h));
        if (h < 0.0) c = hor;
        // a vortex of storm over the palace: the clouds spin round it when the djinn is equipped
        float az = atan(v.x, -v.z);
        vec2 q = vec2(az, h) - vec2(0.0, 0.46);
        float rr = length(q);
        float ang = st * 2.6 / (0.25 + rr) + uTime * 0.05 * st;
        q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
        vec2 cp = (q + vec2(0.0, 0.46)) * vec2(2.7, 5.4) + vec2(uTime * 0.02, 0.0);
        float cl = fbm(cp * vec2(1.0, 2.0) + vec2(0.0, 3.0));
        float thr = mix(0.63, 0.36, st);
        float body = smoothstep(thr, thr + 0.015, cl) * smoothstep(-0.02, 0.07, h);
        float core = smoothstep(thr + 0.07, thr + 0.085, cl);
        vec3 rim = mix(vec3(0.78, 0.8, 0.96), vec3(0.28, 0.26, 0.5), st);
        rim = mix(rim, vec3(1.0, 0.85, 0.7), smoothstep(0.25, 0.0, h) * (1.0 - st));
        vec3 top = mix(vec3(1.0, 0.98, 0.92), vec3(0.4, 0.43, 0.62), st);
        c = mix(c, mix(rim, top, core), body);
        // the sun: a pale gold disc, a glow and a few long rays; the storm swallows it
        vec3 sd = normalize(vec3(0.2, 0.16, -0.96));
        float sa = 1.0 - dot(v, sd);
        float sun = (1.0 - smoothstep(0.0015, 0.0019, sa)) + exp(-sa * 55.0) * 0.55 + exp(-sa * 9.0) * 0.18 * (0.6 + 0.4 * cos(atan(v.x - sd.x, v.y - sd.y) * 9.0 + uTime * 0.2));
        c += vec3(1.0, 0.9, 0.55) * sun * (1.0 - st * 1.1);
        c = mix(c, vec3(0.82, 0.93, 1.0), uFlash * 0.4);
        c += (h21(gl_FragCoord.xy + fract(uTime * 7.1) * 113.0) - 0.5) * 0.025;
        float alpha = 1.0;
        if (gl_FrontFacing && uInside < 0.5) {
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
          c += f * vec3(1.0, 0.8, 0.35) * 0.7;
          alpha = mix(0.3, 1.0, f);
        }
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

export function sea() {
  const g = new PlaneGeometry(700, 700, 70, 70).rotateX(-Math.PI / 2);
  const m = new ShaderMaterial({
    uniforms: { ...U, uSurge: u(0) },
    vertexShader: /* glsl */ `
      ${COMMON}
      uniform float uSurge;
      varying vec3 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float a = 0.14 + uSurge * 0.3;
        w.y += a * (sin(w.x * 0.11 + uTime * 1.3) + sin(w.z * 0.08 - uTime * 1.7) + 0.5 * sin((w.x + w.z) * 0.23 + uTime * 2.6));
        vP = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(foldW(w.xyz), 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uSurge;
      varying vec3 vP;
      void main() {
        vec2 q = vP.xz * 0.07;
        float n1 = fbm(q + vec2(uTime * 0.05, uTime * 0.03));
        float n2 = fbm(q * 2.4 - vec2(uTime * 0.08, uTime * 0.02) + 4.0);
        vec3 deep = vec3(0.03, 0.48, 0.62), mid = vec3(0.06, 0.72, 0.76), lite = vec3(0.45, 0.93, 0.84);
        vec3 c = mix(deep, mid, smoothstep(0.34, 0.5, n1));
        c = mix(c, lite, smoothstep(0.6, 0.64, n2) * 0.85);
        float foam = smoothstep(0.7 - uSurge * 0.14, 0.74 - uSurge * 0.14, n1 + 0.12 * sin(vP.x * 0.35 + uTime * 1.2));
        c = mix(c, vec3(0.97, 1.0, 0.98), foam * 0.9);
        float gl = step(0.986, h21(floor(vP.xz * 1.1) + floor(uTime * 3.0))) * (0.5 + 0.5 * sin(uTime * 9.0 + vP.x));
        c += vec3(1.0, 0.95, 0.7) * gl * (1.0 - uStorm);
        float dist = length(vP - cameraPosition);
        c = mix(c, hazeCol(), (1.0 - exp(-dist * 0.0085)) * 0.9);
        c = mix(c, c * vec3(0.5, 0.62, 0.78), uStorm * 0.6);
        c = mix(c, vec3(0.8, 0.92, 1.0), uFlash * 0.3);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  return { g, m };
}

// THE FLEET: where each dhow rides (x, z, yaw), in the two harbours.
export const FLEET = [
  [-9, -20, 0.35], [12, -24, -0.25], [-26, -28, 1.1], [26, -32, 0.2], [-2, -38, -0.45], [-36, -44, 0.1], [32, -48, 0.85],
  [-12, -54, 0.2], [18, -60, -0.2], [-28, -64, 0.5], [40, -70, 0.1], [4, -76, -0.3], [-18, -84, 0.25], [22, -90, -0.4],
];
export const SEA_Y = -1.2;
