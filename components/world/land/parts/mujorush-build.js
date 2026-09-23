// Mount MujoRush's stone, as geometry: pure, built once, no React.
//
// ONE piece of granite. The massif's south cliff is a single heightfield
// sheet (buildStone) and the three seal pups are carved INTO it, not stood
// in front of it: at every point of the sheer face the surface is the
// smooth union of the cliff, the uncarved rock band the heads are cut from,
// and each pup's round head flowing straight into its plump body (no neck,
// no ears), with its muzzle pads raised and its eye sockets, drilled
// whisker dots, smile and harbour-seal spots chiselled in. Same stone, same
// colour, same value for rock and faces; hollows are darkened by their own
// depth (vertex cavity), so they hold shadow like real carving.
//
// Three ways to seal, the way Rushmore's four men differ, west to east in
// the landing site's order: the ROYAL seal in a crown (mujoco #3396), the
// EVIL seal with little horns and angry brows (mujoco_warp #1541) and the
// PATROL seal in a cap (mujoco #3450). Their accessories are carved from
// the same granite and merged into the same mesh. The eyes and noses are
// dark polished-stone inlays (so they stay big and cute); each PR number is
// engraved on its pup's chest (MujoRush.jsx draws the glowing grooves).
//
// Local layout, world metres: each pup stands on its place's x; its belly
// fills its reading point's collision circle (z = -50, r = 2.5) at the
// snow line; everything reads from the follow camera, which sees the cliff
// up to about y = 8 when the seal stands at a dock.

import { Color, ConeGeometry, CylinderGeometry, CapsuleGeometry, Float32BufferAttribute, BufferGeometry, Matrix4, Quaternion, SphereGeometry, Vector3, Euler } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../../lib/world/land.js";
import { PLACE_BY_ID } from "../../../../lib/world/places.js";

export const FACES = [
  { id: "pr-mujoco-3396", number: "#3396", look: "royal" },
  { id: "pr-mujoco-warp-1541", number: "#1541", look: "evil" },
  { id: "pr-mujoco-3450", number: "#3450", look: "patrol" },
].map((f) => ({ ...f, x: PLACE_BY_ID[f.id].x, place: PLACE_BY_ID[f.id] }));

