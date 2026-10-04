// WALL MARIA'S SEA END, as geometry: pure, no React. Everything is laid out
// in the scene's own frame: the pup at the origin on the cobbles, north (-z)
// toward the Wall, which stands where Mount MujoRush stands on the island.
// Giant-scale forced perspective throughout: the Wall is 20 m, the faces in
// it 8 m, the march on the horizon 200 to 470 m tall, the Founding Titan's
// skeleton 480 m.
//
//   the Wall      a curved core slab running off to both horizons, a skin of
//                 stone plates over its middle 108 m, three carved pup faces
//                 (horned, CROWNED, capped) at the island's spacing, the
//                 coral block of exactly 1,282 cubes in the core under the
//                 crowned face, wall-titans packed shoulder to shoulder
//                 behind the skin, the arched gate with its portcullis up
//   the district  red-tile roofs (instanced), chimneys, a bell tower and its
//                 bell, the cobbled square (in the ground's shader)
//   outside       a scorched plain, a line of giant footprints, the sea
//   the march     the seal-titans, rows to the horizon; the Founding Titan's ribcage
//   the cast      Eren on the crest, penguins, gulls, the colony's pups

import { BoxGeometry, BufferAttribute, BufferGeometry, Euler, ExtrudeGeometry, Shape, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Matrix4, PlaneGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// ---- the Wall's plan -------------------------------------------------------
export const WALL = { H: 20, T: 6, skin: 0.8 };
export const zF = (x) => -30 - (x * x) / 900; // the Wall's face: it curves off to both horizons
export const NEAR = 54; // m either side of the crowned face where the skin falls
export const FACES = [
  { x: -12, look: "evil" },
  { x: 0, look: "royal" },
  { x: 12, look: "patrol" },
];
export const FACE_Y = 14.2;
// THE BLOCK: 16 x 12 x 7 cells of 0.75 m, the first 1,282 from the bottom front (the top course is short at the back)
export const FISH = 1282;
export const CUBE = 0.75;
export const BLOCK = { nx: 16, ny: 12, nz: 7, x0: -6, z0: -30.85 }; // behind the skin
export const CELLS = [];
for (let y = 0; y < BLOCK.ny; y++) for (let z = 0; z < BLOCK.nz; z++) for (let x = 0; x < BLOCK.nx; x++) if (CELLS.length < FISH) CELLS.push([BLOCK.x0 + (x + 0.5) * CUBE, (y + 0.5) * CUBE, BLOCK.z0 - (z + 0.5) * CUBE, y]);
export const GAP = { x: 6, h: BLOCK.ny * CUBE }; // half-width, height of the hole the block leaves
export const BLUE_AT = [0, CUBE / 2, -29.1]; // the one blue cube, on the cobbles at the block's foot
export const WALL_TITANS = [-52, -42, -32, -22, -12, 12, 22, 32, 42, 52];
export const GATE_X = -25;

// every part of a merged mesh: non-indexed, no uv, a normal a facet, a tone (the vertex colour's r)
function part(g, tone = 1) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.computeVertexNormals();
  const c = new Float32Array(n.attributes.position.count * 3).fill(tone);
  n.setAttribute("color", new BufferAttribute(c, 3));
  return n;
}
const M4 = new Matrix4();
const E = new Euler();
const at = (g, x, y, z, rx = 0, ry = 0, rz = 0) => g.applyMatrix4(M4.makeRotationFromEuler(E.set(rx, ry, rz))).translate(x, y, z);
function rot(g, rx, ry, rz) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  return g;
}
const ball = (r, w = 10, h = 7) => new SphereGeometry(r, w, h);

