// THE PUPPETS (P4): Kurama, Kushina, the Third Hokage, the masked shinobi, the colony pups. Every figure is rigid cut
// card joined by small brass split-pins (visible discs); it moves only by rotating about those pins. Nothing bends.
// Kushina and the Hokage hang from thin dark control rods that run down out of frame.

import { Color, Group, InstancedMesh, Mesh, Object3D } from "three";
import { card, circle, hash, merge, place } from "./paper";

const BRASS = "#c9962e";
const pin = (x, y, r = 0.15, z = 0.12) => card(circle(x, y, r, 10), { color: BRASS, depth: 0.04, z });
const O = new Object3D();
const COL = new Color();

// a jointed piece: `geo` is built in the puppet's frame; the pivot sits at the pin (px, py) with the pin disc on top
function piece(geo, mat, px, py, z = 0, withPin = true) {
  const parts = [geo];
  if (withPin) parts.push(pin(px, py));
  const g = merge(parts).translate(-px, -py, 0);
  const pivot = new Group();
  pivot.position.set(px, py, z);
  const mesh = new Mesh(g, mat);
  mesh.frustumCulled = false;
  pivot.add(mesh);
  return { pivot, mesh };
}
const rel = (pts, px, py) => pts.map(([x, y]) => [x + px, y + py]);

// ---- KURAMA ---------------------------------------------------------------------------------------------------
// profile, facing -x; origin at the paws' ground line between the forelegs. Pieces: body, head (with ears), jaw, two
// forelegs, a hind leg, and nine tails of six pinned segments each (instanced).
export const TAILS = 9;
export const SEGS = 6;

