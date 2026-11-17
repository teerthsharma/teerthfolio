// The Throne Room of Nazarick in cel ink: the live hall.js geometry and hexes, one fused toon mesh, the two circles, the flare and the cracks.
// The pup stands at the origin, the hall runs toward -z. Nine banners and four pillar capitals are their own meshes so they can tear.
import { BackSide, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { fuse, paint, toon } from "../live/comic.js";
import { circleTexture } from "../live/circle.js";
import { registerPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import * as GOLD_PACK from "../../../tools/gold/index.js";
import { floorY, HIT, smooth } from "../clock.js";
import { BLACK, GOLD, tone } from "../tone.js";

export const STEPS = 7;
export const TOP_Y = 0.4 * STEPS;
export const THRONE_Z = -11.4;

const BANNERS = ["#b3122b", "#f0b429", "#5a2aa8", "#1f7a6e", "#c8561a", "#2a4fa8", "#8f1d7a", "#e8e0c8"];
const M = new Matrix4();
const P = (geo, hex, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => paint(geo.clone().applyMatrix4(M.compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...r)), new Vector3(...s))), hex);
const box = (w, h, d, hex, p, r) => P(new BoxGeometry(w, h, d), hex, p, r);
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;

// the gold pack's wedge ring (goldRequiemShard), recoloured: wedges #ffd35a, lips #a23cff
registerPack(GOLD_PACK, "gold");
const REQUIEM = glslFor(["goldRequiemShard"])
  .replace(/const vec3 G_MAG\s*=\s*vec3\([^)]*\);/g, "const vec3 G_MAG = vec3(0.635, 0.235, 1.0);")
  .replace(/vec3 gGoldBase\(\) \{[^}]*\}/g, "vec3 gGoldBase() { return vec3(1.0, 0.827, 0.353); }");

const CIRCLE_VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const CIRCLE_FRAG = /* glsl */ `
  uniform sampler2D map; uniform float uOpacity, uK; varying vec2 vUv;
  void main() {
    vec4 t = texture2D(map, vUv);
    float r = length(vUv - 0.5) * 1024.0;
    float need = r > 468.0 ? 0.2 : r > 452.0 ? 0.4 : r > 350.0 ? 0.6 : r > 158.0 ? 0.8 : 1.0;
    float a = t.a * uOpacity * step(need, uK + 1e-4);
    gl_FragColor = vec4(t.rgb * a, a);
  }`;
const overlay = (uniforms, fragmentShader, vertexShader = CIRCLE_VERT) => tone(new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, premultipliedAlpha: true, side: DoubleSide }));

const FLARE_FRAG = `
  uniform float uOn; varying vec2 vUv;
  ${REQUIEM}
  void main() {
    vec3 c = goldRequiemShard(vUv - vec2(0.5) + vec2(0.72, 0.5), 0.0);
    float a = smoothstep(0.02, 0.06, distance(c, G_INK)) * uOn * (1.0 - smoothstep(0.42, 0.5, length(vUv - 0.5)));
    gl_FragColor = vec4(pow(c, vec3(2.2)) * a, a);
  }`;

const CRACK_VERT = "attribute float aU; varying float vU; void main() { vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const crackMat = (hex, run, offset) => tone(new ShaderMaterial({
  uniforms: { uRun: run, uC: { value: new Color(hex) } }, vertexShader: CRACK_VERT,
  fragmentShader: "uniform float uRun; uniform vec3 uC; varying float vU; void main() { if (uRun <= 0.0 || vU > uRun) discard; gl_FragColor = vec4(pow(uC, vec3(2.2)), 0.99); }",
  side: DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset,
}));

