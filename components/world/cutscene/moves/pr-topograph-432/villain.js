// AINZ OOAL GOWN as a comic villain (Mignola angles, Lee menace): an angular skeleton in a sharp-shouldered black and
// purple robe, gold trim, shoulder spikes and a tall gold collar; a bone-white skull with red eye-points; bony hands with
// rings; a red orb in the ribcage; the gold seven-gem staff; a cape that flares. Every part is flat colour with an ink hull.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Group, Matrix4, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { disposeInked, fuse, inked, paint, toon } from "./comic";

const BONE = "#ece4cc";
const GOLD = "#f0b429";
const BLACK = "#0c0614";
const PURPLE = "#3b1670";
const CRIMSON = "#d0142f";
const GEMS = ["#ff2a3c", "#ff9a2e", "#ffe14a", "#3be06a", "#35c8ff", "#8a5cff", "#ff5ad2"];

// place a primitive (scale, rotate xyz, move) and paint it one flat colour
const M4 = new Matrix4();
const Q = new Quaternion();
function P(geo, hex, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], sway = 0 } = {}) {
  M4.compose(new Vector3(...p), Q.setFromEuler(new Euler(r[0], r[1], r[2])), new Vector3(...s));
  return paint(geo.clone().applyMatrix4(M4), hex, sway);
}
const box = (w, h, d, hex, o) => P(new BoxGeometry(w, h, d), hex, o);
const cone = (r, h, seg, hex, o) => P(new ConeGeometry(r, h, seg), hex, o);
const cyl = (rt, rb, h, seg, hex, o) => P(new CylinderGeometry(rt, rb, h, seg), hex, o);
const ball = (r, hex, o) => P(new SphereGeometry(r, 10, 8), hex, o);

function skull() {
  return fuse([
    ball(0.3, BONE, { s: [0.92, 1.08, 1.0], p: [0, 0.05, 0] }),
    box(0.3, 0.17, 0.3, BONE, { p: [0, -0.27, 0.05], r: [0.12, 0, 0] }), // jaw
    cone(0.07, 0.2, 4, BONE, { p: [-0.2, -0.1, 0.18], r: [0, 0, 0.9] }), // cheekbones, sharp
    cone(0.07, 0.2, 4, BONE, { p: [0.2, -0.1, 0.18], r: [0, 0, -0.9] }),
    cone(0.05, 0.11, 3, "#150a1c", { p: [0, -0.07, 0.3], r: [Math.PI, 0, 0] }), // the nose
    ball(0.1, "#09030f", { p: [-0.12, 0.04, 0.22], s: [1, 1.15, 0.6] }), // sockets
    ball(0.1, "#09030f", { p: [0.12, 0.04, 0.22], s: [1, 1.15, 0.6] }),
    ...[-0.12, -0.06, 0, 0.06, 0.12].map((x) => box(0.012, 0.09, 0.012, "#09030f", { p: [x, -0.29, 0.2] })), // teeth gaps
  ]);
}
const eyeGeo = () => fuse([ball(0.04, CRIMSON, { p: [-0.12, 0.04, 0.27] }), ball(0.04, CRIMSON, { p: [0.12, 0.04, 0.27] })]);

function ribs() {
  const l = [box(0.07, 0.95, 0.07, BONE, { p: [0, 0.4, -0.12] }), box(0.08, 0.5, 0.05, BONE, { p: [0, 0.5, 0.26] })];
  for (let i = 0; i < 5; i++) l.push(P(new TorusGeometry(0.34 - 0.025 * i, 0.028, 4, 10, Math.PI * 1.35), BONE, { p: [0, 0.18 + 0.15 * i, 0], r: [Math.PI / 2, 0, Math.PI * 0.82], s: [1, 0.85, 1] }));
  return fuse(l);
}

function robeLower() {
  return fuse([
    cyl(0.45, 1.1, 1.9, 6, BLACK, { p: [0, -0.95, 0] }),
    cyl(0.47, 1.12, 0.14, 6, GOLD, { p: [0, -1.88, 0] }),
    box(0.55, 1.5, 0.05, PURPLE, { p: [0, -0.95, 0.6], r: [0.28, 0, 0] }),
    box(0.06, 1.5, 0.06, GOLD, { p: [-0.28, -0.95, 0.62], r: [0.28, 0, 0] }),
    box(0.06, 1.5, 0.06, GOLD, { p: [0.28, -0.95, 0.62], r: [0.28, 0, 0] }),
  ]);
}