// THE CORE: the Wall's mass, a curved slab with the crest's parapet. In the
// near stretch it stands recessed behind the wall-titans (the skin covers
// them), and under the crowned face it has no core at all: that is the block.
export function wallCore() {
  const parts = [];
  const step = 6;
  for (let x = -700; x < 700; x += step) {
    const x1 = x + step;
    const mid = (x + x1) / 2;
    if (mid > -GAP.x && mid < GAP.x) {
      // over the block: only the stone above it, a lintel under the crowned face
      const g = new BoxGeometry(step, WALL.H - GAP.h, WALL.T - 3.2);
      parts.push(part(at(g, mid, GAP.h + (WALL.H - GAP.h) / 2, zF(mid) - 3.2 - (WALL.T - 3.2) / 2, 0, Math.atan(mid / 450), 0), 0.78));
      continue;
    }
    const recess = Math.abs(mid) < NEAR ? 3.2 : 0;
    const d = WALL.T - recess;
    const g = new BoxGeometry(step + 0.05, WALL.H, d);
    parts.push(part(at(g, mid, WALL.H / 2, zF(mid) - recess - d / 2, 0, Math.atan(mid / 450), 0), 0.78));
    // Renaissance pilasters on the wall's face, every third step, with a capital
    if (Math.round(x / step) % 3 === 0 && recess === 0) {
      const a = Math.atan(mid / 450);
      parts.push(part(at(new CylinderGeometry(0.7, 0.8, WALL.H - 1.4, 8), mid, (WALL.H - 1.4) / 2, zF(mid) + 0.35, 0, a, 0), 0.86));
      parts.push(part(at(new BoxGeometry(2.2, 0.9, 2.2), mid, WALL.H - 0.95, zF(mid) + 0.35, 0, a, 0), 0.9));
    }
    // the parapet along the crest: merlons every other step
    if (Math.round(x / step) % 2 === 0) parts.push(part(at(new BoxGeometry(step * 0.55, 1.4, 1.2), mid, WALL.H + 0.7, zF(mid) - 0.6, 0, Math.atan(mid / 450), 0), 0.82));
  }
  // the walkway on the crest over the near stretch (the skin stands in front of the recess)
  for (let x = -NEAR; x < NEAR; x += step) {
    const mid = x + step / 2;
    if (mid > -GAP.x && mid < GAP.x) continue;
    parts.push(part(at(new BoxGeometry(step + 0.05, 1.2, 3.2), mid, WALL.H - 0.6, zF(mid) - 1.6, 0, Math.atan(mid / 450), 0), 0.8));
  }
  return mergeGeometries(parts);
}

// THE SKIN: plates over the near stretch, 3 x 2.5 m, each with where it stands and when it falls.
export const PLATES = [];
for (let x = -NEAR + 1.5; x < NEAR; x += 3) {
  for (let y = 1.25; y < WALL.H; y += 2.5) {
    const inFace = FACES.some((f) => Math.abs(x - f.x) < 4 && Math.abs(y - FACE_Y) < 3.6);
    if (inFace) continue; // the carved faces stand there
    const d = Math.hypot(x, (y - FACE_Y) * 1.4);
    PLATES.push({ x, y, z: zF(x) - WALL.skin / 2, yaw: Math.atan(x / 450), delay: d / 26 + 0.12 * hash(PLATES.length, 3), seed: hash(PLATES.length, 5) });
  }
}

// THE CARVED FACES: a pup's round head in relief, whisker pads, nose, closed eyes, and its accessory, cut in stone.
// Shard-ready (aCenter, aRand per triangle) so the skin can split off it and fall.
export function carvedFace(f) {
  const { x, look } = f;
  const z = zF(x) + 0.2;
  const y = FACE_Y;
  const p = [];
  p.push(part(ball(1, 22, 16).scale(4.1, 3.7, 1.9).translate(x, y, z), 0.8));
  for (const s of [-1, 1]) {
    p.push(part(ball(1, 12, 9).scale(1.0, 0.8, 0.7).translate(x + s * 0.85, y - 1.3, z + 1.55), 0.85));
    p.push(part(new BoxGeometry(1.1, 0.18, 0.4).translate(x + s * 1.75, y + 0.45, z + 1.65), 0.25)); // the closed eyes, asleep
  }
  p.push(part(ball(0.55, 10, 7).scale(1, 0.7, 0.6).translate(x, y - 0.65, z + 1.95), 0.3));
  if (look === "royal") {
    p.push(part(new CylinderGeometry(2.6, 2.75, 1.0, 20, 1, true).translate(x, y + 3.25, z - 0.2), 0.86));
    for (let k = -2; k <= 2; k++) {
      const a = k * 0.6;
      const h = k === 0 ? 1.6 : Math.abs(k) === 1 ? 1.3 : 1.05;
      p.push(part(new ConeGeometry(0.42, h, 5).translate(x + 2.6 * Math.sin(a), y + 3.75 + h / 2, z - 0.2 + 2.6 * Math.cos(a) * 0.7), 0.88));
      p.push(part(ball(0.26, 7, 5).translate(x + 2.6 * Math.sin(a), y + 3.85 + h, z - 0.2 + 2.6 * Math.cos(a) * 0.7), 0.9));
    }
  } else if (look === "evil") {
    for (const s of [-1, 1]) {
      p.push(part(rot(new ConeGeometry(0.55, 2.0, 6).translate(0, 1.0, 0), 0.25, 0, -s * 0.45).translate(x + s * 2.0, y + 2.9, z + 0.4), 0.7));
      p.push(part(rot(new BoxGeometry(1.3, 0.28, 0.4), 0, 0, s * 0.35).translate(x + s * 1.7, y + 1.05, z + 1.7), 0.35)); // angry brows
    }
  } else {
    p.push(part(ball(1, 16, 8, 0).scale(3.7, 1.7, 2.0).translate(x, y + 2.5, z - 0.1), 0.6));
    p.push(part(new BoxGeometry(5.2, 0.3, 2.2).translate(x, y + 2.35, z + 1.6), 0.5)); // the cap's bill
  }
  return shard(mergeGeometries(p));
}

