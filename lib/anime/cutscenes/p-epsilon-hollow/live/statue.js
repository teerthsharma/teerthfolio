// The SEAL SEAL statue at the plaza centre: a seated bronze pup on a granite drum, the plaque at its feet facing the dock (+z).
// Ported from 460bafd components/world/monuments/parts/SealStatue.jsx in plain three: no avatar fetch (the plate bakes offline), so the bronze relief stands in.
import { BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { SUN, VERT, basic, lit } from "./plaza.js";

await loadPack("phys");
const METAL = glslFor(["metalCel"]);
const BRONZE = /* glsl */ `uniform vec3 uSun; varying vec3 vW; varying vec3 vN; varying vec3 vV;
${METAL}
void main() {
  vec3 n = normalize(vN);
  vec3 f = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(f, n) < 0.0) f = -f;
  gl_FragColor = vec4(metalCel(f, normalize(uSun), normalize(vV), vec3(0.541, 0.478, 0.408)), 0.99);
}`;
const ACCENT = "#4f7cff";

function plaqueFace() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 460;
  const g = c.getContext("2d");
  g.fillStyle = "#9e928d";
  g.fillRect(0, 0, 1024, 460);
  g.strokeStyle = "#6a625c";
  g.lineWidth = 14;
  g.strokeRect(7, 7, 1010, 446);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#1c1824";
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
  const add = (parent, geo, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => {
    const o = new Mesh(keep(geo), m);
    o.position.set(...p);
    o.scale.set(...s);
    o.rotation.set(...r);
    parent.add(o);
    return o;
  };
  const bronze = keep(new ShaderMaterial({ uniforms: { uSun: { value: SUN }, ...uniformsFor(["metalCel"]) }, vertexShader: VERT, fragmentShader: BRONZE }));
  const granite = keep(lit("#9e928d")), graniteDk = keep(lit("#6a625c")), dark = keep(lit("#2a2420"));
  const eye = keep(basic(ACCENT));

  // SealStatue.jsx 102 to 104: the granite drum, the disc of contact shadow in the snow
  add(group, new CylinderGeometry(1.25, 1.45, 0.5, 8), granite, [0, 0.25, 0]);
  add(group, new CircleGeometry(1.8, 32), keep(basic("#b9c4d2", { transparent: true, opacity: 0.45, depthWrite: false })), [0, 0.005, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);

  // SealStatue.jsx 106 to 121: the seated pup, seven spheres in bronze, eyes in the accent
  const pup = new Group();
  pup.position.set(0, 0.5, 0);
  group.add(pup);
  add(pup, new SphereGeometry(1, 24, 18), bronze, [0, 1.15, 0], [0.95, 1.25, 1.05]);
  add(pup, new SphereGeometry(0.7, 14, 10), bronze, [0, 0.3, -0.5], [1, 1.1, 0.35], [0.9, 0, 0]);
  add(pup, new SphereGeometry(0.66, 24, 18), bronze, [0, 2.62, 0.1]);
  add(pup, new SphereGeometry(0.26, 16, 12), bronze, [0, 2.42, 0.62], [1.2, 0.85, 1]);
  add(pup, new SphereGeometry(0.085, 10, 8), dark, [0, 2.52, 0.86]);
  for (const x of [-0.27, 0.27]) add(pup, new SphereGeometry(0.1, 12, 10), eye, [x, 2.8, 0.55]);
  for (const s of [-1, 1]) add(pup, new SphereGeometry(1, 14, 10), bronze, [s * 0.95, 0.95, 0.35], [0.28, 0.85, 0.5], [0.3, 0, -s * 0.5]);

  // SealStatue.jsx 122 to 139: the plaque stone at the feet, leaning back, with the medallion and the pup in relief
  const plaque = new Group();
  plaque.position.set(0, 0.5, 2.1);
  plaque.rotation.set(-0.42, 0, 0);
  group.add(plaque);
  add(plaque, new BoxGeometry(2.3, 1.2, 0.3), graniteDk);
  const faceTex = keep(plaqueFace());
  add(plaque, new PlaneGeometry(2.0, 0.9), keep(new MeshBasicMaterial({ map: faceTex, color: "#ffffff" })), [0, 0, 0.152]);
  const medal = new Group();
  medal.position.set(-0.62, 0, 0.16);
  plaque.add(medal);
  add(medal, new TorusGeometry(0.35, 0.04, 8, 32), bronze);
  const relief0 = new Group();
  relief0.position.set(0, 0, 0.01);
  medal.add(relief0);
  const relief = new Group();
  relief.scale.set(1, 1, 0.35);
  relief0.add(relief);
  add(relief, new SphereGeometry(0.3, 20, 14), bronze);
  add(relief, new SphereGeometry(0.15, 14, 10), bronze, [0, -0.09, 0.26]);
  add(relief, new SphereGeometry(0.05, 10, 8), dark, [0, -0.03, 0.4]);
  for (const x of [-0.11, 0.11]) add(relief, new SphereGeometry(0.035, 8, 6), eye, [x, 0.08, 0.26]);

  return {
    group,
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