function yoke() {
  const l = [box(1.7, 0.3, 0.75, BLACK, { p: [0, 1.0, 0] }), box(1.74, 0.07, 0.79, GOLD, { p: [0, 1.17, 0] }), box(0.7, 0.55, 0.12, PURPLE, { p: [0, 0.1, 0.34] }), box(0.7, 0.05, 0.14, GOLD, { p: [0, -0.18, 0.34] })];
  for (const s of [-1, 1]) {
    l.push(box(0.5, 0.2, 0.7, BLACK, { p: [s * 0.95, 1.05, 0], r: [0, 0, -s * 0.2] }), box(0.52, 0.05, 0.72, GOLD, { p: [s * 0.95, 1.17, 0], r: [0, 0, -s * 0.2] }));
    // pauldron spikes: three, sweeping up and out
    for (let k = 0; k < 3; k++) l.push(cone(0.1 - k * 0.012, 0.75 - k * 0.12, 4, k ? BLACK : GOLD, { p: [s * (1.12 + 0.12 * k), 1.35 + 0.1 * k, (k - 1) * 0.2], r: [0, 0, -s * (0.55 + 0.25 * k)] }));
    // the tall gold collar: a sharp fin up behind each side of the skull
    l.push(cone(0.42, 1.9, 4, GOLD, { p: [s * 0.62, 1.95, -0.2], r: [0, 0, -s * 0.34], s: [1, 1, 0.16] }), cone(0.28, 1.45, 4, "#7a1a2a", { p: [s * 0.6, 1.9, -0.13], r: [0, 0, -s * 0.34], s: [1, 1, 0.1] }));
  }
  return fuse(l);
}

function sleeve(len, r0, r1) {
  return fuse([cyl(r0, r1, len, 5, BLACK, { p: [0, -len / 2, 0] }), cyl(r1 + 0.02, r1 + 0.04, 0.1, 5, GOLD, { p: [0, -len + 0.05, 0] }), box(0.06, len * 0.85, r0 * 1.3, PURPLE, { p: [0, -len / 2, r0 * 0.7] })]);
}
function hand() {
  const l = [box(0.15, 0.19, 0.045, BONE, { p: [0, -0.1, 0] })];
  for (let f = 0; f < 4; f++) {
    const a = (f - 1.5) * 0.17;
    l.push(box(0.027, 0.23, 0.027, BONE, { p: [(f - 1.5) * 0.04 + Math.sin(a) * 0.1, -0.31, 0.02], r: [-0.18, 0, a * 0.9] }), P(new TorusGeometry(0.02, 0.008, 4, 6), f === 1 ? CRIMSON : "#ffd35a", { p: [(f - 1.5) * 0.04 + Math.sin(a) * 0.05, -0.23, 0.014], r: [Math.PI / 2 - 0.18, 0, 0] }));
  }
  l.push(ball(0.017, CRIMSON, { p: [0.045, -0.23, 0.04] }), box(0.03, 0.17, 0.03, BONE, { p: [0.11, -0.1, 0.03], r: [0, 0, 0.7] }));
  return fuse(l);
}

function staff() {
  const l = [cyl(0.05, 0.045, 4.3, 6, GOLD, { p: [0, 0.4, 0] }), cone(0.07, 0.3, 4, GOLD, { p: [0, -1.9, 0], r: [Math.PI, 0, 0] }), P(new TorusGeometry(0.42, 0.06, 5, 7), GOLD, { p: [0, 2.9, 0] })];
  GEMS.forEach((c, k) => {
    const a = (k / 7) * Math.PI * 2 + Math.PI / 2;
    l.push(ball(0.085, c, { p: [Math.cos(a) * 0.42, 2.9 + Math.sin(a) * 0.42, 0] }), cone(0.05, 0.22, 4, GOLD, { p: [Math.cos(a) * 0.6, 2.9 + Math.sin(a) * 0.6, 0], r: [0, 0, a - Math.PI / 2] }));
  });
  l.push(cone(0.1, 0.5, 4, GOLD, { p: [0, 3.5, 0] }));
  return fuse(l);
}

