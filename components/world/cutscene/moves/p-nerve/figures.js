// THE CAST, smooth glazed silhouettes lit only on the edge that faces the light, the rest lost in umber:
//   RYUK (the control): a tall thin crouched silhouette on the parapet: spiky feathered crown, ragged folded wings,
//        long thin limbs, a belt with a black notebook on a chain, an apple in one claw, two pale glints for eyes.
//   L: messy black hair, a loose white long-sleeved shirt, barefoot, hunched, thumb at his lip, the other wrist on
//        the chain, at the roof's edge with his face tipped up to the rain.
//   the COLONY PUPS under the stair hut's eave, each with a tiny apple.
// Rig frame. Ryuk's arms are two-bone IK chains so the claw really reaches the apple.

import { BufferAttribute, BufferGeometry, ConeGeometry, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { GAP, CURB_H } from "./roof";
import { T } from "./timeline";
import { ball, box, ease, hash, limb, merge, prep, sm, tene } from "./look";

const UP = new Vector3(0, 1, 0);
const D = new Object3D();
const V = new Vector3();
const W = new Vector3();
const E = new Vector3();
const M = new Vector3();
const POLE = new Vector3();
const AX = new Vector3(1, 0, 0);

export const RYUK = { x: 1.55, y: CURB_H, z: -2.5, l1: 1.45, l2: 1.55 };
export const L_AT = { x: (GAP[0] + GAP[1]) / 2, z: -2.2 };
export const COLONY = [[4.62, 0.05], [4.98, 0.45], [5.34, 0.02], [5.7, 0.4], [6.06, 0.03], [6.42, 0.42], [6.78, 0.04], [5.16, -0.1]];

// two-bone IK: the elbow for a chain from s to t (lengths l1, l2) bending toward `pole`
function elbow(s, t, l1, l2, pole, out) {
  const d = Math.min(s.distanceTo(t), l1 + l2 - 1e-3);
  V.copy(t).sub(s).normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  POLE.copy(pole).addScaledVector(V, -pole.dot(V)).normalize();
  return out.copy(s).addScaledVector(V, a).addScaledVector(POLE, h);
}
// a mesh whose +y runs from `a` to `b`
function lay(mesh, a, b) {
  mesh.position.copy(a);
  V.copy(b).sub(a);
  mesh.quaternion.setFromUnitVectors(UP, V.normalize());
}

// ---- RYUK -----------------------------------------------------------------------------------------------------------
function ryukGeometry() {
  const legs = [];
  const bust = [];
  for (const s of [-1, 1]) {
    legs.push(limb([s * 0.2, 0.8, -0.15], [s * 0.3, 1.35, 0.45], 0.1, 0.075, 5)); // thigh up to the knee
    legs.push(limb([s * 0.3, 1.35, 0.45], [s * 0.28, 0.14, 0.52], 0.075, 0.05, 5)); // shin
    legs.push(ball(0.085, s * 0.3, 1.35, 0.45, 1, 1, 1, 6, 4));
    legs.push(box(0.16, 0.09, 0.4, s * 0.28, 0.05, 0.7));
    for (const k of [-1, 0, 1]) legs.push(new ConeGeometry(0.03, 0.26, 4).rotateX(Math.PI / 2).translate(s * 0.28 + k * 0.05, 0.05, 1.0)); // claws
  }
  legs.push(box(0.45, 0.2, 0.3, 0, 0.82, -0.15));
  // torso, thin ribs showing, leaning forward; a shoulder bar; the craned neck; the head
  bust.push(limb([0, 0.85, -0.15], [0, 1.65, 0.28], 0.22, 0.27, 7));
  bust.push(limb([-0.5, 1.74, 0.22], [0.5, 1.74, 0.22], 0.1, 0.1, 5));
  bust.push(limb([0, 1.7, 0.25], [0, 2.02, 0.52], 0.1, 0.08, 6));
  bust.push(ball(0.2, 0, 2.12, 0.58, 0.92, 1.0, 1.12, 10, 8));
  bust.push(box(0.2, 0.1, 0.3, 0, 1.96, 0.76)); // the jaw
  // the spiky feathered crown, swept up and back
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + hash(i, 1) * 0.2;
    const r = 0.14 + 0.06 * hash(i, 2);
    const len = 0.55 + 0.55 * hash(i, 3);
    const c = new ConeGeometry(0.045, len, 4).translate(0, len / 2, 0);
    c.rotateX(-0.5 - 0.5 * hash(i, 4)); // back
    c.rotateY(a);
    c.translate(Math.cos(a) * r * 0.6, 2.28, 0.5 + Math.sin(a) * r * 0.6);
    bust.push(c);
  }
  // the belt, its chain and the links hanging
  bust.push(new TorusGeometry(0.28, 0.035, 4, 12).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.98, 0.02));
  for (let k = 0; k < 4; k++) bust.push(new TorusGeometry(0.04, 0.012, 4, 6).rotateY(k % 2 ? 1.2 : 0).translate(-0.3, 0.9 - k * 0.07, 0.12));
  // the dorsal spines
  for (let k = 0; k < 5; k++) bust.push(new ConeGeometry(0.05, 0.28, 4).rotateX(-0.9).translate(0, 1.0 + k * 0.17, -0.3 + k * 0.09));
  return { legs: merge(legs, false), bust: merge(bust, false) };
}
function ryukWing(side) {
  const p = [];
  const root = [side * 0.28, 1.68, -0.15];
  const tips = [[side * 1.2, 3.25, -0.95], [side * 0.55, 3.45, -1.15], [side * 1.75, 2.45, -0.9], [side * 0.15, 3.0, -1.35]];
  for (const t of tips) {
    p.push(limb(root, t, 0.07, 0.025, 4));
    p.push(new ConeGeometry(0.06, 0.55, 4).translate(0, 0.27, 0).rotateZ(side * 0.2).translate(t[0], t[1], t[2]));
  }
  // the ragged membrane between the fingers: flat triangles with notched hems
  const tri = (a, b, c) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array([...a, ...b, ...c]), 3));
    return g;
  };
  for (let i = 0; i < tips.length - 1; i++) {
    const a = tips[i];
    const b = tips[i + 1];
    const mid = [(a[0] + b[0]) / 2 - side * 0.1, (a[1] + b[1]) / 2 - 0.55, (a[2] + b[2]) / 2];
    p.push(tri(root, a, mid), tri(root, mid, b), tri(root, b, mid));
    p.push(tri(root, mid, a));
  }
  return merge(p);
}
function armGeoms() {
  const upper = merge([limb([0, 0, 0], [0, RYUK.l1, 0], 0.085, 0.06, 5), ball(0.08, 0, 0, 0, 1, 1, 1, 6, 4), ball(0.065, 0, RYUK.l1, 0, 1, 1, 1, 6, 4)]);
  const claws = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    claws.push(new ConeGeometry(0.03, 0.34, 4).translate(0, 0.17, 0).rotateZ(Math.cos(a) * 0.5).rotateX(Math.sin(a) * 0.5).translate(0, RYUK.l2 + 0.04, 0));
  }
  const fore = merge([limb([0, 0, 0], [0, RYUK.l2, 0], 0.06, 0.04, 5), ball(0.07, 0, RYUK.l2, 0, 1.2, 0.8, 1, 6, 4), ...claws]);
  return { upper, fore };
}