// a tower of boxes and cones in pillar-local space: pivot-relative geometry, so the mesh can swing about its own pivot
function banner(x, y, z, ry, k, h) {
  const c = BANNERS[k % BANNERS.length], R = [0, ry, 0];
  const at = (dx, dy, dz) => { const c0 = Math.cos(ry), s0 = Math.sin(ry); return [x + dx * c0 + dz * s0, y + dy, z - dx * s0 + dz * c0]; };
  return [
    box(0.95, 0.12, 0.14, GOLD, at(0, 0, 0), R),
    box(0.8, h, 0.05, c, at(0, -h / 2, 0), R),
    P(new ConeGeometry(0.4, 0.8, 3), c, at(0, -h - 0.35, 0), [Math.PI, ry, Math.PI / 2], [1, 1, 0.1]),
    box(0.18, h * 0.5, 0.06, k % 3 ? BLACK : GOLD, at(0, -h * 0.5, 0.03), R),
  ];
}
const capital = (x, z) => [box(1.6, 0.4, 1.6, GOLD, [x, 15.2, z]), P(new ConeGeometry(0.9, 2.0, 4), "#241044", [x, 16.4, z], [0, Math.PI / 4, 0])];

const lowest = (pos, axis, a) => {
  const s = Math.sin(a), c = Math.cos(a);
  let m = Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const v = axis === "z" ? pos[i] * s + pos[i + 1] * c : pos[i + 1] * c - pos[i + 2] * s;
    if (v < m) m = v;
  }
  return m;
};