// per triangle: its centre and a random, for the split
function shard(g) {
  const pos = g.attributes.position;
  const n = pos.count;
  const center = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  for (let t = 0; t < n; t += 3) {
    const r = hash(t * 0.37 + 0.5, 9);
    for (let k = 0; k < 3; k++) {
      for (let a = 0; a < 3; a++) center[(t + k) * 3 + a] = (pos.array[t * 3 + a] + pos.array[t * 3 + 3 + a] + pos.array[t * 3 + 6 + a]) / 3;
      rand[t + k] = r;
    }
  }
  g.setAttribute("aCenter", new BufferAttribute(center, 3));
  g.setAttribute("aRand", new BufferAttribute(rand, 1));
  return g;
}

// A SEAL-TITAN, unit height (y 0..1), facing +z: the pup's own silhouette at titan scale, round head, NO ears,
// plump body, flippers; bare muscle, a lipless grin of teeth, eye sockets. lo: the far rows' cheap one.
export function sealTitan(lo = false, headOnly = false) {
  const w = lo ? 6 : 14;
  const h = lo ? 4 : 10;
  const p = [];
  if (!headOnly) p.push(part(ball(1, w, h).scale(0.3, 0.4, 0.2).translate(0, 0.38, 0), 0.62));
  p.push(part(ball(1, w, h).scale(0.21, 0.2, 0.18).translate(0, 0.78, 0.02), 0.66));
  if (!headOnly) for (const s of [-1, 1]) p.push(part(rot(ball(1, lo ? 5 : 8, lo ? 4 : 6).scale(0.07, 0.2, 0.05), 0, 0, s * 0.5).translate(s * 0.3, 0.34, 0.04), 0.58));
  if (!lo) {
    for (const s of [-1, 1]) p.push(part(ball(0.035, 8, 6).translate(s * 0.075, 0.81, 0.17), 0.12)); // sockets
    p.push(part(new BoxGeometry(0.2, 0.05, 0.05).translate(0, 0.7, 0.17), 0.08)); // the grin's dark
    for (let k = 0; k < 8; k++) p.push(part(new BoxGeometry(0.02, 0.035, 0.03).translate(-0.085 + k * 0.0245, 0.705, 0.19), 1.3)); // teeth
    for (const s of [-1, 1]) p.push(part(ball(1, 8, 6).scale(0.09, 0.07, 0.05).translate(s * 0.07, 0.74, 0.16), 0.75)); // the whisker pads, skinless
  }
  return mergeGeometries(p);
}

// the crowned titan face over the block: the head alone, with the carved crown it keeps
export function crownedTitanHead() {
  const g = sealTitan(false, true);
  const p = [g];
  p.push(part(new CylinderGeometry(0.17, 0.18, 0.06, 16, 1, true).translate(0, 0.96, 0), 0.85));
  for (let k = -2; k <= 2; k++) {
    const a = k * 0.6;
    p.push(part(new ConeGeometry(0.025, 0.09, 5).translate(0.17 * Math.sin(a), 1.02, 0.17 * Math.cos(a)), 0.88));
  }
  return mergeGeometries(p);
}