export function buildKurama(mats) {
  const root = new Group();
  const RED = "#c9421c";
  const DEEP = "#9b2e18";
  const LIGHT = "#f3a35a";
  const parts = {};

  // the body: torso and haunch, a pale belly card, tufts of fur along the back
  const body = [card([[-3.3, 0.9], [-3.0, 2.2], [-2.4, 3.4], [-1.2, 4.2], [0.8, 4.5], [2.6, 4.3], [4.0, 3.7], [5.0, 2.7], [5.3, 1.6], [4.7, 0.55], [3.6, 0.15], [2.6, 0.9], [1.2, 0.75], [-0.4, 0.65], [-1.8, 0.4], [-2.8, 0.15]], { color: RED, depth: 0.22 })];
  body.push(card([[-2.8, 0.2], [-1.8, 0.45], [-0.4, 0.7], [1.2, 0.8], [2.6, 0.95], [3.4, 0.25], [2.0, 0.5], [0.4, 0.45], [-1.4, 0.35]], { color: LIGHT, depth: 0.06, z: 0.14 }));
  for (let i = 0; i < 8; i++) {
    const x = -1.6 + i * 0.62;
    const y = 4.25 + 0.2 * Math.sin(i * 0.8) - (i > 5 ? 0.25 * (i - 5) : 0);
    body.push(card([[x - 0.28, y - 0.15], [x + 0.05, y + 0.62 + 0.2 * hash(i, 3)], [x + 0.32, y - 0.1]], { color: DEEP, depth: 0.12, z: -0.02 }));
  }
  // the ribs and the marks of the fur: cut seams (holes show the light behind)
  body.push(card([[-1.6, 2.0], [-0.9, 3.1], [-0.6, 2.9], [-1.2, 1.8]], { color: DEEP, depth: 0.05, z: 0.15 }), card([[0.2, 1.9], [0.9, 3.2], [1.2, 3.0], [0.7, 1.7]], { color: DEEP, depth: 0.05, z: 0.15 }), card([[1.8, 1.8], [2.5, 3.0], [2.8, 2.8], [2.3, 1.6]], { color: DEEP, depth: 0.05, z: 0.15 }));
  parts.body = new Mesh(merge(body), mats.fox);

  // the head, pinned at the neck: skull, two tall ears (the fox's, never the pup's), fangs, an eye cut through
  const head = [];
  head.push(card([[0.9, 0.5], [0.7, 1.5], [-0.3, 1.9], [-1.6, 1.7], [-2.7, 1.0], [-4.1, 0.35], [-4.2, -0.05], [-3.6, -0.3], [-2.2, -0.45], [-0.9, -0.6], [0.3, -0.8], [1.0, -0.2]], { color: RED, depth: 0.24, holes: [[[-2.1, 0.95], [-1.0, 1.25], [-1.05, 0.9], [-2.0, 0.72]]] }));
  head.push(card([[-0.2, 1.7], [0.1, 2.9], [0.62, 4.2], [0.85, 2.5], [0.75, 1.6]], { color: RED, depth: 0.14, z: 0.02, holes: [[[0.18, 2.1], [0.4, 3.3], [0.52, 2.1]]] }));
  head.push(card([[-1.1, 1.8], [-0.7, 3.0], [-0.4, 4.0], [-0.05, 2.6], [0.0, 1.7]], { color: DEEP, depth: 0.14, z: -0.1 }));
  head.push(card([[-4.2, 0.2], [-3.9, 0.35], [-3.8, 0.05], [-4.15, -0.05]], { color: "#2a0c14", depth: 0.06, z: 0.15 }));
  head.push(card([[-3.7, -0.3], [-3.55, -0.95], [-3.4, -0.3]], { color: "#f6ecd6", depth: 0.05, z: 0.12 }), card([[-2.6, -0.45], [-2.45, -1.1], [-2.3, -0.45]], { color: "#f6ecd6", depth: 0.05, z: 0.12 }));
  head.push(card([[0.9, 0.4], [1.9, 0.6], [1.0, 0.0]], { color: DEEP, depth: 0.1, z: -0.05 }), card([[0.9, -0.1], [2.0, -0.5], [0.9, -0.6]], { color: DEEP, depth: 0.1, z: -0.05 }));
  const neck = [-2.7, 3.3];
  const h = piece(merge(head), mats.fox, 0, 0, 0.0, true);
  h.pivot.position.set(neck[0] + 0.0, neck[1], 0.05);
  // the glow behind the eye: pure light through the cut hole
  const eye = new Mesh(card([[-2.15, 0.9], [-0.95, 1.3], [-1.0, 0.85], [-2.05, 0.66]], { color: "#ffd24a", depth: 0.04, z: -0.16 }), mats.glow);
  eye.frustumCulled = false;
  h.pivot.add(eye);
  // the inner ear glow
  const ear = new Mesh(card([[0.18, 2.1], [0.4, 3.3], [0.52, 2.1]], { color: "#ff9a3a", depth: 0.04, z: -0.12 }), mats.glow);
  ear.frustumCulled = false;
  h.pivot.add(ear);
  // the lower jaw: pinned at the cheek, opens as the fox roars
  const jaw = piece(
    merge([
      card([[0.5, -0.55], [-0.9, -0.75], [-2.5, -0.7], [-3.7, -0.55], [-3.8, -0.95], [-2.6, -1.25], [-1.0, -1.35], [0.3, -1.15]], { color: RED, depth: 0.2 }),
      card([[-3.5, -0.55], [-3.35, 0.05], [-3.2, -0.55]], { color: "#f6ecd6", depth: 0.05, z: 0.12 }),
      card([[-2.4, -0.7], [-2.25, -0.2], [-2.1, -0.7]], { color: "#f6ecd6", depth: 0.05, z: 0.12 }),
    ]),
    mats.fox,
    0.15,
    -0.45,
    0.02
  );
  h.pivot.add(jaw.pivot);
  // THE ORB the fox gathers in its jaws: a dark sphere ringed with fire, the second export change
  const orbRing = new Mesh(card(circle(0, 0, 1.0, 22), { color: "#ff7a2e", depth: 0.05, z: -0.1 }), mats.glow);
  const orbCore = new Mesh(card(circle(0, 0, 0.78, 22), { color: "#150722", depth: 0.14, z: 0.2 }), mats.solid);
  const orbSpark = new Mesh(card(circle(0, 0, 0.42, 16), { color: "#7d3bd6", depth: 0.04, z: 0.34 }), mats.glow);
  const orb = new Group();
  orb.add(orbRing, orbCore, orbSpark);
  orb.position.set(-4.0, -0.9, 0.2);
  h.pivot.add(orb);
  for (const m of [orbRing, orbCore, orbSpark]) m.frustumCulled = false;
  parts.head = h.pivot;
  parts.jaw = jaw.pivot;
  parts.orb = orb;
  parts.orbSpark = orbSpark;

  // legs
  const leg = (sx, sy, color, z) => {
    const poly = rel([[0.7, 0.6], [-0.5, 0.7], [-1.0, -0.7], [-0.9, -1.7], [-1.7, -2.15], [-1.8, -2.35], [0.0, -2.35], [0.15, -1.5], [0.6, -0.6]], sx, sy);
    const claws = [card(rel([[-1.8, -2.35], [-1.95, -2.62], [-1.6, -2.35]], sx, sy), { color: "#f6ecd6", depth: 0.05, z: 0.1 }), card(rel([[-1.4, -2.35], [-1.5, -2.6], [-1.15, -2.35]], sx, sy), { color: "#f6ecd6", depth: 0.05, z: 0.1 })];
    return piece(merge([card(poly, { color, depth: 0.2 }), ...claws]), mats.fox, sx, sy, z);
  };
  const near = leg(-2.1, 2.4, RED, 0.18);
  const far = leg(-0.9, 2.3, DEEP, -0.3);
  parts.legNear = near.pivot;
  parts.legFar = far.pivot;
  const hx = 3.6;
  const hy = 2.2;
  const hind = piece(
    merge([card(rel([[1.0, 0.9], [-0.9, 0.9], [-1.4, -0.5], [-0.8, -1.4], [-1.3, -1.9], [-1.4, -2.1], [0.4, -2.1], [0.4, -1.3], [0.9, -0.4]], hx, hy), { color: DEEP, depth: 0.2 })]),
    mats.fox,
    hx,
    hy,
    0.2
  );
  parts.hind = hind.pivot;

  // nine tails, six pinned segments each: instanced lozenges, plus instanced brass pins at the joints
  const seg = card([[0, -0.3], [0.3, -0.5], [0.75, -0.47], [1.0, -0.2], [1.0, 0.2], [0.75, 0.47], [0.3, 0.5], [0, 0.3]], { color: "#ffffff", depth: 0.08 });
  const tails = new InstancedMesh(seg, mats.fox, TAILS * SEGS);
  const joints = new InstancedMesh(card(circle(0, 0, 0.13, 9), { color: BRASS, depth: 0.04, z: 0.07 }), mats.solid, TAILS * SEGS);
  for (const m of [tails, joints]) m.frustumCulled = false;
  for (let k = 0; k < TAILS; k++)
    for (let s = 0; s < SEGS; s++) {
      const f = s / (SEGS - 1);
      tails.setColorAt(k * SEGS + s, COL.set("#a82b16").lerp(COL.clone().set("#ffb04a"), f * 0.85));
      joints.setColorAt(k * SEGS + s, COL.set("#ffffff"));
    }
  parts.tails = tails;
  parts.joints = joints;

  root.add(near.pivot, far.pivot, parts.body, hind.pivot, h.pivot, tails, joints);
  parts.root = root;
  return parts;
}

