// AINZ OOAL GOWN as a stop-motion armature puppet: a skeletal lich in a black-and-purple robe with a gold-trimmed
// high collar and gold shoulder spikes, built from lumpy clay parts joined at pivots (hips, chest, skull, two arms,
// two cape wings), red eye-points that are light only, the Staff of Ainz Ooal Gown (gold, a ring of seven gems) in
// the near hand, a bolt-whip of crimson magic in the far one, and in his ribcage a red orb (the install's ServiceAccount).
// It is posed from the stepped clock (S1) by pose(): weighty, held poses, never smooth. Its fire is a
// list of attachment points the fx cards read (fx.js), not part of the meshes.

import { BufferAttribute, BufferGeometry, Color, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { clay, DoubleSide, hash, lump, merge, piece } from "./clay";
import { blob, slab, taper } from "./shapes";
import { deckY } from "./set";

export const AINZ = { x: 3.0, z: -0.6, yaw: -1.0 };
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const BODY = "#1c1030";
const HORN = "#e6b43a";
const WING = "#4a1f8a";
const FACE = "#ece4cf"; // the bare skull

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
    blob([0, 0.2, 0.08], [0.44, 0.5, 0.46], FACE, { seed: 21 }), // the cranium
    blob([0, -0.22, 0.3], [0.3, 0.2, 0.3], FACE, { seed: 22 }), // the jaw
    blob([0, 0.06, 0.5], [0.07, 0.1, 0.06], "#2a1a30", { seed: 24, w: 8, h: 6 }), // the nose hole
    blob([0, -0.3, 0.46], [0.26, 0.05, 0.16], "#2a1a30", { seed: 25, w: 10, h: 6 }), // the grin
    blob([0, 0.5, -0.05], [0.3, 0.07, 0.3], HORN, { seed: 27, w: 10, h: 6 }), // the gold circlet
  ];
  for (const s of [-1, 1]) {
    p.push(blob([s * 0.19, 0.19, 0.46], [0.13, 0.15, 0.09], "#120a1e", { seed: 26 + s, w: 8, h: 6 })); // the eye sockets
    for (let k = 0; k < 3; k++) p.push(taper([s * (0.07 + 0.08 * k), -0.27, 0.58], [s * (0.07 + 0.08 * k), -0.37, 0.6], 0.03, 0.01, "#f6f0e0", { seg: 5, rows: 1 })); // teeth
  }
  // the high collar: two gold-trimmed fans standing behind and beside the skull
  for (const s of [-1, 1]) {
    p.push(slab([s * 0.3, -0.1, -0.05], [s * 0.62, 0.95, -0.2], 0.28, 0.04, BODY));
    p.push(slab([s * 0.62, 0.95, -0.2], [s * 0.64, 1.0, -0.2], 0.3, 0.05, HORN));
  }
  return merge(p);
}

function eyes() {
  const g = merge([-1, 1].map((s) => piece(new SphereGeometry(1, 8, 6).scale(0.05, 0.05, 0.05).translate(s * 0.19, 0.19, 0.52), "#ff2a2a")));
  return g;
}

// the furnace in the mouth and the ember brow-light: light only, like the eyes
function mouthGlow() {
  return merge([piece(new SphereGeometry(1, 6, 5).scale(0.03, 0.03, 0.03).translate(0, -0.3, 0.62), "#ff2a2a")]);
}

