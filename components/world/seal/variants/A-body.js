// Seal A's body: the old pup's deformed sphere (lib/seal-manifold.js, ported,
// not imported), rebuilt in the seal frame (+z nose, +y up, +x the seal's own
// left) and in metres. Pure: A-body.check.mjs builds and measures it in node.
//
// canonical attribute = the unit-sphere point each vertex came from, in the
// same frame: (lateral, up, axial). The shader paints and skins from it, so
// colour zones and joints never slide when the surface moves.
//
// buildSealBody() also measures where the face goes (anchors), by casting rays
// from the skull centre at the finished surface: eyes, nose and mouth sit on
// the skin that was actually built, not on a guess.

import { BufferGeometry, Float32BufferAttribute } from "three";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gaussian = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));

const LENGTH = 2.05; // m, tail tip to nose
const SHIFT_Z = -0.03; // nose at +1.0, tail at -1.05
const SINK = 0.05; // the lowest 3 cm of belly clamp flat at y = -0.02

export const FLIPPER_AT = 0.1; // canonical axial of the fore-flipper blades

// Fore-flipper amount of a canonical point, 0 on the body .. 1 at the tip.
// The shader has the same function (A-skin.js): paint and skinning weights.
export function foreFlipper(cx, cy, cz) {
  const rad = Math.hypot(cx, cy);
  const lat = rad > 1e-6 ? Math.abs(cx) / rad : 0;
  return gaussian(cz, FLIPPER_AT, 0.24) * lat ** 6 * smoothstep(0.2, 0.82, rad);
}

// Old frame: +x nose, y up, z lateral. Returns [x, y, z] in that frame.
function deform(axial, radial, phi) {
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const head = gaussian(axial, 0.68, 0.3);
  const neck = gaussian(axial, 0.3, 0.16);
  const torso = gaussian(axial, -0.08, 0.72);
  const tail = smoothstep(0.42, 0.98, -axial);
  const lateral = Math.abs(sinPhi);
  const fore = foreFlipper(-radial * sinPhi, radial * cosPhi, axial);

  let x = axial + head * 0.06;
  // Chibi push on the old head terms (0.092 / 0.065): the skull is as wide as
  // the body and rides above the back.
  let y = radial * cosPhi * (0.33 + torso * 0.03 + head * 0.23);
  let z = radial * sinPhi * (0.45 + torso * 0.03 + head * 0.16);
  y *= 1 - neck * 0.16;
  z *= 1 - neck * 0.14;
  // A dip behind the skull on top only, so the head reads as a ball in profile.
  if (cosPhi > 0) y -= gaussian(axial, 0.28, 0.14) * 0.07 * cosPhi * radial;

  // Forked tail: side lobes aft, the centre pole forward.
  x += tail * (0.09 * (1 - lateral) - 0.15 * lateral);
  z *= 1 - tail * 0.18 * (1 - lateral);
  // Fore-flippers splay out and down to the snow; longer blades than the old
  // pup so they stick out past the body when seen from above.
  z *= 1 + fore * 0.85;
  y -= fore * 0.44;
  // Head rides up.
  y += smoothstep(0.1, 0.85, axial) * 0.42;
  if (y < 0) y *= 0.86;
  return [x, y, z];
}

// Nearest hit of a ray on an indexed mesh (Moller-Trumbore), or -1.
function raycast(pos, idx, o, d) {
  let best = Infinity;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3;
    const b = idx[i + 1] * 3;
    const c = idx[i + 2] * 3;
    const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
    const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tx = o[0] - pos[a], ty = o[1] - pos[a + 1], tz = o[2] - pos[a + 2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t > 1e-4 && t < best) best = t;
  }
  return best === Infinity ? -1 : best;
}

const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};

// The skull the face is measured from (sphere fit of the cranium, printed by
// A-body.check.mjs) and the head-local directions the face features are cast
// along (brief s.4, nudged to this head).
export const SKULL = [0, 0.628, 0.594];
export const SKULL_R = 0.43;
const DIR = {
  eye: [0.24, 0.15, 0.37],
  nose: [0, -0.08, 0.47],
  pad: [0.12, -0.16, 0.42],
  mouth: [0, -0.26, 0.4],
  blush: [0.27, -0.06, 0.36],
};

function surface(pos, idx, dir) {
  const d = norm(dir);
  const t = raycast(pos, idx, SKULL, d);
  return { at: SKULL.map((s, i) => s + d[i] * t), n: d, t };
}