// per frame: the roar (0..1 jaw), the head's lift, the lurch, the tail thrash (0..1 amplitude), a bite (0..1 bound)
const ROOT = [5.0, 2.7];
export function poseKurama(K, t, { roar = 0, lift = 0, thrash = 1, orb = 0, sway = 0 }) {
  K.jaw.rotation.z = 0.62 * roar;
  K.head.rotation.z = 0.12 * lift - 0.05 * roar + 0.03 * Math.sin(t * 1.3);
  K.legNear.rotation.z = 0.05 * Math.sin(t * 1.7) + 0.1 * lift;
  K.legFar.rotation.z = -0.04 * Math.sin(t * 1.9 + 1);
  K.hind.rotation.z = 0.03 * Math.sin(t * 1.4);
  K.orb.visible = orb > 0.02;
  K.orb.scale.setScalar(Math.max(0.001, orb) * (1 + 0.06 * Math.sin(t * 24)));
  K.orbSpark.rotation.z = t * 3;
  // the tails: nine fans from the rump, six segments each, each joint bending a little more than the last
  for (let k = 0; k < TAILS; k++) {
    let x = ROOT[0] + 0.1 * (k % 3);
    let y = ROOT[1] + 0.12 * (k % 2);
    let a = 0.05 + (k * 1.75) / (TAILS - 1) + 0.12 * Math.sin(k * 2.1);
    const z = -0.3 - 0.13 * k;
    const ph = k * 0.8;
    for (let s = 0; s < SEGS; s++) {
      const len = 1.28 * 0.93 ** s;
      const wid = 1.15 * 0.84 ** s * (k === 4 ? 1.15 : 1);
      a += thrash * 0.2 * Math.sin(t * (k % 2 ? 4.4 : 3.6) + ph + s * 0.7) + (s === 0 ? 0 : 0.07 * (k % 2 ? 1 : -1)) + sway * 0.03;
      const i = k * SEGS + s;
      O.position.set(x, y, z);
      O.rotation.set(0, 0, a);
      O.scale.set(len, wid, 1);
      O.updateMatrix();
      K.tails.setMatrixAt(i, O.matrix);
      O.scale.setScalar(1);
      O.updateMatrix();
      K.joints.setMatrixAt(i, O.matrix);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
    }
  }
  K.tails.instanceMatrix.needsUpdate = true;
  K.joints.instanceMatrix.needsUpdate = true;
}

