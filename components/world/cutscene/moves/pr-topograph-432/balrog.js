// THE BALROG as a stop-motion armature puppet: a horned mass built from lumpy clay parts joined at
// pivots (hips, chest, head, two arms, two wings), ember eyes that are light only, a flame-edged sword in
// the near hand, a whip in the far one, and on its chest a small coral gem (the install's ServiceAccount).
// It is posed from the stepped clock (S1) by pose(): weighty, held poses, never smooth. Its fire is a
// list of attachment points the fx cards read (fx.js), not part of the meshes.

import { BufferAttribute, BufferGeometry, Color, Group, Mesh, SphereGeometry, Vector3 } from "three";
import { clay, DoubleSide, hash, lump, merge, piece } from "./clay";
import { blob, slab, taper } from "./shapes";
import { deckY } from "./set";

export const BAL = { x: 3.0, z: -0.6, yaw: -1.0 };
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const BODY = "#2a1a22";
const HORN = "#8a5a44";
const WING = "#5a2a50";
const FACE = "#7a4636"; // the face, ember-lit from below by the chasm

// the sword's blade direction in the fist's frame (see pose(): it swings with the arm)
const BLADE = new Vector3(0, -0.23, 0.97).normalize();
export const BLADE_LEN = 2.4;

function lower() {
  const p = [blob([0, 1.75, 0], [0.8, 0.56, 0.58], BODY, { seed: 1 })];
  for (const s of [-1, 1]) {
    p.push(taper([s * 0.42, 1.7, 0.05], [s * 0.46, 0.95, 0.3], 0.38, 0.3, BODY, { lump: 0.05, seed: s }));
    p.push(taper([s * 0.46, 0.95, 0.3], [s * 0.5, 0.2, 0.2], 0.3, 0.24, BODY, { lump: 0.05, seed: s + 3 }));
    p.push(blob([s * 0.46, 0.95, 0.34], [0.3, 0.3, 0.3], BODY, { seed: s + 5 }));
    p.push(blob([s * 0.5, 0.13, 0.36], [0.4, 0.17, 0.52], BODY, { seed: s + 7 }));
  }
  return merge(p);
}

function torso() {
  const p = [
    blob([0, 0.85, 0], [0.95, 1.02, 0.72], BODY, { seed: 11 }),
    blob([0, 0.1, 0.06], [0.72, 0.58, 0.58], BODY, { seed: 12 }),
    blob([0, 1.62, -0.05], [0.62, 0.5, 0.5], BODY, { seed: 13 }),
  ];
  for (const s of [-1, 1]) {
    p.push(blob([s * 1.06, 1.55, 0], [0.52, 0.44, 0.48], BODY, { seed: 14 + s }));
    p.push(taper([s * 1.0, 1.9, 0], [s * 1.28, 2.55, -0.12], 0.2, 0.02, HORN, { seg: 6 }));
    p.push(taper([s * 0.55, 1.95, -0.1], [s * 0.7, 2.5, -0.35], 0.16, 0.02, HORN, { seg: 6 }));
  }
  for (let i = 0; i < 4; i++) p.push(taper([0, 0.4 + i * 0.5, -0.62], [0, 0.62 + i * 0.5, -1.0], 0.17, 0.02, HORN, { seg: 6 }));
  return merge(p);
}

function head() {
  const p = [
    blob([0, 0.15, 0.1], [0.46, 0.54, 0.49], FACE, { seed: 21 }),
    blob([0, -0.2, 0.34], [0.34, 0.24, 0.34], FACE, { seed: 22 }),
    blob([0, 0.34, 0.42], [0.46, 0.13, 0.22], "#5a2e28", { seed: 23 }), // the heavy brow
    blob([0, 0.06, 0.58], [0.1, 0.16, 0.12], "#9a5a42", { seed: 24, w: 8, h: 6 }), // the flat nose
    blob([0, -0.3, 0.5], [0.3, 0.07, 0.2], "#2a1214", { seed: 25, w: 10, h: 6 }), // the dark mouth
  ];
  for (const s of [-1, 1]) {
    p.push(blob([s * 0.3, 0.02, 0.5], [0.13, 0.17, 0.12], "#9a5a42", { seed: 26 + s, w: 8, h: 6 })); // cheekbones
    for (let k = 0; k < 3; k++) p.push(taper([s * (0.07 + 0.08 * k), -0.27, 0.62], [s * (0.07 + 0.08 * k), -0.42, 0.64], 0.035, 0.005, "#e8d2a8", { seg: 5, rows: 1 })); // fangs
    const pts = [[0.3, 0.5, 0], [0.62, 0.85, -0.1], [0.95, 1.3, -0.2], [1.15, 1.8, -0.36], [1.08, 2.25, -0.52]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      p.push(taper([s * a[0], a[1], a[2]], [s * b[0], b[1], b[2]], 0.21 - i * 0.04, 0.21 - (i + 1) * 0.04 + 0.005, HORN, { seg: 6, rows: 1 }));
    }
  }
  return merge(p);
}

