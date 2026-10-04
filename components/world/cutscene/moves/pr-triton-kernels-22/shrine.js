// THE MALEVOLENT SHRINE, the hero. A towering four-tier temple of dark wood on a stepped bone-grey base:
// swept roofs with upturned eaves and kicked corners, red lacquer pillars, and in the first hall a
// gaping MOUTH framed by an upper jaw of hanging fangs and a lower jaw that swings (its own mesh) with
// upward fangs; horns curling off every roof corner and ridge end; ox skulls stacked on the eaves; two
// huge clawed hands rising from the ground to grip the lower roof; mounds of skulls and bones heaped
// round the base (instanced). Frame: the shrine's centre on the ground, its face toward +z.
// Everything is drawn by the ink material (ink.js); the hero spends its triangles here.

import { IcosahedronGeometry } from "three";
import { K, Mesher, hash } from "./ink";

const NOMOVE = [0, 0, 0, 1];
const WOOD = [K.wood, 0.15, 0, 0.3];
const WOOD2 = [K.wood, 0.2, 0, 0.7];
const BONE = [K.bone, 0.88, 0, 0.5];
const STONE = [K.solid, 0.62, 0, 0.2];
const ROOF = [K.roof, 0.26, 0, 0.4];
const LAC = [K.lacquer, 0.55, 0, 0.5];
const TOOTH = [K.bone, 0.97, 0, 0.5]; // the jaws' teeth: bright ivory so the mouth reads
const BLACK = [K.solid, 0, 0, 0];

export const MOUTH = [0, 8.2, 9.2]; // the mouth's middle, local
export const HINGE = [0, 5.2, 6.0]; // the lower jaw's pivot
export const TOP = 47;

// a point transformed by yaw + scale + offset (for hands, skulls)
const place = (cx, cy, cz, s, ry) => (p) => {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  return [cx + s * (p[0] * c + p[2] * sn), cy + s * p[1], cz + s * (p[2] * c - p[0] * sn)];
};

function oxSkull(M, cx, cy, cz, s, ry, tilt = 0) {
  const T = (p) => {
    const q = place(0, 0, 0, 1, 0)([p[0], p[1] * Math.cos(tilt) - p[2] * Math.sin(tilt), p[1] * Math.sin(tilt) + p[2] * Math.cos(tilt)]);
    return place(cx, cy, cz, s, ry)(q);
  };
  const box = (x, y, z, sx, sy, sz, info = BONE, rot = [0, 0, 0]) => {
    const [px, py, pz] = T([x, y, z]);
    M.box(px, py, pz, sx * s, sy * s, sz * s, info, NOMOVE, [rot[0] + tilt, rot[1] + ry, rot[2]]);
  };
  box(0, 0.1, 0, 0.92, 0.55, 0.72);
  box(0, 0.4, 0.22, 1.02, 0.18, 0.34);
  box(0, -0.2, 0.72, 0.5, 0.4, 0.82);
  box(0, -0.3, 1.18, 0.42, 0.28, 0.24);
  for (const sd of [-1, 1]) {
    box(sd * 0.3, 0.12, 0.36, 0.22, 0.22, 0.1, BLACK);
    box(sd * 0.1, -0.22, 1.31, 0.1, 0.1, 0.06, BLACK);
    const path = [[0.42, 0.34, 0.0], [0.82, 0.46, -0.02], [1.22, 0.62, 0.08], [1.5, 0.98, 0.3], [1.56, 1.46, 0.52], [1.46, 1.9, 0.62]].map(([x, y, z]) => T([sd * x, y, z]));
    M.tube(path, [0.17 * s, 0.15 * s, 0.11 * s, 0.075 * s, 0.045 * s, 0], BONE, NOMOVE, 4);
  }
}

// a horn: a tapered tube along a curve from a root, outward direction (ox, oz), curling up
function horn(M, root, ox, oz, len, r) {
  const path = [
    root,
    [root[0] + ox * 0.25 * len, root[1] + 0.3 * len, root[2] + oz * 0.25 * len],
    [root[0] + ox * 0.62 * len, root[1] + 0.68 * len, root[2] + oz * 0.62 * len],
    [root[0] + ox * 0.82 * len, root[1] + 1.1 * len, root[2] + oz * 0.82 * len],
    [root[0] + ox * 0.66 * len, root[1] + 1.5 * len, root[2] + oz * 0.66 * len],
  ];
  M.tube(path, [r, r * 0.85, r * 0.6, r * 0.34, 0], BONE, NOMOVE, 4);
}