// Two soft muzzle pads pushed out of the snout, so the nose sits between real
// bumps and the key light shades them.
function padBulges(pos, pads) {
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] - SKULL[0];
    const y = pos[i + 1] - SKULL[1];
    const z = pos[i + 2] - SKULL[2];
    if (z < 0.15) continue;
    let bump = 0;
    for (const { at } of pads) bump += Math.exp(-((pos[i] - at[0]) ** 2 + (pos[i + 1] - at[1]) ** 2 + (pos[i + 2] - at[2]) ** 2) / 0.0065);
    const len = Math.hypot(x, y, z) || 1;
    const d = Math.min(bump, 1) * 0.05;
    pos[i] += (x / len) * d;
    pos[i + 1] += (y / len) * d;
    pos[i + 2] += (z / len) * d;
  }
}

// Build: seg around, rings from tail pole to nose pole (~6k triangles).
export function buildSealBody({ seg = 64, rings = 48 } = {}) {
  const pos = [];
  const can = [];
  const push = (axial, radial, phi) => {
    const [ox, oy, oz] = deform(axial, radial, phi);
    // old (x nose, z lateral) -> seal frame (x left, z nose): a proper rotation.
    pos.push(-oz, oy, ox);
    can.push(-radial * Math.sin(phi), radial * Math.cos(phi), axial);
  };
  push(-1, 0, 0);
  for (let r = 1; r < rings; r++) {
    const theta = (r / rings) * Math.PI;
    for (let s = 0; s < seg; s++) push(-Math.cos(theta), Math.sin(theta), (s / seg) * Math.PI * 2);
  }
  push(1, 0, 0);
  const nose = pos.length / 3 - 1;
  const idx = [];
  for (let s = 0; s < seg; s++) idx.push(0, 1 + ((s + 1) % seg), 1 + s);
  for (let r = 0; r < rings - 2; r++) {
    const a0 = 1 + r * seg;
    const b0 = a0 + seg;
    for (let s = 0; s < seg; s++) {
      const s1 = (s + 1) % seg;
      idx.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s);
    }
  }
  const last = nose - seg;
  for (let s = 0; s < seg; s++) idx.push(nose, last + s, last + ((s + 1) % seg));

  // Metres: scale to length, then sit the belly on the snow.
  let minZ = Infinity;
  let maxZ = -Infinity;
  let minY = Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    minZ = Math.min(minZ, pos[i + 2]);
    maxZ = Math.max(maxZ, pos[i + 2]);
    minY = Math.min(minY, pos[i + 1]);
  }
  const k = LENGTH / (maxZ - minZ);
  const mid = (maxZ + minZ) / 2;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] *= k;
    pos[i + 1] = Math.max((pos[i + 1] - minY) * k - SINK, -0.02);
    pos[i + 2] = (pos[i + 2] - mid) * k + SHIFT_Z;
  }

  const mirror = (v) => [-v[0], v[1], v[2]];
  const pads = [surface(pos, idx, DIR.pad), surface(pos, idx, mirror(DIR.pad))];
  padBulges(pos, pads);

  // Shoulders: the middle of each flipper root (fore amount 0.08-0.2).
  const sh = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < can.length; i += 3) {
    const f = foreFlipper(can[i], can[i + 1], can[i + 2]);
    if (can[i] > 0 && f > 0.08 && f < 0.2) {
      sh[0] += pos[i];
      sh[1] += pos[i + 1];
      sh[2] += pos[i + 2];
      count++;
    }
  }
  const shoulder = sh.map((v) => v / count);

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("canonical", new Float32BufferAttribute(can, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();

  const anchors = {
    skull: SKULL,
    skullR: SKULL_R,
    // The head turns about the neck: behind and below the skull, where the
    // shader's head weight (canonical axial 0.30-0.62) starts.
    neck: [0, SKULL[1] - 0.15, SKULL[2] - 0.3],
    shoulder,
    eyes: [surface(pos, idx, DIR.eye), surface(pos, idx, mirror(DIR.eye))],
    nose: surface(pos, idx, DIR.nose),
    pads: [surface(pos, idx, DIR.pad), surface(pos, idx, mirror(DIR.pad))],
    mouth: surface(pos, idx, DIR.mouth),
    blush: [surface(pos, idx, DIR.blush), surface(pos, idx, mirror(DIR.blush))],
  };
  return { geometry: g, anchors };
}
