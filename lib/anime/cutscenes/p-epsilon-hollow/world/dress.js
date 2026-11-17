// The fuller frame round the seal: cave crystals flanking the lens path, the battlefield's banners, charred slabs and embers, and the
// island's falling snow and cyan flakes. Built once; update(t, war) only toggles visibility and writes matrices and uniforms.
import { AdditiveBlending, BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Points, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { crystalMat } from "../live/world.js";
import { HIT, T } from "../clock.js";

const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const lerp = (a, b, x) => a + (b - a) * x;
const LIT_V = /* glsl */ `varying vec3 vN;
  void main() { vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vN = normalize(mat3(modelMatrix) * n); gl_Position = projectionMatrix * viewMatrix * modelMatrix * p; }`;
const LIT_F = /* glsl */ `uniform vec3 uC; uniform vec3 uSun; varying vec3 vN;
  void main() { float l = 0.86 + 0.14 * max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(uC * l, 0.99); }`;
const EMBER_V = /* glsl */ `uniform float uT; varying float vF;
  void main() { vec3 p = position; p.y = mod(p.y + uT * 0.4, 6.0); p.x += 0.12 * sin(uT * 1.3 + p.z * 5.0);
    vF = smoothstep(0.0, 0.6, p.y) * (1.0 - smoothstep(4.5, 6.0, p.y));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); gl_PointSize = 8.0; }`;
const EMBER_F = /* glsl */ `varying float vF;
  void main() { vec2 q = gl_PointCoord - 0.5; if (dot(q, q) > 0.25) discard; gl_FragColor = vec4(vec3(1.0, 0.42, 0.08) * vF, 0.0); }`;

const TINTS = ["#33e6ff", "#ff59d9", "#8c66ff"];

function prism(hex) {
  const c = new Color(hex);
  const paint = (g) => {
    g.deleteAttribute("uv");
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new Float32BufferAttribute(a, 3));
    return g;
  };
  return mergeGeometries([paint(new CylinderGeometry(0.2, 0.28, 1.4, 6, 1).translate(0, 0.7, 0)), paint(new ConeGeometry(0.2, 0.6, 6).translate(0, 1.7, 0))], false);
}

