// Geometry for seal variant B: a harp-seal pup built like a vinyl toy, from
// smooth parts that overlap and articulate. Every part is built once, in the
// seal's body frame at rest (origin on the snow under the middle of the body,
// +z the nose, +y up, +x the seal's own left), painted with vertex colours,
// then moved so its origin is the pivot it turns about. No textures, no
// shaders: the sun's shadow follows every pose for free.
//
// Pure three.js, no React: `node components/world/seal/variants/B-check.js`
// builds it in node and checks the proportions.

import { BufferAttribute, Color, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Where each part turns, in the body frame (metres).
export const PIVOT = {
  chest: [0, 0.3, 0.1],
  neck: [0, 0.55, 0.35],
  head: [0, 0.62, 0.46], // skull centre: the head group's origin
  shoulder: [0.39, 0.28, 0.06], // left; the right one is its mirror
  hips: [0, 0.28, -0.25],
  tail: [0, 0.17, -0.8],
};

// Fore-flippers at rest (rad): swept back from straight out, and down, so
// the tips rest on the snow. Euler order YZX: (twist, back, -down).
export const FLIPPER_REST = { back: 0.35, down: 0.68 };

// Skull: radius 0.45 (HEAD_RADIUS), a touch flattened.
const SKULL = [0.45, 0.45 * 0.93, 0.45];
export const EYE_R = 0.095;
export const LID_R = EYE_R * 1.09;
export const MOUTH = [0, -0.235, 0.455]; // open mouth centre, head frame

const COL = {
  dorsal: new Color("#a6c5e6"), // ice-blue saddle: the pup's read on white snow
  flank: new Color("#dce8f2"),
  belly: new Color("#f6efe4"), // warm ivory belly, bib and face
  flipper: new Color("#7c9fc4"),
  tip: new Color("#5a7ca2"),
  pad: new Color("#ecd6ba"),
  freckle: new Color("#6f5d52"),
  ink: new Color("#2d3140"),
  blush: new Color("#f3a7b0"),
  rose: new Color("#9c4150"),
  tongue: new Color("#e0707e"),
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const v = new Vector3();
const n = new Vector3();
const c = new Color();

// A welded unit sphere reshaped by `shape` (mutates the vector in place),
// with smooth normals and no seam.
function blob(w, h, shape) {
  let g = new SphereGeometry(1, w, h);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    shape(v.fromBufferAttribute(p, i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Vertex colours from fn(position, normal, out).
function paint(g, fn) {
  const p = g.attributes.position;
  const nn = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    fn(v.fromBufferAttribute(p, i), n.fromBufferAttribute(nn, i), c);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}
const solid = (color) => (p, q, out) => out.copy(color);

// Countershading on chest and hips, by height round the silhouette (not by
// surface normal) so both parts agree across the joint: blue saddle on top,
// pale flanks, ivory belly and a bib under the chin.
function coat(p, q, out) {
  const [, top, bottom] = profile(p.z);
  const up = (2 * p.y - top - bottom) / (top - bottom);
  out.copy(COL.flank).lerp(COL.dorsal, smooth(0.2, 0.85, up));
  out.lerp(COL.belly, Math.max(smooth(-0.15, -0.6, up), smooth(0.45, 0.75, p.z) * (1 - smooth(-0.1, 0.45, up))));
}

// Head: a blue crown (the camera sees it most), ivory face and chin.
function headCoat(p, q, out) {
  out.copy(COL.flank).lerp(COL.dorsal, smooth(0.1, 0.6, q.y - 0.6 * q.z));
  out.lerp(COL.belly, Math.max(smooth(0.35, 0.75, q.z) * (1 - smooth(0.45, 0.8, q.y)), smooth(-0.2, -0.6, q.y)));
}

// Point on an ellipsoid (centre c, radii r) along a direction from its
// centre, and the surface normal there.
function onEllipsoid(c, r, dir) {
  const d = dir.clone().normalize();
  const p = d.multiplyScalar(1 / Math.hypot(d.x / r.x, d.y / r.y, d.z / r.z));
  const normal = new Vector3(p.x / r.x ** 2, p.y / r.y ** 2, p.z / r.z ** 2).normalize();
  return { p: p.add(c), normal };
}
const SKULL_C = new Vector3();
const SKULL_R = new Vector3(...SKULL);
const onSkull = (dir) => onEllipsoid(SKULL_C, SKULL_R, dir);
// Muzzle: the snout the pads sit on.
const MUZZLE_C = new Vector3(0, -0.12, 0.36);
const MUZZLE_R = new Vector3(0.28, 0.18, 0.16);

// A frame whose +z is `normal` and whose +x stays level.
function frameOn(normal) {
  const x = new Vector3(0, 1, 0).cross(normal).normalize();
  const y = normal.clone().cross(x);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, normal));
}

const place = (g, q, p) => g.applyQuaternion(q).translate(p.x, p.y, p.z);

// The two eyes' centres and frames, in the head frame: set into the skull
// with a quarter of each eye proud (more reads as frog eyes from the side
// and peeks over the crown from behind), one eye's width apart.
function eyeFrames() {
  return [1, -1].map((s) => {
    const x = s * 0.19;
    const y = 0.08;
    const z = SKULL[2] * Math.sqrt(1 - (x / SKULL[0]) ** 2 - (y / SKULL[1]) ** 2);
    const { p, normal } = onSkull(new Vector3(x, y, z));
    return { side: s, position: p.addScaledVector(normal, -EYE_R * 0.5), normal, quaternion: frameOn(normal) };
  });
}

function head() {
  const parts = [
    paint(blob(32, 24, (q) => q.set(q.x * SKULL[0], q.y * SKULL[1], q.z * SKULL[2])), headCoat),
    paint(blob(20, 12, (q) => q.multiply(MUZZLE_R).add(MUZZLE_C)), solid(COL.belly)),
  ];
  for (const s of [1, -1]) {
    const pad = new Vector3(s * 0.1, -0.14, 0.42);
    parts.push(paint(blob(16, 10, (q) => q.multiplyScalar(0.12).add(pad)), solid(COL.pad)));
    // Freckles on the front of each pad.
    const base = new Vector3(s * 0.5, -0.12, 0.86).normalize();
    const t1 = new Vector3(0, 1, 0).cross(base).normalize();
    const t2 = base.clone().cross(t1);
    for (const [a, b] of [[-0.42, 0.28], [0.02, 0.4], [0.42, 0.2], [-0.2, -0.1], [0.24, -0.16], [-0.02, -0.46]]) {
      const dir = base.clone().addScaledVector(t1, a * s).addScaledVector(t2, b).normalize();
      const at = pad.clone().addScaledVector(dir, 0.113);
      parts.push(paint(blob(8, 5, (q) => q.multiplyScalar(0.019).add(at)), solid(COL.freckle)));
    }
    // Blush: a pink sticker on the muzzle between eye and pad.
    const cheek = onEllipsoid(MUZZLE_C, MUZZLE_R, new Vector3(s * 0.2, 0.06, 0.1));
    const blush = paint(blob(12, 8, (q) => q.set(q.x * 0.075, q.y * 0.048, q.z * 0.015)), solid(COL.belly.clone().lerp(COL.blush, 0.6)));
    parts.push(place(blush, frameOn(cheek.normal), cheek.p));
  }
  // Nose: a rounded triangle, wide on top.
  parts.push(paint(blob(16, 10, (q) => {
    const w = 0.6 + 0.4 * (q.y + 1) * 0.5;
    return q.set(q.x * 0.08 * w, q.y * 0.05 - 0.07, q.z * 0.05 + 0.5);
  }), solid(COL.ink)));
  // Smile crease: a charcoal arc tucked under the pads.
  const crease = new TorusGeometry(0.06, 0.019, 6, 16, 1.9);
  crease.deleteAttribute("uv");
  crease.rotateZ(-Math.PI / 2 - 0.95).rotateX(-0.55).translate(0, -0.2, 0.47);
  parts.push(paint(crease, solid(COL.ink)));
  return mergeGeometries(parts);
}

// Left fore-flipper in its own frame: root at the origin, reaching along +x,
// wide along z, thin along y; the tip curls up a little so it lies on the snow.
function flipper() {
  return paint(blob(18, 10, (q) => {
    const t = (q.x + 1) * 0.5;
    return q.set(-0.08 + t * 0.6, q.y * (0.068 - 0.008 * t) + 0.07 * t * t, q.z * (0.2 - 0.07 * t));
  }), (p, q, out) => out.copy(COL.flipper).lerp(COL.tip, smooth(0.2, 0.5, p.x)));
}

// Hind flippers: two lobes in a 50-degree V, in the tail's frame.
function tail() {
  return mergeGeometries([1, -1].map((s) => {
    const lobe = paint(blob(16, 10, (q) => q.set(q.x * 0.13, q.y * 0.06, q.z * 0.19 - 0.17)), (p, q, out) =>
      out.copy(COL.flipper).lerp(COL.tip, smooth(-0.12, -0.3, p.z)));
    return lobe.rotateX(0.12).rotateY(-s * 0.44).translate(s * 0.05, 0, 0);
  }));
}

const BELLY = -0.02; // the belly is flat and pressed 2 cm into the snow

// The body's silhouette, nose to tail: [z, half-width, top, bottom] (m).
// Chest and hips are both cut from it, so where the chest's back end tucks
// into the hips the two surfaces agree and read as one soft fold.
const PROFILE = [
  [0.8, 0.24, 0.56, 0.16],
  [0.55, 0.4, 0.82, -0.06],
  [0.25, 0.44, 0.9, -0.1],
  [-0.05, 0.44, 0.8, -0.1],
  [-0.35, 0.39, 0.64, -0.08],
  [-0.65, 0.28, 0.47, -0.03],
  [-0.9, 0.17, 0.34, 0.04],
  [-1.1, 0.1, 0.27, 0.1],
];

// Catmull-Rom through PROFILE at z: [half-width, top, bottom].
function profile(z) {
  const last = PROFILE.length - 1;
  let i = 0;
  while (i < last - 1 && z < PROFILE[i + 1][0]) i++;
  const t = Math.min(1, Math.max(0, (PROFILE[i][0] - z) / (PROFILE[i][0] - PROFILE[i + 1][0])));
  const k = (j) => PROFILE[Math.min(last, Math.max(0, j))];
  const [a, b, c, d] = [k(i - 1), k(i), k(i + 1), k(i + 2)];
  return [1, 2, 3].map((m) => 0.5 * (2 * b[m] + (c[m] - a[m]) * t + (2 * a[m] - 5 * b[m] + 4 * c[m] - d[m]) * t * t + (3 * b[m] - a[m] - 3 * c[m] + d[m]) * t * t * t));
}

// The stretch of the silhouette between z0 and z1 with rounded ends, the
// belly pressed flat. A sphere whose poles (its y axis) become the body axis.
function loft(z0, z1, shrink) {
  return paint(blob(26, 20, (q) => {
    const ring = Math.hypot(q.x, q.z) || 1;
    const end = Math.cbrt(1 - Math.abs(q.y) ** 3);
    const z = z0 + (q.y + 1) * 0.5 * (z1 - z0);
    const [w, top, bottom] = profile(z);
    const y = (top + bottom) / 2 - (q.z / ring) * ((top - bottom) / 2) * end * shrink;
    return q.set((q.x / ring) * w * end * shrink, Math.max(BELLY, y), z);
  }), coat);
}

// An eyelid: a thin shell over the eye, a cap round +y (upper) or -y
// (lower), its rim inked so a shut eye reads as a line and the happy squint
// as a bold ^.
function lid(upper, color) {
  const r = upper ? LID_R : LID_R * 0.985;
  const g = new SphereGeometry(r, 16, 9, 0, Math.PI * 2, upper ? 0 : Math.PI * 0.44, Math.PI * 0.56);
  g.deleteAttribute("uv");
  return paint(g, (p, q, out) => {
    const polar = Math.acos(Math.min(1, Math.max(-1, p.y / r)));
    const fromRim = upper ? Math.PI * 0.56 - polar : polar - Math.PI * 0.44;
    out.copy(color).lerp(COL.ink, 1 - smooth(0.12, 0.3, fromRim));
  });
}

const at = (g, pivot) => g.translate(-pivot[0], -pivot[1], -pivot[2]);

export function buildSealB() {
  const eyes = eyeFrames();
  const lidColor = new Color();
  headCoat(null, eyes[0].normal, lidColor);
  const catchlights = [];
  for (const e of eyes) {
    for (const [r, off] of [[0.032, [-0.03, 0.025, 0.085]], [0.014, [0.035, -0.035, 0.08]]]) {
      const p = new Vector3(...off).normalize().multiplyScalar(EYE_R * 0.97).add(e.position);
      catchlights.push(blob(8, 6, (q) => q.multiplyScalar(r).add(p)));
    }
  }
  const mouth = mergeGeometries([
    paint(blob(14, 8, (q) => q.set(q.x * 0.095, q.y * 0.07, q.z * 0.04)), solid(COL.rose)),
    paint(blob(12, 8, (q) => q.set(q.x * 0.06, q.y * 0.032 - 0.025, q.z * 0.03 + 0.022)), solid(COL.tongue)),
  ]).rotateX(-0.5);
  return {
    chest: at(loft(-0.52, 0.8, 1), PIVOT.chest),
    hips: at(loft(-1.1, 0.05, 0.985), PIVOT.hips),
    tail: tail(),
    flipper: flipper(),
    head: head(),
    eyes: mergeGeometries(eyes.map((e) => blob(18, 12, (q) => q.multiplyScalar(EYE_R).add(e.position)))),
    catchlights: mergeGeometries(catchlights),
    lidUp: lid(true, lidColor),
    lidLow: lid(false, lidColor),
    mouth,
    eyeFrames: eyes,
  };
}