// THE DISTRICT: houses either side of the avenue to the Wall, their roofs, chimneys, the colony's pups on top.
export const HOUSES = [];
{
  let i = 0;
  const lot = (x, z) => {
    const w = 3.6 + 2.4 * hash(i, 1);
    const d = 3.6 + 2.2 * hash(i, 2);
    const h = 3.2 + 4.2 * hash(i, 3);
    const yaw = hash(i, 4) > 0.5 ? 0 : Math.PI / 2;
    HOUSES.push({ x, z, w, d, h, yaw, chimney: hash(i, 5) > 0.35, seed: hash(i, 6) });
    i++;
  };
  for (let z = -6; z > -27; z -= 5.6) for (const s of [-1, 1]) for (let x = 8.5; x < 66; x += 6.1) if (!(s > 0 && x < 13 && z > -12)) lot(s * (x + 1.2 * hash(i, 7)), z - 1.4 * hash(i, 8)); // the bell tower's corner
  for (let z = 4; z < 16; z += 6) for (const s of [-1, 1]) for (let x = 14; x < 60; x += 6.4) lot(s * (x + 1.2 * hash(i, 7)), z);
}
export const unitBox = () => part(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), 1);
export function roofGeometry() {
  // a gabled roof, ridge along z, unit size (base 1 wide in x, 1 high, 1 deep)
  const tri = new Shape([new Vector2(-0.5, 0), new Vector2(0.5, 0), new Vector2(0, 1)]);
  return part(new ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5), 1);
}
export function bellTower() {
  const p = [];
  p.push(part(new BoxGeometry(3.2, 13, 3.2).translate(0, 6.5, 0), 0.82));
  p.push(part(new BoxGeometry(3.8, 0.6, 3.8).translate(0, 13.3, 0), 0.75));
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) p.push(part(new BoxGeometry(0.5, 3.2, 0.5).translate(x, 15.2, z), 0.8));
  p.push(part(new BoxGeometry(3.8, 0.5, 3.8).translate(0, 17.05, 0), 0.75));
  p.push(part(new SphereGeometry(2.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.15, 1).translate(0, 17.3, 0), 0.62)); // the dome
  p.push(part(new CylinderGeometry(0.3, 0.45, 1.6, 8).translate(0, 20.9, 0), 0.8)); // the lantern
  for (const y of [3.5, 7.5]) p.push(part(new BoxGeometry(0.8, 1.6, 0.2).translate(0, y, 1.62), 0.2)); // windows
  return mergeGeometries(p);
}
export function bellGeometry() {
  const pts = [[0, 0], [0.75, 0], [0.7, 0.15], [0.55, 0.45], [0.45, 0.95], [0.3, 1.15], [0, 1.2]].map(([x, y]) => new Vector2(x, y - 1.2));
  return mergeGeometries([part(new LatheGeometry(pts, 12), 0.45), part(new CylinderGeometry(0.06, 0.06, 0.4).translate(0, 0.15, 0), 0.3)]);
}
// the arched gate with its portcullis raised, standing out of the Wall
export function gateGeometry() {
  const p = [];
  const z = zF(GATE_X) + 1.2;
  for (const s of [-1, 1]) p.push(part(new BoxGeometry(2.2, 9, 2.6).translate(GATE_X + s * 4.2, 4.5, z), 0.8));
  p.push(part(new TorusGeometry(4.2, 1.1, 6, 14, Math.PI).translate(GATE_X, 9, z), 0.82));
  p.push(part(new BoxGeometry(11, 2.6, 2.6).translate(GATE_X, 14.1, z), 0.78));
  p.push(part(new PlaneGeometry(6.2, 12).translate(GATE_X, 6, z - 1.2), 0.04)); // the tunnel's dark
  for (let k = -3; k <= 3; k++) p.push(part(new BoxGeometry(0.16, 2.6, 0.16).translate(GATE_X + k * 0.85, 11.6, z - 0.4), 0.15)); // the portcullis, up
  for (const y of [10.6, 11.6, 12.6]) p.push(part(new BoxGeometry(6.2, 0.14, 0.14).translate(GATE_X, y, z - 0.4), 0.15));
  return mergeGeometries(p);
}

