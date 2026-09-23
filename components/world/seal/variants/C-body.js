// Seal variant C, the geometry: one lofted plush pup whose head grows out of
// the body, the face sculpted into the surface (muzzle, freckled pads, a "w"
// smile groove, shallow eye sockets), fore-flippers and forked hind flippers
// merged in, and skin weights for an 8-bone skeleton. Pure three.js, built
// once; C.jsx owns the bones, the materials and the animation.
//
// Body frame: origin on the snow under the middle of the body, +z the nose,
// +y up, +x the seal's own left. Head frame (face meshes, Outfit): origin the
// skull centre SKULL, same axes, skull radius 0.45.

import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, SphereGeometry, TubeGeometry, Uint16BufferAttribute, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const smax = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};
const smin = (a, b, k) => -smax(-a, -b, k);
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// exp falloff by angle between unit vectors, sigma in radians
const gauss = (d, c, sigma) => Math.exp((-2 * (1 - dot(d, c))) / (sigma * sigma));

// ---------------------------------------------------------------- skeleton

export const SKULL = [0, 0.62, 0.5];
const SR = [0.45, 0.42, 0.45]; // skull radii x, y, z
const SHOULDER = [0.33, 0.42, 0.08]; // left; the right is mirrored

// name, parent, rest position in the body frame. Order = skin index.
export const BONES = [
  ["root", null, [0, 0, 0]],
  ["hips", "root", [0, 0.3, -0.3]],
  ["chest", "hips", [0, 0.36, 0.08]],
  ["neck", "chest", [0, 0.48, 0.24]],
  ["head", "neck", [0, 0.56, 0.4]],
  ["tail", "hips", [0, 0.16, -0.74]],
  ["flipperL", "chest", SHOULDER],
  ["flipperR", "chest", [-SHOULDER[0], SHOULDER[1], SHOULDER[2]]],
];
const BONE = Object.fromEntries(BONES.map(([name], i) => [name, i]));
// Spine bones by the tilted axis q = z + 0.35 (y - 0.5): tilted so the back
// of the skull goes with the head and the throat stays with the chest.
const SPINE = [
  [BONE.tail, -0.8],
  [BONE.hips, -0.36],
  [BONE.chest, -0.02],
  [BONE.neck, 0.24],
  [BONE.head, 0.46],
];

function spineWeights(x, y, z) {
  const q = z + 0.35 * (y - 0.5);
  if (q <= SPINE[0][1]) return [SPINE[0][0], 1, 0, 0];
  for (let i = 0; i < SPINE.length - 1; i++) {
    const [a, qa] = SPINE[i];
    const [b, qb] = SPINE[i + 1];
    if (q < qb) {
      const t = smoothstep(qa, qb, q);
      return [a, 1 - t, b, t];
    }
  }
  return [SPINE.at(-1)[0], 1, 0, 0];
}

// ---------------------------------------------------------------- the face

export const EYE_R = 0.1;
const EYE_DIR = [norm([0.2, 0.085, 0.39]), norm([-0.2, 0.085, 0.39])];
const EYE_DEPTH = 0.66; // the eye is a lens, flattened along its axis, so it never bulges out of the profile
const PAD_AT = [0.1, -0.095]; // left pad centre, head-front (x, y)
const PAD_DIR = [norm([PAD_AT[0], PAD_AT[1], 0.43]), norm([-PAD_AT[0], PAD_AT[1], 0.43])];
const MUZZLE_DIR = norm([0, -0.08, 0.43]);
const NOSE_DIR = norm([0, -0.048, 0.45]);
const CHEEK_DIR = [norm([0.27, -0.05, 0.34]), norm([-0.27, -0.05, 0.34])];
const MOUTH_DIR = norm([0, -0.225, 0.37]);

// The skull ellipsoid's radius along a unit direction from its centre.
const skullR = (d) => 1 / Math.hypot(d[0] / SR[0], d[1] / SR[1], d[2] / SR[2]);

