// THE CHAINS: 208 links, each link a PAIR of bound beads (a two-module SCC) joined to the next by a thin link. Gold foil
// card, one instanced mesh. Plus the budget hoop at link 100, the coral surge, the burst, the violet kirigami rosette,
// and the giant brass split-pins. Everything here is a card; the glow ones are pure light through paper.

import { CanvasTexture, CatmullRomCurve3, Color, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3 } from "three";
import { card, circle, merge } from "./paper";

export const N = 208;
export const DOOR = 100;
const BRASS = "#c9962e";
const GOLD = "#e2a928";

// one link: bead, short thick rib, bead, then the thin thread out to the next link (pitch 0.30)
function linkGeometry() {
  return merge([
    card(circle(-0.075, 0, 0.085, 10), { color: GOLD, depth: 0.045 }),
    card(circle(0.075, 0, 0.085, 10), { color: GOLD, depth: 0.045 }),
    card([[-0.075, -0.03], [0.075, -0.03], [0.075, 0.03], [-0.075, 0.03]], { color: "#c98c1c", depth: 0.05, z: 0.012 }),
    card([[0.14, -0.012], [0.3, -0.012], [0.3, 0.012], [0.14, 0.012]], { color: "#f0c860", depth: 0.03 }),
  ]);
}

// THE PATH, drawn for a fox at (2.2, 0.75, -8.5) in the theatre frame; the first and last control points are set per
// frame (the flipper, the pin). It coils: the hind leg, the tails' root, the shoulders, the jaws and a foreleg, as
// helices whose front halves pass before the fox's card and whose back halves pass behind it. 208 links at a pitch
// of about half a metre are 100 m of chain, so it has to wind.
function helix(out, from, to, R, Rz, turns, phase, zc, axis) {
  const n = Math.max(2, Math.round(turns * 12));
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const ph = phase + u * turns * Math.PI * 2;
    const x = from[0] + (to[0] - from[0]) * u;
    const y = from[1] + (to[1] - from[1]) * u;
    if (axis === "y") out.push([x + R * Math.cos(ph), y, zc + Rz * Math.sin(ph)]);
    else out.push([x, y + R * Math.cos(ph), zc + Rz * Math.sin(ph)]);
  }
}
function designPath() {
  const o = [[0.3, 0.8, -6.0], [1.6, 1.8, -6.4], [3.0, 1.0, -5.0]];
  helix(o, [5.0, 0.9], [5.2, 3.6], 1.1, 1.3, 2.5, -Math.PI / 2, -8.5, "y"); // the hind leg
  helix(o, [8.0, 2.8], [8.5, 7.0], 1.3, 1.2, 2.5, -Math.PI / 2, -9.2, "y"); // the tails' root
  o.push([6.2, 6.4, -7.6]);
  helix(o, [4.4, 4.5], [0.4, 4.2], 1.4, 1.3, 2.5, 0, -8.5, "x"); // the shoulders and the neck
  helix(o, [-0.6, 4.6], [-4.0, 3.9], 1.2, 1.2, 2.5, Math.PI, -8.6, "x"); // the jaws
  helix(o, [-1.2, 2.7], [-1.0, 0.9], 0.8, 1.0, 2, -Math.PI / 2, -8.2, "y"); // a foreleg
  o.push([-2.2, 1.0, -5.0], [-2.5, 1.0, -3.0], [-2.6, 1.25, -1.15]);
  return o;
}
export const CTRL = designPath();
const SAMPLES = 420;

export function buildChain(mats) {
  const links = new InstancedMesh(linkGeometry(), mats.foil, N);
  links.frustumCulled = false;
  for (let i = 0; i < N; i++) links.setColorAt(i, new Color(0.5, 0.4, 0.3));
  const pts = CTRL.map((p) => new Vector3(...p));
  const curve = new CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  return { links, pts, curve, table: new Float32Array(SAMPLES * 3), cum: new Float32Array(SAMPLES), P: new Float32Array(N * 3), total: 0 };
}