// THE FOUNDING TITAN, witness on the far ridge: ribcage, spine, skull, shoulder girdle, arms, shape only. Unit: 1 tall.
export function foundingSkeleton() {
  const p = [];
  for (let k = 0; k < 16; k++) p.push(part(new BoxGeometry(0.03, 0.022, 0.03).translate(0, 0.25 + k * 0.03, -0.02), 0.3));
  for (let k = 0; k < 9; k++) {
    const r = 0.11 - Math.abs(k - 3) * 0.008;
    p.push(part(new TorusGeometry(r, 0.006, 4, 14, Math.PI * 1.25).rotateX(Math.PI / 2).rotateZ(0).rotateY(-Math.PI * 0.125 + Math.PI / 2).translate(0, 0.62 - k * 0.032, 0.06), 0.3));
  }
  p.push(part(ball(0.07, 10, 8).scale(1, 1.1, 1.05).translate(0, 0.86, 0.02), 0.35));
  p.push(part(new BoxGeometry(0.08, 0.03, 0.07).translate(0, 0.79, 0.04), 0.3));
  p.push(part(new BoxGeometry(0.34, 0.025, 0.04).translate(0, 0.7, 0), 0.3));
  for (const s of [-1, 1]) {
    p.push(part(rot(new CylinderGeometry(0.012, 0.012, 0.32, 5), 0, 0, s * 0.25).translate(s * 0.21, 0.55, 0.02), 0.3));
    p.push(part(rot(new CylinderGeometry(0.01, 0.01, 0.3, 5), 0.3, 0, s * 0.1).translate(s * 0.25, 0.26, 0.06), 0.3));
    p.push(part(rot(new CylinderGeometry(0.014, 0.012, 0.26, 5), 0, 0, s * 0.08).translate(s * 0.06, 0.12, 0), 0.3));
  }
  p.push(part(ball(1, 10, 6).scale(0.12, 0.05, 0.08).translate(0, 0.25, 0), 0.3)); // the pelvis
  return mergeGeometries(p);
}

// EREN, back to the lens, unit human (1.8 m): legs, the body, an arm out to sea, shoulder-length hair in a half bun.
// The coat is its own mesh (it whips).
export function erenGeometry() {
  const p = [];
  for (const s of [-1, 1]) p.push(part(new CylinderGeometry(0.08, 0.065, 0.85, 6).translate(s * 0.11, 0.43, 0), 0.25));
  p.push(part(new CylinderGeometry(0.2, 0.16, 0.6, 8).translate(0, 1.15, 0), 0.25));
  p.push(part(ball(0.12, 10, 8).translate(0, 1.58, 0), 0.3));
  p.push(part(new CylinderGeometry(0.135, 0.15, 0.24, 10, 1, true).translate(0, 1.5, 0.0), 0.15)); // shoulder-length hair
  p.push(part(ball(0.065, 8, 6).translate(0, 1.7, 0.08), 0.15)); // the half bun, high at the back
  p.push(part(rot(new CylinderGeometry(0.045, 0.04, 0.72, 6), -(Math.PI / 2 - 0.35), 0, 0).translate(0.21, 1.42, -0.32), 0.25)); // the arm, pointing out to sea (-z)
  p.push(part(rot(new CylinderGeometry(0.045, 0.04, 0.6, 6), 0, 0, 0.12).translate(-0.24, 1.1, 0), 0.25));
  return mergeGeometries(p);
}
export function coatGeometry() {
  // two long tails off the shoulders, open, hanging behind (toward the lens: +z), pivot at the shoulders
  const p = [];
  for (const s of [-1, 1]) p.push(part(new PlaneGeometry(0.3, 1.1, 1, 4).translate(s * 0.13, -0.55, 0.16), 0.2));
  p.push(part(new CylinderGeometry(0.22, 0.3, 0.7, 10, 1, true, Math.PI * 0.25, Math.PI * 1.5).translate(0, -0.35, 0), 0.2));
  return mergeGeometries(p);
}