// ---- KUSHINA ----------------------------------------------------------------------------------------------------
// facing +x; origin at her feet. Very long straight red hair (30 strands, each pinned at the crown), one arm thrust
// forward, thin control rods running down out of frame.
export const STRANDS = 30;
export function buildKushina(mats) {
  const root = new Group();
  const body = merge([
    card([[-0.55, 0], [0.55, 0], [0.5, 1.2], [0.42, 1.9], [0.3, 2.1], [-0.3, 2.1], [-0.45, 1.7], [-0.6, 0.8]], { color: "#26163a", depth: 0.12 }),
    card([[-0.5, 1.25], [0.5, 1.2], [0.52, 1.4], [-0.52, 1.45]], { color: "#d8cdb8", depth: 0.05, z: 0.08 }),
    card([[-0.025, -7], [0.025, -7], [0.025, 1.0], [-0.025, 1.0]], { color: "#0b0714", depth: 0.04, z: -0.04 }),
  ]);
  const bodyM = new Mesh(body, mats.solid);
  const head = piece(merge([card(circle(0.02, 2.52, 0.33, 12), { color: "#30203f", depth: 0.12 }), card([[0.3, 2.56], [0.47, 2.47], [0.3, 2.38]], { color: "#30203f", depth: 0.1 })]), mats.solid, 0, 2.15, 0.02);
  // the strands: long thin tapered cards, pinned at the crown
  const strand = card([[0, -0.045], [3.0, -0.012], [3.2, 0], [3.0, 0.012], [0, 0.045]], { color: "#ffffff", depth: 0.03 });
  const hair = new InstancedMesh(strand, mats.solid, STRANDS);
  hair.frustumCulled = false;
  for (let i = 0; i < STRANDS; i++) hair.setColorAt(i, COL.set(i % 3 === 0 ? "#d8472a" : i % 3 === 1 ? "#b3221c" : "#9c1a18"));
  const crown = new Mesh(card(circle(-0.05, 2.78, 0.14, 8), { color: BRASS, depth: 0.04, z: 0.1 }), mats.solid);
  // the arm thrust toward the chains: upper arm, forearm and hand, pinned at the shoulder and the elbow
  const upper = piece(merge([card(rel([[0, -0.1], [0.8, -0.08], [0.82, 0.08], [0, 0.12]], 0.1, 1.95), { color: "#30203f", depth: 0.1 })]), mats.solid, 0.1, 1.95, 0.1);
  // the forearm hangs from the elbow, in the upper arm's own frame (its x runs out along the arm)
  const fore = piece(merge([card(rel([[0, -0.08], [0.75, -0.06], [0.95, 0], [0.75, 0.08], [0, 0.1]], 0.8, 0), { color: "#30203f", depth: 0.1 }), card(rel([[0.7, -0.1], [1.0, -0.15], [1.14, -0.05], [1.17, 0.05], [1.06, 0.14], [0.7, 0.1]], 0.8, 0), { color: "#3a284a", depth: 0.08 })]), mats.solid, 0.8, 0, 0.05);
  upper.pivot.add(fore.pivot);
  const rod = new Mesh(card([[-0.02, -6], [0.02, -6], [0.02, 0.0], [-0.02, 0.0]], { color: "#0b0714", depth: 0.03, z: 0.0 }), mats.solid);
  rod.position.set(1.05, 0, -0.02);
  fore.pivot.add(rod);
  root.add(bodyM, head.pivot, hair, crown, upper.pivot);
  return { root, hair, head: head.pivot, upper: upper.pivot, fore: fore.pivot, rod };
}
export function poseKushina(Kh, t, { shock = 0, wave = 1, reach = 0 }) {
  Kh.upper.rotation.z = 0.3 + 0.25 * reach + 0.04 * Math.sin(t * 2.4);
  Kh.fore.rotation.z = -0.35 * (0.6 + reach) + 0.05 * Math.sin(t * 3.1);
  Kh.rod.rotation.z = -(Kh.upper.rotation.z + Kh.fore.rotation.z);
  Kh.head.rotation.z = 0.04 * Math.sin(t * 1.6) - 0.05 * reach;
  for (let i = 0; i < STRANDS; i++) {
    const u = i / (STRANDS - 1) - 0.5;
    const a = Math.PI * 1.04 + u * 0.7 + 0.1 * Math.sin(t * 2.2 + i * 0.5) * wave + shock * 0.5 * Math.sin(t * 16 + i);
    O.position.set(-0.05, 2.78, -0.02 - 0.003 * i);
    O.rotation.set(0, 0, a);
    O.scale.set(0.85 + 0.15 * hash(i, 5), 1, 1);
    O.updateMatrix();
    Kh.hair.setMatrixAt(i, O.matrix);
  }
  Kh.hair.instanceMatrix.needsUpdate = true;
}