// Radial relief of the face, metres, along a unit direction from SKULL.
function faceRelief(d) {
  const front = smoothstep(0.05, 0.3, d[2]);
  if (front === 0) return 0;
  const r = skullR(d);
  const qx = d[0] * r;
  const qy = d[1] * r;
  let s = 0.055 * gauss(d, MUZZLE_DIR, 0.36);
  for (const p of PAD_DIR) s += 0.045 * gauss(d, p, 0.22);
  for (const e of EYE_DIR) s -= 0.024 * gauss(d, e, 0.3);
  // "w" smile groove under the pads: low under each pad, up at the middle
  // and curling up at the corners.
  s -= 0.032 * smileLine(d, qx, qy);
  return s * front;
}

// 0..1 on the "w" of the smile: low under each pad, up at the middle,
// curling up at the corners.
function smileLine(d, qx, qy) {
  if (qx === undefined) {
    const r = skullR(d);
    qx = d[0] * r;
    qy = d[1] * r;
  }
  const ax = Math.abs(qx);
  const yg = -0.205 + 0.028 * Math.cos((Math.PI * qx) / 0.1) + 0.03 * smoothstep(0.13, 0.22, ax);
  return (1 - smoothstep(0.17, 0.24, ax)) * Math.exp(-(((qy - yg) / 0.02) ** 2)) * (d[2] > 0.2 ? 1 : 0);
}

// Point on the sculpted face along a head-frame direction, plus that unit
// direction: [point, dir].
function onFace(v, lift = 0) {
  const d = norm(v);
  const r = skullR(d) + faceRelief(d) + lift;
  return [[d[0] * r, d[1] * r, d[2] * r], d];
}

// ------------------------------------------------------------ the colours

const hex = (h) => new Color(h); // linear, as vertex colours must be
const COL = {
  dorsal: hex("#a9c3db"),
  flank: hex("#dce8f2"),
  belly: hex("#f6efe4"),
  face: hex("#f4f1ea"),
  pad: hex("#efd8b6"),
  socket: hex("#b7c8dc"),
  blush: hex("#f3a7b0"),
  flipper: hex("#7f9cb8"),
  flipperTip: hex("#62809f"),
  eye: hex("#111318"),
  nose: hex("#2d3140"),
  freckle: hex("#6b5646"),
  mouth: hex("#9c4150"),
  smile: hex("#6e5a60"),
  tongue: hex("#e0707e"),
};

const tmp = new Color();
function bodyColour(p, n, out) {
  const hd = norm([p[0] - SKULL[0], p[1] - SKULL[1], p[2] - SKULL[2]]);
  const face = smoothstep(0.3, 0.85, hd[2]) * smoothstep(0.2, 0.45, p[2]);
  tmp.copy(COL.flank);
  tmp.lerp(COL.dorsal, smoothstep(0.3, 0.78, n[1]) * (1 - face));
  tmp.lerp(COL.belly, 1 - smoothstep(-0.55, -0.05, n[1]));
  tmp.lerp(COL.face, face);
  if (face > 0) {
    let pad = 0;
    for (const c of PAD_DIR) pad = Math.max(pad, gauss(hd, c, 0.2));
    tmp.lerp(COL.pad, smoothstep(0.3, 0.65, pad));
    let sock = 0;
    for (const c of EYE_DIR) sock = Math.max(sock, gauss(hd, c, 0.34));
    tmp.lerp(COL.socket, 0.45 * sock);
    let blush = 0;
    for (const c of CHEEK_DIR) blush = Math.max(blush, gauss(hd, c, 0.17));
    tmp.lerp(COL.blush, 0.35 * blush);
    // ink the smile groove too: the camera looks down on it, so its own
    // shadow alone never reaches the lens
    tmp.lerp(COL.smile, 0.6 * smileLine(hd));
  }
  out.push(tmp.r, tmp.g, tmp.b);
}

// ------------------------------------------------------------- the loft