function fang(M, x, y, z, w, len, down, info = BONE) {
  const base = [[x - w, y, z - w], [x + w, y, z - w], [x + w, y, z + w], [x - w, y, z + w]];
  M.pyramid(base, [x, y + (down ? -len : len), z], info, NOMOVE, false);
}

function hand(M, ox, oy, oz, yaw, scale, mirror) {
  const T = place(ox, oy, oz, scale, yaw);
  const m = (p) => T([mirror * p[0], p[1], p[2]]);
  // palm and back of the hand, knuckle blocks
  M.box(...m([0, 0, 0]), 5 * scale, 1.4 * scale, 5.4 * scale, BONE, NOMOVE, [0, yaw, 0]);
  M.box(...m([0, 0.85, -0.4]), 4.2 * scale, 0.5 * scale, 4.2 * scale, BONE, NOMOVE, [0, yaw, 0]);
  // four fingers curl over the eave
  const lens = [0.92, 1.12, 1.18, 0.98];
  for (let f = 0; f < 4; f++) {
    const x = -1.8 + f * 1.2;
    const L = lens[f];
    const path = [[x, 0.1, 2.5], [x, 0.0, 4.2 * L], [x, -1.0, 6.0 * L], [x, -2.9, 7.1 * L], [x, -4.6, 6.8 * L], [x, -5.9 * L, 6.0 * L]].map(m);
    M.tube(path, [0.66 * scale, 0.58 * scale, 0.5 * scale, 0.42 * scale, 0.33 * scale, 0], BONE, NOMOVE, 4);
    // a knuckle block at each joint
    for (const j of [1, 2, 3]) M.box(...path[j], 1.15 * scale * 0.9, 1.0 * scale * 0.9, 1.15 * scale * 0.9, BONE, NOMOVE, [0, yaw, 0.4]);
  }
  // the thumb, off to the side
  const th = [[2.8, -0.1, -1.0], [4.4, -0.5, 0.7], [5.2, -1.7, 2.4], [5.0, -3.1, 3.6], [4.4, -4.3, 3.9]].map(m);
  M.tube(th, [0.8 * scale, 0.7 * scale, 0.58 * scale, 0.45 * scale, 0], BONE, NOMOVE, 4);
  // the forearm back to the ground, with a spine of bone spurs
  const arm = [[0, 0.2, -2.7], [0, -1.2, -7.5], [0, -4.5, -12.5], [0, -9.5, -16.5], [0, -14.5, -19.0]].map(m);
  M.tube(arm, [1.5 * scale, 1.8 * scale, 2.1 * scale, 2.4 * scale, 2.6 * scale], BONE, NOMOVE, 5);
  for (let i = 0; i < 4; i++) {
    const a = arm[i + 0];
    const b = arm[i + 1];
    M.pyramid([[a[0] - 0.5, a[1] + 1.6, a[2] - 0.5], [a[0] + 0.5, a[1] + 1.6, a[2] - 0.5], [a[0] + 0.5, a[1] + 1.6, a[2] + 0.5], [a[0] - 0.5, a[1] + 1.6, a[2] + 0.5]], [(a[0] + b[0]) / 2, a[1] + 4.4, (a[2] + b[2]) / 2], BONE, NOMOVE, false);
  }
}

