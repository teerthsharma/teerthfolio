// The Epsilon-Hollow plaza's expo pavilion: a hollow geodesic globe on a lift shaft over a tripod platform, in the place's own colours.
// Ported from 460bafd components/world/monuments/Collapse.jsx and parts/collapse-sphere.js, static pieces only (the motion bakes into the plate).
import { BackSide, BoxGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";

const UP = new Vector3(0, 1, 0);
const CANDY = ["#ff5d8f", "#ffb238", "#33e6b3", "#5b8dff"];
export const SUN = new Vector3(-14, 26, 12).normalize();
export const VERT = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec3 vV;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIT = /* glsl */ `uniform vec3 uC; uniform vec3 uShade; uniform vec3 uSun; varying vec3 vN;
  void main() { float l = 0.86 + 0.14 * max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(mix(uShade, uC, l), 0.99); }`;

export function lit(hex, shade = new Color(hex).multiplyScalar(0.8)) {
  return new ShaderMaterial({ uniforms: { uC: { value: new Color(hex) }, uShade: { value: new Color(shade) }, uSun: { value: SUN } }, vertexShader: VERT, fragmentShader: LIT, side: DoubleSide });
}
export const basic = (color, o = {}) => new MeshBasicMaterial({ color, toneMapped: false, ...o });

const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};

// An icosahedron subdivided once, each midpoint pushed onto the unit sphere; returns its vertices and its unique edges.
function icosphere() {
  const t = (1 + Math.sqrt(5)) / 2;
  const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const mid = new Map();
  const m = (a, b) => {
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!mid.has(k)) { V.push(norm([0, 1, 2].map((i) => (V[a][i] + V[b][i]) / 2))); mid.set(k, V.length - 1); }
    return mid.get(k);
  };
  const NF = [];
  for (const [a, b, c] of F) {
    const ab = m(a, b), bc = m(b, c), ca = m(c, a);
    NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  const seen = new Set(), E = [];
  for (const [a, b, c] of NF) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    const k = p < q ? `${p}_${q}` : `${q}_${p}`;
    if (!seen.has(k)) { seen.add(k); E.push([p, q]); }
  }
  return { V, E };
}

