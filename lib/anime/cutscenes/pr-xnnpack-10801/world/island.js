// THE ISLAND (the rig frame) for pr-xnnpack-10801: the site's XNNPACK Peak from its own builders (parts/google-range.js: the painted
// skin and the cave; lib/world/terrain.js: the height field), its dressing copied from GoogleRange.jsx (a React module, so its data lives
// here: the brow, the pyrite, the rolling snow cube, the cubes at rest), the sea with its foam, the stars on the snow and the sky dome.
// Built in the rig frame: the world minus DOCK, turned by -TURN, so the seal stands on the dock point of the site.
import { AdditiveBlending, BackSide, BufferGeometry, CircleGeometry, Color, DoubleSide, Euler, Float32BufferAttribute, Group, IcosahedronGeometry, Matrix4, Mesh, PlaneGeometry, Quaternion, RingGeometry, Shape, ShaderMaterial, ShapeGeometry, SphereGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildSkin, CAVE, THROAT } from "../../../../../components/world/land/parts/google-range.js";
import { groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { groundShadow } from "../../../pup.js";
import { DOCK, env, INK_ON, TURN, warp } from "../clock.js";

// the site's colours read as displayed sRGB: a ShaderMaterial writes its colour as it is, so the hex is what the frame shows
const raw = (hex) => new Color(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const K = { snow: raw("#f9f1f4"), wet: raw("#bccad8"), bed: raw("#2b6f86"), sea: raw("#3fc3dc"), foam: raw("#f4fbff"), sky: raw("#cfe3f3"), high: raw("#a4d0ee"), throat: ["#1c1530", "#7a3212", "#ffa51f"], brow: raw("#3b2d7a"), gold: raw("#ffb627"), cube: raw("#fff0d2"), amber: raw("#ffa51f"), amberCore: raw("#ffb347"), star: [raw("#f5a524"), raw("#8e9cc4")] };
const MOUTH = 1.3; // the cave's scale, as the site draws it
const SUN = new Vector3(-14, 26, 12).normalize();
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
// GoogleRange.jsx's peak dressing: the brow [x, y, z, sx, sy, sz, turn], the pyrite [x, y, z, size, tilt], the cubes at rest [x, z, size, turn]
const BROW = [[0, 4.3, -3.2, 3.7, 1.45, 3.3, 0.3], [-3.3, 1.7, -1.0, 1.35, 2.3, 1.9, 1.1], [3.4, 1.5, -1.0, 1.45, 2.0, 1.9, 2.2]];
const PYRITE = [[-1.6, 5.0, -1.2, 0.75, 0.3], [-0.7, 5.2, -1.6, 0.5, 0.9], [1.3, 4.9, -1.1, 0.9, 0.5], [2.3, 4.5, -0.7, 0.45, 1.4], [-3.2, 3.6, 0.3, 0.6, 0.7], [3.4, 3.2, 0.2, 0.7, 1.1], [3.9, 0.7, 0.8, 0.5, 0.2]];
const RESTING = [[-4.9, 2.1, 0.85, 0.4], [5.5, 2.6, 1.05, 1.2]];
// the roller: out of the mouth three tips, a rest, back in (the site's numbers)
const CUBE = 1.35, CUBE_Z0 = 1.1, TIP = 0.6, PAUSE = 0.3, REST = 1.6, TIPS = 3;
const LEG = TIPS * (TIP + PAUSE), LOOP = 2 * (LEG + REST);
const ROLL = 1.6; // the site's clock runs at 1 + 0.6 while the seal is near the peak
const STARS = 36;

const LAND_VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vN; varying vec3 vC;
  void main() { vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
const LAND_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  uniform vec3 uSun;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float lit = smoothstep(0.0, 0.5, dot(n, uSun));
    gl_FragColor = vec4(vC * mix(0.9, 1.0, lit), 0.99);
  }`;
const LIT_VERT = /* glsl */ "varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }";
const LIT_FRAG = /* glsl */ `
  uniform vec3 uSun, uC, uE; varying vec3 vN;
  void main() { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; float lit = smoothstep(0.0, 0.5, dot(n, uSun)); gl_FragColor = vec4(uC * mix(0.9, 1.0, lit) + uE, 0.99); }`;
const FLAT_FRAG = /* glsl */ `uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 0.99); }`;
const FLAT_VERT = /* glsl */ "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const GLOW_FRAG = /* glsl */ "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 0.35); }";
const SKY_FRAG = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99); }`;
const SKY_VERT = /* glsl */ "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";

