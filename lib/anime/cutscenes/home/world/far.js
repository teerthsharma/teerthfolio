// Far depth for home: three painted ridges behind Vinland (opaque wash, snow on the two farther ones) and one see-through layer
// (cloud cards, the wet sky of the gap with the sun's ring, the glitter path, the sea band) drawn over the plate with plate depth.
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { col3, wash } from "../live/paper.js";
import { WATER_Y } from "../live/land.js";
import { SUN } from "../tone.js";
import { INTO, LINE, hash, run, smooth } from "../clock.js";

await loadPack("sakuga");
await loadPack("cuts");
const SKY_CLOUD = glslFor(["ghibliCloudPile", "ghibliSkyWash"]);
const PATH = glslFor(["wheatPath"]);

// Farthest first (the palest, haziest, snow-capped); radius is distance from the rig, all behind Vinland (z -139..-185).
const RIDGE = [
  { r: 225, hc: 9, amp: 0.5, freq: 3, tone: [0.86, 0.76, 0.78], snow: true },
  { r: 215, hc: 12, amp: 0.35, freq: 7, tone: [0.76, 0.68, 0.78], snow: true },
  { r: 205, hc: 15, amp: 0.3, freq: 5, tone: [0.66, 0.62, 0.78], snow: false },
];
const SNOW = [0.976, 0.957, 0.929], HALF = 0.62, COLS = 120, BOTTOM = WATER_Y - 0.1, RIDGE_HAZE = 0.0085;
const GAP_CREAM = "#efe9e0"; // the ridges fade into the gap's cream, not the apricot haze: the apricot band is the pink the probe forbids
const CLOUDS = [[-0.9, 0.22], [-0.45, 0.3], [0, 0.24], [0.35, 0.36], [0.7, 0.46]];
const CR = 130, CW = 17, CH = 6, SEA_R = 125, SEA_H = 1.2, SEG = 96;
const DRIFT = (0.004 * CR) / CW;
const GR = 240, GAP = { az: [-0.5, 0.9], el: [0.02, 0.3], nu: 16, nv: 2 };
const SUN_AZ = Math.atan2(SUN[0], -SUN[2]), SUN_EL = Math.asin(SUN[1] / Math.hypot(...SUN));

