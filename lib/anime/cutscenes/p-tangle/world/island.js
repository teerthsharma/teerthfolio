// The island the cutscene opens and closes on, in the site's world frame with the dock point as origin: the site's height field (lib/world/terrain.js), the proof-testing gantry, chain fence and tower annex (Link.jsx, LabDecor.jsx), the quarter's pastel neighbours, the gantry's shadow, snow sparkles and green star-flakes.
import { BackSide, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, OctahedronGeometry, Quaternion, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groundAt } from "../../../../../lib/world/terrain.js";
import { PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { DOCK } from "../clock.js";
import { tone } from "../tone.js";

const HALF = 48;
const SNOW = new Color().setRGB(1.31, 1.24, 1.26), SHADE = new Color(0.64, 0.7, 0.92), SUN = new Vector3(-14, 26, 12).normalize(), ROOF_DARK = new Color("#3b1f8f");
const HOUSES = [["p-resolvent", "#f1a8e4", "cone", "#8fd0ff"], ["p-faraday", "#f6ecd8", "slab", "#fff6c8"], ["p-separatrix", "#cfc2ee", "cone", "#8fd0ff"], ["p-aether-lang", "#a8a8b4", "slab", "#8fd0ff"]];
const INK = "#1c1b19", GREEN = "#22c55e", AMBER = "#ff8a3d", LAMP = "#ffc27a", STEEL = "#b9c2d4", BLUE = "#8fd0ff", STONE = "#a8a8b4", WOOD = "#8a5a3c", CHAR = "#2a2a30";
const SHADOW = "#c9c4e6", WARM = "#fbd9d0", LO = new Color("#cfe3f3"), HI = new Color("#a4d0ee");
const VS = "attribute vec3 color; varying vec3 vC; void main() { vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FS = "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }";
const solid = (hex) => {
  const c = new Color(hex);
  return tone(new ShaderMaterial({ uniforms: { uC: { value: new Vector3(c.r, c.g, c.b) } }, vertexShader: "void main() { vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n gl_Position = projectionMatrix * modelViewMatrix * p; }", fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 0.99); }" }));
};
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const PI = Math.PI;

function terrain(h0) {
  const n = HALF * 2 + 1, H = new Float32Array(n * n), o = {};
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { groundAt(DOCK[0] + ix - HALF, DOCK[2] + iz - HALF, o); H[iz * n + ix] = o.h - h0; }
  const pos = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const V = (ix, iz) => new Vector3(ix - HALF, H[iz * n + ix], iz - HALF);
  const tri = (p, q, r) => {
    A.copy(p); B.copy(q); C.copy(r);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    c.copy(SHADE).lerp(SNOW, Math.min(1, 0.62 + 0.55 * Math.max(0, N.dot(SUN))));
    for (const v of [A, B, C]) pos.push(v.x, v.y, v.z), col.push(c.r, c.g, c.b);
  };
  for (let iz = 0; iz < n - 1; iz++) for (let ix = 0; ix < n - 1; ix++) {
    tri(V(ix, iz), V(ix, iz + 1), V(ix + 1, iz + 1));
    tri(V(ix, iz), V(ix + 1, iz + 1), V(ix + 1, iz));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function dome() {
  const g = new SphereGeometry(400, 24, 12), p = g.attributes.position, col = [], c = new Color(), warm = new Color(WARM);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) c.copy(LO);
    else c.copy(warm).lerp(HI, s01(0, 0.309, y / 400));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function bake() {
  const bins = new Map();
  const put = (hex, geo, m) => {
    geo.deleteAttribute("uv");
    geo.deleteAttribute("normal");
    if (m) geo.applyMatrix4(m);
    if (!bins.has(hex)) bins.set(hex, []);
    bins.get(hex).push(geo);
  };
  const at = (x, y, z, rx = 0, ry = 0, rz = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(1, 1, 1));
  const box = (hex, w, h, d, x, y, z, rz = 0) => put(hex, new BoxGeometry(w, h, d), at(x, y, z, 0, 0, rz));
  const flush = () => {
    const out = new Group();
    for (const [hex, gs] of bins) {
      const m = new Mesh(mergeGeometries(gs), solid(hex));
      m.frustumCulled = false;
      out.add(m);
    }
    return out;
  };
  return { put, box, at, flush };
}

const POST_X = 2.0, POST_W = 0.6, POST_D = 0.6, POST_H = 6.6, TILT = (6 * PI) / 180, SHIFT = (POST_H / 2) * Math.sin(TILT);
const BEAM_Y = POST_H + 0.16, BEAM_LEN = POST_X * 2 + POST_W + 0.16, BEAM_H = 1.0, BEAM_D = 1.1;
const CAB_X = -POST_X - 0.15;
const FENCE = [[-2.55, 2.0], [-1.25, 2.4], [0, 2.55], [1.25, 2.4], [2.55, 2.0], [2.62, 0.4], [-2.62, 0.4]];
const FENCE_H = 1.15, LINKS = 15;
const SWAGS = [];
for (let i = 0; i < 4; i++) for (const [top, sag] of [[0.98, 0.2], [0.62, 0.15]]) SWAGS.push([FENCE[i], FENCE[i + 1], top, sag]);
SWAGS.push([FENCE[5], FENCE[4], 0.98, 0.18], [FENCE[6], FENCE[0], 0.98, 0.18]);
const pt = ([a, b, top, sag], u) => [a[0] + (b[0] - a[0]) * u, FENCE_H * top - sag * Math.sin(PI * u), a[1] + (b[1] - a[1]) * u];
const LAB_Z = -6.6;
const SUN_X = -SUN.x / SUN.y, SUN_Z = -SUN.z / SUN.y;
const seg = (out, ax, az, bx, bz, h) => {
  const ox = SUN_X * h, oz = SUN_Z * h;
  out.push(ax, 0.02, az, bx, 0.02, bz, bx + ox, 0.02, bz + oz, ax, 0.02, az, bx + ox, 0.02, bz + oz, ax + ox, 0.02, az + oz);
};
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

function shadows() {
  const p = [];
  for (const s of [-1, 1]) seg(p, s * (POST_X - SHIFT) - 0.3, LAB_Z, s * (POST_X - SHIFT) + 0.3, LAB_Z, POST_H);
  seg(p, -POST_X - 0.4, LAB_Z, POST_X + 0.4, LAB_Z, BEAM_Y);
  seg(p, CAB_X - 0.5, LAB_Z, CAB_X + 0.5, LAB_Z, 1.3);
  for (const [x, z] of FENCE) seg(p, x - 0.25, z + LAB_Z, x + 0.25, z + LAB_Z, 0.7);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(p, 3));
  return new Mesh(g, solid(SHADOW));
}

function snowSparkles(h0) {
  const N = 160, geo = new OctahedronGeometry(1, 0), m = new InstancedMesh(geo, solid("#ffffff"), N), D = new Matrix4(), o = {}, base = [];
  const S = new Vector3();
  for (let i = 0; i < N; i++) {
    const a = hash(i, 1) * 2 * PI, r = 3 + 37 * Math.sqrt(hash(i, 2));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    groundAt(DOCK[0] + x, DOCK[2] + z, o);
    base.push({ x, y: o.h - h0 + 0.03, z, r: 0.02 + 0.03 * hash(i, 3), ph: hash(i, 4) * 10 });
  }
  const set = (t) => {
    for (let i = 0; i < N; i++) {
      const b = base[i], on = Math.sin(t * 3 + b.ph) > 0.9 ? 1 : 0.0001;
      S.setScalar(b.r * on);
      D.compose(new Vector3(b.x, b.y, b.z), new Quaternion(), S);
      m.setMatrixAt(i, D);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  set(0);
  return { mesh: m, update: (t) => { if (Math.floor(t * 12) % 2 === 0) set(t); } };
}

function star() {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = PI / 2 + (i * PI) / 5, r = i % 2 ? 0.42 : 1;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new ShapeGeometry(s);
}

function motes() {
  const N = 40, mat = solid(GREEN), m = new InstancedMesh(star(), mat, N), D = new Matrix4(), S = new Vector3(0.2, 0.2, 0.2), Q = new Quaternion(), UP = new Vector3(0, 1, 0), P = new Vector3();
  mat.side = DoubleSide;
  const base = [];
  for (let i = 0; i < N; i++) base.push({ a: hash(i, 5) * 2 * PI, r: 9 * Math.sqrt(hash(i, 6)), y: 1.0 + 2.0 * hash(i, 7), ph: hash(i, 8) * 2 * PI });
  const set = (t) => {
    const tw = Math.floor(t * 6) / 6;
    for (let i = 0; i < N; i++) {
      const b = base[i], a = b.a + (0.3 * t) / Math.max(b.r, 0.5);
      Q.setFromAxisAngle(UP, 0.6 * tw + b.ph);
      D.compose(P.set(Math.cos(a) * b.r, b.y, LAB_Z + Math.sin(a) * b.r), Q, S);
      m.setMatrixAt(i, D);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  set(0);
  return { mesh: m, update: set };
}

function gantry(k) {
  for (const s of [-1, 1]) {
    k.box(INK, 0.9, 0.5, 1.3, s * POST_X, 0.25, 0);
    k.put(INK, new BoxGeometry(POST_W, POST_H, POST_D), k.at(s * (POST_X - SHIFT), POST_H / 2, 0, 0, 0, s * TILT));
    k.box(GREEN, POST_W + 0.1, 0.18, POST_D + 0.1, s * POST_X, POST_H + 0.1, 0);
  }
  k.box(INK, BEAM_LEN, BEAM_H, BEAM_D, 0, BEAM_Y, 0);
  k.box(GREEN, BEAM_LEN - 0.3, BEAM_H - 0.2, 0.04, 0, BEAM_Y, BEAM_D / 2 + 0.02);
  k.box(GREEN, BEAM_LEN - 0.06, 0.14, 0.05, 0, BEAM_Y + 0.3, BEAM_D / 2 + 0.03);
  k.box(INK, 1.0, 0.9, 0.9, CAB_X, 1.3, 0);
  k.box(AMBER, 1.02, 0.12, 0.92, CAB_X, 1.82, 0);
  k.box(LAMP, 0.5, 0.4, 0.04, CAB_X, 1.3, 0.46);
  const y0 = 1.0, y1 = POST_H - 1.3, dx = POST_X * 2, dy = y1 - y0, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  for (const r of [ang, -ang]) k.put(GREEN, new BoxGeometry(len, 0.3, 0.3), k.at(0, (y0 + y1) / 2, 0, 0, 0, r));
  k.box(INK, 1.1, 0.9, 1.1, 1.2, 0.45, 2.0);
  for (const [dx2, dz2] of [[-0.49, -0.49], [0.49, -0.49], [-0.49, 0.49], [0.49, 0.49]]) k.box(GREEN, 0.12, 0.9, 0.12, 1.2 + dx2, 0.45, 2.0 + dz2);
  k.box(WOOD, 1.6, 0.12, 0.42, -1.0, 0.45, 2.6);
  k.box(WOOD, 1.6, 0.12, 0.42, 1.8, 0.45, 2.8);
  k.box(STONE, 0.9, 0.6, 0.9, -3.4, 0.3, 1.4);
  k.box(STONE, 0.8, 0.5, 0.8, 3.4, 0.25, 1.0);
  for (const [x, z] of FENCE) k.put(INK, new CylinderGeometry(0.045, 0.06, FENCE_H, 6), k.at(x, FENCE_H / 2, z));
  const up = new Vector3(0, 1, 0), tg = new Vector3(), q = new Quaternion(), roll = new Quaternion();
  const LINK = new TorusGeometry(0.06, 0.016, 5, 10).scale(1, 1.55, 1);
  SWAGS.forEach((sw, si) => {
    for (let i = 0; i < LINKS; i++) {
      const u = (i + 0.5) / LINKS, a = pt(sw, u), b = pt(sw, Math.min(1, u + 0.02));
      tg.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      q.setFromUnitVectors(up, tg);
      roll.setFromAxisAngle(tg, ((i % 2) * PI) / 2);
      k.put((i + si) % 9 === 4 ? BLUE : STEEL, LINK.clone(), new Matrix4().compose(new Vector3(a[0], a[1], a[2]), roll.clone().multiply(q), new Vector3(1, 1, 1)));
    }
  });
  const R = 5, tx = -(R - 1.2), tz = -R + 0.9, tall = 8;
  const body = `#${new Color("#f4ead8").lerp(new Color(GREEN), 0.35).getHexString()}`;
  const capCol = `#${new Color(GREEN).multiplyScalar(0.6).getHexString()}`;
  k.box(CHAR, 2.6, 0.5, 2.6, tx, 0.25, tz);
  k.box(body, 2.2, tall, 2.2, tx, 0.5 + tall / 2, tz);
  k.box(GREEN, 2.4, 0.3, 2.4, tx, 0.5 + tall / 2, tz);
  k.box(GREEN, 2.5, 0.35, 2.5, tx, 0.5 + tall, tz);
  k.put(capCol, new ConeGeometry(1.9, 1.8, 4).rotateY(PI / 4), k.at(tx, 0.85 + tall + 0.9, tz));
}

export function buildIsland() {
  const group = new Group(), made = [], o = {};
  groundAt(DOCK[0], DOCK[2], o);
  const h0 = o.h;
  const ground = new Mesh(terrain(h0), tone(new ShaderMaterial({ vertexShader: VS, fragmentShader: FS })));
  ground.frustumCulled = false;
  const sky = new Mesh(dome(), tone(new ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: BackSide, depthWrite: false })));
  sky.frustumCulled = false;
  sky.renderOrder = -9;
  const gk = bake();
  gantry(gk);
  const gantryMesh = gk.flush();
  gantryMesh.position.set(0, 0, LAB_Z);
  const cast = shadows();
  const sparkle = snowSparkles(h0);
  const flakes = motes();
  const nk = bake();
  for (const [id, hex, roof, lit] of HOUSES) {
    const p = PLACE_BY_ID[id];
    if (!p) continue;
    groundAt(p.x, p.z, o);
    const r = p.radius ?? 5, g = o.h - h0, bx = p.x - DOCK[0], bz = p.z - DOCK[2];
    nk.box(STONE, 2 * r + 0.6, 0.6, 2 * r + 0.6, bx, g + 0.3, bz);
    nk.box(hex, 2 * r, 5.2, 2 * r, bx, g + 3.2, bz);
    const rc = `#${new Color(hex).lerp(ROOF_DARK, 0.25).getHexString()}`;
    if (roof === "cone") nk.put(rc, new ConeGeometry(r * 1.25, 2.0, 4).rotateY(PI / 4), nk.at(bx, g + 6.8, bz));
    else nk.box(rc, 2 * r + 0.3, 0.4, 2 * r + 0.3, bx, g + 6.0, bz);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (dx * -bx + dz * -bz <= 0) continue;
      for (const k of [-0.6, 0, 0.6]) for (const y of [1.6, 2.9, 4.2]) {
        if (dx) nk.box(lit, 0.04, 0.7, 0.5, bx + dx * (r + 0.02), g + y, bz + k * r);
        else nk.box(lit, 0.5, 0.7, 0.04, bx + k * r, g + y, bz + dz * (r + 0.02));
      }
    }
    if (id === "p-faraday") {
      const M = nk.at(bx, g + 8.8, bz, 0, Math.atan2(-bx, -bz), 0);
      nk.put(INK, new TorusGeometry(2.4, 0.06, 6, 24), M);
      for (let k = 0; k < 12; k++) nk.put(INK, new BoxGeometry(0.05, 4.8, 0.05).rotateZ((k * PI) / 12), M);
    }
  }
  const neighbours = nk.flush();
  group.add(ground, sky, gantryMesh, neighbours, cast, sparkle.mesh, flakes.mesh);
  for (const m of [ground, sky, gantryMesh, neighbours, cast, sparkle.mesh, flakes.mesh]) m.traverse((x) => { if (x.geometry) made.push(x.geometry); if (x.material) made.push(x.material); });
  return {
    group,
    show(visible) { group.visible = visible; },
    update(t) { sparkle.update(t); flakes.update(t); },
    dispose() { for (const x of made) x.dispose(); },
  };
}