const landMat = (sun) => new ShaderMaterial({ uniforms: { uSun: { value: sun } }, vertexShader: LAND_VERT, fragmentShader: LAND_FRAG, side: DoubleSide });
const flatMat = (c) => new ShaderMaterial({ uniforms: { uC: { value: c } }, vertexShader: FLAT_VERT, fragmentShader: FLAT_FRAG, side: DoubleSide });
const litMat = (sun, c, e = null) => new ShaderMaterial({ uniforms: { uSun: { value: sun }, uC: { value: c }, uE: { value: e ?? new Color(0, 0, 0) } }, vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, side: DoubleSide });
const glowMat = () => new ShaderMaterial({ uniforms: { uC: { value: K.amber } }, vertexShader: FLAT_VERT, fragmentShader: GLOW_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });

// the height field round the dock on a 1 m grid, on Terrain.jsx's own lattice (the skin's vertices and diagonals match it)
function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const h = (A.y + B.y + C.y) / 3, relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    const gap = Math.min(G[i0].gap, G[i1].gap, G[i2].gap);
    if (gap < 0 && h < -0.25) c.copy(K.bed);
    else c.copy(K.snow).lerp(K.wet, s01(1.8, 0, gap) * 0.85);
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

// the sea's foam: the water's own cells that lie within 6 m of land, in white stripes (step(0.82, fract(dot(p.xz, (0.12, 0.31)))))
function foam() {
  const X0 = 11, Z0 = -97, NX = 111, NZ = 111, H = new Float32Array(NX * NZ), o = {};
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) H[iz * NX + ix] = groundAt(X0 + ix, Z0 + iz, o).h;
  const sea = (ix, iz) => H[iz * NX + ix] < WATER_Y;
  const shore = (ix, iz) => {
    for (let dz = -6; dz <= 6; dz += 2) for (let dx = -6; dx <= 6; dx += 2) {
      const jx = ix + dx, jz = iz + dz;
      if (jx >= 0 && jz >= 0 && jx < NX && jz < NZ && !sea(jx, jz)) return true;
    }
    return false;
  };
  const P = [], y = WATER_Y + 0.04;
  for (let iz = 0; iz < NZ - 1; iz++) for (let ix = 0; ix < NX - 1; ix++) {
    const x = X0 + ix, z = Z0 + iz, s = (0.12 * x + 0.31 * z) % 1;
    if (!sea(ix, iz) || s < 0.82 || !shore(ix, iz)) continue;
    P.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z, x + 1, y, z + 1, x, y, z + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  return g;
}

const bake = (g, m) => { const x = g.index ? g.toNonIndexed() : g.clone(); x.deleteAttribute("uv"); return x.applyMatrix4(m); };
const xf = (p, r, s) => new Matrix4().compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...r)), new Vector3(...s));

// the six-point star, lying on the snow with a seeded yaw; two colours, two merged meshes
function stars(groundAtFn) {
  const shape = new Shape();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6, r = i % 2 ? 0.42 : 1; if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new ShapeGeometry(shape), lists = [[], []];
  const flat = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
  for (let i = 0, k = 0; k < STARS && i < 400; i++) {
    const x = 50 + 25 * rnd(i, 1), z = -60 + 25 * rnd(i, 2);
    if (Math.hypot(x - DOCK[0], z - DOCK[2]) < 1.5) continue;
    const s = 0.25 + 0.25 * rnd(i, 3), y = groundAtFn(x, z) + 0.02;
    const q = new Quaternion().setFromEuler(new Euler(0, rnd(i, 4) * Math.PI * 2, 0)).multiply(flat);
    lists[i % 3 ? 0 : 1].push(bake(star, new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(s, s, s))));
    k++;
  }
  return lists.map((l) => mergeGeometries(l, false));
}

// the roller's pose at clock t: a port of GoogleRange.jsx's Cave, in the cave's frame
function rollerMatrix(t) {
  const p = (Math.max(0, t) * ROLL) % LOOP;
  const back = p >= LEG + REST, q = back ? p - LEG - REST : p, dir = back ? -1 : 1;
  let done = TIPS, f = 0, settle = 0;
  if (q < LEG) {
    done = Math.floor(q / (TIP + PAUSE));
    const r = q - done * (TIP + PAUSE);
    f = r < TIP ? s01(0, 1, r / TIP) : 0;
    if (r >= TIP) { done += 1; settle = 1 - (r - TIP) / PAUSE; }
  }
  const rest = (back ? CUBE_Z0 + TIPS * CUBE : CUBE_Z0) + dir * done * CUBE;
  const h = CUBE / 2, a = f * Math.PI * 0.5, pivot = rest + dir * h, sq = 0.1 * Math.sin(settle * Math.PI);
  const pos = new Vector3(0, h * (Math.sin(a) + Math.cos(a)) - 0.02, pivot + dir * (-h * Math.cos(a) + h * Math.sin(a)));
  return new Matrix4().compose(pos, new Quaternion().setFromEuler(new Euler(dir * a, 0, 0)), new Vector3(CUBE * (1 + sq), CUBE * (1 - sq), CUBE * (1 + sq)));
}