export function buildRyuk(mats) {
  const g = new Group();
  g.position.set(RYUK.x, RYUK.y, RYUK.z);
  const geos = [];
  const own = (x) => (geos.push(x), x);
  const mk = (geo, mat, parent = g) => {
    const m = new Mesh(own(geo), mat);
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  const rg = ryukGeometry();
  mk(rg.legs, mats.ryuk);
  const bust = new Group();
  bust.position.set(0, 0.85, -0.15);
  g.add(bust);
  const bustM = mk(rg.bust, mats.ryuk, bust);
  bustM.position.set(0, -0.85, 0.15);
  // the eyes: two small pale glints
  const eyeM = new MeshBasicMaterial({ color: "#ffdd00", toneMapped: false, fog: false });
  const eyes = mk(merge([ball(0.028, -0.09, 2.14, 0.74, 1.4, 1, 0.6, 6, 4), ball(0.028, 0.09, 2.14, 0.74, 1.4, 1, 0.6, 6, 4)]), eyeM, bust);
  eyes.position.set(0, -0.85, 0.15);
  const wings = [-1, 1].map((s) => {
    const w = new Group();
    w.position.set(s * 0.28, 1.68, -0.15);
    g.add(w);
    const m = mk(ryukWing(s), mats.ryukWing, w);
    m.position.set(-s * 0.28, -1.68, 0.15);
    return w;
  });
  const ag = armGeoms();
  const arms = [-1, 1].map((s) => ({ u: mk(ag.upper, mats.ryuk), f: mk(ag.fore, mats.ryuk), s, shoulder: new Vector3() }));
  // the notebook on its chain: a black book at the hip, then up in the left hand
  const book = mk(merge([box(0.5, 0.06, 0.38, 0, 0, 0)]), mats.book);
  const PEL = new Vector3(0, 0.85, -0.15);
  const out = {
    group: g,
    mouth: new Vector3(), // rig frame
    hand: new Vector3(), // the claw's palm, rig frame
    bookAt: new Vector3(),
    tick(t, tip, bite) {
      const base = g.position;
      const writing = t >= T.ryuk && t < T.core + 0.4;
      const chew = t > T.take + 0.7 && t < T.core ? Math.sin(t * 9) * 0.035 : 0;
      bust.rotation.x = 0.05 + 0.1 * sm(T.reach[0], T.take, t) + 0.06 * Math.sin(t * 1.3) + chew + 0.06 * bite;
      wings.forEach((w, i) => {
        w.rotation.z = (i ? -1 : 1) * (0.05 * Math.sin(t * 2.1 + i) + 0.03 * Math.sin(t * 8.3 + i * 2));
        w.rotation.x = 0.04 * Math.sin(t * 1.7 + i);
      });
      // the mouth, local then rig
      out.mouth.set(0, 2.0, 0.78).sub(PEL).applyAxisAngle(AX, bust.rotation.x).add(PEL).add(base);
      for (const a of arms) {
        const right = a.s < 0; // Ryuk's right: the pup's side
        a.shoulder.set(a.s * 0.46, 1.74, 0.22).sub(PEL).applyAxisAngle(AX, bust.rotation.x).add(PEL); // local
        // the hand's target, rig frame
        W.set(a.s * 0.55, 1.1, 0.95).add(base);
        if (right) {
          const reach = sm(T.reach[0] + 0.2, T.take, t);
          const toMouth = sm(T.take + 0.2, T.take + 0.85, t);
          const toBook = sm(T.ryuk - 0.2, T.ryuk + 0.4, t);
          if (t < T.take + 0.2) W.lerp(tip, ease.out(reach));
          else if (t < T.ryuk - 0.2) W.copy(tip).lerp(out.mouth, ease.out(toMouth));
          else {
            // writing: short strokes over the book at his chest, a slow lazy nib; then the core is tossed
            const k = t - T.ryuk;
            W.copy(out.mouth).lerp(M.set(0.3, 1.3, 1.05).add(base), toBook);
            if (writing && toBook > 0.9) W.add(M.set(0.09 * Math.sin(k * 3.4), 0.025 * Math.sin(k * 6.8), 0.05 * Math.cos(k * 3.4)));
            W.lerp(out.mouth, sm(T.core - 0.4, T.core + 0.15, t) * (1 - sm(T.core + 0.15, T.core + 0.5, t)));
            if (t > T.core + 0.15) W.lerp(M.set(-0.9, 2.5, -1.4).add(base), sm(T.core + 0.15, T.core + 0.55, t) * 0.7);
          }
        } else if (t > T.ryuk - 0.4) {
          W.lerp(M.set(-0.15, 1.22, 1.0).add(base), sm(T.ryuk - 0.4, T.ryuk + 0.1, t)); // the left hand holds the book up
        }
        W.sub(base); // local
        elbow(a.shoulder, W, RYUK.l1, RYUK.l2, E.set(a.s * 0.8, -0.5, -0.2), M);
        lay(a.u, a.shoulder, M);
        const d = M.distanceTo(W);
        if (d > RYUK.l2) {
          V.copy(W).sub(M).normalize();
          W.copy(M).addScaledVector(V, RYUK.l2);
        }
        lay(a.f, M, W);
        if (right) out.hand.copy(W).addScaledVector(V.copy(W).sub(M).normalize(), 0.12).add(base);
      }
      // the notebook: at the belt, then up in the left hand
      const up = sm(T.ryuk - 0.4, T.ryuk + 0.1, t);
      book.position.set(-0.35 + 0.2 * up, 0.62 + 0.64 * up, 0.18 + 0.82 * up);
      book.rotation.set(0.25 - 0.8 * up, 0, 0);
      out.bookAt.copy(book.position).add(base);
    },
    dispose() {
      for (const x of geos) x.dispose();
      eyeM.dispose();
    },
  };
  return out;
}

// ---- L --------------------------------------------------------------------------------------------------------------
function lHair() {
  const p = [];
  for (let i = 0; i < 22; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const len = 0.16 + 0.2 * hash(i, 3);
    const c = new ConeGeometry(0.045, len, 4).translate(0, len / 2, 0);
    c.rotateZ(Math.cos(a) * 0.8).rotateX(Math.sin(a) * 0.8 + 0.5);
    p.push(c.translate(Math.cos(a) * 0.12, 1.9, 0.42 + Math.sin(a) * 0.12));
  }
  return merge(p);
}

export function buildL(mats) {
  const g = new Group();
  g.position.set(L_AT.x, 0, L_AT.z);
  const geos = [];
  const own = (x) => (geos.push(x), x);
  const mk = (geo, mat) => {
    const m = new Mesh(own(geo), mat);
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const lean = 0.18; // hunched forward
  // barefoot legs
  const legs = [];
  for (const s of [-1, 1]) {
    legs.push(limb([s * 0.12, 0.98, 0], [s * 0.13, 0.5, 0.06], 0.09, 0.075, 6), limb([s * 0.13, 0.5, 0.06], [s * 0.12, 0.07, 0.02], 0.075, 0.05, 6));
  }
  mk(merge(legs), mats.trousers);
  const feet = [-1, 1].map((s) => box(0.11, 0.07, 0.3, s * 0.12, 0.035, 0.12));
  // the loose white shirt: a wide soft tube, a ragged hem, baggy sleeves; the right hand to his lip, the left wrist on the chain
  const shirt = [limb([0, 0.82, 0], [0, 1.52, lean], 0.27, 0.22, 8), limb([0, 1.0, 0], [0, 0.7, 0], 0.27, 0.32, 8), limb([-0.22, 1.52, lean], [0.22, 1.52, lean], 0.09, 0.09, 5)];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    shirt.push(new ConeGeometry(0.06, 0.12, 3).rotateX(Math.PI).translate(Math.cos(a) * 0.3, 0.64, Math.sin(a) * 0.3));
  }
  const handLip = [-0.06, 1.7, 0.42];
  const elbowR = [-0.4, 1.28, 0.34];
  shirt.push(limb([-0.24, 1.52, lean], elbowR, 0.1, 0.12, 6), limb(elbowR, [-0.12, 1.66, 0.4], 0.12, 0.08, 6));
  const elbowL = [0.4, 1.12, 0.24];
  shirt.push(limb([0.24, 1.52, lean], elbowL, 0.1, 0.12, 6), limb(elbowL, [0.62, 0.8, 0.3], 0.12, 0.08, 6));
  mk(merge(shirt), mats.shirt);
  const skin = [...feet, limb([0, 1.52, lean], [0, 1.68, lean + 0.12], 0.08, 0.07, 5), ball(0.17, 0, 1.8, lean + 0.24, 1, 1.05, 1, 10, 8), ball(0.055, handLip[0], handLip[1], handLip[2] + 0.04, 1, 1, 1, 6, 4), limb(handLip, [0.0, 1.69, 0.5], 0.025, 0.02, 4), ball(0.06, 0.64, 0.74, 0.32, 1, 1, 1, 6, 4)];
  mk(merge(skin), mats.skin);
  mk(lHair(), mats.hair);
  mk(merge([new TorusGeometry(0.075, 0.018, 5, 10).rotateY(Math.PI / 2).translate(0.62, 0.8, 0.3)]), mats.cuff); // the cuff, the chain's end
  const wrist = new Vector3(0.62, 0.8, 0.3).add(g.position);
  const dripG = own(prep(new SphereGeometry(0.018, 5, 4).scale(1, 2.2, 1)));
  const drips = new InstancedMesh(dripG, mats.drip, 14);
  drips.frustumCulled = false;
  g.add(drips);
  return {
    group: g,
    wrist,
    tick(t) {
      g.rotation.z = 0.012 * Math.sin(t * 0.9);
      g.rotation.x = 0.01 * Math.sin(t * 0.7 + 1);
      for (let i = 0; i < 14; i++) {
        const ph = (t * (0.8 + 0.3 * hash(i, 1)) + hash(i, 2) * 5) % 1;
        const hair = i < 7;
        const a = hash(i, 3) * Math.PI * 2;
        D.position.set(hair ? Math.cos(a) * 0.16 : Math.cos(a) * 0.3, (hair ? 1.9 : 0.64) - ph * ph * 0.7, hair ? 0.42 + Math.sin(a) * 0.14 : Math.sin(a) * 0.3);
        D.scale.setScalar(ph < 0.95 ? 1 : 0.0001);
        D.rotation.set(0, 0, 0);
        D.updateMatrix();
        drips.setMatrixAt(i, D.matrix);
      }
      drips.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const x of geos) x.dispose();
      drips.dispose();
    },
  };
}