function sword() {
  const b = BLADE.clone().multiplyScalar(BLADE_LEN);
  const p = [slab([0, 0, 0], [b.x, b.y, b.z], 0.07, 0.07, "#e6b43a"), blob([b.x, b.y, b.z], [0.3, 0.3, 0.06], HORN, { w: 14, h: 4, lump: 0.01 })];
  // the head: a gold ring of seven serpents, each holding a gem
  const GEMS = ["#ff3b3b", "#ff9a2e", "#ffe14a", "#3be06a", "#35c8ff", "#7a5cff", "#ff5ad2"];
  GEMS.forEach((c, k) => {
    const a = (k / 7) * Math.PI * 2;
    p.push(blob([b.x + Math.cos(a) * 0.3, b.y + Math.sin(a) * 0.3, b.z], [0.075, 0.075, 0.075], c, { w: 6, h: 5, lump: 0.004 }));
  });
  return merge(p);
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

export function buildAinz() {
  const bodyMat = clay({ boil: 0.022, rim: 1.9, edge: 0.55, bump: 0.5, tex: 1.2 });
  const wingMat = clay({ boil: 0.03, rim: 1.8, edge: 0.5, bump: 0.3, tex: 0.7, side: DoubleSide });
  const eyeMat = clay({ boil: 0.004, emit: 2.4, edge: 0, bump: 0, tex: 1 });
  const mouthMat = clay({ boil: 0.004, emit: 1.3, edge: 0, bump: 0, tex: 1 });
  const gemMat = clay({ boil: 0.004, emit: 1.7, edge: 0, bump: 0.1, tex: 3, base: new Color("#ff2f5e"), vertexColors: true });
  const boneMat = clay({ boil: 0.004, rim: 1.2, edge: 0.4, bump: 0.2, vertexColors: true });
  const bladeMat = clay({ boil: 0.01, rim: 1.6, edge: 0.7, bump: 0.3, vertexColors: true });
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
  const gem = mk(piece(lump(new SphereGeometry(0.3, 10, 8).scale(1, 1.1, 0.8), 0.015, 3), "#ffffff"), gemMat, chest, [0, 1.0, 0.68]);
  for (let k = 0; k < 4; k++) mk(piece(new TorusGeometry(0.4 - 0.02 * k, 0.025, 4, 12, Math.PI).translate(0, 0.78 + k * 0.17, 0.6), "#f6f0e0"), boneMat, chest); // the ribcage round the orb
  root.position.set(AINZ.x, deckY(AINZ.x), AINZ.z);
  root.rotation.y = AINZ.yaw;

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
      for (const m of [bodyMat, wingMat, eyeMat, mouthMat, gemMat, bladeMat, boneMat]) m.dispose();
      root.removeFromParent();
    },
  };
}

// the puppet's pose at stepped time tt (seconds; hit-stop already applied by the caller)
export function poseAinz(B, tt, T) {
  const odd = Math.floor(tt * 12) % 2 ? 1 : -1;
  const fall = tt - T.fall;
  const falling = false; // Ainz never falls: he rises on Fly while the span under him is unmade
  const rise = smooth(T.fall, T.fall + 0.9, tt);
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
  B.root.visible = true;
  const x = AINZ.x;
  B.root.position.set(x + 0.025 * wob * odd, deckY(AINZ.x) + 1.1 * rise - 0.015 * wob, AINZ.z);
  B.root.rotation.set(falling ? -1.15 * Math.min(1, fall / 0.9) : 0, AINZ.yaw + (falling ? 0.4 * fall : 0), 0.05 * wob * odd + (falling ? 0.5 * fall : 0));
  B.chest.rotation.set(0.04 * hit * (1 - rec) + 0.22 * Math.max(0, hit - rec) - 0.1 * wind * (1 - hit) + sway, -0.08 * wind + 0.1 * hit * (1 - rec), 0.02 * Math.sin(tt * 1.7));
  B.neck.rotation.set(-0.3 * Math.max(0, hit - rec) - 0.12 * smooth(T.parry, T.parry + 0.1, tt) * (1 - guard), 0.16 + 0.1 * Math.sin(tt * 1.3), 0);
  B.armS.rotation.set(falling ? -2.9 + 0.5 * Math.sin(fall * 7) : sx, falling ? 0 : 0.0, falling ? 0.4 : sz);
  B.armW.rotation.set(falling ? -2.7 + 0.5 * Math.sin(fall * 6 + 2) : wx, 0, falling ? -0.5 : -0.35 + 0.2 * throwK);
  const fold = 1.3 * (1 - open) + 0.12;
  B.wingL.rotation.set(0.1 * Math.sin(tt * 1.4) * open, fold, 0.1 - 0.12 * (1 - open));
  B.wingR.rotation.set(0.1 * Math.sin(tt * 1.4 + 1) * open, -fold, 0.1 - 0.12 * (1 - open));
  B.root.updateMatrixWorld(true);
}

// the gem's colour: crimson until `to`, gold after, three drawings between
export function gemColor(tt, to) {
  const k = Math.min(1, Math.max(0, (tt - to) / 0.25));
  return Math.round(k * 3) / 3;
}
export { hash };