export function buildPlaza(accent) {
  const group = new Group(), made = [], dummy = new Object3D();
  const keep = (x) => (made.push(x), x);
  const at = (parent, geo, m, p = [0, 0, 0], r = [0, 0, 0]) => {
    const o = new Mesh(keep(geo), m);
    o.position.set(...p);
    o.rotation.set(...r);
    parent.add(o);
    return o;
  };
  // a unit-height cylinder or strut from a to b, set on an object
  const span = (o, a, b) => {
    const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    o.quaternion.setFromUnitVectors(UP, d.normalize());
    o.scale.set(1, len, 1);
    return o;
  };
  const place = (inst, i, p, s = 1) => {
    dummy.position.set(...p);
    dummy.quaternion.identity();
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  };
  const done = (inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return inst;
  };
  const onRing = (a, r, y) => [Math.sin(a) * r, y, Math.cos(a) * r];

  const charcoal = keep(lit("#43434c")), warm = keep(lit("#f3ede4")), acc = keep(basic(accent)), lampMat = keep(basic("#ffc46b"));
  const glass = keep(basic(accent, { transparent: true, opacity: 0.55, depthWrite: false }));

  // Collapse.jsx 448 to 453: flared foundation collar, platform, platform ring
  at(group, new CylinderGeometry(2.65, 3.5, 0.5, 28), charcoal, [0, -0.25, 0]);
  at(group, new CylinderGeometry(2.5, 2.65, 0.2, 28), charcoal, [0, 0.1, 0]);
  at(group, new RingGeometry(2.2, 2.5, 40), acc, [0, 0.21, 0], [-Math.PI / 2, 0, 0]);

  // Collapse.jsx 454 to 456: three tripod legs (none on the dock side), collars, ten rim lamps
  const legGeo = keep(new CylinderGeometry(0.11, 0.17, 1, 8));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const leg = new Mesh(legGeo, charcoal);
    group.add(leg);
    span(leg, onRing(a, 1.9, 0.2), onRing(a, 1.428, 2.188));
    at(group, new CylinderGeometry(0.154, 0.154, 0.3, 8), acc, onRing(a, 1.428, 2.188));
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    at(group, new CylinderGeometry(0.11, 0.13, 0.42, 6), acc, [Math.sin(a) * 2.35, 0.41, Math.cos(a) * 2.35], [0, a, 0]);
  }

  // Collapse.jsx 460 to 464: lift tube, car at its foot, kiosk, roof cap, lit door
  at(group, new CylinderGeometry(0.34, 0.34, 1.4, 12), glass, [0, 0.9, 0]);
  at(group, new IcosahedronGeometry(0.25, 0), lampMat, [0, 0.38, 0]);
  at(group, new BoxGeometry(1.2, 1.5, 0.9), warm, [0, 0.95, 0.94]);
  at(group, new BoxGeometry(1.38, 0.12, 1.08), acc, [0, 1.76, 0.94]);
  at(group, new PlaneGeometry(0.7, 1.4), acc, [0, 0.9, 1.4]);

  // Collapse.jsx 468 to 492 and collapse-sphere.js: the hollow globe (outer shell, beads, Epsilon inside, thread, payload, ring)
  const { V, E } = icosphere();
  const globe = new Group();
  globe.position.set(0, 3.7, 0);
  group.add(globe);
  const outer = new InstancedMesh(keep(new CylinderGeometry(0.065, 0.065, 1, 6)), keep(basic("#ffffff")), E.length);
  E.forEach(([a, b], i) => {
    span(dummy, V[a].map((x) => x * 2.1), V[b].map((x) => x * 2.1));
    dummy.updateMatrix();
    outer.setMatrixAt(i, dummy.matrix);
    outer.setColorAt(i, new Color(CANDY[a % 4]));
  });
  globe.add(done(outer));
  const beads = new InstancedMesh(keep(new IcosahedronGeometry(0.115, 0)), keep(basic("#ffffff")), V.length);
  V.forEach((v, i) => { place(beads, i, v.map((x) => x * 2.1)); beads.setColorAt(i, new Color(CANDY[i % 4])); });
  globe.add(done(beads));
  at(globe, new IcosahedronGeometry(2.1 * 0.97, 2), keep(basic("#141a33", { side: BackSide, transparent: true, opacity: 0.5, depthWrite: false })));
  const inner = new InstancedMesh(keep(new CylinderGeometry(0.075, 0.075, 1, 6)), keep(basic("#8aa8ff")), E.length);
  E.forEach(([a, b], i) => { span(dummy, V[a].map((x) => x * 0.72), V[b].map((x) => x * 0.72)); dummy.updateMatrix(); inner.setMatrixAt(i, dummy.matrix); });
  globe.add(done(inner));
  at(globe, new IcosahedronGeometry(0.792, 1), keep(basic(accent, { transparent: true, opacity: 0.4, depthWrite: false })));
  at(globe, new IcosahedronGeometry(0.26, 1), lampMat);
  let far = 1, fv = Infinity;
  for (let i = 1; i < V.length; i++) { const d = V[0][0] * V[i][0] + V[0][1] * V[i][1] + V[0][2] * V[i][2]; if (d < fv) { fv = d; far = i; } }
  const s0 = V[0].map((x) => x * 2.1 * 0.985), s1 = V[far].map((x) => x * 2.1 * 0.985);
  span(at(globe, new CylinderGeometry(0.07, 0.07, 1, 6), keep(basic(accent, { transparent: true, opacity: 0.65, depthWrite: false }))), s0, s1);
  const payload = [[0, 0, 0], [0.28, 0.1, 0.06], [-0.22, 0.18, -0.12], [0.12, -0.24, 0.2], [-0.18, -0.12, -0.22]];
  const pm = keep(basic(accent));
  for (const o of payload) at(globe, new IcosahedronGeometry(0.26, 0), pm, [s0[0] + o[0], s0[1] + o[1], s0[2] + o[2]]);
  const motes = [[2.31, 0.08, 0], [2.52, -0.07, 1]].flatMap(([r, y, off]) => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return { p: [Math.cos(a) * r, y, Math.sin(a) * r], c: CANDY[(i + off) % 4] };
  }));
  const ring = new InstancedMesh(keep(new IcosahedronGeometry(0.13, 0)), keep(basic("#ffffff")), motes.length);
  motes.forEach((m, i) => { place(ring, i, m.p); ring.setColorAt(i, new Color(m.c)); });
  globe.add(done(ring));

  // contact shadow under the pavilion, a cool disc on the snow
  at(group, new CircleGeometry(3.6, 32), keep(basic("#b9c4d2", { transparent: true, opacity: 0.45, depthWrite: false })), [0, 0.004, 0], [-Math.PI / 2, 0, 0]);

  return {
    group,
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