// Side and top profile of the body without the head: top line, belly line,
// half width, by z. The skull ellipsoid is unioned on top of it.
const BODY_Z = [-0.98, -0.9, -0.75, -0.55, -0.3, -0.05, 0.15, 0.3, 0.45, 0.62];
const BODY_T = [0.15, 0.26, 0.38, 0.53, 0.67, 0.77, 0.85, 0.88, 0.78, 0.5];
const BODY_B = [0.15, 0.06, 0.0, -0.03, -0.03, -0.03, -0.02, 0.02, 0.1, 0.24];
const BODY_W = [0, 0.13, 0.23, 0.34, 0.43, 0.46, 0.43, 0.36, 0.26, 0];
const FLOOR = -0.015; // the belly sinks this far into the snow

function hermite(zs, vs) {
  const m = vs.map((_, i) => {
    const a = Math.max(i - 1, 0);
    const b = Math.min(i + 1, vs.length - 1);
    return (vs[b] - vs[a]) / (zs[b] - zs[a]);
  });
  return (z) => {
    if (z <= zs[0]) return vs[0];
    if (z >= zs.at(-1)) return vs.at(-1);
    let i = 0;
    while (z > zs[i + 1]) i++;
    const h = zs[i + 1] - zs[i];
    const t = (z - zs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const topB = hermite(BODY_Z, BODY_T);
const botB = hermite(BODY_Z, BODY_B);
const widB = hermite(BODY_Z, BODY_W);
const Z0 = BODY_Z[0];
const Z1 = SKULL[2] + SR[2];

function section(z) {
  let T = -Infinity;
  let B = Infinity;
  let W = 0;
  if (z <= BODY_Z.at(-1)) {
    T = topB(z);
    B = botB(z);
    W = Math.max(0, widB(z));
  }
  const u = (z - SKULL[2]) / SR[2];
  if (Math.abs(u) < 1) {
    const s = Math.sqrt(1 - u * u);
    T = smax(T, SKULL[1] + SR[1] * s, 0.24);
    B = smin(B, SKULL[1] - SR[1] * s, 0.08);
    W = smax(W, SR[0] * s, 0.06);
  } else if (z >= Z1) {
    T = B = SKULL[1];
    W = 0;
  }
  return { z, T, B, W };
}

const RINGS = 66; // including both poles
const AROUND = 48;

// Pole, rings, pole -> triangle indices; rows[i] is a list of vertex indices.
function lattice(rows) {
  const idx = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r];
    const b = rows[r + 1];
    const n = Math.max(a.length, b.length);
    for (let j = 0; j < n; j++) {
      const a0 = a[j % a.length];
      const a1 = a[(j + 1) % a.length];
      const b0 = b[j % b.length];
      const b1 = b[(j + 1) % b.length];
      if (a.length > 1) idx.push(a0, a1, b0);
      if (b.length > 1) idx.push(a1, b1, b0);
    }
  }
  return idx;
}

function geometryFrom(pos, idx, extra) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (extra) extra(g);
  return g;
}

// Makes the vertex at `probe` face `want`, flipping the winding if needed.
function orient(g, probe, want) {
  const n = g.attributes.normal;
  if (n.getX(probe) * want[0] + n.getY(probe) * want[1] + n.getZ(probe) * want[2] >= 0) return g;
  const index = g.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const t = index[i + 1];
    index[i + 1] = index[i + 2];
    index[i + 2] = t;
  }
  g.index.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function skin(g, weights) {
  g.setAttribute("skinIndex", new Uint16BufferAttribute(weights.index, 4));
  g.setAttribute("skinWeight", new Float32BufferAttribute(weights.weight, 4));
}