function eyes() {
  const g = merge([-1, 1].map((s) => piece(new SphereGeometry(1, 8, 6).scale(0.11, 0.045, 0.05).rotateZ(s * 0.35).translate(s * 0.2, 0.2, 0.5), "#ffb347")));
  return g;
}

// the furnace in the mouth and the ember brow-light: light only, like the eyes
function mouthGlow() {
  return merge([piece(new SphereGeometry(1, 8, 6).scale(0.2, 0.05, 0.1).translate(0, -0.29, 0.62), "#ff8a3a"), piece(new SphereGeometry(1, 6, 5).scale(0.07, 0.03, 0.04).translate(0, 0.03, 0.66), "#ff9a4a")]);
}

function sword() {
  const b = BLADE.clone().multiplyScalar(BLADE_LEN);
  return merge([
    slab([0, 0, 0], [b.x, b.y, b.z], 0.2, 0.06, "#5b4a4a"),
    blob([0, 0, 0], [0.55, 0.07, 0.07], "#3a2c2c", { w: 8, h: 6, lump: 0.01 }),
    taper([0, 0.0, -0.05], [0, 0.3, -0.5], 0.06, 0.07, "#2a2020", { seg: 6, rows: 1 }),
  ]);
}

function armGeo(sword_) {
  const p = [
    blob([0, 0, 0], [0.34, 0.3, 0.32], BODY, { seed: 31 }),
    taper([0, 0, 0], [0.0, -0.85, 0.12], 0.28, 0.24, BODY, { lump: 0.05, seed: 32 }),
    blob([0, -0.85, 0.12], [0.27, 0.27, 0.27], BODY, { seed: 33 }),
    taper([0, -0.85, 0.12], [0, -1.55, 0.2], 0.24, 0.2, BODY, { lump: 0.05, seed: 34 }),
    blob([0, -1.6, 0.22], [0.26, 0.26, 0.24], BODY, { seed: 35 }),
  ];
  if (!sword_) p.push(taper([0, -1.6, 0.22], [0, -1.3, 0.8], 0.04, 0.045, "#3c2a24", { seg: 5, rows: 1 })); // the whip's handle
  return merge(p);
}

// one wing, opened toward +x: five ribs and the membrane between them
function wingGeo() {
  const ribs = [[1.0, 0.95, -0.2, 3.3], [1.3, 0.55, -0.35, 3.7], [1.5, 0.05, -0.4, 3.4], [1.25, -0.4, -0.35, 2.8], [0.85, -0.85, -0.2, 2.0]].map(([x, y, z, L]) => {
    const v = new Vector3(x, y, z).normalize().multiplyScalar(L);
    return [v.x, v.y, v.z];
  });
  const p = [];
  ribs.forEach((t, i) => {
    p.push(taper([0, 0, 0], t, 0.1, 0.025, "#7a4658", { seg: 5, rows: 2 }));
    if (i < ribs.length - 1) {
      const n = ribs[i + 1];
      const sag = (a, b, k) => [(a[0] + b[0]) / 2 - 0.15 * k, (a[1] + b[1]) / 2 - 0.2 * k, (a[2] + b[2]) / 2];
      const mid = sag(t, n, 1);
      const fan = [[[0, 0, 0], t, mid], [[0, 0, 0], mid, n]];
      for (const [a, b, c] of fan) p.push(triG(a, b, c, WING));
    }
  });
  return merge(p);
}

// a single triangle, subdivided once so the boil and lumps have vertices to move
function triG(a, b, c, color) {
  const m = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2];
  const pts = [a, b, c, m(a, b), m(b, c), m(c, a)];
  const idx = [0, 3, 5, 3, 1, 4, 5, 4, 2, 3, 4, 5];
  const pos = new Float32Array(idx.length * 3);
  idx.forEach((k, i) => pos.set(pts[k], i * 3));
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return piece(g, color);
}

