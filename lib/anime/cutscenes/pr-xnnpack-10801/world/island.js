// THE ISLAND (the rig frame) for pr-xnnpack-10801: the site's XNNPACK Peak from its own builders (components/world/land/parts/google-range.js:
// the painted skin and the cave; lib/world/terrain.js: the height field the skin sits on), the sea round the foot, and the sky dome.
// Built in the rig frame: the world minus DOCK, turned by -TURN, so the seal stands on the dock point of the site.
import { BackSide, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, PlaneGeometry, Shape, ShaderMaterial, ShapeGeometry, SphereGeometry, Vector3 } from "three";
import { buildSkin, CAVE, THROAT } from "../../../../../components/world/land/parts/google-range.js";
import { groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { groundShadow } from "../../../pup.js";
import { DOCK, env, INK_ON, TURN, warp } from "../clock.js";

const lin = (hex) => new Color(hex);
const K = { snow: lin("#f7eff2"), wet: lin("#bccad8"), bed: lin("#2b6f86"), sea: lin("#5092b5"), sky: lin("#cfe3f3"), high: lin("#a4d0ee"), throat: ["#1c1530", "#7a3212", "#ffa51f"] };
const MOUTH = 1.3; // the cave's scale, as the site draws it
const SUN = new Vector3(-14, 26, 12).normalize();
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

const LAND_VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vN; varying vec3 vC;
  void main() { vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
const LAND_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  uniform vec3 uSun;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float lit = smoothstep(0.0, 0.5, dot(n, uSun));
    gl_FragColor = vec4(vC * mix(0.8, 1.0, lit), 0.99);
  }`;
const FLAT_FRAG = /* glsl */ `uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 0.99); }`;
const FLAT_VERT = /* glsl */ "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FRAG = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99); }`;
const SKY_VERT = /* glsl */ "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";

const landMat = (sun) => new ShaderMaterial({ uniforms: { uSun: { value: sun } }, vertexShader: LAND_VERT, fragmentShader: LAND_FRAG, side: DoubleSide });
const flatMat = (c) => new ShaderMaterial({ uniforms: { uC: { value: c } }, vertexShader: FLAT_VERT, fragmentShader: FLAT_FRAG, side: DoubleSide });

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

// the island is shown while the stage is open and the glass is cracked or broken: the seal's real place, behind the page
export function landOn(t) {
  const e = env(warp(t));
  return t < INK_ON || e.hole > 0.03 || e.brk > 0.02;
}

export function buildIsland() {
  const group = new Group(), land = new Group(), made = [];
  land.position.set(-DOCK[0], -DOCK[1], -DOCK[2]);
  group.add(land);
  group.rotation.y = -TURN;
  const sun = SUN.clone();
  const add = (g, m) => { const x = new Mesh(g, m); x.frustumCulled = false; land.add(x); made.push(g, m); return x; };

  add(terrain(0, 130, -110, 10), landMat(sun));
  add(buildSkin(), landMat(sun));
  const sea = new PlaneGeometry(140, 110).rotateX(-Math.PI / 2).translate(66, WATER_Y, -42);
  add(sea, flatMat(K.sea));

  const cave = new Group();
  cave.position.set(CAVE.x, 0, CAVE.z);
  cave.rotation.y = CAVE.turn;
  cave.scale.setScalar(MOUTH);
  [1, 0.64, 0.34].forEach((k, i) => {
    const g = new ShapeGeometry(new Shape(THROAT.map(([x, y]) => ({ x: x * k, y: y * k }))));
    const m = new Mesh(g, flatMat(lin(K.throat[i])));
    m.position.z = i * 0.04;
    cave.add(m);
    made.push(g, m.material);
  });
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
  return { group, page, dispose() { for (const x of made) x.dispose(); } };
}