// Taubin smoothing (shrink-free): alternating +0.5 / -0.53 Laplacian steps,
// each vertex scaled by mask(x, y, z) in 0..1.
function relax(pos, idx, mask, iterations) {
  const n = pos.length / 3;
  const sets = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  const nb = sets.map((s) => [...s]);
  const w = Array.from({ length: n }, (_, i) => mask(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  const next = pos.slice();
  for (let it = 0; it < iterations * 2; it++) {
    const f = it % 2 === 0 ? 0.5 : -0.53;
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (const j of nb[i]) {
        ax += pos[j * 3];
        ay += pos[j * 3 + 1];
        az += pos[j * 3 + 2];
      }
      const k = (f * w[i]) / nb[i].length;
      next[i * 3] = pos[i * 3] + k * (ax - nb[i].length * pos[i * 3]);
      next[i * 3 + 1] = pos[i * 3 + 1] + k * (ay - nb[i].length * pos[i * 3 + 1]);
      next[i * 3 + 2] = pos[i * 3 + 2] + k * (az - nb[i].length * pos[i * 3 + 2]);
    }
    for (let i = 0; i < pos.length; i++) pos[i] = next[i];
  }
}

function buildTrunk() {
  // Fine table of sections, walked by arc length, denser on the face band
  // (11-50 degrees off the snout axis) so the groove and pads get vertices.
  const S = 6000;
  const tab = [];
  let acc = 0;
  let prev = null;
  for (let i = 0; i <= S; i++) {
    const s = section(Z0 + ((Z1 - Z0) * i) / S);
    if (prev) {
      const dz = s.z - prev.z;
      const ds = Math.max(Math.hypot(dz, s.W - prev.W), Math.hypot(dz, s.T - prev.T), Math.hypot(dz, s.B - prev.B));
      const th = Math.atan2(s.W / SR[0], (s.z - SKULL[2]) / SR[2]);
      const dens = s.z > SKULL[2] ? 1 + 1.8 * smoothstep(0.12, 0.25, th) * (1 - smoothstep(0.85, 1.0, th)) : 1;
      acc += ds * dens;
    }
    s.acc = acc;
    tab.push(s);
    prev = s;
  }

  const pos = [];
  const rows = [];
  const put = (x, y, z) => {
    // belly flattened into the snow
    y = smax(y, FLOOR, 0.03);
    // the face relief, radially from the skull centre
    const d = norm([x - SKULL[0], y - SKULL[1], z - SKULL[2]]);
    const relief = faceRelief(d);
    if (relief !== 0) {
      x += d[0] * relief;
      y += d[1] * relief;
      z += d[2] * relief;
    }
    pos.push(x, y, z);
    return pos.length / 3 - 1;
  };

  rows.push([put(0, tab[0].T, Z0)]);
  let k = 0;
  for (let r = 1; r < RINGS - 1; r++) {
    const target = (acc * r) / (RINGS - 1);
    while (tab[k + 1].acc < target) k++;
    const a = tab[k];
    const b = tab[k + 1];
    const t = (target - a.acc) / Math.max(b.acc - a.acc, 1e-9);
    const z = a.z + (b.z - a.z) * t;
    const T = a.T + (b.T - a.T) * t;
    const B = a.B + (b.B - a.B) * t;
    const W = a.W + (b.W - a.W) * t;
    const cy = (T + B) / 2;
    const hh = (T - B) / 2;
    const e = 2 / (2.5 - 0.5 * smoothstep(0.2, 0.45, z)); // superellipse: plush body, round head
    const row = [];
    for (let j = 0; j < AROUND; j++) {
      const phi = (TAU * j) / AROUND;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      row.push(put(W * Math.sign(c) * Math.abs(c) ** e, cy + hh * Math.sign(s) * Math.abs(s) ** e, z));
    }
    rows.push(row);
  }
  rows.push([put(0, SKULL[1], Z1)]);

  // The unions leave a crease where the back meets the skull: relax it away,
  // only in the neck zone, never on the face or the flat belly.
  const idx = lattice(rows);
  relax(pos, idx, (x, y, z) => {
    const hd = norm([x - SKULL[0], y - SKULL[1], z - SKULL[2]]);
    return smoothstep(-0.35, -0.05, z) * (1 - smoothstep(0.5, 0.7, z)) * (1 - smoothstep(0.2, 0.45, hd[2])) * smoothstep(0.02, 0.12, y);
  }, 14);
  const g = geometryFrom(pos, idx);
  orient(g, rows[Math.floor(RINGS / 2)][AROUND / 4], [0, 1, 0]);

  const col = [];
  const index = [];
  const weight = [];
  const n = g.attributes.normal;
  for (let i = 0; i < pos.length / 3; i++) {
    const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    bodyColour(p, [n.getX(i), n.getY(i), n.getZ(i)], col);
    const [a, wa, b, wb] = spineWeights(p[0], p[1], p[2]);
    index.push(a, b, 0, 0);
    weight.push(wa, wb, 0, 0);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  skin(g, { index, weight });
  return g;
}

// ---------------------------------------------------------- the flippers

// A pillow: a star-shaped outline in the U-V plane, domed on both sides.
// outline(phi) -> radius from the centre (u = cu, v = 0); phi = 0 points to
// the tip. thick(u) -> half thickness. colourAt(uFraction) and weightsAt(u)
// fill the other attributes.
function pillow({ origin, U, V, cu, outline, thick, colourAt, weightsAt, around = 28, rings = 5 }) {
  const N = norm(cross(U, V));
  const pos = [];
  const col = [];
  const index = [];
  const weight = [];
  const tipU = cu + outline(0);
  const add = (u, v, h) => {
    pos.push(
      origin[0] + U[0] * u + V[0] * v + N[0] * h,
      origin[1] + U[1] * u + V[1] * v + N[1] * h,
      origin[2] + U[2] * u + V[2] * v + N[2] * h,
    );
    const c = colourAt(u / tipU);
    col.push(c.r, c.g, c.b);
    const [a, wa, b, wb] = weightsAt(u);
    index.push(a, b, 0, 0);
    weight.push(wa, wb, 0, 0);
    return pos.length / 3 - 1;
  };
  const rows = [[add(cu, 0, thick(cu))]];
  const ring = (k, side) => {
    const rho = Math.sin(((k / rings) * Math.PI) / 2);
    const row = [];
    for (let j = 0; j < around; j++) {
      const phi = (TAU * j) / around;
      const r = outline(phi) * rho;
      const u = cu + r * Math.cos(phi);
      row.push(add(u, r * Math.sin(phi), side * thick(u) * Math.sqrt(Math.max(0, 1 - rho * rho))));
    }
    return row;
  };
  for (let k = 1; k <= rings; k++) rows.push(ring(k, 1));
  for (let k = rings - 1; k >= 1; k--) rows.push(ring(k, -1));
  rows.push([add(cu, 0, -thick(cu))]);
  const g = geometryFrom(pos, lattice(rows));
  orient(g, 0, N);
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  skin(g, { index, weight });
  return g;
}

// Mirror a left part to the right: x negated, winding reversed, the left
// flipper bone swapped for the right.
function mirror(g) {
  const m = g.clone();
  m.scale(-1, 1, 1);
  const index = m.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const t = index[i + 1];
    index[i + 1] = index[i + 2];
    index[i + 2] = t;
  }
  const si = m.attributes.skinIndex.array;
  for (let i = 0; i < si.length; i++) if (si[i] === BONE.flipperL) si[i] = BONE.flipperR;
  m.computeVertexNormals();
  return m;
}

const flipperTone = (f) => tmp.copy(COL.flipper).lerp(COL.flipperTip, smoothstep(0.35, 0.95, f));

function foreFlipper() {
  // out, 34 degrees down to the snow, swept 25 degrees back: a broad wedge,
  // the old pup's triangle silhouette
  const down = (34 * Math.PI) / 180;
  const back = (25 * Math.PI) / 180;
  const U = [Math.cos(down) * Math.cos(back), -Math.sin(down), -Math.cos(down) * Math.sin(back)];
  const V = norm([-U[2], 0, U[0]]); // horizontal, toward the nose
  const A = 0.37;
  return pillow({
    origin: SHOULDER,
    U,
    V,
    cu: 0.33,
    outline(phi) {
      const c = Math.cos(phi);
      const b = 0.185 * (1 - 0.25 * Math.max(0, c));
      let r = 1 / Math.hypot(c / A, Math.sin(phi) / b);
      // three rounded toes across the tip
      const a = Math.abs(Math.atan2(Math.sin(phi), c));
      r *= 1 + 0.07 * Math.cos((a * TAU) / 0.5) * (1 - smoothstep(0.55, 0.8, a));
      return r;
    },
    thick: (u) => 0.095 + (0.035 - 0.095) * smoothstep(0, 0.7, u),
    colourAt: flipperTone,
    weightsAt(u) {
      const w = smoothstep(0.06, 0.2, u);
      return [BONE.flipperL, w, BONE.chest, 1 - w];
    },
  });
}

function hindFlipper() {
  // Half of a fluke. The camera sees over the back to the snow behind the
  // tail, so the hind flippers always show above the head in the idle view:
  // two round lobes there read as bear ears. Lying side by side with
  // straight inner edges and wide flared outer edges, they read as one
  // notched tail fan instead.
  const U = norm([Math.sin((7 * Math.PI) / 180), -0.2, -Math.cos((7 * Math.PI) / 180)]);
  const V = norm([-U[2], 0, U[0]]); // outward
  return pillow({
    origin: [0.02, 0.1, -0.88],
    U,
    V,
    cu: 0.21,
    outline(phi) {
      const c = Math.cos(phi);
      const tip = Math.max(0, c) ** 0.6;
      const b = Math.sin(phi) > 0 ? 0.05 + 0.15 * tip : 0.04 + 0.012 * tip;
      return 1 / Math.hypot(c / 0.235, Math.sin(phi) / b);
    },
    thick: (u) => 0.048 + (0.02 - 0.048) * smoothstep(0, 0.44, u),
    colourAt: flipperTone,
    weightsAt: () => [BONE.tail, 1, 0, 0],
    around: 20,
    rings: 3,
  });
}

// The one skinned body geometry.
export function buildBody() {
  const fore = foreFlipper();
  const hind = hindFlipper();
  const parts = [buildTrunk(), fore, mirror(fore), hind, mirror(hind)];
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return g;
}

// ------------------------------------------------------------- face parts

function paint(g, colour) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  return g;
}

