// The pale island the scene opens on and returns to: the SEAL SEAL spawn statue (SpawnStatue.jsx, transcribed to plain meshes), the snow
// shore, the water, the sky dome and the far pastel set, lit as the live island is lit (sun from the south-west, shade in the snow).
import { BackSide, Color, CylinderGeometry, BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3, CatmullRomCurve3, TubeGeometry } from "three";
import { groundShadow } from "../../../pup.js";
import { AT } from "../clock.js";
import { P } from "../palette.js";

const SUN = new Vector3(-14, 26, 12).normalize();
const VERT = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec3 vV;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIT = /* glsl */ `uniform vec3 uC; uniform vec3 uShade; uniform vec3 uSun; varying vec3 vN;
  void main() { float l = 0.86 + 0.14 * max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(mix(uShade, uC, l), 0.99); }`;
const BRONZE = /* glsl */ `uniform vec3 uBase; uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uSun; varying vec3 vN; varying vec3 vV;
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
  }`;
const WATER = /* glsl */ `uniform vec3 uA; uniform vec3 uB; varying vec3 vW;
  void main() { gl_FragColor = vec4(mix(uA, uB, smoothstep(10.0, 70.0, length(vW.xz))), 0.99); }`;
const SKY = /* glsl */ `uniform vec3 uSky; uniform vec3 uHigh; varying vec3 vW;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.99); }`;

const WATER_FAR = "#37b4c8";
const LAMP = "#e8b24a";
const BULB = "#ffd27a";
const TOWER = "#8fb7b5";
const HELIX = "#3fe0d0";
const MOUNT = "#e4e6f2";
const PASTEL = ["#d9c8f0", "#f2d0e0", "#cfe4ef"];
const EYE = "#06b6d4";

function medallionTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#8a888f";
  g.beginPath();
  g.ellipse(64, 74, 42, 40, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#b3262e";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(64 + s * 20, 46);
    g.lineTo(64 + s * 40, 10);
    g.lineTo(64 + s * 10, 34);
    g.fill();
  }
  g.fillStyle = P.ink;
  for (const s of [-1, 1]) g.fillRect(64 + s * 16 - 5, 66, 10, 14);
  return c;
}

function plaqueTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 598;
  const g = c.getContext("2d");
  g.fillStyle = P.granite;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = P.graniteDark;
  g.lineWidth = 14;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#1c1824";
  g.font = "bold 104px Georgia, serif";
  g.fillText("SEAL SEAL", 640, 240);
  g.font = "italic 46px Georgia, serif";
  g.fillText("founder of seal city", 640, 370);
  return c;
}