const V = new Vector3();
const Q = new Quaternion();
const O = new Object3D();
const X = new Vector3(1, 0, 0);
const TC = new Color();
const GOLDC = new Color(1.12, 0.96, 0.7);
const DULL = new Color(0.45, 0.36, 0.28);
const CORAL = new Color(1.0, 0.42, 0.34);
const FLASH = new Color(1.7, 1.5, 1.1);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// the path's sample table: arc length, then the position of link i by its fraction of the whole
function sample(C, flip, end) {
  C.pts[0].copy(flip);
  C.pts[C.pts.length - 1].copy(end);
  let len = 0;
  for (let s = 0; s < SAMPLES; s++) {
    C.curve.getPoint(s / (SAMPLES - 1), V);
    C.table[s * 3] = V.x;
    C.table[s * 3 + 1] = V.y;
    C.table[s * 3 + 2] = V.z;
    if (s) len += Math.hypot(V.x - C.table[(s - 1) * 3], V.y - C.table[(s - 1) * 3 + 1], V.z - C.table[(s - 1) * 3 + 2]);
    C.cum[s] = len;
  }
  C.total = len;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const want = (i / (N - 1)) * len;
    while (s < SAMPLES - 2 && C.cum[s + 1] < want) s++;
    const k = (want - C.cum[s]) / Math.max(1e-6, C.cum[s + 1] - C.cum[s]);
    for (let a = 0; a < 3; a++) C.P[i * 3 + a] = C.table[s * 3 + a] + (C.table[(s + 1) * 3 + a] - C.table[s * 3 + a]) * k;
  }
}

// t: scene seconds. T = { grow: [t0, t1], taut, surge: [t0, t1], door } the chain's own clock
export function poseChain(C, t, T, flip, end) {
  sample(C, flip, end);
  const pitch = C.total / (N - 1);
  const sc = pitch / 0.3;
  const front = smooth(T.grow[0], T.grow[1], t); // 0..1 how far the chain has flown
  const u = T.surge ? smooth(T.surge[0], T.surge[1], t) : 0; // the surge's front, 0..1 across links DOOR..N-1
  const ui = DOOR + u * (N - 1 - DOOR);
  for (let i = 0; i < N; i++) {
    const born = T.grow[0] + (T.grow[1] - T.grow[0]) * (i / (N - 1)); // when the whip reaches link i
    const age = t - born;
    const seen = age > -0.001 ? 1 : 0;
    const lock = smooth(0.0, 0.3, age);
    // the whip: before it locks a link thrashes about its place; after, the chain sags and snaps taut
    const wob = (1 - lock) * 0.55 * Math.sin(i * 0.4 - t * 15) * (age > 0 ? Math.exp(-age * 3) + 0.12 : 0);
    const sag = 0.38 * (1 - T.taut) * Math.sin((Math.PI * i) / (N - 1)) * smooth(0.2, 0.8, age);
    let x = C.P[i * 3];
    let y = C.P[i * 3 + 1] + wob - sag;
    let z = C.P[i * 3 + 2];
    // the tangent
    const j = Math.min(N - 1, i + 1);
    const h = Math.max(0, i - 1);
    V.set(C.P[j * 3] - C.P[h * 3], C.P[j * 3 + 1] - C.P[h * 3 + 1], C.P[j * 3 + 2] - C.P[h * 3 + 2]).normalize();
    if (i === N - 1) V.set(1, 0, 0);
    Q.setFromUnitVectors(X, V);
    // the clank: a link jumps a little as it locks
    const clank = age > 0 && age < 0.2 ? 1 + 0.5 * Math.sin((age / 0.2) * Math.PI) : 1;
    O.position.set(x, y, z);
    O.quaternion.copy(Q);
    O.scale.setScalar(Math.max(0.0001, seen * sc * clank * (1.0 + 0.0 * front)));
    O.updateMatrix();
    C.links.setMatrixAt(i, O.matrix);
    // colour: dull until it locks, then gold; a flash as it locks; coral where the surge has passed
    TC.copy(DULL).lerp(GOLDC, lock);
    if (age > 0.1 && age < 0.28) TC.lerp(FLASH, Math.sin(((age - 0.1) / 0.18) * Math.PI) * 0.7);
    if (T.surge && i >= DOOR) {
      const hot = i <= ui ? 1 - smooth(0.0, 1.4, (ui - i) / (N - DOOR) * 3.0) * 0.55 : 0;
      TC.lerp(CORAL, hot * (u > 0.001 ? 1 : 0));
    }
    C.links.setColorAt(i, TC);
  }
  C.links.instanceMatrix.needsUpdate = true;
  C.links.instanceColor.needsUpdate = true;
  return { door: [C.P[DOOR * 3], C.P[DOOR * 3 + 1], C.P[DOOR * 3 + 2]], surge: [C.P[Math.min(N - 1, Math.round(ui)) * 3], C.P[Math.min(N - 1, Math.round(ui)) * 3 + 1], C.P[Math.min(N - 1, Math.round(ui)) * 3 + 2]] };
}