export function buildBalrog() {
  const bodyMat = clay({ boil: 0.022, rim: 1.9, edge: 0.55, bump: 0.5, tex: 1.2 });
  const wingMat = clay({ boil: 0.03, rim: 1.8, edge: 0.5, bump: 0.3, tex: 0.7, side: DoubleSide });
  const eyeMat = clay({ boil: 0.004, emit: 2.4, edge: 0, bump: 0, tex: 1 });
  const mouthMat = clay({ boil: 0.004, emit: 1.3, edge: 0, bump: 0, tex: 1 });
  const gemMat = clay({ boil: 0.004, emit: 1.7, edge: 0, bump: 0.1, tex: 3, base: new Color("#ff6b57"), vertexColors: true });
  const bladeMat = clay({ boil: 0.01, rim: 0.7, edge: 0.7, bump: 0.3 });
  const geos = [];
  const mk = (g, m, parent, at = [0, 0, 0]) => {
    geos.push(g);
    const o = new Mesh(g, m);
    o.position.set(...at);
    o.frustumCulled = false;
    parent.add(o);
    return o;
  };
  const root = new Group();
  const hips = new Group();
  const chest = new Group();
  const neck = new Group();
  const armS = new Group();
  const armW = new Group();
  const wingL = new Group();
  const wingR = new Group();
  const swordG = new Group();
  root.add(hips);
  hips.add(chest);
  chest.add(neck, armS, armW, wingL, wingR);
  hips.position.set(0, 0, 0);
  chest.position.set(0, 1.85, 0);
  neck.position.set(0, 2.45, 0.12);
  armS.position.set(1.06, 1.5, 0.05);
  armW.position.set(-1.06, 1.5, 0.05);
  wingL.position.set(0.5, 1.5, -0.55);
  wingR.position.set(-0.5, 1.5, -0.55);
  mk(lower(), bodyMat, hips);
  mk(torso(), bodyMat, chest);
  mk(head(), bodyMat, neck);
  mk(eyes(), eyeMat, neck);
  mk(mouthGlow(), mouthMat, neck);
  mk(armGeo(true), bodyMat, armS);
  mk(armGeo(false), bodyMat, armW);
  armS.add(swordG);
  swordG.position.set(0, -1.6, 0.22);
  mk(sword(), bladeMat, swordG);
  const wg = wingGeo();
  mk(wg, wingMat, wingL);
  wingR.scale.x = -1;
  const wg2 = wg.clone();
  geos.push(wg2);
  const wr = new Mesh(wg2, wingMat);
  wr.frustumCulled = false;
  wingR.add(wr);
  const gem = mk(piece(lump(new SphereGeometry(0.2, 10, 8).scale(1, 1.2, 0.8), 0.015, 3), "#ffffff"), gemMat, chest, [0, 1.0, 0.68]);
  root.position.set(BAL.x, deckY(BAL.x), BAL.z);
  root.rotation.y = BAL.yaw;

  // fire attachment points: [part, x, y, z, size, kind]  kind 0 body ember, 1 sword edge, 2 whip hand
  const fire = [];
  const add = (part, x, y, z, size, kind) => fire.push({ part, x, y, z, size, kind, id: fire.length });
  for (const s of [-1, 1]) {
    add(neck, s * 1.08, 2.25, -0.5, 0.7, 0); // horn tips
    add(neck, s * 0.95, 1.3, -0.2, 0.5, 0);
    add(chest, s * 1.28, 2.55, -0.12, 0.7, 0); // shoulder spikes
    add(chest, s * 0.7, 2.5, -0.35, 0.55, 0);
    add(chest, s * 1.0, 1.4, 0.3, 0.45, 0);
  }
  for (let i = 0; i < 4; i++) add(chest, 0, 0.62 + i * 0.5, -1.0, 0.55 - i * 0.04, 0); // along the spine
  add(neck, 0, 0.8, -0.2, 0.5, 0);
  for (let i = 0; i < 5; i++) add(neck, (i - 2) * 0.28, 0.75 + 0.1 * (2 - Math.abs(i - 2)), -0.35, 0.8 - 0.08 * Math.abs(i - 2), 2); // the burning mane behind the head
  add(neck, 0, -0.3, 0.55, 0.3, 2); // breath at the mouth
  add(armS, 0, -1.6, 0.2, 0.5, 0);
  add(armW, 0, -1.6, 0.2, 0.55, 2);
  add(armW, 0, -1.3, 0.8, 0.5, 2);
  add(armW, 0.05, -1.5, 0.5, 0.45, 2);
  for (let i = 0; i < 12; i++) {
    const k = 0.1 + (i / 11) * 0.9;
    add(swordG, BLADE.x * BLADE_LEN * k, BLADE.y * BLADE_LEN * k + 0.04, BLADE.z * BLADE_LEN * k, 0.55 - 0.25 * k, 1);
  }
  for (let i = 0; i < 5; i++) {
    const t = 0.35 + i * 0.16;
    add(wingL, 3.3 * t * 0.8, 0.95 * 3.3 * t * 0.7, -0.7 * t, 0.5, 0);
    add(wingR, 3.3 * t * 0.8, 0.95 * 3.3 * t * 0.7, -0.7 * t, 0.5, 0);
  }
  return {
    root,
    hips,
    chest,
    neck,
    armS,
    armW,
    wingL,
    wingR,
    swordG,
    gem,
    gemMat,
    fire,
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of [bodyMat, wingMat, eyeMat, mouthMat, gemMat, bladeMat]) m.dispose();
      root.removeFromParent();
    },
  };
}