export function buildDress() {
  const group = new Group(), cave = new Group(), war = new Group(), isle = new Group();
  const made = [];
  const track = (x) => (made.push(x), x);
  const dummy = new Object3D();
  const set = (p, s = [1, 1, 1], r = [0, 0, 0]) => {
    dummy.position.set(...p);
    dummy.scale.set(...s);
    dummy.rotation.set(...r);
    dummy.updateMatrix();
    return dummy.matrix;
  };
  const lit = (hex) => track(new ShaderMaterial({ uniforms: { uC: { value: new Color(hex) }, uSun: { value: new Vector3(-0.5, 0.62, 0.62).normalize() } }, vertexShader: LIT_V, fragmentShader: LIT_F, side: DoubleSide }));
  group.add(cave, war, isle);

  const cmat = track(crystalMat());
  for (let k = 0; k < 3; k++) {
    const base = track(prism(TINTS[k]));
    const parts = [];
    for (let i = 0; i < 16; i++) {
      if (Math.floor(hash(i, 3) * 3) !== k) continue;
      const left = i < 8;
      const x = left ? lerp(-3.2, -1.6, hash(i, 4)) : lerp(1.8, 3.4, hash(i, 4));
      const z = lerp(1.6, 3.4, hash(i, 5));
      const s = 0.35 + 0.45 * hash(i, 1);
      const g = base.clone();
      g.applyMatrix4(set([x, 0, z], [s, s, s], [0, hash(i, 2) * Math.PI * 2, (hash(i, 3) - 0.5) * 0.25]));
      parts.push(track(g));
    }
    cave.add(new Mesh(track(mergeGeometries(parts, false)), cmat));
  }

  const bannerMat = lit("#7a1018");
  const trimMat = lit("#ffd37a");
  const banners = new InstancedMesh(track(new PlaneGeometry(0.5, 1.1).translate(0, 0.55, 0)), bannerMat, 9);
  const trims = new InstancedMesh(track(new PlaneGeometry(0.5, 0.08).translate(0, 0.04, 0.001)), trimMat, 9);
  const slabs = new InstancedMesh(track(new BoxGeometry(0.9, 0.35, 0.6).translate(0, 0.175, 0)), lit("#0b0706"), 14);
  const rims = new InstancedMesh(track(new BoxGeometry(0.92, 0.05, 0.62).translate(0, 0.35, 0)), lit("#42240d"), 14);
  const side = (i, k) => (i % 2 ? lerp(1.6, 4.2, hash(i, k)) : lerp(-4, -1.6, hash(i, k)));
  for (let i = 0; i < 9; i++) {
    const p = [side(i, 6), 0, lerp(1.2, 3.6, hash(i, 7))];
    const r = [-(70 + 15 * hash(i, 8)) * (Math.PI / 180), hash(i, 9) * 0.6 - 0.3, 0];
    banners.setMatrixAt(i, set(p, [1, 1, 1], r));
    trims.setMatrixAt(i, set(p, [1, 1, 1], r));
  }
  for (let i = 0; i < 14; i++) {
    const p = [side(i, 10), 0, lerp(1.2, 3.6, hash(i, 11))];
    const r = [0, hash(i, 12) * Math.PI, (hash(i, 13) - 0.5) * 0.2];
    slabs.setMatrixAt(i, set(p, [1, 1, 1], r));
    rims.setMatrixAt(i, set(p, [1, 1, 1], r));
  }
  for (const m of [banners, trims, slabs, rims]) {
    m.frustumCulled = false;
    war.add(m);
  }

  const seeds = new Float32Array(40 * 3);
  for (let i = 0; i < 40; i++) seeds.set([side(i, 14), 6 * hash(i, 15), lerp(1.2, 3.6, hash(i, 16))], i * 3);
  const emberGeo = track(new BufferGeometry());
  emberGeo.setAttribute("position", new Float32BufferAttribute(seeds, 3));
  const embers = new Points(emberGeo, track(new ShaderMaterial({ uniforms: { uT: { value: 0 } }, vertexShader: EMBER_V, fragmentShader: EMBER_F, transparent: true, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true })));
  embers.frustumCulled = false;
  war.add(embers);

  const H0 = Array.from({ length: 90 }, (_, i) => [(hash(i, 19) - 0.5) * 16, hash(i, 20) * 8, (hash(i, 21) - 0.5) * 16 - 4, 0.03 + 0.03 * hash(i, 22), hash(i, 23) * 6.28]);
  const flakes = new InstancedMesh(track(new SphereGeometry(1, 6, 4)), track(new MeshBasicMaterial({ color: "#ffffff" })), 90);
  flakes.frustumCulled = false;
  isle.add(flakes);
  const cyan = track(new MeshBasicMaterial({ color: "#3fe0d0" }));
  const flat = track(new CircleGeometry(0.25, 16).rotateX(-Math.PI / 2));
  for (let k = 0; k < 6; k++) {
    let x = lerp(-3, 3, hash(k, 17)), z = lerp(-2, 2, hash(k, 18));
    if (Math.abs(x) < 0.9 && Math.abs(z) < 0.9) x = x < 0 ? -1.2 : 1.2;
    const d = new Mesh(flat, cyan);
    d.position.set(x, 0.005, z);
    isle.add(d);
  }

  return {
    group,
    update(t, w) {
      cave.visible = w < 0.5;
      war.visible = w > 0.5 && t < T.gone[0];
      isle.visible = t < HIT.plop || t >= T.back[0];
      cmat.uniforms.uT.value = t;
      embers.material.uniforms.uT.value = t;
      if (!isle.visible) return;
      for (let i = 0; i < 90; i++) {
        const [x, y0, z, s, ph] = H0[i];
        const y = (((y0 - 0.25 * t) % 8) + 8) % 8;
        flakes.setMatrixAt(i, set([x + 0.3 * Math.sin(t * 0.8 + ph), y, z], [s, s, s]));
      }
      flakes.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
