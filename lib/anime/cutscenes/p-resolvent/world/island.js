// The lab snow the cutscene opens and closes on: the pale island, the resolvent hut at the site's LAB_SCALE, its LabDecor dressing,
// the neighbours (neighbours.js), the snow ridges, the long shadows and the pup's contact shadow. Built once, no shader links in update.
import { BackSide, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACE_BY_ID } from "../../../../world/places.js";
import { fbm } from "../../../../world/terrain.js";
import { groundShadow } from "../../../pup.js";
import { HOUSE, LAB_SCALE } from "../clock.js";
import { hash, SHADOW } from "../live/toon.js";
import { tone } from "../tone.js";
import { annexOf, labDecor, lift, tint } from "./labdecor.js";
import { NEIGHBOUR_CASTERS, neighbourGeos, neighbourStone } from "./neighbours.js";

const lin = (hex) => new Color(hex);
const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);

const HALF_X = 2.2, HALF_Z = 1.3, WALL_H = 2.6, ROOF_H = 1.6, RIDGE_Y = WALL_H + ROOF_H, EAVE_OVER = 0.3, EAVE_Z = HALF_Z + EAVE_OVER, POST = 0.14;
const WIN_W = 2.6, WIN_H = 1.6, WIN_SILL = 0.5, WIN_X0 = -HALF_X + POST, WIN_X1 = WIN_X0 + WIN_W, WIN_CX = (WIN_X0 + WIN_X1) / 2;
const POST_L = -HALF_X + POST / 2, POST_M = WIN_X1 + POST / 2, POST_R = HALF_X - POST / 2;
const DOOR_X0 = WIN_X1 + POST, DOOR_X1 = HALF_X - POST, DOOR_W = DOOR_X1 - DOOR_X0, DOOR_CX = (DOOR_X0 + DOOR_X1) / 2, DOOR_H = 1.7;
const CORE_Y = 1.3, CORE_R = 0.55, CORE_HALF = HALF_X + EAVE_OVER, CORE_BANDS = 10;
const STEP_W = 2 * HALF_X - 0.8, ROOF_W = 2 * (HALF_X + EAVE_OVER), ROOF_LEN = Math.hypot(EAVE_Z, ROOF_H), ROOF_ANGLE = Math.atan2(ROOF_H, EAVE_Z);
const VIOLET = "#7a56e6", MOTE = "#8a5cff", CREAM = "#f1e8d8", SLAB = "#2a2a30", CHAR = "#43434c";
const S = (g) => g.scale(LAB_SCALE, LAB_SCALE, LAB_SCALE).translate(HOUSE[0], HOUSE[1], HOUSE[2]);

