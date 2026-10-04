// ACADEMY CITY AT NIGHT, THE RIVER BRIDGE, as geometry (blueprint frame: x along the bridge, y up, the glass
// deck's top at y = 0, z across). Built once as merged non-indexed pieces (position + aK: 0 plain, 1 windows,
// 2 a big screen); the Move wraps each in the cyanotype's paper and its cream edge lines.
// The bridge: a steel through-truss (lattice girders, floor, walkways, piers, lamp posts), the substation at
// its centre (tank, glass platform on four legs, two ceramic bushings), the far bank's towers with lit windows,
// big abstract screens, a monorail viaduct, and the wind turbines (masts here; the rotors spin in the shader).

import { BoxGeometry, CylinderGeometry, Float32BufferAttribute, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { edgeGeometry } from "./blue";

export const DECK_Y = -3.4; // the bridge deck's top
export const WATER_Y = -9;
export const BANK_Y = -4.4; // the far bank's top
export const X0 = -22; // the bridge's ends
export const X1 = 28;
export const BUSH_X = 2.1; // the bushings, either side of the pup
export const BUSH_H = 4.4;
export const SPAN = 3.3; // the trusses' z

const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

export function piece(g, k = 0) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  n.setAttribute("aK", new Float32BufferAttribute(new Float32Array(n.attributes.position.count).fill(k), 1));
  return n;
}
const bx = (w, h, d, x, y, z, k = 0, rz = 0) => {
  const g = new BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  return piece(g.translate(x, y, z), k);
};
const cyl = (r, h, x, y, z, seg = 12, k = 0) => piece(new CylinderGeometry(r, r, h, seg).translate(x, y, z), k);

// the lamp posts: x, z, height above the deck. The one at KUROKO_LAMP is her perch, tall.
export const KUROKO_LAMP = { x: -1.5, z: -2.75, h: 4.2 };
const LAMPS = [
  ...[-19, -13, -7, 5, 11, 17, 23].flatMap((x) => [{ x, z: 2.75, h: 3.0 }, { x: x + 1.5, z: -2.75, h: 3.0 }]),
  KUROKO_LAMP,
  { x: 0.5, z: 2.75, h: 3.0 },
];
export const lampBulbs = () => LAMPS.map((l) => new Vector3(l.x, DECK_Y + l.h + 0.12, l.z - Math.sign(l.z) * 0.5));

// THE BRIDGE: deck, walkways, trusses, floor beams, piers, lamp posts, end portal
export function bridgeGeometry() {
  const p = [];
  const L = X1 - X0;
  const cx = (X0 + X1) / 2;
  p.push(bx(L, 0.5, 6.6, cx, DECK_Y - 0.25, 0));
  for (const s of [-1, 1]) {
    p.push(bx(L, 0.16, 1.1, cx, DECK_Y + 0.08, s * 2.4)); // the walkway, raised a hand
    p.push(bx(L, 0.18, 0.2, cx, DECK_Y - 0.6, s * 3.0)); // the stringer under it
    p.push(bx(L, 0.2, 0.2, cx, -0.1, s * SPAN)); // top chord
    p.push(bx(L, 0.2, 0.2, cx, DECK_Y + 0.2, s * SPAN)); // bottom chord
    p.push(bx(L, 0.07, 0.07, cx, DECK_Y + 1.0, s * 3.05)); // the rail
    for (let x = X0; x <= X1 + 0.01; x += 3) {
      p.push(bx(0.16, 3.2, 0.16, x, (DECK_Y + 0.2 - 0.1) / 2 - 0.05, s * SPAN)); // posts
      if (x < X1) {
        const dir = Math.round((x - X0) / 3) % 2 ? 1 : -1;
        p.push(bx(0.12, Math.hypot(3, 3.1), 0.12, x + 1.5, (DECK_Y + 0.1) / 2 - 0.05, s * SPAN, 0, dir * Math.atan2(3.0, 3.1)));
      }
    }
  }
  for (let x = X0; x <= X1; x += 3) p.push(bx(0.34, 0.45, 7.2, x, DECK_Y - 0.85, 0)); // floor beams
  for (let x = X0 + 2; x <= X1; x += 8) {
    for (const s of [-1, 1]) p.push(bx(1.0, 4.8, 1.0, x, (DECK_Y - 0.5 + WATER_Y) / 2, s * 2.3));
    p.push(bx(1.2, 0.5, 6.4, x, DECK_Y - 1.3, 0));
  }
  for (const l of LAMPS) {
    p.push(bx(0.12, l.h, 0.12, l.x, DECK_Y + l.h / 2, l.z));
    p.push(bx(0.1, 0.1, 0.75, l.x, DECK_Y + l.h, l.z - Math.sign(l.z) * 0.35)); // the arm, toward the deck
    p.push(bx(0.3, 0.18, 0.3, l.x, DECK_Y + l.h + 0.02, l.z - Math.sign(l.z) * 0.7)); // the lamp's hood
  }
  // the near end's portal: two posts and a lintel
  for (const s of [-1, 1]) p.push(bx(0.4, 6.4, 0.4, X0 + 0.2, DECK_Y + 3.2, s * 3.5));
  p.push(bx(0.4, 0.4, 7.4, X0 + 0.2, DECK_Y + 6.4, 0));
  return mergeGeometries(p);
}