// Radius rx x ry x rz ellipsoid, its +z turned to `dir` (pitch only), at `at`.
function blob(r, at, dir, segs = [16, 12]) {
  const g = new SphereGeometry(1, segs[0], segs[1]);
  g.scale(r[0], r[1], r[2]);
  g.rotateX(Math.atan2(-dir[1], Math.hypot(dir[0], dir[2])));
  g.rotateY(Math.atan2(dir[0], dir[2]));
  g.translate(at[0], at[1], at[2]);
  return g;
}

// Everything that sits on the face, in the head frame. The eyes and their
// catchlights are built around eyePivot (both eye centres share its height),
// so one scale.y on their group squashes both into a blink line.
export function buildFace() {
  const eyes = EYE_DIR.map((d) => {
    const r = skullR(d) + faceRelief(d) - 0.008;
    const at = [d[0] * r, d[1] * r, d[2] * r];
    // the lens's own frame, to put the catchlights on its surface
    const ex = norm(cross([0, 1, 0], d));
    const ey = cross(d, ex);
    const surface = (w, sink) => {
      const lx = dot(w, ex);
      const ly = dot(w, ey);
      const lz = dot(w, d);
      const R = 1 / Math.hypot(Math.hypot(lx, ly) / EYE_R, lz / (EYE_R * EYE_DEPTH)) - sink;
      return [at[0] + w[0] * R, at[1] + w[1] * R, at[2] + w[2] * R];
    };
    return { at, dir: d, ex, ey, surface };
  });
  const pivot = [0, eyes[0].at[1], eyes[0].at[2]];
  const local = (v) => [v[0] - pivot[0], v[1] - pivot[1], v[2] - pivot[2]];

  const lenses = mergeGeometries(
    eyes.map((e) => paint(blob([EYE_R, EYE_R, EYE_R * EYE_DEPTH], local(e.at), e.dir, [22, 14]), COL.eye)),
    false,
  );

  // catchlights: upper-left as the camera sees a seal facing it (sun front-left)
  const glints = [];
  for (const e of eyes) {
    const a = new SphereGeometry(0.032, 10, 6);
    a.translate(...local(e.surface(norm([-0.03, 0.035, 0.08]), 0.012)));
    const b = new SphereGeometry(0.014, 6, 4);
    b.translate(...local(e.surface(norm([0.035, -0.03, 0.08]), 0.004)));
    glints.push(a, b);
  }
  const glintGeometry = mergeGeometries(glints, false);
  for (const g of glints) g.dispose();

  // Charcoal lines lying on the face where the eyes are: ^^ arches for
  // happy (bend +1), a closed-eye curve for a blink (bend -1).
  const lines = (bend) => {
    const arches = eyes.map((e) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const th = (-1 + i / 6) * 1.25;
        const u = 0.085 * Math.sin(th);
        const v = bend > 0 ? -0.035 + 0.06 * Math.cos(th) : 0.01 - 0.045 * Math.cos(th);
        const [at] = onFace(
          [e.at[0] + e.ex[0] * u + e.ey[0] * v, e.at[1] + e.ex[1] * u + e.ey[1] * v, e.at[2] + e.ex[2] * u + e.ey[2] * v],
          0.006,
        );
        pts.push(new Vector3(...at));
      }
      return paint(new TubeGeometry(new CatmullRomCurve3(pts), 16, 0.02, 5), COL.eye);
    });
    const g = mergeGeometries(arches, false);
    for (const a of arches) a.dispose();
    return g;
  };
  const happyEyes = lines(1);
  const shutEyes = lines(-1);

  const dark = [];
  // nose: a rounded triangle, wide at the top
  const [noseAt] = onFace(NOSE_DIR, 0.004);
  const nose = new SphereGeometry(1, 16, 10);
  const p = nose.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setXYZ(i, p.getX(i) * 0.07 * (1 + 0.32 * y), y * 0.045 + 0.012 * (1 - Math.abs(p.getX(i))) * Math.max(0, y), p.getZ(i) * 0.042);
  }
  nose.rotateX(Math.atan2(-NOSE_DIR[1], NOSE_DIR[2]));
  nose.translate(...noseAt);
  nose.computeVertexNormals();
  dark.push(paint(nose, COL.nose));
  // freckles, five a pad
  const FRECKLES = [
    [-0.025, 0.03],
    [0.03, 0.035],
    [0.065, 0.0],
    [-0.005, -0.02],
    [0.045, -0.04],
  ];
  for (const side of [1, -1]) {
    for (const [ox, oy] of FRECKLES) {
      const x = side * (PAD_AT[0] + ox);
      const y = PAD_AT[1] + oy;
      const z = SR[2] * Math.sqrt(Math.max(0, 1 - (x / SR[0]) ** 2 - (y / SR[1]) ** 2));
      const [at, d] = onFace([x, y, z], -0.001);
      dark.push(paint(blob([0.017, 0.017, 0.006], at, d, [8, 4]), COL.freckle)); // a flat dot, not a bead
    }
  }
  const darkGeometry = mergeGeometries(dark, false);
  for (const g of dark) g.dispose();

  // open mouth: a dark-rose oval with a tongue, half sunk under the pads
  const [mouthAt] = onFace(MOUTH_DIR, -0.016);
  const mouth = mergeGeometries(
    [
      paint(blob([0.07, 0.052, 0.03], [0, 0, 0], [0, 0, 1], [14, 8]), COL.mouth),
      paint(blob([0.042, 0.026, 0.026], [0, -0.022, 0.012], [0, 0, 1], [10, 6]), COL.tongue),
    ],
    false,
  );
  mouth.rotateX(Math.atan2(-MOUTH_DIR[1], MOUTH_DIR[2]));

  return { eyePivot: pivot, lenses, glints: glintGeometry, happyEyes, shutEyes, dark: darkGeometry, mouth, mouthAt };
}
