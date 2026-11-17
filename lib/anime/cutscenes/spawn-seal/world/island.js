// The spawn island: the snow plain from the site's height field, the sea, the granite plinth with the bronze pup (SEAL SEAL), the plaque,
// the far skyline and the blue banners, in the rig frame (the plinth top at the seal's feet, y = 0).
import { BackSide, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildSealD } from "../../../../../components/world/seal/variants/D-parts.js";
import { groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { DOCK } from "../clock.js";

const R = 60;
const SNOW = "#f1ebed", COOL = "#d9dfe8", SEA = "#256881";
const GRANITE = "#9e928d", GRANITE_DARK = "#6a625c", INK = "#1c1824", BLUE = "#3d6bd8";
const SKY_LOW = "#cadae3", SKY_HIGH = "#dbe7ef";
const SUN = new Vector3(-14, 26, 12).normalize();
const PASTELS = ["#d9c9e8", "#c8d8e8", "#a8d8c8", "#e8c8c8"];
const TEAL = "#a8d8c8";

const LIT = {
  uniforms: { uSun: { value: SUN }, uCool: { value: new Color(COOL) } },
  vertexShader: /* glsl */ `
    attribute vec3 color; varying vec3 vN; varying vec3 vC;
    void main() { vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uSun, uCool; varying vec3 vN; varying vec3 vC;
    void main() { float l = max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(mix(uCool, vC, smoothstep(0.0, 0.5, l)), 0.99); }`,
};

const BRONZE = {
  uniforms: { uBase: { value: new Color("#6e5344") }, uDeep: { value: new Color("#2e211b") }, uRim: { value: new Color("#c4a574") }, uSun: { value: new Vector3(0.45, 0.8, 0.4) } },
  vertexShader: /* glsl */ `
    varying vec3 vN; varying vec3 vV;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uBase; uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uSun;
    varying vec3 vN; varying vec3 vV;
    void main() {
      vec3 n = normalize(vN);
      float l = dot(n, normalize(uSun));
      float ramp = smoothstep(-0.15, 0.1, l) * 0.55 + smoothstep(0.35, 0.5, l) * 0.45;
      vec3 c = mix(uDeep, uBase, ramp);
      float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
      c += uRim * smoothstep(0.35, 0.6, rim) * 0.85;
      vec3 h = normalize(normalize(uSun) + normalize(vV));
      c += uRim * smoothstep(0.93, 0.96, dot(n, h)) * 0.5;
      gl_FragColor = vec4(c, 0.99);
    }`,
};

const SKY = {
  uniforms: { uLow: { value: new Color(SKY_LOW) }, uHigh: { value: new Color(SKY_HIGH) } },
  vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uLow; uniform vec3 uHigh; varying vec3 vW;
    void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uLow, uHigh, smoothstep(-0.05, 0.5, h)), 0.99); }`,
};

function flat(geo, hex, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count, c = new Color(hex), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  const out = new BufferGeometry();
  out.setAttribute("position", g.attributes.position.clone());
  out.setAttribute("normal", g.attributes.normal.clone());
  out.setAttribute("color", new Float32BufferAttribute(col, 3));
  return out;
}

const at = (x, z, o) => {
  groundAt(DOCK[0] + x, DOCK[2] + z, o);
  return o.h;
};

function snowGround(H0) {
  const o = {}, N = 2 * R + 1, h = new Float32Array(N * N), mt = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      at(i - R, j - R, o);
      h[j * N + i] = o.h - H0;
      mt[j * N + i] = o.mount;
    }
  const pos = [], nor = [], col = [], c = new Color(SNOW);
  const vtx = (x, z) => [x, h[(z + R) * N + (x + R)], z];
  const relief = (x, z) => mt[(z + R) * N + (x + R)] > 0.02;
  const tri = (p, q, r, rl) => {
    let n = [0, 1, 0];
    if (rl) {
      const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
      n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const L = Math.hypot(...n) || 1;
      n = n.map((k) => k / L);
      if (n[1] < 0) n = n.map((k) => -k);
    }
    for (const v of [p, q, r]) {
      pos.push(...v);
      nor.push(...n);
      col.push(c.r, c.g, c.b);
    }
  };
  for (let z = -R; z < R; z++)
    for (let x = -R; x < R; x++) {
      if ((x + 0.5) ** 2 + (z + 0.5) ** 2 > R * R) continue;
      const rl = relief(x, z) || relief(x, z + 1) || relief(x + 1, z + 1) || relief(x + 1, z);
      tri(vtx(x, z), vtx(x, z + 1), vtx(x + 1, z + 1), rl);
      tri(vtx(x, z), vtx(x + 1, z + 1), vtx(x + 1, z), rl);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function plaqueTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 598;
  const g = c.getContext("2d");
  g.fillStyle = GRANITE;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = GRANITE_DARK;
  g.lineWidth = 14;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = INK;
  g.font = "bold 104px Georgia, serif";
  g.fillText("SEAL SEAL", 512, 299);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function pup() {
  const parts = buildSealD();
  const mirror = new Matrix4().makeScale(-1, 1, 1);
  const geos = [parts.body, parts.head, parts.flipper, parts.tail, parts.flipper];
  const bodies = geos.map((g, i) => {
    const x = g.index ? g.toNonIndexed() : g.clone();
    if (i === 4) x.applyMatrix4(mirror);
    if (!x.attributes.normal) x.computeVertexNormals();
    const out = new BufferGeometry();
    out.setAttribute("position", x.attributes.position.clone());
    out.setAttribute("normal", x.attributes.normal.clone());
    return out;
  });
  const merged = mergeGeometries(bodies, false);
  merged.computeBoundingBox();
  const length = merged.boundingBox.max.z - merged.boundingBox.min.z;
  merged.scale(2.8 / length, 2.8 / length, 2.8 / length);
  return merged;
}

export function buildIsland() {
  const made = [];
  const o = {};
  const H0 = at(0, 0, o);
  const H = (x, z) => at(x, z, o) - H0;
  const group = new Group();
  group.position.set(0, -0.85, 0);
  const keep = (x) => (made.push(x), x);

  const lit = new ShaderMaterial(LIT);
  const bronze = new ShaderMaterial(BRONZE);
  const sky = new ShaderMaterial({ ...SKY, side: BackSide, depthWrite: false });
  const sea = new MeshBasicMaterial({ color: SEA, side: DoubleSide });
  keep(lit); keep(bronze); keep(sky); keep(sea);

  const ground = new Mesh(keep(snowGround(H0)), lit);
  ground.frustumCulled = false;
  const seaMesh = new Mesh(keep(new RingGeometry(40, 320, 72).rotateX(-Math.PI / 2)), sea);
  seaMesh.position.y = WATER_Y - H0;
  seaMesh.frustumCulled = false;
  const dome = new Mesh(keep(new SphereGeometry(200, 32, 16)), sky);
  dome.renderOrder = -9;
  dome.frustumCulled = false;

  const plaqueTilt = -(Math.PI / 2 - 0.5);
  const plaqueM = new Matrix4().makeRotationX(plaqueTilt).setPosition(0, 0.86, 0.6);
  const frameM = plaqueM.clone().multiply(new Matrix4().makeTranslation(0, 0, -0.03));
  const faceM = plaqueM.clone();
  const parts = [
    flat(new BoxGeometry(3.0, 0.85, 1.8), GRANITE, new Matrix4().makeTranslation(0, 0.425, -0.4)),
    flat(new BoxGeometry(3.0, 0.01, 1.8), GRANITE_DARK, new Matrix4().makeTranslation(0, 0.855, -0.4)),
    flat(new BoxGeometry(1.32, 0.82, 0.06), GRANITE_DARK, frameM),
    flat(new CylinderGeometry(0.035, 0.035, 3.2, 6), GRANITE_DARK, new Matrix4().makeTranslation(-1.75, 1.6 + 0.85, -0.4)),
    flat(new CylinderGeometry(0.035, 0.035, 3.2, 6), GRANITE_DARK, new Matrix4().makeTranslation(1.75, 1.6 + 0.85, -0.4)),
    flat(new PlaneGeometry(0.9, 1.4), BLUE, new Matrix4().makeTranslation(-2.2, 3.3, -0.4)),
    flat(new PlaneGeometry(0.9, 1.4), BLUE, new Matrix4().makeTranslation(2.2, 3.3, -0.4)),
  ];
  const skyline = [[-19, -24, 0], [-11, -29, 1], [-4, -22, 2], [4, -27, 3], [12, -23, 1], [19, -28, 2]];
  skyline.forEach(([x, z, k], i) => {
    const w = 2.6 + 1.6 * ((i * 37) % 7) / 7, hgt = 5 + 7 * ((i * 53) % 5) / 5;
    const base = H(x, z);
    parts.push(flat(new BoxGeometry(w, hgt, w), PASTELS[(k + i) % PASTELS.length], new Matrix4().makeTranslation(x, base + hgt / 2, z)));
  });
  const tb = H(-1, -30);
  for (let i = 0; i < 14; i++) {
    const r = 1.8 - 0.06 * i;
    parts.push(flat(new CylinderGeometry(r, r + 0.1, 0.8, 10).rotateY(0.45 * i), TEAL, new Matrix4().makeTranslation(-1, tb + 0.4 + i * 0.8, -30)));
  }
  const litGeo = keep(mergeGeometries(parts, false));
  const litMesh = new Mesh(litGeo, lit);
  litMesh.frustumCulled = false;

  const pupGeo = keep(pup());
  const pupMesh = new Mesh(pupGeo, bronze);
  pupMesh.position.set(0, 0.85, -1.2);
  pupMesh.frustumCulled = false;

  let plaqueFace = null;
  if (typeof document !== "undefined") {
    const face = new MeshBasicMaterial({ map: plaqueTexture(), toneMapped: false });
    keep(face.map);
    keep(face);
    const pl = keep(new PlaneGeometry(1.2, 0.7));
    plaqueFace = new Mesh(pl.applyMatrix4(faceM), face);
    plaqueFace.frustumCulled = false;
  }

  group.add(ground, seaMesh, dome, litMesh, pupMesh);
  if (plaqueFace) group.add(plaqueFace);

  let paged = false, shown = true;
  const apply = () => (group.visible = !paged && shown);
  apply();
  return {
    group,
    page(on) {
      paged = on;
      apply();
    },
    update(t) {
      shown = t < 1.12 || t >= 14.4;
      apply();
    },
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