const VERT = /* glsl */ `
  attribute vec3 color;
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
    #ifdef USE_INSTANCING
      vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vec4 w = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
    #endif
    vW = w.xyz; vC = color;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
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
const DOME_VERT = "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";
const DOME_FRAG = "varying vec3 vW; uniform vec3 uSky, uHigh; void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }";
const STRIP_VERT = "attribute float aA; varying float vA; void main() { vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const STRIP_FRAG = "uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol * vA, vA); }";

const iso = () =>
  tone(
    new ShaderMaterial({
      uniforms: {
        uSun: { value: new Vector3(-14, 26, 12).normalize() }, uSky: { value: lin("#f0eaf4") }, uShade: { value: new Vector3(0.78, 0.74, 0.9) },
        uSunC: { value: new Vector3(0.62, 0.56, 0.44) }, uGloss: { value: 0 }, uUnlit: { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide,
    }),
  );

const soupGeo = (p, c) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(p, 3));
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
};

function snow() {
  const g = new PlaneGeometry(200, 200, 40, 40).rotateX(-Math.PI / 2).toNonIndexed();
  g.deleteAttribute("uv");
  const lit = lin("#f6eff5"), cool = lin("#d8d2d6"), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i);
    c.copy(lit).lerp(cool, 0.8 * s01(0.52, 0.8, fbm(((x * 0.8 + z * 0.6) / 24) * 1.25, ((z * 0.8 - x * 0.6) / 5) * 1.25)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const RIDGES = [
  { z: -120, w: 420, h0: 5, h1: 6, hex: "#ebe5f1", k: 1.1 },
  { z: -190, w: 560, h0: 9, h1: 9, hex: "#dfdbea", k: 2.3 },
  { z: -270, w: 700, h0: 12, h1: 12, hex: "#d3d4e6", k: 3.7 },
];
function ridges() {
  const P = [], C = [];
  for (const { z, w, h0, h1, hex, k } of RIDGES) {
    const N = 60, col = lin(hex);
    const x = (i) => -w / 2 + (w * i) / N;
    const top = (i) => h0 + h1 * (fbm(x(i) / 38, k) + 0.5 * Math.sin(x(i) / 11));
    for (let i = 0; i < N; i++) {
      for (const v of [[x(i), -2, z], [x(i), top(i), z], [x(i + 1), top(i + 1), z], [x(i), -2, z], [x(i + 1), top(i + 1), z], [x(i + 1), -2, z]]) {
        P.push(v[0], v[1], v[2]);
        C.push(col.r, col.g, col.b);
      }
    }
  }
  return soupGeo(P, C);
}

function gable(x) {
  const s = new Shape();
  s.moveTo(-HALF_Z, 0);
  s.lineTo(HALF_Z, 0);
  s.lineTo(0, ROOF_H);
  s.closePath();
  return tint(new ShapeGeometry(s).rotateY(Math.PI / 2).translate(x, WALL_H, 0), CREAM);
}

function house() {
  const B = (hex, w, h, d, x, y, z) => tint(new BoxGeometry(w, h, d).translate(x, y, z), hex);
  const slope = (sign) => tint(new BoxGeometry(ROOF_W, 0.12, ROOF_LEN).rotateX(sign * ROOF_ANGLE).translate(0, (RIDGE_Y + WALL_H) / 2, (sign * EAVE_Z) / 2), CREAM);
  const P = [
    B(VIOLET, POST, WALL_H, POST, POST_L, WALL_H / 2, HALF_Z),
    B(VIOLET, POST, WALL_H, POST, POST_M, WALL_H / 2, HALF_Z),
    B(VIOLET, POST, WALL_H, POST, POST_R, WALL_H / 2, HALF_Z),
    B(VIOLET, WIN_W, WALL_H - (WIN_SILL + WIN_H), POST, WIN_CX, (WIN_SILL + WIN_H + WALL_H) / 2, HALF_Z),
    B(VIOLET, WIN_W, WIN_SILL, POST, WIN_CX, WIN_SILL / 2, HALF_Z),
    B(CREAM, DOOR_W, WALL_H - DOOR_H, POST, DOOR_CX, (DOOR_H + WALL_H) / 2, HALF_Z),
    B(VIOLET, DOOR_W - 0.06, DOOR_H, 0.1, DOOR_CX, DOOR_H / 2, HALF_Z - 0.02),
    B(CREAM, POST, WALL_H, 2 * HALF_Z, -HALF_X, WALL_H / 2, 0),
    B(CREAM, POST, WALL_H, 2 * HALF_Z, HALF_X, WALL_H / 2, 0),
    B(CREAM, 2 * HALF_X, WALL_H, POST, 0, WALL_H / 2, -HALF_Z),
    B(SLAB, 2 * HALF_X + 0.2, 0.14, 2 * HALF_Z + 0.2, 0, -0.07, 0),
    B(VIOLET, ROOF_W, 0.18, 0.18, 0, WALL_H, EAVE_Z),
    B(VIOLET, ROOF_W, 0.18, 0.18, 0, WALL_H, -EAVE_Z),
    B(VIOLET, STEP_W, 0.6, 1.4, 0, RIDGE_Y + 0.3, 0),
    B(VIOLET, STEP_W - 0.8, 0.6, 0.8, 0, RIDGE_Y + 0.9, 0),
    B(VIOLET, ROOF_W + 0.1, 0.16, 0.2, 0, RIDGE_Y + 0.08, 0),
    B(SLAB, 0.3, 0.3, 1.0, -1.0, CORE_Y - CORE_R - 0.15, 0),
    B(SLAB, 0.3, 0.3, 1.0, 1.0, CORE_Y - CORE_R - 0.15, 0),
    tint(new TorusGeometry(CORE_R + 0.04, 0.07, 8, 16).rotateY(Math.PI / 2).translate(-HALF_X, CORE_Y, 0), CHAR),
    tint(new TorusGeometry(CORE_R + 0.04, 0.07, 8, 16).rotateY(Math.PI / 2).translate(HALF_X, CORE_Y, 0), CHAR),
    tint(new CylinderGeometry(0.07, 0.09, 4, 6).translate(-1.9, RIDGE_Y + 2, 0), SLAB),
    tint(new CylinderGeometry(0.07, 0.09, 4, 6).translate(1.9, RIDGE_Y + 2, 0), SLAB),
    tint(new SphereGeometry(0.16, 8, 6).translate(-1.9, RIDGE_Y + 4.1, 0), "#b79cff"),
    tint(new SphereGeometry(0.16, 8, 6).translate(1.9, RIDGE_Y + 4.1, 0), "#b79cff"),
    gable(-HALF_X),
    gable(HALF_X),
    slope(1),
    slope(-1),
  ];
  return S(mergeGeometries(P));
}

function core() {
  const g = new CylinderGeometry(CORE_R, CORE_R, 2 * CORE_HALF, 16, CORE_BANDS, true).rotateZ(Math.PI / 2).toNonIndexed();
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const ice = lin("#dbeaf5"), deep = lin("#8fc3e0"), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const ring = Math.round((p.getX(i) / (2 * CORE_HALF) + 0.5) * CORE_BANDS + (Math.atan2(p.getZ(i), p.getY(i)) / (2 * Math.PI)) * 0.6);
    const c = Math.abs(ring) % 2 === 0 ? ice : deep;
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

const FLAKES = Array.from({ length: 14 }, (_, i) => {
  const a = 6.283 * hash(i, 1), r = 2 + 7 * hash(i, 2);
  return { x: HOUSE[0] + Math.cos(a) * r, z: HOUSE[2] + Math.sin(a) * r, L: 0.9 + 0.7 * hash(i, 3), hex: i < 9 ? VIOLET : "#b9a0e8" };
});
FLAKES[13] = { ...FLAKES[13], x: 2.2, z: 0.2 };
function flakes() {
  return FLAKES.flatMap(({ x, z, L, hex }) =>
    Array.from({ length: 6 }, (_, k) => tint(new BoxGeometry(0.28, 0.025, L).translate(0, 0, L / 2).rotateY((k * Math.PI) / 3).translate(x, 0.03, z), hex)),
  );
}

const BOULDERS = [[6.5, -3.2, 0.9], [8.2, 1.0, 0.6], [-6.8, -4.0, 0.8], [-9.0, 1.6, 1.1], [12, -8, 1.4], [-14, -9, 1.2], [3.4, -14, 1.0], [-5, -16, 0.9], [16, 2.5, 0.7]];
const boulders = () => BOULDERS.map(([x, z, r]) => tint(new IcosahedronGeometry(1, 0).scale(r, 0.72 * r, r).translate(x, 0.52 * r, z), "#eceaf3"));

const LAB = annexOf(PLACE_BY_ID["p-resolvent"]);
const LAB_CASTERS = [
  [HOUSE[0] + LAB[0], HOUSE[2] + LAB[1], LAB[2], LAB[3], 0, 0.5],
  [3.6, HOUSE[2] + 5.9, 2.2, 2.4, 0, 0.45],
  [4.1, HOUSE[2] + 3.8, 1.9, 1.4, 0, 0.5],
  [-3.9, HOUSE[2] + 4.7, 1.6, 0.6, 0, 0.45],
  [-2.2, HOUSE[2] + 5.4, 0.2, 2.4, 0, 0.4],
  [2.2, HOUSE[2] + 5.4, 0.2, 2.4, 0, 0.4],
  [HOUSE[0], HOUSE[2], 2 * 2.2 * LAB_SCALE, 2.6 * LAB_SCALE, 0, 0.5],
];
const CASTERS = [...LAB_CASTERS, ...NEIGHBOUR_CASTERS];

function castShadows(casters) {
  const pos = [], al = [], L = 3.4;
  for (const [x, z, w, h, yaw = 0, a = 0.5] of casters) {
    const ax = (Math.cos(yaw) * w) / 2, az = (-Math.sin(yaw) * w) / 2, dx = SHADOW.x * h * L, dz = SHADOW.z * h * L;
    const q = [[x - ax, z - az, a], [x + ax, z + az, a], [x + ax + dx, z + az + dz, 0], [x - ax + dx, z - az + dz, 0]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i][0], 0.03, q[i][1]);
      al.push(q[i][2]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aA", new Float32BufferAttribute(al, 1));
  return g;
}

function sign() {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 144;
  const x = cv.getContext("2d");
  x.fillStyle = "#fbfaf7";
  x.beginPath();
  x.roundRect(4, 4, 504, 136, 68);
  x.fill();
  x.fillStyle = "#1c1b19";
  x.font = "700 84px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("resolvent", 256, 74);
  const m = new MeshBasicMaterial({ map: new CanvasTexture(cv), transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(1.5 * LAB_SCALE, 0.42 * LAB_SCALE), m);
  mesh.rotation.x = -Math.PI / 4;
  mesh.position.set(HOUSE[0], 3.45 * LAB_SCALE, HOUSE[2] + 0.85 * LAB_SCALE);
  return mesh;
}

const SPARKLE = Array.from({ length: 60 }, (_, i) => ({ x: (4 + 26 * hash(i, 6)) * Math.cos(6.283 * hash(i, 7)), z: (4 + 26 * hash(i, 6)) * Math.sin(6.283 * hash(i, 7)) }));
const dummy = new Object3D();
const put = (mesh, i, x, y, z, s = 1) => {
  dummy.position.set(x, y, z);
  dummy.scale.setScalar(s);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
};

export function buildIsland() {
  const group = new Group(), land = new Group(), made = [], solid = iso();
  const stripMat = tone(new ShaderMaterial({ uniforms: { uCol: { value: lin("#cfc8e0") } }, vertexShader: STRIP_VERT, fragmentShader: STRIP_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true }));
  const domeMat = tone(new ShaderMaterial({ uniforms: { uSky: { value: lin("#f0eaf4") }, uHigh: { value: lin("#d1e1e5") } }, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: BackSide, depthWrite: false }));
  const solidMesh = (geo, m = solid) => {
    const x = new Mesh(geo, m);
    x.frustumCulled = false;
    made.push(geo);
    return x;
  };
  const coreGeo = core(), core3 = solidMesh(coreGeo);
  core3.position.set(HOUSE[0], CORE_Y * LAB_SCALE, HOUSE[2]);
  core3.scale.setScalar(LAB_SCALE);
  const motes = new InstancedMesh(tint(new SphereGeometry(0.07, 6, 4), MOTE), solid, 16);
  const orbs = new InstancedMesh(tint(new SphereGeometry(0.18, 8, 6), MOTE), solid, 2);
  const sparkle = new InstancedMesh(tint(new PlaneGeometry(0.12, 0.12).rotateX(-Math.PI / 2), "#fbfaf7"), solid, SPARKLE.length);
  for (const m of [motes, orbs, sparkle]) {
    m.frustumCulled = false;
    made.push(m.geometry);
  }
  const shadowGeo = castShadows(CASTERS), shadow = new Mesh(shadowGeo, stripMat);
  shadow.frustumCulled = false;
  made.push(shadowGeo);
  const dome = new Mesh(new SphereGeometry(900, 24, 12), domeMat);
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  made.push(dome.geometry);
  const pupShadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  pupShadow.position.set(0, 0.03, 0.05);
  const sg = sign();
  const lab = labDecor(PLACE_BY_ID["p-resolvent"]);
  const labGeos = [lab.lit, lab.metal, lift(lab.glow, 1.12)].map((g) => g.translate(HOUSE[0], HOUSE[1], HOUSE[2]));
  const solidGeo = mergeGeometries([snow(), house(), ...labGeos, ...boulders(), ...flakes(), ridges(), ...neighbourGeos()]);
  const stone = neighbourStone();
  const stoneGeo = mergeGeometries([stone.stone, stone.inlay], false);
  land.add(solidMesh(solidGeo), solidMesh(stoneGeo), core3, shadow, motes, orbs, sparkle);
  if (sg) land.add(sg);
  for (let i = 0; i < 16; i++) put(motes, i, HOUSE[0], CORE_Y, HOUSE[2]);
  for (let i = 0; i < SPARKLE.length; i++) put(sparkle, i, SPARKLE[i].x, 0.045, SPARKLE[i].z);
  group.add(dome, pupShadow, land);

  const page = (on, pupVisible = true) => {
    land.visible = !on;
    pupShadow.visible = !on && pupVisible;
  };
  const update = (t) => {
    core3.rotation.x = t * 0.3;
    for (let i = 0; i < 16; i++) {
      const ph = frac((t - (i * 3) / 16) / 3), a = (i / 16) * 2 * Math.PI;
      put(motes, i, HOUSE[0] + 3.5 * Math.cos(a), 0.2 + 3.5 * ph, HOUSE[2] + 3.5 * Math.sin(a), 0.2 + 0.8 * Math.sin(Math.PI * ph));
    }
    motes.instanceMatrix.needsUpdate = true;
    const th = (t / 4) * 2 * Math.PI, flash = Math.max(0, 1 - (((t % 4) + 4) % 4) / 0.25), s = (1 + 0.8 * flash) * LAB_SCALE;
    const den = 1 + Math.sin(th) ** 2, ro = 1.4 * LAB_SCALE, yo = 3.3 * LAB_SCALE;
    put(orbs, 0, HOUSE[0] + ro * Math.cos(th), yo, HOUSE[2] + ro * Math.sin(th), s);
    put(orbs, 1, HOUSE[0] + (ro * Math.cos(th)) / den, yo, HOUSE[2] + (ro * Math.sin(th) * Math.cos(th)) / den, s);
    orbs.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < SPARKLE.length; i++) put(sparkle, i, SPARKLE[i].x, 0.045, SPARKLE[i].z, Math.floor(t * 12 + i) % 3 === 0 ? 1 : 0.0001);
    sparkle.instanceMatrix.needsUpdate = true;
  };
  const dispose = () => {
    for (const g of made) g.dispose();
    solid.dispose();
    stripMat.dispose();
    domeMat.dispose();
    pupShadow.geometry.dispose();
    pupShadow.material.dispose();
    if (sg) {
      sg.geometry.dispose();
      sg.material.map?.dispose();
      sg.material.dispose();
    }
  };
  return { group, page, update, dispose };
}
