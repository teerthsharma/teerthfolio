// The island dressed (first readings of the live frames 15 to 23): a bench, a red-awning stall, two lamp posts, a pink town with a grey
// rock face, pink and blue ice, a lime bush, a boulder and a rock cluster. Each object's x is solved so its screen x matches the live
// frame at the ISL lens (T12: .oneshot/p-nerve/tools/T12-screen.mjs). BOOST adds the pad, the blue and pink ice clusters and the red flakes.
// Solids are one merged vertex-coloured mesh, the soft shadows one overlay, the flakes and the translucent ice one instanced set each.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Euler, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Object3D, OctahedronGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { BOOST } from "../clock.js";
import { HUT_AT } from "./hut.js";
import { LIGHT, SUN, paint, solid, toneMat } from "./island.js";

await loadPack("phys");
const ICE = glslFor(["iceSss"]), CEL = glslFor(["iceCel"]);

// dock-frame anchors (x, z) of the dressed objects; x is solved for the live screen x (T12), z is round 1's
export const ANCHOR = {
  bench: [-3.87, -1.8], lampL: [-3.31, -3.6], iceB: [-3.98, -6.0], town: [-4.21, -9.0], lampR: [2.13, -3.0], stall: [3.74, -1.5],
  bush: [5.92, -3.5], boulder: [5.4, 1.8], rocksE: [8.01, -8.0], iceE: [7.09, -2.0],
};
const SALMON = "#e9b8b4", SHUTTER = "#c9333a", TIMBER = "#9a6a3f", AWNING = "#c1272d", GOLD = "#e0a030";
const ROCK = "#8c8a8f", ROCK_DARK = "#6b6a70", ICE_PINK = "#f2c3d1", ICE_BLUE = "#8fcdf0", BUSH = "#a7e03a", BUSH_LIT = "#d6f08a";
const parts = [], shadows = [], crystals = [];

function add(geo, at, hex, { rot = [0, 0, 0], s = [1, 1, 1], alt = null } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.applyMatrix4(new Matrix4().compose(new Vector3(...at), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...s)));
  g.computeVertexNormals();
  parts.push({ g, hex, alt });
}
const box = (w, h, d, x, y, z, hex) => add(new BoxGeometry(w, h, d), [x, y, z], hex);
const shadow = (x, z, rx, rz) => shadows.push([x, z, rx, rz]);
const crystal = (x, z, hex, s) => crystals.push({ x, z, hex, s });
const rock = (x, z, s) => add(new IcosahedronGeometry(1, 1), [x, s[1] * 0.5, z], ROCK, { s, alt: ROCK_DARK });

function bench([x, z]) {
  box(1.5, 0.12, 0.45, x, 0.5, z, "#a9733f");
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.15, 0.15]) box(0.1, 0.5, 0.1, x + dx, 0.25, z + dz, "#a9733f");
  box(1.5, 0.5, 0.08, x, 0.85, z - 0.2, "#a9733f");
  shadow(x, z, 0.9, 0.45);
}
function stall([x, z]) {
  box(2.6, 0.1, 1.6, x, 2.4, z, AWNING);
  for (const dx of [-0.975, -0.325, 0.325, 0.975]) box(0.3, 0.12, 1.62, x + dx, 2.4, z, GOLD);
  for (const dx of [-1.2, 1.2]) for (const dz of [-0.7, 0.7]) box(0.1, 2.4, 0.1, x + dx, 1.2, z + dz, TIMBER);
  box(2.4, 0.9, 0.7, x, 0.45, z, TIMBER);
  box(0.8, 0.8, 0.8, x + 0.9, 0.4, z + 0.8, TIMBER);
  box(0.8, 0.8, 0.8, x + 0.9, 1.2, z + 0.8, TIMBER);
  shadow(x, z, 1.6, 1.1);
}
function lamp(x, z) {
  add(new CylinderGeometry(0.07, 0.07, 3.2, 8), [x, 1.6, z], "#2b2b33");
  add(new SphereGeometry(0.22, 8, 6), [x, 3.3, z], "#f0a030");
  shadow(x, z, 0.35, 0.35);
}
// the pink town: a tall block with red shutters (the anchor), two lower blocks beside it
function town([x, z]) {
  box(3.2, 9.0, 3.0, x, 4.5, z, SALMON);
  for (const dx of [-0.8, 0.8]) for (const y of [5.5, 6.9, 8.3]) box(0.5, 1.1, 0.06, x + dx, y, z + 1.53, SHUTTER);
  box(2.8, 4.2, 2.8, x + 3.8, 2.1, z - 0.6, SALMON);
  box(2.6, 3.6, 2.6, x - 3.9, 1.8, z - 0.6, SALMON);
  shadow(x, z, 2.0, 2.0);
  shadow(x + 3.8, z - 0.6, 1.9, 1.9);
  shadow(x - 3.9, z - 0.6, 1.8, 1.8);
}
function rockFace() {
  for (const [x, z, s] of [[-11.2, -3.5, [2.2, 3.6, 2.0]], [-10.8, -6.5, [2.0, 3.0, 2.2]], [-12.0, -14.5, [2.4, 3.8, 2.2]]]) {
    rock(x, z, s);
    shadow(x, z, s[0], s[2]);
  }
}
// the lime bush: eleven icospheres in a golden-angle ring, the sun side pale
function bush([x, z]) {
  for (let i = 0; i < 11; i++) {
    const a = i * 2.39996, r = 1.4 * Math.sqrt((i + 0.5) / 11), dx = Math.cos(a), dz = Math.sin(a);
    add(new IcosahedronGeometry(0.9, 0), [x + r * dx, 0.9 + 2.2 * ((i * 0.618) % 1), z + r * dz], dx * SUN.x + dz * SUN.z > 0 ? BUSH_LIT : BUSH);
  }
  shadow(x, z, 1.1, 1.1);
}
function boulder([x, z]) {
  add(new IcosahedronGeometry(1, 1), [x, 0.0, z], "#3b3b42", { s: [1.6, 0.5, 1.3] });
  shadow(x, z, 2.0, 1.6);
}
function rocksE([x, z]) {
  add(new IcosahedronGeometry(0.9, 0), [x - 0.6, 0.5, z - 0.5], "#3a7fd0");
  add(new IcosahedronGeometry(0.7, 0), [x + 0.3, 0.45, z + 0.3], "#e08a2e");
  shadow(x, z, 1.6, 1.3);
}

