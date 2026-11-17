// The Epsilon-Hollow pavilion at rest (460bafd components/world/monuments/Collapse.jsx): a tripod plaza, a lift shaft with its
// kiosk, and the hollow geodesic globe with its Epsilon core. Static geometry, merged by colour class so it bakes into the plate.
// Origin at the pavilion centre; the globe's ambient motion (spin, twinkle, payload, lift) is left out on purpose.
import { BackSide, BoxGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, FrontSide, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCollapse } from "../../../../../components/world/monuments/parts/collapse-sphere.js";
import { raw } from "./statue.js";

const CANDY = ["#ff5d8f", "#ffb238", "#33e6b3", "#5b8dff"];
const CHARCOAL = "#43434c", WARM_WHITE = "#f3ede4", LAMP = "#ffc46b", EPS = "#8aa8ff", BACK = "#141a33";
const OUTER_R = 2.1, INNER_R = 0.72, CORE_Y = 3.7, STRUT_R = 0.065, INNER_STRUT_R = 0.075, BEAD_R = 0.115;
const PLATFORM_R = 2.5, PLATFORM_H = 0.2, LEG_COUNT = 3, LEG_TOP_R = 0.11, LEG_BOT_R = 0.17, LEG_COLLAR_H = 0.3;
const LEG_TOP = { r: OUTER_R * 0.68, y: CORE_Y - OUTER_R * 0.72 }, LEG_BOT = { r: PLATFORM_R * 0.76, y: PLATFORM_H };
const SKIRT_H = 0.5, SKIRT_TOP_R = PLATFORM_R * 1.06, SKIRT_BOT_R = PLATFORM_R * 1.4;
const RIM_LAMP_N = 10, RIM_LAMP_H = 0.42;
const LIFT_TUBE_R = 0.34, LIFT_TUBE_H = CORE_Y - OUTER_R - PLATFORM_H, LIFT_CAR_R = 0.25, LIFT_CAR_Y = PLATFORM_H + 0.18;
const KIOSK_W = 1.2, KIOSK_H = 1.5, KIOSK_D = 0.9, KIOSK_Z = LIFT_TUBE_R + KIOSK_D / 2 + 0.15;
const DOOR_W = 0.7, DOOR_H = 1.4, DOOR_Z = KIOSK_Z + KIOSK_D / 2 + 0.01;
const ROOF_W = KIOSK_W + 0.18, ROOF_D = KIOSK_D + 0.18, ROOF_H = 0.12;
const PAYLOAD_OFFSETS = [[0, 0, 0], [0.28, 0.1, 0.06], [-0.22, 0.18, -0.12], [0.12, -0.24, 0.2], [-0.18, -0.12, -0.22]];
const UP = new Vector3(0, 1, 0), SUN = new Vector3(-14, 26, 12).normalize(), COOL = raw("#d9dfe8");

const litVC = () => new ShaderMaterial({
  uniforms: { uSun: { value: SUN }, uCool: { value: COOL } },
  vertexShader: `attribute vec3 color; varying vec3 vN; varying vec3 vC; void main() { vN = normalize(mat3(modelMatrix) * normal); vC = color; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uCool; varying vec3 vN; varying vec3 vC; void main() { float l = max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(mix(uCool, vC, smoothstep(0.0, 0.5, l)), 0.99); }`,
});

const T = (p, rx = 0, ry = 0) => new Matrix4().makeRotationFromEuler(new Euler(rx, ry, 0)).setPosition(...p);
const seg = (a, b, rs = 1) => {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length() || 1e-3;
  const q = new Quaternion().setFromUnitVectors(UP, d.normalize());
  return new Matrix4().compose(new Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new Vector3(rs, len, rs));
};
const pos = (angle, r, y) => [Math.sin(angle) * r, y, Math.cos(angle) * r];