// A PENGUIN, unit (0.7 m): dark back, white belly front, beak, flippers out.
export function penguinGeometry() {
  const p = [];
  p.push(part(ball(1, 7, 5).scale(0.2, 0.33, 0.18).translate(0, 0.33, 0), 0.22));
  p.push(part(ball(1, 7, 5).scale(0.15, 0.26, 0.08).translate(0, 0.3, 0.12), 1.25));
  p.push(part(ball(0.12, 6, 4).translate(0, 0.66, 0.02), 0.2));
  p.push(part(new ConeGeometry(0.035, 0.12, 5).rotateX(Math.PI / 2).translate(0, 0.65, 0.16), 0.9));
  for (const s of [-1, 1]) p.push(part(rot(new BoxGeometry(0.04, 0.24, 0.1), 0, 0, s * 0.7).translate(s * 0.23, 0.42, 0), 0.2));
  return mergeGeometries(p);
}
// A GULL: a body and two wings that flap in the shader (|x| out along the wing lifts)
export function gullGeometry() {
  const p = [];
  p.push(part(ball(1, 6, 4).scale(0.08, 0.06, 0.22), 0.8));
  for (const s of [-1, 1]) {
    const w = new BufferGeometry();
    w.setAttribute("position", new Float32BufferAttribute([0, 0, 0.08, s * 0.55, 0.2, -0.06, 0, 0, -0.08, s * 0.55, 0.2, -0.06, s * 0.3, 0.12, -0.02, 0, 0, 0.08], 3));
    w.setAttribute("uv", new Float32BufferAttribute(new Array(12).fill(0), 2));
    p.push(part(w, 0.85));
  }
  return mergeGeometries(p);
}
// the colony's little pups on the roofs (round head, plump body)
export function tinyPup() {
  return mergeGeometries([part(ball(1, 8, 6).scale(0.28, 0.22, 0.4).translate(0, 0.22, 0), 0.75), part(ball(0.2, 8, 6).translate(0, 0.5, 0.24), 0.8)]);
}
export function crownGeometry() {
  // the pup's carved crown, low on the round head, five short points: head frame (skull centre, +z the nose)
  const p = [];
  p.push(part(new CylinderGeometry(0.4, 0.43, 0.14, 18, 1, true).rotateX(-0.3).translate(0, 0.38, -0.05), 0.85));
  for (let k = -2; k <= 2; k++) {
    const a = k * 0.62;
    const h = k === 0 ? 0.2 : 0.15;
    p.push(part(new ConeGeometry(0.06, h, 5).rotateX(-0.3).translate(0.41 * Math.sin(a), 0.5 + h / 2 - 0.12 * Math.cos(a) * 0.3, -0.05 + 0.41 * Math.cos(a) * 0.95), 0.88));
  }
  return mergeGeometries(p);
}
// THE BOLT: a jagged lightning strike, sky to the pup, a strip that faces the lens (unit: 1 tall, in y)
export function boltGeometry() {
  const pts = [];
  let x = 0;
  for (let k = 0; k <= 14; k++) {
    pts.push([x, k / 14]);
    x += (hash(k, 4) - 0.5) * 0.5;
  }
  const pos = [];
  const w = 0.006;
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    const a = w * (1.6 - k / 14);
    pos.push(x0 - a, y0, 0, x0 + a, y0, 0, x1 + a, y1, 0, x0 - a, y0, 0, x1 + a, y1, 0, x1 - a, y1, 0);
    if (k === 4 || k === 9) {
      const bx = x1 + (k === 4 ? 0.12 : -0.1);
      pos.push(x1, y1, 0, x1 + a * 0.6, y1, 0, bx, y1 + 0.12, 0);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}
export const unitCube = () => part(new BoxGeometry(1, 1, 1), 1);
export const rubbleGeometry = () => part(new IcosahedronGeometry(1, 0), 0.75);
export const footprintGeometry = () => {
  // a giant pup print pressed in the plain: the dark hollow and its cracked rim (unit 1 m)
  const p = [part(ball(1, 12, 4).scale(1, 0.12, 1.4), 0.15)];
  for (let k = 0; k < 6; k++) p.push(part(new BoxGeometry(0.05, 0.05, 0.8).rotateY((k / 6) * Math.PI * 2).translate(Math.cos((k / 6) * Math.PI * 2) * 1.3, 0, Math.sin((k / 6) * Math.PI * 2) * 1.6), 0.2));
  return mergeGeometries(p);
};
export { Vector3 };