function dress() {
  bench(ANCHOR.bench);
  stall(ANCHOR.stall);
  lamp(...ANCHOR.lampL);
  lamp(...ANCHOR.lampR);
  town(ANCHOR.town);
  rockFace();
  bush(ANCHOR.bush);
  boulder(ANCHOR.boulder);
  rocksE(ANCHOR.rocksE);
  // the pink ice beside the bush, port content
  for (const [x, z, s] of [[7.3, -6.0, [0.5, 1.4, 0.5]], [7.9, -5.6, [0.4, 1.0, 0.4]], [7.6, -6.5, [0.35, 0.8, 0.35]]]) crystal(x, z, ICE_PINK, s);
  shadow(7.5, -6, 1.0, 1.0);
}

function dressBoost() {
  add(new CylinderGeometry(1.5, 1.6, 0.25, 16), [5.5, 0.125, -4.6], "#84cc16");
  shadow(5.5, -4.6, 1.5, 1.5);
  // blue ice behind the station
  for (const [x, z, s] of [[-2.2, -11.2, [0.4, 1.3, 0.4]], [-1.8, -11.6, [0.3, 0.9, 0.3]], [-2.6, -11.5, [0.35, 1.0, 0.35]], [-1.5, -10.9, [0.3, 0.7, 0.3]]]) crystal(x, z, ICE_BLUE, s);
  shadow(-2.2, -11.2, 1.0, 1.0);
  // blue ice cluster left of the left lamp post (T12), four crystals about the anchor
  const [ix, iz] = ANCHOR.iceB;
  for (const [dx, dz, s] of [[0, 0, [0.5, 1.4, 0.5]], [0.45, 0.2, [0.4, 1.0, 0.4]], [-0.4, -0.1, [0.35, 0.8, 0.35]], [-0.1, 0.5, [0.3, 0.7, 0.3]]]) crystal(ix + dx, iz + dz, ICE_BLUE, s);
  shadow(ix, iz, 0.9, 0.7);
  // a pink cluster at the east edge (T17), five crystals
  const [ex, ez] = ANCHOR.iceE;
  for (const [dx, dz, s] of [[0, 0, [0.5, 1.6, 0.5]], [0.5, 0.3, [0.4, 1.1, 0.4]], [-0.4, 0.2, [0.4, 0.9, 0.4]], [0.2, -0.5, [0.3, 0.8, 0.3]], [-0.3, -0.4, [0.35, 1.2, 0.35]]]) crystal(ex + dx, ez + dz, ICE_PINK, s);
  shadow(ex, ez, 0.9, 0.9);
}