// ---- the glow sprites: hoop, surge star, burst, rosette -----------------------------------------------------------------
const star = (n, ro, ri) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? ri : ro;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

// a kirigami rosette: scalloped disc, a ring of petal-shaped cuts, a ring of small round cuts, a hole at the centre
function lace(R, petals, color, twist = 0) {
  const outline = [];
  for (let i = 0; i < petals * 10; i++) {
    const a = (i / (petals * 10)) * Math.PI * 2;
    const r = R * (1 + 0.07 * Math.cos(petals * a));
    outline.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const holes = [];
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * Math.PI * 2 + twist;
    const r0 = 0.3 * R;
    const r1 = 0.7 * R;
    const w = 0.15 * R;
    const lens = [[r0, 0], [r0 + (r1 - r0) * 0.35, w], [r0 + (r1 - r0) * 0.75, w * 0.8], [r1, 0], [r0 + (r1 - r0) * 0.75, -w * 0.8], [r0 + (r1 - r0) * 0.35, -w]];
    holes.push(lens.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]));
    holes.push(circle(Math.cos(a + Math.PI / petals) * 0.84 * R, Math.sin(a + Math.PI / petals) * 0.84 * R, 0.065 * R, 6));
  }
  holes.push(circle(0, 0, 0.17 * R, 10));
  return card(outline, { holes, color, depth: 0.05 });
}

export function buildFx(mats) {
  const root = new Group();
  const mk = (geo, mat) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    m.visible = false;
    root.add(m);
    return m;
  };
  const hoop = mk(card(circle(0, 0, 1, 28), { holes: [circle(0, 0, 0.84, 28)], color: "#a276ff", depth: 0.09 }), mats.glow);
  const hoopFlash = mk(card(circle(0, 0, 1, 28), { color: "#c8a8ff", depth: 0.03, z: -0.05 }), mats.glow);
  const bolt = mk(card(star(4, 1, 0.22), { color: "#ff6b57", depth: 0.05 }), mats.glow);
  const boltCore = mk(card(star(4, 0.55, 0.14), { color: "#fff0d8", depth: 0.04, z: 0.05 }), mats.glow);
  const burst = mk(card(star(11, 1, 0.55), { color: "#ff6b57", depth: 0.06 }), mats.glow);
  const burstCore = mk(card(circle(0, 0, 0.55, 16), { color: "#ffd2a8", depth: 0.04, z: 0.04 }), mats.glow);
  const roseA = mk(lace(1.5, 12, "#7b4be0"), mats.rose);
  const roseB = mk(lace(1.0, 8, "#9566f0", 0.2), mats.rose);
  roseB.position.z = 0.1;
  return { root, hoop, hoopFlash, bolt, boltCore, burst, burstCore, roseA, roseB };
}