const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (i, k) => {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
// Smooth union of two heightfield fronts (the larger z wins, with a fillet
// k wide where they meet), so carved forms flow into the rock.
function smax(a, b, k) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
// The front (largest z) of an ellipsoid at (x, y): centre, radii a (x),
// b (up its axis), c (depth), its axis leaning back by tilt radians.
function ellZ(cx, cy, cz, a, b, c, tilt, x, y) {
  const X = x - cx;
  const Y = y - cy;
  const s = Math.sin(tilt);
  const co = Math.cos(tilt);
  const A = (s * s) / (b * b) + (co * co) / (c * c);
  const B = 2 * Y * s * co * (1 / (c * c) - 1 / (b * b));
  const C = (X * X) / (a * a) + Y * Y * ((co * co) / (b * b) + (s * s) / (c * c)) - 1;
  const disc = B * B - 4 * A * C;
  return disc < 0 ? -Infinity : cz + (-B + Math.sqrt(disc)) / (2 * A);
}

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

export const CLIFF_X = [-54.6, -17.4];
const TAPER = 3.2; // m over which each end rounds down into the rough rock
const SHEER = 16; // m of rise per m back: the face stands near vertical
const DX = 0.16; // m between columns, and between rows up the carved band
const CARVED_TOP = 11.3; // m: the rows above this are the plain cliff, lip and dome
// Rows, in metres back from the foot: every DX of height up the carved band,
// then sparser up the sheer face, round the lip and over the dome.
const D = [];
for (let y = -1.3; y <= CARVED_TOP + 1e-6; y += DX) D.push(y / SHEER - 0.3);
const DENSE = D.length;
D.push(0.5, 0.6, 0.72, 0.85, 1, 1.15, 1.4, 1.7, 2.1, 2.6, 3.2, 4, 5, 6.2, 7.6, 9.2, 11, 13, 15.2, 17.6, 20.2);

function taper(x) {
  const [x0, x1] = CLIFF_X;
  const u = Math.max(0, (x0 + TAPER - x) / TAPER, (x - (x1 - TAPER)) / TAPER);
  return Math.sqrt(Math.max(0, 1 - u * u));
}

// The uncarved rock band the pups are cut from: it stands forward of the
// cliff from the talus up to a snowy ledge above their heads, in broad
// chisel-flat facets (never jagged), so the heads come out of one mass of
// granite the way Rushmore's do, never as busts against a wall.
function blockZ(x, y) {
  const up = s01(-1.5, 0.5, y) * (1 - s01(8.4, 11.2, y));
  const facets = 0.3 * (Math.abs(Math.sin(x * 0.62 + 1.4 * Math.sin(y * 0.31))) - 0.5) + 0.18 * (Math.abs(Math.sin(y * 0.83 - x * 0.19)) - 0.5);
  return -57.4 + up * (2.8 + facets);
}

// ---- the pups -----------------------------------------------------------------

const REF_Z = -55.3; // the plane the pups are cut back to
const BODY = { y: 0.1, z: REF_Z, a: 5.7, b: 3.3, c: 5.2 }; // plump, spreading into the snow
const HEAD = { y: 3.75, z: REF_Z - 0.1, a: 4.1, b: 3.05, c: 4.6, tilt: 0.3 }; // round, looking up at you
const PAD = { x: 0.8, y: 2.6, a: 1.02, b: 0.8, c: 0.95 }; // the two whisker pads
const EYE = { x: 1.72, y: 4.12, a: 0.74, b: 0.84, c: 0.42, socket: 0.5 };
const NOSE = { y: 3.28, a: 0.56, b: 0.38, c: 0.34 };
export const NUM_Y = 0.95; // the engraved number's centre height on the chest

const shellZ = (fx, x, y) => smax(ellZ(fx, BODY.y, BODY.z, BODY.a, BODY.b, BODY.c, 0, x, y), ellZ(fx, HEAD.y, HEAD.z, HEAD.a, HEAD.b, HEAD.c, HEAD.tilt, x, y), 2.2);

// Harbour-seal spots, per pup (x relative to its centre, y, radius): on the
// crown, the cheeks' outer sides and the flanks, clear of the face and
// the number.
const SPOTS = [[-3.05, 5.15, 0.4], [-2.45, 6.2, 0.3], [2.95, 5.55, 0.36], [2.35, 6.35, 0.27], [-3.45, 3.1, 0.44], [3.55, 3.55, 0.38], [-4.5, 1.3, 0.46], [4.55, 1.0, 0.42], [-3.35, 0.35, 0.34], [3.2, 0.1, 0.36], [-1.1, 6.55, 0.28], [0.95, 6.7, 0.25], [-4.9, -0.2, 0.3], [5.0, 2.4, 0.3]];

// Smile grooves, per look: polylines under the pads (x relative, y).
const MOUTH = {
  royal: [[-1.55, 2.12], [-1.0, 1.72], [-0.35, 1.56], [0.35, 1.56], [1.0, 1.72], [1.55, 2.12]],
  evil: [[-1.35, 1.9], [-0.6, 1.66], [0.25, 1.64], [0.95, 1.8], [1.5, 2.28]], // the smug one-sided smirk
  patrol: null, // an open grin (a hollow, below)
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

// Everything a pup carves, precomputed once per face.
const PUPS = FACES.map((f) => {
  const fx = f.x;
  const pads = [-1, 1].map((sg) => {
    const px = fx + sg * PAD.x;
    return { x: px, y: PAD.y, z: shellZ(fx, px, PAD.y) - PAD.c * 0.36 };
  });
  const mouth = MOUTH[f.look]?.map(([x, y]) => [fx + x, y]) ?? null;
  const spots = SPOTS.map(([x, y, r], k) => [fx + (f.look === "evil" ? -x : x) + (hash(k, fx) - 0.5) * 0.4, y + (hash(fx, k) - 0.5) * 0.3, r]);
  return { f, fx, pads, mouth, spots };
});

// The pup's raised form (head, body, pads) at (x, y), before any chiselling.
function pupForm(p, x, y) {
  let z = shellZ(p.fx, x, y);
  if (z === -Infinity) return z;
  for (const pad of p.pads) z = smax(z, ellZ(pad.x, pad.y, pad.z, PAD.a, PAD.b, PAD.c, HEAD.tilt * 0.5, x, y), 0.42);
  return z;
}

// What the chisel took out at (x, y): eye sockets, the smile, whisker dots,
// spots. Returns [depth, spot weight].
function chisel(p, x, y) {
  let depth = 0;
  let spot = 0;
  for (const sg of [-1, 1]) {
    const r2 = ((x - p.fx - sg * EYE.x) / (EYE.a + 0.1)) ** 2 + ((y - EYE.y) / (EYE.b + 0.1)) ** 2;
    if (r2 < 1) depth += EYE.socket * s01(0, 0.3, 1 - r2);
  }
  if (p.mouth) {
    let d = Infinity;
    for (let i = 1; i < p.mouth.length; i++) d = Math.min(d, segDist(x, y, ...p.mouth[i - 1], ...p.mouth[i]));
    depth += 0.24 * s01(0, 1, 1 - (d / 0.2) ** 2);
  } else {
    // the patrol pup's open grin: a D under the pads
    const r2 = ((x - p.fx) / 0.62) ** 2 + (Math.max(0, y - 1.95) / 0.3) ** 2 + (Math.min(0, y - 1.95) / 0.42) ** 2;
    if (r2 < 1) depth += 0.42 * s01(0, 0.35, 1 - r2);
  }
  for (const [sx, sy, r] of p.spots) {
    const r2 = ((x - sx) ** 2 + (y - sy) ** 2) / (r * r);
    if (r2 < 1) {
      const w = s01(0, 0.4, 1 - r2);
      depth += 0.16 * w;
      spot = Math.max(spot, w);
    }
  }
  return [depth, spot];
}

// The engraved number's field: the chest chiselled flat enough that the
// number lies flush along its whole length (no band, no plaque: the rock
// is only dressed where the letters go).
const numField = PUPS.map((p) => {
  const at = (y) => pupForm(p, p.fx, y);
  const z0 = at(NUM_Y);
  const slope = (at(NUM_Y + 0.2) - at(NUM_Y - 0.2)) / 0.4;
  return { z0: z0 - 0.03, slope };
});

// The carved surface at (x, y) in front of the cliff base zb, and how much
// of it is pup (0..1) and spot (0..1), for colour.
const out = { z: 0, pup: 0, spot: 0 };
function carve(x, y, zb) {
  let z = smax(zb, blockZ(x, y), 0.8);
  out.pup = 0;
  out.spot = 0;
  for (let i = 0; i < PUPS.length; i++) {
    const p = PUPS[i];
    if (Math.abs(x - p.fx) > 6.3) continue;
    const form = pupForm(p, x, y);
    if (form === -Infinity) continue;
    out.pup = Math.max(out.pup, s01(-0.3, 0.4, form - z));
    z = smax(z, form, 1.1);
    const [depth, spot] = chisel(p, x, y);
    z -= depth;
    out.spot = Math.max(out.spot, spot);
    const n = numField[i];
    const w = (1 - s01(1.6, 2.4, Math.abs(x - p.fx))) * (1 - s01(0.42, 0.78, Math.abs(y - NUM_Y)));
    if (w > 0) z += w * (n.z0 + n.slope * (y - NUM_Y) - z);
  }
  out.z = z;
  return out;
}

// The sheet at column x, d m back from the foot: its height and its z.
export function sheetAt(x, d) {
  const t = taper(x);
  let y = smin(SHEER * (d + 0.3), dome(x, zFront(x) - d), 4.5);
  if (d >= D[D.length - 1]) y -= 9; // the back edge tucks under the rock
  y = y * t - (1 - t) * 1.2;
  const zb = zFront(x) - d;
  if (d > 0.62) return { y, z: zb, pup: 0, spot: 0 };
  const c = carve(x, y, zb);
  return { y, z: zb + (c.z - zb) * t, pup: c.pup * t, spot: c.spot * t };
}

// The surface point of the carved face at (x, y), for placing things on it.
export function faceZ(x, y) {
  return carve(x, y, zFront(x) - (y / SHEER - 0.3)).z;
}

// ---- colour -------------------------------------------------------------------

const GRANITE_LOW = new Color("#8b849b"); // at the foot, in the talus's shade
const GRANITE = new Color("#b3acc3"); // grey-lavender granite, cliff and faces alike
const DEEP = new Color("#5d5672"); // what a chiselled hollow darkens toward
const SNOW = new Color("#faf6f0");
const tmp = new Color();
function stone(c, x, y, ny, cav, spot, pup, snowFrom) {
  const streak = 1 - (1 - pup) * 0.06 * (1 + Math.sin(x * 0.83 + 1.6 * Math.sin(y * 0.31 + x * 0.17)));
  c.copy(GRANITE_LOW).lerp(GRANITE, s01(-0.5, 3.5, y)).multiplyScalar(streak);
  c.lerp(DEEP, Math.min(0.85, cav + spot * 0.28));
  c.lerp(SNOW, s01(snowFrom, snowFrom + 0.22, ny) * s01(4.8, 7, y) * (1 - cav));
  return c;
}

// ---- the stone ----------------------------------------------------------------

const m4 = new Matrix4();
const q = new Quaternion();
const eul = new Euler();
const v = new Vector3();
const sc = new Vector3();
const UP = new Vector3(0, 1, 0);
function place(list, geo, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, pre = null) {
  const g = geo.clone();
  if (pre) g.applyMatrix4(pre);
  eul.set(rx, ry, rz);
  q.setFromEuler(eul);
  g.applyMatrix4(m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
  list.push(g);
  return g;
}
// A rod of stone from a to b (brows, whiskers), radius r.
function rod(list, a, b, r) {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  q.setFromUnitVectors(UP, d.normalize());
  const g = new CapsuleGeometry(r, len, 3, 10);
  g.applyMatrix4(m4.compose(v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, sc.set(1, 1, 1)));
  list.push(g);
}
// The head's own frame: local (x, up its axis, forward) to world.
const headFrame = (fx, extra = null) => {
  const f = new Matrix4().compose(v.set(fx, HEAD.y, HEAD.z), q.setFromEuler(eul.set(-HEAD.tilt, 0, 0)), sc.set(1, 1, 1));
  return extra ? f.multiply(extra) : f;
};
function inFrame(list, geo, frame, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const g = geo.clone();
  eul.set(rx, ry, rz);
  q.setFromEuler(eul);
  g.applyMatrix4(m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
  g.applyMatrix4(frame);
  list.push(g);
}
const bare = (g) => g.deleteAttribute("uv");

// Eyes: dark polished-stone inlays set in their sockets, one catchlight each
// (the evil pup's glow radiation-magenta instead). Instanced in
// MujoRush.jsx, so they blink and follow the seal.
export const EYES = []; // { face, x, y, z, sx, sy, sz, rx }
export const SPARKS = []; // { dx, dy, dz, r, evil } relative to its eye
PUPS.forEach((p, fi) => {
  for (const sg of [-1, 1]) {
    const ex = p.fx + sg * EYE.x;
    const zs = pupForm(p, ex, EYE.y);
    const slope = (pupForm(p, ex, EYE.y + 0.2) - pupForm(p, ex, EYE.y - 0.2)) / 0.4;
    const rx = Math.atan(slope);
    EYES.push({ face: fi, x: ex, y: EYE.y, z: zs - EYE.c + 0.02, sx: EYE.a, sy: EYE.b, sz: EYE.c, rx });
    const evil = p.f.look === "evil";
    const [lx, ly, lz] = evil ? [0, -0.06, EYE.c * 0.96] : [-0.24, 0.3, EYE.c * 0.8];
    SPARKS.push({ dx: lx, dy: ly * Math.cos(rx) - lz * Math.sin(rx), dz: ly * Math.sin(rx) + lz * Math.cos(rx), r: evil ? 0.25 : 0.19, evil });
  }
});

export function buildStone() {
  // the sheet
  const NX = Math.round((CLIFF_X[1] - CLIFF_X[0]) / DX) + 1;
  const rows = D.length;
  const pos = new Float32Array(NX * rows * 3);
  const pup = new Float32Array(NX * rows);
  const spot = new Float32Array(NX * rows);
  for (let i = 0; i < NX; i++) {
    const x = CLIFF_X[0] + ((CLIFF_X[1] - CLIFF_X[0]) * i) / (NX - 1);
    for (let j = 0; j < rows; j++) {
      const k = i * rows + j;
      const s = sheetAt(x, D[j]);
      pos[k * 3] = x;
      pos[k * 3 + 1] = s.y;
      pos[k * 3 + 2] = s.z;
      pup[k] = s.pup;
      spot[k] = s.spot;
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
  const sheet = new BufferGeometry();
  sheet.setAttribute("position", new Float32BufferAttribute(pos, 3));
  sheet.setIndex(index);
  sheet.computeVertexNormals();

  // Cavity: how far each point of the carved band sits below its
  // neighbours, near (a socket, a groove) and wide (where a head meets the
  // rock). Hollows hold shadow; the sun never reaches into them.
  const nrm = sheet.attributes.normal;
  const col = new Float32Array(pos.length);
  const zAt = (i, j) => pos[(i * rows + j) * 3 + 2];
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < rows; j++) {
      const k = i * rows + j;
      let cav = 0;
      if (i >= 6 && i < NX - 6 && j >= 6 && j < DENSE - 6) {
        const z = zAt(i, j);
        const near = (zAt(i - 2, j) + zAt(i + 2, j) + zAt(i, j - 2) + zAt(i, j + 2)) / 4 - z;
        const wide = (zAt(i - 6, j) + zAt(i + 6, j) + zAt(i, j - 6) + zAt(i, j + 6)) / 4 - z;
        cav = Math.min(0.8, Math.max(0, near * 2.6 + wide * 0.55));
      }
      stone(tmp, pos[k * 3], pos[k * 3 + 1], nrm.getY(k), cav, spot[k], pup[k], 0.6);
      col[k * 3] = tmp.r;
      col[k * 3 + 1] = tmp.g;
      col[k * 3 + 2] = tmp.b;
    }
  }
  sheet.setAttribute("color", new Float32BufferAttribute(col, 3));

  // the carved accessories and brows, same granite
  const BALL = new SphereGeometry(1, 16, 12);
  const CONE = new ConeGeometry(1, 1, 8, 1);
  const BAND = new CylinderGeometry(1, 1, 1, 30, 1, true);
  const DOME = new SphereGeometry(1, 30, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const BILL = new CylinderGeometry(1, 1, 1, 22, 1, false, -Math.PI / 2, Math.PI);
  const DISC = new CylinderGeometry(1, 1, 1, 18, 1);
  const carved = [];
  const inlay = []; // dark polished stone: noses, whisker dots
  const gems = []; // radiation-lit: the crown's jewels, the patrol badge

  for (const p of PUPS) {
    const { fx } = p;
    const look = p.f.look;
    const onFace = (x, y, lift = 0) => [x, y, faceZ(x, y) + lift];

    // nose: a small dark polished inlay on top of the pads' join
    place(inlay, BALL, fx, NOSE.y, pupForm(p, fx, NOSE.y) - NOSE.c * 0.45, NOSE.a, NOSE.b, NOSE.c, -0.25);
    // the drilled whisker dots, three a pad
    for (const pad of p.pads) {
      const sg = Math.sign(pad.x - fx);
      for (const [dx, dy] of [[0.12, 0.2], [0.45, 0.02], [0.28, -0.3]]) {
        const x = pad.x + sg * dx;
        const y = pad.y + dy;
        place(inlay, BALL, x, y, pupForm(p, x, y) - 0.04, 0.12, 0.12, 0.08);
      }
      // whiskers: three raised stone rods fanning out over the cheek
      for (const [a, len] of [[0.28, 1.45], [0.02, 1.6], [-0.26, 1.4]]) {
        const x0 = pad.x + sg * 0.85;
        const y0 = pad.y + 0.05 + a * 0.5;
        const x1 = x0 + sg * len * Math.cos(a);
        const y1 = y0 + len * Math.sin(a);
        rod(carved, onFace(x0, y0, -0.02), onFace(x1, y1, -0.06), 0.075);
      }
    }

    if (look === "royal") {
      // the crown: a band on the crown of the head, five points with balls,
      // three jewels lit by the radiation
      const tilt = new Matrix4().makeRotationZ(-0.1);
      const fr = headFrame(fx, tilt);
      inFrame(carved, BAND, fr, 0, 2.78, 0, 2.2, 0.82, 2.42);
      for (let k = -2; k <= 2; k++) {
        const a = k * 0.62;
        const px = 2.2 * Math.sin(a);
        const pz = 2.42 * Math.cos(a);
        const h = k === 0 ? 1.05 : Math.abs(k) === 1 ? 0.9 : 0.75;
        inFrame(carved, CONE, fr, px, 3.19 + h / 2, pz, 0.36, h, 0.36);
        inFrame(carved, BALL, fr, px, 3.19 + h + 0.1, pz, 0.2);
        if (Math.abs(k) < 2) inFrame(gems, BALL, fr, 2.2 * Math.sin(a + 0.31), 2.78, 2.42 * Math.cos(a + 0.31), 0.17, 0.17, 0.1);
      }
      inFrame(gems, BALL, fr, 0, 2.78, 2.46, 0.24, 0.24, 0.12);
    }

    if (look === "evil") {
      // little horns, leaning out, and angry brows slanting down to the snout
      const fr = headFrame(fx);
      for (const sg of [-1, 1]) {
        inFrame(carved, CONE, fr, sg * 1.62, 3.22, 1.2, 0.5, 1.35, 0.5, 0.35, 0, -sg * 0.42);
        const inner = [fx + sg * 0.72, EYE.y + 0.98];
        const outer = [fx + sg * 2.45, EYE.y + 1.42];
        rod(carved, onFace(...inner, -0.06), onFace(...outer, -0.08), 0.2);
      }
    }

    if (look === "patrol") {
      // a patrol cap, a touch jaunty: dome, bill, button, and a badge lit by
      // the radiation
      const fr = headFrame(fx, new Matrix4().makeRotationZ(0.09));
      inFrame(carved, DOME, fr, 0, 1.92, 0, 3.55, 1.75, 3.95);
      inFrame(carved, BILL, fr, 0, 1.98, 3.0, 2.35, 0.2, 2.15, 0.14);
      inFrame(carved, BALL, fr, 0, 3.62, 0, 0.34, 0.24, 0.34);
      inFrame(gems, DISC, fr, 0, 2.55, 3.62, 0.36, 0.12, 0.36, Math.PI / 2 - 0.55);
    }
  }

  // colour the carved pieces like the rock they are cut from
  for (const g of carved) {
    bare(g);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const c = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      stone(tmp, p.getX(k), p.getY(k), n.getY(k), 0, 0, 1, 0.82);
      c[k * 3] = tmp.r;
      c[k * 3 + 1] = tmp.g;
      c[k * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new Float32BufferAttribute(c, 3));
  }
  for (const g of [...inlay, ...gems]) bare(g);

  return {
    stone: mergeGeometries([sheet, ...carved], false),
    inlay: mergeGeometries(inlay, false),
    gems: mergeGeometries(gems, false),
    numbers: PUPS.map((p, i) => ({ x: p.fx, y: NUM_Y, z: numField[i].z0, rx: Math.atan(numField[i].slope) })),
  };
}

// ---- the talus, the radioactive crystals, the floating boulders ---------------

// Where two pups' bodies meet at the foot, and outside the end ones.
const GAPS = [-51.9, -40.5, -29.5, -18.9];

// Talus: blasted granite at the cliff's foot, heaped in the valley between
// each pair of pups and beside the end ones; a few blocks at each belly's
// flanks. Nothing in front of a face.
export const TALUS = [];
// Crystals: chunky prisms of the district's radiation poking out of the talus.
export const CRYSTALS = [];
GAPS.forEach((gx, gi) => {
  const z0 = faceZ(gx, 0.4);
  [[0, 0.7, 0.95], [-0.85, 1.5, 0.62], [0.9, 1.7, 0.58], [0.1, 2.5, 0.45], [-1.25, 2.6, 0.38], [1.4, 2.9, 0.34]].forEach(([dx, dz, r], k) => {
    TALUS.push({ x: gx + dx, y: r * 0.3, z: z0 + dz, r, ry: hash(gi, k) * 6.3, rx: hash(k, gi) * 0.8 });
  });
  CRYSTALS.push({ x: gx + 0.75, y: -0.1, z: z0 + 1.0, h: 1.3, r: 0.38, tilt: 0.3, ry: 1.1 + gi });
  CRYSTALS.push({ x: gx - 0.9, y: -0.1, z: z0 + 2.1, h: 0.85, r: 0.3, tilt: -0.35, ry: 2.3 + gi });
});
FACES.forEach((f, fi) => {
  for (const sg of [-1, 1]) {
    [[4.25, -51.1, 0.55], [3.7, -50.25, 0.36]].forEach(([dx, z, r], k) => {
      TALUS.push({ x: f.x + sg * dx, y: r * 0.3, z, r, ry: hash(fi + sg, k) * 6.3, rx: hash(k, fi) * 0.8 });
    });
  }
});

// The anomaly: granite boulders that broke off the cliff and never came
// down, hanging in the notches between the heads and bobbing on their own
// slow beat, each speared by a glowing crystal.
export const FLOATERS = [];
GAPS.forEach((gx, gi) => {
  [[3.3, 0.7], [6.3, 0.55]].forEach(([y0, r], k) => {
    const x = gx + (hash(gi, k) - 0.5) * 0.6;
    const y = y0 + (hash(k, gi) - 0.5) * 0.5;
    FLOATERS.push({
      x,
      y,
      z: faceZ(x, y) + r + 0.7 + hash(gi + 5, k) * 0.4, // just off the rock it broke from
      r,
      phase: hash(gi * 3 + k, 9) * 6.28,
      speed: 0.55 + hash(k, gi + 7) * 0.35,
    });
  });
});
