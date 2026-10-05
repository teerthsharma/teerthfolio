// TENSURA's CAST: Demon Lord Rimuru (a 2.2 m human built from tapered capsule limbs, a flared coat with folds and a ribbon hair mass),
// the Predator vortex that engulfs the pup, the black particles that reform it, and Veldora the Storm Dragon coiled in his seal.
// All built once at mount; per frame only transforms and uniforms change. Coordinates: metres, +y up, the figure faces +z.
import { AdditiveBlending, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, Object3D, OctahedronGeometry, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { KIND, layer } from "./paper";
import { hash } from "./slime";

const GLOW = { kind: KIND.glow, noEdge: true };
const SCALES = { ink: 1 };
const CLOTH = { ink: 2 };
const mesh = (mat, geo) => {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
};
const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
const A = new Vector3();
const B = new Vector3();

// a tapered capsule from a to b (radius r1 at a, r2 at b)
function limb(L, a, b, r1, r2, color, opts = {}, seg = 10) {
  A.set(...a);
  B.set(...b);
  const len = A.distanceTo(B);
  if (len < 1e-4) return;
  const g = new CylinderGeometry(r2, r1, len, seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  L.add(g, color, opts, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  L.add(new SphereGeometry(r1, seg, 6), color, opts, a[0], a[1], a[2]);
  L.add(new SphereGeometry(r2, seg, 6), color, opts, b[0], b[1], b[2]);
}

// a coat skirt: a flared open cone whose hem ripples into folds
function skirt(rTop, rBot, h, gap, folds) {
  const g = new CylinderGeometry(rTop, rBot, h, 40, 6, true, gap / 2, Math.PI * 2 - gap);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const w = 0.5 - p.getY(i) / h; // 0 at the waist, 1 at the hem
    const ang = Math.atan2(x, z);
    const f = 1 + (0.1 * Math.sin(ang * folds) + 0.05 * Math.sin(ang * (folds * 2 + 1) + 1.3)) * w * w;
    p.setX(i, x * f);
    p.setZ(i, z * f * 0.82);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- Demon Lord Rimuru
export function human(mat) {
  const SKIN = "#f2e6de";
  const BLACK = "#0c0a16";
  const COAT = "#07060d";
  const LINING = "#142070";
  const GLOVE = "#06050b";
  const L = layer();
  // legs and boots
  for (const s of [-1, 1]) {
    limb(L, [s * 0.1, 0.14, 0.02], [s * 0.1, 0.62, 0.0], 0.06, 0.085, BLACK);
    limb(L, [s * 0.1, 0.62, 0.0], [s * 0.1, 1.08, 0.0], 0.085, 0.1, BLACK);
    L.add(new SphereGeometry(0.1, 10, 8), "#050409", {}, s * 0.1, 0.07, 0.07, 0, 0, 0, 0.9, 0.62, 1.7);
  }
  // the coat: torso, a flared skirt with folds, a blue lining in the front opening, a hem trim and a high collar
  L.add(skirt(0.26, 0.62, 1.1, 0.5, 9), COAT, CLOTH, 0, 0.7, 0);
  L.add(new CylinderGeometry(0.255, 0.575, 1.08, 24, 1, true, -0.4, 0.8), LINING, CLOTH, 0, 0.7, 0.012, 0, 0, 0, 1, 1, 0.8);
  L.add(new TorusGeometry(0.6, 0.016, 6, 40, Math.PI * 2 - 0.5).rotateX(Math.PI / 2).rotateY(0.25 + Math.PI), "#2438c0", {}, 0, 0.16, 0, 0, 0, 0, 1, 1, 0.82);
  L.add(new CylinderGeometry(0.27, 0.215, 0.72, 24), COAT, CLOTH, 0, 1.55, 0, 0, 0, 0, 1, 1, 0.74);
  L.add(new CylinderGeometry(0.218, 0.218, 0.05, 24), "#2438c0", {}, 0, 1.2, 0, 0, 0, 0, 1, 1, 0.76); // the sash line
  L.add(new CylinderGeometry(0.05, 0.05, 0.64, 6), LINING, CLOTH, 0, 1.52, 0.2, 0, 0, 0, 1, 1, 0.2);
  L.add(new SphereGeometry(0.135, 12, 8), COAT, CLOTH, -0.27, 1.8, 0, 0, 0, 0, 1.1, 0.8, 1);
  L.add(new SphereGeometry(0.135, 12, 8), COAT, CLOTH, 0.27, 1.8, 0, 0, 0, 0, 1.1, 0.8, 1);
  // the collar stands high behind and to the sides, lined in blue
  L.add(new CylinderGeometry(0.235, 0.165, 0.32, 20, 1, true, 0.75, Math.PI * 2 - 1.5), COAT, CLOTH, 0, 1.96, -0.01, 0, 0, 0, 1, 1, 0.85);
  L.add(new CylinderGeometry(0.215, 0.155, 0.3, 20, 1, true, 0.8, Math.PI * 2 - 1.6), LINING, CLOTH, 0, 1.96, -0.01, 0, 0, 0, 1, 1, 0.85);
  // the left arm hangs at the hip
  limb(L, [-0.28, 1.8, 0], [-0.35, 1.46, 0.03], 0.09, 0.07, COAT, CLOTH);
  limb(L, [-0.35, 1.46, 0.03], [-0.31, 1.14, 0.1], 0.07, 0.062, COAT, CLOTH);
  L.add(new CylinderGeometry(0.068, 0.068, 0.05, 10), "#2438c0", {}, -0.31, 1.13, 0.1);
  L.add(new SphereGeometry(0.063, 10, 8), GLOVE, {}, -0.3, 1.07, 0.11, 0, 0, 0, 0.9, 1.2, 0.95);
  // neck and head: a pale face with golden eyes
  limb(L, [0, 1.84, 0], [0, 1.95, 0.005], 0.05, 0.045, SKIN);
  L.add(new SphereGeometry(0.135, 16, 12), SKIN, {}, 0, 2.03, 0, 0, 0, 0, 0.88, 1.12, 0.96);
  L.add(new SphereGeometry(0.092, 12, 8), SKIN, {}, 0, 1.945, 0.035, 0, 0, 0, 0.92, 0.85, 0.95);
  for (const s of [-1, 1]) {
    L.add(new SphereGeometry(0.036, 10, 8), "#ffd23a", GLOW, s * 0.054, 2.04, 0.118, 0, 0, s * 0.18, 1.4, 0.8, 0.5);
    L.add(new SphereGeometry(0.013, 8, 6), "#2a1400", {}, s * 0.054, 2.04, 0.131);
    L.add(new CylinderGeometry(0.004, 0.004, 0.09, 4).rotateZ(Math.PI / 2), "#0a0814", {}, s * 0.056, 2.088, 0.118, 0, 0, s * -0.16);
    L.add(new SphereGeometry(0.028, 8, 6), "#e8d2c8", {}, s * 0.128, 2.02, -0.005, 0, 0, 0, 0.5, 1, 0.9);
  }
  L.add(new ConeGeometry(0.014, 0.045, 4).rotateX(Math.PI / 2), "#ecd6cc", {}, 0, 2.0, 0.13);
  L.add(new CylinderGeometry(0.004, 0.004, 0.05, 4).rotateZ(Math.PI / 2), "#7a4048", {}, 0, 1.953, 0.122, 0, 0, 0.1);
  const body = mesh(mat, L.build());

  // the right arm, hung from the shoulder so it can wind back and strike
  const AL = layer();
  limb(AL, [0, 0, 0], [0.06, -0.34, 0.03], 0.09, 0.072, COAT, CLOTH);
  limb(AL, [0.06, -0.34, 0.03], [0.04, -0.66, 0.1], 0.072, 0.064, COAT, CLOTH);
  AL.add(new CylinderGeometry(0.07, 0.07, 0.05, 10), "#2438c0", {}, 0.04, -0.67, 0.1);
  AL.add(new SphereGeometry(0.068, 10, 8), GLOVE, {}, 0.04, -0.74, 0.11, 0, 0, 0, 0.95, 1.15, 1);
  const arm = mesh(mat, AL.build());
  const armPivot = new Group();
  armPivot.position.set(0.28, 1.8, 0);
  armPivot.add(arm);

  // the hair: a black crown, eight long ribbons down the back, two side locks, three strands over the face
  const HL = layer();
  const HAIR = ["#0a0814", "#141a3e"];
  HL.add(new SphereGeometry(0.152, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), HAIR[0], {}, 0, 0.03, -0.012, 0, 0, 0, 0.93, 1.07, 1.0);
  const strip = (x, y, z, len, r, rz, rx, c) => HL.add(new ConeGeometry(r, len, 5).rotateX(Math.PI).translate(0, -len / 2, 0), c, {}, x, y, z, 0, rx, rz, 1, 1, 0.42);
  for (let i = 0; i < 8; i++) {
    const u = i - 3.5;
    strip(u * 0.034, 0.04 - Math.abs(u) * 0.006, -0.1 - (0.5 - Math.abs(u) / 8) * 0.04, 1.0 + 0.16 * hash(i, 5) - Math.abs(u) * 0.04, 0.055, u * 0.03, 0.1 + 0.05 * hash(i, 6), HAIR[i % 2]);
  }
  for (const s of [-1, 1]) strip(s * 0.145, 0.02, 0.03, 0.58, 0.036, s * -0.05, -0.05, HAIR[0]);
  strip(-0.07, 0.1, 0.12, 0.2, 0.022, 0.1, -0.1, HAIR[0]);
  strip(0.025, 0.115, 0.13, 0.16, 0.02, -0.05, -0.12, HAIR[1]);
  strip(0.085, 0.095, 0.12, 0.23, 0.023, -0.12, -0.1, HAIR[0]);
  const hair = mesh(mat, HL.build());
  const hairPivot = new Group();
  hairPivot.position.set(0, 2.03, 0);
  hairPivot.add(hair);

  const root = new Group();
  const lean = new Group();
  lean.add(body, armPivot, hairPivot);
  root.add(lean);
  root.visible = false;
  return {
    root,
    // w: the wind-up 0..1, p: the strike 0..1
    update(t, w, p) {
      armPivot.rotation.x = 0.95 * w * (1 - p) - 1.55 * p;
      armPivot.rotation.z = -0.1 * w * (1 - p);
      lean.rotation.x = -0.07 * w * (1 - p) + 0.16 * p;
      lean.rotation.y = 0.2 * w * (1 - p);
      hairPivot.rotation.x = 0.05 * Math.sin(t * 1.7) + 0.1 * p;
      hairPivot.rotation.z = 0.04 * Math.sin(t * 1.3 + 1);
    },
    dispose() {
      body.geometry.dispose();
      arm.geometry.dispose();
      hair.geometry.dispose();
    },
  };
}

// ---------------------------------------------------------------- the Predator vortex: a black-and-blue whirl
export function vortex() {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uK; varying vec2 vUv;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        float a = fract(vUv.x * 6.0 + vUv.y * 2.6 - uT * 1.4);
        float band = smoothstep(0.0, 0.2, a) * smoothstep(0.82, 0.5, a);
        float n = vn(vec2(vUv.x * 36.0 + uT * 2.0, vUv.y * 9.0 - uT * 3.0));
        float rim = smoothstep(0.55, 0.95, a) * smoothstep(0.98, 0.82, a);
        vec3 c = mix(vec3(0.005, 0.0, 0.03), vec3(0.08, 0.32, 1.0), rim * 0.9 + n * 0.25);
        c += vec3(0.4, 0.8, 1.0) * smoothstep(0.82, 0.95, n) * 0.6;
        float edge = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        gl_FragColor = vec4(c, clamp(band * (0.55 + 0.6 * n) + 0.15 * edge, 0.0, 1.0) * edge * uK);
      }`,
  });
  const g = new CylinderGeometry(1.7, 0.55, 3.6, 56, 1, true).translate(0, 1.8, 0);
  const o = mesh(m, g);
  o.visible = false;
  o.renderOrder = 5;
  return { mesh: o, mat: m, dispose: () => (g.dispose(), m.dispose()) };
}

// black particles: a pure function of the clock, they gather from the Demon Lord's height into the pup and are gone
export function dust(mat, t0, n = 120) {
  const L = layer();
  L.add(new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5), "#ffffff", GLOW);
  const geo = L.build();
  const im = new InstancedMesh(geo, mat, n);
  im.frustumCulled = false;
  const c = new Color();
  const pal = ["#05030b", "#05030b", "#0a0620", "#1c40d8", "#2a6aff"];
  const slots = [];
  for (let i = 0; i < n; i++) {
    const h = (j) => hash(i * 5 + j, 31);
    const a = h(1) * Math.PI * 2;
    const r = 0.1 + 0.55 * Math.sqrt(h(2));
    slots.push({ a, r, y: 0.1 + 2.1 * h(3), d: 0.9 * h(4), dur: 0.9 + 0.5 * h(5), s: 0.07 + 0.11 * h(6), spin: 3 + 6 * h(7) });
    im.setColorAt(i, c.set(pal[Math.floor(h(8) * pal.length)]));
  }
  im.instanceColor.needsUpdate = true;
  const D = new Object3D();
  return {
    mesh: im,
    update(t) {
      for (let i = 0; i < n; i++) {
        const s = slots[i];
        const k = (t - t0 - s.d) / s.dur;
        if (k < 0 || k > 1) {
          D.position.set(0, -50, 0);
          D.scale.setScalar(0.0001);
        } else {
          const e = k * k * (3 - 2 * k);
          const ang = s.a + e * 5;
          const rr = s.r * (1 - e);
          D.position.set(Math.cos(ang) * rr, s.y * (1 - e) + 0.5 * e + 0.2 * Math.sin(e * 3.14), Math.sin(ang) * rr);
          D.rotation.set(t * s.spin, t * s.spin * 0.6, 0);
          D.scale.setScalar(s.s * (k < 0.15 ? k / 0.15 : 1 - Math.max(0, k - 0.8) * 5));
        }
        D.updateMatrix();
        im.setMatrixAt(i, D.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      im.dispose();
    },
  };
}

// ---------------------------------------------------------------- Veldora, the Storm Dragon, coiled in his seal
const aura = (c, rim) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uC: { value: new Color(c) }, uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal + vec3(0.0,0.0001,0.0)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC; uniform float uT, uK; varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main() {
        vec3 v = normalize(cameraPosition - vW + vec3(0.0, 0.0001, 0.0));
        float f = pow(1.0 - abs(dot(normalize(vN + vec3(0.0, 0.0001, 0.0)), v)), ${rim});
        float s = 0.55 + 0.45 * sin(vP.y * 9.0 + vP.x * 5.0 - uT * 5.0) * sin(vP.z * 7.0 + uT * 3.0);
        gl_FragColor = vec4(uC * (f * 1.3 + 0.1) * s * uK, 1.0);
      }`,
  });

export function veldora(mat) {
  const L = layer();
  const BLACK = "#14102c";
  const NAVY = "#1c1850";
  const GOLD = "#ffc83a";
  // the body: a serpentine coil, thick in the middle, tapering to the tail and to the neck
  const N = 58;
  const H = [0.0, 0.6, 0.62]; // the head, facing the camera
  const base = (u) => {
    const a = u * Math.PI * 2 * 1.9 + 0.6;
    const rad = 0.82 * (1 - 0.42 * u);
    return [Math.cos(a) * rad, -0.88 + 1.36 * u + 0.07 * Math.sin(a * 2), Math.sin(a) * rad];
  };
  const pt = (u) => {
    const p = base(Math.min(u, 0.84));
    if (u <= 0.84) return p;
    const k = (u - 0.84) / 0.16;
    const e = k * k * (3 - 2 * k);
    return [p[0] + (H[0] - p[0]) * e, p[1] + (H[1] - 0.06 - p[1]) * e + 0.18 * Math.sin(k * 3.14), p[2] + (H[2] - 0.24 - p[2]) * e];
  };
  const rad = (u) => 0.05 + 0.17 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9)), 0.7);
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const [x, y, z] = pt(u);
    const r = rad(u);
    L.add(new SphereGeometry(r, 9, 7), i % 2 ? BLACK : NAVY, SCALES, x, y, z, 0, 0, 0, 1, 0.92, 1);
    L.add(new SphereGeometry(r * 0.62, 7, 5), GOLD, SCALES, x, y - r * 0.62, z, 0, 0, 0, 1.1, 0.5, 1.1); // the gold belly plates
    if (i % 2 === 0 && u < 0.9) L.add(new ConeGeometry(r * 0.42, r * 1.5, 4), GOLD, i % 4 === 0 ? GLOW : {}, x, y + r * 0.95, z); // dorsal spines
    if (i % 3 === 0 && u > 0.05 && u < 0.9) for (const s of [-1, 1]) L.add(new ConeGeometry(r * 0.2, r * 0.9, 4), "#e0a82a", {}, x + s * r * 0.9, y, z, 0, 0, s * -1.3);
  }
  // the tail tip: a gold blade
  const T = pt(0);
  L.add(new ConeGeometry(0.1, 0.4, 4), GOLD, GLOW, T[0] - 0.05, T[1] - 0.05, T[2] + 0.06, 0, 0, 0.6);
  // the head: a wedge skull, a long snout, an open jaw, horns, glowing eyes, frills
  L.add(new SphereGeometry(0.2, 12, 10), BLACK, SCALES, H[0], H[1], H[2], 0, 0, 0, 1.0, 0.82, 1.15);
  L.add(new ConeGeometry(0.2, 0.52, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), NAVY, SCALES, H[0], H[1] - 0.045, H[2] + 0.3, 0, 0, 0, 1, 0.6, 1);
  L.add(new ConeGeometry(0.15, 0.42, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), BLACK, SCALES, H[0], H[1] - 0.15, H[2] + 0.26, 0, 0.18, 0, 1, 0.42, 1);
  for (let k = 0; k < 4; k++)
    for (const s of [-1, 1]) {
      L.add(new ConeGeometry(0.018, 0.07, 4), "#f4efe2", {}, H[0] + s * (0.07 + k * 0.01), H[1] - 0.095, H[2] + 0.28 + k * 0.07, 0, 0, 0, 1, -1, 1);
      L.add(new ConeGeometry(0.016, 0.06, 4), "#f4efe2", {}, H[0] + s * (0.065 + k * 0.01), H[1] - 0.115, H[2] + 0.27 + k * 0.07);
    }
  for (const s of [-1, 1]) {
    const P0 = [H[0] + s * 0.12, H[1] + 0.15, H[2] - 0.05];
    const P1 = [P0[0] + s * 0.1, P0[1] + 0.22, P0[2] - 0.1];
    const P2 = [P1[0] + s * 0.12, P1[1] + 0.18, P1[2] - 0.2];
    const P3 = [P2[0] + s * 0.08, P2[1] + 0.06, P2[2] - 0.22];
    limb(L, P0, P1, 0.06, 0.042, GOLD, {}, 6);
    limb(L, P1, P2, 0.042, 0.026, "#ffdd66", {}, 6);
    limb(L, P2, P3, 0.026, 0.004, "#fff1a8", GLOW, 6);
    L.add(new SphereGeometry(0.038, 8, 6), "#fff1a8", GLOW, H[0] + s * 0.125, H[1] + 0.065, H[2] + 0.2, 0, 0, s * 0.45, 1.5, 0.45, 0.6); // the glowing eye slit
    limb(L, [H[0] + s * 0.06, H[1] + 0.115, H[2] + 0.22], [H[0] + s * 0.19, H[1] + 0.085, H[2] + 0.14], 0.025, 0.018, GOLD, {}, 5); // the brow ridge
    for (let f = 0; f < 3; f++) L.add(new ConeGeometry(0.035, 0.2 - f * 0.04, 4).rotateZ(-s * Math.PI / 2), GOLD, {}, H[0] + s * 0.19, H[1] - 0.01 - f * 0.055, H[2] - 0.02 - f * 0.04, 0, 0, 0, 1, 1, 1);
    limb(L, [H[0] + s * 0.08, H[1] - 0.1, H[2] + 0.4], [H[0] + s * 0.48, H[1] - 0.34, H[2] + 0.22], 0.012, 0.004, "#ffdd66", {}, 4); // whiskers
    L.add(new SphereGeometry(0.014, 6, 5), "#07050f", {}, H[0] + s * 0.03, H[1] - 0.02, H[2] + 0.55);
  }
  // the wings, folded against the back: a bony arm and layered black membranes edged in gold
  const S = pt(0.7);
  for (const s of [-1, 1]) {
    const W0 = [S[0] + s * 0.1, S[1] + 0.12, S[2] - 0.1];
    const W1 = [S[0] + s * 0.34, S[1] + 0.62, S[2] - 0.28];
    limb(L, W0, W1, 0.045, 0.03, GOLD, {}, 6);
    for (let f = 0; f < 3; f++) {
      const o = f * 0.1;
      L.add(new ConeGeometry(0.15, 0.85 - f * 0.1, 3), f % 2 ? NAVY : BLACK, SCALES, S[0] + s * (0.22 + o), S[1] + 0.34 - o * 0.4, S[2] - 0.2 - o, 0, -0.35, s * -0.38, 1, 1, 0.18);
      limb(L, [S[0] + s * (0.14 + o), S[1] + 0.06, S[2] - 0.12 - o], [S[0] + s * (0.3 + o), S[1] + 0.7 - f * 0.1, S[2] - 0.3 - o], 0.016, 0.006, GOLD, GLOW, 4);
    }
  }
  const g = new Group();
  const body = mesh(mat, L.build());
  g.add(body);
  // storm: a few forked bolts of blue-white that flicker around the coil
  const BL = layer();
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * Math.PI * 2 + 0.4;
    let p = [Math.cos(a) * 1.15, 0.9 - 0.2 * hash(b, 3), Math.sin(a) * 1.15];
    for (let k = 0; k < 5; k++) {
      const q = [p[0] + (hash(b * 9 + k, 4) - 0.5) * 0.35 - Math.cos(a) * 0.04, p[1] - 0.3 - 0.15 * hash(b * 9 + k, 5), p[2] + (hash(b * 9 + k, 6) - 0.5) * 0.35 - Math.sin(a) * 0.04];
      limb(BL, p, q, 0.016, 0.012, "#bfe8ff", GLOW, 4);
      p = q;
    }
  }
  const bolts = mesh(mat, BL.build());
  g.add(bolts);
  const shellMat = aura("#ffd25a", "2.2");
  const stormMat = aura("#3aa6ff", "1.4");
  const shell = mesh(shellMat, new SphereGeometry(1.8, 28, 20));
  const storm = mesh(stormMat, new SphereGeometry(1.34, 24, 16));
  shell.renderOrder = 4;
  storm.renderOrder = 3;
  g.add(shell, storm);
  g.visible = false;
  return {
    root: g,
    update(t, k) {
      shellMat.uniforms.uT.value = t;
      stormMat.uniforms.uT.value = t;
      shellMat.uniforms.uK.value = k;
      stormMat.uniforms.uK.value = k * (0.8 + 0.4 * Math.sin(t * 11));
      body.rotation.y = Math.sin(t * 0.7) * 0.18;
      bolts.rotation.y = t * 1.3;
      bolts.visible = Math.sin(t * 23) + Math.sin(t * 9.1) > -0.4;
    },
    dispose() {
      body.geometry.dispose();
      bolts.geometry.dispose();
      shell.geometry.dispose();
      storm.geometry.dispose();
      shellMat.dispose();
      stormMat.dispose();
    },
  };
}