const n1 = (x, k) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, k) * (1 - u) + hash(i + 1, k) * u;
};
const fb1 = (x, k) => (0.5 * n1(x, k) + 0.25 * n1(x * 2.03, k + 1) + 0.125 * n1(x * 4.1, k + 2)) / 0.875;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const unit = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function ridgeGeometry() {
  const pos = [], col = [], idx = [];
  RIDGE.forEach((q, ri) => {
    const base = pos.length / 3;
    for (let c = 0; c <= COLS; c++) {
      const u = c / COLS, th = -HALF + 2 * HALF * u;
      const h = q.hc * (1 - q.amp + 2 * q.amp * fb1(q.freq * u, 10 + ri * 3));
      const s = Math.sin(th) * q.r, k = -Math.cos(th) * q.r;
      for (const [y, cc] of [[BOTTOM, q.tone], [0.7 * h, q.tone], [h, q.snow ? SNOW : q.tone]]) pos.push(s, y, k), col.push(...cc);
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < 2; r++) {
      const a = base + c * 3 + r, b = base + (c + 1) * 3 + r;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function aloftGeometry() {
  const pos = [], uv = [], kind = [], idx = [];
  const quad = (p, u, k) => {
    const b = pos.length / 3;
    for (let i = 0; i < 4; i++) pos.push(...p[i]), uv.push(...u[i]), kind.push(k);
    idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  };
  for (const [az, el] of CLOUDS) {
    const P = [CR * Math.cos(el) * Math.sin(az), CR * Math.sin(el), -CR * Math.cos(el) * Math.cos(az)];
    const n = unit(mul(P, -1)), right = unit(cross([0, 1, 0], n)), up = cross(n, right);
    const at = (sx, sy) => add(add(P, mul(right, sx * CW)), mul(up, sy * CH));
    quad([at(-1, -1), at(1, -1), at(-1, 1), at(1, 1)], [[0, 0], [1, 0], [0, 1], [1, 1]], 0);
  }
  const gz0 = -60, gz1 = -140, y = WATER_Y + 0.02;
  quad([[0, y, gz0], [12, y, gz0], [0, y, gz1], [12, y, gz1]], [[0, 0], [1, 0], [0, 1], [1, 1]], 1);
  const b = pos.length / 3;
  for (let k = 0; k <= SEG; k++) {
    const a = (k / SEG) * Math.PI * 2, x = SEA_R * Math.cos(a), z = SEA_R * Math.sin(a);
    pos.push(x, 0, z, x, SEA_H, z);
    uv.push(k / SEG, 0, k / SEG, 1);
    kind.push(2, 2);
    if (k < SEG) idx.push(b + 2 * k, b + 2 * k + 2, b + 2 * k + 1, b + 2 * k + 2, b + 2 * k + 3, b + 2 * k + 1);
  }
  const gb = pos.length / 3, W1 = GAP.nu + 1;
  for (let v = 0; v <= GAP.nv; v++) for (let u = 0; u <= GAP.nu; u++) {
    const az = GAP.az[0] + (GAP.az[1] - GAP.az[0]) * (u / GAP.nu), el = GAP.el[0] + (GAP.el[1] - GAP.el[0]) * (v / GAP.nv);
    pos.push(GR * Math.cos(el) * Math.sin(az), GR * Math.sin(el), -GR * Math.cos(el) * Math.cos(az));
    uv.push(u / GAP.nu, v / GAP.nv);
    kind.push(3);
  }
  for (let v = 0; v < GAP.nv; v++) for (let u = 0; u < GAP.nu; u++) {
    const a = gb + v * W1 + u, c = a + W1;
    idx.push(a, a + 1, c, a + 1, c + 1, c);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("aKind", new BufferAttribute(new Float32Array(kind), 1));
  g.setIndex(idx);
  return g;
}

function aloftMaterial() {
  return new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uEnv: { value: 0 } },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec2 vUv;
      varying float vK;
      void main() {
        vUv = uv;
        vK = aKind;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uEnv;
      varying vec2 vUv;
      varying float vK;
      ${SKY_CLOUD}
      ${PATH}
      void main() {
        vec4 o = vec4(0.0);
        float Ls = dot(SK_GHIB_SKY, SK_LUMA), Lc = dot(SK_GHIB_CLOUD, SK_LUMA);
        if (vK < 0.5) {
          vec3 c = ghibliCloudPile(vec2(vUv.x + ${DRIFT.toFixed(4)} * uT, vUv.y), uT);
          float cov = clamp((dot(c, SK_LUMA) - Ls) / (Lc - Ls), 0.0, 1.0);
          vec3 col = mix(vec3(0.722, 0.663, 0.839), vec3(1.0, 0.976, 0.922), smoothstep(0.2, 0.9, vUv.y));
          float a = cov * 0.8;
          o = vec4(col * a, a);
        } else if (vK < 1.5) {
          float band = exp(-pow((vUv.x - 0.5) / 0.3, 2.0));
          float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
          float st = cHatch(vec2(vUv.x * 90.0, vUv.y * 40.0), 3.5);
          vec3 col = mix(vec3(1.0, 0.851, 0.565), vec3(0.965, 0.929, 0.863), st);
          float a = min(0.5, band * fade * (0.2 + 0.3 * st) * uEnv);
          o = vec4(col * a, a);
        } else if (vK < 2.5) {
          float a = 0.12 * (1.0 - smoothstep(0.0, 1.0, vUv.y));
          o = vec4(vec3(1.0, 0.93, 0.74) * a, a);
        } else {
          float a = 0.06 * clamp((dot(ghibliSkyWash(vUv, uT), SK_LUMA) - Ls) / (Lc - Ls), 0.0, 1.0);
          float az = mix(${GAP.az[0].toFixed(3)}, ${GAP.az[1].toFixed(3)}, vUv.x), el = mix(${GAP.el[0].toFixed(3)}, ${GAP.el[1].toFixed(3)}, vUv.y);
          float d = length(vec2((az - ${SUN_AZ.toFixed(4)}) * cos(el), el - ${SUN_EL.toFixed(4)}));
          float ra = 0.5 * (1.0 - smoothstep(0.0, 0.006, abs(d - 0.05)));
          o = vec4(vec3(0.788, 0.765, 0.918) * a + vec3(0.949, 0.620, 0.380) * ra, a + ra);
        }
        gl_FragColor = o;
      }`,
  });
}

const env = (t) => smooth(4.6, 5.6, t) * (1 - smooth(10.2, 10.5, t)) + smooth(12.3, 13.4, t) * (1 - smooth(17.6, 18.0, t));

export function buildFar() {
  const ridgeGeo = ridgeGeometry();
  const ridgeMat = wash({ vertexColors: true, paper: 0.6, edge: 0.3, rim: 0.2, haze: RIDGE_HAZE, albedo: "return vc;" });
  ridgeMat.uniforms.uHaze = { value: col3(GAP_CREAM) };
  const ridges = new Mesh(ridgeGeo, ridgeMat);
  const aloftGeo = aloftGeometry();
  const aloftMat = aloftMaterial();
  const aloft = new Mesh(aloftGeo, aloftMat);
  aloft.frustumCulled = false;
  aloft.userData.layer = 1;
  aloft.userData.plateDepth = true;
  const group = new Group();
  group.add(ridges, aloft);
  return {
    group,
    update(t) {
      aloftMat.uniforms.uT.value = t;
      aloftMat.uniforms.uEnv.value = env(t);
      group.visible = t >= INTO - 0.04 && t < LINE.collapse[0] && run(t) < 0.97;
    },
    dispose() {
      ridgeGeo.dispose();
      ridgeMat.dispose();
      aloftGeo.dispose();
      aloftMat.dispose();
    },
  };
}

export default buildFar;