// the cape: from the yoke down to a jagged hem, gold along the edges, crimson at the points; aSway gives the flutter
function capeGeo() {
  const I = 8;
  const J = 12;
  const pos = [];
  const col = [];
  const sw = [];
  const idx = [];
  const cb = new Color(BLACK);
  const cp = new Color(PURPLE);
  const cg = new Color(GOLD);
  const cc = new Color(CRIMSON);
  for (let i = 0; i <= I; i++) {
    const t = i / I;
    for (let j = 0; j <= J; j++) {
      const v = j / J - 0.5;
      const jag = i === I ? (j % 2 ? -0.5 : 0) : 0;
      pos.push(v * (1.5 + 3.6 * t * t), 1.1 - (3.7 + jag) * t, -0.4 - 0.9 * t * (1 - Math.abs(v) * 0.7));
      const edge = Math.abs(v) > 0.46;
      const c = edge ? cg : i === I ? cc : (j + i) % 4 < 1 ? cp : cb;
      col.push(c.r, c.g, c.b);
      sw.push(t * t);
    }
  }
  for (let i = 0; i < I; i++)
    for (let j = 0; j < J; j++) {
      const a = i * (J + 1) + j;
      idx.push(a, a + J + 1, a + 1, a + 1, a + J + 1, a + J + 2);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute("aSway", new BufferAttribute(new Float32Array(sw), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildAinz() {
  const root = new Group();
  const hips = new Group();
  root.add(hips);
  const parts = [];
  const add = (parent, geo, o) => {
    const g = inked(geo, o);
    parent.add(g);
    parts.push(g);
    return g;
  };
  const robe = add(hips, robeLower());
  const torso = new Group();
  torso.position.y = 0.05;
  hips.add(torso);
  add(torso, ribs());
  add(torso, yoke());
  const capeG = new Group();
  torso.add(capeG);
  add(capeG, capeGeo(), { sway: true, side: true });
  // the red orb in the ribcage, ringed in gold
  const orb = add(torso, fuse([ball(0.14, CRIMSON, { p: [0, 0.5, 0.05] }), P(new TorusGeometry(0.2, 0.02, 4, 8), GOLD, { p: [0, 0.5, 0.05] })]));
  const head = new Group();
  head.position.y = 1.32;
  torso.add(head);
  add(head, skull());
  const eyes = new Mesh(eyeGeo(), toon());
  eyes.material.uniforms.uEmit.value = 1;
  eyes.frustumCulled = false;
  head.add(eyes);
  // arms: shoulder -> elbow -> hand; the right hand holds the staff
  const arms = [-1, 1].map((s) => {
    const sh = new Group();
    sh.position.set(s * 0.95, 0.98, 0);
    torso.add(sh);
    add(sh, sleeve(0.85, 0.2, 0.26));
    const el = new Group();
    el.position.y = -0.85;
    sh.add(el);
    add(el, sleeve(0.8, 0.16, 0.22));
    const hd = new Group();
    hd.position.y = -0.8;
    hd.scale.setScalar(1.35);
    el.add(hd);
    add(hd, hand());
    return { sh, el, hd };
  });
  const stf = new Group();
  add(stf, staff());
  root.add(stf);
  return {
    root,
    hips,
    robe,
    torso,
    head,
    eyes,
    orb,
    capeG,
    arms,
    staff: stf,
    dispose() {
      for (const p of parts) disposeInked(p);
      eyes.geometry.dispose();
      eyes.material.dispose();
      root.removeFromParent();
    },
  };
}

const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, k) => a + (b - a) * k;
const QA = new Quaternion();
const QB = new Quaternion();
const V3 = new Vector3();
const Z = new Vector3(0, 0, 1);

// rise 0 (seated) .. 1 (standing); open 0 (hands on the arms) .. 1 (arms wide, staff raised); flare the cape; eye 0..1
export function poseAinz(B, { rise, open, flare, eye }) {
  const r = sm(0, 1, rise);
  B.robe.scale.y = lerp(0.52, 1, r);
  B.torso.rotation.x = lerp(0.14, -0.12, r);
  B.head.rotation.x = lerp(0.3, -0.22, r);
  B.head.rotation.y = lerp(0.05, -0.1, r);
  B.eyes.scale.setScalar(Math.max(0.001, eye));
  B.orb.userData.lit.material.uniforms.uEmit.value = 0.55 + 0.4 * flare;
  B.capeG.scale.set(1 + 0.75 * flare, 1, 1 + 0.6 * flare);
  B.capeG.rotation.x = 0.1 * flare;
  const [L, R] = B.arms;
  // seated: forearms resting forward; open: the left arm wide and up, the right lifts the staff
  L.sh.rotation.set(lerp(-0.5, -0.1, open), 0, lerp(-0.22, -2.0, open));
  L.el.rotation.set(lerp(-1.0, -0.55, open), 0, lerp(0, -0.3, open));
  R.sh.rotation.set(lerp(-0.55, -0.9, open), 0, lerp(0.25, 0.55, open));
  R.el.rotation.set(lerp(-1.0, -1.1, open), 0, 0);
  B.root.updateMatrixWorld(true);
  // the staff stands in the right fist, upright in the world, a little out
  R.hd.getWorldPosition(V3);
  B.root.worldToLocal(V3);
  B.staff.position.copy(V3);
  B.staff.position.y += 0.1;
  B.root.getWorldQuaternion(QA).invert();
  QB.setFromAxisAngle(Z, -0.07);
  B.staff.quaternion.copy(QA).multiply(QB);
}
