// The island the cutscene opens on and returns to: the site's ground (lib/world/terrain.js, snow), the Faraday monument
// at its place centre at two-times scale (glass-field.js numbers), the plaza dressing and the far skyline.
// The group is the rig frame: the dock point is the origin and the ground there is y 0.
import { BackSide, BoxGeometry, FrontSide, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, PlaneGeometry, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { dockPoint, PLACE_BY_ID } from "../../../../../lib/world/places.js";
import { fbm, groundAt } from "../../../../../lib/world/terrain.js";
import { BASE_D, BASE_H, BASE_W, BUSHING_H, DECK_D, DECK_T, DECK_W, DECK_Y, FIN_COUNT, FIN_H, FIN_T, FIN_W, GLASS_TINT, LEG_INSET, LEG_SIZE, LEG_Y, MINT, WIRE_X } from "../../../../../components/world/monuments/parts/glass-field.js";
import { groundShadow } from "../../../pup.js";

const X0 = -46, X1 = 46, Z0 = -60, Z1 = 40;
const S = 2;
const srgb = (hex) => new Vector3(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const K = { snow: srgb("#fcf0e9"), cool: srgb("#f6ebe8"), paper: srgb("#ece5d2"), skyLow: srgb("#cfe3f3"), skyHigh: srgb("#a4d0ee") };
const SUN = new Vector3(-14, 26, 12).normalize();

const VERT = /* glsl */ `
  uniform vec3 uC;
  varying vec3 vN;
  varying vec3 vC;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    #ifdef USE_COLOR
      vC = color;
    #else
      vC = uC;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const LIT = /* glsl */ `
  uniform vec3 uSun, uShade, uSunC;
  varying vec3 vN;
  varying vec3 vC;
  void main() {
    #ifdef FLAT
      gl_FragColor = vec4(vC, 0.99);
    #else
      vec3 n = normalize(vN);
      if (!gl_FrontFacing) n = -n;
      gl_FragColor = vec4(vC * (uShade + uSunC * max(dot(n, uSun), 0.0)), 0.99);
    #endif
  }`;
const SKY = /* glsl */ `
  varying vec3 vW;
  uniform vec3 uSky, uHigh;
  void main() {
    float h = normalize(vW - cameraPosition).y;
    gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99);
  }`;
const SKY_V = "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";

export function buildIsland() {
  const made = [];
  const keep = (x) => (made.push(x), x);
  const paint = (hex, { flat = false, side = FrontSide, vertexColors = false, shade = [0.7, 0.74, 0.9], sunc = [0.4, 0.36, 0.3] } = {}) =>
    keep(new ShaderMaterial({
      uniforms: { uC: { value: srgb(hex) }, uSun: { value: SUN }, uShade: { value: new Vector3(...shade) }, uSunC: { value: new Vector3(...sunc) } },
      defines: flat ? { FLAT: 1 } : {},
      vertexColors,
      vertexShader: VERT,
      fragmentShader: LIT,
      side,
    }));
  const solid = (g, m, parent) => {
    const x = new Mesh(keep(g), m);
    x.frustumCulled = false;
    parent.add(x);
    return x;
  };
  const box = (w, h, d, x, y, z, m, parent) => solid(new BoxGeometry(w, h, d).translate(x, y, z), m, parent);

  const place = PLACE_BY_ID["p-faraday"];
  const dock = dockPoint(place);
  const h0 = groundAt(dock.x, dock.z).h;
  const group = new Group();
  const land = new Group();
  land.position.set(-dock.x, -h0, -dock.z);
  group.add(land);
  const at = (x, z) => [dock.x + x, dock.z + z];
  const ground = (x, z) => groundAt(x, z).h;

  const terrainGeo = keep(terrain());
  const terrainMat = paint("#ffffff", { side: DoubleSide, vertexColors: true, shade: [0.7, 0.74, 0.9] });
  solid(terrainGeo, terrainMat, land);

  const tank = paint("#c9d6dc");
  const glass = paint(GLASS_TINT);
  const mint = paint(MINT);
  const orange = paint("#e8631c");
  const mon = new Group();
  mon.position.set(place.x, ground(place.x, place.z), place.z);
  land.add(mon);
  box(BASE_W * S, BASE_H * S, BASE_D * S, 0, (BASE_H * S) / 2, 0, tank, mon);
  for (let k = 0; k < FIN_COUNT; k++) {
    const x = (-0.5 + (k + 0.5) / FIN_COUNT) * BASE_W * S;
    for (const sz of [-1, 1]) box(FIN_W * S, FIN_H * S, FIN_T * S, x, (FIN_H * S) / 2, sz * (BASE_D * S + FIN_T * S) / 2, tank, mon);
  }
  box(DECK_W * S, DECK_T * S, DECK_D * S, 0, DECK_Y * S - (DECK_T * S) / 2, 0, glass, mon);
  for (const sz of [-1, 1]) box(DECK_W * S, DECK_T * S * 1.2, 0.08 * S, 0, DECK_Y * S - (DECK_T * S) / 2, (sz * DECK_D * S) / 2, mint, mon);
  for (const sx of [-1, 1]) box(0.08 * S, DECK_T * S * 1.2, DECK_D * S, (sx * DECK_W * S) / 2, DECK_Y * S - (DECK_T * S) / 2, 0, mint, mon);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(LEG_SIZE * S, LEG_Y * S, LEG_SIZE * S, (sx * (DECK_W / 2 - LEG_INSET) * S), (LEG_Y * S) / 2, sz * (DECK_D / 2 - LEG_INSET) * S, tank, mon);
  for (const sx of [-1, 1]) {
    const x = sx * WIRE_X * S;
    solid(new CylinderGeometry(0.09 * S, 0.12 * S, BUSHING_H * S, 10).translate(x, DECK_Y * S + (BUSHING_H * S) / 2, 0), tank, mon);
    for (let k = 1; k <= 5; k++) solid(new CylinderGeometry(0.28 * S, 0.28 * S, 0.05 * S, 12).translate(x, DECK_Y * S + (k * BUSHING_H * S) / 6, 0), mint, mon);
  }
  const ring = solid(new TorusGeometry(1.9, 0.07, 8, 40), orange, mon);
  ring.position.set(0, 2.2, -(DECK_D * S) / 2 - 0.9);
  ring.rotation.y = 0;

  const plaza = new Group();
  land.add(plaza);
  const plate = new Shape();
  const pw = 1.2, ph = 0.5, pr = 0.12;
  plate.moveTo(-pw / 2 + pr, -ph / 2);
  plate.lineTo(pw / 2 - pr, -ph / 2);
  plate.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + pr);
  plate.lineTo(pw / 2, ph / 2 - pr);
  plate.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - pr, ph / 2);
  plate.lineTo(-pw / 2 + pr, ph / 2);
  plate.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - pr);
  plate.lineTo(-pw / 2, -ph / 2 + pr);
  plate.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + pr, -ph / 2);
  const [px, pz] = at(-1.6, -5.5);
  const post = box(0.08, 1.1, 0.08, px, 0.55 + ground(px, pz), pz, paint("#8a5a34"), plaza);
  const plateMat = paint("#f3ead6", { flat: true, side: DoubleSide });
  const label = plateLabel();
  const plateMesh = solid(keep(new ShapeGeometry(plate)), label ?? plateMat, plaza);
  plateMesh.position.set(px, 1.35 + ground(px, pz), pz + 0.05);

  const brown = paint("#8a5a34");
  const crate = paint("#e07a3a");
  for (const [x, z] of [[-2.0, -1.0], [2.1, -1.2]]) {
    const [bx, bz] = at(x, z);
    const y = ground(bx, bz);
    box(1.2, 0.12, 0.4, bx, y + 0.45, bz, brown, plaza);
    for (const s of [-0.5, 0.5]) box(0.08, 0.45, 0.36, bx + s * 0.9, y + 0.22, bz, brown, plaza);
  }
  for (const [x, z, s] of [[-2.6, -2.4, 0.6], [2.7, 0.5, 0.9], [3.1, -0.4, 1.2]]) {
    const [bx, bz] = at(x, z);
    box(s, s, s, bx, ground(bx, bz) + s / 2, bz, crate, plaza);
  }

  const far = [
    [-58, -66, 6, 34, 6, "#3f8a5a"], [-46, -58, 8, 14, 8, "#3f8a5a"], [-30, -86, 10, 9, 8, "#3f8a5a"], [-70, -84, 8, 20, 8, "#3f8a5a"],
    [12, -60, 7, 9, 7, "#e8b8b8"], [20, -68, 6, 12, 6, "#d99a9a"], [28, -54, 8, 8, 8, "#e8b8b8"], [6, -78, 9, 11, 7, "#d99a9a"],
    [30, -84, 7, 16, 7, "#e8b8b8"], [44, -62, 6, 18, 6, "#d99a9a"], [60, -90, 8, 12, 8, "#e8b8b8"], [70, -70, 16, 10, 12, "#3a3540"],
  ];
  for (const [x, z, w, h, d, c] of far) {
    const [bx, bz] = at(x, z);
    box(w, h, d, bx, ground(bx, bz) + h / 2, bz, paint(c), plaza);
  }
  const [wx, wz] = at(46, -78);
  const wheel = solid(new TorusGeometry(6, 0.14, 6, 36), paint("#c8c0d8"), plaza);
  wheel.position.set(wx, ground(wx, wz) + 8, wz);
  wheel.rotation.y = Math.PI / 2;

  const leaves = new InstancedMesh(keep(new PlaneGeometry(0.16, 0.1)), paint("#e07a3a", { flat: true, side: DoubleSide }), 40);
  leaves.frustumCulled = false;
  leaves.visible = false;
  group.add(leaves);
  const LM = new Matrix4();
  const placeLeaves = (tt) => {
    for (let i = 0; i < 40; i++) {
      const x = (hash(i, 1) - 0.5) * 14 + 0.2 * tt;
      const y = 0.3 + ((((hash(i, 2) * 8 - 0.3 * tt) % 8) + 8) % 8);
      const z = (hash(i, 3) - 0.5) * 14;
      leaves.setMatrixAt(i, LM.makeRotationZ(hash(i, 4) * 6.28).setPosition(x, y, z));
    }
    leaves.instanceMatrix.needsUpdate = true;
  };

  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  const dome = new Mesh(keep(new SphereGeometry(900, 24, 12)), keep(new ShaderMaterial({
    uniforms: { uSky: { value: K.skyLow.clone() }, uHigh: { value: K.skyHigh.clone() } },
    vertexShader: SKY_V,
    fragmentShader: SKY,
    side: BackSide,
    depthWrite: false,
  })));
  dome.frustumCulled = false;
  dome.renderOrder = -9;
  group.add(dome);

  const page = (on, pupVisible = true, leafT = null) => {
    land.visible = !on;
    shadow.visible = !on && pupVisible;
    dome.material.uniforms.uSky.value.copy(on ? K.paper : K.skyLow);
    dome.material.uniforms.uHigh.value.copy(on ? K.paper : K.skyHigh);
    leaves.visible = leafT != null;
    if (leafT != null) placeLeaves(leafT);
  };
  return { group, page, dispose() { for (const x of made) x.dispose(); } };

  function terrain() {
    const nx = X1 - X0 + 1, nz = Z1 - Z0 + 1, pos = [], col = [], idx = [], o = {};
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const x = X0 + ix, z = Z0 + iz;
      groundAt(x, z, o);
      pos.push(x, o.h, z);
      const v = K.snow.clone().lerp(K.cool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      col.push(v.x, v.y, v.z);
    }
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function plateLabel() {
    if (typeof document === "undefined") return null;
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 208;
    const cx = cv.getContext("2d");
    cx.fillStyle = "#f3ead6";
    cx.fillRect(0, 0, 512, 208);
    cx.fillStyle = "#07182e";
    cx.font = "bold 96px sans-serif";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillText("faraday", 256, 110);
    const tex = keep(new CanvasTexture(cv));
    return keep(new ShaderMaterial({ uniforms: { uMap: { value: tex } }, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform sampler2D uMap; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y)).rgb, 0.99); }", side: DoubleSide }));
  }
}