function ribbons(lines, w) {
  const pos = [], au = [], idx = [];
  for (const pts of lines) {
    const base = pos.length / 3, n = pts.length, len = [0];
    for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, ox = (-dz / l) * w / 2, oz = (dx / l) * w / 2, u = len[i] / len[n - 1];
      pos.push(p[0] + ox, p[1], p[2] + oz, p[0] - ox, p[1], p[2] - oz);
      au.push(u, u);
    }
    for (let i = 0; i < n - 1; i++) { const k = base + 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aU", new Float32BufferAttribute(au, 1));
  g.setIndex(idx);
  return g;
}

// zigzag lines from a root over the stone; each point sits 0.03 m above the walkable height
function web(rx, rz, angles, step, rnd) {
  return angles.map((a0) => {
    let x = rx, z = rz, a = a0;
    const pts = [[x, floorY(x, z) + 0.03, z]];
    for (let i = 1; i < 7; i++) {
      a += (rnd() - 0.5) * 1.1;
      const L = step[0] + (step[1] - step[0]) * rnd();
      x += Math.cos(a) * L + (rnd() - 0.5) * 0.7;
      z += Math.sin(a) * L + (rnd() - 0.5) * 0.7;
      pts.push([x, floorY(x, z) + 0.03, z]);
    }
    return pts;
  });
}

export function buildHall() {
  const room = [], tears = [], tex = circleTexture(true);
  room.push(box(60, 0.4, 60, "#4a2f7e", [0, -0.2, -10]));
  for (let i = 0; i < STEPS; i++) {
    room.push(box(7, 0.4 * (i + 1), 0.7, i % 2 ? "#6b45b5" : "#7d52cc", [0, 0.2 * (i + 1), -3 - 0.7 * i]));
    room.push(box(2.6, 0.06, 0.7, "#a3112a", [0, 0.4 * (i + 1) + 0.03, -3 - 0.7 * i]));
    room.push(box(7.1, 0.05, 0.1, GOLD, [0, 0.4 * (i + 1), -2.68 - 0.7 * i]));
  }
  room.push(box(12, TOP_Y, 6.4, "#6b45b5", [0, TOP_Y / 2, -10.4]), box(2.6, 0.06, 6.4, "#a3112a", [0, TOP_Y + 0.03, -10.4]));
  const tz = THRONE_Z - 0.6;
  room.push(box(3.6, 0.9, 2.2, "#3a2166", [0, TOP_Y + 0.45, THRONE_Z]), box(3.7, 0.12, 2.3, GOLD, [0, TOP_Y + 0.92, THRONE_Z]));
  room.push(box(3.0, 6.4, 0.6, "#241044", [0, TOP_Y + 4.0, tz - 0.4]), box(3.2, 0.1, 0.7, GOLD, [0, TOP_Y + 1.2, tz - 0.4]));
  room.push(P(new ConeGeometry(1.7, 3.2, 4), "#241044", [0, TOP_Y + 8.9, tz - 0.4], [0, Math.PI / 4, 0], [1, 1, 0.35]));
  for (const s of [-1, 1]) {
    room.push(box(0.5, 1.2, 1.9, "#3a2166", [s * 1.75, TOP_Y + 1.5, THRONE_Z - 0.1]), box(0.55, 0.1, 2.0, GOLD, [s * 1.75, TOP_Y + 2.15, THRONE_Z - 0.1]));
    for (let k = 0; k < 4; k++) room.push(P(new ConeGeometry(0.28, 3.4 + k * 0.6, 4), k % 2 ? "#241044" : GOLD, [s * (2.2 + k * 0.55), TOP_Y + 4.5 + k * 0.45, tz - 0.5], [0, 0, -s * (0.1 + k * 0.1)], [1, 1, 0.3]));
  }
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const x = s * 8, z = 5 - 4.5 * k;
    room.push(box(1.7, 0.5, 1.7, GOLD, [x, 0.25, z]), box(1.2, 15, 1.2, "#5b389c", [x, 7.9, z]), box(0.2, 15, 0.2, "#9a62e8", [x - s * 0.62, 7.9, z + 0.62]));
    if (k === 1 || k === 2) tears.push({ parts: capital(x, z), pivot: [x, 15.2, z], axis: "x", sgn: 1, turn: 3, idx: 100 + tears.length });
    else room.push(...capital(x, z));
  }
  room.push(box(40, 40, 0.6, "#34205f", [0, 17, -17.6]), box(0.6, 40, 60, "#34205f", [-12.6, 17, -8]), box(0.6, 40, 60, "#34205f", [12.6, 17, -8]), box(60, 0.6, 60, "#22123f", [0, 21, -8]));
  let n = 0;
  const flag = (x, y, z, ry, h, tear) => {
    const k = n++, parts = banner(x, y, z, ry, k, h);
    if (tear) tears.push({ parts, pivot: [x, y, z], axis: "z", sgn: k % 2 ? 1 : -1, turn: 2.4, idx: k });
    else room.push(...parts);
  };
  for (let i = 0; i < 13; i++) flag(-12.6 + i * 2.1, 16, -17.2, 0, 6, i === 6);
  for (let i = 0; i < 14; i++) {
    const torn = i >= 2 && i <= 5;
    flag(-12.2, 14.5, 4 - i * 1.5, Math.PI / 2, 5.5, torn);
    flag(12.2, 14.5, 4 - i * 1.5, -Math.PI / 2, 5.5, torn);
  }

  const group = new Group();
  const roomMesh = new Mesh(fuse(room), tone(toon()));
  roomMesh.frustumCulled = false;
  const dome = new Mesh(new CylinderGeometry(90, 90, 120, 8, 1, true), tone(new ShaderMaterial({
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "void main() { gl_FragColor = vec4(pow(vec3(0.133, 0.071, 0.247), vec3(2.2)), 0.99); }",
    side: BackSide,
  })));
  dome.frustumCulled = false;
  group.add(roomMesh, dome);

  const pieces = tears.map((t) => {
    for (const g of t.parts) g.translate(-t.pivot[0], -t.pivot[1], -t.pivot[2]);
    const geo = fuse(t.parts);
    const mesh = new Mesh(geo, tone(toon()));
    mesh.frustumCulled = false;
    mesh.position.set(...t.pivot);
    group.add(mesh);
    return { mesh, geo, pivot: t.pivot, axis: t.axis, sgn: t.sgn, turn: t.turn, idx: t.idx };
  });

  const wall = new Mesh(new PlaneGeometry(13, 13), overlay({ map: { value: tex }, uOpacity: { value: 0.55 }, uK: { value: 1 } }, CIRCLE_FRAG));
  wall.position.set(0, 10.4, -16.9);
  const spin = new Group();
  spin.position.set(0, 0.05, 0);
  const small = new Mesh(new PlaneGeometry(3.4, 3.4), overlay({ map: { value: tex }, uOpacity: { value: 0.9 }, uK: { value: 1 } }, CIRCLE_FRAG));
  small.rotation.x = -Math.PI / 2;
  spin.add(small);
  const big = new Mesh(new PlaneGeometry(11, 11), overlay({ map: { value: tex }, uOpacity: { value: 0.9 }, uK: { value: 0 } }, CIRCLE_FRAG));
  big.rotation.x = -Math.PI / 2;
  big.position.set(0, 0.06, 0);
  const flare = new Mesh(new PlaneGeometry(11, 11), overlay({ uOn: { value: 0 } }, FLARE_FRAG));
  flare.rotation.x = -Math.PI / 2;
  flare.position.set(0, 0.07, 0);
  flare.visible = false;
  for (const o of [wall, small, big, flare]) { o.frustumCulled = false; o.userData.layer = 1; }
  group.add(wall, spin, big, flare);

  const runA = { value: 0 }, runB = { value: 0 };
  const cracks = (lines, run) => [new Mesh(ribbons(lines, 0.13), crackMat(GOLD, run, -2)), new Mesh(ribbons(lines, 0.07), crackMat(BLACK, run, -4))];
  const rnd = rng(432);
  const setA = web(0, -9.4, [0.25, 1.05, 1.57, 2.2, 2.95], [1.0, 1.5], rnd);
  const setB = web(0, 0, [0.6, 1.5, 2.3, 3.2, 4.3], [0.7, 1.3], rnd);
  const crackMeshes = { A: cracks(setA, runA), B: cracks(setB, runB) };
  for (const m of [...crackMeshes.A, ...crackMeshes.B]) { m.frustumCulled = false; group.add(m); }

  const lowerTo = (p, k, a) => { const y0 = p.pivot[1], target = floorY(p.pivot[0], p.pivot[2]) - lowest(p.geo.attributes.position.array, p.axis, a); return y0 + k * k * (target - y0); };
  const tear = (u, seed = 432) => {
    const k = Math.min(1, Math.max(0, u));
    for (const p of pieces) {
      const a = p.sgn * k * p.turn * (0.92 + 0.16 * hash(seed, p.idx));
      p.mesh.position.y = lowerTo(p, k, a);
      if (p.axis === "z") p.mesh.rotation.set(0, 0, a); else p.mesh.rotation.set(a, 0, 0);
    }
  };
  const setCircles = ({ t, bigK }) => {
    wall.material.uniforms.uOpacity.value = 0.55 + 0.4 * smooth(7.4, 10, t);
    wall.rotation.z = Math.floor(t * 6) * 0.04;
    spin.rotation.y = -Math.floor(t * 6) * 0.06;
    big.material.uniforms.uK.value = bigK;
    flare.material.uniforms.uOn.value = bigK >= 1 && t < HIT.reveal + 0.9 + 0.3 ? 1 : 0;
    flare.visible = flare.material.uniforms.uOn.value > 0;
  };
  const crack = (set, run) => { (set === "A" ? runA : runB).value = Math.min(1, Math.max(0, run)); };

  const all = [roomMesh, dome, wall, small, big, flare, ...crackMeshes.A, ...crackMeshes.B, ...pieces.map((p) => p.mesh)];
  return { group, setCircles, tear, crack, dispose() {
    for (const m of all) { m.geometry.dispose(); m.material.dispose(); }
    for (const p of pieces) p.geo.dispose();
    tex.dispose();
  } };
}