// THE SUBSTATION: the transformer tank on the deck with its fins, four legs, two ceramic bushings (flange, stack, discs, cap)
export function substationGeometry() {
  const p = [bx(2.6, 1.7, 1.7, 0, DECK_Y + 0.85, 0)];
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) p.push(bx(0.12, 1.3, 0.5, -1.0 + i * 0.4, DECK_Y + 0.85, s * 1.1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(bx(0.24, -DECK_Y - 0.1, 0.24, sx * 2.8, (DECK_Y - 0.1) / 2, sz * 1.55));
  for (const s of [-1, 1]) {
    const x = s * BUSH_X;
    p.push(cyl(0.5, 0.3, x, 0.15));
    p.push(cyl(0.22, BUSH_H, x, BUSH_H / 2));
    for (let k = 0; k < 9; k++) p.push(cyl(0.52 - k * 0.012, 0.09, x, 0.6 + k * 0.43));
    p.push(cyl(0.32, 0.34, x, BUSH_H + 0.17));
    p.push(piece(new SphereGeometry(0.2, 8, 6).translate(x, BUSH_H + 0.46, 0)));
  }
  return mergeGeometries(p);
}
export const glassGeometry = () => bx(6.6, 0.16, 3.9, 0, -0.08, 0);
// the amber core: a thin cylinder up each bushing (kind 0), and a flat disc of glow on the glass (kind 1)
export function coreGeometry() {
  const p = [];
  for (const s of [-1, 1]) p.push(cyl(0.3, BUSH_H, s * BUSH_X, BUSH_H / 2, 0, 10, 0));
  p.push(piece(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).scale(5.4, 1, 3.2).translate(0, 0.02, 0), 1));
  return mergeGeometries(p);
}

// THE FAR BANK: the quay and its towers (windows, setbacks, antennas), a few with a big screen; the masts of the wind turbines.
// Returns { bank, towers, hubs: [Vector3] } (hubs: rotor centres in this frame).
export const TRACK_Z = (u) => -41 + 3 * Math.sin(u * Math.PI * 2.2 + 0.6) - 4 * u;
export const TRACK_Y = 2.6;
export const TRACK_X = (u) => -40 + 150 * u;
const nearTrack = (x, z, r) => {
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    if (Math.hypot(TRACK_X(u) - x, TRACK_Z(u) - z) < r) return true;
  }
  return false;
};
export function cityGeometry() {
  const t = [];
  const hubs = [];
  const masts = [];
  const bank = [bx(260, 4.6, 110, 40, BANK_Y - 2.3, -91, 0), bx(260, 4.6, 6, 40, (BANK_Y + WATER_Y) / 2 - 2.3, -34, 0)];
  bank.push(bx(260, 8.4, 0.5, 40, (BANK_Y + WATER_Y) / 2 - 2.3, -34.2));
  let id = 0;
  const rows = [
    { z: -38, h: 6, n: 9, gap: 8 },
    { z: -52, h: 11, n: 9, gap: 9 },
    { z: -68, h: 16, n: 9, gap: 11 },
    { z: -86, h: 22, n: 8, gap: 14 },
  ];
  for (const [ri, row] of rows.entries()) {
    for (let i = 0; i < row.n; i++) {
      const w = 4.5 + hash(id, 1) * 4;
      const d = 5 + hash(id, 2) * 4;
      const x = -22 + i * row.gap + hash(id, 3) * 3;
      const z = row.z - hash(id, 4) * 3;
      id++;
      if (nearTrack(x, z, 4.5 + w / 2)) continue;
      const h = row.h * (0.7 + hash(id, 5) * 0.8);
      const k = 1 + (hash(id, 9) > 0.5 ? 0.2 : 0); // two window patterns
      const y0 = BANK_Y;
      t.push(bx(w, h * 0.72, d, x, y0 + h * 0.36, z, k));
      t.push(bx(w * 0.7, h * 0.3, d * 0.7, x, y0 + h * 0.72 + h * 0.15, z, k));
      if (hash(id, 6) > 0.55) t.push(bx(0.18, h * 0.3, 0.18, x, y0 + h + h * 0.15, z, 0)); // an antenna
      if (ri <= 2 && hash(id, 7) > 0.78) t.push(bx(w * 0.62, h * 0.36, 0.25, x, y0 + h * 0.36, z + d / 2 + 0.16, 2)); // a big screen on its face
      if (ri >= 1 && hash(id, 8) > 0.74) {
        const top = y0 + h * 1.0;
        masts.push(new Vector3(x + w * 0.2, top, z + d * 0.1)); // a rooftop turbine
      }
    }
  }
  for (const x of [8, 20, 33, 47, 62]) masts.push(new Vector3(x, BANK_Y, -32.2)); // along the riverbank
  for (const m of masts) {
    const hh = m.y === BANK_Y ? 11.5 : 6;
    t.push(bx(0.5, hh, 0.5, m.x, m.y + hh / 2, m.z, 0));
    t.push(bx(0.7, 0.7, 1.0, m.x, m.y + hh, m.z + 0.4, 0));
    hubs.push(new Vector3(m.x, m.y + hh, m.z + 1.1));
  }
  return { bank: mergeGeometries(bank), towers: mergeGeometries(t), hubs };
}