export function buildShrine() {
  const M = new Mesher();
  const J = new Mesher();

  // ---- the base: three bone-grey steps, a stair
  M.box(0, 0.8, 0, 54, 1.6, 34, STONE);
  M.box(0, 2.4, 0, 46, 1.6, 28, STONE);
  M.box(0, 4.0, 0, 40, 1.6, 24, STONE);
  for (let i = 0; i < 8; i++) {
    const d = (8 - i) * 0.9;
    M.box(0, ((i + 1) * 0.6) / 2, 12 + d / 2, 11, (i + 1) * 0.6, d, STONE);
  }

  // ---- the first hall, its front pulled apart into a mouth
  M.box(0, 8.9, -2, 34, 8.2, 14, WOOD);
  for (const sd of [-1, 1]) M.box(sd * 12, 8.9, 7, 10, 8.2, 4, WOOD2);
  M.box(0, 12.3, 7, 14, 1.4, 4, WOOD);
  // the throat: red-lit dark behind the teeth
  M.poly([[-7, 4.8, 5.05], [7, 4.8, 5.05], [7, 11.6, 5.05], [-7, 11.6, 5.05]], [K.throat, 0.5, 0, 0.1], NOMOVE, 0b1111, [0, 8, 0]);
  M.poly([[-7, 4.82, 5.05], [-7, 4.82, 9], [7, 4.82, 9], [7, 4.82, 5.05]], [K.throat, 0.5, 0, 0.1], NOMOVE, 0, [0, 0, 7]);
  M.poly([[-7, 11.6, 5.05], [7, 11.6, 5.05], [7, 11.6, 9], [-7, 11.6, 9]], [K.throat, 0.5, 0, 0.1], NOMOVE, 0, [0, 20, 7]);
  // the upper jaw: a bone gum above the opening with hanging fangs, two great canines
  M.box(0, 12.1, 9.6, 19, 1.9, 2.4, BONE);
  const lens = [2.2, 2.9, 2.5, 3.2, 2.6, 3.2, 2.5, 2.9, 2.2];
  lens.forEach((l, i) => fang(M, -6.4 + i * 1.6, 11.2, 9.9, 0.62 * 1.6, l * 1.6, true, TOOTH));
  for (const sd of [-1, 1]) fang(M, sd * 5.4, 11.2, 10.5, 0.95 * 1.6, 4.4 * 1.6, true, TOOTH);
  for (const sd of [-1, 1]) horn(M, [sd * 9.6, 12.5, 10.3], sd, 0.2, 5, 0.65); // tusks off the gum
  // the pillars, lacquer red with bone caps
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = sd * (9.1 + i * 2.6);
      const ring = (y, r) => Array.from({ length: 6 }, (_, k) => [x + r * Math.cos((k / 6) * Math.PI * 2), y, 9.7 + r * Math.sin((k / 6) * Math.PI * 2)]);
      const lo = ring(4.8, 0.7);
      const hi = ring(11.8, 0.6);
      for (let k = 0; k < 6; k++) M.poly([lo[k], lo[(k + 1) % 6], hi[(k + 1) % 6], hi[k]], LAC, NOMOVE, 0, [x, 8, 9.7]);
      M.box(x, 12.1, 9.7, 1.7, 0.5, 1.7, BONE);
      M.box(x, 5.1, 9.7, 1.7, 0.6, 1.7, BONE);
    }
  }
  // the lower jaw (its own mesh, hinged at the back): a slab with upward fangs and canines
  J.box(0, 0, 3.5, 17, 0.9, 7.2, BONE);
  [1.8, 2.3, 2.8, 2.4, 2.9, 2.4, 2.8, 2.3, 1.8].forEach((l, i) => fang(J, -6.4 + i * 1.6 + 0.0, 0.45, 5.6, 0.55 * 1.6, l * 1.6, false, TOOTH));
  for (const sd of [-1, 1]) fang(J, sd * 4.2, 0.45, 6.8, 0.9 * 1.6, 3.8 * 1.6, false, TOOTH);
  for (const sd of [-1, 1]) J.box(sd * 8.4, 0.3, 4.6, 1.4, 1.5, 6, BONE);

  // ---- the four tiers: a roof, a hall on it, the next roof
  const roofs = [
    { w: 52, d: 34, y0: 13.0, rise: 5.2, curl: 3.4, th: 0.9, nz: 10 },
    { w: 38, d: 24, y0: 23.0, rise: 4.4, curl: 3.0, th: 0.8, nz: 8 },
    { w: 26, d: 17, y0: 31.4, rise: 3.6, curl: 2.6, th: 0.7, nz: 6 },
    { w: 15, d: 11, y0: 38.0, rise: 3.0, curl: 2.0, th: 0.6, nz: 6 },
  ];
  const halls = [
    null,
    { w: 22, d: 12, y: 17.6, h: 5.4 },
    { w: 15, d: 8.5, y: 26.4, h: 5.0 },
    { w: 8, d: 5.5, y: 34.4, h: 3.6 },
  ];
  const hf = [];
  roofs.forEach((r, i) => {
    const h = M.roof(r.w, r.d, r.y0, r.rise, r.curl, r.th, ROOF, 16, r.nz);
    hf.push(h);
    const hl = halls[i];
    if (hl) {
      M.box(0, hl.y + hl.h / 2, 0, hl.w, hl.h, hl.d, WOOD);
      // a row of lacquer pillars across each hall's face, a bone frieze above
      const n = Math.max(3, Math.round(hl.w / 3.2));
      for (let k = 0; k < n; k++) M.box(-hl.w / 2 + 1.2 + ((hl.w - 2.4) * k) / (n - 1), hl.y + hl.h / 2, hl.d / 2 + 0.3, 0.7, hl.h - 0.4, 0.7, LAC);
      M.box(0, hl.y + hl.h - 0.4, hl.d / 2 + 0.35, hl.w + 0.5, 0.6, 0.8, BONE);
      M.box(0, hl.y + 0.3, hl.d / 2 + 0.35, hl.w + 0.5, 0.6, 0.8, BONE);
    }
    // horns off the four corners, longer on the lower tiers; the ridge ends kick up in a curl
    const k = r.w / 52;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) horn(M, [(sx * r.w) / 2, h((sx * r.w) / 2, (sz * r.d) / 2), (sz * r.d) / 2], sx, sz * 0.6, 7.5 * k + 2.2, 0.55 * k + 0.2);
      horn(M, [(sx * r.w) / 2, h((sx * r.w) / 2, 0), 0], sx * 0.7, 0, 10 * k + 3, 0.7 * k + 0.25);
    }
  });
  // the finial: a curved spike with a bone collar
  M.tube([[0, 41, 0], [0, 43.4, 0.1], [0, 45.4, 0.4], [0, 47, 0.8]], [0.8, 0.55, 0.32, 0], BONE, NOMOVE, 4);
  M.box(0, 41.3, 0, 2.2, 0.5, 2.2, BONE);

  // ---- the ox skulls stacked on the roofs: a great one over the mouth, pairs on the corners of tiers 1 and 2
  oxSkull(M, 0, hf[0](0, 12) + 1.6, 12, 3.4, 0, -0.25);
  oxSkull(M, 0, hf[1](0, 8) + 1.1, 8, 2.4, 0, -0.25);
  oxSkull(M, 0, hf[2](0, 5.5) + 0.8, 5.5, 1.7, 0, -0.25);
  for (const sx of [-1, 1]) {
    oxSkull(M, sx * 15, hf[0](sx * 15, 15.6) + 1.2, 15.6, 2.1, sx * 0.3, -0.2);
    oxSkull(M, sx * 22, hf[0](sx * 22, 12) + 1.0, 12, 1.8, sx * 0.55, -0.15);
    oxSkull(M, sx * 9, hf[1](sx * 9, 9.6) + 0.9, 9.6, 1.6, sx * 0.25, -0.2);
  }

  // ---- the hands: huge, clawed, rising from the ground to grip the corners of the lower roof
  for (const sd of [-1, 1]) hand(M, sd * 24.5, hf[0](sd * 24.5, 9) + 1.0, 9, -sd * (Math.PI / 2), 1.5, sd);

  // ---- the skulls and the bones (instanced)
  const sk = new Mesher();
  const ico = new IcosahedronGeometry(0.5, 0).toNonIndexed();
  const P = ico.attributes.position;
  for (let i = 0; i < P.count; i += 3) {
    const v = [0, 1, 2].map((k) => [P.getX(i + k) * 1.0, P.getY(i + k) * 0.86 + 0.08, P.getZ(i + k) * 1.1]);
    sk.poly(v, BONE, NOMOVE, 0b111, [0, 0.1, 0]);
  }
  sk.box(0, -0.36, 0.22, 0.46, 0.26, 0.4, BONE);
  sk.box(-0.17, 0.03, 0.47, 0.2, 0.2, 0.08, BLACK);
  sk.box(0.17, 0.03, 0.47, 0.2, 0.2, 0.08, BLACK);
  sk.box(0, -0.12, 0.52, 0.1, 0.12, 0.08, BLACK);
  const bone = new Mesher();
  bone.box(0, 0, 0, 0.14, 1.0, 0.14, BONE);
  for (const e of [-1, 1]) {
    bone.box(-0.1, e * 0.5, 0, 0.18, 0.18, 0.2, BONE);
    bone.box(0.1, e * 0.5, 0, 0.18, 0.18, 0.2, BONE);
  }

  // mounds: skulls heaped on a dome, bones jutting out
  const mounds = [[-20, 21, 9, 3.6, 110], [21, 22, 9, 3.4, 110], [-7.5, 24, 4.6, 2.2, 42], [8, 25, 4.6, 2.3, 42], [-33, 6, 6, 2.6, 36], [33, 4, 6, 2.6, 36]];
  const skulls = [];
  const bones = [];
  mounds.forEach(([mx, mz, r, hgt, n], mi) => {
    for (let i = 0; i < n; i++) {
      const a = hash(i, mi * 3 + 1) * Math.PI * 2;
      const q = Math.sqrt(hash(i, mi * 3 + 2)) * 0.98;
      const x = mx + Math.cos(a) * q * r;
      const z = mz + Math.sin(a) * q * r * 0.8;
      const y = hgt * (1 - q * q) * (0.85 + 0.3 * hash(i, 5)) + 0.3;
      skulls.push({ x, y, z, s: 0.9 + 0.9 * hash(i, mi + 7), rx: (hash(i, 8) - 0.5) * 1.2, ry: hash(i, 9) * 6.28, rz: (hash(i, 10) - 0.5) * 1.2 });
    }
    for (let i = 0; i < n / 3; i++) {
      const a = hash(i, mi * 5 + 11) * Math.PI * 2;
      const q = Math.sqrt(hash(i, mi * 5 + 12)) * 1.05;
      bones.push({ x: mx + Math.cos(a) * q * r, y: hgt * (1 - Math.min(1, q * q)) * 0.9 + 0.6, z: mz + Math.sin(a) * q * r * 0.8, s: 1.4 + 1.8 * hash(i, 13), rx: (hash(i, 14) - 0.5) * 3, ry: hash(i, 15) * 6.28, rz: (hash(i, 16) - 0.5) * 3 });
    }
  });
  // skulls along the front eaves of the first two roofs
  for (let i = 0; i < 20; i++) {
    const x = -23 + i * 2.42;
    skulls.push({ x, y: hf[0](x, 17) + 0.55, z: 17.1, s: 1.15, rx: -0.15, ry: 0, rz: 0 });
  }
  for (let i = 0; i < 14; i++) {
    const x = -16 + i * 2.46;
    skulls.push({ x, y: hf[1](x, 12) + 0.5, z: 12.1, s: 1.05, rx: -0.15, ry: 0, rz: 0 });
  }
  // a rubble of skulls up the stair's cheeks
  for (let i = 0; i < 18; i++) {
    const sd = i % 2 ? 1 : -1;
    skulls.push({ x: sd * (6.4 + hash(i, 3) * 1.6), y: 0.4 + hash(i, 4) * 1.8, z: 13 + hash(i, 5) * 6, s: 0.9 + 0.4 * hash(i, 6), rx: 0, ry: hash(i, 7) * 6, rz: 0 });
  }

  // a pile of 14 skulls at the foot of the stair, in front of the mouth
  for (let i = 0; i < 14; i++) skulls.push({ x: (i - 6.5) * 1.7 + (hash(i, 21) - 0.5), y: 0.6 + 0.9 * hash(i, 22) + (i % 3 === 1 ? 1.1 : 0), z: 21 + 3.5 * hash(i, 23), s: 1.7 + 0.5 * hash(i, 24), rx: (hash(i, 25) - 0.5) * 0.5, ry: (hash(i, 26) - 0.5) * 1.2, rz: 0 });

  return { body: M.geometry(), jaw: J.geometry(), skull: sk.geometry(), bone: bone.geometry(), skulls, bones, tris: M.tris + J.tris };
}