// ---- THE THIRD HOKAGE: a small old figure in a wide-brimmed hat and robes, with a staff, on his ridge ---------------
export function buildHokage(mats) {
  const root = new Group();
  const stone = card([[-2.8, -4.4], [2.8, -4.4], [2.2, 0.9], [1.2, 1.3], [0.2, 1.0], [-1.0, 1.5], [-2.2, 0.8]], { color: "#2a1c3a", depth: 0.5 });
  // the figure stands on the stone's crown; local origin at his feet
  const fig = new Group();
  fig.position.set(0, 1.15, 0.1);
  const robe = merge([
    card([[-0.55, 0], [0.55, 0], [0.4, 0.9], [0.3, 1.5], [-0.3, 1.5], [-0.42, 0.9]], { color: "#3a2548", depth: 0.12 }),
    card([[-1.05, 1.58], [1.05, 1.58], [0.0, 2.2]], { color: "#241833", depth: 0.12, z: 0.02 }),
    card(circle(0, 1.55, 0.21, 8), { color: "#352440", depth: 0.1 }),
    card([[-0.02, -6], [0.02, -6], [0.02, 0.5], [-0.02, 0.5]], { color: "#0b0714", depth: 0.03, z: -0.04 }),
  ]);
  // the staff, held in the right hand: pinned at the hand, with the forearm
  const staff = piece(merge([card([[0.33, -0.04], [0.34, 2.2], [0.41, 2.2], [0.4, -0.04]], { color: "#1a1024", depth: 0.05 }), card(circle(0.37, 2.32, 0.14, 8), { color: BRASS, depth: 0.04, z: 0.06 }), card([[0.05, 1.3], [0.37, 0.98], [0.4, 0.88], [0.0, 1.18]], { color: "#3a2548", depth: 0.08 })]), mats.solid, 0.37, 0.95, 0.1);
  fig.add(new Mesh(robe, mats.solid), staff.pivot);
  root.add(new Mesh(stone, mats.solid), fig);
  return { root, staff: staff.pivot };
}