// the puppet's pose at stepped time tt (seconds; hit-stop already applied by the caller)
export function poseBalrog(B, tt, T) {
  const odd = Math.floor(tt * 12) % 2 ? 1 : -1;
  const fall = tt - T.fall;
  const falling = fall > 0;
  const wob = smooth(T.crackStart, T.fall, tt) * (1 - smooth(T.fall, T.fall + 0.05, tt));
  const sway = Math.sin(tt * 2.3) * 0.02;
  // the sword blow: windup, strike, deflected, guard
  const wind = smooth(T.blow[0], T.blow[1], tt);
  const hit = smooth(T.blow[1], T.blow[1] + 0.2, tt);
  const rec = smooth(T.parry, T.parry + 0.4, tt);
  const guard = smooth(T.parry + 0.4, T.parry + 1.3, tt);
  let sx = -1.75; // guard: the sword up and ahead
  sx += (-2.75 - -1.75) * wind;
  sx += (-0.5 - -2.75) * hit;
  sx += (-2.2 - -0.5) * rec;
  sx += (-1.75 - -2.2) * guard;
  const sz = (-0.15 * wind + 0.5 * hit - 0.6 * rec + 0.25 * guard) * 1.0;
  // the whip arm: raised, cracking in the hall, thrown at the gates, jerked back with each lash
  let wx = -2.3 + 0.12 * Math.sin(Math.floor(tt * 3) * 2.1);
  const throwK = smooth(T.lash[0] - 0.2, T.lash[0] + 0.25, tt) * (1 - smooth(T.lash[2] + 0.9, T.lash[2] + 1.3, tt));
  wx += (-1.25 + 2.3) * throwK;
  for (const l of T.lash) wx += -0.5 * Math.max(0, 1 - Math.abs(tt - (l + 0.25)) / 0.2);
  const open = smooth(1.7, 4.6, tt) * (1 - smooth(T.fall + 0.2, T.fall + 0.75, tt));
  B.root.visible = fall < 2.5;
  const x = BAL.x - 0.5 * Math.max(0, fall) * 0.8;
  B.root.position.set(x + 0.025 * wob * odd, deckY(BAL.x) - (falling ? 6.5 * fall * fall : 0) - 0.015 * wob, BAL.z);
  B.root.rotation.set(falling ? -1.15 * Math.min(1, fall / 0.9) : 0, BAL.yaw + (falling ? 0.4 * fall : 0), 0.05 * wob * odd + (falling ? 0.5 * fall : 0));
  B.chest.rotation.set(0.04 * hit * (1 - rec) + 0.22 * Math.max(0, hit - rec) - 0.1 * wind * (1 - hit) + sway, -0.08 * wind + 0.1 * hit * (1 - rec), 0.02 * Math.sin(tt * 1.7));
  B.neck.rotation.set(-0.3 * Math.max(0, hit - rec) - 0.12 * smooth(T.parry, T.parry + 0.1, tt) * (1 - guard), 0.16 + 0.1 * Math.sin(tt * 1.3), 0);
  B.armS.rotation.set(falling ? -2.9 + 0.5 * Math.sin(fall * 7) : sx, falling ? 0 : 0.0, falling ? 0.4 : sz);
  B.armW.rotation.set(falling ? -2.7 + 0.5 * Math.sin(fall * 6 + 2) : wx, 0, falling ? -0.5 : -0.35 + 0.2 * throwK);
  const fold = 1.3 * (1 - open) + 0.12;
  B.wingL.rotation.set(0.1 * Math.sin(tt * 1.4) * open, fold, 0.1 - 0.12 * (1 - open));
  B.wingR.rotation.set(0.1 * Math.sin(tt * 1.4 + 1) * open, -fold, 0.1 - 0.12 * (1 - open));
  B.root.updateMatrixWorld(true);
}

// the gem's colour: coral until `to`, mint after, three drawings between
export function gemColor(tt, to) {
  const k = Math.min(1, Math.max(0, (tt - to) / 0.25));
  return Math.round(k * 3) / 3;
}
export { hash };