// the island is shown while the stage is open and the glass is cracked or broken: the seal's real place, behind the page
export function landOn(t) {
  const e = env(warp(t));
  return t < INK_ON || e.hole > 0.03 || e.brk > 0.02;
}

export function buildIsland() {
  const group = new Group(), land = new Group(), made = [], o = {};
  land.position.set(-DOCK[0], -DOCK[1], -DOCK[2]);
  group.add(land);
  group.rotation.y = -TURN;
  const sun = SUN.clone();
  const add = (g, m, parent = land) => { const x = new Mesh(g, m); x.frustumCulled = false; parent.add(x); made.push(g, m); return x; };

  add(terrain(0, 130, -110, 10), landMat(sun));
  add(buildSkin(), landMat(sun));
  add(new PlaneGeometry(140, 110).rotateX(-Math.PI / 2).translate(66, WATER_Y, -42), flatMat(K.sea));
  add(foam(), flatMat(K.foam));
  const [starsOrange, starsBlue] = stars((x, z) => groundAt(x, z, o).h);
  add(starsOrange, flatMat(K.star[0]));
  add(starsBlue, flatMat(K.star[1]));

  const cave = new Group(), mouth = new Group();
  cave.position.set(CAVE.x, 0, CAVE.z);
  cave.rotation.y = CAVE.turn;
  mouth.scale.setScalar(MOUTH);
  [1, 0.64, 0.34].forEach((k, i) => {
    const g = new ShapeGeometry(new Shape(THROAT.map(([x, y]) => ({ x: x * k, y: y * k }))));
    const m = new Mesh(g, flatMat(raw(K.throat[i])));
    m.position.z = i * 0.04;
    mouth.add(m);
    made.push(g, m.material);
  });
  const core = new Mesh(new CircleGeometry(0.5, 32), flatMat(K.amberCore));
  core.position.set(0, 0.75, 0.12);
  const glow = new Mesh(new RingGeometry(1.3, 1.5, 48), glowMat());
  glow.position.set(0, 2.0, 0.14);
  mouth.add(core, glow);
  made.push(core.geometry, core.material, glow.geometry, glow.material);
  const brow = mergeGeometries(BROW.map(([x, y, z, sx, sy, sz, t]) => bake(new IcosahedronGeometry(1, 0), xf([x, y, z], [0, t, 0.15], [sx, sy, sz]))), false);
  const pyrite = mergeGeometries(PYRITE.map(([x, y, z, s, tl], i) => bake(new RoundedBoxGeometry(1, 1, 1, 2, 0.14), xf([x, y, z], [tl, tl * 1.7 + i, tl * 0.6], [s, s, s]))), false);
  const browM = new Mesh(brow, litMat(sun, K.brow)), pyriteM = new Mesh(pyrite, litMat(sun, K.gold));
  mouth.add(browM, pyriteM);
  made.push(brow, browM.material, pyrite, pyriteM.material);
  cave.add(mouth);

  const cubeGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.14), cubeMat = litMat(sun, K.cube, new Color().copy(K.amber).multiplyScalar(0.12));
  const rest = mergeGeometries(RESTING.map(([x, z, s, t]) => bake(cubeGeo, xf([x, s / 2 - 0.04, z], [0, t, 0], [s, s, s]))), false);
  const restM = new Mesh(rest, cubeMat);
  const roller = new Mesh(cubeGeo, cubeMat);
  rollerMatrix(0).decompose(roller.position, roller.quaternion, roller.scale);
  cave.add(restM, roller);
  made.push(cubeGeo, cubeMat, rest, restM.material);
  land.add(cave);

  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: K.sky }, uHigh: { value: K.high } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);
  made.push(dome.geometry, dome.material);

  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  const page = (on) => { land.visible = on; shadow.visible = on; };
  const update = (t) => rollerMatrix(t).decompose(roller.position, roller.quaternion, roller.scale);
  return { group, page, update, dispose() { for (const x of made) x.dispose(); } };
}