// ---- the giant split-pin: a brass head and two legs (pinned at the head) ----------------------------------------------
const leg = (s) => card([[s * 0.0, 0], [s * 0.2, 0], [s * 0.14, -1.3], [s * 0.02, -1.3]], { color: BRASS, depth: 0.06, z: -0.02 });
export function buildSplitPin(mats, r = 0.5) {
  const g = new Group();
  const head = new Mesh(merge([card(circle(0, 0, r, 18), { holes: [circle(0, 0, r * 0.5, 14)], color: BRASS, depth: 0.1 }), card(circle(0, 0, r * 1.0, 18), { holes: [circle(0, 0, r * 0.82, 14)], color: "#e8c066", depth: 0.04, z: 0.07 })]), mats.solid);
  const l = new Mesh(leg(-1), mats.solid);
  const rr = new Mesh(leg(1), mats.solid);
  for (const m of [head, l, rr]) m.frustumCulled = false;
  l.position.y = rr.position.y = -r * 0.7;
  g.add(head, l, rr);
  g.userData = { l, r: rr };
  return g;
}
export function splayPin(g, k) {
  g.userData.l.rotation.z = -0.6 * k - 0.02;
  g.userData.r.rotation.z = 0.6 * k + 0.02;
}

// ---- the end plaque: a cream card with the character for "end", red ----------------------------------------------------
export function buildPlaque() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const x = c.getContext("2d");
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = "#efe6d4";
    x.fillRect(8, 8, 240, 240);
    x.strokeStyle = "#b3221c";
    x.lineWidth = 6;
    x.strokeRect(20, 20, 216, 216);
    x.fillStyle = "#b3221c";
    x.font = "700 128px 'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'MS Mincho', serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("終", 128, 108);
    x.font = "800 38px 'Arial Black', Arial, sans-serif";
    x.fillText("THE END", 128, 196);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready?.then(draw, () => {});
  const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: tex, side: DoubleSide, toneMapped: false, fog: false, transparent: true }));
  m.visible = false;
  m.frustumCulled = false;
  return m;
}

// ---- FLYING THUNDER GOD: three three-pronged kunai (Minato's), yellow flash stars and lightning streaks -----------------
export const KUNAI = [[-3.2, 0, -3.0], [3.4, 0, -4.4], [0.3, 0, -6.0]]; // the pup's rig frame (the pup at the origin)
export function buildFtg(mats) {
  const root = new Group();
  const mk = (geo, mat, vis = false) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    m.visible = vis;
    root.add(m);
    return m;
  };
  const kGeo = () =>
    merge([
      card([[-0.2, 0], [0.4, 0.14], [1.0, 0], [0.4, -0.14]], { color: "#dfe8ff", depth: 0.05 }),
      card([[0.3, 0.1], [0.62, 0.38], [0.55, 0.06]], { color: "#dfe8ff", depth: 0.05 }),
      card([[0.3, -0.1], [0.62, -0.38], [0.55, -0.06]], { color: "#dfe8ff", depth: 0.05 }),
      card(circle(-0.42, 0, 0.17, 10), { holes: [circle(-0.42, 0, 0.09, 8)], color: "#ffcf1f", depth: 0.05 }),
    ]);
  const aura = card(circle(0.3, 0, 0.75, 16), { color: "#ffe21a", depth: 0.02, z: -0.08 });
  const kunai = KUNAI.map(() => {
    const g = new Group();
    g.add(new Mesh(kGeo(), mats.solid), new Mesh(aura, mats.glow));
    g.traverse((o) => (o.frustumCulled = false));
    g.visible = false;
    root.add(g);
    return g;
  });
  const flashes = [0, 1, 2, 3].map(() => mk(card(star(8, 1, 0.3), { color: "#ffe21a", depth: 0.04 }), mats.glow));
  const cores = [0, 1, 2, 3].map(() => mk(card(star(8, 0.55, 0.2), { color: "#fffbd0", depth: 0.04, z: 0.05 }), mats.glow));
  const bolt = [[0, 0], [0.25, 0.1], [0.45, -0.04], [0.7, 0.09], [1, 0], [0.7, -0.02], [0.45, -0.14], [0.25, -0.05]];
  const streaks = [0, 1, 2, 3].map(() => mk(card(bolt, { color: "#ffd400", depth: 0.04 }), mats.glow));
  const streaks2 = [0, 1, 2, 3].map(() => mk(card(bolt, { color: "#fff6a0", depth: 0.04, z: 0.04 }), mats.glow));
  return { root, kunai, flashes, cores, streaks, streaks2 };
}