export function buildIsland() {
  const group = new Group(), made = [];
  const track = (x) => (made.push(x), x);
  const mat = (frag, uniforms) => track(new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, side: DoubleSide }));
  const lit = (hex, shade = new Color(hex).multiplyScalar(0.8)) =>
    mat(LIT, { uC: { value: new Color(hex) }, uShade: { value: new Color(shade) }, uSun: { value: SUN } });
  const put = (parent, geo, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => {
    const x = new Mesh(track(geo), m);
    x.position.set(...p);
    x.scale.set(...s);
    x.rotation.set(...r);
    x.frustumCulled = false;
    parent.add(x);
    return x;
  };
  const sphere = (r, w, h) => new SphereGeometry(r, w, h);

  const bronze = mat(BRONZE, { uBase: { value: new Color(P.bronzeBase) }, uDeep: { value: new Color(P.bronzeDeep) }, uRim: { value: new Color(P.bronzeRim) }, uSun: { value: new Vector3(0.45, 0.8, 0.4) } });
  const granite = lit(P.granite, P.graniteDark);
  const graniteDk = lit(P.graniteDark, new Color(P.graniteDark).multiplyScalar(0.8));
  const eye = track(new MeshBasicMaterial({ color: EYE }));

  const statue = new Group();
  statue.position.set(3.2, 0, -0.2);
  group.add(statue);
  put(statue, new CylinderGeometry(2.6, 3.2, 0.85, 16), granite, [0, 0.425, -1]);

  const pup = new Group();
  pup.position.set(0, AT.statue[1], -3);
  pup.scale.setScalar(0.85);
  statue.add(pup);
  put(pup, sphere(1, 24, 18), bronze, [0, 1.15, 0], [0.95, 1.25, 1.05]);
  put(pup, sphere(0.7, 14, 10), bronze, [0, 0.3, -0.5], [1, 1.1, 0.35], [0.9, 0, 0]);
  put(pup, sphere(0.66, 24, 18), bronze, [0, 2.62, 0.1]);
  put(pup, sphere(0.26, 16, 12), bronze, [0, 2.42, 0.62], [1.2, 0.85, 1]);
  put(pup, sphere(0.085, 10, 8), graniteDk, [0, 2.52, 0.86]);
  for (const x of [-0.27, 0.27]) put(pup, sphere(0.1, 12, 10), eye, [x, 2.8, 0.55]);
  for (const s of [-1, 1]) put(pup, sphere(1, 14, 10), bronze, [s * 0.95, 0.95, 0.35], [0.28, 0.85, 0.5], [0.3, 0, -s * 0.5]);

  const plaque = new Group();
  plaque.position.set(...AT.plaque);
  plaque.rotation.set(-1.0, 0.25, 0);
  group.add(plaque);
  put(plaque, new BoxGeometry(1.32, 0.82, 0.12), graniteDk);
  const faceTex = track(new CanvasTexture(plaqueTexture()));
  faceTex.colorSpace = SRGBColorSpace;
  put(plaque, new PlaneGeometry(1.2, 0.7), track(new MeshBasicMaterial({ map: faceTex, color: "#ffffff" })), [0, 0, 0.062]);
  const medal = new Group();
  medal.position.set(-0.37, 0, 0.07);
  plaque.add(medal);
  put(medal, new TorusGeometry(0.21, 0.025, 8, 32), bronze);
  put(medal, new CircleGeometry(0.2, 32), track(new MeshBasicMaterial({ color: P.ink })), [0, 0, 0.002]);
  const medalTex = track(new CanvasTexture(medallionTexture()));
  medalTex.colorSpace = SRGBColorSpace;
  put(medal, new CircleGeometry(0.18, 32), track(new MeshBasicMaterial({ map: medalTex, transparent: true })), [0, 0, 0.004]);

  const R = 70, A = Math.acos(-1.4 / R), snowShape = new Shape();
  snowShape.moveTo(R * Math.cos(-A), R * Math.sin(-A));
  for (let i = 1; i <= 96; i++) {
    const a = -A + (2 * A * i) / 96;
    snowShape.lineTo(R * Math.cos(a), R * Math.sin(a));
  }
  put(group, new ShapeGeometry(snowShape).rotateX(-Math.PI / 2), lit(P.snow, P.snowShade));
  put(group, new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), mat(WATER, { uA: { value: new Color(P.water) }, uB: { value: new Color(WATER_FAR) } }), [0, -0.35, 0]);

  const dome = new Mesh(track(new SphereGeometry(600, 24, 12)), mat(SKY, { uSky: { value: new Color(P.sky) }, uHigh: { value: new Color(P.skyHigh) } }));
  dome.material.side = BackSide;
  dome.material.depthWrite = false;
  dome.renderOrder = -9;
  dome.frustumCulled = false;
  group.add(dome);

  const tower = new Group();
  tower.position.set(-13, 0, -19);
  group.add(tower);
  [[1.6, 1.2], [1.3, 3.6], [1.0, 6.0]].forEach(([r, y]) => put(tower, new CylinderGeometry(r, r, 2.4, 20), lit(TOWER), [0, y, 0]));
  const curve = new CatmullRomCurve3(Array.from({ length: 81 }, (_, i) => {
    const u = i / 80, a = u * 2.5 * 2 * Math.PI;
    return new Vector3(Math.cos(a) * 1.75, 0.3 + u * 6.6, Math.sin(a) * 1.75);
  }));
  put(tower, track(new TubeGeometry(curve, 160, 0.12, 6, false)), lit(HELIX));

  for (let i = 0; i < 5; i++) {
    const h = [1.2, 1.6, 1.0, 1.8, 1.3][i];
    put(group, new BoxGeometry(1.4, h, 1.4), lit(PASTEL[i % 3]), [-9 + i * 1.5, h / 2, -22]);
  }

  put(group, new CylinderGeometry(0.08, 0.08, 3.2, 8), lit(LAMP), [-6, 1.6, -9]);
  put(group, sphere(0.22, 12, 10), lit(BULB), [-6, 3.4, -9]);

  for (const x of [-30, 12]) put(group, new ConeGeometry(22, 9, 20), lit(MOUNT), [x, 4.5, -60]);

  const shadow = groundShadow(0.35, 0.35, "#7c88c8", 0.5);
  shadow.position.set(0, 0.004, 0);
  group.add(shadow);
  made.push(shadow.geometry, shadow.material);

  return {
    group,
    page(on) {
      group.visible = on;
    },
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
