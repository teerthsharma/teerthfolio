// The SEAL SEAL statue (460bafd components/world/monuments/parts/SealStatue.jsx) in plain three.js: an 8-sided granite drum,
// a seated bronze pup of spheres with blue eyes, and the plaque stone facing the dock (+z). Origin at the drum's base centre.
// The avatar is never fetched, so the plaque bakes with no network; the bronze relief stands in for it, as the site does.
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from "three";
import { glslFor } from "../../../tools/index.js";
import { loadPack } from "../../../tools/packs.js";

await loadPack("phys");
const METAL = glslFor(["metalCel"]);
// sRGB components as written: a custom shader outputs its values unconverted, so a hex must not pass through Color()
export function raw(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const SUN = new Vector3(-14, 26, 12).normalize();
const COOL = raw("#d9dfe8");
const GRANITE = "#9e928d", GRANITE_DARK = "#6a625c", BRONZE = [138 / 255, 122 / 255, 104 / 255], INK = "#1c1824", EYE = "#4f7cff";

function bronze() {
  return new ShaderMaterial({
    uniforms: { uSun: { value: SUN }, uF0: { value: new Vector3(...BRONZE) } },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform vec3 uF0; varying vec3 vN; varying vec3 vW;\n${METAL}\nvoid main() { vec3 V = normalize(cameraPosition - vW); gl_FragColor = vec4(metalCel(normalize(vN), normalize(uSun), V, uF0), 0.99); }`,
  });
}

function ramp(hex) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: raw(hex) }, uCool: { value: COOL }, uSun: { value: SUN } },
    vertexShader: `varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uCool; uniform vec3 uSun; varying vec3 vN; void main() { float l = max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(mix(uCool, uColor, smoothstep(0.0, 0.5, l)), 0.99); }`,
  });
}

function plaqueTexture() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 460;
  const g = c.getContext("2d");
  g.fillStyle = GRANITE;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = GRANITE_DARK;
  g.lineWidth = 14;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = INK;
  g.font = "bold 118px Georgia, 'Times New Roman', serif";
  g.fillText("SEAL SEAL", 690, 170);
  g.font = "italic 52px Georgia, 'Times New Roman', serif";
  g.fillText("founder of seal city", 690, 310);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function buildStatue() {
  const group = new Group(), made = [];
  const keep = (x) => (made.push(x), x);
  const mesh = (geo, m) => new Mesh(keep(geo), m);
  const ball = (parent, r, p, m, s = [1, 1, 1], rot = [0, 0, 0], seg = [16, 12]) => {
    const o = mesh(new SphereGeometry(r, seg[0], seg[1]), m);
    o.position.set(...p);
    o.scale.set(...s);
    o.rotation.set(...rot);
    parent.add(o);
    return o;
  };
  const granite = keep(ramp(GRANITE)), graniteDk = keep(ramp(GRANITE_DARK)), metal = keep(bronze());
  const dark = keep(ramp("#2a2420")), eye = keep(new MeshBasicMaterial({ color: EYE, toneMapped: false }));
  const tex = plaqueTexture();
  const face = keep(tex ? new MeshBasicMaterial({ map: keep(tex), toneMapped: false }) : new MeshBasicMaterial({ color: GRANITE }));

  const drum = mesh(new CylinderGeometry(1.25, 1.45, 0.5, 8), granite);
  drum.position.set(0, 0.25, 0);
  group.add(drum);

  const pup = new Group();
  pup.position.set(0, 0.5, 0);
  group.add(pup);
  ball(pup, 1, [0, 1.15, 0], metal, [0.95, 1.25, 1.05], [0, 0, 0], [24, 18]);
  ball(pup, 0.7, [0, 0.3, -0.5], metal, [1, 1.1, 0.35], [0.9, 0, 0], [14, 10]);
  ball(pup, 0.66, [0, 2.62, 0.1], metal, [1, 1, 1], [0, 0, 0], [24, 18]);
  ball(pup, 0.26, [0, 2.42, 0.62], metal, [1.2, 0.85, 1], [0, 0, 0], [16, 12]);
  ball(pup, 0.085, [0, 2.52, 0.86], dark, [1, 1, 1], [0, 0, 0], [10, 8]);
  for (const x of [-0.27, 0.27]) ball(pup, 0.1, [x, 2.8, 0.55], eye, [1, 1, 1], [0, 0, 0], [12, 10]);
  for (const s of [-1, 1]) ball(pup, 1, [s * 0.95, 0.95, 0.35], metal, [0.28, 0.85, 0.5], [0.3, 0, -s * 0.5], [14, 10]);

  const plaque = new Group();
  plaque.position.set(0, 0.5, 2.1);
  plaque.rotation.x = -0.42;
  group.add(plaque);
  plaque.add(mesh(new BoxGeometry(2.3, 1.2, 0.3), graniteDk));
  const faceMesh = mesh(new PlaneGeometry(2.0, 0.9), face);
  faceMesh.position.z = 0.152;
  plaque.add(faceMesh);
  const medal = new Group();
  medal.position.set(-0.62, 0, 0.16);
  plaque.add(medal);
  medal.add(mesh(new TorusGeometry(0.35, 0.04, 8, 32), metal));
  const relief = new Group();
  relief.position.z = 0.01;
  medal.add(relief);
  const squash = new Group();
  squash.scale.set(1, 1, 0.35);
  relief.add(squash);
  ball(squash, 0.3, [0, 0, 0], metal, [1, 1, 1], [0, 0, 0], [20, 14]);
  ball(squash, 0.15, [0, -0.09, 0.26], metal, [1, 1, 1], [0, 0, 0], [14, 10]);
  ball(squash, 0.05, [0, -0.03, 0.4], dark, [1, 1, 1], [0, 0, 0], [10, 8]);
  for (const x of [-0.11, 0.11]) ball(squash, 0.035, [x, 0.08, 0.26], eye, [1, 1, 1], [0, 0, 0], [8, 6]);

  return {
    group,
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