export function buildPlaza(accent) {
  const made = [];
  const keep = (x) => (made.push(x), x);
  const bucket = { lit: [], glow: [] };
  const put = (kind, geo, col, m) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(m);
    const c = typeof col === "string" ? (kind === "lit" ? raw(col) : new Color(col)) : new Color().setRGB(col[0], col[1], col[2]);
    const n = g.attributes.position.count, rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new Float32BufferAttribute(rgb, 3));
    bucket[kind].push(g);
  };
  const SCENE = buildCollapse({ outerDetail: 1, innerDetail: 1, outerR: OUTER_R, innerR: INNER_R, accentHex: CANDY });
  const GL = new Matrix4().makeTranslation(0, CORE_Y, 0);
  const globe = (m) => new Matrix4().multiplyMatrices(GL, m);

  put("lit", new CylinderGeometry(PLATFORM_R, PLATFORM_R * 1.06, PLATFORM_H, 28), CHARCOAL, T([0, PLATFORM_H / 2, 0]));
  put("lit", new CylinderGeometry(SKIRT_TOP_R, SKIRT_BOT_R, SKIRT_H, 28), CHARCOAL, T([0, -SKIRT_H / 2, 0]));
  put("glow", new RingGeometry(PLATFORM_R - 0.3, PLATFORM_R, 40), accent, T([0, PLATFORM_H + 0.01, 0], -Math.PI / 2));
  for (let i = 0; i < LEG_COUNT; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / LEG_COUNT;
    const b = pos(a, LEG_BOT.r, LEG_BOT.y), t = pos(a, LEG_TOP.r, LEG_TOP.y);
    put("lit", new CylinderGeometry(LEG_TOP_R, LEG_BOT_R, 1, 8), CHARCOAL, seg(b, t));
    put("glow", new CylinderGeometry(LEG_TOP_R * 1.4, LEG_TOP_R * 1.4, LEG_COLLAR_H, 8), accent, T(t));
  }
  for (let i = 0; i < RIM_LAMP_N; i++) {
    const a = (i / RIM_LAMP_N) * Math.PI * 2;
    put("glow", new CylinderGeometry(0.11, 0.13, RIM_LAMP_H, 6), accent, T([Math.sin(a) * PLATFORM_R * 0.94, PLATFORM_H + RIM_LAMP_H / 2, Math.cos(a) * PLATFORM_R * 0.94], 0, a));
  }
  put("lit", new BoxGeometry(KIOSK_W, KIOSK_H, KIOSK_D), WARM_WHITE, T([0, PLATFORM_H + KIOSK_H / 2, KIOSK_Z]));
  put("glow", new BoxGeometry(ROOF_W, ROOF_H, ROOF_D), accent, T([0, PLATFORM_H + KIOSK_H + ROOF_H / 2, KIOSK_Z]));
  put("glow", new PlaneGeometry(DOOR_W, DOOR_H), accent, T([0, PLATFORM_H + DOOR_H / 2, DOOR_Z]));
  put("glow", new IcosahedronGeometry(LIFT_CAR_R, 0), LAMP, T([0, LIFT_CAR_Y, 0]));

  const outerP = SCENE.outer.positions, outerC = SCENE.outer.colors;
  for (let b = 0; b < outerP.length; b += 6) {
    const a = [outerP[b], outerP[b + 1], outerP[b + 2]], e = [outerP[b + 3], outerP[b + 4], outerP[b + 5]];
    put("lit", new CylinderGeometry(1, 1, 1, 6), [outerC[b], outerC[b + 1], outerC[b + 2]], globe(seg(a, e, STRUT_R)));
  }
  const innerP = SCENE.inner.positions;
  for (let b = 0; b < innerP.length; b += 6) {
    const a = [innerP[b], innerP[b + 1], innerP[b + 2]], e = [innerP[b + 3], innerP[b + 4], innerP[b + 5]];
    put("glow", new CylinderGeometry(1, 1, 1, 6), EPS, globe(seg(a, e, INNER_STRUT_R)));
  }
  const pp = SCENE.points.positions, pc = SCENE.points.colors;
  for (let i = 0; i < SCENE.points.count; i++) {
    put("lit", new IcosahedronGeometry(BEAD_R, 0), [pc[i * 3], pc[i * 3 + 1], pc[i * 3 + 2]], globe(T([pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2]])));
  }
  const S = SCENE.travel.start;
  for (const o of PAYLOAD_OFFSETS) put("glow", new IcosahedronGeometry(0.26, 0), accent, globe(T([S[0] + o[0], S[1] + o[1], S[2] + o[2]])));
  put("glow", new IcosahedronGeometry(0.26, 1), LAMP, globe(T([0, 0, 0])));
  const RING = [];
  [[OUTER_R * 1.1, 0.08, 0], [OUTER_R * 1.2, -0.07, 1]].forEach(([r, y, off]) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      RING.push([Math.cos(a) * r, y, Math.sin(a) * r, CANDY[(i + off) % CANDY.length]]);
    }
  });
  for (const [x, y, z, col] of RING) put("glow", new IcosahedronGeometry(0.13, 0), col, globe(T([x, y, z])));

  const group = new Group();
  const litGeo = keep(mergeGeometries(bucket.lit, false)), glowGeo = keep(mergeGeometries(bucket.glow, false));
  group.add(new Mesh(litGeo, keep(litVC())), new Mesh(glowGeo, keep(new MeshBasicMaterial({ vertexColors: true, toneMapped: false }))));

  const clear = (geo, m, opacity, side = FrontSide) => {
    const o = new Mesh(keep(geo), keep(new MeshBasicMaterial({ color: m.color, transparent: true, opacity, depthWrite: false, side, toneMapped: false })));
    return o;
  };
  const tube = clear(new CylinderGeometry(LIFT_TUBE_R, LIFT_TUBE_R, LIFT_TUBE_H, 12), { color: accent }, 0.55);
  tube.position.set(0, PLATFORM_H + LIFT_TUBE_H / 2, 0);
  group.add(tube);
  const globeGroup = new Group();
  globeGroup.position.set(0, CORE_Y, 0);
  group.add(globeGroup);
  globeGroup.add(clear(new IcosahedronGeometry(OUTER_R * 0.97, 2), { color: BACK }, 0.5, BackSide));
  globeGroup.add(clear(new IcosahedronGeometry(INNER_R * 1.1, 1), { color: accent }, 0.4));
  const threadDir = new Vector3(SCENE.travel.end[0] - S[0], SCENE.travel.end[1] - S[1], SCENE.travel.end[2] - S[2]);
  const threadLen = threadDir.length();
  const thread = clear(new CylinderGeometry(0.07, 0.07, threadLen, 6), { color: accent }, 0.65);
  thread.position.set((S[0] + SCENE.travel.end[0]) / 2, (S[1] + SCENE.travel.end[1]) / 2, (S[2] + SCENE.travel.end[2]) / 2);
  thread.quaternion.setFromUnitVectors(UP, threadDir.normalize());
  globeGroup.add(thread);

  return {
    group,
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