// ---- THE MASKED SHINOBI: five crouched silhouettes on a branch (instanced) ---------------------------------------
export const SHINOBI = 5;
export function buildShinobi(mats) {
  const g = merge([
    card([[-0.4, 0], [0.4, 0], [0.45, 0.45], [0.25, 0.8], [-0.2, 0.85], [-0.45, 0.4]], { color: "#1a1024", depth: 0.12 }),
    card(circle(0.18, 1.05, 0.2, 9), { color: "#1e1228", depth: 0.12, z: 0.02 }),
    card([[0.2, 0.92], [0.46, 0.95], [0.44, 1.18], [0.22, 1.2]], { color: "#efe6d4", depth: 0.06, z: 0.1 }),
    card([[0.24, 1.04], [0.45, 1.06], [0.45, 1.1], [0.24, 1.08]], { color: "#b3221c", depth: 0.04, z: 0.14 }),
    card([[-0.45, 0.7], [-0.9, 1.25], [-0.82, 1.3], [-0.38, 0.8]], { color: "#241833", depth: 0.05 }),
    card([[-0.1, 0.9], [0.3, 0.9], [0.3, 0.97], [-0.1, 0.97]], { color: "#c9c0ae", depth: 0.04, z: 0.12 }),
  ]);
  const m = new InstancedMesh(g, mats.solid, SHINOBI);
  m.frustumCulled = false;
  return m;
}

// ---- THE COLONY PUPS: tiny card silhouettes on a log (round heads, no ears), five of them -----------------------------
export const COLONY = 6;
export function buildColony(mats) {
  const log = card([[-2.6, 0], [2.6, 0], [2.5, 0.62], [-2.5, 0.68]], { color: "#1c1226", depth: 0.5 });
  const ring = card(circle(2.6, 0.32, 0.32, 10), { color: "#2a1c36", depth: 0.52, z: 0.01 });
  const pup = merge([
    card([[-0.28, 0], [0.28, 0], [0.3, 0.18], [0.12, 0.3], [-0.1, 0.3], [-0.3, 0.16]], { color: "#4a3466", depth: 0.08 }),
    card(circle(0.14, 0.45, 0.15, 9), { color: "#523a70", depth: 0.08, z: 0.01 }),
    card([[-0.05, 0.28], [-0.2, 0.55], [-0.12, 0.58], [0.0, 0.34]], { color: "#4a3466", depth: 0.05 }),
    card([[0.16, 0.25], [0.3, 0.52], [0.38, 0.48], [0.26, 0.2]], { color: "#4a3466", depth: 0.05 }),
    card([[0.2, 0.43], [0.27, 0.45], [0.24, 0.5]], { color: "#efe6d4", depth: 0.04, z: 0.06 }),
  ]);
  const pups = new InstancedMesh(pup, mats.solid, COLONY);
  pups.frustumCulled = false;
  const root = new Group();
  root.add(new Mesh(merge([log, ring]), mats.solid), pups);
  return { root, pups };
}
export function poseColony(C, t, { duck = 0, cheer = 0, ax = 1 }) {
  const T = Math.floor(t * 12) / 12;
  for (let i = 0; i < COLONY; i++) {
    const hop = cheer * Math.max(0, Math.sin(T * 9 + i * 1.7)) * 0.45;
    O.position.set(-2.0 + i * 0.8 * ax, 0.66 + hop - duck * 0.12, 0.05 * (i % 2));
    O.rotation.set(0, 0, 0.1 * Math.sin(T * 5 + i) * cheer);
    O.scale.set(1.1, 1.1 - duck * 0.35, 1.1);
    O.updateMatrix();
    C.pups.setMatrixAt(i, O.matrix);
  }
  C.pups.instanceMatrix.needsUpdate = true;
}
export { place };
