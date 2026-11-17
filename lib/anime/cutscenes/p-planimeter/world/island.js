// The island the cutscene opens on and returns to: the site's snow plain round the planimeter booth in the site's light, with the booth,
// its plaque, gate and stamp, its sign, lamps, bench and crates, the amber fish and star flakes, the radiation rings, cast shadows, the
// pup's own shadow, the site's glacier and far range. Built in site coordinates inside `land`, which stands the dock at the rig origin.
import { BackSide, BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { buildCalver, buildTriton, CALVERS } from "../../../../../components/world/land/parts/triton-glacier.js";
import { buildSkin } from "../../../../../components/world/land/parts/google-range.js";
import { PLANIMETER_REF, PLATE_H, PLATE_W } from "../../../../../components/world/monuments/parts/refuse-layout.js";
import { fbm, groundAt } from "../../../../../lib/world/terrain.js";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { groundShadow } from "../../../pup.js";

await loadPack("bg");

const PLACE = PLACE_BY_ID["p-planimeter"];
const DOCK = dockPoint(PLACE);
const C0 = { x: PLACE.x, z: PLACE.z };
const R = 5;
const CHAR = "#43434c", WOOD = "#c08a5e", WOOD_D = "#8a5a3c", AMBER = "#f59e0b", BRASS = "#c9a227", LAMP = "#ffc46b", WALL = "#fbd89d", CREAM = "#fbf6ea";
const SNOW = "#fcf0e9", SNOW_COOL = "#f6ebe8", SHADOW = "#c3bde6", SPARK = "#fffdf8", ROOM = "#f6e7cf";
const SUN = new Vector3(-14, 26, 12).normalize();
const FISH = 6, FLAKES = 24, SPARKS = 120;
const RISE = 0.7, HOLD = 1.6, SINK = 0.5, CYCLE = RISE + HOLD + SINK;
const SH = [14 / 26, -12 / 26];
const CAST = [[-1.8, 1.8, -1.2, 1.2, 4.85], [-4.7, -2.5, 5.85, 5.95, 2.4], [3.1, 4.7, 4.45, 4.95, 1.1], [-4.55, -3.2, 3.35, 4.25, 1.65], [-2.27, -2.13, 5.33, 5.47, 2.4], [2.13, 2.27, 5.33, 5.47, 2.4]];
const TILT = -0.35, HINGE = { y: 2.55, z: 0.55 }, PEG_OUT = 0.27, PEG_HALF = 0.085;
const GATE = { x: 2.2, z: 1.4 }, STAMP = { x: 0.85, z: 1.2 };
const FAR = /* glsl */ `vec4 paint(vec2 p) { vec4 c = bgCardMountains(p); c.rgb = mix(c.rgb, mix(vec3(0.62, 0.81, 0.92), vec3(0.38, 0.67, 0.85), p.y), 0.8); return c; }`;
const FAR_ICE = /* glsl */ `vec4 paint(vec2 p) { vec4 c = bgCardMountains(p); c.rgb = mix(c.rgb, vec3(0.66, 0.78, 0.92), 0.6); return c; }`;

const lin = (hex) => new Color(hex);
const WALLC = lin("#ffffff").lerp(lin(AMBER), 0.8);
const K = { snow: lin(SNOW), snowCool: lin(SNOW_COOL), rock: lin("#474853"), rockLit: lin("#62636f"), iceFace: lin("#9fcfeb"), iceDeep: lin("#62abd9"), glacier: lin("#d3e9f6"), wet: lin("#bccad8"), bed: lin("#7aa0b3"), bedDeep: lin("#2b5a72") };
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const groundY = (x, z) => { const o = {}; groundAt(x, z, o); return o.h; };

const FRAG = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform float uGloss, uUnlit; uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 c = vC;
    if (uUnlit < 0.5) {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      c *= uShade + uSunC * max(dot(n, uSun), 0.0);
      c = mix(c, uSky, uGloss * (0.06 + 0.5 * pow(1.0 - max(dot(n, v), 0.0), 3.0)));
    }
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(c, 0.99);
  }`;
const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
    mat4 M = modelMatrix;
#ifdef USE_INSTANCING
    M = modelMatrix * instanceMatrix;
#endif
    vec4 w = M * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(M) * normal); vC = color;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const SKY_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;

const paint = (g, col) => {
  const c = col instanceof Color ? col : lin(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(a, 3));
  return g;
};
const cb = (w, h, d, dx, y, dz, col, ry = 0) => paint(new BoxGeometry(w, h, d).rotateY(ry).translate(C0.x + dx, y, C0.z + dz), col);
const cy = (r, h, dx, y0, dz, col, seg = 8) => paint(new CylinderGeometry(r, r, h, seg).translate(C0.x + dx, y0 + h / 2, C0.z + dz), col);
const hs = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const onPlaque = (g) => g.rotateX(TILT).translate(C0.x, HINGE.y, C0.z + HINGE.z);

// the height field on a `st` m grid: smooth snow on the plain, one flat colour a facet on the relief (the site's own rule)
function terrain(x0, x1, z0, z1, st = 1) {
  const nx = Math.round((x1 - x0) / st) + 1, nz = Math.round((z1 - z0) / st) + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix * st, z = z0 + iz * st;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount, stuff: o.stuff, glacier: o.glacier };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const g = G[i0], h = (A.y + B.y + C.y) / 3, x = (A.x + B.x + C.x) / 3, z = (A.z + B.z + C.z) / 3, relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (g.gap < 0 && h < -0.25) c.copy(K.bed).lerp(K.bedDeep, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, N.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? K.iceFace : K.snow).lerp(K.iceDeep, steep > 0.45 ? s01(0.55, 0.2, N.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? K.iceFace : K.glacier); }
      else c.copy(N.y < 0.52 ? K.rockLit : K.snow).lerp(K.rock, N.y < 0.52 ? 0.4 + 0.6 * rnd(i0, 1.7) : 0);
    } else {
      c.copy(K.snow).lerp(K.snowCool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      if (g.gap < 1.8) c.lerp(K.wet, s01(1.8, 0, g.gap) * 0.85);
    }
    for (const v of [A, B, C]) { pos.push(v.x, v.y, v.z); nor.push(...(relief ? [N.x, N.y, N.z] : [0, 1, 0])); col.push(c.r, c.g, c.b); }
  };
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    const a = iz * nx + ix, b = a + 1, cc = a + nx, d = cc + 1, y = (i) => P[i * 3 + 1];
    if (Math.abs(y(a) - y(d)) < Math.abs(y(b) - y(cc))) { tri(a, cc, d); tri(a, d, b); } else { tri(a, cc, b); tri(b, cc, d); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

// several painted geometries as one draw, keeping position, normal and colour
function join(geos) {
  const names = ["position", "normal", "color"], out = [[], [], []];
  for (const g of geos) {
    const x = g.index ? g.toNonIndexed() : g;
    names.forEach((k, j) => { const a = x.attributes[k].array; for (let i = 0; i < a.length; i++) out[j].push(a[i]); });
    if (x !== g) x.dispose();
    g.dispose();
  }
  const m = new BufferGeometry();
  names.forEach((k, j) => m.setAttribute(k, new Float32BufferAttribute(out[j], 3)));
  return m;
}

// the site's geometries with their matrices as one draw; a part with no colour is white, with no normal it faces up
function merged(parts) {
  const out = { position: [], normal: [], color: [] };
  for (const [geo, m] of parts) {
    const x = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) x.applyMatrix4(m);
    const n = x.attributes.position.count;
    for (const k of Object.keys(out)) {
      const a = x.attributes[k];
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) out[k].push(a ? a.array[i * 3 + j] : k === "normal" ? +(j === 1) : 1);
    }
    x.dispose();
    geo.dispose();
  }
  const g = new BufferGeometry();
  for (const k of Object.keys(out)) g.setAttribute(k, new Float32BufferAttribute(out[k], 3));
  return g;
}

// monotone chain: the convex hull of the points, counter-clockwise
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const castOf = ([x0, x1, z0, z1], h) => {
  const base = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  return hull(base.concat(base.map(([x, z]) => [x + SH[0] * h, z + SH[1] * h])));
};
// flat shadow fans on the snow, wound so their normal faces up (the front side is the one the camera sees)
function soup(polys, col) {
  const pos = [], nor = [];
  for (const poly of polys) for (let i = 1; i < poly.length - 1; i++) for (const [x, z] of [poly[0], poly[i + 1], poly[i]]) {
    pos.push(x, groundY(x, z) + 0.03, z);
    nor.push(0, 1, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  return paint(g, col);
}

// the live fish: it rises, freezes at the top of its arc, and sinks back without landing
function pose(u) {
  if (u < RISE) { const k = s01(0, RISE, u); return { y: 0.15 + k * 1.3, x: k * 0.3, tilt: 0.5 * (1 - k) }; }
  if (u < RISE + HOLD) return { y: 1.45 + Math.sin((u - RISE) * 3) * 0.03, x: 0.3, tilt: 0 };
  const k = (u - RISE - HOLD) / SINK;
  return { y: 1.45 - k * 1.3, x: 0.3, tilt: -0.6 * k };
}

export function buildIsland(ctx) {
  const group = new Group(), land = new Group(), far = new Group(), made = [];
  land.position.set(-DOCK.x, 0, -DOCK.z);
  group.add(land, far);
  const base = { uSun: { value: SUN }, uSky: { value: lin("#c4def2") } };
  const mat = (unlit = 0, shade = [0.64, 0.7, 0.92], sun = [0.62, 0.56, 0.44], gloss = 0) => {
    const m = new ShaderMaterial({ uniforms: { ...base, uShade: { value: new Vector3(...shade) }, uSunC: { value: new Vector3(...sun) }, uGloss: { value: gloss }, uUnlit: { value: unlit } }, vertexShader: VERT, fragmentShader: FRAG });
    made.push(m);
    return m;
  };
  const lit = mat(0), flat = mat(1), booth = mat(0, [0.39, 0.33, 0.31], [0.5, 0.42, 0.34]), ice = mat(0, [0.58, 0.66, 0.9], [0.6, 0.55, 0.44], 1);
  const add = (g, m, parent = land) => { const x = new Mesh(g, m); x.frustumCulled = false; parent.add(x); made.push(g); return x; };

  add(terrain(30, 126, -20, 75), lit);
  add(terrain(-46, 126, -128, -20, 2), lit);

  const tri = buildTriton();
  add(merged([[tri.ice], ...CALVERS.map((c) => [buildCalver(), new Matrix4().makeRotationY(c.yaw).setPosition(c.x, c.base, c.z)])]), ice);
  add(buildSkin(), lit);

  const pegHalves = PLANIMETER_REF.flatMap((p) => [
    paint(onPlaque(new BoxGeometry(0.24, 0.11, 0.12).translate(p.x, p.y + PEG_HALF, PEG_OUT)), AMBER),
    paint(onPlaque(new BoxGeometry(0.24, 0.11, 0.12).translate(p.x, p.y - PEG_HALF, PEG_OUT)), AMBER),
  ]);
  const pegHalos = PLANIMETER_REF.flatMap((p) => [
    paint(onPlaque(new CircleGeometry(0.5, 20).scale(1.8, 1.8, 1).translate(p.x, p.y, 0.08)), lin(WALL).lerp(lin(AMBER), 0.35)),
    paint(onPlaque(new CircleGeometry(0.5, 20).scale(1.1, 1.1, 1).translate(p.x, p.y, 0.09)), lin(WALL).lerp(lin(AMBER), 0.55)),
  ]);
  const gateArm = [0, 1, 2, 3].map((i) => paint(new BoxGeometry(0.6, 0.18, 0.18).translate((i + 0.5) * 0.6, 0, 0).rotateZ(1.35).translate(C0.x + GATE.x, 1.1, C0.z + GATE.z), i % 2 ? CREAM : AMBER));

  const boothLit = join([
    cb(3.6, 0.3, 2.4, 0, 0.15, 0, CHAR),
    cb(0.18, 4.1, 2.4, -1.71, 2.35, 0, WALLC),
    cb(0.18, 4.1, 2.4, 1.71, 2.35, 0, WALLC),
    cb(3.24, 4.1, 0.15, 0, 2.35, -1.1, WALLC),
    paint(new ConeGeometry(2.1, 0.9, 4).rotateY(Math.PI / 4).translate(C0.x, 4.85, C0.z - 0.35), CHAR),
    cb(0.14, 4.1, 0.14, -1.71, 2.35, 1.13, AMBER),
    cb(0.14, 4.1, 0.14, 1.71, 2.35, 1.13, AMBER),
    cb(2.448, 0.22, 0.6, 0, 0.95, 1.25, WALLC),
    cb(2.488, 0.05, 0.64, 0, 1.09, 1.25, AMBER),
    paint(onPlaque(new BoxGeometry(PLATE_W, PLATE_H, 0.1)), CHAR),
    cb(0.1, 0.3, 0.1, 0, 5.6, 0, CHAR),
    cb(0.3, 1.1, 0.3, GATE.x, 0.55, GATE.z, CHAR),
    cb(0.12, 0.55, 0.12, STAMP.x, 1.335, STAMP.z - 0.15, CHAR),
    cb(0.13, 0.34, 0.13, STAMP.x, 1.73, STAMP.z, CHAR),
  ]);
  add(boothLit, booth);
  const boothFlat = join([
    cb(0.5, 0.9, 0.14, -1.61, 2.35, 0.24, AMBER),
    cb(0.5, 0.9, 0.14, 1.61, 2.35, 0.24, AMBER),
    paint(new PlaneGeometry(1.5, 0.95).rotateX(TILT).translate(C0.x, HINGE.y, C0.z + 0.61), AMBER),
    paint(new IcosahedronGeometry(0.3, 0).translate(C0.x, 5.91, C0.z), AMBER),
    ...pegHalves,
    ...pegHalos,
    ...gateArm,
    paint(new SphereGeometry(0.12, 8, 6).translate(C0.x + GATE.x, 1.3, C0.z + GATE.z), AMBER),
    cb(0.3, 0.16, 0.3, STAMP.x, 1.48, STAMP.z, AMBER),
  ]);
  add(boothFlat, flat);

  const brassArm = new Matrix4().makeTranslation(1.5, 0, 0).multiply(new Matrix4().makeRotationY(-0.9));
  const arm = new Group();
  arm.position.set(C0.x, 5.02, C0.z - 0.35);
  land.add(arm);
  add(join([
    new CylinderGeometry(0.18, 0.18, 0.3, 10),
    new BoxGeometry(1.5, 0.15, 0.15).translate(0.75, 0, 0),
    new CylinderGeometry(0.108, 0.108, 0.18, 10).applyMatrix4(brassArm),
    new BoxGeometry(1.425, 0.15, 0.15).translate(0.7125, 0, 0).applyMatrix4(brassArm),
    new ConeGeometry(0.08, 0.3, 6).rotateX(Math.PI).translate(1.43, -0.2, 0).applyMatrix4(brassArm),
  ].map((g) => paint(g, BRASS))), lit, arm);

  add(join([
    cb(2.8, 0.22, 1.1, 0, 0.11, R - 0.1, CHAR),
    cb(2.2, 0.14, 0.8, 0, 0.29, R - 0.2, AMBER),
    cy(0.08, 2.4, -4.5, 0, R + 0.9, WOOD_D),
    cy(0.08, 2.4, -2.7, 0, R + 0.9, WOOD_D),
    cb(2.2, 0.9, 0.1, -3.6, 1.95, R + 0.9, AMBER),
    cy(0.07, 2.4, -2.2, 0, R + 0.4, CHAR, 6),
    cy(0.07, 2.4, 2.2, 0, R + 0.4, CHAR, 6),
    cb(1.6, 0.12, 0.5, 3.9, 0.51, R - 0.3, WOOD),
    cb(0.12, 0.45, 0.5, 3.25, 0.225, R - 0.3, WOOD_D),
    cb(0.12, 0.45, 0.5, 4.55, 0.225, R - 0.3, WOOD_D),
    cb(1.6, 0.5, 0.1, 3.9, 0.85, R - 0.52, WOOD),
    cb(0.9, 0.9, 0.9, -4.1, 0.45, R - 1.2, WOOD),
    cb(0.9, 0.9, 0.9, -3.15, 0.45, R - 1.1, WOOD_D),
    cb(0.75, 0.75, 0.75, -3.7, 1.275, R - 1.2, WOOD),
  ]), lit);
  add(join([
    cb(1.7, 0.12, 0.12, -3.6, 1.68, R + 0.97, LAMP),
    paint(new SphereGeometry(0.22, 8, 6).translate(C0.x - 2.2, 2.55, C0.z + R + 0.4), LAMP),
    paint(new SphereGeometry(0.22, 8, 6).translate(C0.x + 2.2, 2.55, C0.z + R + 0.4), LAMP),
  ]), flat);

  const rings = [[5.4, 0.5, 0.16], [6.4, 0.4, 0.09], [7.2, 0.3, 0.05]].map(([r0, w, k]) =>
    paint(new RingGeometry(r0, r0 + w, 48).rotateX(-Math.PI / 2).translate(C0.x, 0.03, C0.z), lin(SNOW).lerp(lin(AMBER), k)));
  add(join(rings), flat);
  add(soup(CAST.map(([x0, x1, z0, z1, h]) => castOf([C0.x + x0, C0.x + x1, C0.z + z0, C0.z + z1], h)), SHADOW), flat);
  const pupCast = add(soup([castOf([DOCK.x - 0.45, DOCK.x + 0.45, DOCK.z - 0.35, DOCK.z + 0.35], 0.8)], SHADOW), flat);

  const sparkGeo = paint(new CircleGeometry(0.05, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2), SPARK);
  const sparkAt = Array.from({ length: SPARKS }, (_, i) => {
    const a = hs(i, 1) * Math.PI * 2, r = 4 + hs(i, 2) * 26, x = C0.x + r * Math.cos(a), z = C0.z + r * Math.sin(a);
    return [x, groundY(x, z) + 0.03, z];
  });
  const sparks = new InstancedMesh(sparkGeo, flat, SPARKS);
  sparks.frustumCulled = false;
  land.add(sparks);
  made.push(sparkGeo);

  const fishGeo = join([paint(new SphereGeometry(0.26, 8, 6).scale(1.8, 0.62, 1), AMBER), paint(new BoxGeometry(0.14, 0.34, 0.44).translate(-0.62, 0, 0), AMBER)]);
  const fish = new InstancedMesh(fishGeo, flat, FISH);
  fish.frustumCulled = false;
  land.add(fish);
  made.push(fishGeo);
  const fishBase = Array.from({ length: FISH }, (_, i) => {
    const a = (i / FISH) * Math.PI * 2 + 0.4, r = 4.5 + hs(i, 5) * 4, x = C0.x + r * Math.cos(a), z = C0.z + r * Math.sin(a);
    return { x, z, g: groundY(x, z), yaw: a + Math.PI / 2 };
  });

  const flakeGeo = paint(new IcosahedronGeometry(0.06, 0), AMBER);
  const flakes = new InstancedMesh(flakeGeo, flat, FLAKES);
  flakes.frustumCulled = false;
  land.add(flakes);
  made.push(flakeGeo);
  const flakeBase = Array.from({ length: FLAKES }, (_, i) => {
    const a = i * 0.9 + 0.2, r = 3.5 + hs(i, 3) * 5.5, x = C0.x + r * Math.cos(a), z = C0.z + r * Math.sin(a);
    return { x, z, g: groundY(x, z), h: hs(i, 4) * 1.4 };
  });

  const card = ctx.bake.card(FAR, { tools: ["bgCardMountains"], w: 1280, h: 288, size: [160, 36], id: 0.99 });
  card.position.set(-70, 12, -100);
  far.add(card);
  const haze = ctx.bake.card(FAR_ICE, { tools: ["bgCardMountains"], w: 1536, h: 336, size: [220, 48], id: 0.99 });
  haze.position.set(30, 26, -140);
  far.add(haze);

  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: lin("#cfe3f3") }, uHigh: { value: lin("#a4d0ee") } }, vertexShader: "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }", fragmentShader: SKY_F, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  const su = dome.material.uniforms, own = [su.uSky.value.clone(), su.uHigh.value.clone()], room = lin(ROOM);
  const page = (on, pupVisible = true) => {
    land.visible = !on;
    far.visible = !on;
    shadow.visible = !on && pupVisible;
    pupCast.visible = !on && pupVisible;
    su.uSky.value.copy(on ? room : own[0]);
    su.uHigh.value.copy(on ? room : own[1]);
  };

  const dm = new Object3D();
  const put = (mesh, i, x, y, z, rx, ry, rz, s = 1) => {
    dm.position.set(x, y, z);
    dm.rotation.set(rx, ry, rz);
    dm.scale.setScalar(s);
    dm.updateMatrix();
    mesh.setMatrixAt(i, dm.matrix);
  };
  const step = (t) => {
    arm.rotation.y = t * 0.3;
    fishBase.forEach((f, i) => {
      const p = pose((t + (i * CYCLE) / FISH) % CYCLE);
      put(fish, i, f.x + Math.cos(f.yaw) * p.x, f.g + p.y, f.z - Math.sin(f.yaw) * p.x, 0, f.yaw, p.tilt);
    });
    fish.instanceMatrix.needsUpdate = true;
    flakeBase.forEach((f, i) => put(flakes, i, f.x, f.g + 0.4 + f.h + 0.25 * Math.sin(t * 0.9 + i), f.z, 0, t * 1.2 + i, 0));
    flakes.instanceMatrix.needsUpdate = true;
    const drawing = Math.floor(t * 12 + 1e-6);
    sparkAt.forEach(([x, y, z], i) => put(sparks, i, x, y, z, 0, 0, 0, hs(i, drawing) > 0.45 ? 1 : 0.0001));
    sparks.instanceMatrix.needsUpdate = true;
  };
  step(0);

  const dispose = () => {
    for (const x of made) x.dispose();
    card.userData.dispose?.();
    haze.userData.dispose?.();
  };
  return { group, page, step, dispose };
}
