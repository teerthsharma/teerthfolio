// The island the cutscene opens on and returns to: pale snow, the pink sawmill 6.6 m behind the pup, its log yard, bench, crates and far town.
// Rig frame: the pup at the origin, +z toward the lens. The sawmill's layout is Cut.jsx's, read from cut-cores.js (read-only).
import { BackSide, BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { BLADE_RADIUS, BLADE_THICK, BLADE_X_START, BLADE_Y, BLADE_Z, LANE_Z0, LANE_Z1, LOG_Y, LOGS } from "../../../../../components/world/monuments/parts/cut-cores.js";
import { tone } from "../tone.js";

const MILL_Z = -6.6, MILL_SCALE = 0.83, LOG_R = 0.14;
const RAIL_X = -0.15, RAIL_LEN = 4.6, RAIL_Z0 = LANE_Z0 - 0.2, RAIL_Z1 = LANE_Z1 + 0.2;
const SHED_Z0 = -1.8, SHED_Z1 = 0.2, SHED_ZC = -0.8, EAVE_Y = 2.2, RIDGE_Y = 3.6, WALL_T = 0.25, GABLE_X = 2.4;
// one sun term plus a cool shade term; the sun term is set so the lit snow prints near its own colour after tone()
const LIGHT = { uSun: { value: new Vector3(-14, 26, 12).normalize() }, uShade: { value: new Vector3(0.72, 0.74, 0.9) }, uSunC: { value: new Vector3(0.34, 0.32, 0.14) }, uSky: { value: new Color("#d5e4eb") } };
const VERT = /* glsl */ `varying vec3 vW; varying vec3 vN;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIT_F = /* glsl */ `uniform vec3 uCol, uShade, uSunC, uSun, uSky; uniform float uOp; varying vec3 vW; varying vec3 vN;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 c = uCol * (uShade + uSunC * max(dot(n, uSun), 0.0));
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)) * 0.55);
    gl_FragColor = vec4(c, 0.99 * uOp);
  }`;
const DOME_V = /* glsl */ `varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const DOME_F = /* glsl */ `uniform vec3 uHor, uHigh; varying vec3 vW;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uHor, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;

export function buildIsland() {
  const made = [], cache = new Map(), group = new Group(), land = new Group();
  group.add(land);
  let covered = false, revealed = false;
  const keep = (x) => (made.push(x), x);
  const lit = (hex, op = 1) => {
    const k = `${hex}|${op}`;
    if (!cache.has(k)) cache.set(k, keep(tone(new ShaderMaterial({ uniforms: { ...LIGHT, uCol: { value: new Color(hex) }, uOp: { value: op } }, vertexShader: VERT, fragmentShader: LIT_F, side: DoubleSide, transparent: op < 1, depthWrite: op >= 1 }))));
    return cache.get(k);
  };
  const put = (parent, g, hex, [x = 0, y = 0, z = 0] = [], op = 1) => {
    const m = new Mesh(keep(g), lit(hex, op));
    m.position.set(x, y, z);
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new BoxGeometry(w, h, d);
  const slab = (w, t, a, b) => {
    const dy = b[0] - a[0], dz = b[1] - a[1];
    return box(w, t, Math.hypot(dy, dz)).rotateX(Math.atan2(-dy, dz)).translate(0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  };

  put(land, new PlaneGeometry(220, 220).rotateX(-Math.PI / 2), "#f8eef5");

  const mill = new Group();
  mill.position.set(0, 0, MILL_Z);
  mill.scale.setScalar(MILL_SCALE);
  land.add(mill);
  const PINK = "#e8b8dd", MAG = "#f068e6", ROD = "#2a2a33";
  put(mill, box(5.0, EAVE_Y, WALL_T), PINK, [0, EAVE_Y / 2, SHED_Z0 + WALL_T / 2]);
  for (const x of [-GABLE_X, GABLE_X]) put(mill, box(WALL_T, EAVE_Y, SHED_Z1 - SHED_Z0), PINK, [x, EAVE_Y / 2, SHED_ZC]);
  for (const x of [-1.6, 1.6]) put(mill, box(1.8, EAVE_Y, WALL_T), PINK, [x, EAVE_Y / 2, SHED_Z1 - WALL_T / 2]);
  for (const z of [SHED_Z0, SHED_Z1]) put(mill, slab(5.4, 0.22, [RIDGE_Y, SHED_ZC], [EAVE_Y, z]), MAG);
  for (const z of [RAIL_Z0, RAIL_Z1]) put(mill, box(RAIL_LEN, 0.18, 0.18), ROD, [RAIL_X, 0.09, z]);
  const LOG_HEX = { piece: "#0b93ab", loop: "#a66cf0", noise: "#43434c" };
  const logG = new CylinderGeometry(LOG_R, LOG_R, 1, 8).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
  for (const log of LOGS) put(mill, logG, LOG_HEX[log.kind], [log.x0, LOG_Y, log.z]).scale.x = log.length;
  for (const x of [-2.6, 2.6]) {
    put(mill, new CylinderGeometry(0.06, 0.06, 3.2, 6), ROD, [x, 1.6, -0.2]);
    put(mill, new SphereGeometry(0.24, 10, 8), "#f7b955", [x, 3.3, -0.2]);
  }
  const blade = new Group(), spin = new Group();
  blade.position.set(BLADE_X_START, BLADE_Y, BLADE_Z);
  blade.userData.layer = 1;
  blade.add(spin);
  mill.add(blade);
  put(spin, new CylinderGeometry(BLADE_RADIUS, BLADE_RADIUS, BLADE_THICK, 28).rotateX(Math.PI / 2), "#e05ae6", [], 0.6);
  put(spin, box(BLADE_RADIUS * 1.9, 0.07, BLADE_THICK + 0.04), "#b8369f");

  const bench = new Group();
  bench.position.set(-3.4, 0, -0.6);
  land.add(bench);
  const WOOD = "#c49c83";
  put(bench, box(1.6, 0.12, 0.45), WOOD, [0, 0.48, 0]);
  put(bench, box(1.6, 0.5, 0.1), WOOD, [0, 0.8, -0.2]);
  for (const x of [-0.7, 0.7]) put(bench, box(0.1, 0.46, 0.45), WOOD, [x, 0.23, 0]);

  const stall = new Group();
  stall.position.set(4.2, 0, -1.2);
  land.add(stall);
  const CRATE = "#af8f82";
  for (const x of [-0.5, 0.5]) put(stall, box(0.8, 0.8, 0.8), CRATE, [x, 0.4, 0]);
  for (const x of [-1.1, 1.1]) put(stall, box(0.16, 2.2, 0.16), "#a8836f", [x, 1.1, -0.1]);
  put(stall, box(2.6, 0.9, 0.12), "#e05ae6", [0, 2.3, -0.1]);
  put(stall, box(2.6, 0.14, 0.14), "#f0b43a", [0, 1.9, 0]);

  const buoy = new Group();
  buoy.position.set(-4.5, 0, 3.4);
  land.add(buoy);
  const half = (turn) => new TorusGeometry(0.3, 0.09, 8, 16, Math.PI).rotateZ(turn).rotateX(-Math.PI / 2);
  put(buoy, half(0), "#e8473f", [0, 0.09, 0]);
  put(buoy, half(Math.PI), "#f6fbff", [0, 0.09, 0]);

  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const PASTEL = ["#f2d6e8", "#d9e4f2", "#f6e3d0"];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 60 + 30 * hash(i, 1), h = 4 + 6 * hash(i, 4);
    put(land, box(8 + 6 * hash(i, 2), h, 8 + 6 * hash(i, 3)), PASTEL[i % 3], [Math.sin(a) * r, h / 2, Math.cos(a) * r]);
  }
  const tower = new Group();
  tower.position.set(-22, 0, -60);
  land.add(tower);
  put(tower, box(5, 11, 5), "#dfe6f2", [0, 5.5, 0]);
  put(tower, new ConeGeometry(4.2, 3, 4).rotateY(Math.PI / 4), "#4fb3c8", [0, 12.5, 0]);
  put(land, new TorusGeometry(5, 0.7, 12, 40), "#5aa9e6", [-30, 5, -42]);
  for (const [x, y, z] of [[-60, 70, -150], [40, 85, -210], [0, 60, -110]]) put(land, new SphereGeometry(1, 14, 8), "#f6fbff", [x, y, z]).scale.set(28, 4, 10);

  const dome = new Mesh(keep(new SphereGeometry(600, 24, 12)), keep(tone(new ShaderMaterial({ uniforms: { uHor: { value: new Color("#d5e4eb") }, uHigh: { value: new Color("#bcd6f2") } }, vertexShader: DOME_V, fragmentShader: DOME_F, side: BackSide, depthWrite: false }))));
  dome.renderOrder = -9;
  dome.frustumCulled = false;
  group.add(dome);

  const refresh = () => { land.visible = !covered || revealed; };
  return {
    group,
    page(on) { covered = on; refresh(); },
    show(on) { revealed = on; refresh(); },
    update(t) { spin.rotation.z = t * 6; },
    dispose() { for (const x of made) x.dispose(); },
  };
}
