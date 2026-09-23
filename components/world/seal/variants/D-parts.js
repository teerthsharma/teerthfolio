// Geometry for seal variant D: the cutest harp-seal pup, a chibi. The head is
// over half the pup (a round skull with chubby cheeks and a low snout), the
// eyes are huge glossy lenses set low and wide, the nose tiny, the whisker
// pads round and freckled; behind the head a plump body tapers to a little
// forked tail, with short fore-flippers splayed out onto the snow.
//
// Every part is built once, in the seal's body frame at rest (origin on the
// snow under the middle of the body, +z the nose, +y up, +x the seal's own
// left), painted with vertex colours, then moved so its origin is the pivot
// it turns about. Face parts are in the head frame: origin the skull centre
// PIVOT.head. Pure three.js, no React.

import { BufferAttribute, Color, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Where each part turns, in the body frame (metres).
export const PIVOT = {
  rear: [0, 0, -0.62], // the galumph rocks the chest up about the hips' contact
  neck: [0, 0.4, 0.28],
  head: [0, 0.6, 0.44], // skull centre: the head group's origin
  shoulder: [0.34, 0.17, 0.12], // left; the right one is its mirror
  tail: [0, 0.13, -0.84],
};

// Skull radii (x, y, z) before the cheeks and snout swell it.
export const SKULL = [0.52, 0.47, 0.5];
export const EYE_R = 0.13;
// The eye is a lens, flattened along its axis and sunk into the skull, so it
// bulges only ~1.4 cm: a far eye never pokes past the head's silhouette.
const EYE_DEPTH = 0.3;
const EYE_SINK = 0.025;

// Fore-flippers at rest (rad), Euler order YZX: (twist, back, -down). Splayed
// out like a starfish, tips on the snow: the old pup's triangle silhouette.
export const FLIPPER_REST = { back: 0.3, down: 0.3 };

const COL = {
  dorsal: new Color("#86aad6"), // the old pup's blue on crown and saddle: body value against the snow
  flank: new Color("#d3e2f1"), // ice-white coat
  belly: new Color("#f8eee0"), // warm ivory underside, face and chin
  pad: new Color("#f0d9bd"),
  freckle: new Color("#76614f"),
  ink: new Color("#20232c"),
  navy: new Color("#33456b"), // the glow low in each eye
  flipper: new Color("#7d9dc7"),
  tip: new Color("#5a7aa8"),
  blush: new Color("#f7909f"),
  rose: new Color("#a3405a"),
  tongue: new Color("#ec7f8e"),
  white: new Color("#ffffff"),
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// exp falloff of a unit direction d around direction (x, y, z), sigma in rad.
const gauss = (d, x, y, z, sigma) => Math.exp((-2 * (1 - (d.x * x + d.y * y + d.z * z) / Math.hypot(x, y, z))) / (sigma * sigma));

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

// A frame whose +z is `normal` and whose +x stays level.
function frameOn(normal) {
  const x = new Vector3(0, 1, 0).cross(normal).normalize();
  const y = normal.clone().cross(x);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, normal));
}
const place = (g, q, p) => g.applyQuaternion(q).translate(p.x, p.y, p.z);

// ---------------------------------------------------------------- the head

// The skull surface along unit direction d (head frame): an ellipsoid with
// chubby cheeks low on each side and a snout swelling under the eyes.
export function skullPoint(d, out) {
  const cheeks = gauss(d, 0.55, -0.55, 0.63, 0.4) + gauss(d, -0.55, -0.55, 0.63, 0.4);
  const snout = gauss(d, 0, -0.42, 0.9, 0.4);
  return out.set(d.x * SKULL[0], d.y * SKULL[1], d.z * SKULL[2]).addScaledVector(d, 0.06 * cheeks + 0.07 * snout);
}

// Point and outward normal of the skull along a direction.
function surface(dir) {
  const d = dir.clone().normalize();
  const t1 = new Vector3(0, 1, 0).cross(d).normalize();
  const t2 = d.clone().cross(t1);
  const at = (a, b) => skullPoint(d.clone().addScaledVector(t1, a).addScaledVector(t2, b).normalize(), new Vector3());
  const e = 1e-3;
  const du = at(e, 0).sub(at(-e, 0));
  const dv = at(0, e).sub(at(0, -e));
  return { p: at(0, 0), normal: du.cross(dv).normalize() };
}

// Head: a pale-blue crown (the camera sees it most), ice-white sides, a warm
// ivory face and chin.
function headCoat(p, q, out) {
  out.copy(COL.flank).lerp(COL.dorsal, smooth(-0.35, 0.85, q.y - 0.6 * q.z));
  out.lerp(COL.belly, Math.max(smooth(0.2, 0.9, q.z) * (1 - smooth(0, 0.8, q.y)), smooth(-0.25, -0.7, q.y)));
}

const EYE_DIR = [new Vector3(0.5, -0.1, 0.86), new Vector3(-0.5, -0.1, 0.86)];
const PAD = [new Vector3(0.08, -0.215, 0.49), new Vector3(-0.08, -0.215, 0.49)];
const PAD_R = 0.105;
export const MOUTH = [0, -0.315, 0.485]; // open mouth centre, head frame