// ---- the colony pups and the apples ---------------------------------------------------------------------------------
// each pup flinches (a hop) on a toll, then munches its tiny apple on twos at the crunch
export const flinch = (i, t) => {
  let h = 0;
  for (const w of T.toll) {
    const d = t - w - 0.05 * hash(i, 4);
    if (d > 0 && d < 0.4) h = Math.max(h, Math.sin((d / 0.4) * Math.PI) * (0.1 + 0.07 * hash(i, 5)));
  }
  return h;
};
export const munch = (i, t) => (t > T.crunch - 0.55 && t < T.crunch + 0.6 ? Math.sin(Math.floor(t * 12) * 2.4 + i) : 0);

export function buildColony(mats) {
  const pupG = merge([ball(0.2, 0, 0.17, 0, 0.85, 0.62, 1.25, 8, 6), ball(0.15, 0, 0.3, 0.27, 1, 1, 1, 8, 6), ball(0.07, 0.17, 0.1, 0.12, 1.4, 0.4, 0.8, 5, 4), ball(0.07, -0.17, 0.1, 0.12, 1.4, 0.4, 0.8, 5, 4)]);
  const m = new InstancedMesh(pupG, mats.colony, COLONY.length);
  m.frustumCulled = false;
  const col = new Float32Array(COLONY.length * 3);
  for (let i = 0; i < COLONY.length; i++) col.set([0.8 + 0.2 * hash(i, 1), 0.82 + 0.15 * hash(i, 2), 0.86], i * 3);
  m.instanceColor = new InstancedBufferAttribute(col, 3);
  return {
    mesh: m,
    // where pup i's tiny apple is, in the rig frame
    appleAt: (i, t, out) => out.set(COLONY[i][0] + 0.12, 0.2 + flinch(i, t) + 0.02 * Math.max(0, munch(i, t)), COLONY[i][1] + 0.3),
    tick(t) {
      for (let i = 0; i < COLONY.length; i++) {
        const mu = munch(i, t);
        D.position.set(COLONY[i][0], flinch(i, t), COLONY[i][1]);
        D.rotation.set(0.05 * mu, -0.55 - 0.2 * hash(i, 3), 0.03 * mu);
        D.scale.set(1, 1, 1);
        D.updateMatrix();
        m.setMatrixAt(i, D.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    dispose: () => (pupG.dispose(), m.dispose()),
  };
}

export function buildApples(mats, n) {
  const g = merge([ball(0.16, 0, 0, 0, 1, 0.92, 1, 10, 8), box(0.012, 0.07, 0.012, 0, 0.17, 0)], true);
  const m = new InstancedMesh(g, mats.apple, n);
  m.frustumCulled = false;
  const hide = new Object3D();
  hide.position.set(0, -50, 0);
  hide.scale.setScalar(0.0001);
  hide.updateMatrix();
  for (let i = 0; i < n; i++) m.setMatrixAt(i, hide.matrix);
  return {
    mesh: m,
    set(i, x, y, z, s, rx = 0, rz = 0) {
      D.position.set(x, y, z);
      D.scale.setScalar(Math.max(s, 0.0001));
      D.rotation.set(rx, 0, rz);
      D.updateMatrix();
      m.setMatrixAt(i, D.matrix);
    },
    hide(i) {
      m.setMatrixAt(i, hide.matrix);
    },
    flush() {
      m.instanceMatrix.needsUpdate = true;
    },
    dispose: () => (g.dispose(), m.dispose()),
  };
}

export function figureMaterials() {
  return {
    ryuk: tene({ albedo: "#4a4452", wet: 0.6 }),
    ryukWing: tene({ albedo: "#3a3544", wet: 0.5, side: 2 }),
    book: tene({ albedo: "#2b2830", wet: 0.8 }),
    shirt: tene({ albedo: "#ece6d6", wet: 0.45 }),
    trousers: tene({ albedo: "#4b566a", wet: 0.4 }),
    skin: tene({ albedo: "#dcc6ad", wet: 0.5 }),
    hair: tene({ albedo: "#2a2523", wet: 0.9 }),
    cuff: tene({ albedo: "#b7b0a2", wet: 1 }),
    drip: new MeshBasicMaterial({ color: "#cfe4e6", toneMapped: false, fog: false }),
    colony: tene({ albedo: "#ffffff", wet: 0.5 }),
    apple: tene({ albedo: "#d1161f", wet: 1, emit: 0.08 }),
  };
}