// THE TURBINES' ROTORS: three tapered blades and a hub each; every vertex carries its hub and a speed/phase for the shader
export function rotorGeometry(hubs) {
  const parts = [];
  hubs.forEach((h, i) => {
    const sp = 0.8 + 0.4 * hash(i, 3);
    const ph = hash(i, 4) * 6.28;
    const len = h.y > 6 ? 6.2 : 4.5;
    for (let k = 0; k < 3; k++) {
      const b = new BoxGeometry(0.34, len, 0.1).translate(0, len / 2 + 0.3, 0).rotateZ((k * Math.PI * 2) / 3);
      parts.push(rotorPiece(b, h, sp, ph));
    }
    parts.push(rotorPiece(new BoxGeometry(0.7, 0.7, 0.55), h, sp, ph, true));
  });
  return mergeGeometries(parts);
}
function rotorPiece(g, hub, sp, ph, isHub = false) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  if (!isHub) n.translate(hub.x, hub.y, hub.z);
  else n.translate(hub.x, hub.y, hub.z);
  const c = n.attributes.position.count;
  n.setAttribute("aHub", new Float32BufferAttribute(Array.from({ length: c }, () => [hub.x, hub.y, hub.z]).flat(), 3));
  n.setAttribute("aSP", new Float32BufferAttribute(Array.from({ length: c }, () => [sp, ph]).flat(), 2));
  return n;
}
// the rotor's edge lines carry the nearest hub too
export function rotorLines(rotor, hubs) {
  const e = edgeGeometry(rotor, 30, 0.03);
  const p = e.attributes.position;
  const hubA = new Float32Array(p.count * 3);
  const spA = new Float32Array(p.count * 2);
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let best = 0;
    let bd = 1e9;
    hubs.forEach((h, j) => {
      const d = v.distanceToSquared(h);
      if (d < bd) (bd = d, (best = j));
    });
    hubA.set([hubs[best].x, hubs[best].y, hubs[best].z], i * 3);
    spA.set([0.8 + 0.4 * hash(best, 3), hash(best, 4) * 6.28], i * 2);
  }
  e.setAttribute("aHub", new Float32BufferAttribute(hubA, 3));
  e.setAttribute("aSP", new Float32BufferAttribute(spA, 2));
  return e;
}

// THE MONORAIL: a box-girder following TRACK on piers; the car is its own small mesh
export function trackGeometry() {
  const p = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const u0 = i / N;
    const u1 = (i + 1) / N;
    const a = new Vector3(TRACK_X(u0), TRACK_Y, TRACK_Z(u0));
    const b = new Vector3(TRACK_X(u1), TRACK_Y, TRACK_Z(u1));
    const len = a.distanceTo(b);
    const g = new BoxGeometry(len * 1.02, 0.5, 1.4).rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
    p.push(piece(g.translate((a.x + b.x) / 2, TRACK_Y - 0.25, (a.z + b.z) / 2)));
    if (i % 4 === 0) p.push(bx(0.7, TRACK_Y - BANK_Y - 0.5, 0.7, a.x, (TRACK_Y - 0.5 + BANK_Y) / 2, a.z));
  }
  return mergeGeometries(p);
}
export function carGeometry() {
  const p = [bx(9, 1.5, 1.5, 0, 0.75, 0, 1), bx(2.2, 1.5, 1.4, 5.5, 0.75, 0, 1), bx(2.2, 1.5, 1.4, -5.5, 0.75, 0, 1)];
  return mergeGeometries(p);
}

// the river's far-off props: the half moon's sky is in the Move; here, only the bubble of bits' home
export const hashN = hash;