function head() {
  const d = new Vector3();
  const parts = [paint(blob(44, 30, (q) => skullPoint(d.copy(q).normalize(), q)), headCoat)];
  for (const [i, s] of [1, -1].entries()) {
    const pad = PAD[i];
    parts.push(paint(blob(14, 9, (q) => q.multiplyScalar(PAD_R).add(pad)), solid(COL.pad)));
    // Freckles, the whisker spots, on the front of each pad.
    const base = new Vector3(s * 0.45, -0.2, 0.87).normalize();
    const u = new Vector3(0, 1, 0).cross(base).normalize();
    const w = base.clone().cross(u);
    for (const [a, b] of [[-0.4, 0.3], [0.05, 0.42], [0.45, 0.22], [-0.2, -0.08], [0.26, -0.14]]) {
      const dir = base.clone().addScaledVector(u, a * s).addScaledVector(w, b).normalize();
      const at = pad.clone().addScaledVector(dir, PAD_R * 0.96);
      parts.push(paint(blob(6, 4, (q) => q.multiplyScalar(0.016).add(at)), solid(COL.freckle)));
    }
    // The "w" of the mouth: an ink line round the bottom of each pad.
    const lip = new TorusGeometry(PAD_R * 0.97, 0.012, 6, 14, Math.PI - 0.7);
    lip.deleteAttribute("uv");
    lip.rotateZ(Math.PI + 0.35).rotateX(-0.2).translate(pad.x, pad.y, pad.z + 0.025);
    parts.push(paint(lip, solid(COL.ink)));
    // Blush: a soft pink oval on each cheek, under and outside the eye.
    const cheek = surface(new Vector3(s * 0.6, -0.42, 0.68));
    const rim = new Color();
    headCoat(null, cheek.normal, rim);
    const blush = paint(blob(12, 6, (q) => q.set(q.x * 0.1, q.y * 0.062, q.z * 0.012)), (p, q, out) =>
      out.copy(rim).lerp(COL.blush, 0.8 * (1 - smooth(0.35, 1, Math.hypot(p.x / 0.1, p.y / 0.062)))));
    parts.push(place(blush, frameOn(cheek.normal), cheek.p.addScaledVector(cheek.normal, 0.003)));
  }
  // Nose: a tiny rounded triangle, wide on top, on the snout between the pads.
  parts.push(paint(blob(16, 10, (q) => {
    const w = 0.55 + 0.45 * (q.y + 1) * 0.5;
    return q.set(q.x * 0.068 * w, q.y * 0.044 - 0.118, q.z * 0.04 + 0.556);
  }), solid(COL.ink)));
  // and the wet glint on it.
  parts.push(paint(blob(8, 5, (q) => q.multiplyScalar(0.013).add(new Vector3(-0.024, -0.098, 0.592))), solid(COL.white)));
  return mergeGeometries(parts);
}

// The two eyes: centre, outward normal and frame, head frame. Low on the
// face (just under the skull centre) and wide apart: one eye's width between.
function eyeFrames() {
  return EYE_DIR.map((dir, i) => {
    const { p, normal } = surface(dir);
    return { side: i ? -1 : 1, surface: p, normal, quaternion: frameOn(normal), center: p.clone().addScaledVector(normal, -EYE_SINK) };
  });
}

// Glossy black lens with a navy glow in its lower third.
function lens(e) {
  const g = new SphereGeometry(EYE_R, 24, 14);
  g.deleteAttribute("uv");
  g.scale(1, 1, EYE_DEPTH);
  paint(g, (p, q, out) => out.copy(COL.ink).lerp(COL.navy, 0.85 * smooth(-0.15, -0.9, p.y / EYE_R)));
  return place(g, e.quaternion, e.center);
}

// Catchlights: a big one upper-left from the camera (the sun is front-left),
// a small one lower-right, flat on the lens.
function glints(e) {
  return [[0.042, -0.046, 0.048], [0.02, 0.052, -0.05]].map(([r, x, y]) => {
    const z = EYE_DEPTH * Math.sqrt(EYE_R * EYE_R - x * x - y * y);
    const g = blob(10, 7, (q) => q.set(q.x * r + x, q.y * r + y, q.z * r * 0.2 + z));
    return place(g, e.quaternion, e.center);
  });
}

// Ink arcs lying on the face where each eye sits: ^^ for happy (an arch),
// and the softly closed eye (a shallow curve, lower, like a smile) for a
// blink, a hard bump and the meditation.
function eyeArc(e, radius, arc, spin, y) {
  const g = new TorusGeometry(radius, 0.025, 8, 18, arc);
  g.deleteAttribute("uv");
  g.rotateZ(spin).translate(0, y, 0);
  paint(g, solid(COL.ink));
  return place(g, e.quaternion, e.surface.clone().addScaledVector(e.normal, 0.012));
}
const happyEye = (e) => eyeArc(e, 0.085, Math.PI - 0.5, 0.25, -0.03);
const shutEye = (e) => eyeArc(e, 0.14, 1.5, -Math.PI / 2 - 0.75, 0.1);

