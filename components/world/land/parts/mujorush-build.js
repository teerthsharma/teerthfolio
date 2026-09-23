// Mount MujoRush's stone, as geometry: pure, built once, no React.
//
//   buildCliff()  the carved south face: one smooth granite sheet that rises
//                 sheer from the foot of the massif (the edge of its three
//                 LAND_COLLIDERS circles), rolls over a rounded lip and
//                 covers the top as a smooth dome, so the rough terrain
//                 (lib/world/terrain.js's MUJO cone plus its ridged noise)
//                 never shows where the faces are. Its ends round down into
//                 the rough rock beside it, the way Rushmore's carving does.
//   buildHeads()  the three seal heads carved out of it, one per MuJoCo
//                 contribution, merged by material: granite, pink granite
//                 (blush, a tongue), dark stone inlay (nose, mouth, freckles,
//                 a wink, spectacles), gold (the collar studs) and one
//                 magenta collar per face (animated on its own).
//   EYES, SPARKS  the glossy eyes and their catchlights (instanced, so they
//                 blink and follow the seal); TALUS, CRYSTALS, FLOATERS.
//
// Local layout, world metres: each face stands on its place's x; the talus
// heap fills the reading point's collision circle (z = -50, r = 2.5), the
// neck and collar rise behind it, the head above, its crown lost in the
// uncarved rock. The carved relief comes forward of the cliff only above
// the seal's height.

import { BoxGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, BufferGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../../lib/world/land.js";
import { PLACE_BY_ID } from "../../../../lib/world/places.js";

export const FACES = [
  { id: "pr-mujoco-3396", collar: "#3396", look: "smile" },
  { id: "pr-mujoco-warp-1541", collar: "#1541", look: "wink" },
  { id: "pr-mujoco-3450", collar: "#3450", look: "specs" },
].map((f) => ({ ...f, x: PLACE_BY_ID[f.id].x, place: PLACE_BY_ID[f.id] }));

export const COLLAR_Y = 1.9; // the band's centre height
export const COLLAR_FRONT = -52.0; // z of the band's front, where the number sits
const MOUND_Z = -50.3;

const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (i, k) => {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

// ---- the cliff ----------------------------------------------------------------

// The massif's foot: the southmost edge of its three big circles (the fourth,
// the west shoulder at z = -58, stays rough rock).
const RIDGE = LAND_COLLIDERS.filter((c) => c.land === "mujorush" && c.z < -62);
export function zFront(x) {
  let z = -62;
  for (const c of RIDGE) {
    const dx = x - c.x;
    if (Math.abs(dx) < c.radius) z = Math.max(z, c.z + Math.sqrt(c.radius * c.radius - dx * dx));
  }
  return z;
}

// lib/world/terrain.js's MUJO cone (not exported there): the smooth form of
// the massif. The sheet follows it LID m up, which is above the terrain's
// ridged relief everywhere (at most +2.9 m), with the ridge line rounded.
const MUJO = { ax: -52, az: -65, bx: -24, bz: -66, h: 32, r: 23 };
const LID = 3.2;
function dome(x, z) {
  const sx = MUJO.bx - MUJO.ax;
  const sz = MUJO.bz - MUJO.az;
  const t = Math.min(1, Math.max(0, ((x - MUJO.ax) * sx + (z - MUJO.az) * sz) / (sx * sx + sz * sz)));
  const d = Math.hypot(x - MUJO.ax - sx * t, z - MUJO.az - sz * t);
  const u = (Math.sqrt(d * d + 9) - 3) / MUJO.r;
  return LID + (u < 1 ? MUJO.h * Math.pow(1 - u, 0.75) : -(u - 1) * MUJO.h * 0.6);
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export const CLIFF_X = [-53.6, -17.4];
const TAPER = 3.6; // m over which each end rounds down into the rough rock
const SHEER = 16; // m of rise per m back: the carved face stands near vertical
// Rows, in metres back from the foot: dense up the sheer face and round the lip.
const D = [-0.38, -0.3, -0.24, -0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18, 0.27, 0.36, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.05, 1.15, 1.4, 1.7, 2.1, 2.6, 3.2, 4, 5, 6.2, 7.6, 9.2, 11, 13, 15.2, 17.6, 20.2];

function taper(x) {
  const [x0, x1] = CLIFF_X;
  const u = Math.max(0, (x0 + TAPER - x) / TAPER, (x - (x1 - TAPER)) / TAPER);
  return Math.sqrt(Math.max(0, 1 - u * u));
}

// The uncarved rock the heads are cut from: above the collars the sheet
// swells forward SWELL m, so each head's crown and the gaps between the
// heads are one mass of granite and the faces come out of it in relief
// (Rushmore's heads are never freestanding busts), then steps back into a
// snowy ledge above them.
const SWELL = 2.2;
const swell = (y) => SWELL * s01(2, 6.5, y) * (1 - s01(11, 16, y));

// The sheet at column x, d m back from the foot: its height and its z.
export function sheetAt(x, d) {
  const t = taper(x);
  let y = smin(SHEER * (d + 0.3), dome(x, zFront(x) - d), 4.5);
  if (d >= D[D.length - 1]) y -= 9; // the back edge tucks under the rock
  y = y * t - (1 - t) * 1.2;
  return { y, z: zFront(x) - d + swell(y) * t };
}

const GRANITE_LOW = new Color("#9d8f8a"); // at the foot, in the talus's shade
const GRANITE = new Color("#c3b3aa"); // the carved face
const SNOW = new Color("#faf6f0");

export function buildCliff() {
  const NX = 76;
  const rows = D.length;
  const pos = new Float32Array(NX * rows * 3);
  for (let i = 0; i < NX; i++) {
    const x = CLIFF_X[0] + ((CLIFF_X[1] - CLIFF_X[0]) * i) / (NX - 1);
    for (let j = 0; j < rows; j++) {
      const k = (i * rows + j) * 3;
      const { y, z } = sheetAt(x, D[j]);
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z;
    }
  }
  const index = [];
  for (let i = 0; i < NX - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = a + rows;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();

  // Colour from shape: pale carved granite on the steep, snow where it can
  // lie (the lip and the dome), darker at the foot; long vertical streaks of
  // weathering so the sheet never reads as plastic.
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.length);
  const c = new Color();
  for (let v = 0; v < NX * rows; v++) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const streak = 0.94 + 0.06 * Math.sin(x * 0.83 + 1.6 * Math.sin(y * 0.31 + x * 0.17));
    c.copy(GRANITE_LOW).lerp(GRANITE, s01(-0.5, 4.5, y)).multiplyScalar(streak);
    c.lerp(SNOW, s01(0.52, 0.78, nrm.getY(v)) * s01(4, 9, y));
    col[v * 3] = c.r;
    col[v * 3 + 1] = c.g;
    col[v * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
  return geo;
}

// ---- the heads ----------------------------------------------------------------

const m4 = new Matrix4();
const q = new Quaternion();
const e = new Euler();
const p = new Vector3();
const s = new Vector3();
function piece(list, geo, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  e.set(rx, ry, rz);
  q.setFromEuler(e);
  m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
  const g = geo.clone();
  g.applyMatrix4(m4);
  list.push(g);
}
// A point on an ellipsoid's surface along (unit-ised) direction dir, pulled
// `inset` of the way back to the centre.
function onSurface([cx, cy, cz], [rx, ry, rz], [dx, dy, dz], inset = 0) {
  const l = Math.hypot(dx, dy, dz);
  const f = 1 - inset;
  return [cx + (rx * dx * f) / l, cy + (ry * dy * f) / l, cz + (rz * dz * f) / l];
}

// Head parts, relative to the face's x (world y and z).
const CRANIUM = { c: [0, 5.8, -54.7], r: [4.0, 2.9, 2.8] };
const CHEEK = { c: [2.25, 4.4, -53.1], r: 1.9 };
const PAD = { c: [0.88, 4.15, -51.75], r: [1.1, 0.88, 0.9] };
const EYE = { c: [1.85, 6.2, -52.35], r: [0.74, 0.82, 0.45] };

// Eyes: big glossy dark inlays, each with a catchlight up-left (the sun's
// side). The winking face's left eye is shut (drawn in the dark inlay).
export const EYES = []; // { face, x, y, z, sx, sy, sz }
export const SPARKS = []; // catchlights, one per eye: { x, y, z, r } relative to its eye
FACES.forEach((f, fi) => {
  for (const sg of [-1, 1]) {
    if (f.look === "wink" && sg < 0) continue;
    EYES.push({ face: fi, x: f.x + sg * EYE.c[0], y: EYE.c[1], z: EYE.c[2], sx: EYE.r[0], sy: EYE.r[1], sz: EYE.r[2] });
    SPARKS.push({ x: -0.22, y: 0.3, z: 0.4, r: 0.2 });
  }
});

export function buildHeads() {
  const UNIT = new SphereGeometry(1, 32, 22);
  const SMALL = new SphereGeometry(1, 14, 10);
  const RING = new CylinderGeometry(1, 1, 1, 40, 1);
  const BOX = new BoxGeometry(1, 1, 1);
  const SMILE = new TorusGeometry(0.27, 0.12, 6, 12, Math.PI);
  const granite = [];
  const blush = [];
  const dark = [];
  const gold = [];
  const collars = [];

  for (const f of FACES) {
    const fx = f.x;
    // the neck, flat-backed into the cliff, and the collar band round it
    piece(granite, RING, fx, 1.3, -53.8, 3.3, 4, 1.6);
    piece(granite, BOX, fx, 1.3, -55.8, 6.6, 4, 4);
    const band = [];
    piece(band, RING, fx, COLLAR_Y, -53.8, 3.48, 1.3, 1.8);
    piece(band, BOX, fx, COLLAR_Y, -55.7, 6.96, 1.3, 3.8);
    collars.push(mergeGeometries(band, false));
    // gold studs round the band either side of the number: a proper collar
    for (const dx of [2.2, 2.7, 3.12]) {
      const dz = 1.8 * Math.sqrt(1 - (dx / 3.48) ** 2);
      for (const sg of [-1, 1]) piece(gold, SMALL, fx + sg * dx, COLLAR_Y, -53.8 + dz, 0.2);
    }

    // the head: a wide dome, chubby cheeks, puffed whisker pads, a small chin
    piece(granite, UNIT, fx, CRANIUM.c[1], CRANIUM.c[2], ...CRANIUM.r);
    for (const sg of [-1, 1]) {
      piece(granite, UNIT, fx + sg * CHEEK.c[0], CHEEK.c[1], CHEEK.c[2], CHEEK.r);
      piece(granite, UNIT, fx + sg * PAD.c[0], PAD.c[1], PAD.c[2], ...PAD.r);
      // rosy pink-granite blush, low and wide on each cheek
      const b = onSurface([sg * CHEEK.c[0], CHEEK.c[1], CHEEK.c[2]], [CHEEK.r, CHEEK.r, CHEEK.r], [sg * 0.5, 0.18, 0.85], 0.19);
      piece(blush, UNIT, fx + b[0], b[1], b[2], 0.62);
      // freckles on the whisker pads, the pup's own
      for (const [dx, dy] of [[0.22, 0.12], [0.55, 0.02], [0.38, -0.3]]) {
        const fr = onSurface([sg * PAD.c[0], PAD.c[1], PAD.c[2]], PAD.r, [sg * dx, dy, 0.92], 0.03);
        piece(dark, SMALL, fx + fr[0], fr[1], fr[2], 0.12);
      }
    }
    piece(granite, UNIT, fx, 3.3, -52.0, 0.68); // chin
    piece(dark, UNIT, fx, 5.0, -51.55, 0.55, 0.38, 0.42); // nose
    // mouth: a little omega under the pads
    for (const sg of [-1, 1]) piece(dark, SMILE, fx + sg * 0.27, 3.42, -51.33, 1, 1, 1, 0.25, 0, Math.PI);

    // round the eyes (EYES): a wink, or Rushmore's one pair of spectacles
    for (const sg of [-1, 1]) {
      const [ex, ey, ez] = [fx + sg * EYE.c[0], EYE.c[1], EYE.c[2]];
      if (f.look === "wink" && sg < 0) piece(dark, new TorusGeometry(0.55, 0.14, 6, 14, Math.PI), ex, ey - 0.15, ez + 0.3, 1, 1, 1, 0, -0.45, 0);
      if (f.look === "specs") piece(dark, new TorusGeometry(1.0, 0.14, 8, 28), ex, ey, ez + 0.36, 1, 1, 1, 0, sg * 0.42, 0);
    }
    if (f.look === "specs") piece(dark, BOX, fx, 6.4, -51.93, 1.6, 0.22, 0.24);
    if (f.look === "wink") piece(blush, UNIT, fx + 0.22, 3.12, -51.3, 0.34, 0.2, 0.32, 0.3, 0, -0.25); // tongue out
  }

  return {
    granite: mergeGeometries(granite, false),
    blush: mergeGeometries(blush, false),
    dark: mergeGeometries(dark, false),
    gold: mergeGeometries(gold, false),
    collars,
  };
}

// ---- the rubble, the radioactive crystals, the floating boulders --------------

function moundY(dx, dz) {
  const k = 1 - (dx / 2.9) ** 2 - (dz / 2.5) ** 2;
  return -0.25 + 1.35 * Math.sqrt(Math.max(0, k));
}

// Talus: under each face a heap of blasted granite with blocks piled on its
// back and sides, and a spill at the cliff's foot in each gap between faces.
export const TALUS = [];
// Crystals: chunky prisms of the district's radiation poking out of the talus.
export const CRYSTALS = [];
FACES.forEach((f, fi) => {
  TALUS.push({ x: f.x, y: -0.15, z: MOUND_Z, r: 2.6, sy: 0.46, sz: 0.9, ry: 0.4 + fi, rx: 0 }); // the heap itself
  [[-2.3, -1.2, 0.75], [2.4, -0.9, 0.66], [-1.2, -2.0, 0.55], [1.3, -2.1, 0.6], [-2.9, 0.6, 0.45], [3.0, 0.4, 0.5], [0.3, -2.4, 0.45], [-3.4, -1.9, 0.5]].forEach(([dx, dz, r], k) => {
    TALUS.push({ x: f.x + dx, y: Math.max(0, moundY(dx, dz)) + r * 0.3, z: MOUND_Z + dz, r, ry: hash(fi, k) * 6.3, rx: hash(k, fi) * 0.8 });
  });
  [[-1.9, -1.6, 1.1, -0.35], [2.1, -1.4, 0.9, 0.4], [-0.5, -2.3, 0.75, 0.12]].forEach(([dx, dz, h, tilt]) => {
    CRYSTALS.push({ x: f.x + dx, y: moundY(dx, dz) - 0.15, z: MOUND_Z + dz, h, r: 0.34, tilt, ry: hash(fi + 3, h) * 6.3 });
  });
});
for (const gx of [-40.5, -29.5]) {
  const zf = zFront(gx);
  [[-0.9, 0.6, 0.85], [0.7, 0.9, 0.7], [0.1, 1.9, 0.5]].forEach(([dx, dz, r], k) => {
    TALUS.push({ x: gx + dx, y: r * 0.3, z: zf + dz, r, ry: hash(gx, k) * 6.3, rx: hash(k, gx) * 0.8 });
  });
  CRYSTALS.push({ x: gx + 1.3, y: -0.1, z: zf + 0.9, h: 1.3, r: 0.4, tilt: 0.3, ry: 1.1 });
}

// The anomaly: granite boulders that broke off the cliff and never came
// down, hanging in the gaps between the faces and bobbing on their own
// slow beat, charged with the radiation's glow.
export const FLOATERS = [];
[-50.9, -40.5, -29.5, -19.1].forEach((gx, gi) => {
  [[2.6, 0.82], [5.3, 0.66], [7.9, 0.55]].forEach(([y0, r], k) => {
    const y = y0 + (hash(k, gi) - 0.5) * 0.8;
    FLOATERS.push({
      x: gx + (hash(gi, k) - 0.5) * 1.4,
      y,
      z: zFront(gx) + swell(y) * taper(gx) + r + 0.9 + hash(gi + 5, k) * 0.5, // just off the rock it broke from
      r,
      phase: hash(gi * 3 + k, 9) * 6.28,
      speed: 0.55 + hash(k, gi + 7) * 0.35,
    });
  });
});