function solidMesh() {
  let n = 0;
  for (const p of parts) n += p.g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const { g, hex, alt } of parts) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, lit = paint(hex), dark = alt ? paint(alt) : lit;
    for (let i = 0; i < g.attributes.position.count; i++, o++) {
      pos.set(P.subarray(i * 3, i * 3 + 3), o * 3);
      nor.set(N.subarray(i * 3, i * 3 + 3), o * 3);
      const facing = N[i * 3] * SUN.x + N[i * 3 + 1] * SUN.y + N[i * 3 + 2] * SUN.z > 0.25 ? lit : dark;
      col.set([facing.r, facing.g, facing.b], o * 3);
    }
    g.dispose();
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("normal", new BufferAttribute(nor, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  return new Mesh(geo, solid());
}

function shadowMesh() {
  const pos = [], a = [], R = [[0.6, 0.22], [1.0, 0]], C = [0, 0.35];
  for (const [x, z, rx, rz] of shadows) {
    const cx = x + 0.4, cz = z - 0.4, P = (r, th) => [cx + rx * r * Math.cos(th), 0.03, cz + rz * r * Math.sin(th)];
    for (let s = 0; s < 16; s++) {
      const t0 = (s / 16) * Math.PI * 2, t1 = ((s + 1) / 16) * Math.PI * 2;
      const c = [cx, 0.03, cz], r1a = P(R[0][0], t0), r1b = P(R[0][0], t1), r2a = P(R[1][0], t0), r2b = P(R[1][0], t1);
      pos.push(...c, ...r1a, ...r1b, ...r1a, ...r2a, ...r2b, ...r1a, ...r2b, ...r1b);
      a.push(C[1], R[0][1], R[0][1], R[0][1], R[1][1], R[1][1], R[0][1], R[1][1], R[0][1]);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("aA", new BufferAttribute(new Float32Array(a), 1));
  const m = toneMat(new ShaderMaterial({
    uniforms: { uCol: { value: new Color("#564c6c") } },
    vertexShader: "attribute float aA; varying float vA; void main() { vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol * vA, vA); }",
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
  }));
  const mesh = new Mesh(geo, m);
  mesh.userData.layer = 1;
  return mesh;
}

function flakeGeometry() {
  const pos = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, tip = [Math.cos(a), 0, Math.sin(a)];
    const l = [Math.cos(a - 0.45) * 0.32, 0, Math.sin(a - 0.45) * 0.32], r = [Math.cos(a + 0.45) * 0.32, 0, Math.sin(a + 0.45) * 0.32];
    pos.push(0, 0, 0, ...tip, ...l, 0, 0, 0, ...r, ...tip);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  const c = paint("#ef4444"), col = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new BufferAttribute(col, 3));
  return geo;
}

// red flakes lying flat on the snow within 7 m of the station (layer 1, BOOST)
function flakes() {
  const N = 36, mesh = new InstancedMesh(flakeGeometry(), solid(), N), d = new Object3D(), h = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < N; i++) {
    const r = 7 * Math.sqrt(h(i, 1)), th = 2 * Math.PI * h(i, 2);
    d.position.set(HUT_AT[0] + r * Math.cos(th), 0.04, HUT_AT[2] + r * Math.sin(th));
    d.rotation.set(0, 2 * Math.PI * h(i, 3), 0);
    d.scale.setScalar(0.9 + 0.7 * h(i, 4));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.userData.layer = 1;
  mesh.frustumCulled = false;
  return mesh;
}

// the translucent ice (T17): the table's iceSss, its wrap and blue scatter, one instanced draw; the colour is per instance
const ICE_VERT = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
    mat4 X = modelMatrix * instanceMatrix;
    vec4 w = X * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(X) * normal); vC = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
// big crystals take the table's iceSss, the small ones its iceCel (plates and a hard chip); the colour is per instance
const iceFrag = (glsl, fn) => /* glsl */ `
  uniform vec3 uSun; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  ${glsl}
  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 s = ${fn}(N, uSun, normalize(cameraPosition - vW));
    gl_FragColor = vec4(vC * (0.55 + 0.9 * dot(s, vec3(0.333))), 0.99);
  }`;
function iceSet(list, glsl, fn) {
  const mesh = new InstancedMesh(new OctahedronGeometry(1, 0), toneMat(new ShaderMaterial({ uniforms: { uSun: LIGHT.uSun }, vertexShader: ICE_VERT, fragmentShader: iceFrag(glsl, fn) })), list.length);
  const d = new Object3D();
  list.forEach((k, i) => {
    d.position.set(k.x, k.s[1] * 0.5, k.z);
    d.rotation.set(0.2, 0, 0.15);
    d.scale.set(...k.s);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, paint(k.hex));
  });
  mesh.frustumCulled = false;
  return mesh;
}

export function buildProps() {
  parts.length = 0; shadows.length = 0; crystals.length = 0;
  dress();
  if (BOOST) dressBoost();
  const group = new Group(), solids = solidMesh(), shade = shadowMesh();
  const ice = iceSet(crystals.filter((k) => k.s[1] >= 1), ICE, "iceSss"), cel = iceSet(crystals.filter((k) => k.s[1] < 1), CEL, "iceCel");
  group.add(solids, shade, ice, cel);
  let fl = null;
  if (BOOST) {
    fl = flakes();
    group.add(fl);
  }
  return {
    group,
    update() {},
    dispose() {
      for (const x of [solids, shade, ice, cel, fl]) if (x) {
        x.geometry.dispose();
        x.material.dispose();
      }
    },
  };
}