// ---------------------------------------------------------------- the body

const BELLY = -0.02; // the belly is flat and pressed 2 cm into the snow

// The body's silhouette, nose to tail: [z, half-width, top, bottom] (m).
// Plump in the middle, tucked under the chin at the front.
const PROFILE = [
  [0.6, 0.24, 0.5, 0.16],
  [0.32, 0.42, 0.68, -0.02],
  [0.02, 0.47, 0.72, -0.04],
  [-0.3, 0.43, 0.63, -0.04],
  [-0.56, 0.32, 0.48, -0.02],
  [-0.77, 0.19, 0.33, 0.03],
  [-0.93, 0.1, 0.25, 0.08],
];

// Catmull-Rom through PROFILE at z: [half-width, top, bottom].
function profile(z) {
  const last = PROFILE.length - 1;
  let i = 0;
  while (i < last - 1 && z < PROFILE[i + 1][0]) i++;
  const t = Math.min(1, Math.max(0, (PROFILE[i][0] - z) / (PROFILE[i][0] - PROFILE[i + 1][0])));
  const k = (j) => PROFILE[Math.min(last, Math.max(0, j))];
  const [a, b, cc, d] = [k(i - 1), k(i), k(i + 1), k(i + 2)];
  return [1, 2, 3].map((m) => 0.5 * (2 * b[m] + (cc[m] - a[m]) * t + (2 * a[m] - 5 * b[m] + 4 * cc[m] - d[m]) * t * t + (3 * b[m] - a[m] - 3 * cc[m] + d[m]) * t * t * t));
}

// Countershading by height round the silhouette: pale-blue saddle on top,
// ice-white flanks, warm ivory belly.
function coat(p, q, out) {
  const [, top, bottom] = profile(p.z);
  const up = (2 * p.y - top - bottom) / (top - bottom);
  out.copy(COL.flank).lerp(COL.dorsal, smooth(0.05, 0.8, up));
  out.lerp(COL.belly, smooth(-0.1, -0.6, up));
}

// The silhouette between z0 and z1 with rounded ends, the belly pressed
// flat: a sphere whose poles (its y axis) become the body axis.
function body(z0, z1) {
  return paint(blob(32, 24, (q) => {
    const ring = Math.hypot(q.x, q.z) || 1;
    const end = Math.cbrt(1 - Math.abs(q.y) ** 3);
    const z = z0 + (q.y + 1) * 0.5 * (z1 - z0);
    const [w, top, bottom] = profile(z);
    const y = (top + bottom) / 2 - (q.z / ring) * ((top - bottom) / 2) * end;
    return q.set((q.x / ring) * w * end, Math.max(BELLY, y), z);
  }), coat);
}

// Left fore-flipper in its own frame: root at the origin, reaching along +x,
// a long broad paddle, the tip curling up a little so it lies on the snow.
function flipper() {
  return paint(blob(22, 12, (q) => {
    const t = (q.x + 1) * 0.5;
    return q.set(-0.06 + t * 0.74, q.y * (0.075 - 0.02 * t) + 0.06 * t * t, q.z * (0.2 - 0.07 * t));
  }), (p, q, out) => out.copy(COL.flipper).lerp(COL.tip, smooth(0.2, 0.6, p.x)));
}

// Hind flippers: two little lobes in a 50-degree V, in the tail's frame,
// tips down to the snow.
function tail() {
  return mergeGeometries([1, -1].map((s) => {
    const lobe = paint(blob(16, 10, (q) => q.set(q.x * 0.12, q.y * 0.05, q.z * 0.17 - 0.15)), (p, q, out) =>
      out.copy(COL.flipper).lerp(COL.tip, smooth(-0.1, -0.3, p.z)));
    return lobe.rotateX(-0.3).rotateY(-s * 0.44).translate(s * 0.04, 0, 0);
  }));
}

const at = (g, pivot) => g.translate(-pivot[0], -pivot[1], -pivot[2]);

// The open mouth for happy: dark rose with a pink tongue, facing forward-down.
function mouth() {
  return mergeGeometries([
    paint(blob(14, 8, (q) => q.set(q.x * 0.075, q.y * 0.055, q.z * 0.03)), solid(COL.rose)),
    paint(blob(12, 8, (q) => q.set(q.x * 0.048, q.y * 0.026 - 0.022, q.z * 0.024 + 0.016)), solid(COL.tongue)),
  ]).rotateX(-0.55);
}

export function buildSealD() {
  const eyes = eyeFrames();
  // Both eyes sit at one height, so a single pivot squashes them for a blink.
  const eyePivot = [0, eyes[0].center.y, eyes[0].center.z];
  const back = (g) => at(g, eyePivot);
  return {
    body: at(body(-0.95, 0.62), PIVOT.rear),
    head: head(),
    flipper: flipper(),
    tail: tail(),
    lenses: back(mergeGeometries(eyes.map(lens))),
    glints: back(mergeGeometries(eyes.flatMap(glints))),
    happyEyes: mergeGeometries(eyes.map(happyEye)),
    shutEyes: mergeGeometries(eyes.map(shutEye)),
    mouth: mouth(),
    eyePivot,
  };
}
